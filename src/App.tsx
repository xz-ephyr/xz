// Your rules resume
import Sidebar from './components/sidebar/Sidebar';

export default function App() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-4">
        <h1>Vibe Code</h1>
      </main>
    </div>
  );
}
