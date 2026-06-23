import { navigate } from './router.js';

const TOUR_KEY    = 'pl_tour_done';
const CHAPTER_KEY = 'pl_tour_chapter';

// ── CDN loaders ───────────────────────────────────────────────────────────────

const DRIVER_JS_CDNS = [
  'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.js.iife.js',
  'https://unpkg.com/driver.js@1.3.1/dist/driver.js.iife.js',
];
const DRIVER_CSS_CDNS = [
  'https://cdn.jsdelivr.net/npm/driver.js@1.3.1/dist/driver.css',
  'https://unpkg.com/driver.js@1.3.1/dist/driver.css',
];

function loadLink(hrefs) {
  return new Promise(resolve => {
    if (document.getElementById('driver-css')) { resolve(); return; }
    const try_ = (i) => {
      if (i >= hrefs.length) { resolve(); return; }
      const l = Object.assign(document.createElement('link'), { id: 'driver-css', rel: 'stylesheet', href: hrefs[i] });
      l.onload = resolve;
      l.onerror = () => { l.remove(); try_(i + 1); };
      document.head.appendChild(l);
    };
    try_(0);
  });
}

function loadScript(srcs) {
  return new Promise((resolve, reject) => {
    if (window.driver) { resolve(); return; }
    const try_ = (i) => {
      if (i >= srcs.length) { reject(new Error('Driver.js unavailable')); return; }
      const s = Object.assign(document.createElement('script'), { src: srcs[i] });
      s.onload = resolve;
      s.onerror = () => { s.remove(); try_(i + 1); };
      document.head.appendChild(s);
    };
    try_(0);
  });
}

async function loadDriver() {
  await Promise.all([loadLink(DRIVER_CSS_CDNS), loadScript(DRIVER_JS_CDNS)]);
}

// ── DOM helper ────────────────────────────────────────────────────────────────

function waitForEl(selector, timeout = 5000) {
  return new Promise(resolve => {
    const el = document.querySelector(selector);
    if (el) { resolve(el); return; }
    const obs = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) { obs.disconnect(); resolve(found); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(null); }, timeout);
  });
}

// ── State helpers ─────────────────────────────────────────────────────────────

export function tourCompleted()  { return localStorage.getItem(TOUR_KEY) === '1'; }
export function resetTour()      { localStorage.removeItem(TOUR_KEY); localStorage.removeItem(CHAPTER_KEY); }

function getChapter()            { return parseInt(localStorage.getItem(CHAPTER_KEY) ?? '-1', 10); }
function setChapter(n)           { localStorage.setItem(CHAPTER_KEY, String(n)); }
function completeTour()          { localStorage.setItem(TOUR_KEY, '1'); localStorage.removeItem(CHAPTER_KEY); }

// ── Chapter → page mapping ───────────────────────────────────────────────────
// Chapter 0 = welcome (no specific page), chapters 1-6 each own a page.

const PAGE_CHAPTER = {
  '/settings':  1,
  '/pests':     2,
  '/farms':     3,
  '/traps':     4,
  '/sessions':  5,
  '/dashboard': 6,
};

// Guard selector that must exist before a chapter's steps can run
const CHAPTER_GUARD = {
  1: '#add-trap-btn',
  2: '#addPestBtn',
  3: '#addFarmBtn',
  4: '#addTrapBtn',
  5: '#planSessionBtn',
  6: '#dashStats',
};

// ── Driver factory ────────────────────────────────────────────────────────────

function makeDriver(steps, onDone) {
  const { driver } = window.driver.js;
  let destroyed = false;

  const d = driver({
    showProgress:    true,
    progressText:    '{{current}} of {{total}}',
    nextBtnText:     'Next →',
    prevBtnText:     '← Back',
    doneBtnText:     'Continue →',
    allowClose:      true,
    overlayOpacity:  0.7,
    smoothScroll:    true,
    onDestroyStarted: () => {
      if (!destroyed) { destroyed = true; onDone?.('skip'); }
      d.destroy();
    },
    steps,
  });

  return d;
}

// ── CHAPTER DEFINITIONS ──────────────────────────────────────────────────────
// Each chapter function returns a Driver instance and calls drive().
// The last step's onNextClick navigates to the next page / marks done.

// ── Chapter 0: Welcome + Sidebar ─────────────────────────────────────────────
function runChapter0() {
  const steps = [
    {
      popover: {
        title: '👋 Welcome to PestLook!',
        description: `
          <p style="margin:0 0 10px;line-height:1.7;font-size:0.9rem;">
            Let's walk you through the full setup — from trap types and pest thresholds right through
            to your first scouting session. It takes about <strong>2 minutes</strong>.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            You can quit at any time and restart from <strong>Help → Retake Tour</strong>.
          </p>`,
        side: 'over', align: 'center',
      },
    },
    {
      element: '#sidebar',
      popover: {
        title: '🗺️ Your Navigation Hub',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Everything in PestLook is accessed from this sidebar. We'll work through each section
            <strong>in setup order</strong> — starting with Settings.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Click <strong>Next →</strong> and we'll take you straight there.
          </p>`,
        side: 'right', align: 'start',
        onNextClick: () => {
          setChapter(1);
          d.destroy();
          navigate('/settings');
        },
      },
    },
  ];

  const d = makeDriver(steps);
  d.drive();
}

// ── Chapter 1: Settings ───────────────────────────────────────────────────────
function runChapter1() {
  const steps = [
    {
      popover: {
        title: '⚙️ Settings — Your First Stop',
        description: `
          <p style="margin:0;line-height:1.7;font-size:0.88rem;">
            Before you can scout, you need to configure two things here:
            your <strong>Trap Types</strong> and your <strong>Team</strong>.
            Let's look at each one.
          </p>`,
        side: 'over', align: 'center',
      },
    },
    {
      element: '#settings-traps',
      popover: {
        title: '🕸️ Trap Types',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            This section lists the <strong>types of physical traps</strong> used on your farms —
            e.g. "Pheromone Trap", "Sticky Yellow Trap", "Pitfall Trap".
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Trap types are reused across all your farms and trap registrations.
          </p>`,
        side: 'right', align: 'start',
      },
    },
    {
      element: '#add-trap-btn',
      popover: {
        title: '➕ Add a Trap Type',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Click <strong>＋ Add</strong> to create a new trap type. Give it a name and an optional
            description. You'll select these types when registering actual traps on your fields later.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Tip: create all your trap types before moving on — you can't register a trap without one.
          </p>`,
        side: 'right', align: 'center',
      },
    },
    {
      element: '#settings-team',
      popover: {
        title: '👥 Your Team',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            This section shows everyone in your organisation. <strong>Scouts</strong> are the users
            who go out into the field and log observations using the mobile app.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Admins can manage settings and see all data. Scouts can log sessions and observations.
          </p>`,
        side: 'right', align: 'start',
      },
    },
    {
      element: '#invite-btn',
      popover: {
        title: '➕ Add a Team Member',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Click <strong>＋ Add Team Member</strong> to invite a scout. Fill in their name, email,
            and assign the <strong>Scout</strong> role. They'll get login credentials immediately.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            You'll assign scouts to scouting sessions later — so add them before creating sessions.
          </p>`,
        side: 'right', align: 'center',
        onNextClick: () => {
          setChapter(2);
          d.destroy();
          navigate('/pests');
        },
      },
    },
  ];

  const d = makeDriver(steps);
  d.drive();
}

// ── Chapter 2: Pest Catalogue ─────────────────────────────────────────────────
function runChapter2() {
  const steps = [
    {
      element: '#addPestBtn',
      popover: {
        title: '🦗 Add Your First Pest',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Click <strong>＋ Add Pest</strong> to register a pest. You'll enter the common name,
            scientific name, category (insect, disease, weed, etc.), and crucially —
            the <strong>alert threshold</strong>.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            The threshold is the observation count at which PestLook raises an alert.
            E.g. if you set 20 for Fall Armyworm, any session recording 20+ triggers a warning.
          </p>`,
        side: 'bottom', align: 'start',
      },
    },
    {
      element: '#pestsTable',
      popover: {
        title: '📋 Your Pest Catalogue',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Once added, pests appear here. You can sort by name, category, or threshold,
            and edit or delete any entry.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            These are the pests your scouts select when they log observations in the field.
            Add <strong>all the pests relevant to your crops</strong> before starting sessions.
          </p>`,
        side: 'top', align: 'start',
        onNextClick: () => {
          setChapter(3);
          d.destroy();
          navigate('/farms');
        },
      },
    },
  ];

  const d = makeDriver(steps);
  d.drive();
}

// ── Chapter 3: Farms & Fields ─────────────────────────────────────────────────
function runChapter3() {
  const steps = [
    {
      element: '#addFarmBtn',
      popover: {
        title: '🌾 Add Your First Farm',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Click <strong>＋ Add Farm</strong> to create a farm. Give it a name and an optional
            address. You can add GPS coordinates and draw a boundary on the map.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            All scouting activity is scoped to a farm and field — so every session,
            observation, and trap belongs to a specific location here.
          </p>`,
        side: 'bottom', align: 'start',
      },
    },
    {
      element: '#farmsGrid',
      popover: {
        title: '🃏 Your Farm Cards',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Each farm appears as a card. Click <strong>Manage fields →</strong> on a farm card
            to open it and add fields — the individual blocks, paddocks, or growing areas within the farm.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Each field has its own crop type, season, and area in hectares.
          </p>`,
        side: 'top', align: 'start',
      },
    },
    {
      popover: {
        title: '🗂️ Fields — Inside a Farm',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Once you've opened a farm, use <strong>＋ Add Field</strong> to create fields inside it.
            You can also draw the field's boundary on the map so PestLook knows its exact shape and size.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Fields are what you'll select when creating scouting sessions and placing traps.
            <strong>Create at least one field per farm before continuing.</strong>
          </p>`,
        side: 'over', align: 'center',
        onNextClick: () => {
          setChapter(4);
          d.destroy();
          navigate('/traps');
        },
      },
    },
  ];

  const d = makeDriver(steps);
  d.drive();
}

// ── Chapter 4: Traps ──────────────────────────────────────────────────────────
function runChapter4() {
  const steps = [
    {
      element: '#addTrapBtn',
      popover: {
        title: '🕸️ Register a Trap',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Click <strong>＋ Add Trap</strong> to register a physical trap. You'll select the farm,
            field, and trap type (the ones you created in Settings), give it a name or barcode,
            and pin its location on the map.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            The map lets you click to drop a pin at the exact GPS location of the trap in the field.
          </p>`,
        side: 'bottom', align: 'start',
      },
    },
    {
      element: '#trapTabs',
      popover: {
        title: '📑 Filter Your Traps',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Use these tabs to filter by <strong>All</strong>, <strong>Enabled</strong>,
            or <strong>Disabled</strong> traps. You can enable/disable traps without deleting them —
            useful for seasonal traps that aren't active year-round.
          </p>`,
        side: 'bottom', align: 'start',
      },
    },
    {
      element: '[data-filter="map"]',
      popover: {
        title: '🗺️ Map View',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Switch to <strong>Map View</strong> to see all your traps plotted on a live map.
            Click any pin to see the trap details and jump straight to editing it.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            This gives you a quick spatial overview of coverage across your fields.
          </p>`,
        side: 'bottom', align: 'end',
        onNextClick: () => {
          setChapter(5);
          d.destroy();
          navigate('/sessions');
        },
      },
    },
  ];

  const d = makeDriver(steps);
  d.drive();
}

// ── Chapter 5: Scouting Sessions ──────────────────────────────────────────────
function runChapter5() {
  const steps = [
    {
      element: '#planSessionBtn',
      popover: {
        title: '🥾 Plan a Scouting Session',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Click <strong>＋ Plan Session</strong> to schedule a scouting visit.
            You'll assign it to a <strong>farm</strong>, <strong>field</strong>,
            and <strong>scout</strong>, and optionally set a date and notes.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Sessions can also be created on the fly from the mobile app without pre-planning.
          </p>`,
        side: 'bottom', align: 'start',
      },
    },
    {
      element: '#sessionsTableCard',
      popover: {
        title: '📋 Sessions List',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            All planned and completed sessions appear here. Click <strong>View</strong> on any session
            to open it and see its observations, or to add new ones.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Filter by status: <em>Planned</em>, <em>In Progress</em>, or <em>Completed</em>.
            Sessions move to "Completed" when the scout marks them done.
          </p>`,
        side: 'top', align: 'start',
      },
    },
    {
      popover: {
        title: '🔬 Logging Observations',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Inside a session you'll see two buttons: <strong>＋ Trap</strong> (for trap counts)
            and <strong>＋ Observation</strong> (for general pest counts in the field).
          </p>
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Select the pest from your catalogue, enter the count, and save.
            PestLook instantly checks the count against your threshold and flags any breach.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Scouts do this from the <strong>mobile app</strong> in the field.
            You can also enter observations here on the web.
          </p>`,
        side: 'over', align: 'center',
        onNextClick: () => {
          setChapter(6);
          d.destroy();
          navigate('/dashboard');
        },
      },
    },
  ];

  const d = makeDriver(steps);
  d.drive();
}

// ── Chapter 6: Dashboard (final chapter) ──────────────────────────────────────
function runChapter6() {
  const steps = [
    {
      element: '#dashStats',
      popover: {
        title: '📊 Your Live KPIs',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            These four cards give you an instant read on what's happening:
            <strong>farms</strong>, <strong>traps</strong>, <strong>sessions</strong>,
            and <strong>total observations</strong> — all scoped to your organisation.
          </p>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            Hover any card for an explanation of exactly what it measures.
          </p>`,
        side: 'bottom', align: 'start',
      },
    },
    {
      element: '#dashSessions',
      popover: {
        title: '🥾 Recent Sessions',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            Your most recent scouting sessions are listed here with their status and scout.
            Click <strong>View all</strong> to go to the full Sessions page.
          </p>`,
        side: 'top', align: 'start',
      },
    },
    {
      element: '#dashTopPests',
      popover: {
        title: '🦗 Top Pests',
        description: `
          <p style="margin:0 0 8px;line-height:1.7;font-size:0.88rem;">
            This panel ranks the pests with the highest observation counts across all recent sessions.
            It's your quick early-warning indicator — if something is climbing the list, act on it.
          </p>`,
        side: 'top', align: 'start',
      },
    },
    {
      popover: {
        title: "🚀 You're All Set!",
        description: `
          <p style="margin:0 0 10px;line-height:1.7;font-size:0.88rem;">
            That's the complete setup flow. Here's your checklist:
          </p>
          <ol style="margin:0 0 12px;padding-left:20px;line-height:2;font-size:0.85rem;">
            <li>⚙️ Settings — add <strong>trap types</strong> and <strong>scout users</strong></li>
            <li>🦗 Pest Catalogue — add pests with <strong>thresholds</strong></li>
            <li>🌾 Farms — add farms and their <strong>fields</strong></li>
            <li>🕸️ Traps — register traps and <strong>pin them on the map</strong></li>
            <li>🥾 Sessions — plan sessions and <strong>log observations</strong></li>
          </ol>
          <p style="margin:0;font-size:0.8rem;color:#5a6b62;">
            This tour is always available again from <strong>Help → Retake Tour</strong>.
          </p>`,
        side: 'over', align: 'center',
        onNextClick: () => {
          completeTour();
          d.destroy();
          navigate('/settings');
        },
      },
    },
  ];

  const d = makeDriver(steps);
  d.drive();
}

// ── Chapter runners map ───────────────────────────────────────────────────────

const CHAPTER_RUNNERS = {
  0: runChapter0,
  1: runChapter1,
  2: runChapter2,
  3: runChapter3,
  4: runChapter4,
  5: runChapter5,
  6: runChapter6,
};

// ── Public API ────────────────────────────────────────────────────────────────

export async function startTour() {
  if (tourCompleted()) completeTour(); // reset flag so tour can restart
  resetTour();
  try {
    await loadDriver();
  } catch {
    return;
  }
  setChapter(0);
  runChapter0();
}

export async function resumeTour(currentPage) {
  if (tourCompleted()) return;

  const chapter = getChapter();
  if (chapter < 0) return; // tour not started

  const expectedChapter = PAGE_CHAPTER[currentPage];
  if (expectedChapter === undefined) return; // this page has no chapter
  if (chapter !== expectedChapter) return;   // not the right chapter yet

  const guard = CHAPTER_GUARD[chapter];

  try {
    await loadDriver();
  } catch {
    return;
  }

  // Wait for the key element to appear (page may still be loading async data)
  if (guard) {
    const el = await waitForEl(guard, 6000);
    if (!el) return; // page didn't render the expected element in time
  }

  CHAPTER_RUNNERS[chapter]?.();
}

// Called on first authenticated shell load — auto-starts tour for new users
export async function startTourIfNeeded() {
  if (tourCompleted()) return;
  if (getChapter() >= 0) return; // already mid-tour, resumeTour handles it
  try { await loadDriver(); } catch { return; }
  setChapter(0);
  setTimeout(runChapter0, 600);
}
