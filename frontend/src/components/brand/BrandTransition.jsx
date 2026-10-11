import GnanexLogo from './GnanexLogo';
import SkilloraLogo from './SkilloraLogo';

/**
 * BrandTransition Component
 * 
 * Reusable component representing the relationship:
 * GNANEX ("the organization behind the product")
 *   ↓
 * SkillOra ("the product that helps you grow")
 * 
 * Used for brand presentations, transition banners, and explanatory relationships.
 */
export function BrandTransition({
  compact = false,
  showTagline = true,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`brand-transition-card ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: compact ? '20px 24px' : '32px 36px',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--brand-blue-500) 0%, transparent 70%)',
          filter: 'blur(60px)',
          opacity: 0.12,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: compact ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? '16px' : '28px',
          width: '100%',
        }}
      >
        {/* Supporting Organization Brand */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            opacity: 0.85,
            transition: 'opacity var(--duration-normal)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            Supporting Organization
          </span>
          <GnanexLogo size="sm" />
        </div>

        {/* Transition Arrow / Connector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-cyan-500)',
            opacity: 0.7,
            padding: '4px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: compact ? 'rotate(90deg)' : 'none',
            }}
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>

        {/* Primary Product Brand */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--primary-accent)',
            }}
          >
            Primary Product
          </span>
          <SkilloraLogo
            variant="full"
            orientation="horizontal"
            size="sm"
            withTagline={false}
          />
        </div>
      </div>

      {showTagline && (
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontFamily: 'var(--font-display)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Set</span>
          <span style={{ color: 'var(--brand-cyan-500)' }}>•</span>
          <span>Plan</span>
          <span style={{ color: 'var(--brand-cyan-500)' }}>•</span>
          <span>Act</span>
          <span style={{ color: 'var(--brand-cyan-500)' }}>•</span>
          <span>Track</span>
          <span style={{ color: 'var(--brand-mint-400)' }}>•</span>
          <span style={{ color: 'var(--brand-mint-400)' }}>Grow</span>
        </div>
      )}
    </div>
  );
}

export default BrandTransition;
