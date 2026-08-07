import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p className="footer__text">
          Developed by Team 226 <span aria-hidden="true">•</span> © {currentYear}
        </p>
        <div className="footer__links">
          <Link to="/developers" className="footer__link">Developers</Link>
        </div>
      </div>
    </footer>
  );
}
