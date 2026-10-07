import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CrisisAlertBanner, type CrisisData } from '../CrisisAlertBanner';

describe('CrisisAlertBanner', () => {
  const mockCrisis: CrisisData = {
    flagged: true,
    severity: 'critical',
    signals: [{ phrase: 'suicide', category: 'self-harm', severity: 'critical' }],
    recommended_action: 'Please contact emergency helpline immediately',
    crisis_resources: [
      { name: '988 Lifeline', phone: '988', description: 'Crisis helpline', region: 'US' },
    ],
  };

  it('renders crisis warning and resources when flagged', () => {
    render(<CrisisAlertBanner crisis={mockCrisis} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('CRISIS — Immediate Support Available')).toBeInTheDocument();
    expect(screen.getByText('988 Lifeline')).toBeInTheDocument();
  });
});
