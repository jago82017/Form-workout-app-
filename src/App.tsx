import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { useApp } from './AppContext';
import { AppHeader, BottomNav } from './components/Navigation';
import { GymControls } from './components/GymControls';
import { RestTimer, Toast } from './components/UI';
import Today from './screens/Today';
import Plans from './screens/Plans';
import Workout from './screens/Workout';
import Progress from './screens/Progress';
import Profile from './screens/Profile';

export default function App() {
  const { tab, loading } = useApp();
  const [online, setOnline] = useState(navigator.onLine);
  const [gymControlsOpen, setGymControlsOpen] = useState(false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  if (loading) return <div className="splash"><span className="splash-logo">F<span>O</span>RM</span><div className="loader" /><p>Loading your training…</p></div>;

  return <div className="app-shell">
    {!online && <div className="offline-banner"><CloudOff size={15} /> Offline mode · your workout will still save</div>}
    <AppHeader onOpenGymControls={() => setGymControlsOpen(true)} />
    <div className="screen-wrap" key={tab}>
      {tab === 'today' && <Today />}
      {tab === 'plans' && <Plans />}
      {tab === 'workout' && <Workout />}
      {tab === 'progress' && <Progress />}
      {tab === 'profile' && <Profile />}
    </div>
    <RestTimer />
    <GymControls open={gymControlsOpen} onClose={() => setGymControlsOpen(false)} />
    <BottomNav />
    <Toast />
  </div>;
}
