import { useState, useEffect } from 'react';
import { Plus, Briefcase, Trash2 } from 'lucide-react';
import { useUser } from '../context/UserContext';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { users } = useUser();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      fetchTasks(activeProjectId);
    } else {
      setTasks([]);
    }
  }, [activeProjectId]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
      if (data.length > 0 && !activeProjectId) {
        setActiveProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (projectId: string) => {
    try {
      const res = await fetch(`/api/tasks?project_id=${projectId}`);
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleCreateProject = async () => {
    const newProject = {
      name: 'New Project',
      code: 'NEW-' + Math.floor(Math.random() * 100),
      owner_user_id: users[0]?.id,
      status: 'Pending',
      priority: 'Medium'
    };

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      const created = await res.json();
      setProjects([...projects, created]);
      setActiveProjectId(created.id);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUpdateProject = async (id: string, updates: any) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update project:', error);
      fetchProjects();
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This will unlink all tasks associated with it.')) return;
    
    setProjects(prev => prev.filter(p => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId(projects.find(p => p.id !== id)?.id || null);
    }
    
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    } catch (error) {
      console.error('Failed to delete project:', error);
      fetchProjects();
    }
  };

  const handleTaskInlineEdit = async (taskId: string, updates: any) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      if (activeProjectId) fetchTasks(activeProjectId);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading projects...</div>;

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="p-8 max-w-7xl mx-auto w-full h-full flex flex-col transition-colors duration-200">
      <div className="mb-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6" />
            Projects
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage project templates and track associated tasks.</p>
        </div>
        <button 
          onClick={handleCreateProject}
          className="bg-primary-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-primary-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 flex gap-4 overflow-x-auto shrink-0 rounded-t-lg">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeProjectId === p.id
                    ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200 dark:border-gray-700'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-8 mt-6">
            {activeProject && (
              <div className="space-y-8">
                {/* Project Details Card */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors duration-200">
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-4 flex-1">
                      <input 
                        className="text-lg font-bold bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 px-2 py-1 -ml-2 rounded text-gray-900 dark:text-white w-64 placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                        value={activeProject.name}
                        onChange={(e) => handleUpdateProject(activeProject.id, { name: e.target.value })}
                        placeholder="Project Name"
                      />
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <input 
                        className="text-sm font-mono bg-transparent border border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 px-2 py-1 -ml-2 rounded text-gray-500 dark:text-gray-400 w-28 uppercase placeholder-gray-400 dark:placeholder-gray-600 transition-all"
                        value={activeProject.code}
                        onChange={(e) => handleUpdateProject(activeProject.id, { code: e.target.value })}
                        placeholder="CODE"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        className="text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                        value={activeProject.status}
                        onChange={(e) => handleUpdateProject(activeProject.id, { status: e.target.value })}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                      <select
                        className={`text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors ${activeProject.priority === 'Critical' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-900 dark:text-gray-100'}`}
                        value={activeProject.priority}
                        onChange={(e) => handleUpdateProject(activeProject.id, { priority: e.target.value })}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                      <button 
                        onClick={() => handleDeleteProject(activeProject.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ml-2"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* 1. Core Project Identity & Governance */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">1. Core Identity & Governance</h3>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client Name</label>
                        <input 
                          type="text"
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                          value={activeProject.client_name || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { client_name: e.target.value })}
                          placeholder="e.g. ACME Corp"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project Lead (Owner)</label>
                        <select
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                          value={activeProject.owner_user_id || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { owner_user_id: e.target.value })}
                        >
                          <option value="">Select Owner...</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Support Team</label>
                        <input 
                          type="text"
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                          value={activeProject.support_team || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { support_team: e.target.value })}
                          placeholder="e.g. Jane (Design), Bob (Dev)"
                        />
                      </div>
                    </div>

                    {/* 2. Client & External Context */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">2. Client & External Context</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client POC</label>
                          <input 
                            type="text"
                            className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                            value={activeProject.client_poc || ''}
                            onChange={(e) => handleUpdateProject(activeProject.id, { client_poc: e.target.value })}
                            placeholder="Name & Role"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contact Method</label>
                          <input 
                            type="text"
                            className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                            value={activeProject.preferred_contact_method || ''}
                            onChange={(e) => handleUpdateProject(activeProject.id, { preferred_contact_method: e.target.value })}
                            placeholder="e.g. Slack Connect"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project Links</label>
                        <input 
                          type="text"
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                          value={activeProject.project_links || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { project_links: e.target.value })}
                          placeholder="Drive, Figma, etc."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tools & Platform</label>
                        <input 
                          type="text"
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                          value={activeProject.tools_platform || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { tools_platform: e.target.value })}
                          placeholder="e.g. Articulate Rise"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Log-ins</label>
                        <input 
                          type="text"
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                          value={activeProject.logins || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { logins: e.target.value })}
                          placeholder="Link to 1Password / Vault"
                        />
                      </div>
                    </div>

                    {/* 3. Operational Targets */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-2">3. Operational Targets</h3>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target Start Date</label>
                        <input 
                          type="date"
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                          value={activeProject.target_start_date ? activeProject.target_start_date.split('T')[0] : ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { target_start_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target End Date / Go-Live</label>
                        <input 
                          type="date"
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors"
                          value={activeProject.target_end_date ? activeProject.target_end_date.split('T')[0] : ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { target_end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Tasks Table */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors duration-200">
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Tasks</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-100 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                        <tr>
                          <th className="px-4 py-3 font-medium">Task</th>
                          <th className="px-4 py-3 font-medium w-32">Owner</th>
                          <th className="px-4 py-3 font-medium w-32">Status</th>
                          <th className="px-4 py-3 font-medium w-24">Planned Hrs</th>
                          <th className="px-4 py-3 font-medium w-24">Actual Hrs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {tasks.map(task => (
                          <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                                value={task.title}
                                onChange={(e) => handleTaskInlineEdit(task.id, { title: e.target.value })}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <select 
                                className="bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 cursor-pointer w-full text-sm"
                                value={task.owner_user_id || ''}
                                onChange={(e) => handleTaskInlineEdit(task.id, { owner_user_id: e.target.value || null })}
                              >
                                <option value="" className="dark:bg-gray-800 text-gray-400">Unassigned</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id} className="dark:bg-gray-800">{u.full_name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <select 
                                className="bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 cursor-pointer"
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
                                  handleTaskInlineEdit(task.id, updates);
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
                                type="number" step="0.5"
                                className="w-16 bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                                value={task.planned_hours || ''}
                                placeholder="-"
                                onChange={(e) => handleTaskInlineEdit(task.id, { planned_hours: e.target.value ? parseFloat(e.target.value) : null })}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" step="0.5"
                                className="w-16 bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                                value={task.actual_hours || ''}
                                placeholder="-"
                                onChange={(e) => handleTaskInlineEdit(task.id, { actual_hours: e.target.value ? parseFloat(e.target.value) : null })}
                              />
                            </td>
                          </tr>
                        ))}
                        {tasks.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                              No tasks assigned to this project yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-dashed rounded-lg transition-colors duration-200">
          <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No Projects</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get started by creating a new project template.</p>
        </div>
      )}
    </div>
  );
}
