import type React from 'react';

type StyleOverride = Record<string, string>;

/**
 * Returns onMouseOver/onMouseOut handlers that imperatively set inline styles,
 * replacing repeated onMouseOver/onMouseOut style mutations across the app.
 *
 * Usage:
 *   const brandHover = useHoverStyle(
 *     { background: 'var(--brand-hover, #8A9ABC)' },
 *     { background: 'var(--brand, #9EACCA)' },
 *   );
 *   <Link {...brandHover} to="/somewhere">Click me</Link>
 */
export function useHoverStyle<T extends HTMLElement = HTMLElement>(
  hoverStyle: Partial<StyleOverride>,
  defaultStyle: Partial<StyleOverride>,
): {
  onMouseOver: React.MouseEventHandler<T>;
  onMouseOut: React.MouseEventHandler<T>;
} {
  return {
    onMouseOver(e) { Object.assign(e.currentTarget.style, hoverStyle); },
    onMouseOut(e) { Object.assign(e.currentTarget.style, defaultStyle); },
  };
}
