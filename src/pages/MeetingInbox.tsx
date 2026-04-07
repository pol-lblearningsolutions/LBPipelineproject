import { useState, useEffect } from 'react';
import { Inbox, Check, X, Edit2, Bot, FileText, Loader2, Mail, MessageSquare } from 'lucide-react';
import { extractTasksWithRetry, extractTasksFromEmailWithRetry, extractTasksFromChatWithRetry } from '../services/aiService';

export default function MeetingInbox() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [modalType, setModalType] = useState<'transcript' | 'email' | 'chat' | null>(null);
  const [inputText, setInputText] = useState('');
  
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, projectsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/projects')
        ]);
        if (usersRes.ok) setUsers(await usersRes.json());
        if (projectsRes.ok) setProjects(await projectsRes.json());
      } catch (err) {
        console.error("Failed to fetch context data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    const suggestion = suggestions.find(s => s.id === id);
    if (!suggestion) return;

    if (action === 'accept') {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: suggestion.normalized_title,
            owner_user_id: suggestion.proposed_owner_user_id,
            project_id: suggestion.proposed_project_id,
            priority: suggestion.priority,
            description: suggestion.extracted_text,
            source_type: 'ai_extracted',
            task_date: new Date().toISOString()
          })
        });
        if (!res.ok) throw new Error('Failed to create task');
      } catch (err) {
        console.error(err);
        alert('Failed to save task.');
        return;
      }
    }

    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  const handleExtractTasks = async () => {
    if (!inputText.trim() || !modalType) return;
    
    setIsExtracting(true);
    try {
      let extractedTasks;
      if (modalType === 'transcript') {
        extractedTasks = await extractTasksWithRetry(inputText, users, projects);
      } else if (modalType === 'email') {
        extractedTasks = await extractTasksFromEmailWithRetry(inputText, users, projects);
      } else {
        extractedTasks = await extractTasksFromChatWithRetry(inputText, users, projects);
      }
      
      const newSuggestions = [];
      for (let i = 0; i < extractedTasks.length; i++) {
        const task = extractedTasks[i];
        
        // Auto-save to database
        try {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: task.title,
              owner_user_id: task.proposed_owner_user_id || null,
              project_id: task.proposed_project_id || null,
              priority: task.priority || 'Medium',
              description: task.context_quote || `Extracted from ${modalType}`,
              source_type: 'ai_extracted',
              task_date: new Date().toISOString()
            })
          });
          
          if (res.ok) {
            const savedTask = await res.json();
            newSuggestions.push({
              id: savedTask.id,
              meeting_title: modalType === 'transcript' ? 'Pasted Transcript' : modalType === 'email' ? 'Pasted Email Thread' : 'Pasted Chat Log',
              extracted_text: task.context_quote || `Extracted from ${modalType}: ${task.title}`,
              normalized_title: task.title,
              proposed_owner_user_id: task.proposed_owner_user_id || null,
              proposed_project_id: task.proposed_project_id || null,
              priority: task.priority || 'Medium',
              confidence_score: task.confidence_score || 0.9,
              status: 'auto_saved'
            });
          }
        } catch (err) {
          console.error("Failed to auto-save task", err);
        }
      }

      setSuggestions(prev => [...newSuggestions, ...prev]);
      setModalType(null);
      setInputText('');
    } catch (error) {
      console.error("Failed to extract tasks:", error);
      alert("Failed to extract tasks. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading...</div>;

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown User';
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Task Ledger (General)';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full h-full flex flex-col transition-colors duration-200">
      <div className="mb-8 shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-6 h-6" />
            Meeting Inbox
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Review AI-extracted tasks from your recent meetings, emails, and chats</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setModalType('chat')}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm font-medium rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Extract from Chat
          </button>
          <button
            onClick={() => setModalType('email')}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm font-medium rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Extract from Email
          </button>
          <button
            onClick={() => setModalType('transcript')}
            className="bg-primary-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-primary-700 transition flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Extract from Transcript
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        <div className="space-y-4">
          {suggestions.map(suggestion => (
            <div key={suggestion.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-5 flex gap-6 transition-colors duration-200">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                    AI Extracted
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    from <strong className="text-gray-700 dark:text-gray-300">{suggestion.meeting_title}</strong>
                  </span>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{suggestion.normalized_title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-100 dark:border-gray-700 mb-4 font-serif italic">
                  "{suggestion.extracted_text}"
                </p>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Project:</span> 
                    <select 
                      className="ml-2 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:ring-0 p-0 text-gray-700 dark:text-gray-300 cursor-pointer text-sm"
                      value={suggestion.proposed_project_id || ''}
                      onChange={async (e) => {
                        const newProjectId = e.target.value || null;
                        // Update local state
                        setSuggestions(prev => prev.map(s => s.id === suggestion.id ? { ...s, proposed_project_id: newProjectId } : s));
                        // Update database
                        try {
                          await fetch(`/api/tasks/${suggestion.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ project_id: newProjectId })
                          });
                        } catch (err) {
                          console.error('Failed to update project:', err);
                        }
                      }}
                    >
                      <option value="" className="dark:bg-gray-800">No Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id} className="dark:bg-gray-800">{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Owner:</span> {getUserName(suggestion.proposed_owner_user_id)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Priority:</span> {suggestion.priority || 'Medium'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Confidence:</span> {Math.round(suggestion.confidence_score * 100)}%
                  </div>
                </div>
              </div>
              
              <div className="w-48 flex flex-col gap-2 border-l border-gray-100 dark:border-gray-700 pl-6 justify-center">
                {suggestion.status === 'auto_saved' ? (
                  <div className="flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                      <Check className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Auto-Saved
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {suggestion.proposed_project_id ? 'Added to Project' : 'Added to Task Ledger'}
                    </span>
                    <button
                      onClick={() => setSuggestions(suggestions.filter(s => s.id !== suggestion.id))}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => handleAction(suggestion.id, 'accept')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </button>
                    <button 
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleAction(suggestion.id, 'reject')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 text-sm font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          
          {suggestions.length === 0 && (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 transition-colors duration-200">
              <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Inbox Zero</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No pending task suggestions to review.</p>
            </div>
          )}
        </div>
      </div>

      {/* Extraction Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                {modalType === 'transcript' ? <FileText className="w-5 h-5" /> : modalType === 'email' ? <Mail className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                Extract Tasks from {modalType === 'transcript' ? 'Transcript' : modalType === 'email' ? 'Email' : 'Chat'}
              </h3>
              <button 
                onClick={() => setModalType(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={isExtracting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Paste {modalType === 'transcript' ? 'Meeting Transcript' : modalType === 'email' ? 'Email Thread' : 'Chat Log'}
              </label>
              <textarea
                className="w-full h-64 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 p-3"
                placeholder={`Paste your ${modalType === 'transcript' ? 'meeting transcript' : modalType === 'email' ? 'email thread' : 'chat log'} here...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isExtracting}
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                disabled={isExtracting}
              >
                Cancel
              </button>
              <button
                onClick={handleExtractTasks}
                disabled={!inputText.trim() || isExtracting}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    Extract Tasks
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
