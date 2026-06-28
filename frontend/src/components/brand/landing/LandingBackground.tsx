"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * LandingBackground — fixed ambient layer behind the whole page. Keeps the
 * original floating orbs + grid + vignette and adds a drifting gradient-mesh
 * for depth (the "dial it up" pass). All within the warm palette.
 */
export function LandingBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Drifting gradient mesh — adds depth without new hues. */}
      <div
        className={`absolute left-1/2 top-[-10%] h-[60rem] w-[60rem] -translate-x-1/2 rounded-full opacity-70 blur-[120px] ${
          reduce ? "" : "animate-mesh-drift"
        }`}
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,204,51,0.30), transparent 70%), radial-gradient(closest-side at 70% 40%, rgba(124,58,237,0.22), transparent 70%), radial-gradient(closest-side at 30% 60%, rgba(25,198,163,0.22), transparent 70%)",
        }}
      />

      {reduce ? (
        <>
          <div className="absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-ember/30 blur-[90px]" />
          <div className="absolute right-[-10rem] top-20 h-[36rem] w-[36rem] rounded-full bg-violet/25 blur-[110px]" />
          <div className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-teal/25 blur-[100px]" />
        </>
      ) : (
        <>
          <motion.div
            animate={{ x: [0, 80, 10, 0], y: [0, 30, 90, 0], scale: [1, 1.08, 0.96, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-ember/30 blur-[90px]"
          />
          <motion.div
            animate={{ x: [0, -60, -20, 0], y: [0, 80, 20, 0], scale: [1, 0.95, 1.08, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-[-10rem] top-20 h-[36rem] w-[36rem] rounded-full bg-violet/25 blur-[110px]"
          />
          <motion.div
            animate={{ x: [0, 45, -30, 0], y: [0, -70, -20, 0], scale: [1, 1.12, 0.98, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-teal/25 blur-[100px]"
          />
        </>
      )}

      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,17,15,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(20,17,15,0.055)_1px,transparent_1px)] bg-[size:38px_38px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(245,239,227,0.86)_68%)]" />
    </div>
  );
}
