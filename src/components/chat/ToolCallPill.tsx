interface ToolCallPillProps {
  toolName: string;
  state: string;
  args: any;
}

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
      <span className="capitalize">{getVerb()}</span>
      {fileName && <span className="text-neutral-400 font-mono truncate max-w-[200px]">{fileName}</span>}
    </div>
  );
};
