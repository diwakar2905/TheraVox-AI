import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function BlobBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rafIdRef = useRef<number>(0);

  // Transform mouse position to parallax effect
  const blob1X = useTransform(mouseX, [-1, 1], [-3, 3]);
  const blob1Y = useTransform(mouseY, [-1, 1], [-3, 3]);

  const blob2X = useTransform(mouseX, [-1, 1], [-6, 6]);
  const blob2Y = useTransform(mouseY, [-1, 1], [-6, 6]);

  const blob3X = useTransform(mouseX, [-1, 1], [-9, 9]);
  const blob3Y = useTransform(mouseY, [-1, 1], [-9, 9]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Cancel any pending frame before scheduling a new one — caps updates
      // to one per display frame (~60fps) regardless of pointer event rate.
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        mouseX.set(e.clientX / window.innerWidth - 0.5);
        mouseY.set(e.clientY / window.innerHeight - 0.5);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [mouseX, mouseY]);

  return (
    <div className="hero__bg">
      <motion.span className="blob b1" style={{ x: blob1X, y: blob1Y }} />
      <motion.span className="blob b2" style={{ x: blob2X, y: blob2Y }} />
      <motion.span className="blob b3" style={{ x: blob3X, y: blob3Y }} />
    </div>
  );
}
