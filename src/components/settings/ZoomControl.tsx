import { useState, useRef, useEffect } from 'react';
import { useZoomContext } from '../layout/ZoomProvider';

const ZOOM_PRESETS = [0.5, 0.65, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2];

export function ZoomControl() {
  const { zoom, setZoomLevel, resetZoom } = useZoomContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-sm border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-neutral-500">
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M6 4V8M4 6H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {Math.round(zoom * 100)}%
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-xl py-2 z-50">
          <div className="px-4 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
            Zoom
          </div>
          <div className="px-2 py-1 flex flex-col gap-0.5">
            {ZOOM_PRESETS.map((level) => (
              <button
                key={level}
                onClick={() => {
                  setZoomLevel(level);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  zoom === level
                    ? 'bg-neutral-100 text-neutral-700 font-medium'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700'
                }`}
              >
                {Math.round(level * 100)}%
              </button>
            ))}
          </div>
          <div className="border-t border-neutral-100 mt-1 pt-1 px-2">
            <button
              onClick={() => {
                resetZoom();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors"
            >
              Reset to 100%
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
