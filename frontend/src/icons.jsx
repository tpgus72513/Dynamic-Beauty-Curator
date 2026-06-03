/* eslint-disable */
// src/icons.jsx — inline SVG icon set
// Stroke-based 1.6 width, 24px viewBox. Sized via prop.

const Icon = ({ children, size = 22, stroke = 'currentColor', fill = 'none', sw = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

const IconLocation = (p) => (<Icon {...p}><path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></Icon>);
const IconCamera = (p) => (<Icon {...p}><path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/></Icon>);
const IconBell = (p) => (<Icon {...p}><path d="M6 8a6 6 0 1 1 12 0v5l1.5 3h-15L6 13V8Z"/><path d="M10 19a2 2 0 0 0 4 0"/></Icon>);
const IconUser = (p) => (<Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></Icon>);
const IconHistory = (p) => (<Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v5l3 2"/></Icon>);
const IconCheck = (p) => (<Icon {...p}><path d="M5 12.5l4.5 4.5L19 7"/></Icon>);
const IconClose = (p) => (<Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>);
const IconChevR = (p) => (<Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>);
const IconChevL = (p) => (<Icon {...p}><path d="M15 6l-6 6 6 6"/></Icon>);
const IconChevD = (p) => (<Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>);
const IconStar = (p) => (<Icon {...p} fill="currentColor" sw={0}><path d="M12 2l2.9 6.3 6.8.7-5 4.7 1.4 6.8L12 17l-6.1 3.5 1.4-6.8-5-4.7 6.8-.7L12 2Z"/></Icon>);
const IconStarOutline = (p) => (<Icon {...p}><path d="M12 2.5l2.7 6 6.5.6-4.9 4.5 1.4 6.4L12 16.6l-5.7 3.4 1.4-6.4L2.8 9.1l6.5-.6L12 2.5Z"/></Icon>);
const IconHeart = (p) => (<Icon {...p}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></Icon>);
const IconFilter = (p) => (<Icon {...p}><path d="M4 6h16M7 12h10M10 18h4"/></Icon>);
const IconSearch = (p) => (<Icon {...p}><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-3.5-3.5"/></Icon>);
const IconSun = (p) => (<Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/></Icon>);
const IconDust = (p) => (<Icon {...p}><path d="M4 8h12a3 3 0 1 0-3-3"/><path d="M2 12h16a3 3 0 1 1-3 3"/><path d="M4 16h10"/></Icon>);
const IconDrop = (p) => (<Icon {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></Icon>);
const IconTemp = (p) => (<Icon {...p}><path d="M14 14V5a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0Z"/></Icon>);
const IconSettings = (p) => (<Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></Icon>);
const IconSparkle = (p) => (<Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></Icon>);
const IconFace = (p) => (<Icon {...p}><circle cx="12" cy="12" r="9"/><circle cx="9" cy="11" r=".5" fill="currentColor"/><circle cx="15" cy="11" r=".5" fill="currentColor"/><path d="M9 15.5c1.5 1 4.5 1 6 0"/></Icon>);
const IconMap = (p) => (<Icon {...p}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></Icon>);
const IconPlus = (p) => (<Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>);
const IconArrowR = (p) => (<Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>);
const IconEdit = (p) => (<Icon {...p}><path d="M14 4l6 6L9 21H3v-6L14 4Z"/></Icon>);
const IconShield = (p) => (<Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/></Icon>);
const IconLeaf = (p) => (<Icon {...p}><path d="M20 4c0 8-5 14-13 14-2 0-3-1-3-3 0-8 5-14 13-14 2 0 3 1 3 3Z"/><path d="M4 20c2-4 6-8 12-10"/></Icon>);
const IconTrend = (p) => (<Icon {...p}><path d="M3 17l5-5 4 4 8-9"/><path d="M14 7h6v6"/></Icon>);
const IconInfo = (p) => (<Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 8v.5"/></Icon>);
const IconRefresh = (p) => (<Icon {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></Icon>);

export {
  IconLocation, IconCamera, IconBell, IconUser, IconHistory,
  IconCheck, IconClose, IconChevR, IconChevL, IconChevD,
  IconStar, IconStarOutline, IconHeart, IconFilter, IconSearch,
  IconSun, IconDust, IconDrop, IconTemp, IconSettings,
  IconSparkle, IconFace, IconMap, IconPlus, IconArrowR,
  IconEdit, IconShield, IconLeaf, IconTrend, IconInfo, IconRefresh,
};