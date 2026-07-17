import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Award, ChevronRight, Flame, Footprints, Timer, Zap } from 'lucide-react';
import { useApp } from '../AppContext';
import { exerciseLibrary } from '../data';
import { getRecords, isThisWeek, sessionDuration } from '../utils';
import { Button, SectionTitle } from '../components/UI';

interface InstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const weekDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Today() {
  const { state, setTab, startWorkout, exerciseNames, showToast } = useApp();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const today = new Date();
  const completedThisWeek = state.history.filter((session) => isThisWeek(session.finishedAt || session.startedAt));
  const totalMinutes = completedThisWeek.reduce((sum, session) => sum + sessionDuration(session) / 60000, 0);
  const records = getRecords(state.history, exerciseNames).slice(0, 2);
  const nextRoutine = useMemo(() => {
    for (let offset = 0; offset < 7; offset += 1) {
      const day = weekDay[(today.getDay() + offset) % 7];
      const id = state.schedule[day];
      if (id) return { routine: state.routines.find((item) => item.id === id), day: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : day };
    }
    return { routine: state.routines[0], day: 'Unscheduled' };
  }, [state.routines, state.schedule]);

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) { showToast('Use your browser menu, then choose “Add to Home Screen”'); return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstallPrompt(null);
  };

  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const start = () => {
    if (state.activeWorkout) setTab('workout');
    else if (nextRoutine.routine) startWorkout(nextRoutine.routine);
  };

  return (
    <main className="screen today-screen">
      <div className="hero-heading">
        <p className="eyebrow">{today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1>{greeting},<br /><span>{state.profile.name}.</span></h1>
      </div>

      <section className="start-card">
        <div className="start-card__top">
          <span className="status-pill"><span /> {state.activeWorkout ? 'IN PROGRESS' : `${nextRoutine.day.toUpperCase()}’S SESSION`}</span>
          <span className="workout-index">{String(completedThisWeek.length + 1).padStart(2, '0')} / {String(state.profile.weeklyTarget).padStart(2, '0')}</span>
        </div>
        <div className="start-card__main">
          <div>
            <p>{state.activeWorkout ? 'CURRENT WORKOUT' : 'NEXT UP'}</p>
            <h2>{state.activeWorkout?.name || nextRoutine.routine?.name || 'Choose a plan'}</h2>
            <span>{state.activeWorkout ? 'Tap to continue where you left off' : `${nextRoutine.routine?.exercises.length || 0} exercises · about 60 min`}</span>
          </div>
          <Button onClick={start}>{state.activeWorkout ? 'Continue workout' : 'Start workout'} <ArrowUpRight size={19} /></Button>
        </div>
        <div className="progress-track"><span style={{ width: `${Math.min(100, (completedThisWeek.length / state.profile.weeklyTarget) * 100)}%` }} /></div>
        <div className="start-card__bottom"><span>Weekly target</span><strong>{completedThisWeek.length} of {state.profile.weeklyTarget} complete</strong></div>
      </section>

      <section className="metric-grid" aria-label="Daily activity">
        <article><span className="metric-icon"><Footprints size={19} /></span><p>STEPS</p><strong>{state.steps.toLocaleString()}</strong><small><i style={{ width: `${Math.min(100, state.steps / 100)}%` }} /></small></article>
        <article><span className="metric-icon"><Timer size={19} /></span><p>TRAINING</p><strong>{Math.round(totalMinutes)}<em>m</em></strong><small><i style={{ width: `${Math.min(100, totalMinutes / 2)}%` }} /></small></article>
        <article><span className="metric-icon"><Zap size={19} /></span><p>CALORIES</p><strong>{Math.round(totalMinutes * 7.4)}</strong><small><i style={{ width: `${Math.min(100, totalMinutes / 2.2)}%` }} /></small></article>
      </section>

      <section className="weekly-card">
        <div className="weekly-card__copy"><span className="flame"><Flame size={22} fill="currentColor" /></span><div><strong>6 week streak</strong><small>Keep showing up. You’re building momentum.</small></div></div>
        <div className="week-dots">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`} className={index < completedThisWeek.length ? 'done' : index === ((today.getDay() + 6) % 7) ? 'today' : ''}>{index < completedThisWeek.length ? '✓' : day}</span>)}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="MOMENTUM" title="Recent records" action={<button className="text-button" onClick={() => setTab('progress')}>View all <ChevronRight size={16} /></button>} />
        <div className="record-grid">
          {records.map((record, index) => {
            const definition = exerciseLibrary.find((exercise) => exercise.id === record.exerciseId);
            return <article className="record-card" key={record.exerciseId}><div><span className="record-number">0{index + 1}</span><Award size={19} /></div><p>{definition?.muscle.toUpperCase()}</p><h3>{record.exerciseName}</h3><strong>{record.weight}<em>{state.profile.unit}</em> × {record.reps}</strong><small>Estimated 1RM {record.estimated1RM}{state.profile.unit}</small></article>;
          })}
        </div>
      </section>

      <button className="install-banner" onClick={install}>
        <span className="install-icon">F</span><span><strong>Take FORM with you</strong><small>Install it on your home screen</small></span><ChevronRight size={18} />
      </button>
    </main>
  );
}
