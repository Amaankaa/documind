"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { PatternMarquee } from "@/components/brand/PatternMarquee";
import { LandingBackground } from "@/components/brand/landing/LandingBackground";
import { LandingNav } from "@/components/brand/landing/LandingNav";
import { Hero } from "@/components/brand/landing/Hero";
import { WhyComparison } from "@/components/brand/landing/WhyComparison";
import { FeatureCards } from "@/components/brand/landing/FeatureCards";
import { MentorDemo } from "@/components/brand/landing/MentorDemo";
import { Workflow } from "@/components/brand/landing/Workflow";
import { Pricing } from "@/components/brand/landing/Pricing";
import { Faq } from "@/components/brand/landing/Faq";
import { OpenSource } from "@/components/brand/landing/OpenSource";
import { FinalCta } from "@/components/brand/landing/FinalCta";
import { Footer } from "@/components/brand/landing/Footer";

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="min-h-screen overflow-hidden bg-canvas text-ink">
      <motion.div
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-[60] h-1.5 origin-left bg-flame"
      />

      <LandingBackground />
      <LandingNav />

      <main className="relative z-10">
        <Hero />

        <section className="mx-auto max-w-7xl px-6 py-10">
          <p className="mb-6 text-center text-xs font-black uppercase tracking-[0.28em] text-ink/45">
            Patterns that show up in big-tech interviews
          </p>
          <PatternMarquee />
        </section>

        <WhyComparison />
        <FeatureCards />
        <MentorDemo />
        <Workflow />
        <Pricing />
        <Faq />
        <OpenSource />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}
