// src/data.jsx — mock data for demo
// Realistic Korean placeholder content for K-beauty curator demo

// ─── skin types ────────────────────────────────────────────
const SKIN_TYPES = [
  { id: 'dry',          label: '건성',     desc: '당김·각질이 자주 느껴져요' },
  { id: 'oily',         label: '지성',     desc: 'T존이 빠르게 번들거려요' },
  { id: 'combination',  label: '복합성',   desc: 'T존은 유분, U존은 건조해요' },
  { id: 'sensitive',    label: '민감성',   desc: '쉽게 붉어지고 따가워요' },
  { id: 'dry_sensitive',label: '건성·민감', desc: '건조하고 자극에도 약해요' },
  { id: 'oily_sensitive', label: '지성·민감', desc: '번들거리지만 트러블이 잦아요' },
];

const CONCERNS = [
  { id: 'acne',     label: '여드름·트러블' },
  { id: 'redness',  label: '홍조·붉음' },
  { id: 'pigment',  label: '색소·기미' },
  { id: 'dullness', label: '칙칙함' },
  { id: 'pores',    label: '모공' },
  { id: 'wrinkles', label: '주름' },
  { id: 'dry',      label: '건조' },
  { id: 'sebum',    label: '피지' },
];

// ─── environmental data (mock for 조치원읍 demo) ───────────
const ENV_DATA = {
  region: '조치원읍',
  fullRegion: '세종시 조치원읍',
  updatedAt: '오전 7:32',
  pm25: { value: 87, label: '매우나쁨', level: 'vbad', unit: '㎍/㎥' },
  uv:   { value: 6,  label: '높음',     level: 'bad',  unit: 'UVI' },
  water:{ value: '주의', label: '주의',  level: 'mid',  unit: '' },
  temp: { value: 18, label: '쌀쌀',     level: 'good', unit: '°C' },
  humidity: { value: 42, label: '낮음',  level: 'mid',  unit: '%' },
};

// ─── skin analysis result (mock) — 4 specific factors ─────
const SKIN_ANALYSIS = {
  overall: 72,
  factors: [
    { id: 'pigment',  label: '색소 침착', score: 38, level: 'low',  delta: -4,
      desc: '왼쪽 광대·이마 부근 색소 감지' },
    { id: 'dryness',  label: '건조',     score: 48, level: 'low',  delta: -6,
      desc: '볼·턱 라인 수분 부족' },
    { id: 'pores',    label: '모공',     score: 55, level: 'mid',  delta: 0,
      desc: 'T존 모공 확장 경미' },
    { id: 'wrinkle',  label: '주름',     score: 78, level: 'good', delta: +1,
      desc: '눈가 미세주름 양호' },
  ],
  detected: ['건조', '색소 침착', '모공 확장'],
  message: '오늘 조치원은 미세먼지가 매우 나쁘고 자외선이 높아요. 색소 침착·건조 케어를 우선으로 추천드려요.',
};

// ─── recommendations ──────────────────────────────────────
const PRODUCTS = [
  {
    id: 'p1',
    brand: 'CICALAB',
    name: '시카 진정 크림 50ml',
    price: 18900,
    originalPrice: 24000,
    rating: 4.8,
    reviewCount: 2431,
    match: 94,
    category: '진정·보습',
    ingredients: ['센텔라', '판테놀', '마데카소사이드'],
    avoid: false,
    reviewExcerpt: '미세먼지 심한 날 외출 후 발랐더니 다음날 아침 진정된 게 느껴져요.',
    why: ['민감 피부에 안전', '미세먼지 후 진정', '저자극 처방'],
    tag: 'best',
  },
  {
    id: 'p2',
    brand: 'PUREDEW',
    name: '하이드라 부스터 토너 200ml',
    price: 22000,
    originalPrice: null,
    rating: 4.7,
    reviewCount: 1820,
    match: 91,
    category: '보습',
    ingredients: ['히알루론산', '판테놀', '세라마이드'],
    avoid: false,
    reviewExcerpt: '건조한 날 즉각 흡수되고 끈적임 없어서 매일 두 번씩 쓰고 있어요.',
    why: ['낮은 습도에 효과적', '건성 피부 매칭', '무알코올'],
    tag: null,
  },
  {
    id: 'p3',
    brand: 'AQUACLEAR',
    name: '딥 클렌징 폼 150ml',
    price: 15500,
    originalPrice: null,
    rating: 4.6,
    reviewCount: 945,
    match: 88,
    category: '클렌징',
    ingredients: ['BHA 0.5%', '녹차 추출물', '판테놀'],
    avoid: false,
    reviewExcerpt: '황사 심한 날 외출 후 쓰면 개운한데 자극은 없어요. 재구매 의사 있음.',
    why: ['미세먼지 87 ㎍/㎥', '딥클렌징 카테고리', '저자극 BHA'],
    tag: 'new',
  },
  {
    id: 'p4',
    brand: 'SOLVEIL',
    name: '데일리 인비저블 선젤 SPF50+',
    price: 19800,
    originalPrice: 26000,
    rating: 4.9,
    reviewCount: 5210,
    match: 86,
    category: '선케어',
    ingredients: ['나이아신아마이드', '비타민E'],
    avoid: false,
    reviewExcerpt: '백탁 없고 끈적임도 없어서 매일 챙겨 발라요. 자외선 강한 날 필수.',
    why: ['UVI 6 — 높음', '백탁·끈적임 없음', '데일리 필수'],
    tag: 'best',
  },
  {
    id: 'p5',
    brand: 'BARRIERA',
    name: '세라마이드 리페어 앰플 30ml',
    price: 34000,
    originalPrice: null,
    rating: 4.7,
    reviewCount: 712,
    match: 83,
    category: '에센스',
    ingredients: ['세라마이드 NP', '콜레스테롤', '판테놀'],
    avoid: false,
    reviewExcerpt: '장벽 무너진 느낌일 때 발라요. 다음 날 아침 결이 정돈된 느낌.',
    why: ['장벽 강화', '건성·민감 매칭', '고농도 세라마이드'],
    tag: null,
  },
  {
    id: 'p6',
    brand: 'PUREDEW',
    name: '판테놀 5% 수딩 미스트 100ml',
    price: 12500,
    originalPrice: null,
    rating: 4.5,
    reviewCount: 1106,
    match: 79,
    category: '미스트',
    ingredients: ['판테놀 5%', '알란토인'],
    avoid: false,
    reviewExcerpt: '낮 시간 건조할 때 뿌리면 즉시 진정돼요. 휴대용으로 들고다녀요.',
    why: ['실시간 진정', '저자극', '휴대성'],
    tag: null,
  },
];

const AVOID_INGREDIENTS = [
  { name: '고농도 AHA (10%+)', reason: '오늘 자외선 높음 — 광민감 우려' },
  { name: '향료·에센셜오일',   reason: '민감도 점수 78 — 자극 가능' },
];

// ─── history (past analyses) ──────────────────────────────
const HISTORY = [
  { date: '2026.05.20', day: '오늘', region: '조치원읍', overall: 72, pm25: 87, uv: 6, top: '시카 진정 크림' },
  { date: '2026.05.18', day: '월',   region: '조치원읍', overall: 76, pm25: 52, uv: 5, top: '하이드라 토너' },
  { date: '2026.05.15', day: '금',   region: '서울 마포구', overall: 70, pm25: 95, uv: 7, top: '딥클렌징 폼' },
  { date: '2026.05.12', day: '화',   region: '조치원읍', overall: 74, pm25: 38, uv: 4, top: '세라마이드 앰플' },
  { date: '2026.05.10', day: '일',   region: '조치원읍', overall: 78, pm25: 24, uv: 3, top: '데일리 선젤' },
  { date: '2026.05.07', day: '목',   region: '조치원읍', overall: 75, pm25: 65, uv: 6, top: '시카 진정 크림' },
];

// trend points for hydration over 7 sessions (0-100)
const TREND_HYDRATION = [42, 48, 51, 49, 55, 52, 48];
const TREND_OVERALL   = [70, 74, 76, 75, 78, 76, 72];

// ─── notification settings ────────────────────────────────
const NOTIF_DEFAULTS = [
  { id: 'pm25_alert',  label: '미세먼지 경보',    desc: '거주 지역 PM2.5 75 이상일 때 알림', value: true },
  { id: 'uv_alert',    label: '자외선 강함 알림', desc: 'UVI 7 이상일 때 외출 전 알림',     value: true },
  { id: 'morning',     label: '아침 루틴 리마인더', desc: '매일 오전 7:30 맞춤 추천',          value: true },
  { id: 'evening',     label: '저녁 루틴 리마인더', desc: '매일 오후 10:00 클렌징 추천',       value: false },
  { id: 'new_product', label: '신상 추천',         desc: '내 피부 타입에 맞는 신제품',         value: false },
];

export {
  SKIN_TYPES, CONCERNS, ENV_DATA, SKIN_ANALYSIS,
  PRODUCTS, AVOID_INGREDIENTS, HISTORY,
  TREND_HYDRATION, TREND_OVERALL, NOTIF_DEFAULTS,
};