import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmotionDisplay from '../EmotionDisplay';

describe('EmotionDisplay', () => {
  it('renders emotion label, emoji, and confidence score', () => {
    render(
      <EmotionDisplay
        emotion="Happy"
        emoji="😄"
        confidence={92}
        description="High confidence joy detected"
        scores={{ happy: 0.92, neutral: 0.08 }}
      />
    );

    expect(screen.getByText('Happy')).toBeInTheDocument();
    expect(screen.getByText('😄')).toBeInTheDocument();
    expect(screen.getByText('High confidence joy detected')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });
});
