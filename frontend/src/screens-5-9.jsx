/* eslint-disable */
// src/screens-5-9.jsx — Analyzing, Result, Recommendations, History, MyPage
import React from 'react';
import { Button, BottomCTA, Card, Chip, NavTop, Placeholder, ScoreRing, SectionHead, StarRow, Toggle } from './ui';
import {
  IconArrowR, IconCheck, IconChevR, IconClose, IconDrop, IconDust, IconEdit, IconFace,
  IconHeart, IconInfo, IconLeaf, IconLocation, IconShield, IconSparkle, IconSun, IconTemp,
} from './icons';
import {
  SKIN_ANALYSIS, AVOID_INGREDIENTS, PRODUCTS, SKIN_TYPES,
  HISTORY, TREND_OVERALL, TREND_HYDRATION, NOTIF_DEFAULTS,
} from './data';
// ═══════════════════════════════════════════════════════════
// 5. ANALYZING — loading w/ steps
// ═══════════════════════════════════════════════════════════
function ScreenAnalyzing({ ctx, nav }) {
  const steps = [
    { id: 0, label: '얼굴 분석 중…', sub: 'AI 모델로 피부 상태 추출', icon: <IconFace size={20}/> },
    { id: 1, label: '환경 데이터 결합 중…', sub: '미세먼지·자외선·수질 호출', icon: <IconLeaf size={20}/> },
    { id: 2, label: '맞춤 제품 찾는 중…', sub: '룰북 + 리뷰 NLP 매칭', icon: <IconSparkle size={20}/> },
  ];
  const [active, setActive] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  // TODO: call /recommend with {lat, lng, skin_type, concerns} here
  React.useEffect(() => {
    const t1 = setTimeout(() => setActive(1), 1200);
    const t2 = setTimeout(() => setActive(2), 2400);
    const t3 = setTimeout(() => {
      // push analysis to history
      const entry = { date: '2026.05.20', day: '오늘', region: ctx.env.region, overall: SKIN_ANALYSIS.overall, pm25: ctx.env.pm25.value, uv: ctx.env.uv.value, top: '시카 진정 크림' };
      ctx.set({ lastAnalysis: SKIN_ANALYSIS });
      nav.go('result');
    }, 3600);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  React.useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p = Math.min(100, p + 2.8);
      setProgress(p);
      if (p >= 100) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="screen anim-fade" style={{
      background: 'linear-gradient(180deg, var(--accent-tint) 0%, var(--bg) 50%, var(--bg) 100%)',
    }}>
      <div style={{ paddingTop: 60 }}/>
      <div className="screen-body" style={{ display: 'flex', flexDirection: 'column', padding: '20px 24px' }}>
        {/* breathing orb */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <div style={{ position: 'relative', width: 200, height: 200 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 9999,
              background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
              animation: 'breathe 2.4s ease-in-out infinite',
            }}/>
            <div style={{
              position: 'absolute', inset: 30, borderRadius: 9999,
              background: 'radial-gradient(circle, var(--accent-strong) 0%, var(--accent-ink) 100%)',
              animation: 'breathe 2.4s ease-in-out infinite 0.3s',
            }}/>
            <svg width="200" height="200" style={{ position: 'absolute', inset: 0, animation: 'spin 14s linear infinite' }}>
              <circle cx="100" cy="100" r="92" fill="none" stroke="var(--accent-strong)" strokeWidth="2"
                strokeDasharray="4 12" opacity="0.5"/>
            </svg>
            <svg width="200" height="200" style={{ position: 'absolute', inset: 0, animation: 'spin 22s linear infinite reverse' }}>
              <circle cx="100" cy="100" r="76" fill="none" stroke="var(--accent-strong)" strokeWidth="1.5"
                strokeDasharray="2 8" opacity="0.3"/>
            </svg>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <div className="t-tiny" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-strong)', letterSpacing: '0.1em' }}>
            DYNAMIC CURATION
          </div>
          <h1 className="h-display" style={{ marginTop: 10, fontSize: 24 }}>
            오늘의 케어를<br/>찾고 있어요
          </h1>
        </div>

        {/* progress bar */}
        <div style={{ marginTop: 32, padding: '0 4px' }}>
          <div style={{ height: 4, background: 'var(--line)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'var(--accent-strong)',
              borderRadius: 9999,
              transition: 'width 100ms linear',
            }}/>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 8,
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)',
          }}>
            <span>{String(Math.floor(progress)).padStart(3,'0')}%</span>
            <span>예상 시간 3초</span>
          </div>
        </div>

        {/* steps */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((s, i) => {
            const state = i < active ? 'done' : i === active ? 'active' : 'pending';
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: state === 'active' ? 'var(--bg-elev)' : 'transparent',
                border: state === 'active' ? '1px solid var(--accent-soft)' : '1px solid transparent',
                boxShadow: state === 'active' ? 'var(--shadow-1)' : 'none',
                opacity: state === 'pending' ? 0.4 : 1,
                transition: 'all 240ms',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: state === 'done' ? 'var(--accent-strong)' : state === 'active' ? 'var(--accent-tint)' : 'var(--bg-sunken)',
                  color: state === 'done' ? '#fff' : state === 'active' ? 'var(--accent-strong)' : 'var(--ink-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {state === 'done' ? <IconCheck size={16} sw={2.5}/> : s.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{s.sub}</div>
                </div>
                {state === 'active' && <LoadingDots/>}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minHeight: 16 }}/>
        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
          <div className="t-small">조치원읍 환경 데이터 · 30분 캐시</div>
        </div>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', paddingRight: 6 }}>
      {[0, 0.2, 0.4].map((d, i) => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: 9999, background: 'var(--accent-strong)',
          animation: `pulseDot 1.2s ease-in-out infinite ${d}s`,
        }}/>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 6. RESULT — skin + env summary
// ═══════════════════════════════════════════════════════════
function ScreenResult({ ctx, nav }) {
  const analysis = ctx.lastAnalysis || SKIN_ANALYSIS;
  const env = ctx.env;

  return (
    <div className="screen anim-slide-r">
      <NavTop onBack={() => nav.go('home')} title="분석 결과" sub="2026.05.20 · 07:34" />
      <div className="screen-body">

        {/* skin overall ring */}
        <div style={{
          margin: '8px 20px 0',
          padding: '24px 20px',
          background: 'linear-gradient(135deg, var(--accent-tint) 0%, var(--bg-elev) 100%)',
          borderRadius: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          border: '1px solid var(--accent-soft)',
        }}>
          <ScoreRing value={analysis.overall} size={92} stroke={9} label="SKIN SCORE"/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-tiny" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-ink)', letterSpacing: '0.05em' }}>
              감지된 상태
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {analysis.detected.map(d => (
                <span key={d} style={{
                  padding: '4px 10px', borderRadius: 9999,
                  background: '#fff', border: '1px solid var(--accent-soft)',
                  fontSize: 12, color: 'var(--accent-ink)', fontWeight: 600,
                }}>{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* message */}
        <div style={{ padding: '16px 20px 0' }}>
          <Card padding={16} style={{ background: 'var(--bg-sunken)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <IconSparkle size={18} stroke="var(--accent-strong)"/>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>
                {analysis.message}
              </div>
            </div>
          </Card>
        </div>

        {/* factor breakdown */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionHead title="피부 지표" sub="6개 항목" style={{ padding: 0, marginBottom: 12 }}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {analysis.factors.map(f => <FactorCard key={f.id} f={f}/>)}
          </div>
        </div>

        {/* env summary inline */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionHead title="오늘의 환경" sub={env.fullRegion} style={{ padding: 0, marginBottom: 12 }}/>
          <Card padding={0}>
            <EnvRow icon={<IconDust size={16}/>} label="미세먼지 (PM2.5)" value={`${env.pm25.value} ${env.pm25.unit}`} hint={env.pm25.label} level={env.pm25.level}/>
            <EnvRow icon={<IconSun size={16}/>} label="자외선 지수" value={env.uv.value} hint={env.uv.label} level={env.uv.level}/>
            <EnvRow icon={<IconDrop size={16}/>} label="수질" value={env.water.label} hint="노후관 영향 지역" level={env.water.level}/>
            <EnvRow icon={<IconTemp size={16}/>} label="기온·습도" value={`${env.temp.value}°C · ${env.humidity.value}%`} hint="실외 활동 보통" level="mid" last/>
          </Card>
        </div>

        {/* avoid panel */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionHead title="오늘 피해야 할 성분" style={{ padding: 0, marginBottom: 12 }}/>
          <Card padding={14}>
            {AVOID_INGREDIENTS.map((a, i) => (
              <div key={a.name} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                paddingTop: i === 0 ? 0 : 12,
                paddingBottom: i === AVOID_INGREDIENTS.length - 1 ? 0 : 12,
                borderBottom: i === AVOID_INGREDIENTS.length - 1 ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 9999, flexShrink: 0,
                  background: 'oklch(0.96 0.04 25)', color: 'var(--status-vbad)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><IconClose size={12} sw={2.5}/></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{a.reason}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ height: 100 }}/>
      </div>
      <BottomCTA>
        <Button onClick={() => nav.go('recommendations')} variant="primary" size="xl" fullWidth iconRight={<IconArrowR size={18}/>}>
          맞춤 제품 보기
        </Button>
      </BottomCTA>
    </div>
  );
}

function FactorCard({ f }) {
  const levelColor = {
    good: 'oklch(0.55 0.10 150)',
    high: 'oklch(0.55 0.10 150)',
    mid:  'oklch(0.55 0.10 85)',
    low:  'oklch(0.55 0.14 30)',
  }[f.level];
  return (
    <Card padding={14}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{f.label}</div>
        {f.delta !== 0 && (
          <div style={{ fontSize: 10, color: f.delta > 0 ? levelColor : 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            {f.delta > 0 ? '+' : ''}{f.delta}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>{f.score}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/100</span>
      </div>
      <div style={{ marginTop: 10, height: 4, background: 'var(--line)', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${f.score}%`, background: levelColor,
          borderRadius: 9999, transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)',
        }}/>
      </div>
    </Card>
  );
}

function EnvRow({ icon, label, value, hint, level, last }) {
  const levelColors = {
    good: 'oklch(0.55 0.10 150)',
    mid:  'oklch(0.55 0.10 85)',
    bad:  'oklch(0.55 0.13 45)',
    vbad: 'oklch(0.55 0.16 25)',
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 14px',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--bg-sunken)', color: 'var(--ink-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{hint}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: levelColors[level], fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 7. RECOMMENDATIONS — product list (★ most important)
// ═══════════════════════════════════════════════════════════
function ScreenRecommendations({ ctx, nav }) {
  const [sort, setSort] = React.useState('match');
  const [selected, setSelected] = React.useState(null);
  const [category, setCategory] = React.useState('all');

  const cats = ['all', ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

  const sorted = React.useMemo(() => {
    let list = [...PRODUCTS];
    if (category !== 'all') list = list.filter(p => p.category === category);
    if (sort === 'match') list.sort((a, b) => b.match - a.match);
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    if (sort === 'price') list.sort((a, b) => a.price - b.price);
    return list;
  }, [sort, category]);

  return (
    <div className="screen anim-slide-r">
      <NavTop onBack={() => nav.go('result')} title="오늘의 추천" sub={`${SKIN_TYPES.find(t => t.id === ctx.skinProfile?.type)?.label || '건성·민감'} · ${ctx.env.region}`}
        right={
          <button style={{ width: 40, height: 40, background: 'transparent', border: 'none', color: 'var(--ink)' }}>
            <IconHeart size={20}/>
          </button>
        }/>

      <div className="screen-body">
        {/* curation banner */}
        <div style={{ padding: '0 20px' }}>
          <div style={{
            padding: '12px 14px',
            borderRadius: 14,
            background: 'var(--bg-sunken)',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 12, color: 'var(--ink-2)',
          }}>
            <IconSparkle size={16} stroke="var(--accent-strong)"/>
            <span style={{ flex: 1 }}>
              <strong style={{ color: 'var(--ink)' }}>리뷰 11,224건</strong> + 룰북 매칭으로 큐레이션
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>{PRODUCTS.length}</span>
          </div>
        </div>

        {/* filters */}
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {[
              { id: 'match',  label: '매칭순' },
              { id: 'rating', label: '평점순' },
              { id: 'price',  label: '낮은가격순' },
            ].map(s => (
              <Chip key={s.id} size="sm" selected={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</Chip>
            ))}
            <div style={{ width: 1, background: 'var(--line)', margin: '4px 4px' }}/>
            {cats.map(c => (
              <Chip key={c} size="sm" selected={category === c} onClick={() => setCategory(c)}>
                {c === 'all' ? '전체' : c}
              </Chip>
            ))}
          </div>
        </div>

        {/* product list */}
        <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(p => <ProductCard key={p.id} p={p} onClick={() => setSelected(p)}/>)}
        </div>

        <div style={{ height: 28 }}/>
      </div>

      {selected && <ProductSheet p={selected} onClose={() => setSelected(null)}/>}
    </div>
  );
}

function ProductCard({ p, onClick }) {
  return (
    <Card onClick={onClick} padding={12} style={{ display: 'flex', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <Placeholder width={92} height={92} radius={12} label="product" hue={p.category === '진정·보습' ? 150 : p.category === '선케어' ? 85 : p.category === '클렌징' ? 220 : 30}/>
        {p.tag && (
          <div style={{
            position: 'absolute', top: 6, left: 6,
            padding: '2px 6px',
            background: p.tag === 'best' ? 'var(--ink)' : 'var(--warm)',
            color: '#fff',
            borderRadius: 4,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
            fontFamily: 'var(--font-mono)',
          }}>{p.tag.toUpperCase()}</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>{p.brand}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginTop: 2, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.name}</div>
          </div>
          <MatchBadge value={p.match}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <StarRow value={p.rating} count={p.reviewCount} small/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            {p.originalPrice && (
              <span style={{ fontSize: 11, color: 'var(--ink-3)', textDecoration: 'line-through' }}>
                {p.originalPrice.toLocaleString()}원
              </span>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              {p.price.toLocaleString()}원
            </span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--accent-ink)', fontWeight: 600 }}>{p.why[0]}</span>
        </div>
      </div>
    </Card>
  );
}

function MatchBadge({ value }) {
  return (
    <div style={{
      flexShrink: 0,
      padding: '4px 8px',
      borderRadius: 8,
      background: 'var(--accent-soft)',
      color: 'var(--accent-ink)',
      display: 'flex', alignItems: 'center', gap: 3,
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{value}</span>
      <span style={{ fontSize: 9, fontWeight: 600 }}>%</span>
    </div>
  );
}

function ProductSheet({ p, onClose }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="anim-fade" style={{
        width: '100%',
        maxHeight: '88%',
        background: 'var(--bg)',
        borderRadius: '24px 24px 0 0',
        overflow: 'auto',
        boxShadow: 'var(--shadow-up)',
        animation: 'slideInRight 280ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--line-2)' }}/>
        </div>
        <div style={{ padding: '4px 20px 24px' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Placeholder width={120} height={120} radius={14} label="product" hue={p.category === '진정·보습' ? 150 : 30}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>{p.brand}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginTop: 4, letterSpacing: '-0.02em', lineHeight: 1.25 }}>{p.name}</div>
              <div style={{ marginTop: 8 }}><StarRow value={p.rating} count={p.reviewCount}/></div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                {p.originalPrice && (
                  <span style={{ fontSize: 13, color: 'var(--warm)', fontWeight: 700 }}>
                    {Math.round((1 - p.price/p.originalPrice) * 100)}%
                  </span>
                )}
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                  {p.price.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* match reason */}
          <div style={{
            marginTop: 20, padding: 14, borderRadius: 14,
            background: 'var(--accent-tint)', border: '1px solid var(--accent-soft)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-ink)', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                MATCH {p.match}%
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {p.why.map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 9999, background: 'var(--accent-strong)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}><IconCheck size={10} sw={3}/></div>
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>{w}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ingredients */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>주요 성분</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {p.ingredients.map(ing => (
                <span key={ing} style={{
                  padding: '6px 12px', background: 'var(--bg-elev)',
                  border: '1px solid var(--line)', borderRadius: 9999,
                  fontSize: 12, color: 'var(--ink)',
                }}>{ing}</span>
              ))}
            </div>
          </div>

          {/* review excerpt */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 8 }}>리뷰 발췌</div>
            <div style={{
              padding: 14, background: 'var(--bg-elev)',
              border: '1px solid var(--line)', borderRadius: 14,
              fontSize: 13, color: 'var(--ink)', lineHeight: 1.5,
              fontStyle: 'italic',
            }}>
              "{p.reviewExcerpt}"
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
            <Button onClick={onClose} variant="outline" size="lg" style={{ flex: 1 }}>닫기</Button>
            <Button variant="primary" size="lg" style={{ flex: 2 }} iconRight={<IconArrowR size={16}/>}>
              상세 보기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 8. HISTORY — timeline + trend
// ═══════════════════════════════════════════════════════════
function ScreenHistory({ ctx, nav }) {
  return (
    <div className="screen anim-slide-r">
      <NavTop onBack={() => nav.go('home')} title="분석 히스토리"/>
      <div className="screen-body">
        {/* trend chart */}
        <div style={{ padding: '4px 20px 0' }}>
          <Card padding={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div className="t-small" style={{ color: 'var(--ink-3)' }}>최근 7회 추이</div>
                <div className="h-sub" style={{ marginTop: 2 }}>피부 점수</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>72</div>
                <div style={{ fontSize: 11, color: 'var(--status-vbad)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>-4 ↓</div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <TrendChart data={TREND_OVERALL} height={100} color="var(--accent-strong)"/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {['7일전', '6일전', '5일전', '4일전', '3일전', '어제', '오늘'].map((d, i) => (
                <span key={i} style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{d}</span>
              ))}
            </div>
          </Card>
        </div>

        {/* hydration mini */}
        <div style={{ padding: '12px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Card padding={14}>
            <div className="t-small" style={{ fontSize: 11 }}>수분 추이</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>48</span>
              <span style={{ fontSize: 11, color: 'var(--status-vbad)', fontFamily: 'var(--font-mono)' }}>-4</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <TrendChart data={TREND_HYDRATION} height={32} color="oklch(0.65 0.10 220)" mini/>
            </div>
          </Card>
          <Card padding={14}>
            <div className="t-small" style={{ fontSize: 11 }}>이번 주 분석</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>3</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>회</span>
            </div>
            <div className="t-tiny" style={{ marginTop: 4, color: 'var(--ink-3)' }}>주 5회 권장</div>
          </Card>
        </div>

        {/* timeline */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionHead title="전체 기록" sub={`${HISTORY.length}건`} style={{ padding: 0, marginBottom: 12 }}/>
          <div style={{ position: 'relative', paddingLeft: 18 }}>
            <div style={{
              position: 'absolute', left: 5, top: 6, bottom: 6,
              width: 1, background: 'var(--line-2)',
            }}/>
            {HISTORY.map((h, i) => (
              <div key={h.date} style={{ position: 'relative', paddingBottom: 14 }}>
                <div style={{
                  position: 'absolute', left: -18, top: 18,
                  width: 11, height: 11, borderRadius: 9999,
                  background: i === 0 ? 'var(--accent-strong)' : '#fff',
                  border: i === 0 ? '2px solid #fff' : '2px solid var(--line-2)',
                  boxShadow: i === 0 ? '0 0 0 2px var(--accent-strong)' : 'none',
                }}/>
                <Card padding={14}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{h.day}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{h.date}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{h.region}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{h.overall}</div>
                      <div style={{ fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>SCORE</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <MiniStat icon={<IconDust size={11}/>} value={`PM ${h.pm25}`}/>
                    <MiniStat icon={<IconSun size={11}/>} value={`UVI ${h.uv}`}/>
                    <MiniStat icon={<IconSparkle size={11}/>} value={h.top}/>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 24 }}/>
      </div>
    </div>
  );
}

function MiniStat({ icon, value }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 9999,
      background: 'var(--bg-sunken)',
      fontSize: 10, fontWeight: 600, color: 'var(--ink-2)',
      fontFamily: 'var(--font-mono)',
    }}>
      {icon}{value}
    </span>
  );
}

function TrendChart({ data, height = 80, color, mini }) {
  const max = Math.max(...data) + 5;
  const min = Math.min(...data) - 5;
  const w = 320;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - ((v - min) / (max - min)) * height;
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath = `${path} L ${w} ${height} L 0 ${height} Z`;
  const id = React.useMemo(() => `g-${Math.random().toString(36).slice(2,8)}`, []);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth={mini ? 1.6 : 2} strokeLinecap="round" strokeLinejoin="round"/>
      {!mini && pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5}
          fill={i === pts.length - 1 ? color : '#fff'}
          stroke={color} strokeWidth="1.5"/>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// 9. MYPAGE — profile + notifications
// ═══════════════════════════════════════════════════════════
function ScreenMyPage({ ctx, nav }) {
  const [notifs, setNotifs] = React.useState(NOTIF_DEFAULTS);
  const setNotif = (id, v) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, value: v } : n));

  const skinLabel = SKIN_TYPES.find(t => t.id === ctx.skinProfile?.type)?.label || '미설정';

  return (
    <div className="screen anim-slide-r">
      <NavTop onBack={() => nav.go('home')} title="마이 페이지"/>
      <div className="screen-body" style={{ paddingBottom: 30 }}>
        {/* profile header */}
        <div style={{ padding: '8px 20px 0' }}>
          <Card padding={18}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 9999,
                background: 'var(--accent-tint)',
                border: '1px solid var(--accent-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent-strong)', fontSize: 22, fontWeight: 700,
                fontFamily: 'var(--font-ui)',
              }}>김</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>김세현</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>kim.sehyun@dbc.kr</div>
              </div>
              <button style={{
                width: 36, height: 36, borderRadius: 9999, background: 'var(--bg-sunken)',
                border: 'none', color: 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><IconEdit size={16}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
              <ProfileStat label="총 분석" value="42회"/>
              <ProfileStat label="평균 점수" value="74"/>
              <ProfileStat label="저장 제품" value="18"/>
            </div>
          </Card>
        </div>

        {/* profile detail list */}
        <SectionHead title="프로필" style={{ padding: '24px 20px 12px', margin: 0 }}/>
        <div style={{ padding: '0 20px' }}>
          <Card padding={0}>
            <SettingRow icon={<IconFace size={16}/>} label="피부 타입" value={skinLabel} onClick={() => nav.go('skin-setup')}/>
            <SettingRow icon={<IconSparkle size={16}/>} label="관심 고민" value={`${ctx.skinProfile?.concerns?.length || 0}개`} onClick={() => nav.go('skin-setup')}/>
            <SettingRow icon={<IconLocation size={16}/>} label="기본 위치" value={ctx.env.fullRegion} onClick={() => {}} last/>
          </Card>
        </div>

        {/* notification settings */}
        <SectionHead title="알림 설정" sub="환경 변화에 따른 맞춤 알림" style={{ padding: '24px 20px 12px', margin: 0 }}/>
        <div style={{ padding: '0 20px' }}>
          <Card padding={0}>
            {notifs.map((n, i) => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                borderBottom: i === notifs.length - 1 ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.4 }}>{n.desc}</div>
                </div>
                <Toggle value={n.value} onChange={v => setNotif(n.id, v)}/>
              </div>
            ))}
          </Card>
        </div>

        {/* account */}
        <SectionHead title="계정" style={{ padding: '24px 20px 12px', margin: 0 }}/>
        <div style={{ padding: '0 20px' }}>
          <Card padding={0}>
            <SettingRow icon={<IconShield size={16}/>} label="개인정보 및 데이터" onClick={() => {}}/>
            <SettingRow icon={<IconInfo size={16}/>} label="버전 정보" value="0.4.1 · beta" chev={false}/>
            <SettingRow icon={<IconClose size={16}/>} label="로그아웃" onClick={() => {}} danger last/>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileStat({ label, value }) {
  return (
    <div style={{
      padding: '10px 8px', background: 'var(--bg-sunken)',
      borderRadius: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{label}</div>
    </div>
  );
}

function SettingRow({ icon, label, value, onClick, chev = true, last, danger }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', width: '100%',
      background: 'transparent', border: 'none', textAlign: 'left',
      cursor: onClick ? 'pointer' : 'default',
      borderBottom: last ? 'none' : '1px solid var(--line)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--bg-sunken)',
        color: danger ? 'var(--status-vbad)' : 'var(--ink-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 14, color: danger ? 'var(--status-vbad)' : 'var(--ink)', fontWeight: 500 }}>{label}</div>
      {value && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{value}</div>}
      {chev && onClick && <IconChevR size={16} stroke="var(--ink-4)"/>}
    </button>
  );
}

export {
  ScreenAnalyzing, ScreenResult, ScreenRecommendations, ScreenHistory, ScreenMyPage,
};