import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { OnboardingPage, ChatPage, ChatsPage, SchedulePage, PluginsPage, WikiPage } from './pages';
import { isTauri } from './lib/tauri';
import UpdateModal from './components/ui/UpdateModal';

export default function App() {
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    currentVersion: string;
    body?: string;
    date?: string;
  } | null>(null);

  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;

    (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (cancelled || !update) return;

        setUpdateInfo({
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body,
          date: update.date,
        });
      } catch (e) {
        console.error('Update check failed:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleInstall = async () => {
    if (!updateInfo) return;
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
      }
    } catch (e) {
      console.error('Install failed:', e);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route element={<Layout />}>
          <Route path="/thread/:uuid" element={<ChatPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/project/:uuid" element={<ChatPage />} />
          <Route path="/project/:folder/:uuid" element={<ChatPage />} />
          <Route path="/chat/:uuid" element={<ChatPage />} />
        </Route>
      </Routes>

      {updateInfo && (
        <UpdateModal
          update={updateInfo}
          onInstall={handleInstall}
          onLater={() => setUpdateInfo(null)}
        />
      )}
    </Router>
  );
}
