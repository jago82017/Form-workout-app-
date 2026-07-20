import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, Check, ChevronDown, CirclePause, CirclePlay, Clock3, Dumbbell, FileText, Flag, Gauge, Info, MoreHorizontal, Plus, RotateCcw, Sparkles, Trash2, Trophy, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { exerciseLibrary } from '../data';
import type { ExerciseDefinition, SetType, WorkoutSession, WorkoutSet } from '../types';
import { formatTimer, sessionDuration, sessionVolume, uid, wouldBeRecord } from '../utils';
import { finishWorkout, substituteWorkoutExercise, updateWorkoutSet } from '../workoutLogic';
import { Button, ConfirmDialog, IconButton, Modal } from '../components/UI';

const setTypes: SetType[] = ['warm-up', 'normal', 'drop', 'failure'];

export default function Workout() {
  const { state, setState, startWorkout, setTab, showToast, startRest } = useApp();
  const session = state.activeWorkout;
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [discardOpen, setDiscardOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [setupNoteDraft, setSetupNoteDraft] = useState('');
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [substituteSearch, setSubstituteSearch] = useState('');
  const [pendingSubstitute, setPendingSubstitute] = useState<ExerciseDefinition | null>(null);
  const [restOpen, setRestOpen] = useState(false);
  const [moreMetrics, setMoreMetrics] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [routinePicker, setRoutinePicker] = useState(false);
  const allExercises = useMemo(() => [...exerciseLibrary, ...state.customExercises], [state.customExercises]);
  const exerciseMap = useMemo(() => Object.fromEntries(allExercises.map((item) => [item.id, item])), [allExercises]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session && exerciseIndex >= session.exercises.length) setExerciseIndex(Math.max(0, session.exercises.length - 1));
  }, [session, exerciseIndex]);

  if (!session) {
    return <main className="screen empty-workout-screen">
      <div className="empty-workout-art"><span /><Dumbbell size={48} /></div>
      <p className="eyebrow">READY WHEN YOU ARE</p><h1>Start strong.</h1><p>Choose a routine and FORM will guide your sets, rests, and progress.</p>
      <Button onClick={() => setRoutinePicker(true)}>Choose a workout <ArrowRight size={19} /></Button>
      <button className="text-button centered" onClick={() => setTab('plans')}>Edit your plans</button>
      <Modal open={routinePicker} onClose={() => setRoutinePicker(false)} title="Choose a workout"><div className="picker-list">{state.routines.map((routine) => <button key={routine.id} disabled={!routine.exercises.length} onClick={() => startWorkout(routine)}><span style={{ background: routine.accent }}>{routine.name.slice(0, 1)}</span><span><strong>{routine.name}</strong><small>{routine.exercises.length} exercises · {routine.exercises.reduce((sum, item) => sum + item.sets, 0)} sets</small></span><ArrowRight size={18} /></button>)}</div></Modal>
    </main>;
  }

  const current = session.exercises[exerciseIndex];
  const definition = exerciseMap[current?.exerciseId];
  const routineExercise = state.routines.find((routine) => routine.id === session.routineId)?.exercises.find((item) => item.exerciseId === current?.exerciseId);
  const completedSets = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed).length;
  const allSets = session.exercises.flatMap((exercise) => exercise.sets).length;
  const elapsed = sessionDuration(session, now);
  const setupNote = state.exerciseNotes?.[current.exerciseId] || '';
  const substituteOptions = allExercises.filter((exercise) => {
    const query = substituteSearch.trim().toLowerCase();
    return exercise.id !== current.exerciseId && (!query || `${exercise.name} ${exercise.muscle} ${exercise.equipment}`.toLowerCase().includes(query));
  }).slice(0, 30);

  const patchSession = (update: (workout: WorkoutSession) => WorkoutSession) => setState((currentState) => currentState.activeWorkout ? { ...currentState, activeWorkout: update(currentState.activeWorkout) } : currentState);
  const patchSet = (setId: string, changes: Partial<WorkoutSet>) => patchSession((workout) => updateWorkoutSet(workout, exerciseIndex, setId, changes));

  const previousSet = (index: number) => {
    const oldSession = state.history.find((old) => old.exercises.some((exercise) => exercise.exerciseId === current.exerciseId));
    const oldExercise = oldSession?.exercises.find((exercise) => exercise.exerciseId === current.exerciseId);
    return oldExercise?.sets[index];
  };

  const toggleSet = (set: WorkoutSet) => {
    if (!set.completed && set.reps <= 0 && (set.duration || 0) <= 0) { showToast('Add reps or duration first'); return; }
    if (!set.completed) {
      const isRecord = wouldBeRecord(state, current.exerciseId, set.weight, set.reps);
      patchSet(set.id, { completed: true });
      startRest(routineExercise?.restSeconds || 90);
      if (isRecord && set.weight > 0) {
        setCelebration(definition?.name || 'Exercise');
        window.setTimeout(() => setCelebration(null), 2600);
      }
    } else patchSet(set.id, { completed: false });
  };

  const addSet = () => {
    const last = current.sets[current.sets.length - 1];
    const set: WorkoutSet = { id: uid('set'), type: last?.type || 'normal', weight: last?.weight || 0, reps: last?.reps || 0, rpe: last?.rpe || 8, duration: last?.duration, distance: last?.distance, completed: false };
    patchSession((workout) => ({ ...workout, exercises: workout.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, sets: [...exercise.sets, set] } : exercise) }));
  };

  const removeSet = (setId: string) => patchSession((workout) => ({ ...workout, exercises: workout.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) } : exercise) }));
  const moveSet = (setIndex: number, direction: -1 | 1) => patchSession((workout) => ({ ...workout, exercises: workout.exercises.map((exercise, index) => {
    if (index !== exerciseIndex) return exercise;
    const sets = [...exercise.sets]; const target = setIndex + direction;
    if (target < 0 || target >= sets.length) return exercise;
    [sets[setIndex], sets[target]] = [sets[target], sets[setIndex]];
    return { ...exercise, sets };
  }) }));

  const togglePause = () => {
    if (session.pausedAt) {
      const pausedFor = Date.now() - new Date(session.pausedAt).getTime();
      patchSession((workout) => ({ ...workout, pausedAt: undefined, elapsedBeforePause: workout.elapsedBeforePause + pausedFor }));
      showToast('Workout resumed');
    } else {
      patchSession((workout) => ({ ...workout, pausedAt: new Date().toISOString() }));
      showToast('Workout paused');
    }
  };

  const finish = () => {
    if (!completedSets) { showToast('Complete at least one set'); setFinishOpen(false); return; }
    setState((currentState) => finishWorkout(currentState, new Date().toISOString()));
    setFinishOpen(false); setTab('progress'); showToast('Workout saved — great work');
  };

  const discard = () => { setState((currentState) => ({ ...currentState, activeWorkout: null })); setDiscardOpen(false); setTab('today'); showToast('Workout discarded'); };

  const openNotes = () => {
    setSetupNoteDraft(setupNote);
    setNotesOpen(true);
  };

  const saveNotes = () => {
    const note = setupNoteDraft.trim().slice(0, 500);
    setState((currentState) => {
      const exerciseNotes = { ...(currentState.exerciseNotes || {}) };
      if (note) exerciseNotes[current.exerciseId] = note;
      else delete exerciseNotes[current.exerciseId];
      return { ...currentState, exerciseNotes };
    });
    setNotesOpen(false);
    showToast(note ? `${definition?.name || 'Exercise'} setup note saved` : 'Setup note cleared');
  };

  const applySubstitute = (replacement: ExerciseDefinition) => {
    const loggedSets = current.sets.filter((set) => set.completed);
    const hasLoggedSets = loggedSets.length > 0;
    patchSession((workout) => substituteWorkoutExercise(workout, exerciseIndex, replacement.id).workout);
    if (hasLoggedSets) setExerciseIndex((index) => index + 1);
    setSubstituteOpen(false); setSubstituteSearch(''); setPendingSubstitute(null);
    showToast(hasLoggedSets ? `${replacement.name} added for your remaining sets` : `${replacement.name} swapped in`);
  };

  const chooseSubstitute = (replacement: ExerciseDefinition) => {
    if (current.sets.some((set) => set.completed)) {
      setPendingSubstitute(replacement);
      setSubstituteOpen(false);
      return;
    }
    applySubstitute(replacement);
  };

  return <main className="screen workout-screen">
    {celebration && <div className="pr-celebration" role="status"><div className="spark spark-1" /><div className="spark spark-2" /><div className="spark spark-3" /><Trophy size={32} /><p>NEW PERSONAL RECORD</p><strong>{celebration}</strong></div>}
    <div className="workout-topbar"><div><p className="eyebrow">LIVE SESSION</p><h1>{session.name}</h1></div><div className="workout-topbar__actions"><IconButton label={session.pausedAt ? 'Resume workout' : 'Pause workout'} onClick={togglePause}>{session.pausedAt ? <CirclePlay size={23} /> : <CirclePause size={23} />}</IconButton><Button className="compact" onClick={() => setFinishOpen(true)}>Finish</Button></div></div>

    <section className="workout-stats"><div><Clock3 size={17} /><span><small>TIME</small><strong>{formatTimer(elapsed / 1000)}</strong></span></div><div><Gauge size={17} /><span><small>VOLUME</small><strong>{Math.round(sessionVolume(session)).toLocaleString()} {state.profile.unit}</strong></span></div><div><Check size={17} /><span><small>SETS</small><strong>{completedSets}/{allSets}</strong></span></div></section>
    {session.pausedAt && <div className="paused-banner"><CirclePause size={17} /> Workout paused <button onClick={togglePause}>Resume</button></div>}

    <div className="exercise-progress" aria-label={`Exercise ${exerciseIndex + 1} of ${session.exercises.length}`}>
      {session.exercises.map((exercise, index) => <button key={`${exercise.exerciseId}-${index}`} className={index === exerciseIndex ? 'active' : exercise.sets.every((set) => set.completed) ? 'done' : ''} onClick={() => setExerciseIndex(index)} aria-label={`Go to exercise ${index + 1}`}><span /></button>)}
    </div>

    <section className="current-exercise">
      <div className="exercise-title"><span className="exercise-number">{String(exerciseIndex + 1).padStart(2, '0')}</span><div><p>{definition?.muscle.toUpperCase()} · {definition?.equipment.toUpperCase()}</p><h2>{definition?.name || 'Custom exercise'}</h2><small>{routineExercise?.sets || current.sets.length} sets · {routineExercise?.targetReps || 'your target'} reps</small></div></div>
      <button className="swap-exercise" onClick={() => setSubstituteOpen(true)}><ArrowLeftRight size={17} /> Swap exercise <span>Change this workout only</span></button>
      <details className="instructions"><summary><Info size={16} /> Form cues <ChevronDown size={16} /></summary><p>{definition?.instructions || 'Use a controlled range of motion and record notes for your preferred setup.'}</p></details>
      {setupNote ? <section className="setup-note-card" aria-label={`Saved setup note for ${definition?.name || 'exercise'}`}><FileText size={18} /><div><p>YOUR SETUP NOTE</p><strong>{setupNote}</strong></div><button onClick={openNotes}>Edit</button></section> : <button className="add-setup-note" onClick={openNotes}><FileText size={17} /> Add a setup note <span>Bench angle, seat position, cues…</span></button>}
    </section>

    <section className="set-table">
      <div className={`set-table__head ${moreMetrics ? 'more' : ''}`}><span>SET</span><span>PREVIOUS</span><span>{state.profile.unit.toUpperCase()}</span><span>REPS</span><span>RPE</span><span /></div>
      {current.sets.map((set, index) => {
        const previous = previousSet(index);
        return <div key={set.id} className={`set-row ${set.completed ? 'completed' : ''}`}>
          <div className="set-index"><select aria-label={`Set ${index + 1} type`} value={set.type} onChange={(event) => patchSet(set.id, { type: event.target.value as SetType })} title={set.type}>{setTypes.map((type) => <option key={type}>{type}</option>)}</select><strong>{set.type === 'warm-up' ? 'W' : set.type === 'drop' ? 'D' : set.type === 'failure' ? 'F' : index + 1}</strong></div>
          <span className="previous">{previous ? `${previous.weight} × ${previous.reps}` : '—'}</span>
          <input aria-label={`Set ${index + 1} weight`} type="number" min="0" step="0.5" inputMode="decimal" value={set.weight || ''} placeholder="0" onChange={(event) => patchSet(set.id, { weight: Math.max(0, Number(event.target.value)) })} />
          <input aria-label={`Set ${index + 1} reps`} type="number" min="0" max="999" inputMode="numeric" value={set.reps || ''} placeholder="0" onChange={(event) => patchSet(set.id, { reps: Math.max(0, Number(event.target.value)) })} />
          <input aria-label={`Set ${index + 1} RPE`} type="number" min="1" max="10" step="0.5" inputMode="decimal" value={set.rpe || ''} onChange={(event) => patchSet(set.id, { rpe: Math.min(10, Math.max(1, Number(event.target.value))) })} />
          <button className="complete-set" aria-label={set.completed ? `Uncheck set ${index + 1}` : `Complete set ${index + 1}`} onClick={() => toggleSet(set)}><Check size={18} /></button>
          {moreMetrics && <div className="extra-metrics"><label><span>Duration (sec)</span><input type="number" min="0" inputMode="numeric" value={set.duration || ''} onChange={(event) => patchSet(set.id, { duration: Math.max(0, Number(event.target.value)) })} /></label><label><span>Distance ({state.profile.distanceUnit})</span><input type="number" min="0" step="0.1" inputMode="decimal" value={set.distance || ''} onChange={(event) => patchSet(set.id, { distance: Math.max(0, Number(event.target.value)) })} /></label><div className="set-tools"><IconButton label="Move set up" onClick={() => moveSet(index, -1)} disabled={index === 0}><ArrowUp size={16} /></IconButton><IconButton label="Move set down" onClick={() => moveSet(index, 1)} disabled={index === current.sets.length - 1}><ArrowDown size={16} /></IconButton><IconButton label="Remove set" onClick={() => removeSet(set.id)} disabled={current.sets.length === 1}><Trash2 size={16} /></IconButton></div></div>}
        </div>;
      })}
      <div className="set-actions"><button onClick={addSet}><Plus size={17} /> Add set</button><button onClick={() => setMoreMetrics(!moreMetrics)}><MoreHorizontal size={17} /> {moreMetrics ? 'Less' : 'More metrics'}</button></div>
    </section>

    <div className="workout-quick-actions"><button onClick={openNotes}><PencilIcon /> Notes{(current.note || setupNote) && <i />}</button><button onClick={() => setRestOpen(true)}><RotateCcw size={17} /> Rest timer</button><button className="discard-link" onClick={() => setDiscardOpen(true)}><Trash2 size={17} /> Discard</button></div>

    <div className="exercise-navigation"><Button variant="secondary" onClick={() => setExerciseIndex(Math.max(0, exerciseIndex - 1))} disabled={exerciseIndex === 0}><ArrowLeft size={18} /> Previous</Button>{exerciseIndex === session.exercises.length - 1 ? <Button onClick={() => setFinishOpen(true)}>Finish <Flag size={18} /></Button> : <Button onClick={() => setExerciseIndex(exerciseIndex + 1)}>Next <ArrowRight size={18} /></Button>}</div>

    <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title={`Notes for ${definition?.name || 'exercise'}`} footer={<Button onClick={saveNotes}>Save notes</Button>}><label className="field"><span>Saved setup note</span><textarea rows={3} maxLength={500} value={setupNoteDraft} placeholder="For example: Set the bench to 60° and keep elbows slightly forward." onChange={(event) => setSetupNoteDraft(event.target.value)} /><small className="field-help">This appears every time you do this exercise, including future workouts.</small></label><label className="field"><span>This workout only</span><textarea rows={3} maxLength={500} value={current.note || ''} placeholder="How this exercise felt today, or a change you made today…" onChange={(event) => patchSession((workout) => ({ ...workout, exercises: workout.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, note: event.target.value } : exercise) }))} /></label><label className="field"><span>Whole workout notes</span><textarea rows={3} maxLength={1000} value={session.note} placeholder="A note about today’s entire workout…" onChange={(event) => patchSession((workout) => ({ ...workout, note: event.target.value }))} /></label></Modal>
    <Modal open={substituteOpen} onClose={() => { setSubstituteOpen(false); setSubstituteSearch(''); }} title="Swap exercise"><p className="modal-copy">Choose a replacement for this workout only. Your saved plan will not change.</p><label className="search-field"><span className="sr-only">Search exercises</span><input autoFocus placeholder="Search exercises, muscles, or equipment" value={substituteSearch} onChange={(event) => setSubstituteSearch(event.target.value)} /></label><div className="substitute-list">{substituteOptions.map((exercise) => <button key={exercise.id} onClick={() => chooseSubstitute(exercise)}><span><strong>{exercise.name}</strong><small>{exercise.muscle} · {exercise.equipment}</small></span><ArrowRight size={18} /></button>)}{!substituteOptions.length && <p>No matching exercises. Add a custom exercise from Plans first.</p>}</div></Modal>
    <Modal open={restOpen} onClose={() => setRestOpen(false)} title="Rest timer"><p className="modal-copy">Choose a rest period. The timer stays visible while you move around FORM.</p><div className="rest-presets">{[30, 60, 90, 120, 180].map((seconds) => <button key={seconds} onClick={() => { startRest(seconds); setRestOpen(false); }}>{formatTimer(seconds)}</button>)}</div></Modal>
    <ConfirmDialog open={!!pendingSubstitute} onClose={() => setPendingSubstitute(null)} title="Keep your logged sets?" body={`You have already logged ${current.sets.filter((set) => set.completed).length} ${definition?.name || 'exercise'} set(s). FORM will keep those and add ${pendingSubstitute?.name || 'the substitute'} for the remaining work.`} confirmLabel="Add substitute" onConfirm={() => { if (pendingSubstitute) applySubstitute(pendingSubstitute); }} />
    <ConfirmDialog open={discardOpen} onClose={() => setDiscardOpen(false)} title="Discard workout?" body="This active session and all its set data will be removed. Finished workouts are not affected." confirmLabel="Discard workout" destructive onConfirm={discard} />
    <Modal open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish workout?" footer={<><Button variant="secondary" onClick={() => setFinishOpen(false)}>Keep training</Button><Button onClick={finish}>Save workout</Button></>}><div className="finish-summary"><Sparkles size={26} /><strong>{completedSets} sets complete</strong><p>{formatTimer(elapsed / 1000)} training · {Math.round(sessionVolume(session)).toLocaleString()} {state.profile.unit} volume</p></div></Modal>
  </main>;
}

function PencilIcon() { return <span className="mini-pencil">✎</span>; }
