import { Folder02Icon, File02Icon } from '@hugeicons/core-free-icons';
import { FileEntry } from '../../services/FileSystemService';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';

interface FileNodeProps {
  node: FileEntry;
  depth?: number;
  activePath?: string;
  onClick: (node: FileEntry) => void;
}

export const FileNode = ({
  node,
  depth = 0,
  activePath,
  onClick,
}: FileNodeProps) => (
  <div>
    <div
      className={`flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 cursor-pointer text-sm ${activePath === node.path ? 'bg-neutral-100 text-blue-600 font-medium' : 'text-neutral-600'}`}
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
      onClick={() => onClick(node)}
    >
      <HugeiconRenderer icon={node.isDirectory ? Folder02Icon : File02Icon} size={14} />
      <span className="truncate">{node.name}</span>
    </div>
    {node.isDirectory &&
      node.children?.map((child) => (
        <FileNode
          key={child.path}
          node={child}
          depth={depth + 1}
          activePath={activePath}
          onClick={onClick}
        />
      ))}
  </div>
);
