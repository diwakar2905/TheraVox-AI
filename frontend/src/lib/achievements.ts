import type { WellnessState } from '../hooks/useWellnessStore';

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
}

interface AchievementDef extends Omit<Achievement, 'unlocked'> {
  check: (state: WellnessState) => boolean;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_step', emoji: '🌱', title: 'First Step', description: 'Log your first mood check', check: (s) => s.moodLogs.length >= 1 },
  { id: 'breath_fresh_air', emoji: '🌬️', title: 'Breath of Fresh Air', description: 'Complete your first breathing session', check: (s) => s.breathingMinutes >= 1 },
  { id: 'deep_breather', emoji: '💨', title: 'Deep Breather', description: 'Accumulate 60 minutes of breathing', check: (s) => s.breathingMinutes >= 60 },
  { id: 'grateful_heart', emoji: '🙏', title: 'Grateful Heart', description: 'Add your first gratitude entry', check: (s) => s.gratitude.length >= 1 },
  { id: 'journal_start', emoji: '✍️', title: 'Journal Start', description: 'Write your first journal entry', check: (s) => s.journalEntries.length >= 1 },
  { id: 'storyteller', emoji: '📚', title: 'Storyteller', description: 'Write 10 journal entries', check: (s) => s.journalEntries.length >= 10 },
  { id: 'mood_tracker', emoji: '📊', title: 'Mood Tracker', description: 'Log 7 mood entries', check: (s) => s.moodLogs.length >= 7 },
  { id: 'week_warrior', emoji: '🔥', title: 'Week Warrior', description: 'Maintain a 7-day wellness streak', check: (s) => s.streak.count >= 7 },
  { id: 'month_champion', emoji: '⚡', title: 'Month Champion', description: 'Maintain a 30-day wellness streak', check: (s) => s.streak.count >= 30 },
  {
    id: 'wellness_master',
    emoji: '🌟',
    title: 'Wellness Master',
    description: 'Unlock 8 other achievements',
    check: (s) => ACHIEVEMENTS.filter((a) => a.id !== 'wellness_master' && a.check(s)).length >= 8,
  },
];

export function computeAchievements(state: WellnessState): Achievement[] {
  return ACHIEVEMENTS.map(({ check, ...a }) => ({ ...a, unlocked: check(state) }));
}
