import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CrisisAlertBanner, { CrisisData } from '../CrisisAlertBanner';

describe('CrisisAlertBanner', () => {
  const mockCrisis: CrisisData = {
    flagged: true,
    severity: 'high',
    signals: [{ phrase: 'suicide', category: 'self-harm', severity: 'high' }],
    recommended_action: 'Please contact emergency helpline immediately',
    crisis_resources: [
      { name: '988 Lifeline', phone: '988', description: 'Crisis helpline', region: 'US' },
    ],
  };

  it('renders crisis warning when flagged is true', () => {
    render(<CrisisAlertBanner crisis={mockCrisis} />);
    expect(screen.getByText('Immediate Support Available')).toBeInTheDocument();
    expect(screen.getByText('988 Lifeline')).toBeInTheDocument();
  });
});
