import { useState, useCallback, useRef } from 'react';

const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 960;
const CHAT_MIN_WIDTH = 320;
const DEFAULT_PANEL_WIDTH = 480;
const PANEL_STORAGE_KEY = 'artifact-panel-width';

export function usePanelResize() {
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(PANEL_STORAGE_KEY);
      if (saved) {
        return Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, parseInt(saved, 10)));
      }
    } catch { /* ignore */ }
    return DEFAULT_PANEL_WIDTH;
  });

  const isResizing = useRef(false);

  const startResize = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (clientX: number) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - clientX;
      const clamped = Math.max(
        PANEL_MIN_WIDTH,
        Math.min(
          PANEL_MAX_WIDTH,
          window.innerWidth - CHAT_MIN_WIDTH,
          newWidth
        )
      );
      setPanelWidth(clamped);
    };

    const onUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      setPanelWidth((prev) => {
        localStorage.setItem(PANEL_STORAGE_KEY, String(prev));
        return prev;
      });
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const onMouseUp = () => onUp();
    const onTouchMove = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const onTouchEnd = () => onUp();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, []);

  const handleDividerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 50 : 20;
    let newWidth = panelWidth;
    let handled = true;

    switch (e.key) {
      case 'ArrowLeft':
        newWidth = Math.max(PANEL_MIN_WIDTH, panelWidth - step);
        break;
      case 'ArrowRight':
        newWidth = Math.min(PANEL_MAX_WIDTH, panelWidth + step);
        break;
      case 'Home':
        newWidth = PANEL_MIN_WIDTH;
        break;
      case 'End':
        newWidth = PANEL_MAX_WIDTH;
        break;
      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      setPanelWidth(newWidth);
      localStorage.setItem(PANEL_STORAGE_KEY, String(newWidth));
    }
  }, [panelWidth]);

  return { panelWidth, startResize, handleDividerKeyDown };
}
