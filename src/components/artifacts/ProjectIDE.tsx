import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { sass } from '@codemirror/lang-sass';

import {
  Folder02Icon,
  File02Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  Search01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { FileEntry, FileSystemService } from '../../services/FileSystemService';
import { Project } from '../../types/chat';

interface ProjectIDEProps {
  project: Project;
  onClose: () => void;
  onSave?: (path: string, content: string) => void;
}

const HugeiconRenderer = ({ icon: Icon, size = 16, className }: { icon: any, size?: number, className?: string }) => (
  <HugeiconsIcon icon={Icon} size={size} color="currentColor" strokeWidth={1.5} className={className} />
);

const FileNode = ({ node, depth = 0, activePath, onClick }: { node: FileEntry, depth?: number, activePath?: string, onClick: (node: FileEntry) => void }) => (
  <div>
    <div
      className={`flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 cursor-pointer text-sm ${activePath === node.path ? 'bg-neutral-100 text-blue-600 font-medium' : 'text-neutral-600'}`}
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
      onClick={() => onClick(node)}
    >
      <HugeiconRenderer icon={node.isDirectory ? Folder02Icon : File02Icon} size={14} />
      <span className="truncate">{node.name}</span>
    </div>
    {node.isDirectory && node.children?.map(child => (
      <FileNode key={child.path} node={child} depth={depth + 1} activePath={activePath} onClick={onClick} />
    ))}
  </div>
);

export const ProjectIDE: React.FC<ProjectIDEProps> = ({ project, onClose, onSave }) => {
  const [tree, setTree] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState<FileEntry | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTree();
  }, [project.path]);

  const loadTree = async () => {
    const newTree = await FileSystemService.getTree(project.path);
    setTree(newTree);
  };

  const handleFileClick = async (file: FileEntry) => {
    if (file.isDirectory) return;
    const fileContent = await FileSystemService.getFileContent(file.path);
    setActiveFile(file);
    setContent(fileContent);
  };

  const handleSave = async () => {
    if (!activeFile) return;
    setIsSaving(true);
    try {
      await FileSystemService.saveFile(activeFile.path, content);
      onSave?.(activeFile.path, content);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setIsSaving(false);
    }
  };

  const getLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return [javascript({ jsx: true, typescript: true })];
      case 'py':
        return [python()];
      case 'html':
        return [html()];
      case 'css':
        return [css()];
      case 'scss':
      case 'sass':
        return [sass()];
      case 'json':
        return [json()];
      case 'rs':
        return [rust()];
      case 'cpp':
      case 'h':
      case 'hpp':
      case 'cc':
        return [cpp()];
      case 'java':
        return [java()];
      case 'php':
        return [php()];
      case 'sql':
        return [sql()];
      case 'xml':
      case 'svg':
        return [xml()];
      case 'yaml':
      case 'yml':
        return [yaml()];
      case 'md':
        return [markdown()];
      default:
        return [];
    }
  };

  return (
    <div className="w-[70%] h-full border-l border-neutral-200 bg-white flex flex-col shadow-2xl z-20">
      <div className="h-14 border-b border-neutral-200 px-4 flex items-center justify-between bg-neutral-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-md text-white">
            <HugeiconRenderer icon={Folder02Icon} size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">{project.name}</h2>
            <p className="text-[10px] text-neutral-500 truncate max-w-[300px]">{project.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFile && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-md text-xs font-medium hover:bg-black transition-colors disabled:opacity-50"
            >
              <HugeiconRenderer icon={FloppyDiskIcon} size={14} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-200 rounded-md transition-colors text-neutral-600"
          >
            <HugeiconRenderer icon={Cancel01Icon} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar / Explorer */}
        <div className="w-64 border-r border-neutral-200 overflow-y-auto bg-neutral-50 py-2">
          <div className="px-4 mb-4">
             <div className="relative">
                <input
                    type="text"
                    placeholder="Search files..."
                    className="w-full bg-white border border-neutral-200 rounded-md py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-400"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
                    <HugeiconRenderer icon={Search01Icon} size={12} />
                </div>
             </div>
          </div>
          {tree.map(node => (
            <FileNode key={node.path} node={node} activePath={activeFile?.path} onClick={handleFileClick} />
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col bg-white">
          {activeFile ? (
            <>
              <div className="h-9 border-b border-neutral-200 flex items-center px-4 bg-neutral-50 shrink-0">
                <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{activeFile.name}</span>
              </div>
              <div className="flex-1 overflow-auto text-sm">
                <CodeMirror
                  value={content}
                  height="100%"
                  theme="light"
                  extensions={getLanguage(activeFile.name)}
                  onChange={(value) => setContent(value)}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8">
               <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                 <HugeiconRenderer icon={File02Icon} size={32} />
               </div>
               <p className="text-sm">Select a file to start editing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
