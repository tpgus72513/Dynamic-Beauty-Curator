// src/App.jsx — App shell, router, AppContext

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ENV_DATA } from './data';
import { ScreenLogin } from './screens-login';
import { ScreenOnboarding, ScreenSkinSetup, ScreenHome, ScreenCamera } from './screens-1-4';
import { ScreenAnalyzing, ScreenResult, ScreenRecommendations, ScreenHistory, ScreenMyPage } from './screens-5-9';
import { analyzeSkin, getRecommend } from './api/client';
import { adaptEnvData, adaptSkinAnalysis } from './api/adapters';
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

const createDefaultPermissions = () => ({ location: false, camera: false });
const createDefaultSkinProfile = () => ({
  type: TWEAK_DEFAULTS.skinPreset || 'dry_sensitive',
  concerns: ['redness', 'dry'],
});
const createDefaultLocation = () => ({ ...DEFAULT_LOCATION });

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

  const [permissions, setPermissions] = useState(createDefaultPermissions);
  const [skinProfile, setSkinProfile] = useState(createDefaultSkinProfile);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [analysisError, setAnalysisError] = useState('');
  const analysisControllerRef = useRef(null);
  const analysisImageRef = useRef(null);
  const recommendControllerRef = useRef(null);
  const sessionGenerationRef = useRef(0);
  const permissionGenerationRef = useRef(0);
  const [location, setLocation] = useState(createDefaultLocation);
  const [locationStatus, setLocationStatus] = useState('idle');

  // env: mock으로 시작 → 백엔드 /recommend 응답 오면 실제 데이터로 교체
  const [env, setEnv] = useState(() => buildEnv(tweaks.envPreset));
  const [homeRecommend, setHomeRecommend] = useState(null);
  const [recommend, setRecommend] = useState(null);
  const [recStatus, setRecStatus] = useState(() => readNickname() ? 'loading' : 'idle');
  const [recError, setRecError] = useState('');
  const [recommendRefreshToken, setRecommendRefreshToken] = useState(0);

  const login = useCallback((value) => {
    const nickname = saveNickname(value);
    sessionGenerationRef.current += 1;
    permissionGenerationRef.current += 1;
    recommendControllerRef.current?.abort();
    recommendControllerRef.current = null;
    setUser({ nickname });
    setHomeRecommend(null);
    setRecommend(null);
    setRecStatus('loading');
    setRecError('');
    setRoute('onboarding');
  }, []);

  const logout = useCallback(() => {
    sessionGenerationRef.current += 1;
    permissionGenerationRef.current += 1;
    analysisControllerRef.current?.abort();
    recommendControllerRef.current?.abort();
    analysisControllerRef.current = null;
    recommendControllerRef.current = null;
    analysisImageRef.current = null;
    clearNickname();
    setUser({ nickname: '' });
    setPermissions(createDefaultPermissions());
    setSkinProfile(createDefaultSkinProfile());
    setLastAnalysis(null);
    setAnalysisStatus('idle');
    setAnalysisError('');
    setLocation(createDefaultLocation());
    setLocationStatus('idle');
    setEnv(buildEnv(TWEAK_DEFAULTS.envPreset));
    setHomeRecommend(null);
    setRecommend(null);
    setRecStatus('idle');
    setRecError('');
    setRecommendRefreshToken(0);
    setRoute('login');
  }, []);

  const invalidateAnalysis = useCallback(() => {
    analysisControllerRef.current?.abort();
    analysisControllerRef.current = null;
    analysisImageRef.current = null;
    setLastAnalysis(null);
    setRecommend(null);
    setAnalysisStatus('idle');
    setAnalysisError('');
  }, []);

  const cancelPermissionRequests = useCallback(() => {
    permissionGenerationRef.current += 1;
    setLocationStatus(current => current === 'requesting' ? 'idle' : current);
  }, []);

  const requestLocation = useCallback(() => new Promise((resolve) => {
    const requestGeneration = sessionGenerationRef.current;
    const permissionGeneration = ++permissionGenerationRef.current;
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      resolve(false);
      return;
    }

    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (
          sessionGenerationRef.current !== requestGeneration
          || permissionGenerationRef.current !== permissionGeneration
        ) {
          resolve(false);
          return;
        }
        invalidateAnalysis();
        setRecStatus('loading');
        setRecError('');
        setLocation({
          lat: Number(coords.latitude.toFixed(4)),
          lng: Number(coords.longitude.toFixed(4)),
          source: 'device',
        });
        setPermissions(current => ({ ...current, location: true }));
        setLocationStatus('ready');
        resolve(true);
      },
      (error) => {
        if (
          sessionGenerationRef.current !== requestGeneration
          || permissionGenerationRef.current !== permissionGeneration
        ) {
          resolve(false);
          return;
        }
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
  }), [invalidateAnalysis]);

  const requestCameraPermission = useCallback(async () => {
    const requestGeneration = sessionGenerationRef.current;
    const permissionGeneration = ++permissionGenerationRef.current;
    try {
      const stream = await requestUserCamera();
      stopMediaStream(stream);
      if (
        sessionGenerationRef.current !== requestGeneration
        || permissionGenerationRef.current !== permissionGeneration
      ) return false;
      setPermissions(current => ({ ...current, camera: true }));
      return true;
    } catch {
      if (
        sessionGenerationRef.current !== requestGeneration
        || permissionGenerationRef.current !== permissionGeneration
      ) return false;
      setPermissions(current => ({ ...current, camera: false }));
      return false;
    }
  }, []);

  const startAnalysis = useCallback(async (image) => {
    analysisControllerRef.current?.abort();
    recommendControllerRef.current?.abort();
    recommendControllerRef.current = null;
    const controller = new AbortController();
    analysisControllerRef.current = controller;
    analysisImageRef.current = image;
    setLastAnalysis(null);
    setRecommend(null);
    setAnalysisStatus('uploading');
    setAnalysisError('');
    setRoute('analyzing');

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 60_000);

    try {
      const response = await analyzeSkin({
        image,
        nickname: user.nickname,
        lat: location.lat,
        lng: location.lng,
        skin_type: skinProfile.type,
        signal: controller.signal,
      });
      if (controller.signal.aborted || analysisControllerRef.current !== controller) return;

      setLastAnalysis(adaptSkinAnalysis(response));
      setEnv(adaptEnvData(response.env_data, response.is_fallback));
      setRecommend(response);
      setRecStatus('ok');
      setRecError('');
      setAnalysisStatus('completed');
      analysisImageRef.current = null;
      setRoute('result');
    } catch (error) {
      if (analysisControllerRef.current !== controller) return;
      if (timedOut) {
        setAnalysisError('분석 시간이 초과되었습니다. 다시 시도해 주세요.');
        setAnalysisStatus('error');
      } else if (error.name !== 'AbortError') {
        setAnalysisError(error.message || '피부 분석에 실패했습니다.');
        setAnalysisStatus('error');
      }
    } finally {
      clearTimeout(timeoutId);
      if (analysisControllerRef.current === controller) {
        analysisControllerRef.current = null;
      }
    }
  }, [location.lat, location.lng, skinProfile.type, user.nickname]);

  const retryAnalysis = useCallback(() => {
    if (analysisImageRef.current) startAnalysis(analysisImageRef.current);
  }, [startAnalysis]);

  const cancelAnalysis = useCallback((destination = 'camera') => {
    analysisControllerRef.current?.abort();
    analysisControllerRef.current = null;
    analysisImageRef.current = null;
    setAnalysisStatus('idle');
    setAnalysisError('');
    setRecStatus('loading');
    setRecError('');
    setRecommendRefreshToken(current => current + 1);
    setRoute(destination);
  }, []);

  const refreshRecommendation = useCallback(async ({
    skinType = skinProfile.type,
    coords = location,
  } = {}) => {
    recommendControllerRef.current?.abort();
    const controller = new AbortController();
    recommendControllerRef.current = controller;
    setRecStatus('loading');
    setRecError('');

    try {
      const response = await getRecommend({
        lat: coords.lat,
        lng: coords.lng,
        skin_type: skinType,
        signal: controller.signal,
      });
      if (controller.signal.aborted || recommendControllerRef.current !== controller) return;

      setEnv(adaptEnvData(response.env_data, response.is_fallback));
      setHomeRecommend(response);
      setRecStatus('ok');
    } catch (error) {
      if (error.name === 'AbortError' || recommendControllerRef.current !== controller) return;
      console.error('[recommend] 실패:', error);
      setRecError(error.message);
      setRecStatus('error');
    } finally {
      if (recommendControllerRef.current === controller) {
        recommendControllerRef.current = null;
      }
    }
  }, [location, skinProfile.type]);

  useEffect(() => {
    if (!user.nickname) return undefined;

    recommendControllerRef.current?.abort();
    const controller = new AbortController();
    recommendControllerRef.current = controller;
    getRecommend({
      lat: location.lat,
      lng: location.lng,
      skin_type: skinProfile.type,
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted || recommendControllerRef.current !== controller) return;
        setEnv(adaptEnvData(response.env_data, response.is_fallback));
        setHomeRecommend(response);
        setRecStatus('ok');
      })
      .catch((error) => {
        if (error.name === 'AbortError' || recommendControllerRef.current !== controller) return;
        console.error('[recommend] 실패:', error);
        setRecError(error.message);
        setRecStatus('error');
      });

    return () => {
      controller.abort();
      if (recommendControllerRef.current === controller) {
        recommendControllerRef.current = null;
      }
    };
  }, [location.lat, location.lng, recommendRefreshToken, skinProfile.type, user.nickname]);

  const ctx = {
    user,
    login,
    logout,
    permissions,
    skinProfile,
    lastAnalysis,
    env,
    homeRecommend,
    recommend,
    recStatus,
    recError,
    location,
    locationStatus,
    cancelPermissionRequests,
    requestLocation,
    requestCameraPermission,
    startAnalysis,
    retryAnalysis,
    cancelAnalysis,
    analysisStatus,
    analysisError,
    refreshRecommendation,
    set: (patch) => {
      if ('permissions' in patch) setPermissions(patch.permissions);
      if ('skinProfile' in patch) {
        if (patch.skinProfile.type !== skinProfile.type) {
          invalidateAnalysis();
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
