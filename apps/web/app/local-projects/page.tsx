"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { GitBranch, Plus, RefreshCw, Trash2, FolderGit2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

interface GitProject {
  name: string;
  path: string;
  is_git: boolean;
  current_branch?: string;
  branches: string[];
  remote_url?: string;
  last_commit?: string;
  last_modified?: string;
}

interface GitBranch {
  name: string;
  is_current: boolean;
  is_remote: boolean;
}

interface WorkspaceProject {
  id: string;
  name: string;
  local_git_project_name: string;
  current_branch: string;
  available_branches: string[];
  git_url?: string;
  last_active_at?: string;
  created_at: string;
}

export default function LocalProjectsPage() {
  const [gitProjects, setGitProjects] = useState<GitProject[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<GitProject | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneName, setCloneName] = useState('');
  const [cloning, setCloning] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<WorkspaceProject | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const router = useRouter();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadGitProjects = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/git-projects/`);
      if (response.ok) {
        const data = await response.json();
        setGitProjects(data);
      }
    } catch (error) {
      console.error('Failed to load Git projects:', error);
      showToast('Failed to load Git projects', 'error');
    }
  };

  const loadWorkspaces = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/workspace/`);
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadGitProjects(), loadWorkspaces()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleCreateWorkspace = async () => {
    if (!selectedProject || !selectedBranch) return;
    
    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/api/workspace/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local_git_project_name: selectedProject.name,
          branch_name: selectedBranch,
          workspace_name: workspaceName || `${selectedProject.name} (${selectedBranch})`
        })
      });

      if (response.ok) {
        const workspace = await response.json();
        showToast('Workspace created successfully', 'success');
        setShowCreateWorkspace(false);
        setSelectedProject(null);
        setSelectedBranch('');
        setWorkspaceName('');
        await loadWorkspaces();
        
        // Navigate to the new workspace
        router.push(`/${workspace.id}/chat`);
      } else {
        const error = await response.json().catch(() => ({ detail: 'Failed to create workspace' }));
        showToast(error.detail || 'Failed to create workspace', 'error');
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
      showToast('Failed to create workspace', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCloneRepository = async () => {
    if (!cloneUrl.trim()) return;
    
    setCloning(true);
    try {
      const response = await fetch(`${API_BASE}/api/git-projects/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          git_url: cloneUrl,
          project_name: cloneName || undefined
        })
      });

      if (response.ok) {
        showToast('Repository cloning started in background', 'success');
        setShowCloneModal(false);
        setCloneUrl('');
        setCloneName('');
        // Refresh projects after a short delay
        setTimeout(() => loadGitProjects(), 2000);
      } else {
        const error = await response.json().catch(() => ({ detail: 'Failed to clone repository' }));
        showToast(error.detail || 'Failed to clone repository', 'error');
      }
    } catch (error) {
      console.error('Failed to clone repository:', error);
      showToast('Failed to clone repository', 'error');
    } finally {
      setCloning(false);
    }
  };

  const handleFetchProject = async (projectName: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/git-projects/${projectName}/fetch`, {
        method: 'POST'
      });

      if (response.ok) {
        showToast('Git fetch completed', 'success');
        await loadGitProjects();
      } else {
        const error = await response.json().catch(() => ({ detail: 'Failed to fetch' }));
        showToast(error.detail || 'Failed to fetch', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
      showToast('Failed to fetch project', 'error');
    }
  };

  const handleDeleteWorkspace = async (workspace: WorkspaceProject) => {
    setWorkspaceToDelete(workspace);
  };

  const confirmDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/api/workspace/${workspaceToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast('Workspace deleted successfully', 'success');
        setWorkspaceToDelete(null);
        await loadWorkspaces();
      } else {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete workspace' }));
        showToast(error.detail || 'Failed to delete workspace', 'error');
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      showToast('Failed to delete workspace', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading local projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Local Git Projects</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your local Git repositories and create workspaces</p>
            </div>
            <button
              onClick={() => setShowCloneModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Clone Repository
            </button>
          </div>
        </div>

        {/* Existing Workspaces */}
        {workspaces.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Active Workspaces</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-orange-500 transition-colors relative group hover:scale-105 duration-200"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => router.push(`/${workspace.id}/chat`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{workspace.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{workspace.local_git_project_name}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded ml-2">
                        <GitBranch className="w-3 h-3" />
                        {workspace.current_branch}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Created {formatTime(workspace.created_at)}
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkspace(workspace);
                    }}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete workspace"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Git Projects */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Local Git Projects</h2>
          {gitProjects.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <FolderGit2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No Git projects found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Clone a repository or create projects in your local projects directory
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {gitProjects.map((project) => (
                <div key={project.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                      {project.remote_url && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{project.remote_url}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleFetchProject(project.name)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Git fetch"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded">
                      <GitBranch className="w-3 h-3" />
                      {project.current_branch}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {project.branches.length} branches
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setSelectedBranch(project.current_branch || '');
                      setWorkspaceName('');
                      setShowCreateWorkspace(true);
                    }}
                    className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Create Workspace
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Workspace Modal */}
        {showCreateWorkspace && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create Workspace: {selectedProject.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder={`${selectedProject.name} (${selectedBranch})`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Branch
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {selectedProject.branches.map((branch) => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateWorkspace(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={creating || !selectedBranch}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clone Repository Modal */}
        {showCloneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Clone Repository
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Git URL (SSH or HTTPS)
                  </label>
                  <input
                    type="text"
                    value={cloneUrl}
                    onChange={(e) => setCloneUrl(e.target.value)}
                    placeholder="git@github.com:user/repo.git"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Name (optional)
                  </label>
                  <input
                    type="text"
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    placeholder="Will extract from URL if empty"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCloneModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloneRepository}
                  disabled={cloning || !cloneUrl.trim()}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cloning ? 'Cloning...' : 'Clone'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Workspace Confirmation Modal */}
        {workspaceToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Delete Workspace
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete the workspace "{workspaceToDelete.name}"? This action cannot be undone. 
                The underlying Git project will not be affected.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setWorkspaceToDelete(null)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteWorkspace}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete Workspace'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Messages */}
        {toast && (
          <div className="fixed bottom-4 right-4 z-50">
            <div
              className={`px-6 py-4 rounded-lg shadow-lg border flex items-center gap-3 max-w-sm backdrop-blur-lg ${
                toast.type === 'success'
                  ? 'bg-green-500/20 border-green-500/30 text-green-400'
                  : 'bg-red-500/20 border-red-500/30 text-red-400'
              }`}
            >
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}