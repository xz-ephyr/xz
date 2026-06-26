import { CodeIcon, EyeIcon } from '../artifact/icons';
import { ARTIFACT_TYPE_LABELS } from '../../types/artifact';
import type { Artifact } from '../../types/artifact';

interface ArtifactsPreviewCardProps {
  artifact: Artifact;
  onClick: () => void;
}

export function ArtifactsPreviewCard({ artifact, onClick }: ArtifactsPreviewCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full h-[75px] px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/50 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors text-left"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
        <CodeIcon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
          {artifact.title}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {ARTIFACT_TYPE_LABELS[artifact.type]} &middot; Click to view
        </p>
      </div>
      <EyeIcon size={18} />
    </button>
  );
}
