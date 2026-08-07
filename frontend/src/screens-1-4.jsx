/* eslint-disable */
// src/screens-1-4.jsx — Onboarding, Skin Setup, Home, Camera

import React from 'react';
import { Button, BottomCTA, Card, Chip, NavTop, Placeholder, ProgressDots } from './ui';
import {
  IconArrowR, IconCamera, IconCheck, IconClose, IconFace, IconHeart,
  IconHistory, IconInfo, IconLocation, IconRefresh, IconShield, IconSparkle, IconUser,
} from './icons';
import { SKIN_TYPES, CONCERNS } from './data';
import { KoreaMap, MapLegend, LAYERS } from './korea-map';
import {
  cameraErrorMessage,
  captureVideoFrame,
  requestUserCamera,
  stopMediaStream,
  validateSelectedImage,
  waitForVideoReady,
} from './camera';

// ═══════════════════════════════════════════════════════════
// 1. ONBOARDING + PERMISSIONS
// ═══════════════════════════════════════════════════════════
function ScreenOnboarding({ ctx, nav }) {
  const [step, setStep] = React.useState(0); // 0: intro, 1: location, 2: camera
  const [perms, setPerms] = React.useState(ctx.permissions);
  const [permissionPending, setPermissionPending] = React.useState(false);
  const [permissionError, setPermissionError] = React.useState('');
  const permissionRequestRef = React.useRef(0);

  const grant = async (key) => {
    if (permissionPending) return;
    const requestId = ++permissionRequestRef.current;
    setPermissionPending(true);
    setPermissionError('');
    let granted = true;
    if (key === 'location' && ctx.requestLocation) {
      granted = await ctx.requestLocation();
    } else if (key === 'camera' && ctx.requestCameraPermission) {
      granted = await ctx.requestCameraPermission();
    }
    if (permissionRequestRef.current !== requestId) return;
    const next = { ...perms, [key]: granted };
    setPerms(next);
    ctx.set({ permissions: next });
    setPermissionPending(false);
    if (!granted) {
      setPermissionError(key === 'location'
        ? '현재 위치를 가져오지 못했어요. 브라우저 권한을 확인하고 다시 시도해 주세요.'
        : '카메라 권한을 확인하지 못했어요. 브라우저 권한을 확인하고 다시 시도해 주세요.');
      return;
    }
    setStep(s => s + 1);
  };
  const cancelPendingPermission = () => {
    if (!permissionPending) return;
    permissionRequestRef.current += 1;
    ctx.cancelPermissionRequests?.();
    setPermissionPending(false);
  };
  const skip = () => {
    cancelPendingPermission();
    setPermissionError('');
    setStep(s => s + 1);
  };

  React.useEffect(() => () => {
    permissionRequestRef.current += 1;
    ctx.cancelPermissionRequests?.();
  }, [ctx.cancelPermissionRequests]);

  React.useEffect(() => {
    if (step >= 3) nav.go('skin-setup');
  }, [step]);

  // intro page
  if (step === 0) {
    return (
      <div className="screen anim-fade">
        <div className="screen-body" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ paddingTop: 80, paddingLeft: 28, paddingRight: 28 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', background: 'var(--accent-tint)', borderRadius: 9999,
              fontSize: 11, color: 'var(--accent-ink)', fontWeight: 600,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--accent-strong)' }}/>
              DYNAMIC BEAUTY CURATOR
            </div>
            <h1 className="h-display" style={{ marginTop: 24, fontSize: 36 }}>
              어제와 다른<br/>오늘의 피부를 위한,<br/>
              <span style={{ color: 'var(--accent-strong)' }}>오늘의 케어.</span>
            </h1>
            <p className="t-body" style={{ marginTop: 18, fontSize: 16, lineHeight: 1.55 }}>
              내 피부 타입 × 오늘 우리 동네의<br/>
              미세먼지·자외선·수질을 결합해<br/>
              매일 다른 추천을 받아보세요.
            </p>
          </div>
          <div style={{ flex: 1, minHeight: 80 }} />
          
        </div>
        <BottomCTA>
          <Button onClick={() => setStep(1)} variant="primary" size="xl" fullWidth iconRight={<IconArrowR size={18}/>}>
            시작하기
          </Button>
          <div className="t-small" style={{ textAlign: 'center', marginTop: 12 }}>
            닉네임은 이 기기의 로컬 프로필에만 저장됩니다.
          </div>
        </BottomCTA>
      </div>
    );
  }

  // permission pages
  const isLoc = step === 1;
  const data = isLoc
    ? { key: 'location', icon: <IconLocation size={36}/>, title: '위치 정보 허용',
        body: '오늘 우리 동네의 미세먼지·자외선·수질을 실시간으로 확인합니다.',
        bullets: ['현재 좌표를 추천 백엔드로 전송', '추천 후 좌표를 지속적으로 저장하지 않음', '언제든지 끌 수 있어요'] }
    : { key: 'camera', icon: <IconCamera size={36}/>, title: '카메라 접근 허용',
        body: '얼굴 사진으로 오늘의 피부 상태를 분석합니다.',
        bullets: ['5개 피부 위험도 분석', '백엔드 메모리에서만 처리', '즉시 폐기 · 의료 진단 아님'] };

  return (
    <div className="screen anim-fade">
      <NavTop onBack={() => {
        cancelPendingPermission();
        setStep(s => s - 1);
      }} title="" />
      <div className="screen-body" style={{ padding: '20px 28px 0' }}>
        <ProgressDots count={2} current={step - 1}/>
        <div style={{
          marginTop: 36,
          width: 72, height: 72, borderRadius: 20,
          background: 'var(--accent-soft)', color: 'var(--accent-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{data.icon}</div>
        <h1 className="h-display" style={{ marginTop: 24, fontSize: 28 }}>{data.title}</h1>
        <p className="t-body" style={{ marginTop: 10, fontSize: 16 }}>{data.body}</p>
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 9999,
                background: 'var(--accent-soft)', color: 'var(--accent-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><IconCheck size={14} sw={2.4}/></div>
              <span style={{ fontSize: 14, color: 'var(--ink)' }}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 32, padding: 14, borderRadius: 14,
          background: 'var(--bg-sunken)', display: 'flex', gap: 10,
        }}>
          <IconShield size={20} stroke="var(--ink-3)"/>
          <div className="t-small" style={{ flex: 1 }}>
            {isLoc
              ? '좌표는 환경 추천 요청에만 사용되며 브라우저나 서버에 지속적으로 저장하지 않습니다.'
              : '사진은 분석 중 백엔드 메모리에서만 처리하며 지속적으로 저장하지 않습니다.'}
          </div>
        </div>
        {permissionError && (
          <div role="alert" style={{
            marginTop: 14, padding: 14, borderRadius: 14,
            background: 'oklch(0.97 0.025 25)', color: 'var(--status-vbad)',
            fontSize: 13, lineHeight: 1.5,
          }}>
            <div>{permissionError}</div>
            <button type="button" onClick={() => grant(data.key)} style={{
              marginTop: 8, padding: '7px 11px', borderRadius: 9999,
              border: '1px solid currentColor', background: 'transparent',
              color: 'inherit', fontSize: 12, fontWeight: 700,
            }}>다시 시도</button>
          </div>
        )}
      </div>
      <BottomCTA>
        <Button onClick={() => grant(data.key)} variant="primary" size="xl" fullWidth disabled={permissionPending}>
          {permissionPending ? '권한 확인 중…' : '허용하기'}
        </Button>
        <button onClick={skip} style={{
          height: 48, width: '100%', marginTop: 6, background: 'transparent',
          border: 'none', color: 'var(--ink-3)', fontSize: 14, fontWeight: 500,
          cursor: 'pointer',
        }}>나중에 설정하기</button>
      </BottomCTA>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 2. SKIN TYPE SETUP
// ═══════════════════════════════════════════════════════════
function ScreenSkinSetup({ ctx, nav }) {
  const [skinType, setSkinType] = React.useState(ctx.skinProfile?.type || 'dry_sensitive');
  const [concerns, setConcerns] = React.useState(ctx.skinProfile?.concerns || ['redness', 'dry']);
  const toggleConcern = (id) => setConcerns(cs => cs.includes(id) ? cs.filter(c => c !== id) : [...cs, id]);

  const save = () => {
    ctx.set({ skinProfile: { type: skinType, concerns } });
    nav.go('home');
  };

  return (
    <div className="screen anim-slide-r">
      <NavTop onBack={() => nav.go('onboarding')} title="피부 프로필" />
      <div className="screen-body" style={{ padding: '8px 20px 0' }}>
        <ProgressDots count={2} current={0}/>
        <h1 className="h-display" style={{ marginTop: 18, fontSize: 26 }}>
          평소 피부 타입을<br/>알려주세요
        </h1>
        <p className="t-body" style={{ marginTop: 8 }}>
          한 번만 설정하면 매일 환경 데이터와 결합해 추천드려요.
        </p>

        {/* skin type cards */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {SKIN_TYPES.map(t => {
            const sel = skinType === t.id;
            return (
              <Card key={t.id} onClick={() => setSkinType(t.id)} selected={sel} padding={14}
                style={{ background: sel ? 'var(--accent-tint)' : 'var(--bg-elev)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{t.label}</div>
                  {sel && <div style={{
                    width: 18, height: 18, borderRadius: 9999, background: 'var(--accent-strong)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><IconCheck size={11} sw={3}/></div>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.35 }}>{t.desc}</div>
              </Card>
            );
          })}
        </div>

        {/* concerns */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div className="h-sub">관심 있는 고민</div>
            <div className="t-tiny">선택사항 · 복수 선택</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {CONCERNS.map(c => (
              <Chip key={c.id} selected={concerns.includes(c.id)} onClick={() => toggleConcern(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* preview */}
        <Card style={{ marginTop: 28, background: 'var(--bg-sunken)', border: '1px dashed var(--line-2)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <IconSparkle size={18} stroke="var(--accent-strong)"/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-ink)' }}>이렇게 추천돼요</div>
              <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4, lineHeight: 1.5 }}>
                <strong>{SKIN_TYPES.find(t => t.id === skinType)?.label}</strong> 피부와
                {concerns.length > 0 ? <> <strong>{concerns.length}개</strong> 고민</> : ' 환경 데이터'}를 결합해<br/>
                매일 다른 루틴을 제안합니다.
              </div>
            </div>
          </div>
        </Card>
        <div style={{ height: 24 }}/>
      </div>
      <BottomCTA>
        <Button onClick={save} variant="primary" size="xl" fullWidth iconRight={<IconArrowR size={18}/>}>
          시작하기
        </Button>
      </BottomCTA>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 3. HOME — Korea map with env layers + FAB camera
// ═══════════════════════════════════════════════════════════
function ScreenHome({ ctx, nav }) {
  const env = ctx.env;
  const activeRecommendation = ctx.lastAnalysis
    ? ctx.recommend
    : (ctx.homeRecommend ?? ctx.recommend);
  const [layer, setLayer] = React.useState('pm25');

  const layerCfg = LAYERS[layer];
  const currentRegionValues = {
    pm25: env?.pm25?.value,
    uv: env?.uv?.value,
    water: env?.water?.level === 'good'
      ? 'good'
      : ['bad', 'vbad'].includes(env?.water?.level) ? 'bad' : 'mid',
  };
  const value = currentRegionValues[layer];
  const level = layerCfg.levelOf(value);
  const statusHues = ['var(--status-good)', 'var(--status-mid)', 'var(--status-bad)', 'var(--status-vbad)'];
  const valueColor = statusHues[level];
  const displayRegion = env?.region || '위치 정보 없음';
  const displayUpdatedAt = env?.updatedAt || '업데이트 대기 중';
  const locationConnected = ctx.locationStatus === 'ready' && ctx.location?.source === 'device';
  const locationRequesting = ctx.locationStatus === 'requesting';
  const locationFailed = ['error', 'unsupported'].includes(ctx.locationStatus);
  const locationLabel = locationConnected
    ? '현재 위치 연결됨'
    : locationRequesting ? '현재 위치 확인 중…'
      : locationFailed ? '위치 연결 실패 · 다시 시도' : '현재 위치 연결';
  const coordinateLabel = locationConnected
    ? `${Number(ctx.location.lat).toFixed(4)}, ${Number(ctx.location.lng).toFixed(4)}`
    : null;
  const todayLabel = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).format(new Date());

  return (
    <div className="screen">
      {/* soft sage ambient gradient behind everything */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 380,
        background: 'radial-gradient(80% 60% at 50% 0%, var(--accent-tint) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      <div style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}/>

      {/* greeting */}
      <div style={{ padding: '8px 22px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
            {todayLabel}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 4, letterSpacing: '-0.025em' }}>
            {ctx.user?.nickname || '고객'}님,<br/>
            <span style={{ color: 'var(--accent-strong)' }}>오늘의 우리 동네</span>는요
          </div>
        </div>
        <button type="button" aria-label="마이 페이지" onClick={() => nav.go('mypage')} style={{
          width: 38, height: 38, borderRadius: 9999, background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-2)',
        }}>
          <IconUser size={17}/>
        </button>
      </div>

      <div className="screen-body" style={{ position: 'relative' }}>
        {ctx.requestLocation && (
          <div style={{ padding: '6px 20px 0' }}>
            <button
              type="button"
              aria-label={locationConnected ? `${locationLabel} ${coordinateLabel}` : locationLabel}
              disabled={locationRequesting}
              onClick={() => ctx.requestLocation()}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 14,
                border: '1px solid var(--line)', background: 'var(--bg-elev)',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                color: 'var(--ink)', opacity: locationRequesting ? 0.65 : 1,
                cursor: locationRequesting ? 'wait' : 'pointer',
              }}
            >
              <span style={{
                width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: locationConnected ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                color: locationConnected ? 'var(--accent-strong)' : 'var(--ink-3)',
              }}><IconLocation size={16}/></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{locationLabel}</span>
                <span style={{ display: 'block', marginTop: 1, fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {coordinateLabel || '환경 추천에 사용할 기기 좌표를 다시 확인합니다.'}
                </span>
              </span>
              <IconRefresh size={14}/>
            </button>
          </div>
        )}
        {/* map block + integrated controls */}
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{
            position: 'relative',
            borderRadius: 24,
            background: '#fff',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(40,32,20,0.04), 0 8px 24px rgba(40,32,20,0.06)',
            border: '1px solid var(--line)',
          }}>
            {/* header strip inside the card */}
            <div style={{
              padding: '16px 18px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--line)',
              background: 'linear-gradient(180deg, var(--accent-tint) 0%, #fff 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 9999, background: 'var(--accent-strong)',
                  animation: 'breathe 2.4s ease-in-out infinite',
                }}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                    {displayRegion}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                    {layerCfg.label.toUpperCase()} · {displayUpdatedAt}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: valueColor, letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {layerCfg.formatValue(value)}
                  </span>
                  {layerCfg.unit && <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{layerCfg.unit}</span>}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: valueColor, marginTop: 2 }}>
                  {layerCfg.levelLabel[level]}
                </div>
              </div>
            </div>

            {/* layer pills (horizontal — under header, before map) */}
            <div style={{
              padding: '10px 14px 6px',
              display: 'flex', gap: 6,
              background: '#fff',
            }}>
              {['pm25', 'uv', 'water'].map(k => {
                const L = LAYERS[k];
                const active = layer === k;
                return (
                  <button key={k} type="button" aria-pressed={active} onClick={() => setLayer(k)} style={{
                    flex: 1,
                    padding: '9px 8px',
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    color: active ? 'var(--accent-ink)' : 'var(--ink-3)',
                    border: 'none',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: 'pointer',
                    transition: 'all 160ms',
                    fontWeight: active ? 700 : 500,
                    fontSize: 12,
                    letterSpacing: '-0.015em',
                  }}>
                    {L.icon(14)}
                    <span>{L.label}</span>
                  </button>
                );
              })}
            </div>

            {/* map */}
            <div style={{ position: 'relative', paddingBottom: 8 }}>
              <KoreaMap activeLayer={layer} height={340}/>
            </div>
          </div>

          {/* legend — outside card, beneath, centered */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <MapLegend activeLayer={layer}/>
          </div>
          <div style={{ textAlign: 'center', marginTop: 5, fontSize: 10, color: 'var(--ink-3)' }}>
            상단 현재 위치는 {env?.source === 'live'
              ? '환경 API 값'
              : env?.source === 'fallback' ? 'fallback 값' : '데모 값'} · 전국 지도 색상은 데모 비교용
          </div>

          {/* brief copy */}
          <div style={{ marginTop: 18, padding: '14px 16px',
            background: 'var(--accent-tint)',
            borderRadius: 16,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9999, flexShrink: 0,
              background: '#fff', color: 'var(--accent-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconSparkle size={14}/>
            </div>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--ink)', lineHeight: 1.55, letterSpacing: '-0.015em' }}>
              {ctx.recStatus === 'loading' && '오늘의 추천을 불러오는 중…'}
              {ctx.recStatus === 'error' && (
                <div>
                  <div>추천 서버에 연결하지 못해 예시 데이터로 보여드려요.</div>
                  <button
                    type="button"
                    onClick={() => ctx.refreshRecommendation?.()}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      marginTop: 8, padding: '6px 10px',
                      borderRadius: 9999, border: '1px solid var(--line-2)',
                      background: '#fff', color: 'var(--accent-ink)',
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    <IconRefresh size={13}/> 다시 연결
                  </button>
                </div>
              )}
              {ctx.recStatus === 'ok' && (
                <>
                  {activeRecommendation?.is_fallback && (
                    <span style={{
                      display: 'inline-block', marginBottom: 6,
                      padding: '2px 8px', borderRadius: 9999,
                      background: '#fff', border: '1px solid var(--accent-soft)',
                      fontSize: 10, fontWeight: 700, color: 'var(--accent-ink)',
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                    }}>데모 데이터</span>
                  )}
                  <div>{activeRecommendation?.message || '오늘의 추천을 확인해보세요.'}</div>
                </>
              )}
            </div>
          </div>

          {/* secondary nav */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <SecondaryButton icon={<IconHistory size={16}/>} label="분석 히스토리" desc="피부 추이 보기" onClick={() => nav.go('history')}/>
            <SecondaryButton icon={<IconHeart size={16}/>} label="저장한 추천" desc="제품 모음" onClick={() => nav.go('recommendations')}/>
          </div>
        </div>

        <div style={{ height: 110 }}/>
      </div>

      {/* FAB — camera */}
      <button onClick={() => nav.go('camera')} aria-label="얼굴 분석 시작" style={{
        position: 'absolute',
        right: 20,
        bottom: 36,
        zIndex: 50,
        height: 56,
        paddingLeft: 18,
        paddingRight: 22,
        borderRadius: 9999,
        background: 'var(--ink)',
        color: '#fff',
        border: 'none',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 12px 24px rgba(40,32,20,0.22), 0 0 0 5px rgba(255,255,255,0.88)',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: '-0.015em',
      }}>
        <IconCamera size={20}/>
        <span>오늘의 분석</span>
      </button>
    </div>
  );
}

function SecondaryButton({ icon, label, desc, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--bg-elev)',
      border: '1px solid var(--line)',
      borderRadius: 14,
      padding: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      textAlign: 'left',
      cursor: 'pointer',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--accent-tint)', color: 'var(--accent-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{desc}</div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// 4. CAMERA — face capture
// ═══════════════════════════════════════════════════════════
function ScreenCamera({ ctx, nav }) {
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const videoReadyControllerRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const mountedRef = React.useRef(false);
  const submittingRef = React.useRef(false);
  const cameraRequestRef = React.useRef(0);
  const [capturing, setCapturing] = React.useState(false);
  const [cameraStatus, setCameraStatus] = React.useState('opening');
  const [cameraError, setCameraError] = React.useState('');

  const openCamera = React.useCallback(async () => {
    const requestId = ++cameraRequestRef.current;
    videoReadyControllerRef.current?.abort();
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setCameraStatus('opening');
    setCameraError('');
    try {
      const stream = await requestUserCamera();
      if (!mountedRef.current || submittingRef.current || requestId !== cameraRequestRef.current) {
        stopMediaStream(stream);
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopMediaStream(stream);
        throw new Error('카메라 화면을 찾지 못했습니다.');
      }
      video.srcObject = stream;
      setCameraStatus('preparing');
      const readyController = new AbortController();
      videoReadyControllerRef.current = readyController;
      await waitForVideoReady(video, { signal: readyController.signal });
      if (!mountedRef.current || submittingRef.current || requestId !== cameraRequestRef.current) return;
      setCameraStatus('ready');
    } catch (error) {
      if (!mountedRef.current || submittingRef.current || requestId !== cameraRequestRef.current) return;
      setCameraStatus('error');
      setCameraError(cameraErrorMessage(error));
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    openCamera();
    return () => {
      mountedRef.current = false;
      cameraRequestRef.current += 1;
      videoReadyControllerRef.current?.abort();
      videoReadyControllerRef.current = null;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, [openCamera]);

  const submitImage = React.useCallback((image) => {
    submittingRef.current = true;
    cameraRequestRef.current += 1;
    videoReadyControllerRef.current?.abort();
    videoReadyControllerRef.current = null;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (ctx.startAnalysis) {
      ctx.startAnalysis(image);
    } else {
      submittingRef.current = false;
      setCameraError('분석 기능을 시작하지 못했습니다. 다시 시도해 주세요.');
      setCameraStatus('error');
    }
  }, [ctx]);

  const capture = async () => {
    setCapturing(true);
    setCameraError('');
    try {
      const image = await captureVideoFrame(videoRef.current);
      submitImage(image);
    } catch (error) {
      setCameraError(error.message);
      setCameraStatus('error');
    } finally {
      setCapturing(false);
    }
  };

  const chooseFile = (event) => {
    try {
      submitImage(validateSelectedImage(event.target.files?.[0]));
    } catch (error) {
      setCameraError(error.message);
      setCameraStatus('error');
      event.target.value = '';
    }
  };

  const closeCamera = () => {
    submittingRef.current = true;
    cameraRequestRef.current += 1;
    videoReadyControllerRef.current?.abort();
    videoReadyControllerRef.current = null;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    nav.go('home');
  };

  return (
    <div className="screen camera-screen anim-slide-r" style={{ background: '#0a0908' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 40%, oklch(0.45 0.012 30) 0%, oklch(0.18 0.005 30) 70%, oklch(0.08 0 0) 100%)',
      }}/>
      <video ref={videoRef} className="camera-preview" playsInline muted autoPlay />

      {/* top bar */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', justifyContent: 'space-between',
        padding: 'max(16px, env(safe-area-inset-top)) 16px 0',
      }}>
        <button type="button" aria-label="카메라 닫기" onClick={closeCamera} style={{
          width: 40, height: 40, borderRadius: 9999, background: 'rgba(0,0,0,0.5)',
          border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
        }}>
          <IconClose size={20}/>
        </button>
        <div style={{
          padding: '8px 14px', borderRadius: 9999, background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          color: '#fff', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: 'oklch(0.7 0.18 30)', animation: 'breathe 1.5s ease-in-out infinite' }}/>
          {cameraStatus === 'ready'
            ? '카메라 준비 완료'
            : cameraStatus === 'preparing' ? '카메라 화면 준비 중'
              : cameraStatus === 'opening' ? '카메라 여는 중' : '확인 필요'}
        </div>
        <button type="button" aria-label="카메라 다시 시도" onClick={openCamera} style={{
          width: 40, height: 40, borderRadius: 9999, background: 'rgba(0,0,0,0.5)',
          border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
        }}>
          <IconRefresh size={18}/>
        </button>
      </div>

      {/* face guide overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <FaceOval/>
      </div>

      {cameraError && (
        <div className="camera-error" role="alert">
          <strong>카메라를 확인해 주세요</strong>
          <span>{cameraError}</span>
          <button type="button" onClick={openCamera}>다시 시도</button>
        </div>
      )}

      {/* bottom hint + capture */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
        padding: '0 20px 40px',
      }}>
        <div style={{
          padding: '12px 18px', borderRadius: 16,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 28,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'rgba(255,255,255,0.12)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconFace size={20}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>가이드 안에 얼굴을 맞춰주세요</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 }}>밝은 조명, 정면, 안경·마스크 제거</div>
          </div>
        </div>

        <p className="camera-privacy">
          사진은 분석을 위해 백엔드로 전송되며 메모리에서만 처리 후 즉시 폐기됩니다. 의료 진단이 아닙니다.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
          <button type="button" aria-label="사진 선택" onClick={() => fileRef.current?.click()} style={{
            width: 52, height: 52, borderRadius: 9999, background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
            border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconHistory size={20}/>
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            aria-label="사진 파일 선택"
            accept="image/jpeg,image/png,image/webp"
            onChange={chooseFile}
          />
          <button
            type="button"
            aria-label="얼굴 사진 촬영"
            onClick={capture}
            disabled={cameraStatus !== 'ready' || capturing}
            style={{
              width: 78, height: 78, borderRadius: 9999,
              background: 'transparent',
              border: '3px solid #fff',
              padding: 4,
              cursor: cameraStatus === 'ready' ? 'pointer' : 'not-allowed',
              opacity: cameraStatus === 'ready' ? 1 : 0.5,
            }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: 9999,
              background: '#fff',
              transform: capturing ? 'scale(0.7)' : 'scale(1)',
              transition: 'transform 220ms',
            }}/>
          </button>
          <div aria-hidden="true" style={{
            width: 52, height: 52, borderRadius: 9999, background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
            border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconInfo size={20}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaceOval() {
  return (
    <svg width="280" height="360" viewBox="0 0 280 360">
      <ellipse cx="140" cy="180" rx="110" ry="145"
        fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeDasharray="6 8"/>
      {/* corner brackets */}
      {[[40,40,1,1],[240,40,-1,1],[40,320,1,-1],[240,320,-1,-1]].map(([x,y,sx,sy],i) => (
        <g key={i} transform={`translate(${x}, ${y}) scale(${sx} ${sy})`}>
          <path d="M 0 16 L 0 0 L 16 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"/>
        </g>
      ))}
      {/* center crosshair */}
      <line x1="140" y1="174" x2="140" y2="186" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
      <line x1="134" y1="180" x2="146" y2="180" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
    </svg>
  );
}

export {
  ScreenOnboarding, ScreenSkinSetup, ScreenHome, ScreenCamera,
};
