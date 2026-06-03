// src/App.jsx — App shell, router, AppContext

import { useState, useEffect, useMemo, useRef } from 'react';
import { IconChevL, IconChevR } from './icons';
import { IOSStatusBar } from './ios-frame';
import { ENV_DATA } from './data';
import { ScreenOnboarding, ScreenSkinSetup, ScreenHome, ScreenCamera } from './screens-1-4';
import { ScreenAnalyzing, ScreenResult, ScreenRecommendations, ScreenHistory, ScreenMyPage } from './screens-5-9';
import { getRecommend } from './api/client';
import { adaptEnvData } from './api/adapters';

// ─── Defaults ─────────────────────────────────────────────
const TWEAK_DEFAULTS = {
  palette: 'sage',
  showDevNav: true,
  skinPreset: 'dry_sensitive',
  envPreset: 'bad_day',
};

// ─── Screen registry ──────────────────────────────────────
const SCREENS = [
  { id: 'onboarding',      label: '01 온보딩',   Component: ScreenOnboarding },
  { id: 'skin-setup',      label: '02 피부설정', Component: ScreenSkinSetup },
  { id: 'home',            label: '03 홈',       Component: ScreenHome },
  { id: 'camera',          label: '04 카메라',   Component: ScreenCamera },
  { id: 'analyzing',       label: '05 분석중',   Component: ScreenAnalyzing },
  { id: 'result',          label: '06 결과',     Component: ScreenResult },
  { id: 'recommendations', label: '07 추천',     Component: ScreenRecommendations },
  { id: 'history',         label: '08 히스토리', Component: ScreenHistory },
  { id: 'mypage',          label: '09 마이',     Component: ScreenMyPage },
];

// ─── Env preset variations ────────────────────────────────
function buildEnv(preset) {
  const base = { ...ENV_DATA };
  if (preset === 'clean') {
    return { ...base,
      pm25: { value: 22, label: '좋음',  level: 'good', unit: '㎍/㎥' },
      uv:   { value: 3,  label: '낮음',  level: 'good', unit: 'UVI' },
      water:{ value: '양호', label: '양호', level: 'good', unit: '' },
    };
  }
  if (preset === 'uv_extreme') {
    return { ...base,
      pm25: { value: 45, label: '보통',     level: 'mid',  unit: '㎍/㎥' },
      uv:   { value: 9,  label: '매우높음', level: 'vbad', unit: 'UVI' },
    };
  }
  return base;
}

// ─── App root ─────────────────────────────────────────────
function App() {
  const tweaks = TWEAK_DEFAULTS;

  const [route, setRoute] = useState('onboarding');
  const nav = useMemo(() => ({ go: (r) => setRoute(r) }), []);

  const [permissions, setPermissions] = useState({ location: false, camera: false });
  const [skinProfile, setSkinProfile] = useState({
    type: tweaks.skinPreset || 'dry_sensitive',
    concerns: ['redness', 'dry'],
  });
  const [lastAnalysis, setLastAnalysis] = useState(null);

  // env: mock으로 시작 → 백엔드 /recommend 응답 오면 실제 데이터로 교체
  const [env, setEnv] = useState(() => buildEnv(tweaks.envPreset));
  useEffect(() => {
    getRecommend({ lat: 36.62, lng: 127.29, skin_type: skinProfile.type })
      .then(res => {
        console.log('[recommend] env_data:', res.env_data);
        setEnv(adaptEnvData(res.env_data));
      })
      .catch(err => console.error('[recommend] 실패:', err));
  }, [skinProfile.type]);

  const ctx = {
    permissions, skinProfile, lastAnalysis, env,
    set: (patch) => {
      if ('permissions' in patch) setPermissions(patch.permissions);
      if ('skinProfile' in patch) setSkinProfile(patch.skinProfile);
      if ('lastAnalysis' in patch) setLastAnalysis(patch.lastAnalysis);
    },
  };

  const curScreen = SCREENS.find(s => s.id === route);
  const idx = SCREENS.findIndex(s => s.id === route);
  const Component = curScreen?.Component;

  return (
    <div className="stage">
      <div className="stage-inner">
        <div className="label-bar">
          <span className="dot"/>
          <span>DYNAMIC BEAUTY CURATOR</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span className="name">{curScreen?.label}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{String(idx + 1).padStart(2, '0')} / {String(SCREENS.length).padStart(2, '0')}</span>
        </div>

        <PhoneFrame palette={tweaks.palette}>
          {Component
            ? <Component key={route} ctx={ctx} nav={nav}/>
            : <div style={{ padding: 24 }}>화면을 찾을 수 없습니다.</div>}
        </PhoneFrame>

        {tweaks.showDevNav && (
          <DevNav screens={SCREENS} current={route} onGo={nav.go}/>
        )}
      </div>
    </div>
  );
}

// ─── Phone frame wrapper ──────────────────────────────────
function PhoneFrame({ children, palette }) {
  return (
    <div className={`palette-${palette}`} style={{ position: 'relative' }}>
      <div style={{
        width: 390, height: 844,
        borderRadius: 56, overflow: 'hidden',
        position: 'relative',
        background: 'var(--bg)',
        boxShadow: '0 40px 80px rgba(40,32,20,0.18), 0 0 0 1px rgba(40,32,20,0.10), inset 0 0 0 8px #14110b',
      }}>
        <div style={{
          position: 'absolute', inset: 8,
          borderRadius: 48,
          overflow: 'hidden',
          background: 'var(--bg)',
        }} className="app-root">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'none' }}>
            <IOSStatusBar dark={false}/>
          </div>
          <div style={{
            position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
            width: 122, height: 35, borderRadius: 24, background: '#000', zIndex: 110,
          }}/>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 110,
            height: 28, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
            paddingBottom: 8, pointerEvents: 'none',
          }}>
            <div style={{ width: 134, height: 5, borderRadius: 100, background: 'rgba(0,0,0,0.28)' }}/>
          </div>
          <div style={{ position: 'absolute', inset: 0 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dev nav ──────────────────────────────────────────────
function DevNav({ screens, current, onGo }) {
  const idx = screens.findIndex(s => s.id === current);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const btn = scrollRef.current.querySelector('.active');
    if (btn) {
      const parent = scrollRef.current;
      const off = btn.offsetLeft - parent.offsetWidth / 2 + btn.offsetWidth / 2;
      parent.scrollTo({ left: off, behavior: 'smooth' });
    }
  }, [current]);

  return (
    <div className="dev-nav" style={{ maxWidth: 560 }}>
      <button className="arrow" disabled={idx === 0}
        onClick={() => onGo(screens[Math.max(0, idx - 1)].id)}>
        <IconChevL size={16}/>
      </button>
      <div ref={scrollRef} style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', maxWidth: 420 }}>
        {screens.map(s => (
          <button key={s.id} className={current === s.id ? 'active' : ''}
            onClick={() => onGo(s.id)} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {s.label}
          </button>
        ))}
      </div>
      <button className="arrow" disabled={idx === screens.length - 1}
        onClick={() => onGo(screens[Math.min(screens.length - 1, idx + 1)].id)}>
        <IconChevR size={16}/>
      </button>
    </div>
  );
}

export default App;