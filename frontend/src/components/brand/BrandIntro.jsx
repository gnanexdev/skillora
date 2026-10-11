import { useState, useEffect, useRef, useCallback } from 'react';
import GnanexLogo from './GnanexLogo';
import SkilloraLogo from './SkilloraLogo';
import './BrandIntro.css';

/**
 * BrandIntro Component
 * 
 * Opening Sequence:
 * PHASE 1 — INTRO: Clean theme background, GNANEX logo appears smoothly.
 * PHASE 2 — GNANEX BRAND: [EXISTING GNANEX LOGO] + Organized by GNANEX (remains stable briefly).
 * PHASE 3 — TRANSITION: GNANEX logo gently reduces visual emphasis; SkillOra becomes focus.
 * PHASE 4 — SKILLORA: SkillOra logo + wordmark + "Set. Plan. Act. Track. Grow."
 * PHASE 5 — LANDING PAGE: Splash smoothly dissolves directly into SkillOra landing page.
 * 
 * Target total duration: ~2.8 seconds.
 */
export function BrandIntro({ onComplete, autoStart = true }) {
  const [phase, setPhase] = useState('phase1_intro');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const timersRef = useRef([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const completeIntro = useCallback(() => {
    clearAllTimers();
    setIsFadingOut(true);
    const fadeTimer = setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, 450);
    timersRef.current.push(fadeTimer);
  }, [clearAllTimers, onComplete]);

  useEffect(() => {
    if (!autoStart) return;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const quickTimer = setTimeout(() => {
        completeIntro();
      }, 400);
      timersRef.current.push(quickTimer);
      return () => clearAllTimers();
    }

    // Phase 1 -> Phase 2: GNANEX Stable (~750ms)
    const t1 = setTimeout(() => {
      setPhase('phase2_brand');
    }, 750);

    // Phase 2 -> Phase 3: Transition start (~1500ms)
    const t2 = setTimeout(() => {
      setPhase('phase3_transition');
    }, 1500);

    // Phase 3 -> Phase 4: SkillOra Focus (~1900ms)
    const t3 = setTimeout(() => {
      setPhase('phase4_skillora');
    }, 1900);

    // Phase 4 -> Phase 5: Fade-out to Landing Page (~2800ms)
    const t4 = setTimeout(() => {
      completeIntro();
    }, 2800);

    timersRef.current = [t1, t2, t3, t4];

    return () => clearAllTimers();
  }, [autoStart, clearAllTimers, completeIntro]);

  if (phase === 'done') {
    return null;
  }

  const isGnanexActive = phase === 'phase1_intro' || phase === 'phase2_brand';
  const isTransitioning = phase === 'phase3_transition';
  const isSkilloraActive = phase === 'phase4_skillora';

  return (
    <div
      className={`brand-intro-overlay ${isFadingOut ? 'fade-out' : ''}`}
      role="dialog"
      aria-label="Brand introduction"
    >
      {/* Dynamic Ambient Glow */}
      <div
        className={`brand-intro-ambient ${
          isSkilloraActive ? 'skillora-glow' : 'gnanex-glow'
        }`}
      />

      <div className="brand-intro-stage">
        {/* GNANEX BRAND PRESENTATION (Phase 1 & 2 & Exit) */}
        {(isGnanexActive || isTransitioning) && (
          <div
            className={`intro-gnanex-section ${
              phase === 'phase1_intro'
                ? 'phase-enter'
                : phase === 'phase2_brand'
                ? 'phase-stable'
                : 'phase-exit'
            }`}
          >
            <GnanexLogo size="lg" />
            <div className="intro-gnanex-badge">
              Organized by GNANEX
            </div>
          </div>
        )}

        {/* SKILLORA BRAND PRESENTATION (Phase 3 & 4) */}
        {(isTransitioning || isSkilloraActive) && (
          <div
            className={`intro-skillora-section ${
              isSkilloraActive ? 'phase-enter' : ''
            }`}
          >
            <SkilloraLogo
              variant="full"
              orientation="vertical"
              size="lg"
            />
            <div className="intro-skillora-tagline">
              <span className="tagline-word">Set</span>
              <span className="tagline-bullet">•</span>
              <span className="tagline-word">Plan</span>
              <span className="tagline-bullet">•</span>
              <span className="tagline-word">Act</span>
              <span className="tagline-bullet">•</span>
              <span className="tagline-word">Track</span>
              <span className="tagline-bullet">•</span>
              <span className="tagline-word">Grow</span>
            </div>
          </div>
        )}
      </div>

      {/* Skip Button for User Control */}
      <button
        type="button"
        className="intro-skip-btn"
        onClick={completeIntro}
        aria-label="Skip brand intro"
      >
        Skip Intro
      </button>
    </div>
  );
}

export default BrandIntro;
