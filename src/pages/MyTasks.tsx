import { useState, useEffect } from 'react';
import { CheckSquare, Clock, AlertCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { cn } from '../lib/utils';

export default function MyTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
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
      const res = await fetch(`/api/tasks?owner_id=${currentUser.id}`);
      const data = await res.json();
      setTasks(data);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      // Revert on failure
      fetchData();
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'All Active') return task.status !== 'Complete';
    if (filter === 'In Progress') return task.status === 'In Progress';
    if (filter === 'Blocked') return task.status === 'Blocked';
    if (filter === 'On Hold') return task.status === 'On Hold';
    if (filter === 'Completed') return task.status === 'Complete';
    return true;
  });

  const tabs = ['All Active', 'In Progress', 'Blocked', 'On Hold', 'Completed'];

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
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono">{task.task_code}</span>
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
