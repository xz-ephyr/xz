import { useState, useEffect } from 'react';
import { check, Update, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export type UpdaterState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready';

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>('idle');
  const [update, setUpdate] = useState<Update | null>(null);

  const checkForUpdates = async () => {
    setState('checking');
    try {
      const newUpdate = await check();
      if (newUpdate) {
        setUpdate(newUpdate);
        setState('available');
      } else {
        setState('idle');
      }
    } catch (e) {
      console.error('Failed to check for updates', e);
      setState('idle');
    }
  };

  const startUpdate = async () => {
    if (!update) return;
    setState('downloading');
    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
          if (event.event === 'Progress') {
              console.log(`Progress chunk: ${event.data.chunkLength}`);
          }
      });
      setState('ready');
    } catch (e) {
      console.error('Failed to install update', e);
      setState('idle');
    }
  };

  const restart = async () => {
    await relaunch();
  };

  const dismiss = () => {
    setState('idle');
  };

  useEffect(() => {
    checkForUpdates();
  }, []);

  return { state, update, startUpdate, restart, dismiss };
}
