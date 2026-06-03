// src/ui.jsx — UI primitives shared across screens
// Button, Card, Chip, NavTop, BottomCTA, Sheet, ProgressDots, Toggle, Gauge, Stat, Placeholder

import { useId } from 'react';
import { IconChevL, IconStar } from './icons';

// ─── Button ────────────────────────────────────────────────
function Button({ children, onClick, variant = 'primary', size = 'md', icon, iconRight, disabled, fullWidth, style }) {
  const sizes = {
    sm: { h: 36, px: 14, fs: 13, r: 10 },
    md: { h: 48, px: 18, fs: 15, r: 14 },
    lg: { h: 56, px: 22, fs: 16, r: 16 },
    xl: { h: 60, px: 24, fs: 17, r: 18 },
  };
  const s = sizes[size];
  const variants = {
    primary: { bg: 'var(--ink)', fg: '#fff', bd: 'transparent' },
    accent:  { bg: 'var(--accent-strong)', fg: '#fff', bd: 'transparent' },
    soft:    { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)', bd: 'transparent' },
    outline: { bg: 'transparent', fg: 'var(--ink)', bd: 'var(--line-2)' },
    ghost:   { bg: 'transparent', fg: 'var(--ink)', bd: 'transparent' },
    danger:  { bg: 'transparent', fg: 'var(--status-vbad)', bd: 'var(--line-2)' },
  };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        borderRadius: s.r,
        fontSize: s.fs,
        fontWeight: 600,
        letterSpacing: '-0.015em',
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.bd}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined,
        transition: 'transform 120ms, opacity 150ms',
        ...style,
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.985)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {icon}
      <span>{children}</span>
      {iconRight}
    </button>
  );
}

// ─── Card ──────────────────────────────────────────────────
function Card({ children, style, padding = 16, onClick, selected, interactive }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-elev)',
        borderRadius: 'var(--r-lg)',
        padding,
        border: `1px solid ${selected ? 'var(--accent-strong)' : 'var(--line)'}`,
        boxShadow: selected ? '0 0 0 3px var(--accent-soft)' : 'var(--shadow-1)',
        cursor: interactive || onClick ? 'pointer' : 'default',
        transition: 'border-color 150ms, box-shadow 150ms',
        ...style,
      }}
    >{children}</div>
  );
}

// ─── Chip ──────────────────────────────────────────────────
function Chip({ children, selected, onClick, size = 'md', icon }) {
  const sizes = { sm: { h: 28, fs: 12, px: 10 }, md: { h: 36, fs: 13, px: 14 } };
  const s = sizes[size];
  return (
    <button
      onClick={onClick}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        fontSize: s.fs,
        fontWeight: selected ? 600 : 500,
        borderRadius: 9999,
        background: selected ? 'var(--ink)' : 'var(--bg-elev)',
        color: selected ? '#fff' : 'var(--ink-2)',
        border: `1px solid ${selected ? 'var(--ink)' : 'var(--line-2)'}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        letterSpacing: '-0.015em',
        transition: 'all 140ms',
        whiteSpace: 'nowrap',
      }}
    >{icon}{children}</button>
  );
}

// ─── Top nav (in-app, slimmer than starter IOSNavBar) ─────
function NavTop({ title, onBack, right, transparent, sub }) {
  return (
    <div style={{
      paddingTop: 54, // below status bar (status bar reserves ~50)
      paddingBottom: 8,
      paddingLeft: 8,
      paddingRight: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: transparent ? 'transparent' : 'var(--bg)',
      position: 'relative',
      zIndex: 5,
    }}>
      {onBack ? (
        <button onClick={onBack} style={{
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', borderRadius: 9999, color: 'var(--ink)',
        }}>
          <IconChevL size={22} />
        </button>
      ) : <div style={{ width: 40 }} />}
      <div style={{ flex: 1, textAlign: 'center', paddingTop: sub ? 2 : 0 }}>
        {title && <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{title}</div>}
        {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ minWidth: 40, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

// ─── Bottom CTA dock ──────────────────────────────────────
function BottomCTA({ children, style }) {
  return (
    <div style={{
      padding: '14px 20px 30px',
      background: 'linear-gradient(to bottom, transparent, var(--bg) 30%)',
      ...style,
    }}>{children}</div>
  );
}

// ─── Progress dots (step indicator) ───────────────────────
function ProgressDots({ count, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 22 : 6,
          height: 6,
          borderRadius: 9999,
          background: i <= current ? 'var(--ink)' : 'var(--line-2)',
          transition: 'all 240ms',
        }} />
      ))}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 50, height: 30, borderRadius: 9999,
        background: value ? 'var(--accent-strong)' : 'var(--line-2)',
        border: 'none', padding: 2,
        position: 'relative',
        transition: 'background 200ms',
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 9999,
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transform: `translateX(${value ? 20 : 0}px)`,
        transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1)',
      }} />
    </button>
  );
}

// ─── Stat pill (env indicator) ────────────────────────────
function EnvPill({ icon, label, value, level, unit, hint }) {
  const colors = {
    good: { bg: 'oklch(0.96 0.025 150)', fg: 'oklch(0.40 0.08 150)' },
    mid:  { bg: 'oklch(0.96 0.03 85)',  fg: 'oklch(0.42 0.10 65)' },
    bad:  { bg: 'oklch(0.95 0.035 45)',  fg: 'oklch(0.48 0.12 35)' },
    vbad: { bg: 'oklch(0.94 0.04 25)',   fg: 'oklch(0.45 0.16 25)' },
  }[level || 'mid'];
  return (
    <div style={{
      flex: 1,
      padding: '12px 12px',
      borderRadius: 16,
      background: colors.bg,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: colors.fg, opacity: 0.8 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '-0.01em' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'baseline' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: colors.fg, letterSpacing: '-0.03em' }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: colors.fg, opacity: 0.7 }}>{unit}</span>}
      </div>
      {hint && <div style={{ fontSize: 11, color: colors.fg, opacity: 0.75, fontWeight: 600 }}>{hint}</div>}
    </div>
  );
}

// ─── Placeholder image (striped SVG with caption) ─────────
function Placeholder({ width = '100%', height = 120, label = 'image', radius = 12, hue = 90 }) {
  const uid = useId();
  const id = `ph-${uid.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div style={{
      width, height, borderRadius: radius, overflow: 'hidden', position: 'relative',
      background: `oklch(0.96 0.012 ${hue})`,
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="none">
        <defs>
          <pattern id={id} patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="14" stroke={`oklch(0.90 0.018 ${hue})`} strokeWidth="6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: `oklch(0.48 0.018 ${hue})`,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>[ {label} ]</div>
    </div>
  );
}

// ─── Status bar reserve (we use ios-frame's, this just spaces) ──
function StatusBarSpacer() {
  return <div style={{ height: 0 }} />;
}

// ─── Score gauge (radial) ─────────────────────────────────
function ScoreRing({ value, size = 96, stroke = 8, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--accent-strong)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
        {label && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{label}</div>}
      </div>
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────
function StarRow({ value, count, small }) {
  const sz = small ? 12 : 14;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <IconStar size={sz} stroke="var(--warm)" style={{ color: 'var(--warm)' }}/>
      <span style={{ fontSize: small ? 12 : 13, fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
      {count !== undefined && <span style={{ fontSize: small ? 11 : 12, color: 'var(--ink-3)' }}>({count.toLocaleString()})</span>}
    </div>
  );
}

// ─── Section header ──────────────────────────────────────
function SectionHead({ title, sub, right, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '0 20px', marginBottom: 12, ...style,
    }}>
      <div>
        <div className="h-sub">{title}</div>
        {sub && <div className="t-small" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export {
  Button, Card, Chip, NavTop, BottomCTA, ProgressDots,
  Toggle, EnvPill, Placeholder, StatusBarSpacer,
  ScoreRing, StarRow, SectionHead,
};