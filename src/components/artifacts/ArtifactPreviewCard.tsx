import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GoogleDocIcon, Download01Icon } from '@hugeicons/core-free-icons';

interface ArtifactPreviewCardProps {
  title: string;
  type: string;
  onClick: () => void;
  content?: string;
}

function handleDownload(title: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = title;
  a.click();
  URL.revokeObjectURL(url);
}

export const ArtifactPreviewCard: React.FC<ArtifactPreviewCardProps> = ({
  title,
  type,
  onClick,
  content,
}) => {
  return (
    <div className="w-full my-4 border border-neutral-200 rounded-[8px] bg-white">
      <div
        onClick={onClick}
        className="p-3 hover:bg-[#f2f3f6] active:scale-[0.99] cursor-pointer transition-transform rounded-[8px]"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center text-neutral-600">
            <HugeiconsIcon icon={GoogleDocIcon} size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-neutral-900 truncate">{title}</h3>
            <p className="text-xs text-neutral-500 capitalize">{type}</p>
          </div>
          {content && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(title, content); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-[6px] text-xs font-medium text-neutral-700 transition-colors shrink-0"
            >
              <HugeiconsIcon icon={Download01Icon} size={14} />
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
