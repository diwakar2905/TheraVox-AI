import type { WellnessState } from '../hooks/useWellnessStore';

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
}

function section(title: string, headers: string[], rows: unknown[][]): string {
  return [`# ${title}`, headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(',')), ''].join('\n');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Download the user's local wellness data as a multi-section CSV file. */
export function exportWellnessData(state: WellnessState, email?: string | null): void {
  const now = new Date().toISOString();
  const csv = [
    section('Summary', ['Metric', 'Value'], [
      ['Export Date', formatDate(now)],
      ['Account Email', email ?? ''],
      ['Mood Logs', state.moodLogs.length],
      ['Journal Entries', state.journalEntries.length],
      ['Gratitude Entries', state.gratitude.length],
      ['Breathing Minutes (Total)', state.breathingMinutes],
      ['Current Streak (Days)', state.streak.count],
    ]),
    section('Mood Logs', ['Date', 'Mood', 'Emoji'], state.moodLogs.map((m) => [formatDate(m.timestamp), m.mood, m.emoji])),
    section(
      'Journal Entries',
      ['Date', 'Type', 'Title', 'Content', 'Tags'],
      state.journalEntries.map((j) => [formatDate(j.createdAt), j.type, j.title ?? '', j.content, (j.tags ?? []).join('; ')]),
    ),
    section('Gratitude Entries', ['Date', 'Entry'], state.gratitude.map((g) => [formatDate(g.timestamp), g.text])),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `theravox-wellness-${now.split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
