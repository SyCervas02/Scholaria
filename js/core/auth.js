/* ── SUPABASE INIT & SESSION GUARD ── */

const SUPABASE_URL  = 'https://qxpsbewbgdwkermxeeso.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cHNiZXdiZ2R3a2VybXhlZXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDgzMTgsImV4cCI6MjA5ODI4NDMxOH0.cmG-pVotNZ5KI81_8XsUN5AL5vNVYOPFy8oHegz6cvg';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { storage: window.sessionStorage } });
// Top-level const is not a window property; chat.js upload and ui-helpers signOut
// read window.db, so mirror it there or they silently skip the session.
window.db = db;

const API_BASE = (function() {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    // If running on port 3001 locally, use origin as-is
    if (port === '3001') {
      return window.location.origin;
    }
    // If running on standard HTTPS/HTTP port (Railway / production), use origin directly
    // so that image/file URLs don't wrongly point to :3001
    if (!port || port === '443' || port === '80') {
      return window.location.origin;
    }
    return `${proto}//${host}:3001`;
  }
  return 'http://localhost:3001';
})();
// Top-level const stays in the global lexical scope, not on window; chat.js
// reads window.API_BASE, so mirror it there or production falls back to localhost:3001.
window.API_BASE = API_BASE;
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
  CURRENT_PROFILE = profile;
  if (typeof loadSharedCurriculumSubjects === 'function') {
    await loadSharedCurriculumSubjects().catch(err => console.warn('Shared curriculum subjects could not be loaded:', err.message));
  }
  if (typeof loadSharedManagedSections === 'function') {
    await loadSharedManagedSections().catch(err => console.warn('Shared managed sections could not be loaded:', err.message));
  }
  try {
    db.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', profile.id).then();
  } catch (_) {}
  initDashboardShell();
  startAfkSessionTracker();
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

  const isAdm = (typeof ROLE !== 'undefined' && ROLE === 'admin') || (typeof CURRENT_PROFILE !== 'undefined' && CURRENT_PROFILE?.role === 'admin');
  const targetLogin = isAdm ? 'admin-login.html?afk=1' : 'login.html?afk=1';
  window.location.href = targetLogin;
}

function startAfkSessionTracker() {
  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'keypress', 'touchstart', 'scroll', 'click', 'wheel'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, resetAfkTimer, { passive: true });
  });
  resetAfkTimer();
}

guardSessionAndInit();
