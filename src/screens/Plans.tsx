import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Bell, CalendarDays, Check, Copy, Dumbbell, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { exerciseLibrary } from '../data';
import type { ExerciseDefinition, Routine } from '../types';
import { uid } from '../utils';
import { Button, ConfirmDialog, IconButton, Modal, SectionTitle } from '../components/UI';

const colors = ['#c7ff3d', '#ffb86b', '#93b4ff', '#f497da', '#a2e5d5', '#ff856b'];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Plans() {
  const { state, setState, startWorkout, showToast } = useApp();
  const [view, setView] = useState<'routines' | 'schedule'>('routines');
  const [selectedId, setSelectedId] = useState(state.routines[0]?.id || '');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ mode: 'create' | 'rename'; routine?: Routine } | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [deleteRoutine, setDeleteRoutine] = useState<Routine | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('All');
  const [equipment, setEquipment] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState('Full body');
  const selected = state.routines.find((routine) => routine.id === selectedId) || state.routines[0];
  const allExercises = [...exerciseLibrary, ...state.customExercises];
  const exerciseMap = useMemo(() => Object.fromEntries(allExercises.map((item) => [item.id, item])), [state.customExercises]);

  const filteredExercises = allExercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(search.toLowerCase()) &&
    (muscle === 'All' || exercise.muscle === muscle) &&
    (equipment === 'All' || exercise.equipment === equipment) &&
    (difficulty === 'All' || exercise.difficulty === difficulty),
  );

  const openCreate = () => { setRoutineName(''); setEditModal({ mode: 'create' }); };
  const openRename = (routine: Routine) => { setMenuId(null); setRoutineName(routine.name); setEditModal({ mode: 'rename', routine }); };
  const saveRoutine = () => {
    const name = routineName.trim();
    if (name.length < 2) { showToast('Use at least 2 characters'); return; }
    if (editModal?.mode === 'create') {
      const routine: Routine = { id: uid('routine'), name, accent: colors[state.routines.length % colors.length], exercises: [] };
      setState((current) => ({ ...current, routines: [...current.routines, routine] }));
      setSelectedId(routine.id);
      showToast(`${name} created`);
    } else if (editModal?.routine) {
      setState((current) => ({ ...current, routines: current.routines.map((item) => item.id === editModal.routine?.id ? { ...item, name } : item) }));
      showToast('Routine renamed');
    }
    setEditModal(null);
  };

  const duplicate = (routine: Routine) => {
    const clone = { ...routine, id: uid('routine'), name: `${routine.name} copy`, exercises: routine.exercises.map((exercise) => ({ ...exercise })) };
    setState((current) => ({ ...current, routines: [...current.routines, clone] }));
    setMenuId(null); showToast('Routine duplicated');
  };

  const removeRoutine = () => {
    if (!deleteRoutine) return;
    const removed = deleteRoutine;
    const previous = state;
    setState((current) => ({
      ...current,
      routines: current.routines.filter((routine) => routine.id !== removed.id),
      schedule: Object.fromEntries(Object.entries(current.schedule).map(([day, id]) => [day, id === removed.id ? null : id])),
    }));
    setSelectedId(state.routines.find((routine) => routine.id !== removed.id)?.id || '');
    setDeleteRoutine(null);
    showToast('Routine deleted', { label: 'Undo', run: () => setState(previous) });
  };

  const moveRoutine = (routine: Routine, direction: -1 | 1) => {
    setState((current) => {
      const routines = [...current.routines];
      const from = routines.findIndex((item) => item.id === routine.id);
      const to = from + direction;
      if (to < 0 || to >= routines.length) return current;
      [routines[from], routines[to]] = [routines[to], routines[from]];
      return { ...current, routines };
    });
    setMenuId(null);
  };

  const addExercise = (exercise: ExerciseDefinition) => {
    if (!selected) return;
    if (selected.exercises.some((item) => item.exerciseId === exercise.id)) { showToast('Already in this routine'); return; }
    setState((current) => ({ ...current, routines: current.routines.map((routine) => routine.id === selected.id ? { ...routine, exercises: [...routine.exercises, { exerciseId: exercise.id, sets: 3, targetReps: '8–12', restSeconds: 90 }] } : routine) }));
    showToast(`${exercise.name} added`);
  };

  const addCustom = () => {
    const name = customName.trim();
    if (name.length < 2) { showToast('Enter an exercise name'); return; }
    const exercise: ExerciseDefinition = { id: uid('custom'), name, muscle: customMuscle, equipment: 'Other', difficulty: 'Beginner', instructions: 'Use a controlled range of motion and record notes for your preferred setup.' };
    setState((current) => ({ ...current, customExercises: [...current.customExercises, exercise] }));
    addExercise(exercise); setCustomName(''); setCustomMode(false);
  };

  const removeExercise = (exerciseId: string) => setState((current) => ({ ...current, routines: current.routines.map((routine) => routine.id === selected?.id ? { ...routine, exercises: routine.exercises.filter((exercise) => exercise.exerciseId !== exerciseId) } : routine) }));

  return (
    <main className="screen plans-screen">
      <div className="page-heading"><div><p className="eyebrow">BUILD YOUR WEEK</p><h1>Plans</h1></div><Button className="compact" onClick={openCreate}><Plus size={18} /> New</Button></div>
      <div className="segmented"><button className={view === 'routines' ? 'active' : ''} onClick={() => setView('routines')}>Routines</button><button className={view === 'schedule' ? 'active' : ''} onClick={() => setView('schedule')}>Schedule</button></div>

      {view === 'routines' ? <>
        <div className="routine-list">
          {state.routines.map((routine, index) => {
            const muscles = [...new Set(routine.exercises.map((exercise) => exerciseMap[exercise.exerciseId]?.muscle).filter(Boolean))];
            return <article key={routine.id} className={`routine-card ${selected?.id === routine.id ? 'selected' : ''}`} onClick={() => setSelectedId(routine.id)} style={{ '--accent': routine.accent } as React.CSSProperties}>
              <span className="routine-card__number">{String(index + 1).padStart(2, '0')}</span>
              <div className="routine-card__copy"><p>{muscles.slice(0, 3).join(' · ') || 'EMPTY ROUTINE'}</p><h2>{routine.name}</h2><span>{routine.exercises.length} exercises · {routine.exercises.reduce((sum, exercise) => sum + exercise.sets, 0)} sets</span></div>
              <div className="routine-card__actions"><IconButton label={`More options for ${routine.name}`} onClick={(event) => { event.stopPropagation(); setMenuId(menuId === routine.id ? null : routine.id); }}><MoreHorizontal size={21} /></IconButton>{menuId === routine.id && <div className="action-menu" onClick={(event) => event.stopPropagation()}><button onClick={() => openRename(routine)}><Pencil size={15} /> Rename</button><button onClick={() => duplicate(routine)}><Copy size={15} /> Duplicate</button><button onClick={() => moveRoutine(routine, -1)} disabled={index === 0}><ArrowUp size={15} /> Move up</button><button onClick={() => moveRoutine(routine, 1)} disabled={index === state.routines.length - 1}><ArrowDown size={15} /> Move down</button><button className="danger" onClick={() => { setDeleteRoutine(routine); setMenuId(null); }}><Trash2 size={15} /> Delete</button></div>}</div>
            </article>;
          })}
        </div>

        {selected && <section className="routine-detail">
          <SectionTitle eyebrow="ROUTINE DETAILS" title={selected.name} action={<Button className="compact" onClick={() => startWorkout(selected)} disabled={!selected.exercises.length}>Start</Button>} />
          <div className="exercise-plan-list">
            {selected.exercises.map((item, index) => {
              const exercise = exerciseMap[item.exerciseId];
              return <article key={item.exerciseId}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{exercise?.name || 'Custom exercise'}</strong><small>{exercise?.muscle} · {exercise?.equipment}</small></div><p>{item.sets} × {item.targetReps}<small>{item.restSeconds}s rest</small></p><IconButton label={`Remove ${exercise?.name}`} onClick={() => removeExercise(item.exerciseId)}><X size={17} /></IconButton></article>;
            })}
            {!selected.exercises.length && <div className="empty-state"><Dumbbell size={25} /><strong>This routine is ready for exercises</strong><p>Add movements from the library or create your own.</p></div>}
          </div>
          <Button variant="secondary" className="full-button" onClick={() => setLibraryOpen(true)}><Plus size={18} /> Add exercise</Button>
        </section>}
      </> : <Schedule state={state} setState={setState} showToast={showToast} />}

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={editModal?.mode === 'create' ? 'New routine' : 'Rename routine'} footer={<><Button variant="secondary" onClick={() => setEditModal(null)}>Cancel</Button><Button onClick={saveRoutine}>{editModal?.mode === 'create' ? 'Create routine' : 'Save name'}</Button></>}>
        <label className="field"><span>Routine name</span><input autoFocus value={routineName} maxLength={40} onChange={(event) => setRoutineName(event.target.value)} placeholder="e.g. Strength A" onKeyDown={(event) => { if (event.key === 'Enter') saveRoutine(); }} /></label>
      </Modal>

      <Modal open={libraryOpen} onClose={() => setLibraryOpen(false)} title="Exercise library">
        {!customMode ? <>
          <label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exercises" /></label>
          <div className="filter-row">
            <select aria-label="Muscle group" value={muscle} onChange={(event) => setMuscle(event.target.value)}><option>All</option>{[...new Set(allExercises.map((item) => item.muscle))].sort().map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Equipment" value={equipment} onChange={(event) => setEquipment(event.target.value)}><option>All</option>{[...new Set(allExercises.map((item) => item.equipment))].sort().map((item) => <option key={item}>{item}</option>)}</select>
            <select aria-label="Difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>All</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select>
          </div>
          <button className="custom-exercise-button" onClick={() => setCustomMode(true)}><Plus size={18} /><span><strong>Create custom exercise</strong><small>Add a movement that isn’t listed</small></span></button>
          <div className="library-list">{filteredExercises.map((exercise) => {
            const added = selected?.exercises.some((item) => item.exerciseId === exercise.id);
            return <button key={exercise.id} onClick={() => addExercise(exercise)}><span className="exercise-glyph">{exercise.name.slice(0, 1)}</span><span><strong>{exercise.name}</strong><small>{exercise.muscle} · {exercise.equipment} · {exercise.difficulty}</small></span>{added ? <Check className="added" size={18} /> : <Plus size={18} />}</button>;
          })}</div>
        </> : <div className="custom-form"><button className="back-button" onClick={() => setCustomMode(false)}>← Exercise library</button><label className="field"><span>Exercise name</span><input autoFocus value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="e.g. Landmine press" /></label><label className="field"><span>Target muscle</span><select value={customMuscle} onChange={(event) => setCustomMuscle(event.target.value)}>{['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full body'].map((item) => <option key={item}>{item}</option>)}</select></label><Button onClick={addCustom}>Create and add</Button></div>}
      </Modal>

      <ConfirmDialog open={!!deleteRoutine} onClose={() => setDeleteRoutine(null)} title={`Delete ${deleteRoutine?.name || 'routine'}?`} body="Its workout history will stay in your progress. Any scheduled days using it will become rest days." confirmLabel="Delete routine" destructive onConfirm={removeRoutine} />
    </main>
  );
}

function Schedule({ state, setState, showToast }: { state: ReturnType<typeof useApp>['state']; setState: ReturnType<typeof useApp>['setState']; showToast: ReturnType<typeof useApp>['showToast'] }) {
  const todayIndex = (new Date().getDay() + 6) % 7;
  return <section className="schedule-section">
    <div className="schedule-summary"><span><CalendarDays size={23} /></span><div><p>WEEKLY RHYTHM</p><h2>{Object.values(state.schedule).filter(Boolean).length} training days</h2><small>{7 - Object.values(state.schedule).filter(Boolean).length} days for recovery</small></div></div>
    <div className="schedule-list">{days.map((day, index) => {
      const value = state.schedule[day] || '';
      return <label key={day} className={todayIndex === index ? 'today' : ''}><span><strong>{day}</strong><small>{todayIndex === index ? 'TODAY' : value ? 'TRAIN' : 'REST'}</small></span><select value={value} onChange={(event) => { const next = event.target.value || null; setState((current) => ({ ...current, schedule: { ...current.schedule, [day]: next } })); showToast(next ? `${day} updated` : `${day} set as rest`); }}><option value="">Rest day</option>{state.routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select></label>;
    })}</div>
    <label className="toggle-row"><span className="toggle-row__icon"><Bell size={19} /></span><span><strong>Workout reminders</strong><small>Gentle nudges on training days</small></span><input type="checkbox" checked={state.profile.reminders} onChange={(event) => setState((current) => ({ ...current, profile: { ...current.profile, reminders: event.target.checked } }))} /><i /></label>
  </section>;
}
