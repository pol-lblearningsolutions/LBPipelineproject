import { useState, useEffect } from 'react';
import { CheckSquare, Clock, AlertCircle, PauseCircle, PlayCircle, Archive, ArchiveRestore } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { cn } from '../lib/utils';

export default function MyTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All Active');
  const { currentUser } = useUser();

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/tasks?owner_id=${currentUser.id}&include_archived=true`),
        fetch('/api/projects')
      ]);
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      setTasks(tasksData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInlineEdit = async (taskId: string, updates: any) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      // Revert on failure
      fetchData();
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'Archived') return task.archived_flag;
    if (task.archived_flag) return false; // Hide archived from other tabs
    if (filter === 'All Active') return task.status !== 'Complete';
    if (filter === 'In Progress') return task.status === 'In Progress';
    if (filter === 'Blocked') return task.status === 'Blocked';
    if (filter === 'On Hold') return task.status === 'On Hold';
    if (filter === 'Completed') return task.status === 'Complete';
    return true;
  });

  const tabs = ['All Active', 'In Progress', 'Blocked', 'On Hold', 'Completed', 'Archived'];

  if (loading || !currentUser) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full h-full flex flex-col transition-colors duration-200">
      <div className="mb-8 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">All tasks assigned to you across all projects</p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden transition-colors duration-200">
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 flex gap-4 overflow-x-auto shrink-0">
          {tabs.map(t => (
            <button 
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "text-sm font-medium pb-1 whitespace-nowrap transition-colors",
                filter === t 
                  ? "text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        
        <ul className="divide-y divide-gray-200 dark:divide-gray-700/50 flex-1 overflow-y-auto">
          {filteredTasks.map(task => (
            <li key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 flex items-start gap-4 transition-colors">
              <div className="mt-1">
                {task.status === 'Complete' ? (
                  <CheckSquare className="w-5 h-5 text-green-500 dark:text-green-400" />
                ) : task.status === 'Blocked' ? (
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                ) : task.status === 'On Hold' ? (
                  <PauseCircle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                ) : task.status === 'In Progress' ? (
                  <PlayCircle className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                ) : (
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-sm" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</h4>
                  <div className="flex items-center gap-2">
                    {task.carry_over_flag && (
                      <span className="text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded">
                        Carry Over
                      </span>
                    )}
                    <select 
                      className={cn(
                        "text-xs font-medium rounded px-2 py-1 border-none focus:ring-0 cursor-pointer transition-colors",
                        task.status === 'Complete' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        task.status === 'Blocked' ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                        task.status === 'In Progress' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                        task.status === 'On Hold' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      )}
                      value={task.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        const updates: any = { status: newStatus };
                        if (newStatus === 'Blocked') {
                          updates.blocked_flag = true;
                        } else if (task.status === 'Blocked') {
                          updates.blocked_flag = false;
                          updates.blocker_reason = null;
                        }
                        handleInlineEdit(task.id, updates);
                      }}
                    >
                      <option className="dark:bg-gray-800 text-gray-900 dark:text-gray-100">Not Started</option>
                      <option className="dark:bg-gray-800 text-gray-900 dark:text-gray-100">In Progress</option>
                      <option className="dark:bg-gray-800 text-gray-900 dark:text-gray-100">On Hold</option>
                      <option className="dark:bg-gray-800 text-gray-900 dark:text-gray-100">Blocked</option>
                      <option className="dark:bg-gray-800 text-gray-900 dark:text-gray-100">Complete</option>
                    </select>
                    <button 
                      onClick={() => handleInlineEdit(task.id, { archived_flag: !task.archived_flag })}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title={task.archived_flag ? "Unarchive Task" : "Archive Task"}
                    >
                      {task.archived_flag ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="mt-1">
                  <input 
                    type="text" 
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600"
                    value={task.description || ''}
                    placeholder="Add description..."
                    onChange={(e) => handleInlineEdit(task.id, { description: e.target.value })}
                  />
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono">{task.task_code}</span>
                  <span className="flex items-center gap-1">
                    <select 
                      className="bg-transparent border-none focus:ring-0 p-0 text-xs text-gray-500 dark:text-gray-400 cursor-pointer max-w-[120px] truncate"
                      value={task.project_id || ''}
                      onChange={(e) => handleInlineEdit(task.id, { project_id: e.target.value || null })}
                    >
                      <option value="" className="dark:bg-gray-800">No Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id} className="dark:bg-gray-800">{p.name}</option>
                      ))}
                    </select>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due: 
                    <input 
                      type="date" 
                      className="bg-transparent border-none focus:ring-0 p-0 text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                      value={task.due_date ? task.due_date.split('T')[0] : ''}
                      onChange={(e) => handleInlineEdit(task.id, { due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </span>
                  {task.priority && (
                    <span className={task.priority === 'Critical' ? 'text-red-500 dark:text-red-400 font-medium' : ''}>
                      Priority: {task.priority}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    Plan: 
                    <input 
                      type="number" step="0.5"
                      className="w-12 bg-transparent border-none focus:ring-0 p-0 text-xs text-gray-500 dark:text-gray-400"
                      value={task.planned_hours || ''}
                      placeholder="-"
                      onChange={(e) => handleInlineEdit(task.id, { planned_hours: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                    hrs
                  </span>
                  <span className="flex items-center gap-1">
                    Actual: 
                    <input 
                      type="number" step="0.5"
                      className="w-12 bg-transparent border-none focus:ring-0 p-0 text-xs text-gray-500 dark:text-gray-400"
                      value={task.actual_hours || ''}
                      placeholder="-"
                      onChange={(e) => handleInlineEdit(task.id, { actual_hours: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                    hrs
                  </span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-transparent w-3 h-3"
                      checked={task.carry_over_flag || false}
                      onChange={(e) => handleInlineEdit(task.id, { carry_over_flag: e.target.checked })}
                    />
                    Carry Over
                  </label>
                </div>
              </div>
            </li>
          ))}
          {filteredTasks.length === 0 && (
            <li className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No tasks found in this view.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
