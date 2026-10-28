/* ── INSTITUTIONAL DEVTOOLS SECURITY BANNER ── */
(() => {
  try {
    console.log(
      "%c🛡️ HAVEN OF WISDOM ACADEMY • SCHOLARIA SECURITY ENFORCEMENT 🛡️",
      "color: #2563eb; font-size: 16px; font-weight: 800; padding: 6px 0;"
    );
    console.log(
      "%cWARNING: This browser console is an administrative developer interface. Unauthorized script execution, token extraction, or automated endpoint probing is strictly monitored and violates institutional computer usage policies.",
      "color: #dc2626; font-size: 12px; font-weight: 600;"
    );
  } catch (_) {}
})();

/* ── SUPABASE INIT & SESSION GUARD ── */

const SUPABASE_URL  = 'https://qxpsbewbgdwkermxeeso.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cHNiZXdiZ2R3a2VybXhlZXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDgzMTgsImV4cCI6MjA5ODI4NDMxOH0.cmG-pVotNZ5KI81_8XsUN5AL5vNVYOPFy8oHegz6cvg';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { storage: window.sessionStorage } });
try {
  Object.defineProperty(window, 'db', {
    value: db,
    writable: false,
    configurable: false,
    enumerable: false
  });
} catch (_) {
  window.db = db;
}

try {
  if (typeof window !== 'undefined' && window.supabase) {
    Object.defineProperty(window, 'supabase', {
      value: undefined,
      writable: false,
      configurable: false,
      enumerable: false
    });
  }
} catch (_) {}

const API_BASE = (function() {
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null') {
      return 'http://localhost:3001';
    }
    const host = window.location.hostname;
    const port = window.location.port;
    if ((host === 'localhost' || host === '127.0.0.1') && port && port !== '3001') {
      return 'http://localhost:3001';
    }
    return window.location.origin;
  }
  return 'http://localhost:3001';
})();
try {
  Object.defineProperty(window, 'API_BASE', {
    value: API_BASE,
    writable: false,
    configurable: false
  });
} catch (_) {
  window.API_BASE = API_BASE;
}

let ROLE = null;
let CURRENT_PROFILE = null;

async function guardSessionAndInit() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile, error } = await db
    .from('users').select('*').eq('id', session.user.id).single();

  if (error || !profile) {
    await db.auth.signOut();
    window.location.href = 'login.html';
    return;
  }

  if (profile.is_active === false) {
    await db.auth.signOut();
    window.location.href = 'login.html?deactivated=1';
    return;
  }

  if (session.user.user_metadata && session.user.user_metadata.must_reset_password) {
    window.location.href = 'reset-password.html';
    return;
  }

  ROLE = profile.role;
  CURRENT_PROFILE = { ...profile };
  try {
    db.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', profile.id).then();
  } catch (_) {}
  initDashboardShell();
  startAfkSessionTracker();
  _registerAndHeartbeatSession(session.access_token);
}

/* ── UNIVERSAL 10-MINUTE AFK SESSION EXPIRATION ── */
const AFK_TIMEOUT_MS = 10 * 60 * 1000; // Exactly 10 minutes (600,000 ms)
let afkSessionTimer = null;

function resetAfkTimer() {
  if (afkSessionTimer) clearTimeout(afkSessionTimer);
  afkSessionTimer = setTimeout(triggerAfkSessionTimeout, AFK_TIMEOUT_MS);
}

async function triggerAfkSessionTimeout() {
  try {
    if (typeof resetChatState === 'function') resetChatState();
    if (typeof db !== 'undefined' && db && db.auth) {
      await db.auth.signOut();
    }
  } catch (_) {}

  window.location.href = 'login.html?afk=1';
}

function startAfkSessionTracker() {
  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'keypress', 'touchstart', 'scroll', 'click', 'wheel'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, resetAfkTimer, { passive: true });
  });
  resetAfkTimer();
}

guardSessionAndInit();

// ══════════════════════════════════════════════════════════
// SINGLE ACTIVE SESSION — register on login, heartbeat every 60s
// ══════════════════════════════════════════════════════════
let _sessionHeartbeatTimer = null;
const SESSION_TOKEN_KEY = '_sch_stk';

async function _registerAndHeartbeatSession(accessToken) {
  if (!accessToken) return;

  const backendBase = (typeof BACKEND_URL !== 'undefined' && BACKEND_URL)
    ? BACKEND_URL : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `http://${window.location.hostname}:3001` : '');

  if (!backendBase) return; // file:// mode — skip enforcement

  try {
    const res = await fetch(`${backendBase}/api/auth/register-session`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) return;
    const { session_token, enforced } = await res.json();
    if (enforced && session_token) {
      try { sessionStorage.setItem(SESSION_TOKEN_KEY, session_token); } catch (_) {}
      _startSessionHeartbeat(accessToken, session_token, backendBase);
    }
  } catch (_) {
    // Network error — don't break the app
  }
}

function _startSessionHeartbeat(accessToken, sessionToken, backendBase) {
  if (_sessionHeartbeatTimer) clearInterval(_sessionHeartbeatTimer);
  _sessionHeartbeatTimer = setInterval(async () => {
    try {
      // Refresh access token in case it expired
      const { data: { session: s } } = await db.auth.getSession();
      const tok = s ? s.access_token : accessToken;

      const res = await fetch(`${backendBase}/api/auth/validate-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken })
      });
      if (!res.ok) return; // network hiccup — keep running

      const { valid, reason } = await res.json();
      if (!valid && reason === 'session_superseded') {
        clearInterval(_sessionHeartbeatTimer);
        try { await db.auth.signOut(); } catch (_) {}
        try { sessionStorage.removeItem(SESSION_TOKEN_KEY); } catch (_) {}
        alert('Your account has been signed in from another device. You have been logged out for security.');
        window.location.href = 'login.html?kicked=1';
      }
    } catch (_) {
      // Network error — keep heartbeat running
    }
  }, 60000); // every 60 seconds
}

