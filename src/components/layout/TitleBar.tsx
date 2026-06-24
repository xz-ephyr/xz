import { useState, useRef, useEffect } from 'react';
import { isTauri } from '../../lib/tauri';
import { useZoomContext } from './ZoomProvider';

const ZOOM_PRESETS = [0.5, 0.65, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2];

export default function TitleBar() {
  const { zoom, setZoomLevel, resetZoom } = useZoomContext();
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsZoomOpen(false);
      }
    };
    if (isZoomOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isZoomOpen]);

  if (!isTauri()) {
    return null;
  }

  return (
    <div className="flex items-center justify-end h-9 px-3 bg-white border-b border-white shrink-0 select-none">
      <ZoomTrigger
        zoom={zoom}
        isOpen={isZoomOpen}
        onToggle={() => setIsZoomOpen(!isZoomOpen)}
        dropdownRef={dropdownRef}
        setZoomLevel={setZoomLevel}
        resetZoom={resetZoom}
      />
    </div>
  );
}

function ZoomTrigger({
  zoom,
  isOpen,
  onToggle,
  dropdownRef,
  setZoomLevel,
  resetZoom,
}: {
  zoom: number;
  isOpen: boolean;
  onToggle: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  setZoomLevel: (level: number) => void;
  resetZoom: () => void;
}) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
          isOpen
            ? 'bg-neutral-100 text-neutral-900'
            : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
        }`}
        title="Zoom level"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mr-0.5">
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M6 4V8M4 6H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {Math.round(zoom * 100)}%
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-xl py-2 z-50 origin-top-right"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
            Zoom
          </div>
          <div className="px-2 py-1 flex flex-col gap-0.5">
            {ZOOM_PRESETS.map((level) => (
              <button
                key={level}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(level);
                  onToggle();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  zoom === level
                    ? 'bg-neutral-100 text-neutral-900 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                {Math.round(level * 100)}%
              </button>
            ))}
          </div>
          <div className="border-t border-neutral-100 mt-1 pt-1 px-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetZoom();
                onToggle();
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
            >
              Reset to 100%
            </button>
          </div>
          <div className="px-4 pt-1.5 pb-1 text-[10px] text-neutral-400">
            Ctrl/Cmd + scroll • Ctrl/Cmd + −/+/0
          </div>
        </div>
      )}
    </div>
  );
}
