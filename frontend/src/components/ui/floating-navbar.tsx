import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface NavItem {
  name: string;
  link: string;
  icon?: React.ReactNode;
}

interface FloatingNavProps {
  navItems: NavItem[];
  brand?: React.ReactNode;
  cta?: React.ReactNode;
  className?: string;
}

export const FloatingNav = ({
  navItems,
  brand,
  cta,
  className,
}: FloatingNavProps) => {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(true);
  const location = useLocation();

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - scrollYProgress.getPrevious()!;
      if (scrollYProgress.get() < 0.05) {
        setVisible(true);
      } else {
        setVisible(direction < 0);
      }
    }
  });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ y: visible ? 0 : -120, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn("fixed z-[5000]", className)}
        style={{
          top: 0,
          left: 0,
          right: 0,
          width: "100%",
          transform: "none",
          padding: "0 24px",
          borderRadius: 0,
          backgroundColor: "rgba(251, 249, 246, 0.95)",
          backdropFilter: "blur(20px)",
          border: "none",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          height: "60px",
          gap: 0,
        }}
      >
        {/* Brand – left */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {brand}
        </div>

        {/* Nav links – center */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "4px" }}>
          {navItems.map((navItem, idx) => {
            const isActive = location.pathname === navItem.link;
            return (
              <Link
                key={`nav-${idx}`}
                to={navItem.link}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  color: isActive ? "var(--text)" : "var(--text-secondary)",
                  backgroundColor: isActive ? "var(--surface-tertiary)" : "transparent",
                  border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)";
                    e.currentTarget.style.color = "var(--text)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                {navItem.name}
              </Link>
            );
          })}
        </div>

        {/* CTA – right */}
        {cta && (
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {cta}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
