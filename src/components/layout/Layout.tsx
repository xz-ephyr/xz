import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import TitleBar from './TitleBar';
import { SessionTitleProvider } from '../../hooks/useSessionTitle';

export default function Layout() {
  return (
    <SessionTitleProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <TitleBar />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-hidden"><Outlet /></main>
        </div>
      </div>
    </SessionTitleProvider>
  );
}
