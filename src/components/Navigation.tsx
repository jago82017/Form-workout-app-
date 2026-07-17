import { BarChart3, CalendarDays, Dumbbell, House, UserRound } from 'lucide-react';
import { useApp } from '../AppContext';
import type { Tab } from '../types';
import { SaveStatus } from './UI';

const tabs: Array<{ id: Tab; label: string; icon: typeof House }> = [
  { id: 'today', label: 'Today', icon: House },
  { id: 'plans', label: 'Plans', icon: CalendarDays },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: UserRound },
];

export function AppHeader() {
  const { state, setTab } = useApp();
  return (
    <header className="app-header">
      <button className="wordmark" onClick={() => setTab('today')} aria-label="FORM home">F<span>O</span>RM</button>
      <div className="app-header__right"><SaveStatus /><button className="avatar" onClick={() => setTab('profile')} aria-label="Open profile">{state.profile.name.slice(0, 1).toUpperCase()}</button></div>
    </header>
  );
}

export function BottomNav() {
  const { tab, setTab, state } = useApp();
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}>
          <span className="nav-icon"><Icon size={21} strokeWidth={tab === id ? 2.5 : 2} />{id === 'workout' && state.activeWorkout && <i />}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
