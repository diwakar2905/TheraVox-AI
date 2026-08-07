import { Link } from 'react-router-dom';

export default function FloatingWellness() {
  return (
    <Link
      to="/wellness"
      className="floating-wellness"
      title="Open Your Wellness Sanctuary"
    >
      <span className="floating-wellness__icon">✨</span>
    </Link>
  );
}
