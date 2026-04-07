import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Users, Briefcase } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280']; // Green, Blue, Yellow, Red, Gray

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [tasksRes, projectsRes, usersRes] = await Promise.all([
          fetch('/api/tasks?include_archived=true'),
          fetch('/api/projects'),
          fetch('/api/users')
        ]);
        
        const tasks = await tasksRes.json();
        const projects = await projectsRes.json();
        const users = await usersRes.json();

        // Calculate metrics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.status === 'Complete').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const blockedTasks = tasks.filter((t: any) => t.status === 'Blocked' || t.blocked_flag).length;
        const activeProjects = projects.filter((p: any) => p.status === 'Active').length;

        // Status distribution for Pie Chart
        const statusCounts = tasks.reduce((acc: any, task: any) => {
          const status = task.status || 'Not Started';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        const pieData = [
          { name: 'Complete', value: statusCounts['Complete'] || 0 },
          { name: 'In Progress', value: statusCounts['In Progress'] || 0 },
          { name: 'On Hold', value: statusCounts['On Hold'] || 0 },
          { name: 'Blocked', value: statusCounts['Blocked'] || 0 },
          { name: 'Not Started', value: statusCounts['Not Started'] || 0 },
        ].filter(d => d.value > 0);

        // User workload for Bar Chart
        const userWorkload = users.map((user: any) => {
          const userTasks = tasks.filter((t: any) => t.owner_user_id === user.id);
          return {
            name: user.full_name.split(' ')[0], // First name
            completed: userTasks.filter((t: any) => t.status === 'Complete').length,
            active: userTasks.filter((t: any) => t.status !== 'Complete').length,
          };
        });

        setStats({
          totalTasks,
          completedTasks,
          completionRate,
          blockedTasks,
          activeProjects,
          totalUsers: users.length,
          pieData,
          userWorkload
        });
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading || !stats) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading dashboard...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full h-full flex flex-col transition-colors duration-200">
      <div className="mb-8 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          Team Efficiency Overview
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">High-level metrics on team performance and pipeline health.</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completionRate}%</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTasks}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Blocked Tasks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.blockedTasks}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4 transition-colors duration-200">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Projects</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeProjects}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Task Status Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Task Status Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Workload */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Team Workload & Completion</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.userWorkload}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  cursor={{ fill: '#374151', opacity: 0.4 }}
                />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="active" name="Active" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
