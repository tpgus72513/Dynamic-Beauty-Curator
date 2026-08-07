/* eslint-disable */
import { IconDust, IconSun, IconDrop } from './icons';
// src/korea-map.jsx — South Korea map with shared-vertex tessellation
// All adjacent regions share EXACT coordinates on their boundaries,
// guaranteeing zero gaps. Sharp miter joins (no rounded corners).

// ─── Shared vertex graph ──────────────────────────────────
// Outer coast points (clockwise from NW). Coastal triple-points
// where 3 regions meet are flagged in comments.
// Inner shared points labeled A–G below.
//
//   A = Seoul-Chungnam-Chungbuk triple        (130, 100)
//   B = Seoul-Gangwon-Chungbuk triple         (170, 100)
//   C = Gangwon-Chungbuk-Gyeongbuk triple     (200, 135)
//   D = Chungbuk-Gyeongbuk-Jeonbuk triple     (185, 195)
//   E = Chungbuk-Chungnam-Jeonbuk triple      (115, 170)
//   F = Gyeongbuk-Gyeongnam-Jeonbuk triple    (190, 230)
//   G = Gyeongnam-Jeonbuk-Jeonnam triple      (155, 235)
//
// Coastal triple-points:
//   N3 = (165, 30)   Seoul-Gangwon coast
//   E3 = (276, 140)  Gangwon-Gyeongbuk coast
//   E6 = (278, 250)  Gyeongbuk-Gyeongnam coast
//   S3 = (160, 308)  Gyeongnam-Jeonnam coast
//   W2 = (32, 232)   Jeonnam-Jeonbuk coast
//   W5 = (50, 178)   Jeonbuk-Chungnam coast
//   W11 = (48, 90)   Chungnam-Seoul coast

const KOREA_REGIONS = [
  // 수도권 (서울·인천·경기) — NW corner
  { id: 'seoul', name: '수도권', short: '수도', pm25: 87, uv: 6, water: 'mid',
    pin: { x: 130, y: 68 },
    path: 'M 62 38 L 78 36 L 95 34 L 115 31 L 130 30 L 148 30 L 165 30 L 170 100 L 130 100 L 48 90 L 55 75 L 60 55 Z' },

  // 강원 — NE block
  { id: 'gangwon', name: '강원', short: '강원', pm25: 32, uv: 5, water: 'good',
    pin: { x: 222, y: 80 },
    path: 'M 165 30 L 180 30 L 200 30 L 222 31 L 245 32 L 252 45 L 260 60 L 265 80 L 270 100 L 273 120 L 276 140 L 200 135 L 170 100 Z' },

  // 충남 — west coast with Taean peninsula zigzag
  { id: 'chungnam', name: '충남', short: '충남', pm25: 70, uv: 6, water: 'mid',
    pin: { x: 85, y: 132 },
    path: 'M 48 90 L 130 100 L 115 170 L 50 178 L 47 168 L 44 156 L 40 145 L 34 138 L 30 132 L 40 128 L 36 122 L 28 120 L 34 114 L 38 110 L 45 105 L 50 100 Z' },

  // 충북·세종 — small inland heart
  { id: 'chungbuk', name: '충북·세종', short: '충북', pm25: 78, uv: 6, water: 'mid',
    pin: { x: 158, y: 148 },
    path: 'M 130 100 L 170 100 L 200 135 L 185 195 L 115 170 Z' },

  // 경북 — large east block
  { id: 'gyeongbuk', name: '경북', short: '경북', pm25: 52, uv: 6, water: 'good',
    pin: { x: 240, y: 188 },
    path: 'M 200 135 L 276 140 L 280 155 L 285 170 L 286 180 L 289 200 L 290 220 L 286 235 L 278 250 L 190 230 L 185 195 Z' },

  // 전북 — west-center
  { id: 'jeonbuk', name: '전북', short: '전북', pm25: 58, uv: 7, water: 'mid',
    pin: { x: 115, y: 202 },
    path: 'M 115 170 L 185 195 L 190 230 L 155 235 L 32 232 L 36 222 L 38 215 L 44 208 L 48 200 L 50 178 Z' },

  // 전남 — SW with jagged coast & island-laced south
  { id: 'jeonnam', name: '전남', short: '전남', pm25: 44, uv: 7, water: 'good',
    pin: { x: 95, y: 278 },
    path: 'M 32 232 L 155 235 L 160 308 L 148 314 L 135 318 L 122 322 L 108 322 L 95 320 L 80 320 L 68 314 L 55 305 L 45 296 L 38 286 L 35 275 L 30 260 L 28 245 Z' },

  // 경남 — SE with Busan curve
  { id: 'gyeongnam', name: '경남', short: '경남', pm25: 48, uv: 7, water: 'good',
    pin: { x: 210, y: 270 },
    path: 'M 190 230 L 278 250 L 268 268 L 258 280 L 250 295 L 245 305 L 230 312 L 215 318 L 200 320 L 185 320 L 172 314 L 160 308 L 155 235 Z' },

  // 제주
  { id: 'jeju', name: '제주', short: '제주', pm25: 22, uv: 8, water: 'good',
    pin: { x: 100, y: 396 },
    path: 'M 58 388 L 72 376 L 92 374 L 116 374 L 134 380 L 144 390 L 142 400 L 134 408 L 116 412 L 92 412 L 72 408 L 60 400 Z' },
];

// Small surrounding islands (decorative, non-interactive)
const KOREA_ISLANDS = [
  // 울릉도 / 독도
  { id: 'ulleung',  cx: 285, cy: 132, r: 3.2 },
  { id: 'dokdo',    cx: 294, cy: 128, r: 1.4 },
  // 남해안 군도
  { id: 'wando',    cx: 90,  cy: 326, r: 2.4 },
  { id: 'jindo',    cx: 68,  cy: 318, r: 3.0 },
  { id: 'isl-sw1',  cx: 38,  cy: 296, r: 1.8 },
  { id: 'isl-sw2',  cx: 50,  cy: 308, r: 1.6 },
  { id: 'isl-sw3',  cx: 24,  cy: 274, r: 1.5 },
  // 서해안
  { id: 'ganghwa',  cx: 60,  cy: 60,  r: 3.5 },   // 강화도
  { id: 'isl-w1',   cx: 48,  cy: 78,  r: 1.6 },
  { id: 'isl-w2',   cx: 38,  cy: 102, r: 1.4 },
  { id: 'isl-w3',   cx: 22,  cy: 122, r: 1.8 },
  // 제주 부근
  { id: 'isl-jeju1',cx: 154, cy: 408, r: 1.4 },
  { id: 'isl-jeju2',cx: 168, cy: 388, r: 1.0 },
];

// ─── Layer config ─────────────────────────────────────────
const LAYERS = {
  pm25: {
    id: 'pm25', label: '미세먼지', shortLabel: 'PM2.5', unit: '㎍/㎥',
    icon: (s) => <IconDust size={s} />,
    levelOf: (v) => v >= 76 ? 3 : v >= 36 ? 2 : v >= 16 ? 1 : 0,
    levelLabel: ['좋음', '보통', '나쁨', '매우나쁨'],
    valueOf: (r) => r.pm25,
    formatValue: (v) => `${v}`,
    // sage → warm beige → coral → muted terracotta (no harsh red)
    hueRamp: [150, 105, 55, 30],
    chroma: [0.04, 0.05, 0.08, 0.11],
  },
  uv: {
    id: 'uv', label: '자외선', shortLabel: 'UVI', unit: 'UVI',
    icon: (s) => <IconSun size={s} />,
    levelOf: (v) => v >= 8 ? 3 : v >= 6 ? 2 : v >= 3 ? 1 : 0,
    levelLabel: ['낮음', '보통', '높음', '매우높음'],
    valueOf: (r) => r.uv,
    formatValue: (v) => `${v}`,
    hueRamp: [150, 105, 60, 32],
    chroma: [0.04, 0.05, 0.09, 0.12],
  },
  water: {
    id: 'water', label: '수질', shortLabel: '수질', unit: '',
    icon: (s) => <IconDrop size={s} />,
    levelOf: (v) => v === 'good' ? 0 : v === 'mid' ? 2 : 3,
    levelLabel: ['양호', '관찰', '주의', '경계'],
    valueOf: (r) => r.water,
    formatValue: (v) => v === 'good' ? '양호' : v === 'mid' ? '주의' : '경계',
    hueRamp: [150, 105, 65, 35],
    chroma: [0.04, 0.05, 0.08, 0.11],
  },
};

// ─── Color generator ──────────────────────────────────────
// Sage-anchored palette: good→muted sage, mid→warm beige,
// bad→warm coral, vbad→muted terracotta (never harsh red).
function colorForLevel(layer, level, selected) {
  const hue = layer.hueRamp[level];
  const chroma = layer.chroma[level];
  const light = selected ? 0.66 : [0.93, 0.89, 0.84, 0.76][level];
  return `oklch(${light} ${chroma} ${hue})`;
}

// ─── Map component ────────────────────────────────────────
function KoreaMap({ activeLayer, selectedRegion, onSelectRegion, currentLocation, regionOverrides = {}, height = 400 }) {
  const layer = LAYERS[activeLayer];
  return (
    <svg viewBox="0 0 300 440" width="100%" height={height} preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="전국 환경 데모 지도" style={{ display: 'block' }}>
      <defs>
        <radialGradient id="bg-sea" cx="50%" cy="40%" r="80%">
          <stop offset="0%" stopColor="oklch(0.985 0.005 90)"/>
          <stop offset="100%" stopColor="oklch(0.965 0.008 150)"/>
        </radialGradient>
        <pattern id="sea-wave" patternUnits="userSpaceOnUse" width="14" height="14">
          <path d="M 0 7 Q 3.5 4, 7 7 T 14 7" stroke="oklch(0.92 0.014 150)" strokeWidth="0.5" fill="none"/>
        </pattern>
      </defs>

      {/* sea background */}
      <rect width="300" height="440" fill="url(#bg-sea)"/>
      <rect width="300" height="440" fill="url(#sea-wave)" opacity="0.3"/>

      {/* land regions — exact-share coords, no overlap, sharp miter joins */}
      <g>
        {KOREA_REGIONS.map(r => {
          const interactive = typeof onSelectRegion === 'function';
          const values = { ...r, ...(regionOverrides[r.id] || {}) };
          const v = layer.valueOf(values);
          const lvl = layer.levelOf(v);
          const sel = selectedRegion === r.id;
          const fill = colorForLevel(layer, lvl, sel);
          return (
            <path key={r.id} d={r.path} fill={fill}
              shapeRendering="geometricPrecision"
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${r.name} 데모 환경 선택` : undefined}
              style={{
                cursor: interactive ? 'pointer' : 'default',
                transition: 'fill 320ms',
              }}
              onClick={interactive ? () => onSelectRegion(r.id) : undefined}
              onKeyDown={interactive ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectRegion(r.id);
                }
              } : undefined}/>
          );
        })}

        {/* internal boundary strokes (thin, on top of fills) */}
        {KOREA_REGIONS.map(r => (
          <path key={`b-${r.id}`} d={r.path} fill="none"
            stroke="rgba(80,72,56,0.22)" strokeWidth="0.6"
            shapeRendering="geometricPrecision"
            pointerEvents="none"/>
        ))}

        {/* selected region — highlighted outline */}
        {selectedRegion && (() => {
          const r = KOREA_REGIONS.find(x => x.id === selectedRegion);
          if (!r) return null;
          return (
            <path d={r.path} fill="none"
              stroke="oklch(0.28 0.05 150)" strokeWidth="2"
              shapeRendering="geometricPrecision"
              pointerEvents="none"/>
          );
        })()}

        {/* decorative small islands */}
        {KOREA_ISLANDS.map(isl => (
          <circle key={isl.id} cx={isl.cx} cy={isl.cy} r={isl.r}
            fill="oklch(0.84 0.05 90)"
            stroke="rgba(40,32,20,0.35)" strokeWidth="0.5"/>
        ))}
      </g>

      {/* region labels */}
      <g style={{ pointerEvents: 'none' }}>
        {KOREA_REGIONS.map(r => {
          const sel = selectedRegion === r.id;
          return (
            <text key={r.id} x={r.pin.x} y={r.pin.y + 3}
              textAnchor="middle"
              fontFamily="'Pretendard', sans-serif"
              fontSize={r.id === 'jeju' ? 10 : 11.5}
              fontWeight={sel ? 700 : 600}
              fill={sel ? '#fff' : 'oklch(0.30 0.01 90)'}
              style={{ transition: 'fill 200ms' }}>
              {r.short}
            </text>
          );
        })}
      </g>

      {/* selected region value badge */}
      {selectedRegion && (() => {
        const r = KOREA_REGIONS.find(x => x.id === selectedRegion);
        if (!r) return null;
        const v = layer.valueOf(r);
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={r.pin.x - 28} y={r.pin.y + 10} width="56" height="18" rx="9"
              fill="#fff" stroke="oklch(0.30 0.04 150)" strokeWidth="1"/>
            <text x={r.pin.x} y={r.pin.y + 22} textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace" fontSize="10" fontWeight="700"
              fill="oklch(0.22 0.01 90)">
              {layer.formatValue(v)}
              {layer.unit && <tspan dx="2" fontSize="7" opacity="0.6">{layer.unit}</tspan>}
            </text>
          </g>
        );
      })()}

      {/* current location pin */}
      {currentLocation && (() => {
        const r = KOREA_REGIONS.find(x => x.id === currentLocation);
        if (!r) return null;
        const px = r.pin.x + 14;
        const py = r.pin.y - 16;
        return (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={px} cy={py + 6} r="12" fill="oklch(0.45 0.10 150)" opacity="0.18">
              <animate attributeName="r" values="10;18;10" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.25;0;0.25" dur="2.4s" repeatCount="indefinite"/>
            </circle>
            <ellipse cx={px} cy={py + 16} rx="5" ry="1.5" fill="rgba(0,0,0,0.2)"/>
            <path
              d={`M ${px} ${py - 8} C ${px - 6} ${py - 8}, ${px - 9} ${py - 4}, ${px - 9} ${py + 1}
                  C ${px - 9} ${py + 6}, ${px} ${py + 14}, ${px} ${py + 14}
                  C ${px} ${py + 14}, ${px + 9} ${py + 6}, ${px + 9} ${py + 1}
                  C ${px + 9} ${py - 4}, ${px + 6} ${py - 8}, ${px} ${py - 8} Z`}
              fill="oklch(0.45 0.10 150)" stroke="#fff" strokeWidth="1.5"/>
            <circle cx={px} cy={py + 1} r="3.5" fill="#fff"/>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Legend ──────────────────────────────────────────────
function MapLegend({ activeLayer }) {
  const layer = LAYERS[activeLayer];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 14px',
      background: '#fff',
      border: '1px solid var(--line)',
      borderRadius: 9999,
      boxShadow: 'var(--shadow-1)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.04em' }}>
        {layer.shortLabel}
      </span>
      <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>{layer.levelLabel[0]}</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: 3,
            background: colorForLevel(layer, i, false),
            border: '0.5px solid rgba(0,0,0,0.08)',
          }} title={layer.levelLabel[i]}/>
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 600 }}>{layer.levelLabel[3]}</span>
    </div>
  );
}

export {
  KOREA_REGIONS, KOREA_ISLANDS, LAYERS, KoreaMap, MapLegend, colorForLevel,
};
