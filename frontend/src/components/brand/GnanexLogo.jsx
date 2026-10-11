import { useTheme } from '../../context/useTheme';

/**
 * GnanexLogo Component
 * Preserves the exact geometry, proportions, and layout of the authentic GNANEX asset:
 * < GNΛNEX />
 * 
 * Supports light & dark theme color treatment while maintaining 100% brand recognition.
 */
export function GnanexLogo({
  theme: themeProp = 'auto',
  size = 'md',
  height,
  withSubtitle = false,
  subtitle = 'Organized by GNANEX',
  className = '',
  style = {},
  onClick,
}) {
  const { theme: currentTheme } = useTheme();
  const effectiveTheme = themeProp === 'auto' ? currentTheme : themeProp;

  // Height mappings
  const heightMap = {
    xs: 18,
    sm: 22,
    md: 28,
    lg: 38,
    xl: 52,
  };

  const calculatedHeight = height || heightMap[size] || 28;
  // Aspect ratio of the original asset: 355w x 59h (~6.017)
  const calculatedWidth = Math.round(calculatedHeight * (355 / 59));

  // Light vs Dark source PNG asset
  const logoSrc = effectiveTheme === 'light'
    ? '/gnanex-logo-light.png'
    : '/gnanex-logo-dark.png';

  const logo2xSrc = effectiveTheme === 'light'
    ? '/gnanex-logo-light@2x.png'
    : '/gnanex-logo-dark@2x.png';

  return (
    <div
      className={`gnanex-logo-container ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: withSubtitle ? '6px' : '0px',
        ...style,
      }}
    >
      <img
        src={logoSrc}
        srcSet={`${logoSrc} 1x, ${logo2xSrc} 2x`}
        alt="GNANEX"
        width={calculatedWidth}
        height={calculatedHeight}
        loading="eager"
        decoding="async"
        style={{
          height: `${calculatedHeight}px`,
          width: 'auto',
          maxWidth: '100%',
          display: 'block',
          objectFit: 'contain',
          filter: effectiveTheme === 'dark' 
            ? 'drop-shadow(0 0 14px rgba(0, 124, 255, 0.28))' 
            : 'none',
          transition: 'filter 0.3s ease',
        }}
      />
      {withSubtitle && (
        <span
          className="gnanex-subtitle"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: `${Math.max(10, Math.round(calculatedHeight * 0.38))}px`,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            lineHeight: 1.2,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}

export default GnanexLogo;
