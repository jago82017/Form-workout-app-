import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { exerciseLibrary, seedState } from './data';
import { loadState, saveState } from './db';
import type { AppState, Routine, Tab, WorkoutSession } from './types';
import { uid } from './utils';

interface ToastState { message: string; action?: { label: string; run: () => void } }

interface AppContextValue {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  loading: boolean;
  saveStatus: 'saved' | 'saving' | 'error';
  tab: Tab;
  setTab: (tab: Tab) => void;
  toast: ToastState | null;
  showToast: (message: string, action?: ToastState['action']) => void;
  startWorkout: (routine: Routine) => void;
  restEnd: number | null;
  startRest: (seconds: number) => void;
  stopRest: () => void;
  exerciseNames: Record<string, string>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(seedState);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [tab, setTab] = useState<Tab>('today');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [restEnd, setRestEnd] = useState<number | null>(() => {
    const stored = sessionStorage.getItem('form-rest-end');
    return stored ? Number(stored) : null;
  });
  const hydrated = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadState()
      .then((saved) => { if (saved) setState({ ...seedState, ...saved, customExercises: saved.customExercises || [], photos: saved.photos || [], bodyweight: saved.bodyweight || [] }); })
      .catch(() => setSaveStatus('error'))
      .finally(() => { hydrated.current = true; setLoading(false); });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      saveState(state).then(() => setSaveStatus('saved')).catch(() => setSaveStatus('error'));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    const dark = state.profile.theme === 'dark' || (state.profile.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.reducedMotion = state.profile.reducedMotion ? 'true' : 'false';
  }, [state.profile.theme, state.profile.reducedMotion]);

  const showToast = useCallback((message: string, action?: ToastState['action']) => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, action });
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const startWorkout = useCallback((routine: Routine) => {
    const session: WorkoutSession = {
      id: uid('workout'), routineId: routine.id, name: routine.name, startedAt: new Date().toISOString(),
      elapsedBeforePause: 0, note: '',
      exercises: routine.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        note: exercise.note || '',
        sets: Array.from({ length: exercise.sets }, (_, index) => ({
          id: uid(`set-${index + 1}`), type: 'normal', weight: 0, reps: 0, rpe: 8, completed: false,
        })),
      })),
    };
    setState((current) => ({ ...current, activeWorkout: session }));
    setTab('workout');
    showToast(`${routine.name} started`);
  }, [showToast]);

  const startRest = useCallback((seconds: number) => {
    const end = Date.now() + seconds * 1000;
    sessionStorage.setItem('form-rest-end', String(end));
    setRestEnd(end);
  }, []);

  const stopRest = useCallback(() => {
    sessionStorage.removeItem('form-rest-end');
    setRestEnd(null);
  }, []);

  const exerciseNames = useMemo(() => Object.fromEntries([...exerciseLibrary, ...state.customExercises].map((exercise) => [exercise.id, exercise.name])), [state.customExercises]);

  return (
    <AppContext.Provider value={{ state, setState, loading, saveStatus, tab, setTab, toast, showToast, startWorkout, restEnd, startRest, stopRest, exerciseNames }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
};
