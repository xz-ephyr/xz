import { useState, useRef, useEffect, useCallback } from 'react';
import { isTauri } from '../../lib/tauri';
import { useZoomContext } from './ZoomProvider';

const ZOOM_PRESETS = [0.5, 0.65, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2];

async function startWindowDrag() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().startDragging();
  } catch (e) {
    console.error('Failed to start drag', e);
  }
}

async function minimizeWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  } catch (e) {
    console.error('Failed to minimize', e);
  }
}

async function toggleMaximizeWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const w = getCurrentWindow();
    if (await w.isMaximized()) {
      await w.unmaximize();
    } else {
      await w.maximize();
    }
  } catch (e) {
    console.error('Failed to maximize', e);
  }
}

async function closeWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  } catch (e) {
    console.error('Failed to close', e);
  }
}

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

  const handleMouseDown = useCallback(() => {
    if (isTauri()) {
      startWindowDrag();
    }
  }, []);

  if (!isTauri()) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between h-10 px-3 bg-white border-b border-neutral-200 shrink-0 select-none"
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-neutral-400">
          <rect x="1" y="1" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        xz
      </div>

      <div className="flex items-center gap-1">
        <ZoomTrigger
          zoom={zoom}
          isOpen={isZoomOpen}
          onToggle={() => setIsZoomOpen(!isZoomOpen)}
          dropdownRef={dropdownRef}
          setZoomLevel={setZoomLevel}
          resetZoom={resetZoom}
        />

        <div className="w-px h-4 bg-neutral-200 mx-1" />

        <WindowButton onClick={minimizeWindow} title="Minimize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </WindowButton>
        <WindowButton onClick={toggleMaximizeWindow} title="Maximize">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </WindowButton>
        <WindowButton onClick={closeWindow} title="Close" isClose>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </WindowButton>
      </div>
    </div>
  );
}

function WindowButton({
  onClick,
  title,
  children,
  isClose,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  isClose?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
        isClose
          ? 'hover:bg-red-100 hover:text-red-600 text-neutral-400'
          : 'hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700'
      }`}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
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
