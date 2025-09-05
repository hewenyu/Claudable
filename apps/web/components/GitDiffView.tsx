"use client";
import { useState, useEffect } from 'react';
import { VscDiff } from 'react-icons/vsc';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

interface GitDiffViewProps {
  projectId: string;
  filePath: string;
  isStaged?: boolean;
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export default function GitDiffView({ projectId, filePath, isStaged = false }: GitDiffViewProps) {
  const [diff, setDiff] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);

  useEffect(() => {
    const loadDiff = async () => {
      if (!filePath) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/api/git/${projectId}/diff/${encodeURIComponent(filePath)}?staged=${isStaged}`
        );
        if (response.ok) {
          const data = await response.json();
          setDiff(data.diff);
          parseDiff(data.diff);
        }
      } catch (error) {
        console.error('Failed to load diff:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDiff();
  }, [projectId, filePath, isStaged]);

  const parseDiff = (diffText: string) => {
    if (!diffText) {
      setDiffLines([]);
      return;
    }

    const lines = diffText.split('\n');
    const parsed: DiffLine[] = [];
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Hunk header: extract line numbers
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLineNumber = parseInt(match[1]) - 1;
          newLineNumber = parseInt(match[2]) - 1;
        }
        parsed.push({
          type: 'header',
          content: line
        });
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        newLineNumber++;
        parsed.push({
          type: 'add',
          newLineNumber,
          content: line
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        oldLineNumber++;
        parsed.push({
          type: 'remove',
          oldLineNumber,
          content: line
        });
      } else if (line.startsWith(' ')) {
        oldLineNumber++;
        newLineNumber++;
        parsed.push({
          type: 'context',
          oldLineNumber,
          newLineNumber,
          content: line
        });
      } else if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
        parsed.push({
          type: 'header',
          content: line
        });
      }
    }

    setDiffLines(parsed);
  };

  const getLineClass = (type: DiffLine['type']) => {
    switch (type) {
      case 'add':
        return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500';
      case 'remove':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
      case 'context':
        return 'bg-white dark:bg-[#0d0d0d]';
      case 'header':
        return 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400';
      default:
        return 'bg-white dark:bg-[#0d0d0d]';
    }
  };

  const getLineSymbol = (line: DiffLine) => {
    if (line.type === 'add') return '+';
    if (line.type === 'remove') return '-';
    if (line.type === 'context') return ' ';
    return '';
  };

  const getLineNumbers = (line: DiffLine) => {
    if (line.type === 'header') return '';
    
    const oldNum = line.oldLineNumber || '';
    const newNum = line.newLineNumber || '';
    
    return `${oldNum.toString().padStart(4, ' ')} ${newNum.toString().padStart(4, ' ')}`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <VscDiff size={20} />
          <span>Loading diff...</span>
        </div>
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <VscDiff size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No changes to display</p>
          <p className="text-xs mt-1">
            {isStaged ? 'No staged changes for this file' : 'File has no uncommitted changes'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-[#1a1a1a] bg-gray-50 dark:bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <VscDiff size={16} className="text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {filePath}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
            {isStaged ? 'Staged' : 'Working Directory'}
          </span>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto font-mono text-sm">
        {diffLines.map((line, index) => (
          <div
            key={index}
            className={`flex ${getLineClass(line.type)} min-h-[20px]`}
          >
            {/* Line numbers */}
            <div className="flex-shrink-0 px-3 py-0.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-gray-700 select-none">
              {getLineNumbers(line)}
            </div>
            
            {/* Symbol */}
            <div className="flex-shrink-0 w-4 px-1 py-0.5 text-center select-none">
              <span className={`
                ${line.type === 'add' ? 'text-green-600 dark:text-green-400' : ''}
                ${line.type === 'remove' ? 'text-red-600 dark:text-red-400' : ''}
                ${line.type === 'context' ? 'text-gray-400' : ''}
              `}>
                {getLineSymbol(line)}
              </span>
            </div>
            
            {/* Content */}
            <div className="flex-1 px-2 py-0.5 whitespace-pre overflow-hidden">
              <span className={`
                ${line.type === 'add' ? 'text-green-800 dark:text-green-200' : ''}
                ${line.type === 'remove' ? 'text-red-800 dark:text-red-200' : ''}
                ${line.type === 'context' ? 'text-gray-800 dark:text-gray-200' : ''}
                ${line.type === 'header' ? 'text-gray-600 dark:text-gray-400 font-medium' : ''}
              `}>
                {line.content.replace(/^[+\-\s]/, '')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}