# FORM product structure

## Screen flow

1. **Today** gives the athlete a single next action, weekly context, activity totals, streak, and recent records.
2. **Plans** contains editable routines and the weekly schedule. A routine starts a live session with one tap.
3. **Workout** is a focused logger. Exercises are stepped through horizontally; sets capture load, reps, RPE, type, duration, and distance. Completing a set starts the persistent rest timer.
4. **Progress** turns completed sessions into exercise trends, volume, records, muscle balance, history, bodyweight, and local progress photos.
5. **Profile** owns goals, units, accessibility, reminders, appearance, and data portability.

The fixed navigation remains available throughout. An active-session marker and global rest timer make it safe to leave the Workout tab without losing context.

## Data model

`AppState` is the cloud-sync boundary. It contains:

- `profile`: identity, goal, experience, units, theme, accessibility, reminders, and weekly target
- `routines`: ordered routine definitions containing exercise targets
- `customExercises`: user-created exercise definitions
- `schedule`: weekday-to-routine assignments, with `null` representing rest
- `activeWorkout`: the resumable live session, including pause accounting and notes
- `history`: immutable finished sessions that drive records and charts
- `bodyweight` and `photos`: dated progress entries
- `steps`: the current daily activity count

All state is stored in one versioned IndexedDB database. That intentionally narrow repository interface (`loadState`, `saveState`, `clearState`) can later be replaced or supplemented by authenticated cloud sync without rewriting the screens.

## Offline and install model

The web app manifest supplies standalone display metadata and adaptive icons. The service worker pre-caches the shell and uses network-first caching for built assets. IndexedDB writes are debounced and every screen remains usable offline.

## Accessibility

The interface uses native controls, explicit labels, strong focus rings, screen-reader-only helper text, large touch targets, reduced-motion support, high contrast, safe-area padding, and keyboard-dismissible dialogs.
