export function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { score: 0, label: '',            color: 'var(--border)' },
    { score: 1, label: 'Weak',        color: '#EF4444' },
    { score: 2, label: 'Fair',        color: '#F97316' },
    { score: 3, label: 'Good',        color: '#EAB308' },
    { score: 4, label: 'Strong',      color: '#10B981' },
    { score: 5, label: 'Very strong', color: '#059669' },
  ];
  return levels[score] ?? levels[5];
}
