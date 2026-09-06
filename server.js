// server.js
require('dotenv').config(); // MUST be first — everything below reads from process.env

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Core middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
}));
app.use(express.json());
app.use(express.static(__dirname));

// Basic rate limiting on the API routes (auth routes skipped so rate limits never block logins)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                 // limit each IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/auth/'),
});
app.use('/api/', apiLimiter);

// Every /api/ route returns live data, never a static asset — Express
// auto-generates ETags by default, and browsers will silently serve a
// cached 304 for a GET that LOOKS identical to a prior one instead of
// hitting the database again. That's fine for images/CSS, actively
// wrong for "did anything change in the database since I last asked."
app.use('/api/', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// --- Supabase admin client (service role — server-side only) ---
// NOTE: with Supabase's newer "sb_secret_..." key format, createClient()
// doesn't reliably set the Authorization header to the secret key on its
// own — and RLS bypass is enforced off the Authorization header, not just
// the apikey field. Setting it explicitly here is what actually makes
// this client bypass RLS instead of getting blocked by it.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }
    },
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

// --- Profanity / severe-word filter ------------------------------------
// OpenAI's Moderation API is built to catch hate/harassment/violence/
// self-harm — it does NOT reliably flag plain swearing used on its own
// ("fuck", "shit" with no other context come back flagged:false). This
// local word list handles profanity specifically, with normalization
// aimed at common bypass tricks: leetspeak (sh1t), repeated letters
// (shiiiit), and punctuation/underscore spacing (f.u.c.k, f_u_c_k).
// No filter like this is 100% foolproof — edit the lists freely.
const PROFANITY_LIST = [
  'fuck', 'fucking', 'fucker', 'fuckin', 'motherfucker',
  'shit', 'shitty', 'bullshit',
  'ass', 'bitch', 'asshole', 'bastard', 'dick', 'piss', 'cunt', 'whore', 'slut',
  'douchebag',
  // Common Filipino/Tagalog profanity — edit/expand for your userbase
  'putangina', 'tangina', 'gago', 'gaga', 'tarantado', 'ulol', 'bobo',
  'inutil', 'leche', 'peste', 'kupal', 'punyeta'
];

// Slurs and comparably severe terms — these skip the strike ladder
// entirely and go straight to a permanent mute, same as OpenAI's severe
// hate/violence categories, since this local check keeps working even
// while the Moderation API call itself is broken (bad key, no quota,
// etc.) Expand this list as needed; keep it separate from PROFANITY_LIST
// so it's never treated as "just a strike."
const SEVERE_WORD_LIST = [
  'nigga', 'nigger', 'chink', 'spic', 'kike', 'faggot', 'tranny', 'retard'
];

// Words length >= 4 only, to keep the spaced-out-letters check (below)
// from colliding with innocent words that merely contain a short match.
const DESPACED_CHECK_LIST = PROFANITY_LIST.filter(w => w.length >= 4);
const DESPACED_SEVERE_LIST = SEVERE_WORD_LIST.filter(w => w.length >= 4);

const LEET_MAP = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't' };

function deleet(str) {
  return str.split('').map(ch => LEET_MAP[ch] || ch).join('');
}

// Collapses 3+ repeated letters down to one: "shiiiit" -> "shit"
function collapseRepeats(str) {
  return str.replace(/([a-z])\1{2,}/g, '$1');
}

// Strips everything but letters — turns "f.u.c.k" / "f_u_c_k" / "f-u-c-k"
// into "fuck" so punctuation-spacing tricks don't slip through.
function stripNonLetters(str) {
  return str.replace(/[^a-z]/g, '');
}

function normalizeToken(str) {
  return collapseRepeats(stripNonLetters(deleet(str.toLowerCase())));
}

// Checks a message against both lists. Returns { severeFlagged,
// profanityFlagged, censoredText }. Per-word matches get asterisked in
// place; letters spaced one-per-token ("f u c k" / "n i g g a") are
// caught by a whole-message despaced fallback, which can't be mapped
// back to specific words so it censors the full message.
function checkLocalContent(text) {
  const tokens = text.split(/(\s+)/); // keep whitespace tokens to rejoin cleanly
  let severeFlagged = false;
  let profanityFlagged = false;

  const censoredTokens = tokens.map(tok => {
    if (/^\s*$/.test(tok)) return tok;
    const normalized = normalizeToken(tok);
    if (SEVERE_WORD_LIST.some(bad => normalized === bad)) {
      severeFlagged = true;
      return tok.replace(/\S/g, '*');
    }
    if (PROFANITY_LIST.some(bad => normalized === bad)) {
      profanityFlagged = true;
      return tok.replace(/\S/g, '*');
    }
    return tok;
  });

  if (!severeFlagged && !profanityFlagged) {
    const despaced = normalizeToken(text.replace(/\s+/g, ''));
    if (DESPACED_SEVERE_LIST.some(bad => despaced.includes(bad))) {
      return { severeFlagged: true, profanityFlagged: false, censoredText: '*'.repeat(Math.min(text.length, 200)) };
    }
    if (DESPACED_CHECK_LIST.some(bad => despaced.includes(bad))) {
      return { severeFlagged: false, profanityFlagged: true, censoredText: '*'.repeat(Math.min(text.length, 200)) };
    }
  }

  return { severeFlagged, profanityFlagged, censoredText: censoredTokens.join('') };
}

// Simple auth check — verifies the caller's JWT and returns their profile row
async function requireUser(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Missing auth token' }); return null; }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: 'Invalid session' }); return null; }

  const { data: profile } = await supabaseAdmin
    .from('users').select('*').eq('id', user.id).single();
  if (!profile) { res.status(401).json({ error: 'No profile found' }); return null; }

  return profile;
}

// Next sequential School ID for a role this year, e.g. HWA-2024-003
// (student), HWA-T-2024-002 (teacher), HWA-A-2024-001 (admin) — matches
// the format already used by the seeded demo/real accounts. Zero-padded
// to 3 digits; naturally grows past that (0999 -> 1000) since padStart
// only pads, never truncates.
async function generateSchoolId(role) {
  const year = new Date().getFullYear();
  const prefix = role === 'teacher' ? `HWA-T-${year}-`
    : role === 'admin' ? `HWA-A-${year}-`
    : `HWA-${year}-`;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('school_id')
    .like('school_id', `${prefix}%`)
    .order('school_id', { ascending: false })
    .limit(1);
  if (error) throw error;

  let next = 1;
  if (data && data.length) {
    const lastNum = parseInt(data[0].school_id.slice(prefix.length), 10);
    if (!isNaN(lastNum)) next = lastNum + 1;
  }
  return prefix + String(next).padStart(3, '0');
}

// 12-character temp password, avoiding visually-ambiguous characters
// (no 0/O, 1/l/I) since these get read off a screen and typed by hand.
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

// --- Routes ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Create a real login + profile row for a student/teacher/admin — admin
// only. This is the ONLY place accounts are created (see the note at
// the top of scholaria_auth_schema.sql) — no public self-registration
// exists anywhere in this app, on purpose.
app.post('/api/admin/create-account', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (profile.role !== 'admin') return res.status(403).json({ error: 'Only admins can create accounts' });

  const { full_name, role, email, strand, grade_level, section, subjects } = req.body;

  if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'Missing full name' });
  if (!['student', 'teacher', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Missing or invalid email' });

  let school_id;
  try {
    school_id = await generateSchoolId(role);
  } catch (err) {
    return res.status(500).json({ error: 'Could not generate School ID: ' + err.message });
  }

  const temp_password = generateTempPassword();

  // 1. Create the actual login. must_reset_password metadata is what
  //    sends them to reset-password.html on first sign-in instead of
  //    straight into the dashboard with a temp password still active.
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
    user_metadata: { must_reset_password: true }
  });
  if (authErr) {
    const msg = /already.*regist/i.test(authErr.message)
      ? 'An account with this email already exists'
      : authErr.message;
    return res.status(400).json({ error: msg });
  }

  // 2. Create the matching profile row — id MUST equal the auth user's
  //    id (RLS throughout this schema relies on auth.uid() = users.id).
  const { data: userRow, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      full_name: full_name.trim(),
      school_id,
      role,
      email,
      strand: strand || null,
      grade_level: grade_level || null,
      section: section || null,
      subjects: subjects || null,
      is_demo: false, // real, admin-created account — never a demo one, regardless of the users.is_demo column default
    })
    .select().single();

  if (insertErr) {
    // Roll back the auth user so we don't leave an orphaned login with
    // no profile behind (which would otherwise fail differently and
    // confusingly at their next login attempt).
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return res.status(500).json({ error: insertErr.message });
  }

  res.json({ school_id, email, temp_password });
});

// Demo login — signs the caller into one of the three seeded demo accounts
// (see seed-demo-account.js) so the demo password never has to live in the
// frontend JS. Gated behind DEMO_MODE so it can be switched off in a real
// deployment just by changing .env — the frontend already treats a 404
// here as "demo mode disabled".
app.post('/api/auth/demo-login', async (req, res) => {
  if (process.env.DEMO_MODE !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { role } = req.body;
  const demoCredentials = {
    student: { email: process.env.DEMO_STUDENT_EMAIL, password: process.env.DEMO_STUDENT_PASSWORD },
    teacher: { email: process.env.DEMO_TEACHER_EMAIL, password: process.env.DEMO_TEACHER_PASSWORD },
    admin: { email: process.env.DEMO_ADMIN_EMAIL, password: process.env.DEMO_ADMIN_PASSWORD },
  };

  const creds = demoCredentials[role];
  if (!creds || !creds.email || !creds.password) {
    return res.status(400).json({ error: 'Invalid or unconfigured demo role' });
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });

  if (error || !data.session) {
    console.error('Demo login error:', error?.message);
    return res.status(500).json({ error: 'Demo login failed' });
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

// Mute ladder: 3 profanity strikes -> few-minute mute, 3 more (strikes
// 4-6) -> half-hour mute, strike 7+ -> permanent, admin-unmute required.
function getMuteForStrikes(strikes) {
  if (strikes <= 3) {
    return { action: 'muted_short', muted_until: new Date(Date.now() + 5 * 60000).toISOString() };
  }
  if (strikes <= 6) {
    return { action: 'muted_long', muted_until: new Date(Date.now() + 30 * 60000).toISOString() };
  }
  return { action: 'muted_permanent', permanently_muted: true, muted_until: null };
}

app.post('/api/chat/send', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return; // requireUser already sent the error response

  const { conversationId, text } = req.body;
  if (!text || !text.trim() || !conversationId) {
    return res.status(400).json({ error: 'Missing conversationId or text' });
  }

  // 1. Block outright if already muted
  if (profile.permanently_muted) {
    return res.status(403).json({ error: 'CHAT_MUTED_PERMANENT' });
  }
  if (profile.muted_until && new Date(profile.muted_until) > new Date()) {
    return res.status(403).json({ error: 'CHAT_MUTED_UNTIL', mutedUntil: profile.muted_until });
  }

  // 2. Local content filter — catches plain profanity and severe slurs
  // (see checkLocalContent above), independent of the Moderation API.
  const localCheck = checkLocalContent(text);

  // 3. OpenAI Moderation API — catches hate/harassment/violence/self-harm,
  // as a second layer on top of the local severe-word list.
  let modResult;
  try {
    const modRes = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ input: text })
    });
    const modData = await modRes.json();

    if (!modRes.ok || !modData.results) {
      // Surface OpenAI's actual error instead of crashing on results[0]
      // of an undefined value — e.g. bad/missing key, no quota, etc.
      console.error('Moderation API error:', modRes.status, modData.error?.message || modData);
      modResult = { flagged: false, categories: {} };
    } else {
      modResult = modData.results[0];
    }
  } catch (err) {
    console.error('Moderation API request failed:', err.message);
    // Fail-safe: if the API is down, let the message through on the
    // moderation side rather than blocking chat entirely — the local
    // filter above still runs regardless.
    modResult = { flagged: false, categories: {} };
  }

  const flaggedCategories = Object.entries(modResult.categories || {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  // "Severe" = hate/harassment targeting identity, or violence/self-harm
  // threats — from either OpenAI's categories or the local slur list.
  const severeCategories = ['hate', 'hate/threatening', 'harassment/threatening', 'violence/graphic', 'self-harm', 'self-harm/intent', 'self-harm/instructions'];
  const isSevere = localCheck.severeFlagged || flaggedCategories.some(c => severeCategories.includes(c));
  const isProfanity = !isSevere && (localCheck.profanityFlagged || modResult.flagged);

  let finalBody = text;
  let warning = null;
  let violationToLog = null;   // logged AFTER the insert succeeds, not before
  let muteUpdate = null;       // applied AFTER the insert succeeds, not before

  if (isSevere) {
    // Word-level censor when the local slur list caught it; full censor
    // as a fallback if only the Moderation API flagged it.
    finalBody = localCheck.severeFlagged ? localCheck.censoredText : '*'.repeat(Math.min(text.length, 200));
    muteUpdate = { permanently_muted: true, muted_until: null };
    violationToLog = {
      user_id: profile.id, original_body: text,
      categories: localCheck.severeFlagged ? ['severe_slur', ...flaggedCategories] : flaggedCategories,
      severity: 'severe', strike_number: null, action: 'muted_permanent'
    };
    warning = "Your message was removed for severe inappropriate content. Your account has been muted — please visit or message the Guidance Office to be unmuted.";
  } else if (isProfanity) {
    // Word-level asterisk censor when the local filter caught it; full
    // censor as a fallback if only the Moderation API flagged it (it
    // doesn't tell us which words, just that something's off).
    finalBody = localCheck.profanityFlagged ? localCheck.censoredText : '*'.repeat(Math.min(text.length, 200));

    const strikes = (profile.profanity_strikes || 0) + 1;
    const tier = getMuteForStrikes(strikes);
    muteUpdate = { profanity_strikes: strikes, ...tier };
    violationToLog = {
      user_id: profile.id, original_body: text,
      categories: localCheck.profanityFlagged ? ['profanity'] : flaggedCategories,
      severity: 'normal', strike_number: strikes, action: tier.action
    };
    warning = tier.action === 'muted_permanent'
      ? 'Your account has been permanently muted for repeated inappropriate language — please visit or message the Guidance Office to be unmuted.'
      : 'Your message contained inappropriate content and was censored.';
  }

  // 4. Insert the (possibly censored) message FIRST, before applying any
  //    mute. This message is what earns the strike, so at the moment it's
  //    written the sender must still read as "not yet muted" — muting
  //    them first and inserting second would make this exact message
  //    look like it was sent while already muted.
  const { data: message, error: insertErr } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      sender_name: profile.full_name,
      body: finalBody
    })
    .select().single();

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  // 5. Now apply the strike/mute and log the violation, for next time.
  if (muteUpdate) {
    await supabaseAdmin.from('users').update(muteUpdate).eq('id', profile.id);
  }
  if (violationToLog) {
    await supabaseAdmin.from('chat_violations').insert(violationToLog);
  }

  res.json({ ...message, warning });
});

// --- Learning Materials (centralized storage) -------------------------
// Storage bucket: 'learning-materials' (private — see storage_setup.sql).
// Table: public.materials, RLS already restricts inserts to
// teacher/admin (scholaria_auth_schema.sql). These routes are the
// primary access control layer; RLS is the backstop if this boundary
// is ever bypassed.
const materialUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
});

function requireTeacherOrAdmin(profile, res) {
  if (!['teacher', 'admin'].includes(profile.role)) {
    res.status(403).json({ error: 'Only teachers and admins can upload materials' });
    return false;
  }
  return true;
}

// Upload a material — teacher/admin only
app.post('/api/materials/upload', materialUpload.single('file'), async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (!requireTeacherOrAdmin(profile, res)) return;

  const { title, subject, strand, grade_level } = req.body;
  if (!req.file || !title || !title.trim()) {
    return res.status(400).json({ error: 'Missing file or title' });
  }

  const safeName = req.file.originalname.replace(/[^\w.\-]+/g, '_');
  const storagePath = `${profile.id}/${Date.now()}-${safeName}`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from('learning-materials')
    .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });
  if (uploadErr) return res.status(500).json({ error: uploadErr.message });

  // Admin uploads go straight to approved; teacher uploads stay pending
  // until an admin approves them (matches the Content Approval screen).
  const status = profile.role === 'admin' ? 'approved' : 'pending';

  const { data: material, error: insertErr } = await supabaseAdmin
    .from('materials')
    .insert({
      title: title.trim(),
      subject: subject || null,
      strand: strand || null,
      grade_level: grade_level || null,
      file_url: storagePath, // storage object path, not a public URL
      file_type: req.file.mimetype,
      uploaded_by: profile.id,
      status,
    })
    .select().single();

  if (insertErr) {
    // Roll back the uploaded object if the row insert failed
    await supabaseAdmin.storage.from('learning-materials').remove([storagePath]);
    return res.status(500).json({ error: insertErr.message });
  }

  res.json(material);
});

// List materials — students see approved only; teachers see approved +
// their own pending; admins see everything.
app.get('/api/materials', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;

  const { strand, grade_level, subject } = req.query;
  let query = supabaseAdmin.from('materials').select('*').order('created_at', { ascending: false });

  if (profile.role === 'student') {
    query = query.eq('status', 'approved');
  } else if (profile.role === 'teacher') {
    query = query.or(`status.eq.approved,uploaded_by.eq.${profile.id}`);
  }
  // admin: no extra filter — sees every status

  if (strand) query = query.eq('strand', strand);
  if (grade_level) query = query.eq('grade_level', grade_level);
  if (subject) query = query.eq('subject', subject);

  const { data, error } = await query;
  console.log(`[GET /api/materials] requested by ${profile.email} (role="${profile.role}") — query params: strand=${strand || 'none'} — returned ${data ? data.length : 0} rows${error ? ' — ERROR: ' + error.message : ''}`);
  if (data && data.length) {
    console.log('  rows:', data.map(m => `${m.title} [status=${m.status}, strand=${m.strand}]`).join(' | '));
  }
  if (error) return res.status(500).json({ error: error.message });

  // Attach uploader names for display without a client-side join
  const uploaderIds = [...new Set((data || []).map(m => m.uploaded_by).filter(Boolean))];
  let namesById = {};
  if (uploaderIds.length) {
    const { data: uploaders } = await supabaseAdmin
      .from('users').select('id, full_name').in('id', uploaderIds);
    namesById = Object.fromEntries((uploaders || []).map(u => [u.id, u.full_name]));
  }

  res.json((data || []).map(m => ({ ...m, uploaded_by_name: namesById[m.uploaded_by] || null })));
});

// Get a short-lived signed URL to view/download one material — this is
// the only way file bytes ever reach the browser (no public bucket URLs).
app.get('/api/materials/:id/download', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;

  const { data: material } = await supabaseAdmin
    .from('materials').select('*').eq('id', req.params.id).single();
  if (!material) return res.status(404).json({ error: 'Not found' });

  const canView = material.status === 'approved'
    || material.uploaded_by === profile.id
    || profile.role === 'admin';
  if (!canView) return res.status(403).json({ error: 'Not available' });

  const { data, error } = await supabaseAdmin.storage
    .from('learning-materials')
    .createSignedUrl(material.file_url, 60 * 10); // valid 10 minutes
  if (error) return res.status(500).json({ error: error.message });

  res.json({ url: data.signedUrl, title: material.title, file_type: material.file_type });
});

// Admin approves or returns a pending material
app.patch('/api/materials/:id/status', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (profile.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' });
  }

  if (status === 'approved') {
    const { data, error } = await supabaseAdmin
      .from('materials').update({ status }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // Denied materials are deleted outright rather than kept around with
  // a 'rejected' flag — avoids the materials table (and the storage
  // bucket) slowly filling up with things nobody's ever going to see
  // again. Same cleanup as the explicit DELETE route below.
  const { data: material } = await supabaseAdmin
    .from('materials').select('file_url').eq('id', req.params.id).single();
  if (!material) return res.status(404).json({ error: 'Not found' });

  await supabaseAdmin.storage.from('learning-materials').remove([material.file_url]);
  const { error: delErr } = await supabaseAdmin.from('materials').delete().eq('id', req.params.id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  res.json({ success: true, deleted: true });
});

// Delete a material — owner (while pending) or admin
app.delete('/api/materials/:id', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;

  const { data: material } = await supabaseAdmin
    .from('materials').select('*').eq('id', req.params.id).single();
  if (!material) return res.status(404).json({ error: 'Not found' });

  const canDelete = profile.role === 'admin' || material.uploaded_by === profile.id;
  if (!canDelete) return res.status(403).json({ error: 'Not allowed' });

  await supabaseAdmin.storage.from('learning-materials').remove([material.file_url]);
  const { error } = await supabaseAdmin.from('materials').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Scholaria server running on port ${PORT}`);
});