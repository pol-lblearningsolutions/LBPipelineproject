import { useState, useEffect } from 'react';
import { Plus, Briefcase, Trash2, Link as LinkIcon, X, Archive, ArchiveRestore, FileText, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import TaskDependencyGraph from '../components/TaskDependencyGraph';
import { cn } from '../lib/utils';
import { extractProjectFromIntakeWithRetry } from '../services/aiService';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [dependencyModalOpen, setDependencyModalOpen] = useState(false);
  const [selectedTaskForDeps, setSelectedTaskForDeps] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const { users, currentUser } = useUser();

  const [intakeModalOpen, setIntakeModalOpen] = useState(false);
  const [intakeText, setIntakeText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [showArchivedProjects]);

  useEffect(() => {
    if (activeProjectId) {
      fetchTasks(activeProjectId, showArchived);
      fetchDependencies(activeProjectId);
    } else {
      setTasks([]);
      setDependencies([]);
    }
  }, [activeProjectId, showArchived]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?include_archived=${showArchivedProjects}`);
      const data = await res.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (projectId: string, includeArchived: boolean) => {
    try {
      const res = await fetch(`/api/tasks?project_id=${projectId}&include_archived=${includeArchived}`);
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchDependencies = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/dependencies`);
      const data = await res.json();
      setDependencies(data);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    }
  };

  const handleAddDependency = async (taskId: string, dependsOnTaskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depends_on_task_id: dependsOnTaskId })
      });
      if (res.ok) {
        if (activeProjectId) fetchDependencies(activeProjectId);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add dependency');
      }
    } catch (error) {
      console.error('Error adding dependency:', error);
    }
  };

  const handleRemoveDependency = async (taskId: string, dependencyId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/dependencies/${dependencyId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (activeProjectId) fetchDependencies(activeProjectId);
      }
    } catch (error) {
      console.error('Error removing dependency:', error);
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
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify(newProject)
      });
      const created = await res.json();
      setProjects([...projects, created]);
      setActiveProjectId(created.id);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleExtractProject = async () => {
    if (!intakeText.trim()) return;
    
    setIsExtracting(true);
    try {
      const extractedProject = await extractProjectFromIntakeWithRetry(intakeText, users);
      
      const newProject = {
        name: extractedProject.name || 'New Project',
        code: 'NEW-' + Math.floor(Math.random() * 1000),
        client_name: extractedProject.client_name || null,
        owner_user_id: extractedProject.owner_user_id || users[0]?.id,
        support_team: extractedProject.support_team || null,
        client_poc: extractedProject.client_poc || null,
        preferred_contact_method: extractedProject.preferred_contact_method || null,
        project_links: extractedProject.project_links || null,
        tools_platform: extractedProject.tools_platform || null,
        logins: extractedProject.logins || null,
        status: extractedProject.status || 'Pending',
        priority: extractedProject.priority || 'Medium',
        target_start_date: extractedProject.target_start_date ? new Date(extractedProject.target_start_date).toISOString() : null,
        target_end_date: extractedProject.target_end_date ? new Date(extractedProject.target_end_date).toISOString() : null,
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify(newProject)
      });
      
      if (!res.ok) throw new Error('Failed to create project');
      
      const created = await res.json();
      setProjects([...projects, created]);
      setActiveProjectId(created.id);
      
      setIntakeModalOpen(false);
      setIntakeText('');
    } catch (error) {
      console.error('Failed to extract and create project:', error);
      alert('Failed to extract project details. Please try again.');
    } finally {
      setIsExtracting(false);
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
    
    try {
      const res = await fetch(`/api/projects/${id}`, { 
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser?.id || ''
        }
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }

      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) {
        setActiveProjectId(projects.find(p => p.id !== id)?.id || null);
      }
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      alert(error.message);
      fetchProjects();
    }
  };

  const handleTaskInlineEdit = async (taskId: string, updates: any) => {
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
      if (activeProjectId) fetchTasks(activeProjectId, showArchived);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading projects...</div>;

  const activeProject = projects.find(p => p.id === activeProjectId);
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

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
        <div className="flex gap-3">
          <button 
            onClick={() => setIntakeModalOpen(true)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm font-medium rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Extract from Intake
          </button>
          <button 
            onClick={handleCreateProject}
            className="bg-primary-600 text-white px-4 py-2 text-sm font-medium rounded hover:bg-primary-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {projects.length > 0 ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 flex gap-4 overflow-x-auto shrink-0 rounded-t-lg">
            <button
              onClick={() => setActiveProjectId(null)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                activeProjectId === null
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-200 dark:border-gray-700'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              All Projects
            </button>
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
            {activeProjectId === null ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors duration-200">
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Projects</h3>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-transparent"
                      checked={showArchivedProjects}
                      onChange={(e) => setShowArchivedProjects(e.target.checked)}
                    />
                    Show Archived
                  </label>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-100 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          <div className="resize-x overflow-hidden min-w-[6rem]">Project Name</div>
                        </th>
                        <th className="px-4 py-3 font-medium w-24">
                          <div className="resize-x overflow-hidden min-w-[4rem]">Code</div>
                        </th>
                        <th className="px-4 py-3 font-medium w-32">
                          <div className="resize-x overflow-hidden min-w-[4rem]">Owner</div>
                        </th>
                        <th className="px-4 py-3 font-medium w-32">
                          <div className="resize-x overflow-hidden min-w-[4rem]">Status</div>
                        </th>
                        <th className="px-4 py-3 font-medium w-24">
                          <div className="resize-x overflow-hidden min-w-[4rem]">Priority</div>
                        </th>
                        <th className="px-4 py-3 font-medium w-32">
                          <div className="resize-x overflow-hidden min-w-[4rem]">Target Start</div>
                        </th>
                        <th className="px-4 py-3 font-medium w-32">
                          <div className="resize-x overflow-hidden min-w-[4rem]">Target End</div>
                        </th>
                        <th className="px-4 py-3 font-medium w-20 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {projects.map(project => (
                        <tr key={project.id} className={cn("hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group", project.archived_flag ? "opacity-60" : "")}>
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 font-medium cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                              value={project.name}
                              onChange={(e) => handleUpdateProject(project.id, { name: e.target.value })}
                              onClick={() => setActiveProjectId(project.id)}
                              title="Click to view project details"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="text" 
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-500 dark:text-gray-400 uppercase text-xs"
                              value={project.code}
                              onChange={(e) => handleUpdateProject(project.id, { code: e.target.value })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <select 
                              className="bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 cursor-pointer w-full text-sm"
                              value={project.owner_user_id || ''}
                              onChange={(e) => handleUpdateProject(project.id, { owner_user_id: e.target.value || null })}
                            >
                              <option value="" className="dark:bg-gray-800 text-gray-400">Unassigned</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id} className="dark:bg-gray-800">{u.full_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select 
                              className={cn(
                                "text-xs font-medium rounded px-2 py-1 border-none focus:ring-0 cursor-pointer transition-colors",
                                project.status === 'Completed' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                project.status === 'Active' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                                project.status === 'On Hold' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                              )}
                              value={project.status}
                              onChange={(e) => handleUpdateProject(project.id, { status: e.target.value })}
                            >
                              <option className="dark:bg-gray-800">Pending</option>
                              <option className="dark:bg-gray-800">Active</option>
                              <option className="dark:bg-gray-800">On Hold</option>
                              <option className="dark:bg-gray-800">Completed</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select 
                              className={`bg-transparent border-none focus:ring-0 p-0 cursor-pointer ${project.priority === 'Critical' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                              value={project.priority}
                              onChange={(e) => handleUpdateProject(project.id, { priority: e.target.value })}
                            >
                              <option className="dark:bg-gray-800">Low</option>
                              <option className="dark:bg-gray-800">Medium</option>
                              <option className="dark:bg-gray-800">High</option>
                              <option className="dark:bg-gray-800">Critical</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="date" 
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 text-sm cursor-pointer"
                              value={project.target_start_date ? project.target_start_date.split('T')[0] : ''}
                              onChange={(e) => handleUpdateProject(project.id, { target_start_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="date" 
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 text-sm cursor-pointer"
                              value={project.target_end_date ? project.target_end_date.split('T')[0] : ''}
                              onChange={(e) => handleUpdateProject(project.id, { target_end_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                            />
                          </td>
                          <td className="px-4 py-2 text-center flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleUpdateProject(project.id, { archived_flag: !project.archived_flag })}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                              title={project.archived_flag ? "Unarchive Project" : "Archive Project"}
                            >
                              {project.archived_flag ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                            </button>
                            {isAdmin && (
                              <button 
                                onClick={() => handleDeleteProject(project.id)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {projects.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No projects found. Create one to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeProject ? (
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
                        className={cn(
                          "text-sm font-medium rounded-md px-3 py-1.5 border-none shadow-sm focus:ring-2 focus:ring-primary-500 transition-colors cursor-pointer",
                          activeProject.status === 'Completed' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          activeProject.status === 'Active' ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                          activeProject.status === 'On Hold' ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        )}
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
                        onClick={() => handleUpdateProject(activeProject.id, { archived_flag: !activeProject.archived_flag })}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded transition-colors ml-2"
                        title={activeProject.archived_flag ? "Unarchive Project" : "Archive Project"}
                      >
                        {activeProject.archived_flag ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteProject(activeProject.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client Team & Roles</label>
                        <textarea 
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors resize-y"
                          rows={3}
                          value={activeProject.client_poc || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { client_poc: e.target.value })}
                          placeholder="e.g. Jane Doe - Project Sponsor&#10;John Smith - Lead Designer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project Links</label>
                        <textarea 
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors resize-y"
                          rows={3}
                          value={activeProject.project_links || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { project_links: e.target.value })}
                          placeholder="e.g. Google Drive: https://...&#10;Figma: https://..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tools & Platform</label>
                        <textarea 
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors resize-y"
                          rows={3}
                          value={activeProject.tools_platform || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { tools_platform: e.target.value })}
                          placeholder="e.g. Articulate Rise&#10;Jira"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Log-ins</label>
                        <textarea 
                          className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-colors resize-y"
                          rows={3}
                          value={activeProject.logins || ''}
                          onChange={(e) => handleUpdateProject(activeProject.id, { logins: e.target.value })}
                          placeholder="e.g. 1Password Link 1&#10;Vault Link 2"
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
                  <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Tasks</h3>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-transparent"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                      />
                      Show Archived
                    </label>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-100 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
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
                          <th className="px-4 py-3 font-medium w-32">
                            <div className="resize-x overflow-hidden min-w-[4rem]">Status</div>
                          </th>
                          <th className="px-4 py-3 font-medium w-24">
                            <div className="resize-x overflow-hidden min-w-[4rem]">Planned Hrs</div>
                          </th>
                          <th className="px-4 py-3 font-medium w-24">
                            <div className="resize-x overflow-hidden min-w-[4rem]">Actual Hrs</div>
                          </th>
                          <th className="px-4 py-3 font-medium w-24">
                            <div className="resize-x overflow-hidden min-w-[4rem]">Depends On</div>
                          </th>
                          <th className="px-4 py-3 font-medium w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {tasks.map(task => (
                          <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                            <td className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-transparent"
                                checked={task.carry_over_flag || false}
                                onChange={(e) => handleTaskInlineEdit(task.id, { carry_over_flag: e.target.checked })}
                                title="Mark as Carry Over"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600"
                                value={task.title}
                                onChange={(e) => handleTaskInlineEdit(task.id, { title: e.target.value })}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-700 dark:text-gray-300 text-sm placeholder-gray-400 dark:placeholder-gray-600"
                                value={task.description || ''}
                                placeholder="Add description..."
                                onChange={(e) => handleTaskInlineEdit(task.id, { description: e.target.value })}
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
                            <td className="px-4 py-2">
                              <button
                                onClick={() => {
                                  setSelectedTaskForDeps(task);
                                  setDependencyModalOpen(true);
                                }}
                                className="text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1 text-xs"
                              >
                                <LinkIcon className="w-3 h-3" />
                                {dependencies.filter(d => d.task_id === task.id).length} Deps
                              </button>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button 
                                onClick={() => handleTaskInlineEdit(task.id, { archived_flag: !task.archived_flag })}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                                title={task.archived_flag ? "Unarchive Task" : "Archive Task"}
                              >
                                {task.archived_flag ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {tasks.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                              No tasks assigned to this project yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Task Dependency Graph */}
                {tasks.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors duration-200">
                    <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dependency Graph</h3>
                    </div>
                    <div className="p-4">
                      <TaskDependencyGraph tasks={tasks} dependencies={dependencies} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-dashed rounded-lg transition-colors duration-200">
          <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No Projects</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Get started by creating a new project template.</p>
        </div>
      )}

      {/* Dependency Modal */}
      {dependencyModalOpen && selectedTaskForDeps && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dependencies for "{selectedTaskForDeps.title}"
              </h3>
              <button 
                onClick={() => setDependencyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Dependency</label>
                <select
                  className="w-full text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddDependency(selectedTaskForDeps.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select a task that must be completed first...</option>
                  {tasks
                    .filter(t => t.id !== selectedTaskForDeps.id)
                    .filter(t => !dependencies.some(d => d.task_id === selectedTaskForDeps.id && d.depends_on_task_id === t.id))
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Dependencies</h4>
                <ul className="space-y-2">
                  {dependencies.filter(d => d.task_id === selectedTaskForDeps.id).map(dep => {
                    const depTask = tasks.find(t => t.id === dep.depends_on_task_id);
                    return (
                      <li key={dep.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate pr-4">
                          {depTask?.title || 'Unknown Task'}
                        </span>
                        <button
                          onClick={() => handleRemoveDependency(selectedTaskForDeps.id, dep.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                  {dependencies.filter(d => d.task_id === selectedTaskForDeps.id).length === 0 && (
                    <li className="text-sm text-gray-500 dark:text-gray-400 italic">No dependencies set.</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setDependencyModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Intake Modal */}
      {intakeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Extract Project from Intake
              </h3>
              <button 
                onClick={() => setIntakeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Paste your client intake notes, meeting transcript, or email thread below. Our AI will automatically extract the project details and create a new project for you.
              </p>
              <textarea
                value={intakeText}
                onChange={(e) => setIntakeText(e.target.value)}
                placeholder="Paste intake notes here..."
                className="w-full h-64 p-4 text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIntakeModalOpen(false)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleExtractProject}
                disabled={isExtracting || !intakeText.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  'Extract & Create Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
