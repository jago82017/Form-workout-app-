import { useMemo, useRef, useState } from 'react';
import { Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Award, CalendarDays, Camera, ChevronRight, Dumbbell, Pencil, Plus, Scale, Trash2, TrendingUp } from 'lucide-react';
import { useApp } from '../AppContext';
import { exerciseLibrary } from '../data';
import type { WorkoutSession } from '../types';
import { estimate1RM, getRecords, sessionDuration, sessionVolume, uid } from '../utils';
import { Button, ConfirmDialog, IconButton, Modal, SectionTitle } from '../components/UI';

type ProgressView = 'overview' | 'history' | 'body';
type Metric = 'weight' | 'estimated1RM' | 'reps' | 'volume';

export default function Progress() {
  const { state, setState, exerciseNames, showToast } = useApp();
  const [view, setView] = useState<ProgressView>('overview');
  const firstExercise = state.history.flatMap((session) => session.exercises)[0]?.exerciseId || 'bench-press';
  const [exerciseId, setExerciseId] = useState(firstExercise);
  const [metric, setMetric] = useState<Metric>('estimated1RM');
  const [editing, setEditing] = useState<WorkoutSession | null>(null);
  const [deleteSession, setDeleteSession] = useState<WorkoutSession | null>(null);
  const [bodyWeight, setBodyWeight] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const allExercises = [...exerciseLibrary, ...state.customExercises];
  const records = getRecords(state.history, exerciseNames);

  const chartData = useMemo(() => state.history.slice().reverse().flatMap((session) => {
    const exercise = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!exercise) return [];
    const sets = exercise.sets.filter((set) => set.completed);
    if (!sets.length) return [];
    const value = metric === 'weight' ? Math.max(...sets.map((set) => set.weight))
      : metric === 'estimated1RM' ? Math.max(...sets.map((set) => estimate1RM(set.weight, set.reps)))
      : metric === 'reps' ? Math.max(...sets.map((set) => set.reps))
      : sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
    return [{ date: new Date(session.finishedAt || session.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value }];
  }), [state.history, exerciseId, metric]);

  const weeklyData = useMemo(() => {
    const today = new Date();
    const currentMonday = new Date(today);
    currentMonday.setHours(0, 0, 0, 0);
    currentMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(currentMonday); start.setDate(currentMonday.getDate() - (5 - index) * 7);
      const end = new Date(start); end.setDate(start.getDate() + 7);
      const sessions = state.history.filter((session) => { const date = new Date(session.finishedAt || session.startedAt); return date >= start && date < end; });
      return { name: index === 5 ? 'Now' : start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), volume: Math.round(sessions.reduce((sum, session) => sum + sessionVolume(session), 0)), workouts: sessions.length };
    });
  }, [state.history]);
  const availableExercises = [...new Set(state.history.flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId)))];
  const calendarDays = Array.from({ length: 28 }, (_, offset) => {
    const date = new Date(); date.setDate(date.getDate() - (27 - offset)); date.setHours(0, 0, 0, 0);
    const complete = state.history.some((session) => new Date(session.finishedAt || session.startedAt).toDateString() === date.toDateString());
    return { date, complete };
  });

  const muscleData = useMemo(() => {
    const map: Record<string, number> = {};
    state.history.slice(0, 12).forEach((session) => session.exercises.forEach((exercise) => {
      const muscle = allExercises.find((item) => item.id === exercise.exerciseId)?.muscle || 'Other';
      map[muscle] = (map[muscle] || 0) + exercise.sets.filter((set) => set.completed).length;
    }));
    const total = Object.values(map).reduce((sum, value) => sum + value, 0) || 1;
    return Object.entries(map).map(([name, value]) => ({ name, value, percent: Math.round((value / total) * 100) })).sort((a, b) => b.value - a.value);
  }, [state.history, state.customExercises]);

  const saveEdit = () => {
    if (!editing || !editing.name.trim()) { showToast('Workout name is required'); return; }
    setState((current) => ({ ...current, history: current.history.map((session) => session.id === editing.id ? editing : session) }));
    setEditing(null); showToast('Workout updated');
  };

  const updateHistoricalSet = (exerciseIndex: number, setIndex: number, key: 'weight' | 'reps' | 'rpe', value: number) => {
    setEditing((current) => current ? {
      ...current,
      exercises: current.exercises.map((exercise, currentExerciseIndex) => currentExerciseIndex === exerciseIndex ? {
        ...exercise,
        sets: exercise.sets.map((set, currentSetIndex) => currentSetIndex === setIndex ? { ...set, [key]: value } : set),
      } : exercise),
    } : current);
  };

  const confirmDelete = () => {
    if (!deleteSession) return;
    const previous = state;
    setState((current) => ({ ...current, history: current.history.filter((session) => session.id !== deleteSession.id) }));
    setDeleteSession(null); setEditing(null);
    showToast('Workout deleted', { label: 'Undo', run: () => setState(previous) });
  };

  const addWeight = () => {
    const value = Number(bodyWeight);
    if (!value || value < 20 || value > 500) { showToast('Enter a valid bodyweight'); return; }
    setState((current) => ({ ...current, bodyweight: [...current.bodyweight, { id: uid('weight'), date: new Date().toISOString(), weight: value }] }));
    setBodyWeight(''); showToast('Bodyweight added');
  };

  const addPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Choose an image file'); return; }
    if (file.size > 4_000_000) { showToast('Choose an image under 4 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setState((current) => ({ ...current, photos: [{ id: uid('photo'), date: new Date().toISOString(), dataUrl: String(reader.result) }, ...current.photos] }));
    reader.readAsDataURL(file);
  };

  return <main className="screen progress-screen">
    <div className="page-heading"><div><p className="eyebrow">YOUR WORK, VISIBLE</p><h1>Progress</h1></div><span className="progress-badge"><TrendingUp size={17} /> +8.4%</span></div>
    <div className="segmented segmented--three"><button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>Overview</button><button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>History</button><button className={view === 'body' ? 'active' : ''} onClick={() => setView('body')}>Body</button></div>

    {view === 'overview' && <>
      <section className="chart-card main-chart">
        <div className="chart-card__header"><div><p className="eyebrow">STRENGTH TREND</p><h2>{exerciseNames[exerciseId] || 'Exercise'}</h2></div><span>{chartData.at(-1)?.value || 0}<small>{metric === 'reps' ? ' reps' : state.profile.unit}</small></span></div>
        <div className="chart-controls"><select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>{availableExercises.map((id) => <option key={id} value={id}>{exerciseNames[id] || id}</option>)}</select><select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}><option value="estimated1RM">Est. 1RM</option><option value="weight">Weight</option><option value="reps">Reps</option><option value="volume">Volume</option></select></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height={220}><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="limeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7ff3d" stopOpacity={0.3} /><stop offset="100%" stopColor="#c7ff3d" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} /><Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--line)', borderRadius: 12 }} /><Area type="monotone" dataKey="value" stroke="#c7ff3d" strokeWidth={3} fill="url(#limeArea)" activeDot={{ r: 5, fill: '#c7ff3d', stroke: '#111210', strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div>
      </section>

      <section className="chart-card"><SectionTitle eyebrow="LAST 6 WEEKS" title="Weekly workload" /><div className="chart-legend"><span><i /> Volume</span><span><i /> Workouts</span></div><div className="chart-wrap small"><ResponsiveContainer width="100%" height={170}><ComposedChart data={weeklyData} margin={{ left: -28, right: 4 }}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} /><YAxis yAxisId="volume" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} /><YAxis yAxisId="workouts" orientation="right" hide domain={[0, 7]} /><Tooltip cursor={{ fill: 'var(--surface-soft)' }} contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--line)', borderRadius: 12 }} /><Bar yAxisId="volume" dataKey="volume" radius={[5, 5, 0, 0]}>{weeklyData.map((_, index) => <Cell key={index} fill={index === weeklyData.length - 1 ? '#c7ff3d' : 'var(--chart-bar)'} />)}</Bar><Line yAxisId="workouts" dataKey="workouts" type="monotone" stroke="#ffb86b" strokeWidth={2} dot={{ r: 3, fill: '#ffb86b', strokeWidth: 0 }} /></ComposedChart></ResponsiveContainer></div></section>

      <section><SectionTitle eyebrow="BEST WORK" title="Personal records" action={<span className="count-pill">{records.length}</span>} /><div className="pr-list">{records.slice(0, 4).map((record, index) => <article key={record.exerciseId}><span className="medal"><Award size={19} /></span><div><strong>{record.exerciseName}</strong><small>{new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div><p><strong>{record.weight}{state.profile.unit} × {record.reps}</strong><small>{record.estimated1RM}{state.profile.unit} est. 1RM</small></p><span className="rank">#{index + 1}</span></article>)}</div></section>

      <section className="muscle-section"><SectionTitle eyebrow="LAST 12 WORKOUTS" title="Muscle balance" /><div className="muscle-list">{muscleData.slice(0, 6).map((item) => <div key={item.name}><p><span>{item.name}</span><strong>{item.percent}%</strong></p><i><span style={{ width: `${item.percent}%` }} /></i></div>)}</div></section>
    </>}

    {view === 'history' && <>
      <section className="calendar-card"><div className="calendar-card__header"><span><CalendarDays size={19} /></span><div><strong>Last 4 weeks</strong><small>{calendarDays.filter((day) => day.complete).length} sessions completed</small></div></div><div className="mini-calendar">{calendarDays.map((day) => <span key={day.date.toISOString()} className={day.complete ? 'trained' : day.date.toDateString() === new Date().toDateString() ? 'today' : ''} title={day.date.toLocaleDateString()}>{day.date.getDate()}</span>)}</div><div className="calendar-legend"><span><i className="trained" /> Trained</span><span><i /> Rest</span></div></section>
      <SectionTitle eyebrow="ALL SESSIONS" title="Workout history" action={<span className="count-pill">{state.history.length}</span>} />
      <div className="history-list">{state.history.map((session) => <button key={session.id} onClick={() => setEditing({ ...session })}><span className="history-date"><strong>{new Date(session.startedAt).getDate()}</strong><small>{new Date(session.startedAt).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</small></span><span className="history-copy"><strong>{session.name}</strong><small>{session.exercises.length} exercises · {session.exercises.flatMap((item) => item.sets).filter((set) => set.completed).length} sets</small></span><span className="history-meta"><strong>{Math.round(sessionVolume(session)).toLocaleString()} {state.profile.unit}</strong><small>{Math.round(sessionDuration(session) / 60000)} min</small></span><ChevronRight size={18} /></button>)}</div>
    </>}

    {view === 'body' && <>
      <section className="chart-card body-chart"><div className="chart-card__header"><div><p className="eyebrow">BODYWEIGHT</p><h2>{state.bodyweight.at(-1)?.weight || '—'} <small>{state.profile.unit}</small></h2></div><Scale size={23} /></div><div className="chart-wrap"><ResponsiveContainer width="100%" height={190}><AreaChart data={state.bodyweight.map((entry) => ({ date: new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value: entry.weight }))} margin={{ left: -22, right: 10 }}><defs><linearGradient id="bodyLimeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c7ff3d" stopOpacity={0.3} /><stop offset="100%" stopColor="#c7ff3d" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} /><YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} /><Area type="monotone" dataKey="value" stroke="#c7ff3d" strokeWidth={3} fill="url(#bodyLimeArea)" /></AreaChart></ResponsiveContainer></div><div className="inline-form"><label><span className="sr-only">Bodyweight</span><input type="number" inputMode="decimal" min="20" max="500" step="0.1" placeholder={`Add weight (${state.profile.unit})`} value={bodyWeight} onChange={(event) => setBodyWeight(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addWeight(); }} /></label><Button onClick={addWeight}><Plus size={18} /> Add</Button></div></section>
      <section><SectionTitle eyebrow="PRIVATE & ON-DEVICE" title="Progress photos" action={<Button variant="secondary" className="compact" onClick={() => photoInput.current?.click()}><Camera size={17} /> Add</Button>} /><input ref={photoInput} className="sr-only" type="file" accept="image/*" onChange={(event) => addPhoto(event.target.files?.[0])} /><div className="photo-grid"><button className="photo-add" onClick={() => photoInput.current?.click()}><Camera size={25} /><span>Add photo</span></button>{state.photos.map((photo) => <figure key={photo.id}><img src={photo.dataUrl} alt={`Progress from ${new Date(photo.date).toLocaleDateString()}`} /><figcaption>{new Date(photo.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</figcaption></figure>)}</div>{!state.photos.length && <p className="privacy-note">Photos stay in this browser and are never uploaded.</p>}</section>
    </>}

    <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit workout" footer={<><Button variant="danger" onClick={() => { setDeleteSession(editing); }}><Trash2 size={17} /> Delete</Button><Button onClick={saveEdit}>Save changes</Button></>}>
      {editing && <><label className="field"><span>Workout name</span><input value={editing.name} maxLength={50} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><label className="field"><span>Date</span><input type="date" value={editing.startedAt.slice(0, 10)} onChange={(event) => setEditing({ ...editing, startedAt: `${event.target.value}${editing.startedAt.slice(10)}` })} /></label><label className="field"><span>Notes</span><textarea rows={3} value={editing.note} placeholder="How did this workout feel?" onChange={(event) => setEditing({ ...editing, note: event.target.value })} /></label><div className="past-set-editor"><p className="eyebrow">EXERCISES & SETS</p>{editing.exercises.map((exercise, exerciseIndex) => <div className="past-exercise" key={`${exercise.exerciseId}-${exerciseIndex}`}><strong>{exerciseNames[exercise.exerciseId] || 'Exercise'}</strong><div className="past-set-head"><span>Set</span><span>{state.profile.unit}</span><span>Reps</span><span>RPE</span></div>{exercise.sets.map((set, setIndex) => <div className="past-set-row" key={set.id}><span>{setIndex + 1}</span><input aria-label={`${exerciseNames[exercise.exerciseId]} set ${setIndex + 1} weight`} type="number" min="0" step="0.5" value={set.weight} onChange={(event) => updateHistoricalSet(exerciseIndex, setIndex, 'weight', Math.max(0, Number(event.target.value)))} /><input aria-label={`${exerciseNames[exercise.exerciseId]} set ${setIndex + 1} reps`} type="number" min="0" value={set.reps} onChange={(event) => updateHistoricalSet(exerciseIndex, setIndex, 'reps', Math.max(0, Number(event.target.value)))} /><input aria-label={`${exerciseNames[exercise.exerciseId]} set ${setIndex + 1} RPE`} type="number" min="1" max="10" step="0.5" value={set.rpe} onChange={(event) => updateHistoricalSet(exerciseIndex, setIndex, 'rpe', Math.min(10, Math.max(1, Number(event.target.value))))} /></div>)}</div>)}</div><div className="edit-summary"><Dumbbell size={18} /><span>{editing.exercises.length} exercises</span><span>{Math.round(sessionVolume(editing)).toLocaleString()} {state.profile.unit}</span></div></>}
    </Modal>
    <ConfirmDialog open={!!deleteSession} onClose={() => setDeleteSession(null)} title="Delete this workout?" body="It will be removed from your history and progress calculations. You can undo this immediately afterwards." confirmLabel="Delete workout" destructive onConfirm={confirmDelete} />
  </main>;
}
