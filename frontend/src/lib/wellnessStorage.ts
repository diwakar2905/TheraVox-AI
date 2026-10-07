/**
 * Per-user wellness data persisted in localStorage.
 * Keys are namespaced by user id (`wellness_<id>_<key>`) once setUserId is called.
 */

export interface JournalEntry {
  id: number;
  type: string;
  title?: string;
  content: string;
  mood?: string;
  tags?: string[];
  createdAt: string;
}

export interface MoodLog {
  mood: string;
  emoji: string;
  timestamp: string;
}

export interface GratitudeItem {
  text: string;
  timestamp: string;
}

export interface Activity {
  type: string;
  description: string;
  timestamp: string;
}

export interface Streak {
  count: number;
  lastDate: string;
}

/** week key (e.g. "2026-W40") -> `${habit}_${dayIndex}` -> done */
export type HabitsData = Record<string, Record<string, boolean>>;

let currentUserId: string | null = null;

function prefix(): string {
  return currentUserId ? `wellness_${currentUserId}_` : 'wellness_';
}

export const WellnessStorage = {
  setUserId(userId: string | null) {
    currentUserId = userId;
  },

  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(prefix() + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key: string, value: unknown) {
    try {
      localStorage.setItem(prefix() + key, JSON.stringify(value));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  },

  getJournalEntries(): JournalEntry[] {
    return this.get<JournalEntry[]>('journal', []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  addJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): JournalEntry {
    const entries = this.getJournalEntries();
    const newEntry: JournalEntry = { ...entry, id: Date.now(), createdAt: new Date().toISOString() };
    entries.unshift(newEntry);
    this.set('journal', entries);
    return newEntry;
  },

  deleteJournalEntry(id: number) {
    this.set(
      'journal',
      this.getJournalEntries().filter((e) => e.id !== id),
    );
  },

  getMoodLogs(): MoodLog[] {
    return this.get<MoodLog[]>('moodLogs', []).slice(0, 365);
  },

  addMoodLog(mood: string, emoji: string) {
    const logs = this.getMoodLogs();
    logs.unshift({ mood, emoji, timestamp: new Date().toISOString() });
    this.set('moodLogs', logs.slice(0, 365));
  },

  getGratitude(): GratitudeItem[] {
    return this.get<GratitudeItem[]>('gratitude', []).slice(0, 100);
  },

  addGratitude(text: string) {
    const items = this.getGratitude();
    items.unshift({ text, timestamp: new Date().toISOString() });
    this.set('gratitude', items.slice(0, 100));
  },

  getActivities(): Activity[] {
    return this.get<Activity[]>('activities', []).slice(0, 50);
  },

  addActivity(type: string, description: string) {
    const activities = this.getActivities();
    activities.unshift({ type, description, timestamp: new Date().toISOString() });
    this.set('activities', activities.slice(0, 50));
  },

  getBreathingMinutes(): number {
    return this.get<number>('breathingMinutes', 0) || 0;
  },

  addBreathingMinutes(minutes: number) {
    this.set('breathingMinutes', this.getBreathingMinutes() + minutes);
  },

  getHabits(): HabitsData {
    return this.get<HabitsData>('habits', {}) || {};
  },

  toggleHabit(habit: string, dayIndex: number): boolean {
    const habits = this.getHabits();
    const week = this.getCurrentWeek();
    if (!habits[week]) habits[week] = {};
    const key = `${habit}_${dayIndex}`;
    const done = !habits[week][key];
    habits[week][key] = done;
    this.set('habits', habits);
    return done;
  },

  getStreak(): Streak {
    return this.get<Streak>('streak', { count: 0, lastDate: '' }) || { count: 0, lastDate: '' };
  },

  updateStreak(): number {
    const today = new Date().toISOString().split('T')[0];
    const streak = this.getStreak();
    if (streak.lastDate === today) return streak.count;

    const diffMs = new Date(today).getTime() - new Date(streak.lastDate).getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    let count = streak.count;
    if (diffDays === 1) count = streak.count + 1;
    else if (diffDays > 1 || !streak.lastDate) count = 1;

    this.set('streak', { count, lastDate: today });
    return count;
  },

  getCurrentWeek(): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayMs = 24 * 60 * 60 * 1000;
    const week = Math.ceil((now.getTime() - startOfYear.getTime()) / (7 * dayMs));
    return `${now.getFullYear()}-W${week}`;
  },
};
