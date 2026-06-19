import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { OnboardingPage, ChatPage, ChatsPage, SchedulePage, PluginsPage, WikiPage } from './pages';
import { ChatSessionManager } from './services/ChatSessionManager';

export default function App() {
  useEffect(() => {
    ChatSessionManager.migrateFromLocalStorage();
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<OnboardingPage />} />
          <Route path="/chat/:uuid" element={<ChatPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/project/:uuid" element={<ChatPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
