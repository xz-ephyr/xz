import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { GoogleDocIcon } from '@hugeicons/core-free-icons';

interface ArtifactPreviewCardProps {
  title: string;
  type: string;
  onClick: () => void;
}

export const ArtifactPreviewCard: React.FC<ArtifactPreviewCardProps> = ({
  title,
  type,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="w-full my-4 border border-neutral-200 rounded-[8px] p-3 bg-white hover:bg-[#f2f3f6] active:scale-[0.99] cursor-pointer transition-transform"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center text-neutral-600">
          <HugeiconsIcon icon={GoogleDocIcon} size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-neutral-900 truncate">{title}</h3>
          <p className="text-xs text-neutral-500 capitalize">{type}</p>
        </div>
      </div>
    </div>
  );
};
