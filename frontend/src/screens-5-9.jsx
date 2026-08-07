/* eslint-disable */
// src/screens-5-9.jsx — Analyzing, Result, Recommendations, History, MyPage
import React from 'react';
import { Button, BottomCTA, Card, Chip, NavTop, Placeholder, ScoreRing, SectionHead, StarRow, Toggle } from './ui';
import {
  IconArrowR, IconCheck, IconChevR, IconClose, IconDrop, IconDust, IconFace,
  IconInfo, IconLeaf, IconLocation, IconShield, IconSparkle, IconSun, IconTemp,
} from './icons';
import {
  PRODUCTS, SKIN_TYPES,
  NOTIF_DEFAULTS,
} from './data';
import { rankProducts } from './recommendation-ranking';
// ═══════════════════════════════════════════════════════════
// 5. ANALYZING — loading w/ steps
// ═══════════════════════════════════════════════════════════
function ScreenAnalyzing({ ctx, nav }) {
  const steps = [
    { id: 0, label: '얼굴 분석 중…', sub: 'AI 모델로 피부 상태 추출', icon: <IconFace size={20} /> },
    { id: 1, label: '환경 데이터 결합 중…', sub: '미세먼지·자외선·수질 호출', icon: <IconLeaf size={20} /> },
    { id: 2, label: '맞춤 제품 찾는 중…', sub: '룰북 + 리뷰 NLP 매칭', icon: <IconSparkle size={20} /> },
  ];
  const active = ctx.analysisStatus === 'uploading' ? 0 : 1;

  if (ctx.analysisStatus === 'error') {
    return (
      <div className="screen anim-fade">
        <NavTop title="분석을 완료하지 못했어요" onBack={() => ctx.cancelAnalysis('camera')} />
        <div className="screen-body analysis-error-screen">
          <div className="analysis-error-mark"><IconInfo size={28} /></div>
          <div role="alert" className="analysis-error-card">
            <h1>사진 분석을 다시 시도해 주세요</h1>
            <p>{ctx.analysisError}</p>
          </div>
          <div className="analysis-error-actions">
            <Button variant="primary" fullWidth onClick={ctx.retryAnalysis}>다시 시도</Button>
            <Button variant="outline" fullWidth onClick={() => ctx.cancelAnalysis('camera')}>다시 촬영</Button>
            <Button variant="ghost" fullWidth onClick={() => ctx.cancelAnalysis('home')}>홈으로</Button>
          </div>
          <p className="analysis-privacy-note">실패한 사진은 재시도를 선택한 동안에만 메모리에 남습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen anim-fade" style={{
      background: 'linear-gradient(180deg, var(--accent-tint) 0%, var(--bg) 50%, var(--bg) 100%)',
    }}>
      <div style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }} />
      <div className="screen-body" style={{ display: 'flex', flexDirection: 'column', padding: '20px 24px' }}>
        {/* breathing orb */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <div style={{ position: 'relative', width: 200, height: 200 }}>
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 9999,
              background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
              animation: 'breathe 2.4s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 30, borderRadius: 9999,
              background: 'radial-gradient(circle, var(--accent-strong) 0%, var(--accent-ink) 100%)',
              animation: 'breathe 2.4s ease-in-out infinite 0.3s',
            }} />
            <svg width="200" height="200" style={{ position: 'absolute', inset: 0, animation: 'spin 14s linear infinite' }}>
              <circle cx="100" cy="100" r="92" fill="none" stroke="var(--accent-strong)" strokeWidth="2"
                strokeDasharray="4 12" opacity="0.5" />
            </svg>
            <svg width="200" height="200" style={{ position: 'absolute', inset: 0, animation: 'spin 22s linear infinite reverse' }}>
              <circle cx="100" cy="100" r="76" fill="none" stroke="var(--accent-strong)" strokeWidth="1.5"
                strokeDasharray="2 8" opacity="0.3" />
            </svg>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <div className="t-tiny" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-strong)', letterSpacing: '0.1em' }}>
            DYNAMIC CURATION
          </div>
          <h1 className="h-display" style={{ marginTop: 10, fontSize: 24 }}>
            오늘의 케어를<br />찾고 있어요
          </h1>
        </div>

        {/* progress bar */}
        <div style={{ marginTop: 32, padding: '0 4px' }}>
          <div style={{ height: 4, background: 'var(--line)', borderRadius: 9999, overflow: 'hidden' }}>
            <div className="analysis-progress-indeterminate" />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 8,
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)',
          }}>
            <span>MODEL + ENVIRONMENT</span>
            <span>최대 60초</span>
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
                  {state === 'done' ? <IconCheck size={16} sw={2.5} /> : s.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{s.sub}</div>
                </div>
                {state === 'active' && <LoadingDots />}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minHeight: 16 }} />
        <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
          <div className="t-small">사진은 메모리에서 분석 후 즉시 폐기됩니다.</div>
          <button type="button" className="analysis-cancel" onClick={() => ctx.cancelAnalysis('camera')}>분석 취소</button>
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
        }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 6. RESULT — skin + env summary
// ═══════════════════════════════════════════════════════════
function ScreenResult({ ctx, nav }) {
  const analysis = ctx.lastAnalysis;
  const env = ctx.env;
  if (!analysis?.mainRisk) {
    return (
      <div className="screen anim-slide-r">
        <NavTop onBack={() => nav.go('home')} title="분석 결과" />
        <div className="screen-body" style={{ padding: '44px 20px 120px' }}>
          <Card padding={24} style={{ textAlign: 'center', background: 'var(--accent-tint)' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 18, margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent-ink)', background: 'var(--bg-elev)',
            }}><IconFace size={26} /></div>
            <div className="h-sub" style={{ marginTop: 18 }}>아직 분석 결과가 없어요</div>
            <p className="t-body" style={{ color: 'var(--ink-3)', margin: '8px 0 0' }}>
              얼굴 사진을 촬영하면 다섯 가지 피부 위험도를 확인할 수 있어요.
            </p>
          </Card>
        </div>
        <BottomCTA>
          <Button onClick={() => nav.go('camera')} variant="primary" size="xl" fullWidth>
            피부 분석 시작
          </Button>
        </BottomCTA>
      </div>
    );
  }

  const focusRisks = (analysis.focusRisks || []).filter(Boolean).slice(0, 2);
  const factors = (analysis.factors || []).filter(Boolean).slice(0, 5);
  const message = ctx.recommend?.message
    || `${focusRisks.map(risk => risk.label_ko).join('와 ')} 위험도를 중심으로 관리해 보세요.`;
  const avoid = ctx.recommend?.avoid || [];
  const signals = ctx.recommend?.ranking_signals || [];
  const analyzedDate = new Date(analysis.analyzedAt);
  const analyzedAt = Number.isNaN(analyzedDate.getTime())
    ? '방금 분석'
    : new Intl.DateTimeFormat('ko-KR', {
      month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(analyzedDate);

  return (
    <div className="screen anim-slide-r">
      <NavTop onBack={() => nav.go('home')} title="분석 결과" sub={analyzedAt} />
      <div className="screen-body">

        {/* highest-risk summary */}
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
          <ScoreRing value={analysis.mainRisk.risk_score} size={92} stroke={9} label="RISK" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-tiny" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-ink)', letterSpacing: '0.05em' }}>
              가장 먼저 볼 위험도
            </div>
            <div className="h-title" style={{ marginTop: 4 }}>{analysis.mainRisk.label_ko}</div>
            <ul aria-label="우선 관리 위험도" style={{
              display: 'flex', flexWrap: 'wrap', gap: 5, margin: '8px 0 0', padding: 0, listStyle: 'none',
            }}>
              {focusRisks.map(risk => (
                <li key={risk.id} style={{
                  padding: '4px 9px', borderRadius: 9999,
                  background: 'var(--bg-elev)', border: '1px solid var(--accent-soft)',
                  fontSize: 11, color: 'var(--accent-ink)', fontWeight: 700,
                }}>{risk.label_ko} {risk.risk_score}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* message */}
        <div style={{ padding: '16px 20px 0' }}>
          <Card padding={16} style={{ background: 'var(--bg-sunken)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <IconSparkle size={18} stroke="var(--accent-strong)" />
              <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>
                {message}
              </div>
            </div>
          </Card>
        </div>

        {/* factor breakdown */}
        <div style={{ padding: '24px 20px 0' }}>
          <SectionHead title="5가지 피부 위험도" sub="높을수록 관리가 더 필요해요" style={{ padding: 0, marginBottom: 12 }} />
          <ul aria-label="5가지 피부 위험도" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
            listStyle: 'none', padding: 0, margin: 0,
          }}>
            {factors.map(f => <FactorCard key={f.id} f={f} />)}
          </ul>
        </div>

        {/* env summary inline */}
        {env && <div style={{ padding: '24px 20px 0' }}>
          <SectionHead
            title="오늘의 환경"
            sub={`${env.fullRegion} · ${env.source === 'live' ? '환경 API' : env.source === 'fallback' ? 'fallback' : '데모'}`}
            style={{ padding: 0, marginBottom: 12 }}
          />
          <Card padding={0}>
            <EnvRow icon={<IconDust size={16} />} label="미세먼지 (PM2.5)" value={`${env.pm25.value} ${env.pm25.unit}`} hint={env.pm25.label} level={env.pm25.level} />
            <EnvRow icon={<IconSun size={16} />} label="자외선 지수" value={env.uv.value} hint={env.uv.label} level={env.uv.level} />
            <EnvRow icon={<IconDrop size={16} />} label="수질" value={env.water.label} hint="지역 수질 지표" level={env.water.level} last={!env.temp || !env.humidity} />
            {env.temp && env.humidity && (
              <EnvRow icon={<IconTemp size={16} />} label="기온·습도" value={`${env.temp.value}°C · ${env.humidity.value}%`} hint="데모 참고값" level="mid" last />
            )}
          </Card>
        </div>}

        {/* avoid panel */}
        {avoid.length > 0 && <div style={{ padding: '24px 20px 0' }}>
          <SectionHead title="오늘 피해야 할 성분" style={{ padding: 0, marginBottom: 12 }} />
          <Card padding={14}>
            {avoid.map((name, i) => {
              const reason = signals.find(signal => signal.kind === 'avoid' && signal.value === name)?.reason;
              return (
              <div key={name} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                paddingTop: i === 0 ? 0 : 12,
                paddingBottom: i === avoid.length - 1 ? 0 : 12,
                borderBottom: i === avoid.length - 1 ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 9999, flexShrink: 0,
                  background: 'oklch(0.96 0.04 25)', color: 'var(--status-vbad)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><IconClose size={12} sw={2.5} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                    {reason || '오늘의 피부·환경 상태를 고려해 제외해요.'}
                  </div>
                </div>
              </div>
            )})}
          </Card>
        </div>}

        <div style={{ padding: '18px 20px 0', display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--ink-3)' }}>
          <IconShield size={15} />
          <p style={{ fontSize: 11, lineHeight: 1.5, margin: 0 }}>
            이 결과는 의료 진단이 아닌 화장품 추천용 AI 분석입니다.
          </p>
        </div>

        <div style={{ height: 100 }} />
      </div>
      <BottomCTA>
        <Button onClick={() => nav.go('recommendations')} variant="primary" size="xl" fullWidth iconRight={<IconArrowR size={18} />}>
          맞춤 제품 보기
        </Button>
      </BottomCTA>
    </div>
  );
}

function FactorCard({ f }) {
  const isHigh = f.risk_label === 'high';
  const levelColor = isHigh ? 'var(--status-vbad)' : 'oklch(0.55 0.10 150)';
  const score = Math.max(0, Math.min(100, Number(f.risk_score || 0)));
  return (
    <li style={{ listStyle: 'none' }} aria-label={`${f.label_ko} 위험 확률 ${score}%`}>
    <Card padding={14} style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{f.label_ko}</div>
        <div style={{
          fontSize: 9, fontWeight: 700, color: levelColor,
          padding: '2px 6px', borderRadius: 9999, background: 'var(--bg-sunken)',
        }}>{isHigh ? '우선 관리' : '낮음'}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/100</span>
      </div>
      <div style={{ marginTop: 10, height: 4, background: 'var(--line)', borderRadius: 9999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${score}%`, background: levelColor,
          borderRadius: 9999, transition: 'width 800ms cubic-bezier(0.22,1,0.36,1)',
        }} />
      </div>
    </Card>
    </li>
  );
}

function EnvRow({ icon, label, value, hint, level, last }) {
  const levelColors = {
    good: 'oklch(0.55 0.10 150)',
    mid: 'oklch(0.55 0.10 85)',
    bad: 'oklch(0.55 0.13 45)',
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

  const recs = ctx.recommend?.recommendations || [];   // 백엔드 추천 루틴 [{step, category, ingredient}]
  const signals = ctx.recommend?.ranking_signals || [];
  const cats = ['all', ...Array.from(new Set(PRODUCTS.map(p => p.category)))];

  const sorted = React.useMemo(() => {
    let list = rankProducts(PRODUCTS, signals);
    if (category !== 'all') list = list.filter(p => p.category === category);
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    if (sort === 'price') list.sort((a, b) => a.price - b.price);
    return list;
  }, [sort, category, signals]);

  if (!ctx.lastAnalysis) {
    return (
      <div className="screen anim-slide-r">
        <NavTop onBack={() => nav.go('home')} title="오늘의 추천" />
        <div className="screen-body" style={{ padding: '44px 20px 120px' }}>
          <Card padding={24} style={{ textAlign: 'center', background: 'var(--accent-tint)' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 18, margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent-ink)', background: 'var(--bg-elev)',
            }}><IconSparkle size={25} /></div>
            <div className="h-sub" style={{ marginTop: 18 }}>피부 분석이 먼저 필요해요</div>
            <p className="t-body" style={{ color: 'var(--ink-3)', margin: '8px 0 0' }}>
              실제 5가지 피부 위험도를 분석한 뒤 맞춤 제품 순서를 보여드려요.
            </p>
          </Card>
        </div>
        <BottomCTA>
          <Button onClick={() => nav.go('camera')} variant="primary" size="xl" fullWidth>
            피부 분석 시작
          </Button>
        </BottomCTA>
      </div>
    );
  }

  return (
    <div className="screen anim-slide-r">
      <NavTop onBack={() => nav.go('result')} title="오늘의 추천" sub={`${SKIN_TYPES.find(t => t.id === ctx.skinProfile?.type)?.label || '건성·민감'} · ${ctx.env.region}`} />

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
            <IconSparkle size={16} stroke="var(--accent-strong)" />
            <span style={{ flex: 1 }}>
              <strong style={{ color: 'var(--ink)' }}>실제 피부 위험도</strong> + 환경·성분 매칭으로 정렬
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>{PRODUCTS.length}</span>
          </div>
        </div>
        {/* 백엔드 추천 루틴 */}
        {recs.length > 0 && (
          <div style={{ padding: '12px 20px 0' }}>
            <Card padding={14}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>오늘의 추천 루틴</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recs.map(r => (
                  <div key={r.step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 9999, flexShrink: 0,
                      background: 'var(--accent-strong)', color: '#fff',
                      fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{r.step}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{r.category}</span>
                    <span style={{ fontSize: 12, color: 'var(--accent-ink)' }}>· {r.ingredient}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
        {/* filters */}
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {[
              { id: 'match', label: '매칭순' },
              { id: 'rating', label: '평점순' },
              { id: 'price', label: '낮은가격순' },
            ].map(s => (
              <Chip key={s.id} size="sm" selected={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</Chip>
            ))}
            <div style={{ width: 1, background: 'var(--line)', margin: '4px 4px' }} />
            {cats.map(c => (
              <Chip key={c} size="sm" selected={category === c} onClick={() => setCategory(c)}>
                {c === 'all' ? '전체' : c}
              </Chip>
            ))}
          </div>
        </div>

        {/* product list */}
        <ol aria-label="맞춤 추천 제품" style={{
          padding: '14px 20px 0', margin: 0, display: 'flex',
          flexDirection: 'column', gap: 12, listStyle: 'none',
        }}>
          {sorted.map(p => (
            <li key={p.id} style={{ listStyle: 'none' }}>
              <ProductCard p={p} onClick={() => setSelected(p)} />
            </li>
          ))}
        </ol>

        <div style={{ height: 28 }} />
      </div>

      {selected && <ProductSheet p={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ProductCard({ p, onClick }) {
  return (
    <Card onClick={onClick} padding={12} style={{ display: 'flex', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <Placeholder width={92} height={92} radius={12} label="product" hue={p.category === '진정·보습' ? 150 : p.category === '선케어' ? 85 : p.category === '클렌징' ? 220 : 30} />
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
            <div style={{
              fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginTop: 2, lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
            }}>{p.name}</div>
          </div>
          <MatchBadge value={p.personalizedMatch ?? p.match} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <StarRow value={p.rating} count={p.reviewCount} small />
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
          <span style={{ fontSize: 10, color: 'var(--accent-ink)', fontWeight: 600, textAlign: 'right' }}>
            {p.personalizedReason
              ? `${p.personalizedReason.reason} · ${p.personalizedReason.label} 매칭`
              : p.why[0]}
          </span>
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
  const dialogRef = React.useRef(null);
  const titleId = React.useId();
  const reasons = p.personalizedReason
    ? [`${p.personalizedReason.reason} · ${p.personalizedReason.label} 매칭`, ...p.why]
    : p.why;

  React.useEffect(() => {
    const returnFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    dialog?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = [...dialog.querySelectorAll(focusableSelector)];
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === dialog || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="anim-fade"
        style={{
        width: '100%',
        maxHeight: '88%',
        background: 'var(--bg)',
        borderRadius: '24px 24px 0 0',
        overflow: 'auto',
        boxShadow: 'var(--shadow-up)',
        animation: 'slideInRight 280ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--line-2)' }} />
        </div>
        <div style={{ padding: '4px 20px 24px' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Placeholder width={120} height={120} radius={14} label="product" hue={p.category === '진정·보습' ? 150 : 30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>{p.brand}</div>
              <div id={titleId} style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginTop: 4, letterSpacing: '-0.02em', lineHeight: 1.25 }}>{p.name}</div>
              <div style={{ marginTop: 8 }}><StarRow value={p.rating} count={p.reviewCount} /></div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                {p.originalPrice && (
                  <span style={{ fontSize: 13, color: 'var(--warm)', fontWeight: 700 }}>
                    {Math.round((1 - p.price / p.originalPrice) * 100)}%
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
                MATCH {p.personalizedMatch ?? p.match}%
              </div>
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reasons.map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 9999, background: 'var(--accent-strong)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}><IconCheck size={10} sw={3} /></div>
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

          <div style={{ marginTop: 24 }}>
            <Button onClick={onClose} variant="outline" size="lg" fullWidth>닫기</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 8. HISTORY — current-session result only
// ═══════════════════════════════════════════════════════════
function ScreenHistory({ ctx, nav }) {
  const analysis = ctx.lastAnalysis;

  if (!analysis) {
    return (
      <div className="screen anim-slide-r">
        <NavTop onBack={() => nav.go('home')} title="분석 기록" />
        <div className="screen-body" style={{ padding: '44px 20px 120px' }}>
          <Card padding={24} style={{ textAlign: 'center', background: 'var(--accent-tint)' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 18, margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent-ink)', background: 'var(--bg-elev)',
            }}><IconFace size={25} /></div>
            <div className="h-sub" style={{ marginTop: 18 }}>저장된 분석 기록이 없어요</div>
            <p className="t-body" style={{ color: 'var(--ink-3)', margin: '8px 0 20px' }}>
              분석 결과는 현재 세션에서만 확인할 수 있고, 사진과 결과를 기기에 영구 저장하지 않아요.
            </p>
            <Button onClick={() => nav.go('camera')} variant="primary" fullWidth>
              피부 분석 시작
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const date = new Date(analysis.analyzedAt);
  const analyzedAt = Number.isNaN(date.getTime())
    ? '방금 완료'
    : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  const focusRisks = analysis.focusRisks?.length
    ? analysis.focusRisks.slice(0, 2)
    : analysis.mainRisk ? [analysis.mainRisk] : [];

  return (
    <div className="screen anim-slide-r">
      <NavTop onBack={() => nav.go('home')} title="분석 기록" />
      <div className="screen-body" style={{ padding: '4px 20px 28px' }}>
        <Card padding={18}>
          <div className="t-small" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>현재 세션 결과</div>
          <div className="h-sub" style={{ marginTop: 4 }}>{analyzedAt}</div>
          <div className="t-tiny" style={{ marginTop: 4, color: 'var(--ink-3)' }}>기기에 영구 저장되지 않음</div>

          {focusRisks.length > 0 && (
            <ul aria-label="현재 세션 우선 관리 위험도" style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'grid', gap: 8 }}>
              {focusRisks.map(risk => (
                <li key={risk.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 12, background: 'var(--bg-sunken)',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{risk.label_ko}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-ink)', fontFamily: 'var(--font-mono)' }}>
                    {risk.risk_score}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Button onClick={() => nav.go('result')} variant="outline" fullWidth style={{ marginTop: 18 }}>
            결과 다시 보기
          </Button>
        </Card>

        <Card padding={14} style={{ marginTop: 12, background: 'var(--bg-sunken)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <IconShield size={16} />
            <p className="t-small" style={{ color: 'var(--ink-3)', margin: 0, lineHeight: 1.5 }}>
              현재 버전은 분석 이력을 저장하지 않습니다. 새로고침하거나 로그아웃하면 이 결과도 사라져요.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 9. MYPAGE — profile + notifications
// ═══════════════════════════════════════════════════════════
function ScreenMyPage({ ctx, nav }) {
  const [notifs, setNotifs] = React.useState(NOTIF_DEFAULTS);
  const setNotif = (id, v) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, value: v } : n));

  const skinLabel = SKIN_TYPES.find(t => t.id === ctx.skinProfile?.type)?.label || '미설정';
  const nickname = ctx.user?.nickname || '고객';
  const hasCurrentAnalysis = Boolean(ctx.lastAnalysis);

  return (
    <div className="screen anim-slide-r">
      <NavTop onBack={() => nav.go('home')} title="마이 페이지" />
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
              }}>{nickname.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{nickname}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>이 기기에 저장된 로컬 프로필</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
              <ProfileStat label="이번 세션 분석" value={hasCurrentAnalysis ? '1회' : '0회'} />
              <ProfileStat label="최근 결과" value={hasCurrentAnalysis ? '있음' : '없음'} />
              <ProfileStat label="저장 제품" value="0개" />
            </div>
          </Card>
        </div>

        {/* profile detail list */}
        <SectionHead title="프로필" style={{ padding: '24px 20px 12px', margin: 0 }} />
        <div style={{ padding: '0 20px' }}>
          <Card padding={0}>
            <SettingRow icon={<IconFace size={16} />} label="피부 타입" value={skinLabel} onClick={() => nav.go('skin-setup')} />
            <SettingRow icon={<IconSparkle size={16} />} label="관심 고민" value={`${ctx.skinProfile?.concerns?.length || 0}개`} onClick={() => nav.go('skin-setup')} />
            <SettingRow icon={<IconLocation size={16} />} label="기본 위치" value={ctx.env.fullRegion} chev={false} last />
          </Card>
        </div>

        {/* notification settings */}
        <SectionHead title="알림 설정" sub="환경 변화에 따른 맞춤 알림" style={{ padding: '24px 20px 12px', margin: 0 }} />
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
                <Toggle value={n.value} onChange={v => setNotif(n.id, v)} label={n.label} />
              </div>
            ))}
          </Card>
        </div>

        {/* account */}
        <SectionHead title="계정" style={{ padding: '24px 20px 12px', margin: 0 }} />
        <div style={{ padding: '0 20px' }}>
          <Card padding={0}>
            <SettingRow icon={<IconShield size={16} />} label="개인정보 및 데이터" value="사진 미저장" chev={false} />
            <SettingRow icon={<IconInfo size={16} />} label="버전 정보" value="0.4.1 · beta" chev={false} />
            <SettingRow icon={<IconClose size={16} />} label="로그아웃" onClick={ctx.logout} danger last />
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
  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', width: '100%',
    background: 'transparent', border: 'none', textAlign: 'left',
    cursor: onClick ? 'pointer' : 'default',
    borderBottom: last ? 'none' : '1px solid var(--line)',
  };
  const content = (
    <>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--bg-sunken)',
        color: danger ? 'var(--status-vbad)' : 'var(--ink-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, fontSize: 14, color: danger ? 'var(--status-vbad)' : 'var(--ink)', fontWeight: 500 }}>{label}</div>
      {value && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{value}</div>}
      {chev && onClick && <IconChevR size={16} stroke="var(--ink-4)" />}
    </>
  );

  if (!onClick) return <div style={rowStyle}>{content}</div>;
  return <button type="button" onClick={onClick} style={rowStyle}>{content}</button>;
}

export {
  ScreenAnalyzing, ScreenResult, ScreenRecommendations, ScreenHistory, ScreenMyPage,
};
