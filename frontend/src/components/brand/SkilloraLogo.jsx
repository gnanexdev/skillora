import { useTheme } from '../../context/useTheme';

/**
 * SkilloraLogo Component
 * 
 * Represents: PROGRESS + SKILLS + FORWARD MOVEMENT + ACHIEVEMENT
 * 
 * Variants:
 * 1. 'full'     - Symbol + Wordmark (horizontal or stacked)
 * 2. 'compact'  - Symbol only
 * 3. 'wordmark' - Wordmark only
 * 4. 'icon'     - App icon / Favicon style (symbol with elevated squircle container)
 */
export function SkilloraLogo({
  variant = 'full', // 'full' | 'compact' | 'wordmark' | 'icon'
  orientation = 'horizontal', // 'horizontal' | 'vertical'
  theme: themeProp = 'auto',
  size = 'md',
  height,
  withTagline = false,
  tagline = 'Set. Plan. Act. Track. Grow.',
  className = '',
  style = {},
  onClick,
}) {
  const { theme: currentTheme } = useTheme();
  const effectiveTheme = themeProp === 'auto' ? currentTheme : themeProp;

  // Sizing scale for symbol height
  const sizeMap = {
    xs: { symbol: 24, wordmark: 18, text: 10 },
    sm: { symbol: 32, wordmark: 22, text: 11 },
    md: { symbol: 42, wordmark: 28, text: 12 },
    lg: { symbol: 56, wordmark: 38, text: 14 },
    xl: { symbol: 76, wordmark: 52, text: 16 },
  };

  const currentSizes = sizeMap[size] || sizeMap.md;
  const symbolHeight = height || currentSizes.symbol;
  const wordmarkHeight = Math.round(symbolHeight * 0.65);

  const wordmarkStyle = {
    display: 'inline-block',
    fontFamily: "var(--display-font), 'Manrope', sans-serif",
    fontSize: `${Math.round(wordmarkHeight * 0.94)}px`,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '0',
    whiteSpace: 'nowrap',
    background: 'linear-gradient(110deg, #1764df 0%, #1488d6 48%, #19bb8a 70%, #19bb8a 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };

  // 1. COMPACT / SYMBOL ONLY
  if (variant === 'compact') {
    return (
      <div
        className={`skillora-symbol ${className}`}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <img
          src="/skillora-symbol.png"
          alt="SkillOra Symbol"
          width={Math.round(symbolHeight * (302 / 354))}
          height={symbolHeight}
          loading="eager"
          decoding="async"
          style={{
            height: `${symbolHeight}px`,
            width: 'auto',
            display: 'block',
            objectFit: 'contain',
            filter: effectiveTheme === 'dark'
              ? 'drop-shadow(0 0 16px rgba(20, 127, 223, 0.35))'
              : 'drop-shadow(0 2px 8px rgba(20, 92, 223, 0.12))',
            transition: 'filter 0.3s ease',
          }}
        />
      </div>
    );
  }

  // 2. WORDMARK ONLY
  if (variant === 'wordmark') {
    return (
      <div
        className={`skillora-wordmark ${className}`}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: withTagline ? '6px' : '0px',
          ...style,
        }}
      >
        <span role="img" aria-label="SkillOra" style={wordmarkStyle}>SkillOra</span>
        {withTagline && (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: `${currentSizes.text}px`,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
            }}
          >
            {tagline}
          </span>
        )}
      </div>
    );
  }

  // 3. APP ICON / FAVICON (Symbol inside modern squircle)
  if (variant === 'icon') {
    const iconBoxSize = symbolHeight * 1.35;
    return (
      <div
        className={`skillora-app-icon ${className}`}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${iconBoxSize}px`,
          height: `${iconBoxSize}px`,
          borderRadius: `${Math.round(iconBoxSize * 0.24)}px`,
          background: effectiveTheme === 'dark'
            ? 'linear-gradient(145deg, #111a2e 0%, #080d19 100%)'
            : 'linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)',
          border: `1px solid ${effectiveTheme === 'dark' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(20, 92, 223, 0.12)'}`,
          boxShadow: effectiveTheme === 'dark'
            ? '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 20px rgba(20, 127, 223, 0.25)'
            : '0 8px 20px rgba(20, 92, 223, 0.12), 0 1px 3px rgba(0,0,0,0.05)',
          padding: `${Math.round(iconBoxSize * 0.15)}px`,
          ...style,
        }}
      >
        <img
          src="/skillora-symbol.png"
          alt="SkillOra App Icon"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    );
  }

  // 4. FULL LOGO (Symbol + Wordmark)
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={`skillora-logo-full ${isVertical ? 'orientation-vertical' : 'orientation-horizontal'} ${className}`}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center',
        gap: isVertical ? `${Math.round(symbolHeight * 0.3)}px` : `${Math.round(symbolHeight * 0.32)}px`,
        ...style,
      }}
    >
      {/* Symbol */}
      <img
        src="/skillora-symbol.png"
        alt="SkillOra Symbol"
        width={Math.round(symbolHeight * (302 / 354))}
        height={symbolHeight}
        loading="eager"
        decoding="async"
        style={{
          height: `${symbolHeight}px`,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
          filter: effectiveTheme === 'dark'
            ? 'drop-shadow(0 0 14px rgba(20, 127, 223, 0.35))'
            : 'drop-shadow(0 2px 6px rgba(20, 92, 223, 0.12))',
          transition: 'filter 0.3s ease',
        }}
      />

      {/* Wordmark + optional tagline */}
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: isVertical ? 'center' : 'flex-start',
          gap: withTagline ? '4px' : '0px',
        }}
      >
        <span role="img" aria-label="SkillOra" style={wordmarkStyle}>SkillOra</span>

        {withTagline && (
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: `${Math.max(10, Math.round(wordmarkHeight * 0.38))}px`,
              fontWeight: 600,
              letterSpacing: '0.09em',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              textAlign: isVertical ? 'center' : 'left',
              whiteSpace: 'nowrap',
            }}
          >
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}

export default SkilloraLogo;
