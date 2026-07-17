import type { AppState, ExerciseDefinition, Routine, WorkoutSession } from './types';

const daysAgo = (days: number, hour = 18) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
};

export const exerciseLibrary: ExerciseDefinition[] = [
  { id: 'bench-press', name: 'Barbell Bench Press', muscle: 'Chest', equipment: 'Barbell', difficulty: 'Intermediate', instructions: 'Retract your shoulder blades, keep feet planted, and lower the bar with control to your lower chest.' },
  { id: 'incline-db', name: 'Incline Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbells', difficulty: 'Beginner', instructions: 'Set the bench to 30°, keep wrists stacked, and press up and slightly inward.' },
  { id: 'cable-fly', name: 'Cable Fly', muscle: 'Chest', equipment: 'Cable', difficulty: 'Beginner', instructions: 'Keep a soft bend in your elbows and bring your hands together without shrugging.' },
  { id: 'overhead-press', name: 'Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', difficulty: 'Intermediate', instructions: 'Brace your trunk, squeeze your glutes, and finish with the bar over your mid-foot.' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbells', difficulty: 'Beginner', instructions: 'Lead with the elbows and stop around shoulder height. Keep the movement controlled.' },
  { id: 'triceps-pushdown', name: 'Triceps Pushdown', muscle: 'Triceps', equipment: 'Cable', difficulty: 'Beginner', instructions: 'Pin your elbows to your sides and fully extend without rocking your torso.' },
  { id: 'pull-up', name: 'Pull-up', muscle: 'Back', equipment: 'Bodyweight', difficulty: 'Intermediate', instructions: 'Start from a full hang, drive your elbows down, and bring your chest toward the bar.' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'Back', equipment: 'Machine', difficulty: 'Beginner', instructions: 'Lean back slightly and pull the bar to your upper chest while keeping shoulders down.' },
  { id: 'barbell-row', name: 'Barbell Row', muscle: 'Back', equipment: 'Barbell', difficulty: 'Intermediate', instructions: 'Hinge at the hips, brace your back, and row the bar toward your lower ribs.' },
  { id: 'seated-row', name: 'Seated Cable Row', muscle: 'Back', equipment: 'Cable', difficulty: 'Beginner', instructions: 'Stay tall and drive your elbows behind you without leaning back excessively.' },
  { id: 'face-pull', name: 'Face Pull', muscle: 'Rear delts', equipment: 'Cable', difficulty: 'Beginner', instructions: 'Pull toward eyebrow height and rotate your hands back while keeping ribs down.' },
  { id: 'barbell-curl', name: 'Barbell Curl', muscle: 'Biceps', equipment: 'Barbell', difficulty: 'Beginner', instructions: 'Keep elbows still and curl without using momentum from your hips.' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscle: 'Biceps', equipment: 'Dumbbells', difficulty: 'Beginner', instructions: 'Keep palms facing in and control the weight through the full range.' },
  { id: 'back-squat', name: 'Back Squat', muscle: 'Quads', equipment: 'Barbell', difficulty: 'Intermediate', instructions: 'Brace before descending, track knees over toes, and drive through the whole foot.' },
  { id: 'front-squat', name: 'Front Squat', muscle: 'Quads', equipment: 'Barbell', difficulty: 'Advanced', instructions: 'Keep elbows high and torso tall while sitting between your hips.' },
  { id: 'leg-press', name: 'Leg Press', muscle: 'Quads', equipment: 'Machine', difficulty: 'Beginner', instructions: 'Lower until comfortable without your lower back lifting from the pad.' },
  { id: 'leg-extension', name: 'Leg Extension', muscle: 'Quads', equipment: 'Machine', difficulty: 'Beginner', instructions: 'Align your knee with the machine pivot and squeeze at the top.' },
  { id: 'deadlift', name: 'Deadlift', muscle: 'Hamstrings', equipment: 'Barbell', difficulty: 'Advanced', instructions: 'Brace, push the floor away, and keep the bar close as your hips and shoulders rise together.' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Barbell', difficulty: 'Intermediate', instructions: 'Push hips back with soft knees and stop when you feel a strong hamstring stretch.' },
  { id: 'leg-curl', name: 'Leg Curl', muscle: 'Hamstrings', equipment: 'Machine', difficulty: 'Beginner', instructions: 'Keep your hips pinned down and curl through the largest comfortable range.' },
  { id: 'hip-thrust', name: 'Hip Thrust', muscle: 'Glutes', equipment: 'Barbell', difficulty: 'Intermediate', instructions: 'Tuck your chin, keep ribs down, and finish by squeezing the glutes.' },
  { id: 'bulgarian-split', name: 'Bulgarian Split Squat', muscle: 'Glutes', equipment: 'Dumbbells', difficulty: 'Intermediate', instructions: 'Take a stable stance and lower the back knee while keeping the front foot planted.' },
  { id: 'calf-raise', name: 'Standing Calf Raise', muscle: 'Calves', equipment: 'Machine', difficulty: 'Beginner', instructions: 'Pause in the stretched position, then rise fully onto the ball of your foot.' },
  { id: 'plank', name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', difficulty: 'Beginner', instructions: 'Squeeze glutes, brace your abs, and maintain a straight line from head to heel.' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'Core', equipment: 'Cable', difficulty: 'Intermediate', instructions: 'Curl your ribs toward your pelvis without pulling with your arms.' },
  { id: 'goblet-squat', name: 'Goblet Squat', muscle: 'Quads', equipment: 'Dumbbells', difficulty: 'Beginner', instructions: 'Hold the weight close, sit between your knees, and stay tall.' },
  { id: 'push-up', name: 'Push-up', muscle: 'Chest', equipment: 'Bodyweight', difficulty: 'Beginner', instructions: 'Keep a rigid body line and lower your chest between your hands.' },
  { id: 'walking-lunge', name: 'Walking Lunge', muscle: 'Glutes', equipment: 'Dumbbells', difficulty: 'Intermediate', instructions: 'Take controlled steps and gently touch your back knee toward the floor.' },
];

const routine = (id: string, name: string, accent: string, exercises: Array<[string, number, string, number]>): Routine => ({
  id, name, accent,
  exercises: exercises.map(([exerciseId, sets, targetReps, restSeconds]) => ({ exerciseId, sets, targetReps, restSeconds })),
});

export const starterRoutines: Routine[] = [
  routine('push', 'Push', '#c7ff3d', [['bench-press', 4, '6–8', 120], ['incline-db', 3, '8–10', 90], ['overhead-press', 3, '6–8', 120], ['lateral-raise', 3, '12–15', 60], ['triceps-pushdown', 3, '10–12', 60]]),
  routine('pull', 'Pull', '#ffb86b', [['pull-up', 3, '6–10', 120], ['barbell-row', 4, '6–8', 120], ['lat-pulldown', 3, '8–12', 90], ['face-pull', 3, '12–15', 60], ['barbell-curl', 3, '8–12', 60]]),
  routine('legs', 'Legs', '#93b4ff', [['back-squat', 4, '5–8', 150], ['romanian-deadlift', 3, '8–10', 120], ['leg-press', 3, '10–12', 90], ['leg-curl', 3, '10–15', 75], ['calf-raise', 4, '10–15', 60]]),
  routine('upper', 'Upper Body', '#f497da', [['bench-press', 3, '6–8', 120], ['barbell-row', 3, '6–8', 120], ['overhead-press', 3, '8–10', 90], ['lat-pulldown', 3, '8–10', 90], ['lateral-raise', 2, '12–15', 60]]),
  routine('lower', 'Lower Body', '#a2e5d5', [['back-squat', 4, '5–8', 150], ['romanian-deadlift', 4, '6–10', 120], ['bulgarian-split', 3, '8–10', 90], ['leg-curl', 3, '10–15', 75], ['calf-raise', 3, '12–15', 60]]),
  routine('full', 'Full Body', '#ff856b', [['goblet-squat', 3, '8–12', 90], ['bench-press', 3, '6–10', 120], ['seated-row', 3, '8–12', 90], ['romanian-deadlift', 3, '8–10', 120], ['plank', 3, '30–60s', 60]]),
];

const historySession = (
  id: string,
  routineId: string,
  name: string,
  days: number,
  exercises: Array<[string, Array<[number, number]>]>,
): WorkoutSession => {
  const startedAt = daysAgo(days);
  const finishedAt = new Date(new Date(startedAt).getTime() + 62 * 60 * 1000).toISOString();
  return {
    id, routineId, name, startedAt, finishedAt, elapsedBeforePause: 0, note: '',
    exercises: exercises.map(([exerciseId, sets]) => ({
      exerciseId,
      sets: sets.map(([weight, reps], index) => ({ id: `${id}-${exerciseId}-${index}`, type: 'normal', weight, reps, rpe: 8, completed: true })),
    })),
  };
};

export const seedState: AppState = {
  profile: {
    name: 'Alex', goal: 'Build muscle', experience: 'Intermediate', unit: 'kg', distanceUnit: 'km',
    weeklyTarget: 4, theme: 'dark', reducedMotion: false, reminders: true,
  },
  routines: starterRoutines,
  customExercises: [],
  schedule: { Mon: 'push', Tue: null, Wed: 'pull', Thu: null, Fri: 'legs', Sat: 'full', Sun: null },
  history: [
    historySession('h1', 'pull', 'Pull', 2, [['pull-up', [[0, 9], [0, 8], [0, 7]]], ['barbell-row', [[72.5, 8], [72.5, 8], [70, 9]]], ['lat-pulldown', [[65, 10], [65, 9], [60, 11]]]]),
    historySession('h2', 'push', 'Push', 4, [['bench-press', [[80, 8], [80, 7], [77.5, 9]]], ['incline-db', [[28, 10], [28, 9], [26, 11]]], ['overhead-press', [[45, 8], [45, 7], [42.5, 9]]]]),
    historySession('h3', 'legs', 'Legs', 7, [['back-squat', [[105, 6], [105, 6], [100, 8]]], ['romanian-deadlift', [[90, 9], [90, 8], [85, 10]]], ['leg-press', [[180, 10], [180, 10], [170, 12]]]]),
    historySession('h4', 'upper', 'Upper Body', 10, [['bench-press', [[77.5, 8], [77.5, 8], [75, 9]]], ['barbell-row', [[70, 8], [70, 8], [67.5, 10]]], ['overhead-press', [[42.5, 8], [42.5, 8], [40, 10]]]]),
    historySession('h5', 'lower', 'Lower Body', 14, [['back-squat', [[100, 7], [100, 7], [95, 9]]], ['romanian-deadlift', [[87.5, 8], [87.5, 8], [82.5, 10]]]]),
  ],
  activeWorkout: null,
  bodyweight: [
    { id: 'bw1', date: daysAgo(28, 8), weight: 78.8 },
    { id: 'bw2', date: daysAgo(21, 8), weight: 79.1 },
    { id: 'bw3', date: daysAgo(14, 8), weight: 79.4 },
    { id: 'bw4', date: daysAgo(7, 8), weight: 79.7 },
    { id: 'bw5', date: daysAgo(0, 8), weight: 79.5 },
  ],
  photos: [],
  steps: 6842,
};
