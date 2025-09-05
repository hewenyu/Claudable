import React, { useState, useEffect } from 'react';
import { FaGitAlt, FaPlus, FaMinus, FaSync, FaUpload, FaHistory, FaFile, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { VscGitCommit, VscSourceControl, VscDiff, VscCheck, VscClose } from 'react-icons/vsc';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
}

interface GitStatusResponse {
  current_branch: string;
  remote_url?: string;
  ahead: number;
  behind: number;
  has_changes: boolean;
  modified_files: GitFileStatus[];
  staged_files: GitFileStatus[];
  untracked_files: GitFileStatus[];
}

interface CommitHistoryItem {
  commit_sha: string;
  parent_sha?: string;
  author?: string;
  date?: string;
  message: string;
}

interface GitSourceControlProps {
  projectId: string;
  isVisible: boolean;
  onViewDiff?: (filePath: string, staged: boolean) => void;
}

const GitSourceControl: React.FC<GitSourceControlProps> = ({ projectId, isVisible, onViewDiff }) => {
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null);
  const [commitHistory, setCommitHistory] = useState<CommitHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitHistory, setShowCommitHistory] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState({
    staged: true,
    changes: true,
    untracked: true
  });

  // Load Git status
  const loadGitStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/git/status`);
      if (response.ok) {
        const data = await response.json();
        setGitStatus(data);
      } else {
        console.error('Failed to load Git status');
      }
    } catch (error) {
      console.error('Error loading Git status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load commit history
  const loadCommitHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/git/history?limit=20`);
      if (response.ok) {
        const data = await response.json();
        setCommitHistory(data.commits || []);
      }
    } catch (error) {
      console.error('Error loading commit history:', error);
    }
  };

  // Stage/unstage files
  const handleStageFiles = async (files: string[], unstage: boolean = false) => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/git/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, unstage })
      });
      
      if (response.ok) {
        await loadGitStatus();
        setSelectedFiles(new Set());
      } else {
        console.error('Failed to stage/unstage files');
      }
    } catch (error) {
      console.error('Error staging files:', error);
    }
  };

  // Commit changes
  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/git/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage.trim() })
      });
      
      if (response.ok) {
        setCommitMessage('');
        await loadGitStatus();
        await loadCommitHistory();
      } else {
        console.error('Failed to commit changes');
      }
    } catch (error) {
      console.error('Error committing changes:', error);
    }
  };

  // Push to remote
  const handlePush = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/git/push`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await loadGitStatus();
      } else {
        console.error('Failed to push changes');
      }
    } catch (error) {
      console.error('Error pushing changes:', error);
    }
  };

  // Discard changes
  const handleDiscardChanges = async (files: string[]) => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/git/discard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
      });
      
      if (response.ok) {
        await loadGitStatus();
        setSelectedFiles(new Set());
      } else {
        console.error('Failed to discard changes');
      }
    } catch (error) {
      console.error('Error discarding changes:', error);
    }
  };

  // Get file status icon
  const getFileStatusIcon = (status: string) => {
    // Handle compound statuses (e.g., "MM" for staged + unstaged changes)
    if (status.length === 2) {
      const [staged, unstaged] = status;
      return (
        <span className="flex items-center gap-0.5">
          <span className="text-xs text-blue-500" title="Staged changes">{staged}</span>
          <span className="text-xs text-orange-500" title="Unstaged changes">{unstaged}</span>
        </span>
      );
    }
    
    // Single character statuses
    switch (status) {
      case 'M': return <span className="text-orange-500" title="Modified">M</span>;
      case 'A': return <span className="text-green-500" title="Added">A</span>;
      case 'D': return <span className="text-red-500" title="Deleted">D</span>;
      case 'R': return <span className="text-blue-500" title="Renamed">R</span>;
      case 'U': return <span className="text-gray-500" title="Untracked">U</span>;
      default: return <span className="text-gray-400" title={`Status: ${status}`}>{status}</span>;
    }
  };

  // Toggle file selection
  const toggleFileSelection = (filePath: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filePath)) {
      newSelection.delete(filePath);
    } else {
      newSelection.add(filePath);
    }
    setSelectedFiles(newSelection);
  };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle file click to view diff
  const handleFileClick = (filePath: string, staged: boolean) => {
    if (onViewDiff) {
      onViewDiff(filePath, staged);
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (isVisible && projectId) {
      loadGitStatus();
      loadCommitHistory();
    }
  }, [isVisible, projectId]);

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <VscSourceControl className="w-4 h-4" />
          <span className="text-sm font-medium">Source Control</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadGitStatus}
            disabled={loading}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Refresh"
          >
            <FaSync className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCommitHistory(!showCommitHistory)}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Commit History"
          >
            <FaHistory className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Branch info */}
      {gitStatus && (
        <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <FaGitAlt className="w-3 h-3" />
            <span>{gitStatus.current_branch}</span>
            {gitStatus.ahead > 0 && (
              <span className="text-green-500">↑{gitStatus.ahead}</span>
            )}
            {gitStatus.behind > 0 && (
              <span className="text-red-500">↓{gitStatus.behind}</span>
            )}
          </div>
          {gitStatus.remote_url && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-500 truncate">
              {gitStatus.remote_url}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showCommitHistory ? (
          /* Commit History View */
          <div className="h-full overflow-y-auto">
            <div className="p-3">
              <h3 className="text-sm font-medium mb-3">Commit History</h3>
              <div className="space-y-2">
                {commitHistory.map((commit) => (
                  <div
                    key={commit.commit_sha}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <VscGitCommit className="w-4 h-4 mt-0.5 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {commit.message}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>{commit.author}</span>
                          {commit.date && (
                            <span className="ml-2">{formatDate(commit.date)}</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                          {commit.commit_sha.substring(0, 8)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Changes View */
          <div className="h-full overflow-y-auto">
            {/* Commit Section */}
            {gitStatus && (gitStatus.staged_files.length > 0 || gitStatus.has_changes) && (
              <div className="p-3 border-b border-gray-200 dark:border-[#1a1a1a]">
                <div className="space-y-3">
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message"
                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCommit}
                      disabled={!commitMessage.trim() || gitStatus.staged_files.length === 0}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <VscCheck className="w-4 h-4" />
                      Commit
                    </button>
                    {gitStatus.ahead > 0 && (
                      <button
                        onClick={handlePush}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <FaUpload className="w-3 h-3" />
                        Push
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* File Changes */}
            {gitStatus && (
              <div className="p-3 space-y-4">
                {/* Staged Changes */}
                {gitStatus.staged_files.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSection('staged')}
                      className="flex items-center gap-2 w-full text-left text-sm font-medium py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      {expandedSections.staged ? '▼' : '▶'}
                      <span>Staged Changes ({gitStatus.staged_files.length})</span>
                    </button>
                    {expandedSections.staged && (
                      <div className="mt-2 space-y-1">
                        {gitStatus.staged_files.map((file) => (
                          <div
                            key={file.path}
                            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(file.path)}
                              onChange={() => toggleFileSelection(file.path)}
                              className="w-3 h-3"
                            />
                            {getFileStatusIcon(file.status)}
                            <FaFile className="w-3 h-3 text-gray-500" />
                            <span className="text-sm flex-1 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" 
                                  onClick={() => handleFileClick(file.path, true)}
                                  title="Click to view diff"
                            >
                              {file.path}
                            </span>
                            <button
                              onClick={() => handleStageFiles([file.path], true)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
                              title="Unstage"
                            >
                              <FaMinus className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Modified Files */}
                {gitStatus.modified_files.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSection('changes')}
                      className="flex items-center gap-2 w-full text-left text-sm font-medium py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      {expandedSections.changes ? '▼' : '▶'}
                      <span>Changes ({gitStatus.modified_files.length})</span>
                    </button>
                    {expandedSections.changes && (
                      <div className="mt-2 space-y-1">
                        {gitStatus.modified_files.map((file) => (
                          <div
                            key={file.path}
                            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(file.path)}
                              onChange={() => toggleFileSelection(file.path)}
                              className="w-3 h-3"
                            />
                            {getFileStatusIcon(file.status)}
                            <FaFile className="w-3 h-3 text-gray-500" />
                            <span className="text-sm flex-1 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" 
                                  onClick={() => handleFileClick(file.path, false)}
                                  title="Click to view diff"
                            >
                              {file.path}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                              <button
                                onClick={() => handleStageFiles([file.path])}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-green-500 transition-colors"
                                title="Stage"
                              >
                                <FaPlus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDiscardChanges([file.path])}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
                                title="Discard changes"
                              >
                                <FaTrash className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Untracked Files */}
                {gitStatus.untracked_files.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleSection('untracked')}
                      className="flex items-center gap-2 w-full text-left text-sm font-medium py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      {expandedSections.untracked ? '▼' : '▶'}
                      <span>Untracked Files ({gitStatus.untracked_files.length})</span>
                    </button>
                    {expandedSections.untracked && (
                      <div className="mt-2 space-y-1">
                        {gitStatus.untracked_files.map((file) => (
                          <div
                            key={file.path}
                            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(file.path)}
                              onChange={() => toggleFileSelection(file.path)}
                              className="w-3 h-3"
                            />
                            {getFileStatusIcon(file.status)}
                            <FaFile className="w-3 h-3 text-gray-500" />
                            <span className="text-sm flex-1 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" 
                                  onClick={() => handleFileClick(file.path, false)}
                                  title="Click to view diff"
                            >
                              {file.path}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                              <button
                                onClick={() => handleStageFiles([file.path])}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-green-500 transition-colors"
                                title="Stage"
                              >
                                <FaPlus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDiscardChanges([file.path])}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete untracked file"
                              >
                                <FaTrash className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bulk Actions */}
                {selectedFiles.size > 0 && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStageFiles(Array.from(selectedFiles))}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <FaPlus className="w-3 h-3" />
                        Stage ({selectedFiles.size})
                      </button>
                      <button
                        onClick={() => handleDiscardChanges(Array.from(selectedFiles))}
                        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <FaTrash className="w-3 h-3" />
                        Discard ({selectedFiles.size})
                      </button>
                    </div>
                  </div>
                )}

                {/* No Changes */}
                {!gitStatus.has_changes && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <VscSourceControl className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No changes detected</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GitSourceControl;