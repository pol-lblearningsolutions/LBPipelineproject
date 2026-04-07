import { useState, useEffect } from 'react';
import { Plus, Search, Filter, AlertCircle, Archive, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';
import { useUser } from '../context/UserContext';

// Define strict types matching Prisma
interface Task {
  id: string;
  task_code: string;
  title: string;
  description: string | null;
  owner_user_id: string | null;
  project_id: string | null;
  status: 'Not Started' | 'In Progress' | 'Blocked' | 'Pending Review' | 'Complete' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  planned_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  blocked_flag: boolean;
  blocker_reason: string | null;
  carry_over_flag: boolean;
  archived_flag: boolean;
}

const STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Pending Review', 'Complete', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function TodayLedger() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, users } = useUser();
  const [projects, setProjects] = useState<any[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

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
        fetch(`/api/tasks/today`), // Removed ?user_id=... to fetch all tasks
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

  const filteredTasks = selectedProjectId === 'all' 
    ? tasks 
    : tasks.filter(t => t.project_id === selectedProjectId);

  const handleInlineEdit = async (taskId: string, updates: Partial<Task>) => {
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

  const handleAddRow = async () => {
    if (!currentUser) return;
    const newTask = {
      title: 'New Task',
      owner_user_id: currentUser.id,
      project_id: selectedProjectId !== 'all' ? selectedProjectId : null,
      status: 'Not Started',
      priority: 'Medium',
      task_date: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify(newTask)
      });
      const createdTask = await res.json();
      setTasks(prev => [...prev, createdTask]);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  if (loading || !currentUser) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading daily execution board...</div>;

  return (
    <div className="h-full flex flex-col p-8 font-sans transition-colors duration-200">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Task Ledger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Daily execution board for the entire team. One row = one task.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <select
              className="text-sm border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 border transition-colors"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handleAddRow}
            className="bg-primary-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-primary-700 transition"
          >
            + Add Row
          </button>
        </div>
      </div>

      {/* The Spreadsheet Grid */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm flex-1 overflow-auto transition-colors duration-200">
        <table className="w-full text-left text-sm whitespace-nowrap relative">
          <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-medium w-12 text-center" title="Carry Over">
                <div className="resize-x overflow-hidden min-w-[2rem] flex items-center justify-center">CO</div>
              </th>
              <th className="px-4 py-3 font-medium">
                <div className="resize-x overflow-hidden min-w-[4rem]">Task</div>
              </th>
              <th className="px-4 py-3 font-medium">
                <div className="resize-x overflow-hidden min-w-[6rem]">Description</div>
              </th>
              <th className="px-4 py-3 font-medium w-32">
                <div className="resize-x overflow-hidden min-w-[4rem]">Owner</div>
              </th>
              <th className="px-4 py-3 font-medium w-40">
                <div className="resize-x overflow-hidden min-w-[4rem]">Project</div>
              </th>
              <th className="px-4 py-3 font-medium w-32">
                <div className="resize-x overflow-hidden min-w-[4rem]">Status</div>
              </th>
              <th className="px-4 py-3 font-medium w-32">
                <div className="resize-x overflow-hidden min-w-[4rem]">Due Date</div>
              </th>
              <th className="px-4 py-3 font-medium w-24">
                <div className="resize-x overflow-hidden min-w-[4rem]">Priority</div>
              </th>
              <th className="px-4 py-3 font-medium w-24">
                <div className="resize-x overflow-hidden min-w-[4rem]">Plan Hrs</div>
              </th>
              <th className="px-4 py-3 font-medium w-24">
                <div className="resize-x overflow-hidden min-w-[4rem]">Act Hrs</div>
              </th>
              <th className="px-4 py-3 font-medium">
                <div className="resize-x overflow-hidden min-w-[6rem]">Blocker Reason</div>
              </th>
              <th className="px-4 py-3 font-medium w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredTasks.map(task => (
              <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-transparent"
                    checked={task.carry_over_flag || false}
                    onChange={(e) => handleInlineEdit(task.id, { carry_over_flag: e.target.checked })}
                    title="Mark as Carry Over"
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="text" 
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                    value={task.title}
                    onChange={(e) => handleInlineEdit(task.id, { title: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="text" 
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600"
                    value={task.description || ''}
                    placeholder="Add description..."
                    onChange={(e) => handleInlineEdit(task.id, { description: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2">
                  <select 
                    className="bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 cursor-pointer w-full text-sm"
                    value={task.owner_user_id || ''}
                    onChange={(e) => handleInlineEdit(task.id, { owner_user_id: e.target.value || null })}
                  >
                    <option value="" className="dark:bg-gray-800 text-gray-400">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id} className="dark:bg-gray-800">{u.full_name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select 
                    className="bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 cursor-pointer w-full text-sm"
                    value={task.project_id || ''}
                    onChange={(e) => handleInlineEdit(task.id, { project_id: e.target.value || null })}
                  >
                    <option value="" className="dark:bg-gray-800 text-gray-400">Unassigned</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id} className="dark:bg-gray-800">{p.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select 
                    className="bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 cursor-pointer"
                    value={task.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as Task['status'];
                      const updates: Partial<Task> = { status: newStatus };
                      if (newStatus === 'Blocked') {
                        updates.blocked_flag = true;
                      } else if (task.status === 'Blocked') {
                        updates.blocked_flag = false;
                        updates.blocker_reason = null;
                      }
                      handleInlineEdit(task.id, updates);
                    }}
                  >
                    <option className="dark:bg-gray-800">Not Started</option>
                    <option className="dark:bg-gray-800">In Progress</option>
                    <option className="dark:bg-gray-800">On Hold</option>
                    <option className="dark:bg-gray-800">Blocked</option>
                    <option className="dark:bg-gray-800">Complete</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="date" 
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 text-sm cursor-pointer"
                    value={task.due_date ? task.due_date.split('T')[0] : ''}
                    onChange={(e) => handleInlineEdit(task.id, { due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  />
                </td>
                <td className="px-4 py-2">
                  <select 
                    className={`bg-transparent border-none focus:ring-0 p-0 cursor-pointer ${task.priority === 'Critical' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                    value={task.priority}
                    onChange={(e) => handleInlineEdit(task.id, { priority: e.target.value as Task['priority'] })}
                  >
                    <option className="dark:bg-gray-800">Low</option>
                    <option className="dark:bg-gray-800">Medium</option>
                    <option className="dark:bg-gray-800">High</option>
                    <option className="dark:bg-gray-800">Critical</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="number" step="0.5"
                    className="w-16 bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                    value={task.planned_hours || ''}
                    placeholder="-"
                    onChange={(e) => handleInlineEdit(task.id, { planned_hours: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="number" step="0.5"
                    className="w-16 bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                    value={task.actual_hours || ''}
                    placeholder="-"
                    onChange={(e) => handleInlineEdit(task.id, { actual_hours: e.target.value ? parseFloat(e.target.value) : null })}
                  />
                </td>
                <td className="px-4 py-2">
                  <input 
                    type="text" 
                    className={`w-full bg-transparent border-none focus:ring-0 p-0 text-xs ${task.status === 'Blocked' ? 'text-red-600 dark:text-red-400 font-medium placeholder-red-300 dark:placeholder-red-900/50' : 'text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-600'}`}
                    value={task.blocker_reason || ''}
                    placeholder={task.status === 'Blocked' ? "Enter reason..." : ""}
                    onChange={(e) => handleInlineEdit(task.id, { blocker_reason: e.target.value })}
                    disabled={task.status !== 'Blocked'}
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <button 
                    onClick={() => handleInlineEdit(task.id, { archived_flag: !task.archived_flag })}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                    title={task.archived_flag ? "Unarchive Task" : "Archive Task"}
                  >
                    {task.archived_flag ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No tasks for today. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
