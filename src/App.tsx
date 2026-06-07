import { Icon } from '@/components/ui/icon';
import { PanelLeftIcon } from '@hugeicons/core-free-icons';

function App() {
  return (
    <div style={{ display: 'flex', gap: '8px', padding: '16px', alignItems: 'center' }}>
      <img src="/favicon.png" alt="App Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
      <Icon icon={PanelLeftIcon} size={18} />
    </div>
  );
}

export default App;
