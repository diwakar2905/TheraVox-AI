import { motion } from 'framer-motion';
import BlobBackground from './BlobBackground';

interface HeroSectionProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  hasBlobs?: boolean;
}

export default function HeroSection({
  title,
  subtitle,
  children,
  hasBlobs = true,
}: HeroSectionProps) {
  return (
    <section className={`hero ${hasBlobs ? 'has-hero-logo' : ''}`}>
      {hasBlobs && <BlobBackground />}
      <div className="hero__content">
        {title && (
          <motion.h1
            className="hero__title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {title}
          </motion.h1>
        )}
        {subtitle && (
          <motion.p
            className="hero__subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {subtitle}
          </motion.p>
        )}
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
}
