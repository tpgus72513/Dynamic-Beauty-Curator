// src/App.jsx — App shell, router, AppContext

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ENV_DATA } from './data';
import { ScreenLogin } from './screens-login';
import { ScreenOnboarding, ScreenSkinSetup, ScreenHome, ScreenCamera } from './screens-1-4';
import { ScreenAnalyzing, ScreenResult, ScreenRecommendations, ScreenHistory, ScreenMyPage } from './screens-5-9';
import { getRecommend } from './api/client';
import { adaptEnvData } from './api/adapters';
import { clearNickname, readNickname, saveNickname } from './profile';
import { requestUserCamera, stopMediaStream } from './camera';

// ─── Defaults ─────────────────────────────────────────────
const TWEAK_DEFAULTS = {
  palette: 'sage',
  skinPreset: 'dry_sensitive',
  envPreset: 'bad_day',
};

const DEFAULT_LOCATION = {
  lat: 36.62,
  lng: 127.29,
  source: 'demo',
};

// ─── Screen registry ──────────────────────────────────────
const SCREENS = [
  { id: 'login',           label: '00 로그인',   Component: ScreenLogin },
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

  const [route, setRoute] = useState(() => readNickname() ? 'home' : 'login');
  const nav = useMemo(() => ({ go: (r) => setRoute(r) }), []);
  const [user, setUser] = useState(() => ({ nickname: readNickname() }));

  const [permissions, setPermissions] = useState({ location: false, camera: false });
  const [skinProfile, setSkinProfile] = useState({
    type: tweaks.skinPreset || 'dry_sensitive',
    concerns: ['redness', 'dry'],
  });
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationStatus, setLocationStatus] = useState('idle');

  // env: mock으로 시작 → 백엔드 /recommend 응답 오면 실제 데이터로 교체
  const [env, setEnv] = useState(() => buildEnv(tweaks.envPreset));
  const [recommend, setRecommend] = useState(null);
  const [recStatus, setRecStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [recError, setRecError] = useState('');

  const login = useCallback((value) => {
    const nickname = saveNickname(value);
    setUser({ nickname });
    setRoute('onboarding');
  }, []);

  const logout = useCallback(() => {
    clearNickname();
    setUser({ nickname: '' });
    setLastAnalysis(null);
    setRoute('login');
  }, []);

  const requestLocation = useCallback(() => new Promise((resolve) => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      resolve(false);
      return;
    }

    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setRecStatus('loading');
        setRecError('');
        setLocation({
          lat: coords.latitude,
          lng: coords.longitude,
          source: 'device',
        });
        setPermissions(current => ({ ...current, location: true }));
        setLocationStatus('ready');
        resolve(true);
      },
      (error) => {
        console.warn('[location] 현재 위치를 가져오지 못했습니다:', error.message);
        setPermissions(current => ({ ...current, location: false }));
        setLocationStatus('error');
        resolve(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }), []);

  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await requestUserCamera();
      stopMediaStream(stream);
      setPermissions(current => ({ ...current, camera: true }));
      return true;
    } catch {
      setPermissions(current => ({ ...current, camera: false }));
      return false;
    }
  }, []);

  const refreshRecommendation = useCallback(async ({
    skinType = skinProfile.type,
    coords = location,
  } = {}) => {
    setRecStatus('loading');
    setRecError('');

    try {
      const response = await getRecommend({
        lat: coords.lat,
        lng: coords.lng,
        skin_type: skinType,
      });

      setEnv(adaptEnvData(response.env_data));
      setRecommend(response);
      setRecStatus('ok');
    } catch (error) {
      console.error('[recommend] 실패:', error);
      setRecError(error.message);
      setRecStatus('error');
    }
  }, [location, skinProfile.type]);

  useEffect(() => {
    const controller = new AbortController();
    getRecommend({
      lat: location.lat,
      lng: location.lng,
      skin_type: skinProfile.type,
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        setEnv(adaptEnvData(response.env_data));
        setRecommend(response);
        setRecStatus('ok');
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error('[recommend] 실패:', error);
        setRecError(error.message);
        setRecStatus('error');
      });

    return () => controller.abort();
  }, [location.lat, location.lng, skinProfile.type]);

  const ctx = {
    user,
    login,
    logout,
    permissions,
    skinProfile,
    lastAnalysis,
    env,
    recommend,
    recStatus,
    recError,
    location,
    locationStatus,
    requestLocation,
    requestCameraPermission,
    refreshRecommendation,
    set: (patch) => {
      if ('permissions' in patch) setPermissions(patch.permissions);
      if ('skinProfile' in patch) {
        if (patch.skinProfile.type !== skinProfile.type) {
          setRecStatus('loading');
          setRecError('');
        }
        setSkinProfile(patch.skinProfile);
      }
      if ('lastAnalysis' in patch) setLastAnalysis(patch.lastAnalysis);
    },
  };

  const curScreen = SCREENS.find(s => s.id === route);
  const Component = curScreen?.Component;

  return (
    <main className={`app-shell palette-${tweaks.palette}`}>
      <div className="app-root" aria-label="다이내믹 뷰티 큐레이터">
        {Component
          ? <Component key={route} ctx={ctx} nav={nav}/>
          : <div style={{ padding: 24 }}>화면을 찾을 수 없습니다.</div>}
      </div>
    </main>
  );
}

export default App;
