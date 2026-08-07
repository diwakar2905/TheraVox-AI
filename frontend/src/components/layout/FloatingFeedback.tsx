import { Link } from 'react-router-dom';

export default function FloatingFeedback() {
  return (
    <Link to="/feedback" className="floating-feedback" title="Share your feedback">
      Feedback
    </Link>
  );
}
