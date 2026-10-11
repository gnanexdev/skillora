import SkilloraLogo from './SkilloraLogo';
import GnanexLogo from './GnanexLogo';
import BrandTransition from './BrandTransition';
import { useTheme } from '../../context/useTheme';

export function BrandShowcase({ onReplayIntro }) {
  const { theme, toggleTheme } = useTheme();

  const colorTokens = [
    {
      name: 'Primary Electric Blue',
      variable: '--brand-blue-600',
      hex: '#145CDF',
      role: 'Primary action, focused momentum, brand recognition',
    },
    {
      name: 'Vibrant Azure',
      variable: '--brand-blue-500',
      hex: '#147FDF',
      role: 'Symbol gradient, luminous highlights',
    },
    {
      name: 'Progress Cyan',
      variable: '--brand-cyan-500',
      hex: '#0EAFD8',
      role: 'Forward movement, active tracking states',
    },
    {
      name: 'Mint Growth',
      variable: '--brand-mint-400',
      hex: '#17CD90',
      role: 'Dot on i, achievement milestone, rising skill bars',
    },
    {
      name: 'Midnight Navy',
      variable: '--brand-navy-800',
      hex: '#0D2547',
      role: 'Light theme wordmark, primary typography base',
    },
    {
      name: 'GNANEX Tech Blue',
      variable: '--gnanex-blue',
      hex: '#007CFF',
      role: 'Organization brackets & forward slash syntax',
    },
  ];

  return (
    <div className="brand-showcase-container" style={{ padding: '48px 24px 80px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* HERO SECTION */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '64px 20px 72px',
          position: 'relative',
        }}
      >
        {/* Subtle Ambient Background Flare */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--brand-blue-500) 0%, var(--brand-cyan-500) 40%, transparent 70%)',
            filter: 'blur(100px)',
            opacity: theme === 'dark' ? 0.2 : 0.1,
            pointerEvents: 'none',
          }}
        />

        {/* Secondary Brand Badge: Organized by GNANEX */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 18px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '28px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Organized by
          </span>
          <GnanexLogo size="xs" />
        </div>

        {/* Primary Hero Symbol & Wordmark */}
        <div style={{ marginBottom: '24px' }}>
          <SkilloraLogo
            variant="full"
            orientation="vertical"
            size="xl"
          />
        </div>

        {/* Official Tagline Track */}
        <div
          className="brand-tagline-track"
          style={{
            marginBottom: '28px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            fontSize: '1rem',
          }}
        >
          <span className="brand-tagline-step" style={{ color: 'var(--text-primary)' }}>Set</span>
          <span className="brand-tagline-dot" />
          <span className="brand-tagline-step" style={{ color: 'var(--text-primary)' }}>Plan</span>
          <span className="brand-tagline-dot" />
          <span className="brand-tagline-step" style={{ color: 'var(--text-primary)' }}>Act</span>
          <span className="brand-tagline-dot" />
          <span className="brand-tagline-step" style={{ color: 'var(--text-primary)' }}>Track</span>
          <span className="brand-tagline-dot" style={{ background: 'var(--brand-mint-400)' }} />
          <span
            className="brand-tagline-step"
            style={{
              color: 'var(--brand-mint-400)',
              fontWeight: 700,
            }}
          >
            Grow
          </span>
        </div>

        {/* Value Proposition Description */}
        <p
          style={{
            maxWidth: '680px',
            fontSize: '1.125rem',
            lineHeight: 1.65,
            color: 'var(--text-secondary)',
            margin: '0 auto 36px',
          }}
        >
          A refined visual identity built for purposeful skill acquisition, forward momentum, and measurable personal productivity.
        </p>

        {/* Interactive Action Triggers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn-brand-primary"
            onClick={onReplayIntro}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Replay GNANEX Opening Animation</span>
          </button>

          <button
            type="button"
            className="btn-brand-secondary"
            onClick={toggleTheme}
          >
            <span>Switch to {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
          </button>
        </div>
      </section>

      {/* BRAND ARCHITECTURE & RELATIONSHIP */}
      <section style={{ margin: '48px 0 64px' }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
            }}
          >
            Brand Relationship & Architecture
          </h2>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            Clear hierarchy: SkillOra is the product; GNANEX is the supporting creator organization.
          </p>
        </div>

        <BrandTransition />
      </section>

      {/* SKILLORA LOGO SYSTEM (4 VARIANTS) */}
      <section style={{ margin: '64px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <div className="brand-badge" style={{ marginBottom: '12px' }}>
            Brand System
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 10px 0',
            }}
          >
            SkillOra Logo Variations
          </h2>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
              margin: 0,
              maxWidth: '720px',
            }}
          >
            The SkillOra visual mark combines an upward progress ribbon, incremental skill development bars, and forward arrow momentum.
          </p>
        </div>

        {/* Grid of the 4 variations */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Variant 1: Full Logo */}
          <div
            className="gradient-card-border"
            style={{
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '220px',
              textAlign: 'center',
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkilloraLogo variant="full" orientation="horizontal" size="md" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: '16px 0 4px' }}>
                1. Full Logo
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Symbol + Wordmark (Navbar & hero headers)
              </p>
            </div>
          </div>

          {/* Variant 2: Compact Logo */}
          <div
            className="gradient-card-border"
            style={{
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '220px',
              textAlign: 'center',
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkilloraLogo variant="compact" size="lg" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: '16px 0 4px' }}>
                2. Compact Logo
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Symbol only (Collapsed sidebars, avatar badges)
              </p>
            </div>
          </div>

          {/* Variant 3: Wordmark */}
          <div
            className="gradient-card-border"
            style={{
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '220px',
              textAlign: 'center',
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkilloraLogo variant="wordmark" size="lg" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: '16px 0 4px' }}>
                3. Wordmark
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Wordmark with signature mint green 'i' dot
              </p>
            </div>
          </div>

          {/* Variant 4: App Icon / Favicon */}
          <div
            className="gradient-card-border"
            style={{
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '220px',
              textAlign: 'center',
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkilloraLogo variant="icon" size="md" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: '16px 0 4px' }}>
                4. App Icon / Favicon
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                Square squircle container for mobile & favicon
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GNANEX BRAND PRESERVATION & COLOR ADAPTATION */}
      <section style={{ margin: '64px 0' }}>
        <div style={{ marginBottom: '32px' }}>
          <div className="brand-badge" style={{ marginBottom: '12px' }}>
            Organization Brand
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 10px 0',
            }}
          >
            GNANEX Logo Identity & Preservation
          </h2>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
              margin: 0,
              maxWidth: '720px',
            }}
          >
            The original geometry, proportions, and structure of &lt; GNΛNEX /&gt; are strictly preserved. Color treatments are seamlessly adapted for both Light and Dark themes.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Light Theme Adaptation */}
          <div
            style={{
              padding: '36px 28px',
              borderRadius: 'var(--radius-lg)',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#64748B',
              }}
            >
              Light Theme Treatment
            </span>
            <GnanexLogo theme="light" size="lg" withSubtitle={true} subtitle="Organized by GNANEX" />
            <span style={{ fontSize: '0.8125rem', color: '#64748B', textAlign: 'center' }}>
              Deep slate lettering (#0F172A) + High-contrast electric blue brackets (#0070F3)
            </span>
          </div>

          {/* Dark Theme Adaptation */}
          <div
            style={{
              padding: '36px 28px',
              borderRadius: 'var(--radius-lg)',
              background: '#070B14',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#94A3B8',
              }}
            >
              Dark Theme Treatment
            </span>
            <GnanexLogo theme="dark" size="lg" withSubtitle={true} subtitle="Organized by GNANEX" />
            <span style={{ fontSize: '0.8125rem', color: '#94A3B8', textAlign: 'center' }}>
              Pure white lettering (#FFFFFF) + Luminous electric blue brackets (#0084FF)
            </span>
          </div>
        </div>
      </section>

      {/* DESIGN TOKENS & COLOR SYSTEM PALETTE */}
      <section style={{ margin: '64px 0 32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div className="brand-badge brand-badge-mint" style={{ marginBottom: '12px' }}>
            Design System
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 10px 0',
            }}
          >
            Harmonized Color Spectrum & Design Tokens
          </h2>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
              margin: 0,
              maxWidth: '720px',
            }}
          >
            A cohesive color architecture linking GNANEX’s electric blue tech heritage with SkillOra’s forward-moving cyan and achievement mint.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          {colorTokens.map((token) => (
            <div
              key={token.variable}
              className="gradient-card-border"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  height: '64px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: token.hex,
                  boxShadow: `0 4px 12px ${token.hex}33`,
                }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {token.name}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: '2px 0 6px',
                  }}
                >
                  {token.hex}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {token.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default BrandShowcase;
