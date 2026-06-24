import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit01Icon, PencilEdit02Icon, File02Icon } from '@hugeicons/core-free-icons';

interface ToolCallPillProps {
  toolName: string;
  state: string;
  args: any;
}

const toolIcons: Record<string, React.ReactNode> = {
  write_file: <HugeiconsIcon icon={PencilEdit01Icon} size={14} className="text-neutral-500 shrink-0" />,
  create_artifact: <HugeiconsIcon icon={PencilEdit01Icon} size={14} className="text-neutral-500 shrink-0" />,
  edit_file: <HugeiconsIcon icon={PencilEdit02Icon} size={14} className="text-neutral-500 shrink-0" />,
  read_file: <HugeiconsIcon icon={File02Icon} size={14} className="text-neutral-500 shrink-0" />,
};

export const ToolCallPill = ({ toolName, state, args }: ToolCallPillProps) => {
  const getVerb = () => {
    switch (toolName) {
      case 'read_file':
        return state === 'result' ? 'read' : 'reading';
      case 'write_file':
      case 'create_artifact':
        return state === 'result' ? 'wrote' : 'writing';
      case 'edit_file':
        return state === 'result' ? 'edited' : 'editing';
      case 'grep_tool':
        return 'grep';
      case 'list_dir':
        return state === 'result' ? 'listed' : 'listing';
      default:
        return state === 'result' ? 'used' : 'using';
    }
  };

  const fileName = args?.file_path || args?.path || args?.title || args?.filename || '';

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-100 rounded-[6px] text-xs font-medium text-neutral-600 border border-neutral-200 w-fit shrink-0">
      {toolIcons[toolName] || null}
      <span className="capitalize">{getVerb()}</span>
      {fileName && <span className="text-neutral-400 font-mono truncate max-w-[200px]">{fileName}</span>}
    </div>
  );
};
