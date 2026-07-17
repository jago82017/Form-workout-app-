import { useEffect, useRef, useState } from 'react';
import { Accessibility, Bell, Check, ChevronRight, CloudOff, Database, Download, Dumbbell, FileJson, Moon, RefreshCcw, Scale, ShieldCheck, Sun, Upload, UserRound } from 'lucide-react';
import { useApp } from '../AppContext';
import { seedState } from '../data';
import { clearState } from '../db';
import type { AppState, Goal, ThemeMode } from '../types';
import { downloadFile, sessionDuration, sessionVolume } from '../utils';
import { Button, ConfirmDialog, SectionTitle } from '../components/UI';

const goals: Goal[] = ['Build muscle', 'Gain strength', 'Lose fat', 'Improve fitness', 'General health'];

export default function Profile() {
  const { state, setState, showToast, saveStatus, exerciseNames } = useApp();
  const [online, setOnline] = useState(navigator.onLine);
  const [resetOpen, setResetOpen] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const completedSets = state.history.flatMap((session) => session.exercises).flatMap((exercise) => exercise.sets).filter((set) => set.completed).length;

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  const patchProfile = <K extends keyof AppState['profile'],>(key: K, value: AppState['profile'][K]) => setState((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));

  const exportJson = () => {
    downloadFile(`form-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json');
    showToast('Backup downloaded');
  };

  const exportCsv = () => {
    const rows = [['Date', 'Workout', 'Exercise', 'Set type', 'Weight', 'Reps', 'RPE', 'Duration', 'Distance']];
    state.history.forEach((session) => session.exercises.forEach((exercise) => exercise.sets.filter((set) => set.completed).forEach((set) => rows.push([
      (session.finishedAt || session.startedAt).slice(0, 10), session.name, exerciseNames[exercise.exerciseId] || exercise.exerciseId, set.type, String(set.weight), String(set.reps), String(set.rpe), String(set.duration || ''), String(set.distance || ''),
    ]))));
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
    downloadFile(`form-workouts-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
    showToast('Workout CSV downloaded');
  };

  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as AppState;
      if (!parsed.profile || !Array.isArray(parsed.routines) || !Array.isArray(parsed.history)) throw new Error('Invalid structure');
      setState({ ...seedState, ...parsed, customExercises: parsed.customExercises || [], photos: parsed.photos || [], bodyweight: parsed.bodyweight || [] });
      showToast('FORM backup restored');
    } catch { showToast('That file is not a valid FORM backup'); }
    if (importInput.current) importInput.current.value = '';
  };

  const reset = async () => {
    await clearState(); setState(structuredClone(seedState)); setResetOpen(false); showToast('Sample data restored');
  };

  return <main className="screen profile-screen">
    <div className="profile-hero"><div className="profile-avatar">{state.profile.name.slice(0, 1).toUpperCase()}<span /></div><div><p className="eyebrow">FORM MEMBER</p><h1>{state.profile.name}</h1><span>{state.profile.goal} · {state.profile.experience}</span></div></div>
    <div className="profile-stats"><div><strong>{state.history.length}</strong><small>WORKOUTS</small></div><div><strong>{completedSets}</strong><small>SETS</small></div><div><strong>{Math.round(state.history.reduce((sum, session) => sum + sessionVolume(session), 0) / 1000)}k</strong><small>VOLUME</small></div></div>

    <section className="settings-card"><SectionTitle eyebrow="TRAINING PROFILE" title="Your setup" />
      <label className="setting-field"><span><UserRound size={18} /><strong>Name</strong></span><input value={state.profile.name} maxLength={30} onChange={(event) => patchProfile('name', event.target.value)} onBlur={() => { if (!state.profile.name.trim()) patchProfile('name', 'Athlete'); }} /></label>
      <label className="setting-field"><span><Dumbbell size={18} /><strong>Goal</strong></span><select value={state.profile.goal} onChange={(event) => patchProfile('goal', event.target.value as Goal)}>{goals.map((goal) => <option key={goal}>{goal}</option>)}</select></label>
      <label className="setting-field"><span><ShieldCheck size={18} /><strong>Experience</strong></span><select value={state.profile.experience} onChange={(event) => patchProfile('experience', event.target.value as AppState['profile']['experience'])}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
      <label className="setting-field"><span><Scale size={18} /><strong>Weight units</strong></span><select value={state.profile.unit} onChange={(event) => patchProfile('unit', event.target.value as 'kg' | 'lb')}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option></select></label>
      <label className="setting-field"><span><Scale size={18} /><strong>Distance units</strong></span><select value={state.profile.distanceUnit} onChange={(event) => patchProfile('distanceUnit', event.target.value as 'km' | 'mi')}><option value="km">Kilometres (km)</option><option value="mi">Miles (mi)</option></select></label>
      <label className="setting-field"><span><Check size={18} /><strong>Weekly target</strong></span><select value={state.profile.weeklyTarget} onChange={(event) => patchProfile('weeklyTarget', Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((target) => <option value={target} key={target}>{target} workout{target === 1 ? '' : 's'}</option>)}</select></label>
    </section>

    <section className="settings-card"><SectionTitle eyebrow="APPEARANCE" title="Make it yours" />
      <div className="theme-picker" role="radiogroup" aria-label="Theme">{(['dark', 'light', 'system'] as ThemeMode[]).map((theme) => <button role="radio" aria-checked={state.profile.theme === theme} className={state.profile.theme === theme ? 'active' : ''} key={theme} onClick={() => patchProfile('theme', theme)}>{theme === 'dark' ? <Moon size={19} /> : theme === 'light' ? <Sun size={19} /> : <span className="system-icon">A</span>}<span>{theme[0].toUpperCase() + theme.slice(1)}</span>{state.profile.theme === theme && <Check size={15} />}</button>)}</div>
      <label className="toggle-row setting-toggle"><span className="toggle-row__icon"><Accessibility size={19} /></span><span><strong>Reduce motion</strong><small>Minimise interface animations</small></span><input type="checkbox" checked={state.profile.reducedMotion} onChange={(event) => patchProfile('reducedMotion', event.target.checked)} /><i /></label>
      <label className="toggle-row setting-toggle"><span className="toggle-row__icon"><Bell size={19} /></span><span><strong>Workout reminders</strong><small>Reminders on scheduled days</small></span><input type="checkbox" checked={state.profile.reminders} onChange={(event) => patchProfile('reminders', event.target.checked)} /><i /></label>
    </section>

    <section className="settings-card"><SectionTitle eyebrow="YOUR DATA" title="Private by default" />
      <div className="privacy-card"><span><Database size={21} /></span><div><strong>Stored on this device</strong><p>Your workouts and photos never leave this browser unless you export them.</p></div><small className={online ? 'online' : ''}>{online ? 'ONLINE' : 'OFFLINE READY'}</small></div>
      <div className="data-actions"><button onClick={exportJson}><FileJson size={19} /><span><strong>Export backup</strong><small>All data · JSON</small></span><Download size={17} /></button><button onClick={exportCsv}><Database size={19} /><span><strong>Export workouts</strong><small>Set history · CSV</small></span><Download size={17} /></button><button onClick={() => importInput.current?.click()}><Upload size={19} /><span><strong>Import backup</strong><small>Restore from JSON</small></span><ChevronRight size={17} /></button></div>
      <input className="sr-only" ref={importInput} type="file" accept="application/json,.json" onChange={(event) => importJson(event.target.files?.[0])} />
    </section>

    <section className="status-card"><span className={online ? 'online-dot' : 'offline-dot'}>{online ? <Check size={15} /> : <CloudOff size={15} />}</span><div><strong>{online ? 'FORM is ready' : 'You’re offline — keep training'}</strong><small>{saveStatus === 'saved' ? 'Every change is saved automatically' : saveStatus === 'saving' ? 'Saving your latest changes…' : 'Could not save the latest change'}</small></div></section>
    <button className="reset-button" onClick={() => setResetOpen(true)}><RefreshCcw size={17} /> Reset to sample data</button>
    <p className="app-version">FORM 1.0 · MADE FOR MOMENTUM</p>

    <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} title="Reset FORM?" body="Your routines, history, measurements, and settings will be replaced with the original sample data. Export a backup first if you want to keep them." confirmLabel="Reset everything" destructive onConfirm={reset} />
  </main>;
}
