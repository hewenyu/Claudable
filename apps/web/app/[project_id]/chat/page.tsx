"use client";
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv, MotionH3, MotionP, MotionButton } from '../../../lib/motion';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FaCode, FaDesktop, FaMobileAlt, FaPlay, FaStop, FaSync, FaCog, FaRocket, FaFolder, FaFolderOpen, FaFile, FaFileCode, FaCss3Alt, FaHtml5, FaJs, FaReact, FaPython, FaDocker, FaGitAlt, FaMarkdown, FaDatabase, FaPhp, FaJava, FaRust, FaVuejs, FaLock, FaHome, FaChevronUp, FaChevronRight, FaChevronDown, FaArrowLeft, FaArrowRight, FaRedo } from 'react-icons/fa';
import { SiTypescript, SiGo, SiRuby, SiSvelte, SiJson, SiYaml, SiCplusplus } from 'react-icons/si';
import { VscJson } from 'react-icons/vsc';
import ChatLog from '../../../components/ChatLog';
import { ProjectSettings } from '../../../components/settings/ProjectSettings';
import ChatInput from '../../../components/chat/ChatInput';
import GitSourceControl from '../../../components/GitSourceControl';
import { useUserRequests } from '../../../hooks/useUserRequests';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';

// 더 이상 ProjectSettings을 로드하지 않음 (메인 페이지에서 글로벌 설정으로 관리)

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

// Define assistant brand colors
const assistantBrandColors: { [key: string]: string } = {
  claude: '#DE7356',
  cursor: '#6B7280',
  qwen: '#A855F7',
  gemini: '#4285F4',
  codex: '#000000'
};

// Function to convert hex to CSS filter for tinting white images
// Since the original image is white (#FFFFFF), we can apply filters more accurately
const hexToFilter = (hex: string): string => {
  // For white source images, we need to invert and adjust
  const filters: { [key: string]: string } = {
    '#DE7356': 'brightness(0) saturate(100%) invert(52%) sepia(73%) saturate(562%) hue-rotate(336deg) brightness(95%) contrast(91%)',  // Orange for Claude
    '#6B7280': 'brightness(0) saturate(100%) invert(47%) sepia(7%) saturate(625%) hue-rotate(174deg) brightness(92%) contrast(82%)',  // Gray for Cursor  
    '#A855F7': 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(1532%) hue-rotate(256deg) brightness(95%) contrast(101%)',  // Purple for Qwen
    '#4285F4': 'brightness(0) saturate(100%) invert(40%) sepia(97%) saturate(1449%) hue-rotate(198deg) brightness(97%) contrast(101%)',  // Blue for Gemini
    '#000000': 'brightness(0) saturate(100%)'  // Black for Codex
  };
  return filters[hex] || '';
};

type Entry = { path: string; type: 'file'|'dir'; size?: number };
type Params = { params: { project_id: string } };
type ProjectStatus = 'initializing' | 'active' | 'failed';

// TreeView component for VSCode-style file explorer
interface TreeViewProps {
  entries: Entry[];
  selectedFile: string;
  expandedFolders: Set<string>;
  folderContents: Map<string, Entry[]>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
  onLoadFolder: (path: string) => Promise<void>;
  level: number;
  parentPath?: string;
  getFileIcon: (entry: Entry) => React.ReactElement;
}

function TreeView({ entries, selectedFile, expandedFolders, folderContents, onToggleFolder, onSelectFile, onLoadFolder, level, parentPath = '', getFileIcon }: TreeViewProps) {
  // Ensure entries is an array
  if (!entries || !Array.isArray(entries)) {
    return null;
  }
  
  // Group entries by directory
  const sortedEntries = [...entries].sort((a, b) => {
    // Directories first
    if (a.type === 'dir' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'dir') return 1;
    // Then alphabetical
    return a.path.localeCompare(b.path);
  });

  return (
    <>
      {sortedEntries.map((entry) => {
        // entry.path should already be the full path from API
        const fullPath = entry.path;
        const isExpanded = expandedFolders.has(fullPath);
        const indent = level * 8;
        
        return (
          <div key={fullPath}>
            <div
              className={`group flex items-center h-[22px] px-2 cursor-pointer ${
                selectedFile === fullPath 
                  ? 'bg-blue-100 dark:bg-[#094771]' 
                  : 'hover:bg-gray-100 dark:hover:bg-[#1a1a1a]'
              }`}
              style={{ paddingLeft: `${8 + indent}px` }}
              onClick={async () => {
                if (entry.type === 'dir') {
                  // Load folder contents if not already loaded
                  if (!folderContents.has(fullPath)) {
                    await onLoadFolder(fullPath);
                  }
                  onToggleFolder(fullPath);
                } else {
                  onSelectFile(fullPath);
                }
              }}
            >
              {/* Chevron for folders */}
              <div className="w-4 flex items-center justify-center mr-0.5">
                {entry.type === 'dir' && (
                  isExpanded ? 
                    <span className="w-2.5 h-2.5 text-gray-600 dark:text-[#8b8b8b] flex items-center justify-center"><FaChevronDown size={10} /></span> : 
                    <span className="w-2.5 h-2.5 text-gray-600 dark:text-[#8b8b8b] flex items-center justify-center"><FaChevronRight size={10} /></span>
                )}
              </div>
              
              {/* Icon */}
              <span className="w-4 h-4 flex items-center justify-center mr-1.5">
                {entry.type === 'dir' ? (
                  isExpanded ? 
                    <span className="text-amber-600 dark:text-[#c09553] w-4 h-4 flex items-center justify-center"><FaFolderOpen size={16} /></span> : 
                    <span className="text-amber-600 dark:text-[#c09553] w-4 h-4 flex items-center justify-center"><FaFolder size={16} /></span>
                ) : (
                  getFileIcon(entry)
                )}
              </span>
              
              {/* File/Folder name */}
              <span className={`text-[13px] leading-[22px] ${
                selectedFile === fullPath ? 'text-blue-700 dark:text-white' : 'text-gray-700 dark:text-[#cccccc]'
              }`} style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
                {level === 0 ? (entry.path.split('/').pop() || entry.path) : (entry.path.split('/').pop() || entry.path)}
              </span>
            </div>
            
            {/* Render children if expanded */}
            {entry.type === 'dir' && isExpanded && folderContents.has(fullPath) && (
              <TreeView
                entries={folderContents.get(fullPath) || []}
                selectedFile={selectedFile}
                expandedFolders={expandedFolders}
                folderContents={folderContents}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
                onLoadFolder={onLoadFolder}
                level={level + 1}
                parentPath={fullPath}
                getFileIcon={getFileIcon}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export default function ChatPage({ params }: Params) {
  const projectId = params.project_id;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ★ NEW: UserRequests 상태 관리
  const {
    hasActiveRequests,
    createRequest,
    startRequest,
    completeRequest
  } = useUserRequests({ projectId });
  
  const [projectName, setProjectName] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Workspace/Git branch management state
  const [isWorkspace, setIsWorkspace] = useState<boolean>(false);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [switchingBranch, setSwitchingBranch] = useState<boolean>(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState<boolean>(false);
  
  const [tree, setTree] = useState<Entry[]>([]);
  const [content, setContent] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('.');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [folderContents, setFolderContents] = useState<Map<string, Entry[]>>(new Map());
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'act' | 'chat'>('act');
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [deviceMode, setDeviceMode] = useState<'desktop'|'mobile'>('desktop');
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{name: string, url: string, base64: string}[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  // Initialize states with default values, will be loaded from localStorage in useEffect
  const [hasInitialPrompt, setHasInitialPrompt] = useState<boolean>(false);
  const [agentWorkComplete, setAgentWorkComplete] = useState<boolean>(false);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('initializing');
  const [initializationMessage, setInitializationMessage] = useState('Starting project initialization...');
  const [initialPromptSent, setInitialPromptSent] = useState(false);
  const initialPromptSentRef = useRef(false);
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'explorer' | 'source-control'>('explorer');
  const [publishLoading, setPublishLoading] = useState(false);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [vercelConnected, setVercelConnected] = useState<boolean | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'ready' | 'error'>('idle');
  const deployPollRef = useRef<NodeJS.Timeout | null>(null);
  const [isStartingPreview, setIsStartingPreview] = useState(false);
  const [previewInitializationMessage, setPreviewInitializationMessage] = useState('Starting development server...');
  const [supportsPreview, setSupportsPreview] = useState<boolean | null>(null); // null = checking, true/false = result
  const [previewCheckReason, setPreviewCheckReason] = useState<string>('');
  const [preferredCli, setPreferredCli] = useState<string>('claude');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [usingGlobalDefaults, setUsingGlobalDefaults] = useState<boolean>(true);
  const [thinkingMode, setThinkingMode] = useState<boolean>(false);
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFileUpdating, setIsFileUpdating] = useState(false);
  const [diffContent, setDiffContent] = useState<string | null>(null);
  const [isDiffView, setIsDiffView] = useState(false);
  const [diffFilePath, setDiffFilePath] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [highlightedContent, setHighlightedContent] = useState<string>('');

  // Guarded trigger that can be called from multiple places safely
  const triggerInitialPromptIfNeeded = useCallback(() => {
    const initialPromptFromUrl = searchParams?.get('initial_prompt');
    if (!initialPromptFromUrl) return;
    if (initialPromptSentRef.current) return;
    // Synchronously guard to prevent double ACT calls
    initialPromptSentRef.current = true;
    setInitialPromptSent(true);
    
    // Store the selected model and assistant in sessionStorage when returning
    const cliFromUrl = searchParams?.get('cli');
    const modelFromUrl = searchParams?.get('model');
    if (cliFromUrl) {
      sessionStorage.setItem('selectedAssistant', cliFromUrl);
    }
    if (modelFromUrl) {
      sessionStorage.setItem('selectedModel', modelFromUrl);
    }
    
    // Don't show the initial prompt in the input field
    // setPrompt(initialPromptFromUrl);
    setTimeout(() => {
      sendInitialPrompt(initialPromptFromUrl);
    }, 300);
  }, [searchParams]);

  // Check if project supports preview functionality
  const checkPreviewSupport = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/preview/check`);
      if (response.ok) {
        const data = await response.json();
        setSupportsPreview(data.is_frontend);
        setPreviewCheckReason(data.reason);
        console.log(`Preview support check: ${data.is_frontend ? 'Supported' : 'Not supported'} - ${data.reason}`);
        
        // If project doesn't support preview, switch to code view
        if (!data.is_frontend) {
          setShowPreview(false);
        }
      } else {
        // If endpoint fails, assume it might support preview (backward compatibility)
        setSupportsPreview(true);
        setPreviewCheckReason('Could not determine project type');
      }
    } catch (error) {
      console.error('Failed to check preview support:', error);
      // If check fails, assume it might support preview (backward compatibility)
      setSupportsPreview(true);
      setPreviewCheckReason('Could not check project type');
    }
  }, [projectId]);

  const loadDeployStatus = useCallback(async () => {
    try {
      // Use the same API as ServiceSettings to check actual project service connections
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/services`);
      if (response.ok) {
        const connections = await response.json();
        const githubConnection = connections.find((conn: any) => conn.provider === 'github');
        const vercelConnection = connections.find((conn: any) => conn.provider === 'vercel');
        
        // Check actual project connections (not just token existence)
        setGithubConnected(!!githubConnection);
        setVercelConnected(!!vercelConnection);
        
        // Set published URL only if actually deployed
        if (vercelConnection && vercelConnection.service_data) {
          const sd = vercelConnection.service_data;
          // Only use actual deployment URLs, not predicted ones
          const rawUrl = sd.last_deployment_url || null;
          const url = rawUrl ? (String(rawUrl).startsWith('http') ? String(rawUrl) : `https://${rawUrl}`) : null;
          setPublishedUrl(url || null);
          if (url) {
            setDeploymentStatus('ready');
          } else {
            setDeploymentStatus('idle');
          }
        } else {
          setPublishedUrl(null);
          setDeploymentStatus('idle');
        }
      } else {
        setGithubConnected(false);
        setVercelConnected(false);
        setPublishedUrl(null);
        setDeploymentStatus('idle');
      }

    } catch (e) {
      console.warn('Failed to load deploy status', e);
      setGithubConnected(false);
      setVercelConnected(false);
      setPublishedUrl(null);
      setDeploymentStatus('idle');
    }
  }, [projectId]);

  const checkCurrentDeployment = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/vercel/deployment/current`);
      if (response.ok) {
        const data = await response.json();
        if (data.has_deployment) {
          // 진행 중인 배포가 있으면 상태 설정 및 폴링 시작
          setDeploymentId(data.deployment_id);
          setDeploymentStatus('deploying');
          setPublishLoading(false); // publishLoading은 해제하되 deploymentStatus로 UI 제어
          setShowPublishPanel(true); // 패널 열어서 진행 상황 표시
          startDeploymentPolling(data.deployment_id);
          console.log('🔍 Resuming deployment monitoring:', data.deployment_id);
        }
      }
    } catch (e) {
      console.warn('Failed to check current deployment', e);
    }
  }, [projectId]);

  const startDeploymentPolling = useCallback((depId: string) => {
    if (deployPollRef.current) clearInterval(deployPollRef.current);
    setDeploymentStatus('deploying');
    setDeploymentId(depId);
    
    console.log('🔍 Monitoring deployment:', depId);
    
    deployPollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/projects/${projectId}/vercel/deployment/current`);
        if (!r.ok) return;
        const data = await r.json();
        
        // 진행 중인 배포가 없으면 폴링 중단 (완료됨)
        if (!data.has_deployment) {
          console.log('🔍 Deployment completed - no active deployment');
          
          // 최종 배포 URL 설정
          if (data.last_deployment_url) {
            const url = String(data.last_deployment_url).startsWith('http') ? data.last_deployment_url : `https://${data.last_deployment_url}`;
            console.log('🔍 Deployment complete! URL:', url);
            setPublishedUrl(url);
            setDeploymentStatus('ready');
          } else {
            setDeploymentStatus('idle');
          }
          
          // End publish loading state (중요: 배포가 없어도 loading 해제)
          setPublishLoading(false);
          
          if (deployPollRef.current) {
            clearInterval(deployPollRef.current);
            deployPollRef.current = null;
          }
          return;
        }
        
        // 진행 중인 배포가 있는 경우
        const status = data.status;
        
        // Log only status changes
        if (status && status !== 'QUEUED') {
          console.log('🔍 Deployment status:', status);
        }
        
        // Check if deployment is ready or failed
        const isReady = status === 'READY';
        const isBuilding = status === 'BUILDING' || status === 'QUEUED';
        const isError = status === 'ERROR';
        
        if (isError) {
          console.error('🔍 Deployment failed:', status);
          setDeploymentStatus('error');
          
          // End publish loading state
          setPublishLoading(false);
          
          // Close publish panel after error (with delay to show error message)
          setTimeout(() => {
            setShowPublishPanel(false);
          }, 3000); // Show error for 3 seconds before closing
          
          if (deployPollRef.current) {
            clearInterval(deployPollRef.current);
            deployPollRef.current = null;
          }
          return;
        }
        
        if (isReady && data.deployment_url) {
          const url = String(data.deployment_url).startsWith('http') ? data.deployment_url : `https://${data.deployment_url}`;
          console.log('🔍 Deployment complete! URL:', url);
          setPublishedUrl(url);
          setDeploymentStatus('ready');
          
          // End publish loading state
          setPublishLoading(false);
          
          // Keep panel open to show the published URL
          
          if (deployPollRef.current) {
            clearInterval(deployPollRef.current);
            deployPollRef.current = null;
          }
        } else if (isBuilding) {
          setDeploymentStatus('deploying');
        }
      } catch (error) {
        console.error('🔍 Polling error:', error);
      }
    }, 1000); // 1초 간격으로 변경
  }, [projectId]);

  async function start() {
    // Check if preview is supported before attempting to start
    if (supportsPreview === false) {
      setPreviewError(`Preview not available: ${previewCheckReason}`);
      setTimeout(() => setPreviewError(null), 5000); // Clear error after 5 seconds
      return;
    }
    
    try {
      setIsStartingPreview(true);
      setPreviewInitializationMessage('Starting development server...');
      
      // Simulate progress updates
      setTimeout(() => setPreviewInitializationMessage('Installing dependencies...'), 1000);
      setTimeout(() => setPreviewInitializationMessage('Building your application...'), 2500);
      
      const r = await fetch(`${API_BASE}/api/projects/${projectId}/preview/start`, { method: 'POST' });
      if (!r.ok) {
        const errorText = await r.text();
        console.error('Failed to start preview:', errorText);
        setPreviewInitializationMessage('Failed to start preview');
        
        // Show user-friendly error message
        if (errorText.includes('Preview not available')) {
          setPreviewError(errorText);
          setTimeout(() => setPreviewError(null), 5000);
          // Update preview support status
          setSupportsPreview(false);
          const reasonMatch = errorText.match(/Preview not available: (.+?)\./);
          if (reasonMatch) {
            setPreviewCheckReason(reasonMatch[1]);
          }
        } else {
          setPreviewInitializationMessage('Failed to start preview');
          setPreviewError('Failed to start preview server. Please try again.');
          setTimeout(() => setPreviewError(null), 5000);
        }
        
        setTimeout(() => setIsStartingPreview(false), 2000);
        return;
      }
      const data = await r.json();
      
      setPreviewInitializationMessage('Preview ready!');
      setTimeout(() => {
        setPreviewUrl(data.url);
        setIsStartingPreview(false);
        setCurrentRoute('/'); // Reset to root route when starting
      }, 1000);
    } catch (error) {
      console.error('Error starting preview:', error);
      setPreviewInitializationMessage('An error occurred');
      setPreviewError('An error occurred while starting the preview server.');
      setTimeout(() => setPreviewError(null), 5000);
      setTimeout(() => setIsStartingPreview(false), 2000);
    }
  }

  // Navigate to specific route in iframe
  const navigateToRoute = (route: string) => {
    if (previewUrl && iframeRef.current) {
      const baseUrl = previewUrl.split('?')[0]; // Remove any query params
      // Ensure route starts with /
      const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
      const newUrl = `${baseUrl}${normalizedRoute}`;
      iframeRef.current.src = newUrl;
      setCurrentRoute(normalizedRoute);
    }
  };


  async function stop() {
    try {
      await fetch(`${API_BASE}/api/projects/${projectId}/preview/stop`, { method: 'POST' });
      setPreviewUrl(null);
    } catch (error) {
      console.error('Error stopping preview:', error);
    }
  }

  async function loadTree(dir = '.') {
    try {
      const r = await fetch(`${API_BASE}/api/repo/${projectId}/tree?dir=${encodeURIComponent(dir)}`);
      const data = await r.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setTree(data);
        
        // Load contents for all directories in the root
        const newFolderContents = new Map();
        
        // Process each directory
        for (const entry of data) {
          if (entry.type === 'dir') {
            try {
              const subContents = await loadSubdirectory(entry.path);
              newFolderContents.set(entry.path, subContents);
            } catch (err) {
              console.error(`Failed to load contents for ${entry.path}:`, err);
            }
          }
        }
        
        setFolderContents(newFolderContents);
      } else {
        console.error('Tree data is not an array:', data);
        setTree([]);
      }
      
      setCurrentPath(dir);
    } catch (error) {
      console.error('Failed to load tree:', error);
      setTree([]);
    }
  }

  // Load subdirectory contents
  async function loadSubdirectory(dir: string): Promise<Entry[]> {
    try {
      const r = await fetch(`${API_BASE}/api/repo/${projectId}/tree?dir=${encodeURIComponent(dir)}`);
      const data = await r.json();
      return data;
    } catch (error) {
      console.error('Failed to load subdirectory:', error);
      return [];
    }
  }

  // Load folder contents
  async function handleLoadFolder(path: string) {
    const contents = await loadSubdirectory(path);
    setFolderContents(prev => {
      const newMap = new Map(prev);
      newMap.set(path, contents);
      
      // Also load nested directories
      for (const entry of contents) {
        if (entry.type === 'dir') {
          const fullPath = `${path}/${entry.path}`;
          // Don't load if already loaded
          if (!newMap.has(fullPath)) {
            loadSubdirectory(fullPath).then(subContents => {
              setFolderContents(prev2 => new Map(prev2).set(fullPath, subContents));
            });
          }
        }
      }
      
      return newMap;
    });
  }

  // Toggle folder expansion
  function toggleFolder(path: string) {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }

  // Build tree structure from flat list
  function buildTreeStructure(entries: Entry[]): Map<string, Entry[]> {
    const structure = new Map<string, Entry[]>();
    
    // Initialize with root
    structure.set('', []);
    
    entries.forEach(entry => {
      const parts = entry.path.split('/');
      const parentPath = parts.slice(0, -1).join('/');
      
      if (!structure.has(parentPath)) {
        structure.set(parentPath, []);
      }
      structure.get(parentPath)?.push(entry);
      
      // If it's a directory, ensure it exists in the structure
      if (entry.type === 'dir') {
        if (!structure.has(entry.path)) {
          structure.set(entry.path, []);
        }
      }
    });
    
    return structure;
  }

  async function openFile(path: string) {
    try {
      const r = await fetch(`${API_BASE}/api/repo/${projectId}/file?path=${encodeURIComponent(path)}`);
      
      if (!r.ok) {
        console.error('Failed to load file:', r.status, r.statusText);
        setContent('// Failed to load file content');
        setSelectedFile(path);
        // Reset diff view on error
        setIsDiffView(false);
        setDiffContent(null);
        setDiffFilePath(null);
        return;
      }
      
      const data = await r.json();
      setContent(data.content || '');
      setSelectedFile(path);
      // Reset diff view when opening regular files
      setIsDiffView(false);
      setDiffContent(null);
      setDiffFilePath(null);
    } catch (error) {
      console.error('Error opening file:', error);
      setContent('// Error loading file');
      setSelectedFile(path);
      // Reset diff view on error
      setIsDiffView(false);
      setDiffContent(null);
      setDiffFilePath(null);
    }
  }

  // Handle viewing diffs from Git source control
  const handleViewDiff = useCallback(async (filePath: string, staged: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/git/diff/${encodeURIComponent(filePath)}?staged=${staged}`);
      
      if (!response.ok) {
        console.error('Failed to load diff:', response.status, response.statusText);
        setContent('// Failed to load diff content');
        setIsDiffView(true);
        setDiffContent(null);
        setDiffFilePath(filePath);
        setSelectedFile(filePath);
        return;
      }
      
      const data = await response.json();
      setDiffContent(data.diff || 'No changes to display');
      setIsDiffView(true);
      setDiffFilePath(filePath);
      setSelectedFile(filePath);
      
      // Also set content for the editor to display
      if (data.diff) {
        setContent(data.diff);
      } else {
        setContent('No changes to display');
      }
    } catch (error) {
      console.error('Error loading diff:', error);
      setContent('// Error loading diff');
      setIsDiffView(true);
      setDiffContent(null);
      setDiffFilePath(filePath);
      setSelectedFile(filePath);
    }
  }, [projectId]);

  // Reload currently selected file
  async function reloadCurrentFile() {
    if (selectedFile && !showPreview) {
      try {
        const r = await fetch(`${API_BASE}/api/repo/${projectId}/file?path=${encodeURIComponent(selectedFile)}`);
        if (r.ok) {
          const data = await r.json();
          const newContent = data.content || '';
          // Only update if content actually changed
          if (newContent !== content) {
            setIsFileUpdating(true);
            setContent(newContent);
            setTimeout(() => setIsFileUpdating(false), 500);
          }
        }
      } catch (error) {
        // Silently fail - this is a background refresh
      }
    }
  }

  // Lazy load highlight.js only when needed
  const [hljs, setHljs] = useState<any>(null);
  
  useEffect(() => {
    if (selectedFile && !hljs) {
      import('highlight.js/lib/common').then(mod => {
        setHljs(mod.default);
        // Load highlight.js CSS dynamically
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
        document.head.appendChild(link);
      });
    }
  }, [selectedFile, hljs]);

  // Get file extension for syntax highlighting
  function getFileLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts':
        return 'typescript';
      case 'jsx':
      case 'js':
      case 'mjs':
        return 'javascript';
      case 'css':
        return 'css';
      case 'scss':
      case 'sass':
        return 'scss';
      case 'html':
      case 'htm':
        return 'html';
      case 'json':
        return 'json';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'py':
        return 'python';
      case 'sh':
      case 'bash':
        return 'bash';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'xml':
        return 'xml';
      case 'sql':
        return 'sql';
      case 'php':
        return 'php';
      case 'java':
        return 'java';
      case 'c':
        return 'c';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'rs':
        return 'rust';
      case 'go':
        return 'go';
      case 'rb':
        return 'ruby';
      case 'vue':
        return 'vue';
      case 'svelte':
        return 'svelte';
      case 'dockerfile':
        return 'dockerfile';
      case 'toml':
        return 'toml';
      case 'ini':
        return 'ini';
      case 'conf':
      case 'config':
        return 'nginx';
      default:
        return 'plaintext';
    }
  }

  // Get file icon based on type
  function getFileIcon(entry: Entry): React.ReactElement {
    if (entry.type === 'dir') {
      return <span className="text-blue-500"><FaFolder size={16} /></span>;
    }
    
    const ext = entry.path.split('.').pop()?.toLowerCase();
    const filename = entry.path.split('/').pop()?.toLowerCase();
    
    // Special files
    if (filename === 'package.json') return <span className="text-green-600"><VscJson size={16} /></span>;
    if (filename === 'dockerfile') return <span className="text-blue-400"><FaDocker size={16} /></span>;
    if (filename?.startsWith('.env')) return <span className="text-yellow-500"><FaLock size={16} /></span>;
    if (filename === 'readme.md') return <span className="text-gray-600"><FaMarkdown size={16} /></span>;
    if (filename?.includes('config')) return <span className="text-gray-500"><FaCog size={16} /></span>;
    
    switch (ext) {
      case 'tsx':
        return <span className="text-cyan-400"><FaReact size={16} /></span>;
      case 'ts':
        return <span className="text-blue-600"><SiTypescript size={16} /></span>;
      case 'jsx':
        return <span className="text-cyan-400"><FaReact size={16} /></span>;
      case 'js':
      case 'mjs':
        return <span className="text-yellow-400"><FaJs size={16} /></span>;
      case 'css':
        return <span className="text-blue-500"><FaCss3Alt size={16} /></span>;
      case 'scss':
      case 'sass':
        return <span className="text-pink-500"><FaCss3Alt size={16} /></span>;
      case 'html':
      case 'htm':
        return <span className="text-orange-500"><FaHtml5 size={16} /></span>;
      case 'json':
        return <span className="text-yellow-600"><VscJson size={16} /></span>;
      case 'md':
      case 'markdown':
        return <span className="text-gray-600"><FaMarkdown size={16} /></span>;
      case 'py':
        return <span className="text-blue-400"><FaPython size={16} /></span>;
      case 'sh':
      case 'bash':
        return <span className="text-green-500"><FaFileCode size={16} /></span>;
      case 'yaml':
      case 'yml':
        return <span className="text-red-500"><SiYaml size={16} /></span>;
      case 'xml':
        return <span className="text-orange-600"><FaFileCode size={16} /></span>;
      case 'sql':
        return <span className="text-blue-600"><FaDatabase size={16} /></span>;
      case 'php':
        return <span className="text-indigo-500"><FaPhp size={16} /></span>;
      case 'java':
        return <span className="text-red-600"><FaJava size={16} /></span>;
      case 'c':
        return <span className="text-blue-700"><FaFileCode size={16} /></span>;
      case 'cpp':
      case 'cc':
      case 'cxx':
        return <span className="text-blue-600"><SiCplusplus size={16} /></span>;
      case 'rs':
        return <span className="text-orange-700"><FaRust size={16} /></span>;
      case 'go':
        return <span className="text-cyan-500"><SiGo size={16} /></span>;
      case 'rb':
        return <span className="text-red-500"><SiRuby size={16} /></span>;
      case 'vue':
        return <span className="text-green-500"><FaVuejs size={16} /></span>;
      case 'svelte':
        return <span className="text-orange-600"><SiSvelte size={16} /></span>;
      case 'dockerfile':
        return <span className="text-blue-400"><FaDocker size={16} /></span>;
      case 'toml':
      case 'ini':
      case 'conf':
      case 'config':
        return <span className="text-gray-500"><FaCog size={16} /></span>;
      default:
        return <span className="text-gray-400"><FaFile size={16} /></span>;
    }
  }

  async function loadSettings(projectSettings?: { cli?: string; model?: string }) {
    try {
      console.log('🔧 loadSettings called with project settings:', projectSettings);
      
      // Use project settings if available, otherwise check state
      const hasCliSet = projectSettings?.cli || preferredCli;
      const hasModelSet = projectSettings?.model || selectedModel;
      
      // Only load global settings if project doesn't have CLI/model settings
      if (!hasCliSet || !hasModelSet) {
        console.log('⚠️ Missing CLI or model, loading global settings');
        const globalResponse = await fetch(`${API_BASE}/api/settings/global`);
        if (globalResponse.ok) {
          const globalSettings = await globalResponse.json();
          const defaultCli = globalSettings.default_cli || 'claude';
          
          // Only set if not already set by project
          if (!hasCliSet) {
            console.log('🔄 Setting CLI from global:', defaultCli);
            setPreferredCli(defaultCli);
          }
          
          // Set the model for the CLI if not already set
          if (!hasModelSet) {
            const cliSettings = globalSettings.cli_settings?.[hasCliSet || defaultCli];
            if (cliSettings?.model) {
              setSelectedModel(cliSettings.model);
            } else {
              // Set default model based on CLI
              const currentCli = hasCliSet || defaultCli;
              if (currentCli === 'claude') {
                setSelectedModel('claude-sonnet-4');
              } else if (currentCli === 'cursor') {
                setSelectedModel('gpt-5');
              } else if (currentCli === 'codex') {
                setSelectedModel('gpt-5');
              } else if (currentCli === 'qwen') {
                setSelectedModel('qwen3-coder-plus');
              } else if (currentCli === 'gemini') {
                setSelectedModel('gemini-2.5-pro');
              }
            }
          }
        } else {
          // Fallback to project settings
          const response = await fetch(`${API_BASE}/api/settings`);
          if (response.ok) {
            const settings = await response.json();
            if (!hasCliSet) setPreferredCli(settings.preferred_cli || 'claude');
            if (!hasModelSet) setSelectedModel(settings.preferred_cli === 'claude' ? 'claude-sonnet-4' : 'gpt-5');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Only set fallback if not already set
      const hasCliSet = projectSettings?.cli || preferredCli;
      const hasModelSet = projectSettings?.model || selectedModel;
      if (!hasCliSet) setPreferredCli('claude');
      if (!hasModelSet) setSelectedModel('claude-sonnet-4');
    }
  }

  async function loadProjectInfo() {
    try {
      const r = await fetch(`${API_BASE}/api/projects/${projectId}`);
      if (r.ok) {
        const project = await r.json();
        console.log('📋 Loading project info:', {
          preferred_cli: project.preferred_cli,
          selected_model: project.selected_model
        });
        setProjectName(project.name || `Project ${projectId.slice(0, 8)}`);
        
        // Check if this is a workspace (has local_git_project_name)
        if (project.local_git_project_name) {
          setIsWorkspace(true);
          setCurrentBranch(project.current_branch || 'main');
          await loadWorkspaceBranches();
        }
        
        // Set CLI and model from project settings if available
        if (project.preferred_cli) {
          console.log('✅ Setting CLI from project:', project.preferred_cli);
          setPreferredCli(project.preferred_cli);
        }
        if (project.selected_model) {
          console.log('✅ Setting model from project:', project.selected_model);
          setSelectedModel(project.selected_model);
        }
        // Determine if we should follow global defaults (no project-specific prefs)
        const followGlobal = !project.preferred_cli && !project.selected_model;
        setUsingGlobalDefaults(followGlobal);
        setProjectDescription(project.description || '');
        
        // Return project settings for use in loadSettings
        return {
          cli: project.preferred_cli,
          model: project.selected_model
        };
        
        // Check if project has initial prompt
        if (project.initial_prompt) {
          setHasInitialPrompt(true);
          localStorage.setItem(`project_${projectId}_hasInitialPrompt`, 'true');
          // Don't start preview automatically if there's an initial prompt
        } else {
          setHasInitialPrompt(false);
          localStorage.setItem(`project_${projectId}_hasInitialPrompt`, 'false');
        }

        // Check initial project status and handle initial prompt
        const initialPromptFromUrl = searchParams?.get('initial_prompt');
        
        if (project.status === 'initializing') {
          setProjectStatus('initializing');
          setIsInitializing(true);
          // initializing 상태면 WebSocket에서 active로 변경될 때까지 대기
        } else {
          setProjectStatus('active');
          setIsInitializing(false);
          
          // 프로젝트가 이미 active 상태면 즉시 의존성 설치 시작
          startDependencyInstallation();
          
          // Initial prompt: trigger once with shared guard (handles active-on-load case)
          triggerInitialPromptIfNeeded();
        }
        
        // Always load the file tree after getting project info
        await loadTree('.')
      } else {
        // If API fails, use a fallback name
        setProjectName(`Project ${projectId.slice(0, 8)}`);
        setProjectDescription('');
        setHasInitialPrompt(false);
        localStorage.setItem(`project_${projectId}_hasInitialPrompt`, 'false');
        setProjectStatus('active');
        setIsInitializing(false);
        setUsingGlobalDefaults(true);
        return {}; // Return empty object if no project found
      }
    } catch (error) {
      console.error('Failed to load project info:', error);
      // If network error, use a fallback name
      setProjectName(`Project ${projectId.slice(0, 8)}`);
      setProjectDescription('');
      setHasInitialPrompt(false);
      localStorage.setItem(`project_${projectId}_hasInitialPrompt`, 'false');
      setProjectStatus('active');
      setIsInitializing(false);
      setUsingGlobalDefaults(true);
      return {}; // Return empty object on error
    }
  }

  // Workspace branch management functions
  async function loadWorkspaceBranches() {
    if (!isWorkspace) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/workspace/${projectId}/branches`);
      if (response.ok) {
        const branches = await response.json();
        setAvailableBranches(branches);
      }
    } catch (error) {
      console.error('Failed to load workspace branches:', error);
    }
  }

  async function switchBranch(branchName: string) {
    if (!isWorkspace || switchingBranch) return;
    
    setSwitchingBranch(true);
    try {
      const response = await fetch(`${API_BASE}/api/workspace/${projectId}/switch-branch?branch_name=${encodeURIComponent(branchName)}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        setCurrentBranch(branchName);
        setShowBranchDropdown(false);
        
        // Reload file tree to reflect branch changes
        await loadTree('.');
        
        // Show success toast
        console.log('✅ Branch switched successfully:', result.message);
      } else {
        const error = await response.json().catch(() => ({ detail: 'Failed to switch branch' }));
        console.error('❌ Branch switch failed:', error.detail);
        alert(`Failed to switch branch: ${error.detail}`);
      }
    } catch (error) {
      console.error('❌ Branch switch error:', error);
      alert('Failed to switch branch. Please try again.');
    } finally {
      setSwitchingBranch(false);
    }
  }

  // Handle image upload with base64 conversion
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          
          // Convert to base64
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            setUploadedImages(prev => [...prev, {
              name: file.name,
              url,
              base64
            }]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  // Remove uploaded image
  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].url);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  async function runAct(messageOverride?: string, externalImages?: any[]) {
    let finalMessage = messageOverride || prompt;
    const imagesToUse = externalImages || uploadedImages;
    if (!finalMessage.trim() && imagesToUse.length === 0) {
      alert('작업 내용을 입력하거나 이미지를 업로드해주세요.');
      return;
    }
    
    // Chat Mode일 때 추가 지시사항 추가
    if (mode === 'chat') {
      finalMessage = finalMessage + "\n\nDo not modify code, only answer to the user's request.";
    }
    
    // If this is not an initial prompt and user is running a new task, 
    // ensure the preview button is not blocked
    if (!hasInitialPrompt || agentWorkComplete) {
      // This is a subsequent task, not the initial one
      // Don't block the preview button for subsequent tasks
    }
    
    setIsRunning(true);
    
    // ★ NEW: request_id 생성
    const requestId = crypto.randomUUID();
    
    try {
      // Handle images - convert UploadedImage format to API format
      const processedImages = imagesToUse.map(img => {
        // Check if this is from ChatInput (has 'path' property) or old format (has 'base64')
        if (img.path) {
          // New format from ChatInput - send path directly
          return {
            path: img.path,
            name: img.filename || img.name || 'image'
          };
        } else if (img.base64) {
          // Old format - convert to base64_data
          return {
            name: img.name,
            base64_data: img.base64.split(',')[1], // Remove data:image/...;base64, prefix
            mime_type: img.base64.split(';')[0].split(':')[1] // Extract mime type
          };
        }
        return img; // Return as-is if already in correct format
      });

      const requestBody = { 
        instruction: finalMessage, 
        images: processedImages,
        is_initial_prompt: false, // Mark as continuation message
        cli_preference: preferredCli, // Add CLI preference
        selected_model: selectedModel, // Add selected model
        request_id: requestId // ★ NEW: request_id 추가
      };
      
      
      // Use different endpoint based on mode
      const endpoint = mode === 'act' ? 'act' : 'chat';
      const r = await fetch(`${API_BASE}/api/chat/${projectId}/${endpoint}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(requestBody) 
      });
      
      
      if (!r.ok) {
        const errorText = await r.text();
        console.error('❌ API Error:', errorText);
        alert(`오류: ${errorText}`);
        return;
      }
      
      const result = await r.json();
      
      // ★ NEW: UserRequest 생성
      createRequest(requestId, result.session_id, finalMessage, mode);
      
      // 완료 후 데이터 새로고침
      await loadTree('.');
      
      // Force explorer refresh after task completion
      setTimeout(() => {
        loadTree('.');
      }, 1000); // Additional refresh after 1 second to catch any delayed file changes
      
      // 프롬프트 및 업로드된 이미지들 초기화
      setPrompt('');
      // Clean up old format images if any
      if (uploadedImages && uploadedImages.length > 0) {
        uploadedImages.forEach(img => {
          if (img.url) URL.revokeObjectURL(img.url);
        });
        setUploadedImages([]);
      }
      
    } catch (error) {
      console.error('Act 실행 오류:', error);
      alert(`실행 중 오류가 발생했습니다: ${error}`);
    } finally {
      setIsRunning(false);
    }
  }


  // Handle project status updates via callback from ChatLog
  const handleProjectStatusUpdate = (status: string, message?: string) => {
    const previousStatus = projectStatus;
    
    // 상태가 같다면 무시 (중복 방지)
    if (previousStatus === status) {
      return;
    }
    
    setProjectStatus(status as ProjectStatus);
    if (message) {
      setInitializationMessage(message);
    }
    
    // If project becomes active, stop showing loading UI
    if (status === 'active') {
      setIsInitializing(false);
      
      // initializing → active 전환인 경우에만 처리
      if (previousStatus === 'initializing') {
        
        // 의존성 설치 시작
        startDependencyInstallation();
      }
      
      // Initial prompt: trigger once with shared guard (handles active-via-WS case)
      triggerInitialPromptIfNeeded();
    } else if (status === 'failed') {
      setIsInitializing(false);
    }
  };

  // Function to start dependency installation in background
  const startDependencyInstallation = async () => {
    try {
      
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/install-dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Failed to start dependency installation:', errorText);
      }
    } catch (error) {
      console.error('❌ Error starting dependency installation:', error);
    }
  };

  // Function to send initial prompt automatically
  const sendInitialPrompt = async (initialPrompt: string) => {
    // 이미 전송했으면 다시 전송하지 않음
    if (initialPromptSent) {
      return;
    }
    
    // Reset task complete state for new initial prompt
    setAgentWorkComplete(false);
    localStorage.setItem(`project_${projectId}_taskComplete`, 'false');
    
    // ★ NEW: request_id 생성
    const requestId = crypto.randomUUID();
    
    // No need to add project structure info here - backend will add it for the AI agent
    
    try {
      setIsRunning(true);
      setInitialPromptSent(true); // 전송 시작 시점에 바로 설정
      
      const requestBody = { 
        instruction: initialPrompt,
        images: [], // No images for initial prompt
        is_initial_prompt: true, // Mark as initial prompt
        request_id: requestId // ★ NEW: request_id 추가
      };
      
      const r = await fetch(`${API_BASE}/api/chat/${projectId}/act`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(requestBody) 
      });
      
      if (!r.ok) {
        const errorText = await r.text();
        console.error('❌ API Error:', errorText);
        setInitialPromptSent(false); // 실패하면 다시 시도할 수 있도록
        return;
      }
      
      const result = await r.json();
      
      // ★ NEW: UserRequest 생성 (display original prompt, not enhanced)
      createRequest(requestId, result.session_id, initialPrompt, 'act');
      
      // Refresh file tree after initial prompt
      await loadTree('.');
      
      // Clear the prompt input after sending
      setPrompt('');
      
      // Clean up URL by removing the initial_prompt parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('initial_prompt');
      window.history.replaceState({}, '', newUrl.toString());
      
    } catch (error) {
      console.error('Error sending initial prompt:', error);
      setInitialPromptSent(false); // 실패하면 다시 시도할 수 있도록
    } finally {
      setIsRunning(false);
    }
  };

  const handleRetryInitialization = async () => {
    setProjectStatus('initializing');
    setIsInitializing(true);
    setInitializationMessage('Retrying project initialization...');
    
    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}/retry-initialization`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to retry initialization');
      }
    } catch (error) {
      console.error('Failed to retry initialization:', error);
      setProjectStatus('failed');
      setInitializationMessage('Failed to retry initialization. Please try again.');
    }
  };

  // Load states from localStorage when projectId changes
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const storedHasInitialPrompt = localStorage.getItem(`project_${projectId}_hasInitialPrompt`);
      const storedTaskComplete = localStorage.getItem(`project_${projectId}_taskComplete`);
      
      if (storedHasInitialPrompt !== null) {
        setHasInitialPrompt(storedHasInitialPrompt === 'true');
      }
      if (storedTaskComplete !== null) {
        setAgentWorkComplete(storedTaskComplete === 'true');
      }
    }
  }, [projectId]);

  // ★ NEW: 활성 요청 상태에 따른 preview 서버 자동 제어
  const previousActiveState = useRef(false);
  
  useEffect(() => {
    // Task 시작 시 - preview 서버 중지
    if (hasActiveRequests && previewUrl) {
      console.log('🔄 Auto-stopping preview server due to active request');
      stop();
    }
    
    // Task 완료 시 - preview 서버 자동 시작
    if (previousActiveState.current && !hasActiveRequests && !previewUrl) {
      console.log('✅ Task completed, auto-starting preview server');
      start();
    }
    
    previousActiveState.current = hasActiveRequests;
  }, [hasActiveRequests, previewUrl]);

  // Poll for file changes in code view AND explorer refresh
  useEffect(() => {
    if (!showPreview && selectedFile) {
      const interval = setInterval(() => {
        reloadCurrentFile();
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [showPreview, selectedFile, projectId]);

  // Auto-refresh file explorer every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadTree('.');
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [projectId]);


  useEffect(() => { 
    let mounted = true;
    let timer: NodeJS.Timeout | null = null;
    
    const initializeChat = async () => {
      if (!mounted) return;
      
      // Load project info first to get project-specific settings
      const projectSettings = await loadProjectInfo();
      
      // Check if project supports preview
      await checkPreviewSupport();
      
      // Then load global settings as fallback, passing project settings
      await loadSettings(projectSettings);
      
      // Always load the file tree regardless of project status
      await loadTree('.');
      
      // Only set initializing to false if project is active
      if (projectStatus === 'active') {
        setIsInitializing(false);
      }
    };
    
    initializeChat();
    loadDeployStatus().then(() => {
      // 배포 상태 로드 후 진행 중인 배포 확인
      checkCurrentDeployment();
    });
    
    // Listen for service updates from Settings
    const handleServicesUpdate = () => {
      loadDeployStatus();
    };
    
    // Cleanup function to stop preview server when page is unloaded
    const handleBeforeUnload = () => {
      // Send a request to stop the preview server
      navigator.sendBeacon(`${API_BASE}/api/projects/${projectId}/preview/stop`);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('services-updated', handleServicesUpdate);
    
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      
      // Clean up event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('services-updated', handleServicesUpdate);
      
      // Stop preview server when component unmounts
      if (previewUrl) {
        fetch(`${API_BASE}/api/projects/${projectId}/preview/stop`, { method: 'POST' })
          .catch(() => {});
      }
    };
  }, [projectId, previewUrl, loadDeployStatus, checkCurrentDeployment]);

  // React to global settings changes when using global defaults
  const { settings: globalSettings } = useGlobalSettings();
  useEffect(() => {
    if (!usingGlobalDefaults) return;
    if (!globalSettings) return;

    const cli = globalSettings.default_cli || 'claude';
    setPreferredCli(cli);

    const modelFromGlobal = globalSettings.cli_settings?.[cli]?.model;
    if (modelFromGlobal) {
      setSelectedModel(modelFromGlobal);
    } else {
      // Fallback per CLI
      if (cli === 'claude') setSelectedModel('claude-sonnet-4');
      else if (cli === 'cursor') setSelectedModel('gpt-5');
      else if (cli === 'codex') setSelectedModel('gpt-5');
      else setSelectedModel('');
    }
  }, [globalSettings, usingGlobalDefaults]);

  // Handle click outside for branch dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBranchDropdown) {
        const target = event.target as Element;
        if (!target.closest('[data-branch-dropdown]')) {
          setShowBranchDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBranchDropdown]);


  // Show loading UI if project is initializing

  return (
    <>
      <div className="h-screen bg-white dark:bg-black flex relative overflow-hidden">
        <div className="h-full w-full flex">
          {/* 왼쪽: File Explorer/Git Sidebar (VS Code style) */}
          <div className="w-64 flex-shrink-0 bg-gray-50 dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-[#1a1a1a] flex flex-col">
            {/* Tab Bar */}
            <div className="flex border-b border-gray-200 dark:border-[#1a1a1a] bg-gray-100 dark:bg-[#0f0f0f]">
              <button
                onClick={() => setSidebarTab('explorer')}
                className={`flex-1 px-3 py-2 text-[11px] font-medium transition-colors ${
                  sidebarTab === 'explorer'
                    ? 'bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white border-b-2 border-b-blue-500 dark:border-b-[#007acc]'
                    : 'text-gray-600 dark:text-[#6a6a6a] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a]'
                }`}
                title="Explorer"
              >
                <div className="flex items-center justify-center gap-1">
                  <FaFolder className="w-3 h-3" />
                  <span className="hidden sm:inline">Explorer</span>
                </div>
              </button>
              <button
                onClick={() => setSidebarTab('source-control')}
                className={`flex-1 px-3 py-2 text-[11px] font-medium transition-colors ${
                  sidebarTab === 'source-control'
                    ? 'bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white border-b-2 border-b-blue-500 dark:border-b-[#007acc]'
                    : 'text-gray-600 dark:text-[#6a6a6a] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a]'
                }`}
                title="Source Control"
              >
                <div className="flex items-center justify-center gap-1">
                  <FaGitAlt className="w-3 h-3" />
                  <span className="hidden sm:inline">Git</span>
                </div>
              </button>
              {/* Refresh Button */}
              {sidebarTab === 'explorer' && (
                <button
                  onClick={() => loadTree('.')}
                  className="px-2 py-2 text-[11px] font-medium text-gray-600 dark:text-[#6a6a6a] hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors"
                  title="Refresh Explorer"
                >
                  <FaSync className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'explorer' ? (
                /* File Explorer */
                <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#0a0a0a] custom-scrollbar">
                  {!tree || tree.length === 0 ? (
                    <div className="px-3 py-8 text-center text-[11px] text-gray-600 dark:text-[#6a6a6a] select-none">
                      No files found
                    </div>
                  ) : (
                    <TreeView 
                      entries={tree || []}
                      selectedFile={selectedFile}
                      expandedFolders={expandedFolders}
                      folderContents={folderContents}
                      onToggleFolder={toggleFolder}
                      onSelectFile={openFile}
                      onLoadFolder={handleLoadFolder}
                      level={0}
                      parentPath=""
                      getFileIcon={getFileIcon}
                    />
                  )}
                </div>
              ) : (
                /* Git Source Control */
                <GitSourceControl 
                  projectId={projectId}
                  isVisible={sidebarTab === 'source-control'}
                  onViewDiff={handleViewDiff}
                />
              )}
            </div>
          </div>

          {/* 중간: Code/Preview 영역 */}
          <div className="flex-1 h-full flex flex-col bg-black">
            {/* 컨텐츠 영역 */}
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Controls Bar */}
              <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 h-[73px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* 토글 스위치 */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                    {/* Only show preview button if project supports it */}
                    {supportsPreview !== false && (
                      <button
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          showPreview 
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        onClick={() => setShowPreview(true)}
                        title={supportsPreview === null ? 'Checking preview support...' : 'Show preview'}
                        disabled={supportsPreview === null}
                      >
                        <span className="w-4 h-4 flex items-center justify-center"><FaDesktop size={16} /></span>
                      </button>
                    )}
                    <button
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        !showPreview || supportsPreview === false
                          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                      onClick={() => setShowPreview(false)}
                      title="Show code"
                    >
                      <span className="w-4 h-4 flex items-center justify-center"><FaCode size={16} /></span>
                    </button>
                  </div>
                  
                  {/* Center Controls */}
                  {showPreview && previewUrl && (
                    <div className="flex items-center gap-3">
                      {/* Route Navigation */}
                      <div className="h-9 flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg px-3 border border-gray-200 dark:border-gray-700">
                        <span className="text-gray-400 dark:text-gray-500 mr-2">
                          <FaHome size={12} />
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">/</span>
                        <input
                          type="text"
                          value={currentRoute.startsWith('/') ? currentRoute.slice(1) : currentRoute}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCurrentRoute(value ? `/${value}` : '/');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              navigateToRoute(currentRoute);
                            }
                          }}
                          className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none w-40"
                          placeholder="route"
                        />
                        <button
                          onClick={() => navigateToRoute(currentRoute)}
                          className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <FaArrowRight size={12} />
                        </button>
                      </div>
                      
                      {/* Action Buttons Group */}
                      <div className="flex items-center gap-1.5">
                        <button 
                          className="h-9 w-9 flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => {
                            const iframe = document.querySelector('iframe');
                            if (iframe) {
                              iframe.src = iframe.src;
                            }
                          }}
                          title="Refresh preview"
                        >
                          <FaRedo size={14} />
                        </button>
                        
                        {/* Device Mode Toggle */}
                        <div className="h-9 flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg px-1 border border-gray-200 dark:border-gray-700">
                          <button
                            aria-label="Desktop preview"
                            className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                              deviceMode === 'desktop' 
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                            onClick={() => setDeviceMode('desktop')}
                          >
                            <FaDesktop size={14} />
                          </button>
                          <button
                            aria-label="Mobile preview"
                            className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                              deviceMode === 'mobile' 
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                            onClick={() => setDeviceMode('mobile')}
                          >
                            <FaMobileAlt size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Settings Button */}
                  <button 
                    onClick={() => setShowGlobalSettings(true)}
                    className="h-9 w-9 flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Settings"
                  >
                    <FaCog size={16} />
                  </button>
                  
                  {/* Publish Button */}
                  {(githubConnected || vercelConnected) && (
                    <div className="relative">
                      <button
                        className="h-9 flex items-center gap-2 px-3 bg-black text-white rounded-lg text-sm font-medium transition-colors hover:bg-gray-900 border border-black/10 dark:border-white/10 shadow-sm"
                        onClick={() => setShowPublishPanel(true)}
                      >
                        <FaRocket size={14} />
                        Publish
                        {deploymentStatus === 'deploying' && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                        )}
                        {deploymentStatus === 'ready' && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Content Area */}
              <div className="flex-1 relative bg-black overflow-hidden">
                {/* Preview Error Notification */}
                {previewError && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">{previewError}</p>
                        </div>
                        <button
                          onClick={() => setPreviewError(null)}
                          className="flex-shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {showPreview ? (
                  <MotionDiv
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ height: '100%' }}
                  >
                {previewUrl ? (
                  <div className="relative w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <div 
                      className={`bg-white dark:bg-gray-900 ${
                        deviceMode === 'mobile' 
                          ? 'w-[375px] h-[667px] rounded-[25px] border-8 border-gray-800 shadow-2xl' 
                          : 'w-full h-full'
                      } overflow-hidden`}
                    >
                      <iframe 
                        ref={iframeRef}
                        className="w-full h-full border-none bg-white dark:bg-gray-800"
                        src={previewUrl}
                        onError={() => {
                          // Show error overlay
                          const overlay = document.getElementById('iframe-error-overlay');
                          if (overlay) overlay.style.display = 'flex';
                        }}
                        onLoad={() => {
                          // Hide error overlay when loaded successfully
                          const overlay = document.getElementById('iframe-error-overlay');
                          if (overlay) overlay.style.display = 'none';
                        }}
                      />
                      
                      {/* Error overlay */}
                    <div 
                      id="iframe-error-overlay"
                      className="absolute inset-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center z-10"
                      style={{ display: 'none' }}
                    >
                      <div className="text-center max-w-md mx-auto p-6">
                        <div className="text-4xl mb-4">🔄</div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                          Connection Issue
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          The preview couldn't load properly. Try clicking the refresh button to reload the page.
                        </p>
                        <button
                          className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          onClick={() => {
                            const iframe = document.querySelector('iframe');
                            if (iframe) {
                              iframe.src = iframe.src;
                            }
                            const overlay = document.getElementById('iframe-error-overlay');
                            if (overlay) overlay.style.display = 'none';
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Refresh Now
                        </button>
                      </div>
                    </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-black relative">
                    {/* Gradient background similar to main page */}
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-white dark:bg-black" />
                      <div 
                        className="absolute inset-0 dark:block hidden transition-all duration-1000 ease-in-out"
                        style={{
                          background: `radial-gradient(circle at 50% 100%, 
                            ${assistantBrandColors[preferredCli] || assistantBrandColors.claude}66 0%, 
                            ${assistantBrandColors[preferredCli] || assistantBrandColors.claude}4D 25%, 
                            ${assistantBrandColors[preferredCli] || assistantBrandColors.claude}33 50%, 
                            transparent 70%)`
                        }}
                      />
                      {/* Light mode gradient - subtle */}
                      <div 
                        className="absolute inset-0 block dark:hidden transition-all duration-1000 ease-in-out"
                        style={{
                          background: `radial-gradient(circle at 50% 100%, 
                            ${assistantBrandColors[preferredCli] || assistantBrandColors.claude}40 0%, 
                            ${assistantBrandColors[preferredCli] || assistantBrandColors.claude}26 25%, 
                            transparent 50%)`
                        }}
                      />
                    </div>
                    
                    {/* Content with z-index to be above gradient */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                    {isStartingPreview ? (
                      <MotionDiv 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                      >
                        {/* Claudable Symbol with loading spinner */}
                        <div className="w-40 h-40 mx-auto mb-6 relative">
                          <div 
                            className="w-full h-full"
                            style={{
                              backgroundColor: assistantBrandColors[preferredCli] || assistantBrandColors.claude,
                              mask: 'url(/Symbol_white.png) no-repeat center/contain',
                              WebkitMask: 'url(/Symbol_white.png) no-repeat center/contain',
                              opacity: 0.9
                            }}
                          />
                          
                          {/* Loading spinner in center */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div 
                              className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin"
                              style={{
                                borderColor: assistantBrandColors[preferredCli] || assistantBrandColors.claude,
                                borderTopColor: 'transparent'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Content */}
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                          Starting Preview Server
                        </h3>
                        
                        <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400">
                          <span>{previewInitializationMessage}</span>
                          <MotionDiv
                            className="flex gap-1 ml-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <MotionDiv
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                              className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full"
                            />
                            <MotionDiv
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                              className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full"
                            />
                            <MotionDiv
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                              className="w-1 h-1 bg-gray-600 dark:bg-gray-400 rounded-full"
                            />
                          </MotionDiv>
                        </div>
                      </MotionDiv>
                    ) : isBuilding ? (
                      <MotionDiv 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                      >
                        {/* Claudable Symbol with rotating animation when building */}
                        <MotionDiv
                          className="w-40 h-40 mx-auto mb-6 relative"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
                          <div 
                            className="w-full h-full"
                            style={{
                              backgroundColor: assistantBrandColors[preferredCli] || assistantBrandColors.claude,
                              mask: 'url(/Symbol_white.png) no-repeat center/contain',
                              WebkitMask: 'url(/Symbol_white.png) no-repeat center/contain',
                              opacity: 0.9
                            }}
                          />
                        </MotionDiv>
                        
                        {/* Building text with shimmer effect */}
                        <>
                          <h3 
                            className="text-2xl font-bold mb-3"
                            style={{
                              background: `linear-gradient(90deg, 
                                ${assistantBrandColors[preferredCli] || assistantBrandColors.claude}40, 
                                ${assistantBrandColors[preferredCli] || assistantBrandColors.claude}FF, 
                                ${assistantBrandColors[preferredCli] || assistantBrandColors.claude}40)`,
                              backgroundSize: '200% 100%',
                              WebkitBackgroundClip: 'text',
                              backgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              animation: 'shimmerText 5s linear infinite'
                            }}
                          >
                            Building...
                          </h3>
                          <style>{`
                            @keyframes shimmerText {
                              0% {
                                background-position: 200% center;
                              }
                              100% {
                                background-position: -200% center;
                              }
                            }
                          `}</style>
                        </>
                      </MotionDiv>
                    ) : (
                      <>
                        <div
                          onClick={!isRunning && !isStartingPreview && supportsPreview !== false ? start : undefined}
                          className={`w-40 h-40 mx-auto mb-6 relative ${!isRunning && !isStartingPreview && supportsPreview !== false ? 'cursor-pointer group' : ''}`}
                        >
                          {/* Claudable Symbol with rotating animation when starting */}
                          <MotionDiv
                            className="w-full h-full"
                            animate={isStartingPreview ? { rotate: 360 } : {}}
                            transition={{ duration: 6, repeat: isStartingPreview ? Infinity : 0, ease: "linear" }}
                          >
                            <div 
                              className="w-full h-full"
                              style={{
                                backgroundColor: assistantBrandColors[preferredCli] || assistantBrandColors.claude,
                                mask: 'url(/Symbol_white.png) no-repeat center/contain',
                                WebkitMask: 'url(/Symbol_white.png) no-repeat center/contain',
                                opacity: 0.9
                              }}
                            />
                          </MotionDiv>
                          
                          {/* Icon in Center - Play or Loading */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            {isStartingPreview ? (
                              <div 
                                className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin"
                                style={{
                                  borderColor: assistantBrandColors[preferredCli] || assistantBrandColors.claude,
                                  borderTopColor: 'transparent'
                                }}
                              />
                            ) : supportsPreview === false ? (
                              // Show a "not available" icon for non-frontend projects
                              <MotionDiv
                                className="flex items-center justify-center opacity-50"
                              >
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
                                </svg>
                              </MotionDiv>
                            ) : (
                              <MotionDiv
                                className="flex items-center justify-center"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <FaPlay 
                                  size={32}
                                />
                              </MotionDiv>
                            )}
                          </div>
                        </div>
                        
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                          {supportsPreview === false ? 'Preview Not Available' : 'Preview Not Running'}
                        </h3>
                        
                        <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                          {supportsPreview === false 
                            ? `${previewCheckReason}. Use the code view to explore the project.`
                            : 'Start your development server to see live changes'
                          }
                        </p>
                      </>
                    )}
                    </div>
                  </div>
                )}
                  </MotionDiv>
                ) : (
              <MotionDiv
                key="code"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex bg-white dark:bg-gray-950"
              >
                {/* File Editor Area */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#0d0d0d] min-w-0">
                  {selectedFile ? (
                    <>
                      {/* File Tab */}
                      <div className="flex-shrink-0 bg-gray-100 dark:bg-[#1a1a1a]">
                        <div className="flex items-center">
                          <div className="flex items-center gap-2 bg-white dark:bg-[#0d0d0d] px-3 py-1.5 border-t-2 border-t-blue-500 dark:border-t-[#007acc]">
                            <span className="w-4 h-4 flex items-center justify-center">
                              {getFileIcon(tree.find(e => e.path === selectedFile) || { path: selectedFile, type: 'file' })}
                            </span>
                            <span className="text-[13px] text-gray-700 dark:text-[#cccccc]" style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
                              {selectedFile.split('/').pop()}
                              {isDiffView && (
                                <span className="text-[11px] text-blue-600 dark:text-blue-400 ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                                  DIFF
                                </span>
                              )}
                            </span>
                            {isFileUpdating && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-2"></div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Code Editor */}
                      <div className="flex-1 overflow-hidden">
                        <div className="w-full h-full flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
                          {/* Line Numbers */}
                          <div className="bg-gray-50 dark:bg-[#0d0d0d] px-3 py-4 select-none flex-shrink-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                            <div className="text-[13px] font-mono text-gray-500 dark:text-[#858585] leading-[19px]">
                              {(content || '').split('\n').map((_, index) => (
                                <div key={index} className="text-right pr-2">
                                  {index + 1}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Code Content */}
                          <div className="flex-1 overflow-auto custom-scrollbar">
                            <pre className="p-4 text-[13px] leading-[19px] font-mono text-gray-800 dark:text-[#d4d4d4] whitespace-pre" style={{ fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace" }}>
                              <code 
                                className={`language-${isDiffView ? 'diff' : getFileLanguage(selectedFile)}`}
                                dangerouslySetInnerHTML={{ 
                                  __html: highlightedContent || content || ''
                                }}
                              />
                            </pre>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#0d0d0d]">
                      <div className="text-center">
                        <div className="text-4xl mb-4 text-gray-300 dark:text-gray-600">📁</div>
                        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                          No file selected
                        </h3>
                        <p className="text-gray-500 dark:text-gray-500">
                          Select a file from the explorer to view its contents
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </MotionDiv>
                )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* 오른쪽: 채팅창 */}
          <div
            style={{ width: '30%' }}
            className="h-full border-l border-gray-200 dark:border-gray-800 flex flex-col"
          >
            {/* 채팅 헤더 */}
            <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 p-4 h-[73px] flex items-center">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.push('/')}
                  className="flex items-center justify-center w-8 h-8 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Back to home"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{projectName || 'Loading...'}</h1>
                  {projectDescription && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {projectDescription}
                    </p>
                  )}
                  {/* Git Branch Selector for Workspaces */}
                  {isWorkspace && currentBranch && (
                    <div className="mt-2 relative" data-branch-dropdown>
                      <button
                        onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                        disabled={switchingBranch}
                        className="flex items-center gap-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Switch branch"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M18 9a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 21a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M15 7v4.5a3.5 3.5 0 0 1-7 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{switchingBranch ? 'Switching...' : currentBranch}</span>
                        {!switchingBranch && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      
                      {/* Branch Dropdown */}
                      {showBranchDropdown && availableBranches.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 z-50 min-w-[150px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {availableBranches.map((branch) => (
                            <button
                              key={branch}
                              onClick={() => switchBranch(branch)}
                              disabled={switchingBranch || branch === currentBranch}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                branch === currentBranch 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {branch === currentBranch && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                                <span>{branch}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 채팅 로그 영역 */}
            <div className="flex-1 min-h-0">
              <ChatLog 
                projectId={projectId} 
                onSessionStatusChange={(isRunningValue) => {
                  console.log('🔍 [DEBUG] Session status change:', isRunningValue);
                  setIsRunning(isRunningValue);
                  // Agent 작업 완료 상태 추적 및 자동 preview 시작
                  if (!isRunningValue && hasInitialPrompt && !agentWorkComplete && !previewUrl) {
                    setAgentWorkComplete(true);
                    // Save to localStorage
                    localStorage.setItem(`project_${projectId}_taskComplete`, 'true');
                    // Initial prompt 작업 완료 후 자동으로 preview 서버 시작
                    start();
                  }
                  // Refresh file explorer when task completes
                  if (!isRunningValue) {
                    setTimeout(() => {
                      loadTree('.');
                    }, 500); // Refresh after task completion
                  }
                }}
                onProjectStatusUpdate={handleProjectStatusUpdate}
                startRequest={startRequest}
                completeRequest={completeRequest}
              />
            </div>
            
            {/* 간단한 입력 영역 */}
            <div className="p-4 rounded-bl-2xl">
              <ChatInput 
                onSendMessage={(message, images) => {
                  // Pass images to runAct
                  runAct(message, images);
                }}
                disabled={isRunning}
                placeholder={mode === 'act' ? "Ask Claudable..." : "Chat with Claudable..."}
                mode={mode}
                onModeChange={setMode}
                projectId={projectId}
                preferredCli={preferredCli}
                selectedModel={selectedModel}
                thinkingMode={thinkingMode}
                onThinkingModeChange={setThinkingMode}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Global Settings Modal */}
      {showGlobalSettings && (
        <ProjectSettings 
          isOpen={showGlobalSettings}
          onClose={() => setShowGlobalSettings(false)}
          projectId={projectId}
          projectName="Project"
        />
      )}
    </>
  );
}
