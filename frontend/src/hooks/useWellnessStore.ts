import { useReducer } from 'react';
import { WellnessStorage } from '../lib/wellnessStorage';
import type {
  JournalEntry,
  MoodLog,
  GratitudeItem,
  Activity,
  Streak,
  HabitsData,
} from '../lib/wellnessStorage';

export interface WellnessState {
  journalEntries: JournalEntry[];
  moodLogs: MoodLog[];
  gratitude: GratitudeItem[];
  activities: Activity[];
  breathingMinutes: number;
  habits: HabitsData;
  streak: Streak;
}

export type WellnessAction =
  | { type: 'ADD_JOURNAL_ENTRY'; payload: Omit<JournalEntry, 'id' | 'createdAt'> }
  | { type: 'DELETE_JOURNAL_ENTRY'; payload: number }
  | { type: 'ADD_MOOD_LOG'; payload: { mood: string; emoji: string } }
  | { type: 'ADD_GRATITUDE'; payload: string }
  | { type: 'ADD_ACTIVITY'; payload: { type: string; description: string } }
  | { type: 'ADD_BREATHING_MINUTES'; payload: number }
  | { type: 'TOGGLE_HABIT'; payload: { habit: string; dayIndex: number } }
  | { type: 'UPDATE_STREAK' };

function wellnessReducer(state: WellnessState, action: WellnessAction): WellnessState {
  switch (action.type) {
    case 'ADD_JOURNAL_ENTRY': {
      WellnessStorage.addJournalEntry(action.payload);
      return {
        ...state,
        journalEntries: WellnessStorage.getJournalEntries(),
      };
    }

    case 'DELETE_JOURNAL_ENTRY': {
      WellnessStorage.deleteJournalEntry(action.payload);
      return {
        ...state,
        journalEntries: WellnessStorage.getJournalEntries(),
      };
    }

    case 'ADD_MOOD_LOG': {
      WellnessStorage.addMoodLog(action.payload.mood, action.payload.emoji);
      WellnessStorage.addActivity('mood', action.payload.mood);
      WellnessStorage.updateStreak();
      return {
        ...state,
        moodLogs: WellnessStorage.getMoodLogs(),
        activities: WellnessStorage.getActivities(),
        streak: WellnessStorage.getStreak(),
      };
    }

    case 'ADD_GRATITUDE': {
      WellnessStorage.addGratitude(action.payload);
      WellnessStorage.addActivity('gratitude', 'Added gratitude entry');
      WellnessStorage.updateStreak();
      return {
        ...state,
        gratitude: WellnessStorage.getGratitude(),
        activities: WellnessStorage.getActivities(),
        streak: WellnessStorage.getStreak(),
      };
    }

    case 'ADD_ACTIVITY': {
      WellnessStorage.addActivity(action.payload.type, action.payload.description);
      WellnessStorage.updateStreak();
      return {
        ...state,
        activities: WellnessStorage.getActivities(),
        streak: WellnessStorage.getStreak(),
      };
    }

    case 'ADD_BREATHING_MINUTES': {
      WellnessStorage.addBreathingMinutes(action.payload);
      WellnessStorage.addActivity('breathing', `${action.payload} min breathing session`);
      WellnessStorage.updateStreak();
      return {
        ...state,
        breathingMinutes: WellnessStorage.getBreathingMinutes(),
        activities: WellnessStorage.getActivities(),
        streak: WellnessStorage.getStreak(),
      };
    }

    case 'TOGGLE_HABIT': {
      WellnessStorage.toggleHabit(action.payload.habit, action.payload.dayIndex);
      WellnessStorage.updateStreak();
      return {
        ...state,
        habits: WellnessStorage.getHabits(),
        streak: WellnessStorage.getStreak(),
      };
    }

    case 'UPDATE_STREAK': {
      WellnessStorage.updateStreak();
      return {
        ...state,
        streak: WellnessStorage.getStreak(),
      };
    }

    default:
      return state;
  }
}

export function useWellnessStore() {
  const [state, dispatch] = useReducer(wellnessReducer, undefined, () => ({
    journalEntries: WellnessStorage.getJournalEntries(),
    moodLogs: WellnessStorage.getMoodLogs(),
    gratitude: WellnessStorage.getGratitude(),
    activities: WellnessStorage.getActivities(),
    breathingMinutes: WellnessStorage.getBreathingMinutes(),
    habits: WellnessStorage.getHabits(),
    streak: WellnessStorage.getStreak(),
  }));

  return { state, dispatch };
}
