import { Outlet } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';

export default function Layout() {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-hidden"><Outlet /></main>
    </div>
  );
}
