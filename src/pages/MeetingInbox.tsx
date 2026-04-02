import { useState, useEffect } from 'react';
import { Inbox, Check, X, Edit2, Bot } from 'lucide-react';

export default function MeetingInbox() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for AI suggestions since we haven't built the full pipeline yet
    setSuggestions([
      {
        id: 's1',
        meeting_title: 'Weekly Sync',
        extracted_text: 'Ben to follow up with the design team regarding the new logo assets by Thursday.',
        normalized_title: 'Follow up with design team on logo assets',
        proposed_owner_user_id: 'u1',
        proposed_due_date: '2026-04-04',
        confidence_score: 0.92,
        status: 'pending_review'
      },
      {
        id: 's2',
        meeting_title: 'Client Kickoff',
        extracted_text: 'Lyden needs to provision the staging environment before next week.',
        normalized_title: 'Provision staging environment',
        proposed_owner_user_id: 'u3',
        proposed_due_date: '2026-04-08',
        confidence_score: 0.85,
        status: 'pending_review'
      }
    ]);
    setLoading(false);
  }, []);

  const handleAction = (id: string, action: 'accept' | 'reject') => {
    setSuggestions(suggestions.filter(s => s.id !== id));
    // In a real app, this would call the API to create a task or mark rejected
  };

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full h-full flex flex-col transition-colors duration-200">
      <div className="mb-8 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Inbox className="w-6 h-6" />
          Meeting Inbox
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Review AI-extracted tasks from your recent meetings</p>
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
                
                <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Proposed Owner:</span> {suggestion.proposed_owner_user_id}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Due:</span> {suggestion.proposed_due_date}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Confidence:</span> {Math.round(suggestion.confidence_score * 100)}%
                  </div>
                </div>
              </div>
              
              <div className="w-48 flex flex-col gap-2 border-l border-gray-100 dark:border-gray-700 pl-6 justify-center">
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
    </div>
  );
}
