import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useUser } from '../context/UserContext';
import { Shield, User as UserIcon } from 'lucide-react';

export default function TeamView() {
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useUser();

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, tasksRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/tasks') // Fetching all active tasks for simplicity in this view
      ]);
      
      const usersData = await usersRes.json();
      const tasksData = await tasksRes.json();
      
      setUsers(usersData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update role');
      }

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error: any) {
      console.error('Failed to change role:', error);
      alert(error.message);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading...</div>;

  // Group tasks by user
  const tasksByUser = users.map(user => {
    const userTasks = tasks.filter(t => t.owner_user_id === user.id);
    const plannedHours = userTasks.reduce((sum, t) => sum + (t.planned_hours || 0), 0);
    const completedTasks = userTasks.filter(t => t.status === 'Complete').length;
    const blockedTasks = userTasks.filter(t => t.status === 'Blocked').length;
    const inProgressTasks = userTasks.filter(t => t.status === 'In Progress').length;
    const onHoldTasks = userTasks.filter(t => t.status === 'On Hold').length;
    
    return {
      ...user,
      tasks: userTasks,
      plannedHours,
      completedTasks,
      blockedTasks,
      inProgressTasks,
      onHoldTasks,
      totalTasks: userTasks.length
    };
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full h-full flex flex-col transition-colors duration-200">
      <div className="mb-8 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Workload & Roles</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Overview of active tasks, capacity, and team permissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 pb-8 content-start">
        {tasksByUser.map(user => (
          <div key={user.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-sm font-medium text-primary-700 dark:text-primary-300">
                  {user.full_name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{user.full_name}</h3>
                  {isAdmin && user.id !== currentUser?.id ? (
                    <select
                      className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 mt-1 text-gray-700 dark:text-gray-300 focus:ring-primary-500 focus:border-primary-500"
                      value={user.role.toLowerCase()}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {user.role.toLowerCase() === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                      <span className="capitalize">{user.role}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-5 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium mb-1">Planned Hrs</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{user.plannedHours}h</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium mb-1">Completion</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {user.totalTasks > 0 ? Math.round((user.completedTasks / user.totalTasks) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Active Tasks</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{user.totalTasks - user.completedTasks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600 dark:text-blue-400">In Progress</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{user.inProgressTasks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600 dark:text-yellow-400">On Hold</span>
                  <span className="font-medium text-yellow-600 dark:text-yellow-400">{user.onHoldTasks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-600 dark:text-red-400">Blocked</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{user.blockedTasks}</span>
                </div>
              </div>
            </div>
            
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors">
                View detailed ledger &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
