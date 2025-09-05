"use client";
import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaMinus, FaCodeBranch, FaHistory, FaClock, FaEye, FaTrash, FaCheck, FaUndo } from 'react-icons/fa';
import { VscGitCommit, VscSourceControl, VscDiff, VscGitPullRequest } from 'react-icons/vsc';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

interface GitFile {
  path: string;
  status: 'modified' | 'staged' | 'untracked';
}

interface GitStatus {
  modified: string[];
  staged: string[];
  untracked: string[];
}

interface Commit {
  commit_sha: string;
  parent_sha: string | null;
  author: string | null;
  date: string | null;
  message: string;
}

interface GitViewProps {
  projectId: string;
  onFileSelect: (path: string, isStaged?: boolean) => void;
  selectedFile?: string;
}

export default function GitView({ projectId, onFileSelect, selectedFile }: GitViewProps) {
  const [gitStatus, setGitStatus] = useState<GitStatus>({ modified: [], staged: [], untracked: [] });
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitHistory, setShowCommitHistory] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  // Load Git status
  const loadGitStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/git/${projectId}/status`);
      if (response.ok) {
        const status = await response.json();
        setGitStatus(status);
      }
    } catch (error) {
      console.error('Failed to load git status:', error);
    }
  }, [projectId]);

  // Load commit history
  const loadCommits = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/commits/${projectId}`);
      if (response.ok) {
        const commitsData = await response.json();
        setCommits(commitsData);
      }
    } catch (error) {
      console.error('Failed to load commits:', error);
    }
  }, [projectId]);

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadGitStatus(), loadCommits()]);
      setLoading(false);
    };
    loadData();
  }, [loadGitStatus, loadCommits]);

  // Git operations
  const stageFile = async (filePath: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/git/${projectId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath })
      });
      if (response.ok) {
        await loadGitStatus();
      }
    } catch (error) {
      console.error('Failed to stage file:', error);
    }
  };

  const unstageFile = async (filePath: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/git/${projectId}/unstage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath })
      });
      if (response.ok) {
        await loadGitStatus();
      }
    } catch (error) {
      console.error('Failed to unstage file:', error);
    }
  };

  const discardChanges = async (filePath: string) => {
    if (confirm(`Are you sure you want to discard changes to ${filePath}?`)) {
      try {
        const response = await fetch(`${API_BASE}/api/git/${projectId}/discard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: filePath })
        });
        if (response.ok) {
          await loadGitStatus();
        }
      } catch (error) {
        console.error('Failed to discard changes:', error);
      }
    }
  };

  const stageAll = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/git/${projectId}/stage-all`, {
        method: 'POST'
      });
      if (response.ok) {
        await loadGitStatus();
      }
    } catch (error) {
      console.error('Failed to stage all:', error);
    }
  };

  const unstageAll = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/git/${projectId}/unstage-all`, {
        method: 'POST'
      });
      if (response.ok) {
        await loadGitStatus();
      }
    } catch (error) {
      console.error('Failed to unstage all:', error);
    }
  };

  const commitStaged = async () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/git/${projectId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage })
      });
      if (response.ok) {
        setCommitMessage('');
        await Promise.all([loadGitStatus(), loadCommits()]);
      }
    } catch (error) {
      console.error('Failed to commit:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (status: string) => {
    switch (status) {
      case 'modified':
        return <span className="text-orange-500">M</span>;
      case 'staged':
        return <span className="text-green-500">A</span>;
      case 'untracked':
        return <span className="text-blue-500">U</span>;
      default:
        return <span className="text-gray-500">?</span>;
    }
  };

  const allFiles = [
    ...gitStatus.modified.map(path => ({ path, status: 'modified' as const })),
    ...gitStatus.untracked.map(path => ({ path, status: 'untracked' as const }))
  ];

  const stagedFiles = gitStatus.staged.map(path => ({ path, status: 'staged' as const }));

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <VscSourceControl size={20} />
          <span>Loading Git status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0d0d0d]">
      {/* Header with tabs */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-[#1a1a1a]">
        <div className="flex">
          <button
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              !showCommitHistory
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setShowCommitHistory(false)}
          >
            <VscSourceControl className="inline mr-1" size={14} />
            Changes
          </button>
          <button
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              showCommitHistory
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setShowCommitHistory(true)}
          >
            <FaHistory className="inline mr-1" size={12} />
            History
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {!showCommitHistory ? (
          /* Changes view */
          <div className="h-full flex flex-col">
            {/* Staged changes section */}
            {stagedFiles.length > 0 && (
              <div className="flex-shrink-0 border-b border-gray-200 dark:border-[#1a1a1a]">
                <div className="px-3 py-2 bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Staged Changes ({stagedFiles.length})
                    </span>
                  </div>
                  <button
                    onClick={unstageAll}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                    title="Unstage All"
                  >
                    <FaMinus size={10} />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {stagedFiles.map((file) => (
                    <div
                      key={file.path}
                      className={`flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a1a1a] ${
                        selectedFile === file.path ? 'bg-blue-50 dark:bg-[#094771]' : ''
                      }`}
                      onClick={() => onFileSelect(file.path, true)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(file.status)}
                        <span className="truncate text-gray-700 dark:text-gray-300">{file.path}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          unstageFile(file.path);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                        title="Unstage"
                      >
                        <FaMinus size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commit section */}
            {stagedFiles.length > 0 && (
              <div className="flex-shrink-0 border-b border-gray-200 dark:border-[#1a1a1a] p-3">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Commit message"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && commitStaged()}
                  />
                  <button
                    onClick={commitStaged}
                    disabled={!commitMessage.trim()}
                    className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <VscGitCommit size={14} />
                    Commit
                  </button>
                </div>
              </div>
            )}

            {/* Changes section */}
            <div className="flex-1 overflow-y-auto">
              {allFiles.length > 0 ? (
                <>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Changes ({allFiles.length})
                    </span>
                    <button
                      onClick={stageAll}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                      title="Stage All"
                    >
                      <FaPlus size={10} />
                    </button>
                  </div>
                  {allFiles.map((file) => (
                    <div
                      key={file.path}
                      className={`flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a1a1a] ${
                        selectedFile === file.path ? 'bg-blue-50 dark:bg-[#094771]' : ''
                      }`}
                      onClick={() => onFileSelect(file.path, false)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(file.status)}
                        <span className="truncate text-gray-700 dark:text-gray-300">{file.path}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stageFile(file.path);
                          }}
                          className="text-gray-400 hover:text-green-500 p-1"
                          title="Stage"
                        >
                          <FaPlus size={10} />
                        </button>
                        {file.status === 'modified' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              discardChanges(file.path);
                            }}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="Discard Changes"
                          >
                            <FaUndo size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 p-8">
                  <div className="text-center">
                    <VscGitCommit size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No changes</p>
                    <p className="text-xs mt-1">All files are committed</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Commit history view */
          <div className="h-full overflow-y-auto">
            {commits.length > 0 ? (
              commits.map((commit) => (
                <div
                  key={commit.commit_sha}
                  className={`px-3 py-3 border-b border-gray-200 dark:border-[#1a1a1a] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a] ${
                    selectedCommit === commit.commit_sha ? 'bg-blue-50 dark:bg-[#094771]' : ''
                  }`}
                  onClick={() => setSelectedCommit(commit.commit_sha)}
                >
                  <div className="flex items-start gap-3">
                    <VscGitCommit size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {commit.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{commit.author}</span>
                        <span>•</span>
                        <span>{commit.date ? formatDate(commit.date) : 'Unknown date'}</span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                        {commit.commit_sha.substring(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 p-8">
                <div className="text-center">
                  <FaHistory size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No commits yet</p>
                  <p className="text-xs mt-1">Make your first commit to see history</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}