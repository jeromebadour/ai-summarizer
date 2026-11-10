/**
 * Distill's own glyphs (BUILD-RULES 2.1 and 2.27), drawn for its world: glass, liquid and drops. One grid for all of
 * them: 24 units, round ends and joins, a 1.5 stroke at the default weight, rounded corners, and a bead or a drop where
 * a glyph needs a point of light. Never a stock icon set.
 *
 * Each glyph takes the props the app already passes: `size`, `strokeWidth` (a relative weight: 2 is the default, so a
 * caller asking for 2.6 to stress a tick still gets a heavier line), `className` and `style`. Glyphs are decoration
 * next to a label, so they are hidden from screen readers unless given an `aria-label`.
 */
import type { CSSProperties, SVGProps } from "react";

export type GlyphProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  style?: CSSProperties;
};
export type GlyphIcon = ((props: GlyphProps) => React.JSX.Element) & { displayName?: string };

const dot = (cx: number, cy: number, r = 1.1) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;
const userHead = '<circle cx="9.5" cy="8.5" r="3.8"/>';
const userBody = '<path d="M3 20a6.5 6.5 0 0 1 10.6-5"/>';
const calendar = '<rect x="4" y="4.5" width="16" height="16" rx="2.5"/><path d="M8 3v3M16 3v3M4 9.5h16"/>';
const fileBase = '<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M14 3.5V8h4"/>';
const timerBase = '<circle cx="12" cy="13.5" r="7"/><path d="M10 3h4M12 3v3.5"/>';
const monitor = '<rect x="3" y="4" width="18" height="12.5" rx="2.5"/><path d="M8.5 20.5h7M12 16.5v4"/>';
const eye = '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>';
const search = '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5l5 5"/>';
const mailTop = '<path d="M21 12V8a2.5 2.5 0 0 0-2.5-2.5h-13A2.5 2.5 0 0 0 3 8v8a2.5 2.5 0 0 0 2.5 2.5H12"/><path d="M3.5 7l8.5 6 8.5-6"/>';
const userCheck = `${userHead}${userBody}<path d="M15 17.5l2 2 4-4"/>`;
const userX = `${userHead}${userBody}<path d="M16.5 15.5l4 4M20.5 15.5l-4 4"/>`;

const drawn = {
  // Distilling and its stages
  FlaskConical: '<path d="M12 3.5c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0c0-3 2-5.5 5-9.5z"/><path d="M9.6 13.6a2.4 2.4 0 0 0 2.4 2.4"/>',
  Send: '<path d="M4 7h9c3.5 0 5 2 5 5v2.5"/><path d="M15.5 12.5l2.5 2.5 2.5-2.5"/><path d="M18 18.4c1 1.2 1.5 1.9 1.5 2.5a1.5 1.5 0 0 1-3 0c0-.6.5-1.3 1.5-2.5z" fill="currentColor" stroke="none"/>',
  PenLine: '<path d="M5 4h14"/><path d="M7 8h10M9 12h6"/><path d="M12 15.5c1.6 2 2.5 3.2 2.5 4.2a2.5 2.5 0 0 1-5 0c0-1 .9-2.2 2.5-4.2z"/>',
  Link2: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  Database: '<path d="M10 3.5h4M10.5 3.5v5L5.8 17.6A2 2 0 0 0 7.6 20.5h8.8a2 2 0 0 0 1.8-2.9L13.5 8.5v-5"/><path d="M7.5 15.5h9"/>',
  ShieldCheck: '<path d="M12 3c3 3.6 6 6.4 6 10a6 6 0 0 1-12 0c0-3.6 3-6.4 6-10z"/><path d="M9.3 13.2l2 2 3.6-4"/>',
  LoaderCircle: `<path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5"/>${dot(12, 3.5, 1.4)}`,
  Sparkles: '<path d="M8 4c1.8 2.3 3 3.8 3 5.5a3 3 0 0 1-6 0C5 7.8 6.2 6.3 8 4z"/><path d="M16.5 9.5c1.6 2 2.5 3.2 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.4.9-2.6 2.5-4.6z"/><circle cx="10" cy="18.6" r="1.5"/>',
  Sparkle: '<path d="M12 4c2.3 3 3.8 4.8 3.8 7a3.8 3.8 0 0 1-7.6 0c0-2.2 1.5-4 3.8-7z"/>',
  Waypoints: `<path d="M4 6h4c3 0 3 4 6 4h6M4 18h4c3 0 3-4 6-4h6"/>${dot(4, 6, 1.2)}${dot(4, 18, 1.2)}`,
  TestTubes: '<path d="M7 3.5h4M8 3.5v13a1.5 1.5 0 0 0 3 0v-13M13 3.5h4M14 3.5v13a1.5 1.5 0 0 0 3 0v-13M8 10h3M14 12h3"/>',
  WandSparkles: '<path d="M9 3h6M10 3v13.5a2 2 0 0 0 4 0V3"/><path d="M10 11.5h4"/>',

  // Input and the composer
  ClipboardPaste: '<path d="M6 10v8a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-8"/><path d="M12 3v9M9 9l3 3 3-3"/>',
  ClipboardCopy: '<rect x="8.5" y="8.5" width="11.5" height="12" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5"/>',
  ClipboardCheck: '<rect x="8.5" y="8.5" width="11.5" height="12" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5"/><path d="M11.5 14.5l2 2 3.5-4"/>',
  Eraser: '<path d="M5 6h14l-1.3 13a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8z"/><path d="M9.5 10.5l5 5M14.5 10.5l-5 5"/>',
  FileText: `${fileBase}<path d="M8.5 12h7M8.5 15.5h5"/>`,
  FileCheck: `${fileBase}<path d="M9 14.5l2 2 4-4"/>`,
  ScrollText: '<path d="M8 20.5h9.5A2.5 2.5 0 0 0 20 18V5.5a2 2 0 0 0-2-2H7A2.5 2.5 0 0 0 4.5 6v1H8"/><path d="M8 5.5v12.5a2.5 2.5 0 0 1-5 0V16h5M11 8.5h5.5M11 12h5.5"/>',
  Binary: '<rect x="4" y="4.5" width="6" height="7" rx="3"/><path d="M15 4.5v7M13.5 6L15 4.5M9 12.5v7M7.5 14L9 12.5"/><rect x="14" y="12.5" width="6" height="7" rx="3"/>',
  Ruler: '<rect x="2.5" y="8" width="19" height="8" rx="2"/><path d="M6.5 8v3M10 8v4M13.5 8v3M17 8v4"/>',
  Layers: '<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z"/><path d="M3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>',

  // Lengths and views
  Minus: '<path d="M7 12h10"/>',
  AlignLeft: '<path d="M5 8h14M5 12h9M5 16h12"/>',
  List: `${dot(6, 7.5, 1.4)}${dot(6, 12, 1.4)}${dot(6, 16.5, 1.4)}<path d="M10 7.5h9M10 12h9M10 16.5h9"/>`,
  Columns2: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M12 4.5v15"/>',
  Rows3: '<rect x="6" y="3.5" width="12" height="17" rx="3"/><path d="M9 8.5h6M9 12h6M9 15.5h6"/>',
  ArrowDownWideNarrow: '<path d="M6 5v13M3.5 15.5L6 18l2.5-2.5"/><path d="M11 6h9M11 11h7M11 16h4"/>',
  SlidersHorizontal: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',

  // Places
  Library: '<path d="M3.5 20.5h17"/><rect x="5" y="9" width="4" height="11.5" rx="1.6"/><rect x="10" y="5.5" width="4" height="15" rx="1.6"/><rect x="15" y="11.5" width="4" height="9" rx="1.6"/>',
  BookOpen: '<path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1V19c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5V20"/>',
  BookOpenText: '<path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1V19c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5V20M5.5 9.6c1.5-.3 3-.2 4 .3M5.5 13c1.5-.3 3-.2 4 .3M14.5 9.9c1-.5 2.5-.6 4-.3"/>',
  Info: `<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/>${dot(12, 7.9, 1.05)}`,
  LayoutDashboard: '<rect x="4" y="4" width="7" height="9" rx="2"/><rect x="13" y="4" width="7" height="5" rx="2"/><rect x="13" y="11" width="7" height="9" rx="2"/><rect x="4" y="15" width="7" height="5" rx="2"/>',
  Server: `<rect x="3.5" y="4" width="17" height="7" rx="2.5"/><rect x="3.5" y="13" width="17" height="7" rx="2.5"/>${dot(7.5, 7.5, 1)}${dot(7.5, 16.5, 1)}<path d="M11.5 7.5h5M11.5 16.5h5"/>`,
  ServerCrash: `<rect x="3.5" y="4" width="17" height="7" rx="2.5"/>${dot(7.5, 7.5, 1)}<path d="M11.5 7.5h5M3.5 17.5v-1A2.5 2.5 0 0 1 6 14h1.5M16.5 14H18a2.5 2.5 0 0 1 2.5 2.5v1A2.5 2.5 0 0 1 18 20h-2M12 13l-1.5 3h3L12 19"/>`,
  ChartColumn: '<path d="M4 4v15.5h16"/><rect x="7.5" y="11" width="3" height="6" rx="1.5"/><rect x="12" y="7" width="3" height="10" rx="1.5"/><rect x="16.5" y="13" width="3" height="4" rx="1.5"/>',
  Gauge: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="M12 13l4-4.5"/><circle cx="12" cy="13.5" r="1.5"/>',
  Cpu: '<rect x="6" y="6" width="12" height="12" rx="3"/><circle cx="12" cy="12" r="2.2"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  Bot: `<rect x="5" y="8" width="14" height="11" rx="3.5"/><path d="M12 8V5.2M3 12.5V15M21 12.5V15"/>${dot(12, 4, 1.1)}${dot(9.3, 13.2, 1.1)}${dot(14.7, 13.2, 1.1)}`,
  CodeXml: '<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14"/>',

  // Time
  Clock3: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  Timer: `${timerBase}<path d="M12 13.5l2.6-3"/>`,
  TimerOff: `${timerBase}<path d="M12 13.5l2.6-3M4 4l16 16"/>`,
  Hourglass: '<path d="M7 3.5h10M7 20.5h10M8 3.5V6a4 4 0 0 0 4 4 4 4 0 0 1 4 4v6.5M16 3.5V6a4 4 0 0 1-4 4 4 4 0 0 0-4 4v6.5"/>',
  CalendarDays: `${calendar}${dot(8.5, 13.5, 1)}${dot(12, 13.5, 1)}${dot(15.5, 13.5, 1)}${dot(8.5, 17, 1)}${dot(12, 17, 1)}`,
  CalendarClock: '<path d="M20 11V7a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 4 7v11a2.5 2.5 0 0 0 2.5 2.5H11"/><path d="M8 3v3M16 3v3M4 9.5h16"/><circle cx="17" cy="17" r="4"/><path d="M17 15.2V17l1.2.8"/>',
  CalendarX: `${calendar}<path d="M9.5 13l5 5M14.5 13l-5 5"/>`,

  // State
  Radio: `${dot(12, 12, 2.1)}<path d="M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6"/>`,
  Check: '<path d="M5.5 12.5l4 4 9-9"/>',
  CircleCheck: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-5"/>',
  CircleX: '<circle cx="12" cy="12" r="8.5"/><path d="M9.3 9.3l5.4 5.4M14.7 9.3l-5.4 5.4"/>',
  Circle: '<circle cx="12" cy="12" r="8.5"/>',
  X: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  Ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  TriangleExclamationPoint: `<path d="M10.3 4.3a2 2 0 0 1 3.4 0l7.6 13.2a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3z"/><path d="M12 9.5V14"/>${dot(12, 17, 1)}`,
  OctagonPause: '<path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z"/><path d="M10 9v6M14 9v6"/>',
  Pause: '<rect x="6.5" y="5" width="3.5" height="14" rx="1.5"/><rect x="14" y="5" width="3.5" height="14" rx="1.5"/>',
  Play: '<path d="M7.5 5v14l11-7z"/>',
  Ellipsis: `${dot(6, 12, 1.4)}${dot(12, 12, 1.4)}${dot(18, 12, 1.4)}`,

  // Moving around
  ArrowLeft: '<path d="M19 12H5.5M11 6.5L5.5 12l5.5 5.5"/>',
  ArrowRight: '<path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5"/>',
  ArrowUpRight: '<path d="M7.5 16.5l9-9M9.5 7.5h7v7"/>',
  ChevronLeft: '<path d="M14.5 6.5L9 12l5.5 5.5"/>',
  ChevronRight: '<path d="M9.5 6.5L15 12l-5.5 5.5"/>',
  ChevronUp: '<path d="M6.5 14.5l5.5-5.5 5.5 5.5"/>',
  RotateCcw: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/>',
  RotateCw: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4.5V9H15"/>',
  Download: '<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5"/><path d="M4.5 16v2A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5v-2"/>',
  MousePointer2: '<path d="M5 4l13.5 6-6 1.5L11 18z"/>',
  Search: search,
  SearchX: `${search}<path d="M8.3 8.3l4.4 4.4M12.7 8.3l-4.4 4.4"/>`,
  ScanSearch: '<path d="M4 8V6.5A2.5 2.5 0 0 1 6.5 4H8M16 4h1.5A2.5 2.5 0 0 1 20 6.5V8M20 16v1.5a2.5 2.5 0 0 1-2.5 2.5H16M8 20H6.5A2.5 2.5 0 0 1 4 17.5V16"/><circle cx="11.5" cy="11.5" r="3"/><path d="M13.7 13.7l2.3 2.3"/>',

  // Account and people
  UserRound: '<circle cx="12" cy="8.5" r="3.8"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  UserCheck: userCheck,
  UserRoundCheck: userCheck,
  UserX: userX,
  UserRoundX: userX,
  UserRoundMinus: `${userHead}${userBody}<path d="M16 17.5h5"/>`,
  UserRoundPlus: `${userHead}${userBody}<path d="M18.5 15v5M16 17.5h5"/>`,
  UserPen: `${userHead}<path d="M3 20a6.5 6.5 0 0 1 9.8-5.6"/><path d="M18.5 12.5l2 2-5 5h-2v-2z"/>`,
  UsersRound: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.5a6 6 0 0 1 3.5 5.5"/>',
  ShieldUser: '<path d="M12 3l7 3v5.5c0 4.5-3 7.6-7 9.5-4-1.9-7-5-7-9.5V6z"/><circle cx="12" cy="10" r="2.3"/><path d="M8.5 16a3.5 3.5 0 0 1 7 0"/>',
  Crown: `<path d="M4 17.5L3 8l5 3.5L12 5l4 6.5L21 8l-1 9.5z"/><path d="M5 20.5h14"/>${dot(12, 13.5, 1.2)}`,
  IdCard: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16a3 3 0 0 1 6 0M14 10h4M14 13.5h3"/>',
  AtSign: '<circle cx="12" cy="12" r="3.6"/><path d="M15.6 12v1.4a2.6 2.6 0 0 0 5.2 0V12a8.8 8.8 0 1 0-3.5 7"/>',
  KeyRound: `<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8l8.3-8.3M16.5 6.5L19 9M14 9l1.5 1.5"/>${dot(7, 16, 1)}`,
  LockKeyhole: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5v-3a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.3"/><path d="M12 16.3V18"/>',
  LogIn: '<path d="M10.5 4.5H17a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-6.5"/><path d="M3.5 12H14M10.5 8.5L14 12l-3.5 3.5"/>',
  LogOut: '<path d="M13.5 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6.5"/><path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5"/>',
  Eye: eye,
  EyeOff: `${eye}<path d="M4 4l16 16"/>`,
  Pencil: '<path d="M15.5 4.5l4 4L9 19l-5 1 1-5z"/><path d="M13 7l4 4"/>',
  Trash2: '<path d="M4.5 6.5h15M9.5 6.5v-2h5v2"/><path d="M6.5 6.5l.9 12.3a2 2 0 0 0 2 1.7h5.2a2 2 0 0 0 2-1.7l.9-12.3M10.3 10.5v6M13.7 10.5v6"/>',
  BriefcaseBusiness: `<rect x="3.5" y="7" width="17" height="12.5" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>${dot(12, 12.5, 1.2)}`,

  // Mail
  Mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  MailCheck: `${mailTop}<path d="M15 18l2 2 4-4"/>`,
  MailOpen: '<path d="M3 10l9-6 9 6v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z"/><path d="M3.5 10.5l8.5 5.5 8.5-5.5"/>',
  MessageSquareText: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-5 4z"/><path d="M8 8.5h8M8 12h5"/>',

  // Devices, money, theme
  Laptop: '<rect x="5" y="5" width="14" height="10" rx="2"/><path d="M2.5 19h19L20 15.5H4z"/>',
  Monitor: monitor,
  MonitorX: `${monitor}<path d="M9.8 8l4.4 4.4M14.2 8l-4.4 4.4"/>`,
  Smartphone: `<rect x="6.5" y="3" width="11" height="18" rx="2.5"/>${dot(12, 17.5, 0.9)}`,
  MapPin: '<path d="M12 21c-3.5-4.2-6.5-7.8-6.5-11a6.5 6.5 0 0 1 13 0c0 3.2-3 6.8-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  Coins: '<ellipse cx="12" cy="7" rx="6.5" ry="2.8"/><path d="M5.5 7v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8V7M5.5 12v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5"/>',
  Calculator: `<rect x="5.5" y="3" width="13" height="18" rx="2.5"/><path d="M8.5 6.5h7v3h-7z"/>${dot(9, 13.5, 0.9)}${dot(12, 13.5, 0.9)}${dot(15, 13.5, 0.9)}${dot(9, 17, 0.9)}${dot(12, 17, 0.9)}${dot(15, 17, 0.9)}`,
  Scale: '<path d="M12 4v16.5M7.5 20.5h9M5 7.5h14"/><path d="M5 7.5L2.5 14a3 3 0 0 0 5 0zM19 7.5L16.5 14a3 3 0 0 0 5 0z"/>',
  Sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1"/>',
  Moon: '<path d="M18.5 14.8A7 7 0 0 1 9.2 5.5a7.5 7.5 0 1 0 9.3 9.3z"/>',

  // The console and preferences
  Activity: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  BrickWall: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v5M15 9.5v5M9 14.5v5"/>',
  CloudUpload: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9a4 4 0 0 1-.5 9.5"/><path d="M12 12v8M9 15l3-3 3 3"/>',
  Compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  DatabaseBackup: '<path d="M10 3.5h4M10.5 3.5v5L5.8 17.6A2 2 0 0 0 7.6 20.5H11M13.5 3.5v5l1.4 2.6"/><path d="M14.5 18a3.2 3.2 0 1 0 .9-2.3M14.5 14v2h2"/>',
  DollarSign: '<path d="M12 3v18"/><path d="M16.5 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7"/>',
  GitCommitHorizontal: '<circle cx="12" cy="12" r="3.2"/><path d="M3 12h5.8M15.2 12H21"/>',
  HardDrive: `<rect x="3" y="12.5" width="18" height="7" rx="2.5"/><path d="M5 12.5l2.5-7h9l2.5 7M11 16h6"/>${dot(7, 16, 1)}`,
  Keyboard: `<rect x="2.5" y="6" width="19" height="12" rx="2.5"/>${dot(7, 10, 0.9)}${dot(10.3, 10, 0.9)}${dot(13.7, 10, 0.9)}${dot(17, 10, 0.9)}<path d="M8 14.5h8"/>`,
  MemoryStick: '<rect x="3" y="6.5" width="18" height="10" rx="2"/><rect x="6.5" y="9.5" width="3" height="4" rx="1"/><rect x="14.5" y="9.5" width="3" height="4" rx="1"/><path d="M6 16.5V19M10 16.5V19M14 16.5V19M18 16.5V19"/>',
  Package: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9M8 5.3l8 4.5"/>',
  Palette: `<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.6-1.8l-.3-1.3a1.6 1.6 0 0 1 1.6-1.9h2.6a3 3 0 0 0 3-3A8.5 8.5 0 0 0 12 3.5z"/>${dot(7.5, 11, 1.1)}${dot(9.5, 7.3, 1.1)}${dot(14, 7, 1.1)}`,
  Plus: '<path d="M12 6v12M6 12h12"/>',
  RadioTower: '<path d="M12 10v10.5M8.5 20.5h7"/><circle cx="12" cy="8.5" r="1.6"/><path d="M8.5 5a5 5 0 0 0 0 7M15.5 5a5 5 0 0 1 0 7M5.7 2.8a8.5 8.5 0 0 0 0 11.4M18.3 2.8a8.5 8.5 0 0 1 0 11.4"/>',
  RefreshCw: '<path d="M19.5 9A7.5 7.5 0 0 0 6 6.8L4.5 8.5M4.5 15A7.5 7.5 0 0 0 18 17.2l1.5-1.7"/><path d="M4.5 4.5v4h4M19.5 19.5v-4h-4"/>',
  TimerReset: '<path d="M10 3h4M12 3v3.5"/><path d="M6.6 9.5A7 7 0 1 1 5 13.5"/><path d="M5 9v3.5h3.5M12 13.5V10"/>',
  Type: '<path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5"/>',
} as const;

export type GlyphName = keyof typeof drawn;

function glyph(name: GlyphName): GlyphIcon {
  const inner = drawn[name];
  function Glyph({ size = 24, strokeWidth = 2, className, style, ...rest }: GlyphProps) {
    const labelled = rest["aria-label"] !== undefined;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={Number(strokeWidth) * 0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden={labelled ? undefined : true}
        role={labelled ? "img" : undefined}
        data-glyph={name}
        {...rest}
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    );
  }
  Glyph.displayName = name;
  return Glyph;
}

export const FlaskConical = glyph("FlaskConical");
export const Send = glyph("Send");
export const PenLine = glyph("PenLine");
export const Link2 = glyph("Link2");
export const Database = glyph("Database");
export const ShieldCheck = glyph("ShieldCheck");
export const LoaderCircle = glyph("LoaderCircle");
export const Sparkles = glyph("Sparkles");
export const Sparkle = glyph("Sparkle");
export const Waypoints = glyph("Waypoints");
export const TestTubes = glyph("TestTubes");
export const WandSparkles = glyph("WandSparkles");
export const ClipboardPaste = glyph("ClipboardPaste");
export const ClipboardCopy = glyph("ClipboardCopy");
export const ClipboardCheck = glyph("ClipboardCheck");
export const Eraser = glyph("Eraser");
export const FileText = glyph("FileText");
export const FileCheck = glyph("FileCheck");
export const ScrollText = glyph("ScrollText");
export const Binary = glyph("Binary");
export const Ruler = glyph("Ruler");
export const Layers = glyph("Layers");
export const Minus = glyph("Minus");
export const AlignLeft = glyph("AlignLeft");
export const List = glyph("List");
export const Columns2 = glyph("Columns2");
export const Rows3 = glyph("Rows3");
export const ArrowDownWideNarrow = glyph("ArrowDownWideNarrow");
export const SlidersHorizontal = glyph("SlidersHorizontal");
export const Library = glyph("Library");
export const BookOpen = glyph("BookOpen");
export const BookOpenText = glyph("BookOpenText");
export const Info = glyph("Info");
export const LayoutDashboard = glyph("LayoutDashboard");
export const Server = glyph("Server");
export const ServerCrash = glyph("ServerCrash");
export const ChartColumn = glyph("ChartColumn");
export const Gauge = glyph("Gauge");
export const Cpu = glyph("Cpu");
export const Bot = glyph("Bot");
export const CodeXml = glyph("CodeXml");
export const Clock3 = glyph("Clock3");
export const Timer = glyph("Timer");
export const TimerOff = glyph("TimerOff");
export const Hourglass = glyph("Hourglass");
export const CalendarDays = glyph("CalendarDays");
export const CalendarClock = glyph("CalendarClock");
export const CalendarX = glyph("CalendarX");
export const Radio = glyph("Radio");
export const Check = glyph("Check");
export const CircleCheck = glyph("CircleCheck");
export const CircleX = glyph("CircleX");
export const Circle = glyph("Circle");
export const X = glyph("X");
export const Ban = glyph("Ban");
export const TriangleExclamationPoint = glyph("TriangleExclamationPoint");
export const OctagonPause = glyph("OctagonPause");
export const Pause = glyph("Pause");
export const Play = glyph("Play");
export const Ellipsis = glyph("Ellipsis");
export const ArrowLeft = glyph("ArrowLeft");
export const ArrowRight = glyph("ArrowRight");
export const ArrowUpRight = glyph("ArrowUpRight");
export const ChevronLeft = glyph("ChevronLeft");
export const ChevronRight = glyph("ChevronRight");
export const ChevronUp = glyph("ChevronUp");
export const RotateCcw = glyph("RotateCcw");
export const RotateCw = glyph("RotateCw");
export const Download = glyph("Download");
export const MousePointer2 = glyph("MousePointer2");
export const Search = glyph("Search");
export const SearchX = glyph("SearchX");
export const ScanSearch = glyph("ScanSearch");
export const UserRound = glyph("UserRound");
export const UserCheck = glyph("UserCheck");
export const UserRoundCheck = glyph("UserRoundCheck");
export const UserX = glyph("UserX");
export const UserRoundX = glyph("UserRoundX");
export const UserRoundMinus = glyph("UserRoundMinus");
export const UserRoundPlus = glyph("UserRoundPlus");
export const UserPen = glyph("UserPen");
export const UsersRound = glyph("UsersRound");
export const ShieldUser = glyph("ShieldUser");
export const Crown = glyph("Crown");
export const IdCard = glyph("IdCard");
export const AtSign = glyph("AtSign");
export const KeyRound = glyph("KeyRound");
export const LockKeyhole = glyph("LockKeyhole");
export const LogIn = glyph("LogIn");
export const LogOut = glyph("LogOut");
export const Eye = glyph("Eye");
export const EyeOff = glyph("EyeOff");
export const Pencil = glyph("Pencil");
export const Trash2 = glyph("Trash2");
export const BriefcaseBusiness = glyph("BriefcaseBusiness");
export const Mail = glyph("Mail");
export const MailCheck = glyph("MailCheck");
export const MailOpen = glyph("MailOpen");
export const MessageSquareText = glyph("MessageSquareText");
export const Laptop = glyph("Laptop");
export const Monitor = glyph("Monitor");
export const MonitorX = glyph("MonitorX");
export const Smartphone = glyph("Smartphone");
export const MapPin = glyph("MapPin");
export const Coins = glyph("Coins");
export const Calculator = glyph("Calculator");
export const Scale = glyph("Scale");
export const Sun = glyph("Sun");
export const Moon = glyph("Moon");
export const Activity = glyph("Activity");
export const BrickWall = glyph("BrickWall");
export const CloudUpload = glyph("CloudUpload");
export const Compass = glyph("Compass");
export const DatabaseBackup = glyph("DatabaseBackup");
export const DollarSign = glyph("DollarSign");
export const GitCommitHorizontal = glyph("GitCommitHorizontal");
export const HardDrive = glyph("HardDrive");
export const Keyboard = glyph("Keyboard");
export const MemoryStick = glyph("MemoryStick");
export const Package = glyph("Package");
export const Palette = glyph("Palette");
export const Plus = glyph("Plus");
export const RadioTower = glyph("RadioTower");
export const RefreshCw = glyph("RefreshCw");
export const TimerReset = glyph("TimerReset");
export const Type = glyph("Type");
