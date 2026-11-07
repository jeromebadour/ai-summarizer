import type { AdminOverview, AttentionItem, Person } from "@/lib/admin";
import { statsFromLibrary, type Account, type ProfileStats, type SignedInDevice } from "@/lib/profile";
import type { FigureStatus, SavedItem, SourceSentence, Summary, SummaryLength } from "@/lib/summary";

/** "Now" for every sample screen: one day, so the numbers agree everywhere. */
export const sampleToday = "2026-11-07";

/** Invented sample text: shown to guests as "Try sample text" and used by tests. No real people or data. */
export const sampleSentences: SourceSentence[] = [
  { id: 1, paragraph: 1, text: "The city council voted 7 to 2 on Tuesday to convert the old Harbor Street rail yard into a mixed-use district with 1,200 homes, a public park and a small business incubator." },
  { id: 2, paragraph: 1, text: "Construction is expected to begin next spring and finish in phases over six years." },
  { id: 3, paragraph: 2, text: "Supporters said the plan addresses the city's housing shortage while reusing land that has been empty for more than a decade." },
  { id: 4, paragraph: 2, text: "About 30 percent of the new homes will be priced for households earning below the area median income." },
  { id: 5, paragraph: 3, text: "Opponents raised concerns about traffic on the two roads leading into the site and asked for an independent study before the first phase starts." },
  { id: 6, paragraph: 3, text: "The council agreed to fund the study but did not make it a condition for construction." },
  { id: 7, paragraph: 4, text: "The project will be paid for through a mix of private investment and a 40 million dollar state grant awarded last year." },
  { id: 8, paragraph: 4, text: "City officials estimate it will create around 900 permanent jobs once completed." },
];

export const sampleSummary: Summary = {
  title: "Harbor Street rail yard becomes 1,200-home district",
  length: "medium",
  model: "claude-haiku-5-5",
  seconds: 1.4,
  usage: { inputTokens: 412, outputTokens: 236, costUsd: 0.0016 },
  figures: [
    { id: 1, value: "7–2", label: "council vote", sourceIds: [1] },
    { id: 2, value: "1,200", label: "new homes", sourceIds: [1] },
    { id: 3, value: "30%", label: "affordable", sourceIds: [4] },
    { id: 4, value: "$40M", label: "state grant", sourceIds: [7] },
    { id: 5, value: "900", label: "permanent jobs", sourceIds: [8] },
    { id: 6, value: "6 yrs", label: "to build", sourceIds: [2] },
  ],
  points: [
    { id: 1, sourceIds: [1, 2], text: "The council approved, 7 to 2, turning the empty Harbor Street rail yard into a district with 1,200 homes, a park and a business incubator, built in phases over six years from next spring." },
    { id: 2, sourceIds: [4, 7, 8], text: "A third of the homes will be affordable. Private money and a $40M state grant pay for it, and it should bring about 900 permanent jobs." },
    { id: 3, sourceIds: [5, 6], text: "Opponents fear traffic on the two access roads. An independent study is funded, but building will not wait for it." },
  ],
};

export const sampleLibrary: SavedItem[] = [
  { id: "a1", date: "2026-11-07", title: sampleSummary.title, length: "medium", createdAt: "Today 11:52", wordsIn: 159, wordsOut: 80, figureStatus: "checked", preview: sampleSummary.points[0].text, keyFigures: ["7–2", "1,200", "$40M"] },
  { id: "a2", date: "2026-11-07", title: "Quarterly churn rose to 4.1% after the price change", length: "bullets", createdAt: "Today 10:07", wordsIn: 1240, wordsOut: 96, figureStatus: "checked", preview: "Churn climbed from 2.8% to 4.1% in the quarter after the new pricing, mostly among monthly plans.", keyFigures: ["4.1%", "2.8%", "61%"] },
  { id: "a3", date: "2026-11-06", title: "Draft lease: notice period and deposit terms", length: "short", createdAt: "Yesterday 18:31", wordsIn: 2210, wordsOut: 41, figureStatus: "flagged", preview: "Either side can end the lease with 60 days' notice; the deposit is two months' rent, returned within 30 days.", keyFigures: ["60 days", "2 mo", "30 days"] },
  { id: "a4", date: "2026-11-06", title: "Why the onboarding flow loses users at step three", length: "medium", createdAt: "Yesterday 09:15", wordsIn: 860, wordsOut: 118, figureStatus: "none", preview: "Users drop off when asked to connect a calendar before they have seen any value from the product.", keyFigures: [] },
  { id: "a5", date: "2026-11-05", title: "Battery recycling plant gets regional approval", length: "short", createdAt: "Nov 5", wordsIn: 640, wordsOut: 38, figureStatus: "checked", preview: "The regional board approved the plant, which will process 20,000 tonnes a year from 2028.", keyFigures: ["20,000 t", "2028"] },
  { id: "a6", date: "2026-11-04", title: "Team retro: release delays and what we change", length: "bullets", createdAt: "Nov 4", wordsIn: 1530, wordsOut: 104, figureStatus: "none", preview: "Releases slipped because reviews queued behind one approver; the team adds a second reviewer per area.", keyFigures: [] },
  { id: "a7", date: "2026-11-02", title: "Grant application rules for small studios", length: "medium", createdAt: "Nov 2", wordsIn: 3020, wordsOut: 132, figureStatus: "checked", preview: "Studios under 10 people can apply for up to 50,000 once a year, with a deadline at the end of March.", keyFigures: ["10", "50,000", "31 Mar"] },
];

/** Twenty more invented items, so the library shows paging the way a long-time user sees it. */
const olderLibrary: [string, SummaryLength, number, number, FigureStatus, string, string[]][] = [
  ["Supplier contract: late delivery penalties", "short", 1880, 44, "checked", "Late deliveries cost the supplier 2% of the order value per week, capped at 10%.", ["2%", "10%"]],
  ["City bike lanes: first-year results", "medium", 940, 112, "checked", "Cycling on the new lanes doubled in a year while car traffic on the same streets fell by 8%.", ["2x", "8%"]],
  ["Interview notes: why teams switch tools", "bullets", 2600, 150, "none", "Teams switch when sharing becomes painful, not because of price; most move after a missed deadline.", []],
  ["Coffee chain opens its first roastery", "short", 520, 36, "checked", "The chain will roast 300 tonnes a year in-house, cutting supply costs by about a fifth.", ["300 t", "1/5"]],
  ["School lunch programme budget review", "medium", 1720, 124, "flagged", "The programme feeds 12,000 pupils a day; the review asks for 6% more to keep portions the same.", ["12,000", "6%"]],
  ["Product launch checklist from the last release", "bullets", 1310, 98, "none", "Freeze copy a week out, test payment flows on real cards, and keep one person on support all launch day.", []],
  ["Museum extends opening hours on Fridays", "short", 410, 31, "checked", "The museum will stay open until 22:00 on Fridays from March, after a trial drew 40% more visitors.", ["22:00", "40%"]],
  ["Remote work policy: what changed", "medium", 2050, 131, "none", "Staff can work remotely three days a week; team days are set per team, not company-wide.", ["3 days"]],
  ["Warehouse automation pilot results", "medium", 2380, 140, "checked", "Picking errors fell from 1.9% to 0.4% in the pilot, and orders left the building 25 minutes sooner.", ["1.9%", "0.4%", "25 min"]],
  ["Customer support: top five ticket causes", "bullets", 1150, 88, "none", "Most tickets are about invoices, password resets and plan changes; the first two can be self-serve.", []],
  ["River clean-up volunteers break a record", "short", 600, 35, "checked", "1,400 volunteers removed 18 tonnes of waste along 30 km of riverbank in one weekend.", ["1,400", "18 t", "30 km"]],
  ["Pricing page test: annual plans first", "short", 780, 42, "flagged", "Showing annual plans first raised annual sign-ups to 38% of new customers, up from 24%.", ["38%", "24%"]],
  ["Board meeting: hiring plan for next year", "medium", 1990, 128, "none", "The board approved twelve new roles, mostly in engineering, with hiring spread across two halves.", ["12"]],
  ["Train timetable changes from December", "short", 530, 33, "checked", "Morning trains will run every 10 minutes instead of 15 on the main line from 8 December.", ["10 min", "15 min"]],
  ["Design review: settings page feedback", "bullets", 1420, 102, "none", "Reviewers asked for fewer toggles, clearer labels and a search box once the list passes twenty items.", []],
  ["Solar farm connects to the regional grid", "short", 690, 39, "checked", "The 45 MW farm now powers about 14,000 homes and was connected four months ahead of plan.", ["45 MW", "14,000"]],
  ["Security audit summary for the web app", "medium", 2710, 146, "none", "The audit found no critical issues; two medium ones about session expiry are fixed this sprint.", []],
  ["Library renovation: reading rooms reopen", "short", 470, 30, "checked", "The two upstairs reading rooms reopen on Monday with 120 seats and longer weekend hours.", ["120"]],
  ["Quarterly marketing results by channel", "bullets", 1660, 110, "checked", "Search brought half of new customers; newsletters cost the least per sign-up at 3.10.", ["50%", "3.10"]],
  ["Hospital adds evening clinic hours", "short", 580, 34, "checked", "Outpatient clinics will see patients until 20:00 on weekdays, adding about 300 slots a week.", ["20:00", "300"]],
];
const olderDays = [1, 31, 30, 29, 28, 27, 25, 24, 23, 22, 21, 20, 18, 17, 16, 15, 14, 13, 11, 10];

export const sampleLongLibrary: SavedItem[] = [
  ...sampleLibrary,
  ...olderLibrary.map(([title, length, wordsIn, wordsOut, figureStatus, preview, keyFigures], index) => ({
    id: `b${index + 1}`,
    title,
    length,
    createdAt: index === 0 ? "Nov 1" : `Oct ${olderDays[index]}`,
    date: index === 0 ? "2026-11-01" : `2026-10-${String(olderDays[index]).padStart(2, "0")}`,
    wordsIn,
    wordsOut,
    figureStatus,
    preview,
    keyFigures,
  })),
];

export const sampleAccount: Account = {
  name: "Maya Klein",
  username: "maya_k",
  email: "maya.k@example.com",
  avatarColour: "teal",
  memberSince: "Oct 2026",
  isGuest: false,
  role: "user",
};

/** Maya's profile numbers come from her own library, the same way the app computes them from her rows. */
export const sampleStats: ProfileStats = statsFromLibrary(sampleLongLibrary, sampleToday, 38);

export const sampleDevices: SignedInDevice[] = [
  { id: "s1", kind: "desktop", browser: "Chrome 142", os: "Windows 11", place: "Istanbul, TR", lastActive: "Now", current: true },
  { id: "s2", kind: "phone", browser: "Safari", os: "iOS 19", place: "Istanbul, TR", lastActive: "2 h ago", current: false },
  { id: "s3", kind: "laptop", browser: "Firefox 145", os: "macOS", place: "Ankara, TR", lastActive: "Nov 3", current: false },
];

export const samplePasswordChanged = "3 weeks ago";

export const sampleGuest: Account = {
  name: "Guest",
  username: "guest",
  email: "",
  avatarColour: "steel",
  memberSince: "today 13:42",
  isGuest: true,
  role: "guest",
};

export const sampleGuestStats: ProfileStats = {
  summaries: 3,
  wordsIn: 2140,
  wordsOut: 226,
  figuresChecked: 11,
  figuresFlagged: 0,
  lengthMix: { short: 1, medium: 2, bullets: 0 },
  lengthShorter: { short: 95, medium: 88, bullets: 0 },
  daily: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
  accountDays: 1,
};

export const sampleOwner: Account = {
  name: "Jerome Badour",
  username: "jerome",
  email: "jerome@example.com",
  avatarColour: "indigo",
  memberSince: "Sep 2026",
  isGuest: false,
  role: "owner",
};

export const people: Record<string, Person> = {
  maya: { id: "u2", name: "Maya Klein", username: "maya_k", avatarColour: "teal", role: "user" },
  oliver: { id: "u7", name: "Oliver Hart", username: "oliver_h", avatarColour: "sand", role: "user" },
  lena: { id: "u4", name: "Lena Schmidt", username: "lena_s", avatarColour: "plum", role: "moderator" },
  noah: { id: "u9", name: "Noah Becker", username: "noahb", avatarColour: "steel", role: "user" },
  kevin: { id: "u6", name: "Kevin Novak", username: "kevin_n", avatarColour: "sand", role: "user" },
  jerome: { id: "u1", name: "Jerome Badour", username: "jerome", avatarColour: "indigo", role: "owner" },
  guest: { id: "g31", name: "Guest 31", username: "guest-31", avatarColour: "steel", role: "guest" },
};

export const sampleOverview: AdminOverview = {
  today: sampleToday,
  users: { registered: 128 },
  guests: { active: 37, today: 9, upgradedWeek: 4 },
  active: { now: 6, week: 41 },
  spend: { capUsd: 8, workspaceCapUsd: 10 },
  limitsHit: { today: 4, users: 3, guests: 1 },
  daily: {
    signups: [1, 0, 2, 4, 1, 0, 3, 2, 5, 1, 2, 4, 2, 3],
    summaries: [22, 18, 31, 40, 27, 12, 35, 48, 52, 39, 44, 61, 58, 64],
    spendCents: [6, 5, 9, 12, 8, 4, 10, 14, 15, 11, 13, 18, 16, 17],
  },
  server: {
    health: "comfortable",
    host: { os: "Ubuntu 24.04", kernel: "6.8.0-149", region: "Singapore", cpus: 6, memoryGb: 12, diskGb: 200, uptime: "12 days" },
    cpu: 7,
    load: 0.42,
    memory: 38,
    disk: 14,
    series: {
      cpu: [4, 2, 2, 2, 4, 5, 6, 10, 8, 10, 10, 11, 11, 11, 13, 10, 8, 7, 6, 5, 3, 5, 2, 2, 2, 2, 2, 2, 6, 5, 6, 7, 8, 10, 10, 14, 11, 11, 10, 10, 8, 7, 9, 5, 4, 2, 2, 7],
      load: [0.35, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.44, 0.32, 0.4, 0.45, 0.49, 0.5, 0.49, 0.65, 0.4, 0.32, 0.24, 0.15, 0.15, 0.15, 0.35, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.35, 0.15, 0.15, 0.24, 0.32, 0.4, 0.45, 0.69, 0.5, 0.49, 0.45, 0.4, 0.32, 0.24, 0.35, 0.15, 0.15, 0.15, 0.15, 0.42],
      memory: [32, 33, 33, 34, 35, 36, 36, 37, 37, 37, 37, 37, 36, 36, 35, 34, 34, 33, 32, 32, 32, 32, 32, 32, 33, 33, 34, 35, 36, 36, 37, 38, 38, 38, 38, 38, 37, 37, 36, 35, 34, 34, 33, 33, 36, 37, 37, 38],
      disk: [13.6, 13.6, 13.6, 13.6, 13.6, 13.6, 13.7, 13.7, 13.7, 13.7, 13.7, 13.7, 13.7, 13.7, 13.7, 13.7, 13.7, 13.7, 13.8, 13.8, 13.8, 13.8, 13.8, 13.8, 13.8, 13.8, 13.8, 13.8, 13.8, 13.8, 13.9, 13.9, 13.9, 13.9, 13.9, 13.9, 13.9, 13.9, 13.9, 13.9, 13.9, 13.9, 14.0, 14.0, 14.0, 14.0, 14.0, 14],
    },
    database: { up: true, sizeMb: 42, connections: 6, maxConnections: 100, largestTable: { name: "summaries", sizeMb: 31 } },
    claude: { avgSeconds: 1.9, p95Seconds: 3.4, failedToday: 1, lastFailure: { at: "11:02", code: "529 overloaded" } },
    app: { commit: "4f2a9c1", deployedAt: "Nov 7, 09:40", next: "16.4.5", node: "22.23" },
    backup: {
      last: "03:00",
      restoreTested: "Nov 7",
      restoreSeconds: 38,
      target: "Off the box, encrypted",
      keepDays: 30,
      next: "03:00 tomorrow",
      recent: [
        { id: "b5", at: "Today 03:00", sizeMb: 41, ok: true },
        { id: "b4", at: "Nov 6, 03:00", sizeMb: 40, ok: true },
        { id: "b3", at: "Nov 5, 03:00", sizeMb: 39, ok: true },
        { id: "b2", at: "Nov 4, 03:00", sizeMb: 38, ok: true },
      ],
    },
    security: { firewallPorts: [22, 80, 443], bannedNow: 3, bannedToday: 17, updatesPending: 0, httpsUntil: "Feb 5, 2027" },
    httpsDays: 90,
  },
  attention: [],

};

export const sampleOverviewAttention: AttentionItem[] = [
  { id: "a1", kind: "errors", title: "Claude requests failing", detail: "9 of 73 requests failed today (overloaded, 529), all since 12:10" },
];

/** The same day with Claude failing: the attention bar, the amber Claude line and the Server tab all agree. */
export const sampleOverviewTrouble: AdminOverview = {
  ...sampleOverview,
  attention: sampleOverviewAttention,
  server: {
    ...sampleOverview.server,
    claude: { avgSeconds: 4.8, p95Seconds: 11.2, failedToday: 9, lastFailure: { at: "12:29", code: "529 overloaded" } },
  },
};
