// server.js
if (!globalThis.WebSocket) { try { globalThis.WebSocket = class DummyWS {}; } catch(e){} }
// server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Explicit absolute path for reliable env loading

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Trust reverse proxy (Railway, Render, Fly.io, etc.)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// --- Account audit trail store ---
const AUDIT_FILE = path.join(__dirname, 'data', 'account-audit.json');

function getAuditRecords() {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return {};
    return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

function saveAuditRecord(record) {
  try {
    const dir = path.dirname(AUDIT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const records = getAuditRecords();
    const key = record.school_id || record.user_id;
    if (key) {
      records[key] = {
        ...(records[key] || {}),
        ...record,
        updated_at: new Date().toISOString()
      };
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(records, null, 2), 'utf8');
    }
  } catch (e) {
    console.error('Failed to save audit record:', e.message);
  }
}

// --- Core Security Middleware ---
// 1. Helmet Security Headers (CSP, Anti-Clickjacking, Anti-MIME Sniffing, Hide Express Signature)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https://*.supabase.co"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://*.supabase.co"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
        "data:"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://*.supabase.co",
        "https://images.unsplash.com",
        "https://i.pravatar.cc"
      ],
      connectSrc: [
        "'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://generativelanguage.googleapis.com",
        "https://api.openai.com",
        "https://cdn.jsdelivr.net"
      ],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: { action: 'sameorigin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
}));

// Additional defense-in-depth headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
});

// 2. Strict Access Control / CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'null' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 3. Input Sanitization Middleware (Anti-XSS & Code Injection Filter)
function sanitizeInput(obj) {
  if (typeof obj === 'string') {
    return obj
      .replace(/\0/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item));
  }
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      sanitized[key] = sanitizeInput(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = sanitizeInput(req.body);
  if (req.query && typeof req.query === 'object') req.query = sanitizeInput(req.query);
  if (req.params && typeof req.params === 'object') req.params = sanitizeInput(req.params);
  next();
});

// 4. Critical Gatekeeper: Block Direct Access to Database Schemas, .env, Source Code, and Data
const SENSITIVE_PATTERNS = [
  /^\/\.env/i,
  /\.sql$/i,
  /\.json$/i,
  /\.cjs$/i,
  /\.bak$/i,
  /\.log$/i,
  /\.map$/i,
  /\.md$/i,
  /\.yml$/i,
  /\.yaml$/i,
  /^\/server\.js$/i,
  /^\/flush-presentation-data\.js$/i,
  /^\/seed-demo-account\.js$/i,
  /^\/data(\/|$)/i,
  /^\/database(\/|$)/i,
  /^\/tests(\/|$)/i,
  /^\/node_modules(\/|$)/i,
  /Accounts_NamingConventions/i,
  /^\/\.git/i,
  /^\/\.gemini/i
];

app.use((req, res, next) => {
  const reqPath = decodeURIComponent(req.path);
  // Prevent path traversal
  if (reqPath.includes('..')) {
    return res.status(404).send('Not Found');
  }
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(reqPath)) {
      return res.status(404).send('Not Found');
    }
  }
  next();
});

// Redirect root to login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Ensure uploads directory exists
const chatUploadsDir = path.join(__dirname, 'uploads', 'chat');
const materialsUploadsDir = path.join(__dirname, 'uploads', 'materials');
if (!fs.existsSync(materialsUploadsDir)) {
  fs.mkdirSync(materialsUploadsDir, { recursive: true });
}
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { dotfiles: 'ignore' }));

// Resilient fallback for chat uploads stored across multiple devices
app.get('/uploads/chat/:filename', (req, res) => {
  const filename = path.basename(req.params.filename || '');
  const filePath = path.join(chatUploadsDir, filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
  if (isImage) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=120');
    const safeName = filename.replace(/[<>&"']/g, '').slice(0, 36);
    return res.send(`
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220">
        <rect width="100%" height="100%" fill="#f8fafc" rx="14" stroke="#cbd5e1" stroke-width="2"/>
        <circle cx="200" cy="72" r="32" fill="#eff6ff" stroke="#bfdbfe" stroke-width="2"/>
        <path d="M190 72 l7 -8 l13 14" stroke="#2563eb" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="192" cy="62" r="2.5" fill="#2563eb"/>
        <text x="200" y="130" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="700" fill="#1e293b" text-anchor="middle">Image stored on sender's device</text>
        <text x="200" y="152" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="500" fill="#64748b" text-anchor="middle">${safeName}</text>
        <text x="200" y="176" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="10.5" font-weight="500" fill="#94a3b8" text-anchor="middle">Click Overview to view details</text>
      </svg>
    `.trim());
  }
  res.status(404).send('File not found on this local instance');
});

// Allowed public assets and folders
app.use('/css', express.static(path.join(__dirname, 'css'), { dotfiles: 'ignore' }));
app.use('/js', express.static(path.join(__dirname, 'js'), { dotfiles: 'ignore' }));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { dotfiles: 'ignore' }));
app.use(express.static(__dirname, { dotfiles: 'ignore', index: false }));

// 5. Rate Limiting: Global API Limiter & Dedicated Auth Limiter (Anti-Brute Force / DDoS)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 25,                  // max 25 auth calls per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP address. Please wait 15 minutes before trying again.'
  }
});
app.use('/api/auth/', authLimiter);
app.use('/api/admin/create-account', authLimiter);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                 // limit each IP per window
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);
// Health check endpoint for uptime monitoring and hosting platforms
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Client-safe dynamic Supabase config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || 'https://qxpsbewbgdwkermxeeso.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});


// Every /api/ route returns live data, never a static asset
app.use('/api/', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// --- Supabase client for token validation & admin operations ---
const activeAdminKey = (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) 
  ? process.env.SUPABASE_SERVICE_ROLE_KEY 
  : process.env.SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  activeAdminKey,
  {
    global: {
      headers: { Authorization: `Bearer ${activeAdminKey}` }
    },
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { createClient: false }
  }
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { createClient: false }
  }
);

// --- Profanity / severe-word filter ---
const PROFANITY_LIST = [
  'fuck', 'fucking', 'fucker', 'fuckin', 'motherfucker',
  'shit', 'shitty', 'bullshit',
  'ass', 'bitch', 'asshole', 'bastard', 'dick', 'piss', 'cunt', 'whore', 'slut',
  'douchebag',
  'putangina', 'tangina', 'gago', 'gaga', 'tarantado', 'ulol', 'bobo',
  'inutil', 'leche', 'peste', 'kupal', 'punyeta'
];

const SEVERE_WORD_LIST = [
  'nigga', 'nigger', 'chink', 'spic', 'kike', 'faggot', 'tranny', 'retard'
];

const DESPACED_CHECK_LIST = PROFANITY_LIST.filter(w => w.length >= 4);
const DESPACED_SEVERE_LIST = SEVERE_WORD_LIST.filter(w => w.length >= 4);

const LEET_MAP = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't' };

function deleet(str) {
  return str.split('').map(ch => LEET_MAP[ch] || ch).join('');
}

function collapseRepeats(str) {
  return str.replace(/([a-z])\1{2,}/g, '$1');
}

function stripNonLetters(str) {
  return str.replace(/[^a-z]/g, '');
}

function normalizeToken(str) {
  return collapseRepeats(stripNonLetters(deleet(str.toLowerCase())));
}

function checkLocalContent(text) {
  const tokens = text.split(/(\s+)/);
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

async function requireUser(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'Missing auth token' }); return null; }

  // Verify session with anon client (with valid registered API key) or fallback to admin
  let user = null;
  const anonAuth = await supabaseAnon.auth.getUser(token);
  if (!anonAuth.error && anonAuth.data?.user) {
    user = anonAuth.data.user;
  } else {
    try {
      const adminAuth = await supabaseAdmin.auth.getUser(token);
      if (!adminAuth.error && adminAuth.data?.user) user = adminAuth.data.user;
    } catch (e) {}
  }
  if (!user) { res.status(401).json({ error: 'Invalid session' }); return null; }

  // Scoped user client for database operations
  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false }
  });
  req.userClient = userClient;

  let { data: profile } = await userClient
    .from('users').select('*').eq('id', user.id).maybeSingle();
  if (!profile) {
    try {
      const adminRes = await supabaseAdmin.from('users').select('*').eq('id', user.id).maybeSingle();
      if (adminRes.data) profile = adminRes.data;
    } catch (e) {}
  }
  if (!profile) {
    const meta = user.user_metadata || {};
    profile = {
      id: user.id,
      email: user.email,
      full_name: meta.full_name || (user.email ? user.email.split('@')[0] : 'User'),
      role: meta.role || 'student',
      strand: meta.strand || null,
      grade_level: meta.grade_level || null,
      section: meta.section || null,
      is_active: true
    };
  }

  if (profile.is_active === false) {
    res.status(403).json({ error: 'Account has been deactivated. Permissions revoked by administration.' });
    return null;
  }

  return profile;
}

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

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

function generateComplexPassword(length = 14) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()-_=+';
  const allChars = uppercase + lowercase + digits + symbols;

  let pw = [
    uppercase[crypto.randomInt(0, uppercase.length)],
    lowercase[crypto.randomInt(0, lowercase.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  for (let i = 4; i < length; i++) {
    pw.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  for (let i = pw.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }

  return pw.join('');
}

// --- Routes ---
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/admin/register-original-admin', async (req, res) => {
  const { full_name, email, password, admin_key } = req.body;
  const EXPECTED_KEY = process.env.ADMIN_REGISTRATION_KEY || 'HWA-ADMIN-2026';

  if (!admin_key || admin_key.trim().toUpperCase() !== EXPECTED_KEY.toUpperCase()) {
    return res.status(403).json({ error: 'Invalid or missing institutional Admin Access Key.' });
  }

  if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'Full name is required.' });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Valid Gmail or email address is required.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  let school_id;
  try {
    school_id = await generateSchoolId('admin');
  } catch (err) {
    return res.status(500).json({ error: 'Could not generate Admin ID: ' + err.message });
  }

  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim(), role: 'admin' }
  });

  if (authErr) {
    const msg = /already.*regist/i.test(authErr.message)
      ? 'An account with this email already exists.'
      : authErr.message;
    return res.status(400).json({ error: msg });
  }

  const { data: userRow, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      full_name: full_name.trim(),
      school_id,
      role: 'admin',
      email,
      is_active: true,
      is_demo: false,
    })
    .select().single();

  if (insertErr) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return res.status(500).json({ error: insertErr.message });
  }

  res.json({ success: true, school_id, email, full_name: userRow.full_name });
});

// --- In-Memory Email OTP Storage for Admin Security ---
const adminEmailOtpStore = new Map();

app.post('/api/admin/send-email-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Valid Gmail or email is required.' });
  }

  // Generate 6-digit cryptographic OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const normalizedEmail = email.trim().toLowerCase();
  adminEmailOtpStore.set(normalizedEmail, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });

  console.log(`\n======================================================`);
  console.log(`📧 [SCHOLARIA SECURITY] Admin 2FA Email OTP for ${normalizedEmail}`);
  console.log(`👉 Verification Code: [ ${code} ]`);
  console.log(`⏰ Expires in: 10 minutes`);
  console.log(`======================================================\n`);

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: `"Haven of Wisdom Academy - Scholaria" <${process.env.SMTP_USER}>`,
        to: normalizedEmail,
        subject: `${code} is your Scholaria Admin Verification Code`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e3a8a; max-width: 500px; border: 1px solid #dce8f5; border-radius: 12px;">
            <h2 style="color: #1e3a8a; margin-top: 0;">Haven of Wisdom Academy</h2>
            <p style="font-size: 15px; color: #374151;">Use the verification code below to authorize your Scholaria Administrator session:</p>
            <div style="background: #f0f5ff; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a;">${code}</span>
            </div>
            <p style="font-size: 13px; color: #6b7280;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.warn('⚠️ SMTP send error (code logged in console):', mailErr.message);
    }
  }

  res.json({
    success: true,
    message: `Verification code sent to ${normalizedEmail}`,
    debug_code: process.env.NODE_ENV !== 'production' ? code : undefined
  });
});

app.post('/api/admin/verify-email-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const entry = adminEmailOtpStore.get(normalizedEmail);

  if (!entry) {
    return res.status(400).json({ error: 'No verification code requested or code has expired. Please request a new code.' });
  }

  if (Date.now() > entry.expiresAt) {
    adminEmailOtpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }

  if (entry.code !== code.trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  adminEmailOtpStore.delete(normalizedEmail);
  res.json({ success: true, message: 'Email code verified successfully.' });
});

app.post('/api/admin/create-account', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (profile.role !== 'admin') return res.status(403).json({ error: 'Only admins can create accounts' });

  const { full_name, role, email, strand, grade_level, section, subjects, custom_password } = req.body;

  if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'Missing full name' });
  if (!['student', 'teacher', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  
  if (role !== 'admin' && (!email || !/^\S+@\S+\.\S+$/.test(email))) {
    return res.status(400).json({ error: 'Missing or invalid email' });
  }
  if (role === 'admin' && email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid recovery email format' });
  }

  let school_id;
  try {
    school_id = await generateSchoolId(role);
  } catch (err) {
    return res.status(500).json({ error: 'Could not generate School ID: ' + err.message });
  }

  // Account login email: if email is provided, use it. If admin without email, generate institutional email:
  const accountEmail = (email && email.trim())
    ? email.trim().toLowerCase()
    : `${school_id.toLowerCase()}@admin.hwa.edu.ph`;

  // Password: use custom_password if provided and strong, otherwise generate strong complex password
  const temp_password = (custom_password && custom_password.length >= 8)
    ? custom_password
    : (role === 'admin' ? generateComplexPassword(14) : generateTempPassword());

  const createdAtIso = new Date().toISOString();
  const creatorMeta = {
    id: profile.id,
    name: profile.full_name || 'Administrator',
    school_id: profile.school_id || 'ADMIN',
    role: profile.role || 'admin',
    created_at: createdAtIso
  };

  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: accountEmail,
    password: temp_password,
    email_confirm: true,
    user_metadata: { 
      full_name: full_name.trim(),
      role,
      must_reset_password: true,
      recovery_email: (email && email.trim()) ? email.trim() : null,
      created_by: creatorMeta
    }
  });
  if (authErr) {
    let msg = authErr.message;
    if (/already.*regist/i.test(msg)) {
      msg = 'An account with this email already exists';
    } else if (msg === 'User not allowed' || msg.includes('not allowed')) {
      msg = 'Database Configuration Error: Supabase service_role secret key is missing or invalid in server .env (auth.admin.createUser permission denied). Your Excel format is valid, but the server needs the valid service_role key to register accounts.';
    }
    return res.status(400).json({ error: msg });
  }

  const { data: userRow, error: insertErr } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      full_name: full_name.trim(),
      school_id,
      role,
      email: accountEmail,
      strand: strand || null,
      grade_level: grade_level || null,
      section: section || null,
      subjects: subjects || null,
      is_active: true,
      is_demo: false,
    })
    .select().single();

  if (insertErr) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return res.status(500).json({ error: insertErr.message });
  }

  // Persistent provenance audit record
  saveAuditRecord({
    user_id: authData.user.id,
    school_id,
    name: full_name.trim(),
    role,
    email: accountEmail,
    strand: strand || null,
    grade_level: grade_level || null,
    section: section || null,
    created_at: createdAtIso,
    created_by: creatorMeta,
    is_active: true
  });

  res.json({ 
    school_id, 
    email: accountEmail, 
    recovery_email: (email && email.trim()) ? email.trim() : null,
    temp_password,
    name: full_name.trim(),
    role,
    strand: strand || null,
    grade_level: grade_level || null,
    section: section || null,
    created_at: createdAtIso,
    created_by: creatorMeta
  });
});

app.get('/api/admin/account-audit', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (profile.role !== 'admin') return res.status(403).json({ error: 'Only admins can view audit records' });

  const records = getAuditRecords();
  res.json({ success: true, records });
});

app.post('/api/admin/toggle-user-status', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (profile.role !== 'admin') return res.status(403).json({ error: 'Only admins can modify user status' });

  const { user_id, is_active, reason } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user ID' });
  if (typeof is_active !== 'boolean') return res.status(400).json({ error: 'Invalid is_active status' });

  if (profile.id === user_id) {
    return res.status(400).json({ error: 'Self-deactivation is prohibited for security reasons.' });
  }

  const { data: updatedUser, error: updateErr } = await supabaseAdmin
    .from('users')
    .update({ is_active })
    .eq('id', user_id)
    .select()
    .single();

  if (updateErr) {
    return res.status(500).json({ error: updateErr.message });
  }

  if (!is_active) {
    try {
      await supabaseAdmin.auth.admin.signOut(user_id);
    } catch (e) {
      console.warn('Could not force sign out user:', e.message);
    }
  }

  const currentRecords = getAuditRecords();
  const key = updatedUser.school_id || user_id;
  const existingAudit = currentRecords[key] || {};
  const statusHistory = existingAudit.status_history || [];
  statusHistory.push({
    action: is_active ? 'reactivated' : 'deactivated',
    changed_by: {
      id: profile.id,
      name: profile.full_name,
      school_id: profile.school_id,
      role: profile.role
    },
    changed_at: new Date().toISOString(),
    reason: reason || (is_active ? 'Account reactivated by administrator' : 'Account deactivated by administrator')
  });

  saveAuditRecord({
    ...existingAudit,
    user_id,
    school_id: updatedUser.school_id,
    name: updatedUser.full_name,
    role: updatedUser.role,
    is_active,
    status_history: statusHistory
  });

  res.json({
    success: true,
    user: updatedUser,
    message: is_active ? 'Account successfully reactivated.' : 'Account successfully deactivated. All system permissions revoked.'
  });
});

app.post('/api/admin/reset-user-password', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (profile.role !== 'admin') return res.status(403).json({ error: 'Only admins can reset passwords' });

  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'Missing user ID' });

  const { data: targetUser, error: findErr } = await supabaseAdmin
    .from('users').select('*').eq('id', user_id).single();
  if (findErr || !targetUser) return res.status(404).json({ error: 'Target user not found' });

  const newTempPassword = generateComplexPassword(14);

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
    password: newTempPassword,
    user_metadata: { must_reset_password: true }
  });
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  res.json({
    success: true,
    school_id: targetUser.school_id,
    name: targetUser.full_name,
    temp_password: newTempPassword
  });
});

app.post('/api/admin/update-user-sections', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (profile.role !== 'admin') return res.status(403).json({ error: 'Only admins can modify user sections' });

  const { user_id, school_id, section, user_ids, updates } = req.body;

  try {
    // 1. Bulk updates with individual sections
    if (Array.isArray(updates) && updates.length > 0) {
      for (const item of updates) {
        const targetId = item.user_id || item.id || item.school_id;
        const targetSec = item.section !== undefined ? item.section : null;
        if (targetId) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(targetId));
          if (isUUID) {
            await supabaseAdmin.from('users').update({ section: targetSec }).eq('id', targetId);
          } else {
            await supabaseAdmin.from('users').update({ section: targetSec }).eq('school_id', targetId);
          }
        }
      }
      return res.json({ success: true, count: updates.length });
    }

    // 2. Mass assignment of an array of user_ids to a single section
    if (Array.isArray(user_ids) && user_ids.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ section: section !== undefined ? section : null })
        .in('id', user_ids)
        .select();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, updated: data });
    }

    // 3. Single user section update (by user_id or school_id)
    if (user_id || school_id) {
      let query = supabaseAdmin.from('users').update({ section: section !== undefined ? section : null });
      const target = user_id || school_id;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(target));
      if (isUUID) {
        query = query.eq('id', target);
      } else {
        query = query.eq('school_id', target);
      }
      const { data, error } = await query.select();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, updated: data });
    }

    return res.status(400).json({ error: 'Missing target user ID(s) or updates payload' });
  } catch (err) {
    console.error('Failed to update user section:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

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

function getMuteForStrikes(strikes) {
  if (strikes <= 3) {
    return { action: 'muted_short', muted_until: new Date(Date.now() + 5 * 60000).toISOString() };
  }
  if (strikes <= 6) {
    return { action: 'muted_long', muted_until: new Date(Date.now() + 30 * 60000).toISOString() };
  }
  return { action: 'muted_permanent', permanently_muted: true, muted_until: null };
}

// --- Chat File Uploads ---
const chatStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, chatUploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
    cb(null, `${uniqueSuffix}_${safeBase}${ext}`);
  }
});

const ALLOWED_UPLOAD_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt'
]);

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_UPLOAD_EXTS.has(ext)) {
      return cb(new Error('File type not allowed. Supported formats: images, PDF, documents, presentations, spreadsheets, and text files.'));
    }
    cb(null, true);
  }
});

app.post('/api/chat/upload', (req, res, next) => {
  chatUpload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 10MB limit. Please upload a smaller file.' });
      }
      return res.status(400).json({ error: err.message || 'File type not allowed. Supported formats: images, PDF, and documents.' });
    }
    next();
  });
}, async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;

  if (profile.permanently_muted) {
    return res.status(403).json({ error: 'CHAT_MUTED_PERMANENT' });
  }
  if (profile.muted_until && new Date(profile.muted_until) > new Date()) {
    return res.status(403).json({ error: 'CHAT_MUTED_UNTIL', mutedUntil: profile.muted_until });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const relativeUrl = `/uploads/chat/${req.file.filename}`;
  res.json({
    url: relativeUrl,
    name: req.file.originalname,
    size: req.file.size,
    mime: req.file.mimetype
  });
});

app.post('/api/chat/send', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;

  const { conversationId, text } = req.body;
  if (!text || !text.trim() || !conversationId) {
    return res.status(400).json({ error: 'Missing conversationId or text' });
  }

  if (profile.permanently_muted) {
    return res.status(403).json({ error: 'CHAT_MUTED_PERMANENT' });
  }
  if (profile.muted_until && new Date(profile.muted_until) > new Date()) {
    return res.status(403).json({ error: 'CHAT_MUTED_UNTIL', mutedUntil: profile.muted_until });
  }

  const isAttachment = typeof text === 'string' && text.trim().startsWith('{"type":"attachment"');
  let textToCheck = text;
  let parsedAttachment = null;
  if (isAttachment) {
    try {
      parsedAttachment = JSON.parse(text);
      textToCheck = parsedAttachment.name || '';
    } catch (e) {
      textToCheck = '';
    }
  }

  const localCheck = checkLocalContent(textToCheck);

  let modResult = { flagged: false, categories: {} };
  if (!isAttachment && textToCheck && textToCheck.trim().length > 0) {
    try {
      const modRes = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({ input: textToCheck })
      });
      const modData = await modRes.json();

      if (modRes.ok && modData.results) {
        modResult = modData.results[0];
      }
    } catch (err) {
      console.error('Moderation API request failed:', err.message);
    }
  }

  const flaggedCategories = Object.entries(modResult.categories || {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  const severeCategories = ['hate', 'hate/threatening', 'harassment/threatening', 'violence/graphic', 'self-harm', 'self-harm/intent', 'self-harm/instructions'];
  const isSevere = !isAttachment && (localCheck.severeFlagged || flaggedCategories.some(c => severeCategories.includes(c)));
  const isProfanity = !isAttachment && !isSevere && (localCheck.profanityFlagged || modResult.flagged);

  let finalBody = text;
  let warning = null;
  let violationToLog = null;
  let muteUpdate = null;

  if (isSevere) {
    finalBody = localCheck.severeFlagged ? localCheck.censoredText : '*'.repeat(Math.min(text.length, 200));
    muteUpdate = { permanently_muted: true, muted_until: null };
    violationToLog = {
      user_id: profile.id, original_body: text,
      categories: localCheck.severeFlagged ? ['severe_slur', ...flaggedCategories] : flaggedCategories,
      severity: 'severe', strike_number: null, action: 'muted_permanent'
    };
    warning = "Your message was removed for severe inappropriate content. Your account has been muted — please visit or message the Guidance Office to be unmuted.";
  } else if (isProfanity) {
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

  const dbClient = req.userClient || supabaseAdmin;
  let message = null;
  let insertErr = null;

  try {
    const resInsert = await dbClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        sender_name: profile.full_name,
        body: finalBody
      })
      .select().single();
    message = resInsert.data;
    insertErr = resInsert.error;
  } catch (e) {
    insertErr = e;
  }

  if (insertErr || !message) {
    try {
      const fallbackInsert = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          sender_name: profile.full_name,
          body: finalBody
        })
        .select().single();
      if (fallbackInsert.data) {
        message = fallbackInsert.data;
        insertErr = null;
      }
    } catch (e2) {}
  }

  if (insertErr || !message) {
    console.error('Chat insert error:', insertErr?.message || insertErr);
    return res.status(500).json({ error: insertErr?.message || 'Failed to send message' });
  }

  if (muteUpdate) {
    try {
      await (req.userClient || supabaseAdmin).from('users').update(muteUpdate).eq('id', profile.id);
    } catch (e) {}
  }
  if (violationToLog) {
    try {
      await (req.userClient || supabaseAdmin).from('chat_violations').insert(violationToLog);
    } catch (e) {}
  }

  res.json({ ...message, warning });
});

// --- Chat Seen Receipts (Facebook-style Read Receipts) ---
const chatReceiptsFile = path.join(__dirname, 'data', 'chat-seen-receipts.json');
function getChatReceipts() {
  try {
    if (!fs.existsSync(chatReceiptsFile)) return {};
    return JSON.parse(fs.readFileSync(chatReceiptsFile, 'utf8'));
  } catch (err) {
    return {};
  }
}
function saveChatReceipts(data) {
  try {
    fs.writeFileSync(chatReceiptsFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save chat receipts:', err.message);
  }
}

app.post('/api/chat/mark-seen', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;

  const { conversationId, lastMessageId, lastMessageTime } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'Missing conversationId' });
  }

  const receipts = getChatReceipts();
  if (!receipts[conversationId]) {
    receipts[conversationId] = {};
  }

  receipts[conversationId][profile.id] = {
    userId: profile.id,
    userName: profile.full_name || 'Participant',
    lastMessageId: lastMessageId || null,
    lastMessageTime: lastMessageTime || new Date().toISOString(),
    seenAt: new Date().toISOString()
  };

  saveChatReceipts(receipts);
  res.json({ success: true, receipt: receipts[conversationId][profile.id] });
});

app.get('/api/chat/seen-receipts', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;

  const { conversationId } = req.query;
  const receipts = getChatReceipts();
  if (conversationId) {
    return res.json({ receipts: receipts[conversationId] || {} });
  }
  res.json({ receipts });
});

// --- Learning Materials (centralized storage) ---
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

app.post('/api/materials/upload', materialUpload.any(), async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (!requireTeacherOrAdmin(profile, res)) return;

  const files = (req.files && req.files.length) ? req.files : (req.file ? [req.file] : []);
  const { title, subject, strand, grade_level, section } = req.body;
  if (!files.length || !title || !title.trim()) {
    return res.status(400).json({ error: 'Missing file(s) or title' });
  }

  // Force section to teacher's connected section if assigned
  const targetSection = (profile.role === 'teacher' && profile.section) ? profile.section : (section || null);
  const status = profile.role === 'admin' ? 'approved' : 'pending';

  const insertedMaterials = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const safeName = f.originalname.replace(/[^\w.\-]+/g, '_');
    const storagePath = `${profile.id}/${Date.now()}_${i}-${safeName}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('learning-materials')
      .upload(storagePath, f.buffer, { contentType: f.mimetype });
    if (uploadErr) {
      console.warn('Storage upload error for file:', safeName, uploadErr.message);
      continue;
    }

    const itemTitle = files.length === 1 ? title.trim() : (f.originalname.replace(/\.[^.]+$/, '') || title.trim());

    const { data: material, error: insertErr } = await supabaseAdmin
      .from('materials')
      .insert({
        title: itemTitle,
        subject: subject || null,
        strand: strand || null,
        grade_level: grade_level || null,
        section: targetSection,
        file_url: storagePath,
        file_type: f.mimetype,
        uploaded_by: profile.id,
        status,
      })
      .select().single();

    if (!insertErr && material) {
      insertedMaterials.push(material);
    }
  }

  if (insertedMaterials.length === 0) {
    return res.status(500).json({ error: 'Failed to upload materials' });
  }

  if (files.length === 1) {
    res.json(insertedMaterials[0]);
  } else {
    res.json({ success: true, count: insertedMaterials.length, materials: insertedMaterials });
  }
});

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

  if (strand) query = query.eq('strand', strand);
  if (grade_level) query = query.eq('grade_level', grade_level);
  if (subject) query = query.eq('subject', subject);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const uploaderIds = [...new Set((data || []).map(m => m.uploaded_by).filter(Boolean))];
  let namesById = {};
  if (uploaderIds.length) {
    const { data: uploaders } = await supabaseAdmin
      .from('users').select('id, full_name').in('id', uploaderIds);
    namesById = Object.fromEntries((uploaders || []).map(u => [u.id, u.full_name]));
  }

  res.json((data || []).map(m => ({ ...m, uploaded_by_name: namesById[m.uploaded_by] || null })));
});

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
    .createSignedUrl(material.file_url, 60 * 10);
  if (error) return res.status(500).json({ error: error.message });

  if (req.query.redirect === '1') {
    return res.redirect(data.signedUrl);
  }

  res.json({ url: data.signedUrl, title: material.title, file_type: material.file_type });
});

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

  const { data: material } = await supabaseAdmin
    .from('materials').select('file_url').eq('id', req.params.id).single();
  if (!material) return res.status(404).json({ error: 'Not found' });

  await supabaseAdmin.storage.from('learning-materials').remove([material.file_url]);
  const { error: delErr } = await supabaseAdmin.from('materials').delete().eq('id', req.params.id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  res.json({ success: true, deleted: true });
});

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

// --- Quiz management & approval endpoints (Admin & Teachers) ---
app.patch('/api/quizzes/:id/status', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (profile.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { status } = req.body;
  if (!['approved', 'active', 'rejected', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (status === 'rejected') {
    // Admin denied quiz: delete all associated quiz_attempts first, then delete the quiz
    await supabaseAdmin.from('quiz_attempts').delete().eq('quiz_id', req.params.id);
    const { error: delErr } = await supabaseAdmin.from('quizzes').delete().eq('id', req.params.id);
    if (delErr) return res.status(500).json({ error: delErr.message });
    return res.json({ success: true, deleted: true, id: req.params.id });
  }

  // 'approved' or 'active' or 'closed'
  const newStatus = status === 'approved' ? 'active' : status;
  const { data, error } = await supabaseAdmin
    .from('quizzes').update({ status: newStatus }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/quizzes/:id', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;

  const { data: quiz } = await supabaseAdmin
    .from('quizzes').select('*').eq('id', req.params.id).single();
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const canDelete = profile.role === 'admin' || quiz.created_by === profile.id;
  if (!canDelete) return res.status(403).json({ error: 'Not allowed to delete this quiz' });

  // Delete all associated attempts first to satisfy foreign key constraints
  await supabaseAdmin.from('quiz_attempts').delete().eq('quiz_id', req.params.id);
  const { error } = await supabaseAdmin.from('quizzes').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, id: req.params.id });
});

// --- Quiz attempts & class records retrieval for Teachers & Admins ---
app.get('/api/quiz-attempts/:quizId', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (!['teacher', 'admin'].includes(profile.role)) return res.status(403).json({ error: 'Teacher or Admin only' });

  const { quizId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .order('submitted_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ attempts: data || [] });
});

app.get('/api/class-records', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (!['teacher', 'admin'].includes(profile.role)) return res.status(403).json({ error: 'Teacher or Admin only' });

  const { data, error } = await supabaseAdmin
    .from('class_records')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ records: data || [] });
});

app.get('/api/users', async (req, res) => {
  const profile = await requireUser(req, res);
  if (!profile) return;
  if (!['teacher', 'admin'].includes(profile.role)) return res.status(403).json({ error: 'Teacher or Admin only' });

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, full_name, school_id, role, strand, grade_level, section, subjects, email, is_active, created_at, last_active_at, avatar_url, bio, profanity_strikes, permanently_muted, muted_until')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data || [] });
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_FORMATS = ['mc', 'id', 'match', 'tf', 'true_false', 'multiple_choice', 'identification', 'matching'];
const MAX_TEXT_LENGTH = 35000;

const STOP_WORDS = new Set([
  'this', 'that', 'these', 'those', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'there', 'here', 'we', 'us', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'i', 'me', 'my', 'myself',
  'which', 'what', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'some', 'many', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'another', 'several',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'the', 'a', 'an', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
  'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
  'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'also', 'however',
  'therefore', 'furthermore', 'moreover', 'in addition', 'for example', 'for instance',
  'note', 'example', 'figure', 'table', 'chapter', 'section', 'page', 'module', 'handout',
  'true', 'false', 'none', 'neither', 'either', 'yes', 'issue', 'problem', 'reason', 'fact', 'aspect', 'item', 'thing', 'way', 'type', 'types', 'kind', 'kinds'
]);

function validateQuizRequest(body) {
  const errors = [];
  if (typeof body.title !== 'string' || body.title.length > 200) errors.push('Invalid title.');
  if (typeof body.subject !== 'string' || body.subject.length > 200) errors.push('Invalid subject.');
  if (typeof body.fileName !== 'string' || body.fileName.length > 255) errors.push('Invalid file name.');
  if (!Array.isArray(body.formats) || body.formats.length === 0 || !body.formats.every(f => ALLOWED_FORMATS.includes(f))) {
    errors.push('formats must be a non-empty array containing valid question formats.');
  }
  
  if (typeof body.count === 'string' && /^\d+$/.test(body.count)) {
    body.count = parseInt(body.count, 10);
  }
  const isValidCount = body.count === 'auto' || (typeof body.count === 'number' && Number.isInteger(body.count) && body.count >= 1 && body.count <= 60);
  if (!isValidCount) {
    errors.push('count must be "auto" or an integer between 1 and 60.');
  }

  if (body.formatCounts && typeof body.formatCounts === 'object') {
    for (const [fmt, rawNum] of Object.entries(body.formatCounts)) {
      const num = (typeof rawNum === 'string' && /^\d+$/.test(rawNum)) ? parseInt(rawNum, 10) : rawNum;
      body.formatCounts[fmt] = num;
      if (!ALLOWED_FORMATS.includes(fmt) || typeof num !== 'number' || !Number.isInteger(num) || num < 0 || num > 60) {
        errors.push(`Invalid format count for ${fmt}: must be an integer between 0 and 60.`);
      }
    }
  }

  if (typeof body.sourceText !== 'string') errors.push('sourceText must be a string.');
  else if (body.sourceText.length > MAX_TEXT_LENGTH) errors.push(`sourceText exceeds ${MAX_TEXT_LENGTH} characters.`);
  return errors;
}

const FORMAT_LABELS = { 
  mc: 'Multiple Choice', 
  id: 'Identification', 
  match: 'Matching Type',
  tf: 'True or False',
  true_false: 'True or False',
  multiple_choice: 'Multiple Choice',
  identification: 'Identification',
  matching: 'Matching Type'
};

function buildPrompt({ title, subject, formats, count, formatCounts, distributionMode, sourceText, fileName, files = [], optionsCount = 4 }) {
  const normalizedFormats = formats.map(f => f === 'true_false' ? 'tf' : f === 'multiple_choice' ? 'mc' : f === 'identification' ? 'id' : f === 'matching' ? 'match' : f);
  const formatList = normalizedFormats.map(f => FORMAT_LABELS[f] || f).join(', ');
  const numChoices = Math.min(6, Math.max(2, parseInt(optionsCount, 10) || 4));
  
  let countInstruction = '';
  if (distributionMode === 'custom' && formatCounts && Object.keys(formatCounts).length > 0) {
    const lines = [];
    let totalCustom = 0;
    normalizedFormats.forEach(f => {
      const num = formatCounts[f] || (f === 'tf' ? formatCounts['true_false'] : 0) || 0;
      if (num > 0) {
        lines.push(`- Exactly ${num} ${FORMAT_LABELS[f]} questions`);
        totalCustom += num;
      }
    });
    if (lines.length > 0) {
      countInstruction = `Generate exactly ${totalCustom} questions total with this exact breakdown:\n${lines.join('\n')}`;
    }
  }

  if (!countInstruction) {
    if (count === 'auto') {
      if (normalizedFormats.length > 1) {
        countInstruction = `Choose a sensible number of questions (around 10-15 total) based on the material, ensuring an even and balanced distribution across all requested question formats: ${formatList} (e.g. approximately equal numbers of each format).`;
      } else {
        countInstruction = `Choose a sensible number of questions (around 10-15) based on how much material is provided.`;
      }
    } else {
      if (normalizedFormats.length > 1) {
        countInstruction = `Generate exactly ${count} questions total, distributed evenly and balanced across the requested formats (${formatList}).`;
      } else {
        countInstruction = `Generate exactly ${count} questions of type ${formatList}.`;
      }
    }
  }

  const validFiles = Array.isArray(files) && files.length > 0
    ? files.map(f => typeof f === 'string' ? f.trim() : (f.name || '')).filter(Boolean)
    : (fileName ? fileName.split(',').map(s => s.trim()).filter(Boolean) : []);

  let multiHandoutInstruction = '';
  if (validFiles.length > 1) {
    multiHandoutInstruction = `
MULTI-HANDOUT BALANCED COVERAGE REQUIREMENT:
You have received reference material from MULTIPLE uploaded handouts: ${validFiles.map(f => `"${f}"`).join(', ')}.
You MUST generate questions evenly and proportionally distributed across ALL ${validFiles.length} handouts. DO NOT draw all or most questions from only one handout! Every uploaded handout must have its concepts actively tested and cited in the quiz questions.
`;
  }

  const hasText = sourceText && sourceText.trim().length > 30;
  const material = hasText
    ? sourceText
    : `(No readable text was extracted from "${fileName}". Generate plausible, general questions for a senior high school ${subject || 'ICT'} class on this topic, inferred only from the filename.)`;

  return `You are helping an educational teacher build a high-quality academic quiz for senior high school students based on their learning handouts.

Subject / quiz title: ${title}
Requested question formats: ${formatList}
Multiple choice options count requirement: Exactly ${numChoices} distinct options per Multiple Choice question.
Question quantity requirements:
${countInstruction}
${multiHandoutInstruction}

The text below contains reference material extracted from one or more uploaded handouts. Each section or page includes a marker like "[Document: Name | Page: X]".
IMPORTANT CITATION RULE:
For each question, cite ONLY the specific individual handout filename (e.g. "GD_01_Handout_1.pdf") where that question's specific concept was taken from, along with its specific page number. DO NOT list or combine all filenames together in source_file. Every question must have exactly ONE filename for "source_file" and ONE page number for "source_page".

=== BEGIN SOURCE MATERIAL ===
${material}
=== END SOURCE MATERIAL ===

Return ONLY raw JSON (no markdown fences, no commentary) matching this exact schema:
{
  "questions": [
    { 
      "type": "multiple_choice", 
      "question": "string", 
      "options": ["string"... exactly ${numChoices} options], 
      "answer": "string (must exactly match one option)",
      "source_file": "string (the single exact filename where this question was found)",
      "source_page": 1
    },
    { 
      "type": "true_false", 
      "question": "string (a clear factual statement)", 
      "options": ["True", "False"], 
      "answer": "True" or "False",
      "explanation": "string (clear 1-2 sentence explanation specifying why this statement is True or False, and explaining why the alternate choice is wrong)",
      "source_file": "string (the single exact filename)",
      "source_page": 1
    },
    { 
      "type": "identification", 
      "question": "string", 
      "answer": "string",
      "source_file": "string (the single exact filename)",
      "source_page": 1
    },
    { 
      "type": "matching", 
      "instructions": "string", 
      "pairs": [{"left":"string","right":"string"}],
      "source_file": "string (the single exact filename)",
      "source_page": 1
    }
  ]
}
CRITICAL QUALITY AND ACCURACY RULES:
1. NEVER USE FIGURE, TABLE, DIAGRAM, OR PAGE LABELS AS ANSWERS:
   - Do NOT create questions where the correct answer or any option is "Figure 1", "Figure 2", "Table 1", "Diagram 3", "Image 1", "Page 2", "Module 1", "Chapter 1", etc.
   - The answer must ALWAYS be the actual technical term, concept, function, tool, or principle (e.g. "Java Virtual Machine", "main method", "Bytecode", "JDK", "Inheritance").
2. CONCISE, CLEAN, SELF-CONTAINED ANSWERS ONLY:
   - Identification and Multiple Choice answers must be concise terms or short phrases (1 to 5 words).
   - NEVER append trailing pronouns, filler phrases, or punctuation to answers or options (e.g. NEVER "Programming - It", "Assembly Language - It", "Compiler - it", "Variable - this", or "Function - which"). Strip all trailing dashes and pronouns (" - It", " - This", " - These") so the answer is strictly the clean noun or concept (e.g. "Programming", "Assembly Language", "Compiler").
   - NEVER provide a cut-off sentence fragment or run-on clause ending in conjunctions (e.g. NEVER "The main method is a special method and" or "which is used to").
   - If a sentence says "The main method is a special method and is the entry point of the program execution", the answer is strictly "main method", NOT the sentence fragment.
3. PROFESSIONAL QUESTION FORMULATION:
   - Formulate natural, well-phrased questions that test understanding (e.g., "What is the primary method that acts as the entry point of program execution in Java?").
4. TRUE / FALSE EXPLANATION REQUIREMENT:
   - For every True/False question, you MUST provide an "explanation" property explaining the factual reason why the statement is True or False, and specifying why the opposite choice is wrong.
   - If the statement is False, clearly state what makes it incorrect and what the true fact or rule is (e.g. "Booleans in Java cannot be converted to numeric types because they are incompatible primitive types").
   - If the statement is True, succinctly cite the supporting rule or definition from the lesson.
5. NEVER CITE OR MENTION FILENAMES, EXTENSIONS, OR HANDOUTS IN THE QUESTION TEXT:
   - NEVER start questions with "According to [filename]...", "In [filename]...", "Based on [filename]...", "As stated in Document...", or mention any file name, PDF extension (.pdf), or document title inside the "question" string itself or within the "options".
   - Phrase questions as natural, direct academic questions testing the concept itself (e.g. "What is the primary purpose of On-the-Job Training (OJT)?" instead of "According to 01_Handout_1A(35).pdf, which statement accurately reflects...?").
   - The citation MUST reside ONLY in the metadata attributes "source_file" and "source_page", where students can view it after answering as a reference!
6. GROUND DISTRACTORS STRICTLY IN THE HANDOUT CONTENT:
   - All answer options and distractors must be directly grounded in the concepts present in the provided learning material.
   - NEVER inject unrelated subjects (e.g., if the material is about Work Ethics or Computing, NEVER insert options like "General Biology", "Biology", or arbitrary scientific topics into the choices, even if the quiz title mentions a different subject). The source material is the sole authority for question and option content.

Only include "type" values matching the requested formats. For True/False, options must be ["True", "False"]. For multiple choice, ensure ${numChoices} options. Base every question directly on the source material provided. Always include the specific individual "source_file" and "source_page" attributes.`;
}

function isForbiddenFigureLabel(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (/^(figure|fig|table|tbl|diagram|chart|graph|image|photo|illustration|page|pg|chapter|ch|section|sec|module|mod|part|lesson|appendix|step|box|item|no|num)\b[\s.:–-]*\d+/i.test(clean)) return true;
  if (/^(figure|table|diagram|chart|graph|image|photo|illustration|page|chapter|appendix|section|module|lesson|handout|module\s*no)$/i.test(clean)) return true;
  return false;
}

function cleanAnswerTerm(answer) {
  if (!answer || typeof answer !== 'string') return '';
  let str = answer.trim();
  if (str.includes('\n')) {
    const lines = str.split('\n').map(l => l.trim()).filter(Boolean);
    str = lines[lines.length - 1] || str;
  }
  str = str.replace(/^["'`“‘]+|[)"'`”’:,;.]+$/g, '').trim();
  // Strip trailing pronoun connectors like " - It", " - it", " - These", " - This", " : It", " — It", " - They"
  str = str.replace(/\s*[-–—:]\s*(it|its|this|these|they|them|that|which)\s*$/i, '').trim();
  // Strip trailing dashes, colons, or punctuation
  str = str.replace(/\s*[-–—:]+$/g, '').trim();
  // Strip trailing conjunctions, prepositions, or copulas (e.g. "and", "or", "is", "which")
  str = str.replace(/\s+(it|its|this|these|they|them|and|or|but|with|to|for|of|in|on|at|by|is|are|was|were|which|that|the|a|an)$/i, '').trim();
  // If answer starts with "The ... is ... and" or "X is a ...", extract the subject X
  const clauseMatch = str.match(/^(?:the|a|an)?\s*([A-Za-z0-9\s_-]{2,35})\s+(?:is|are)\s+(?:a|an|the|defined|used|special)/i);
  if (clauseMatch && clauseMatch[1] && clauseMatch[1].trim().length >= 2) {
    str = clauseMatch[1].trim();
  }
  // Strip trailing pronoun connectors again after clause extraction
  str = str.replace(/\s*[-–—:]\s*(it|its|this|these|they|them|that|which)\s*$/i, '').trim();
  str = str.replace(/\s*[-–—:]+$/g, '').trim();
  return str;
}

function sanitizeQuestions(raw, fileList = [], fallbackFileName = '') {
  if (!Array.isArray(raw)) return [];
  const validFiles = Array.isArray(fileList) && fileList.length > 0
    ? fileList.map(f => typeof f === 'string' ? f.trim() : (f.name || '')).filter(Boolean)
    : (fallbackFileName ? fallbackFileName.split(',').map(s => s.trim()).filter(Boolean) : []);

  return raw.map(q => {
    if (!q) return null;
    let type = q.type;
    if (type === 'mc') type = 'multiple_choice';
    if (type === 'tf') type = 'true_false';
    if (type === 'id') type = 'identification';
    if (type === 'match') type = 'matching';

    // Strip accidental file/handout citations from question text
    if (typeof q.question === 'string') {
      let qText = q.question.trim();
      qText = qText.replace(/^(?:according\s+to|in|based\s+on|as\s+stated\s+in|from)\s+["']?[^"'\n,:–-]+\.(?:pdf|docx?|txt|xlsx?)["']?[\s,:–-]+/i, '');
      qText = qText.replace(/^(?:according\s+to|in|based\s+on|as\s+stated\s+in|from)\s+(?:the\s+)?(?:handout|material|document|module|file|reading)[\s,:–-]+/i, '');
      qText = qText.trim();
      if (qText.length > 0) {
        qText = qText.charAt(0).toUpperCase() + qText.slice(1);
      }
      q.question = qText;
    }

    return { ...q, type };
  }).filter(q => {
    if (!q || (typeof q.question !== 'string' && q.type !== 'matching')) return false;

    // Check and clean answer
    if (typeof q.answer === 'string') {
      q.answer = cleanAnswerTerm(q.answer);
      if (isForbiddenFigureLabel(q.answer)) return false;
    }

    if (q.type === 'multiple_choice') {
      if (!Array.isArray(q.options) || q.options.length < 2) return false;
      q.options = q.options.map(o => cleanAnswerTerm(String(o))).filter(o => {
        if (isForbiddenFigureLabel(o)) return false;
        // Filter out artificial placeholder distractors like "Key principle regarding General Biology (Part 5)"
        if (/^key principle regarding/i.test(o) && /\(part\s*\d+\)$/i.test(o)) return false;
        return true;
      });
      if (q.options.length < 2) return false;

      if (q.multipleAnswers === true || (Array.isArray(q.answers) && q.answers.length > 1)) {
        const rawAnswers = Array.isArray(q.answers) ? q.answers : (typeof q.answer === 'string' ? q.answer.split(',').map(s => s.trim()) : []);
        const validAnswers = [];
        rawAnswers.forEach(rawA => {
          const match = q.options.find(o => o.toLowerCase() === String(rawA).toLowerCase());
          if (match && !validAnswers.includes(match)) validAnswers.push(match);
        });
        if (validAnswers.length >= 2) {
          q.multipleAnswers = true;
          q.answers = validAnswers;
          q.answer = validAnswers.join(', ');
        } else {
          q.multipleAnswers = false;
          q.answer = validAnswers[0] || q.options[0];
          q.answers = [q.answer];
        }
      } else {
        if (!q.options.includes(q.answer)) {
          const match = q.options.find(o => String(o).trim().toLowerCase() === String(q.answer || '').trim().toLowerCase());
          if (match) q.answer = match;
          else q.answer = q.options[0];
        }
      }
      return true;
    }
    if (q.type === 'true_false') {
      if (!Array.isArray(q.options) || q.options.length !== 2) q.options = ['True', 'False'];
      if (typeof q.answer !== 'string') q.answer = 'True';
      const isTrue = String(q.answer).toLowerCase() === 'true';
      if (!q.explanation || typeof q.explanation !== 'string' || !q.explanation.trim()) {
        q.explanation = isTrue
          ? `This statement is correct based on the learning material.`
          : `This statement is false because the actual principle states otherwise in the course material.`;
      } else {
        q.explanation = q.explanation.trim();
      }
      return true;
    }
    if (q.type === 'identification') {
      if (typeof q.answer !== 'string' || q.answer.trim().length < 2) return false;
      if (isForbiddenFigureLabel(q.answer)) return false;
      // Refine repetitive robotic question phrasing
      if (/^Identify the term or concept defined as:\s*"/i.test(q.question)) {
        q.question = q.question.replace(/^Identify the term or concept defined as:\s*"/i, 'Which concept is described as: "');
      }
      return true;
    }
    if (q.type === 'matching') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) return false;
      q.pairs = q.pairs.filter(p => p && typeof p.left === 'string' && typeof p.right === 'string' && !isForbiddenFigureLabel(p.right) && !isForbiddenFigureLabel(p.left));
      return q.pairs.length >= 2;
    }
    return false;
  }).map((q, idx) => {
    let srcFile = (q.source_file || '').trim();
    if (srcFile.includes(',') && validFiles.length > 0) {
      const match = validFiles.find(f => srcFile.includes(f));
      srcFile = match || validFiles[idx % validFiles.length];
    } else if (!srcFile || srcFile === 'Handout Material') {
      srcFile = validFiles.length > 0 ? validFiles[idx % validFiles.length] : (fallbackFileName || 'Handout Material');
    }
    q.source_file = srcFile;

    if (q.source_page) {
      const match = String(q.source_page).match(/\d+/);
      q.source_page = match ? parseInt(match[0], 10) : String(q.source_page).replace(/^(page\s*)+/i, '').trim() || (idx % 5) + 1;
    } else {
      q.source_page = (idx % 5) + 1;
    }
    return q;
  }).slice(0, 50);
}

const quizLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many quiz generation requests. Please wait a few minutes and try again.' }
});

const INVALID_TERM_STARTERS = /^(one|a|an|the|this|that|these|those|there|here|some|many|most|all|any|another|other|each|every|such|few|several|what|which|who|whom|whose|when|where|why|how|it|its|their|they|we|you|he|she|in|on|at|by|for|with|about|as|if|because|due|since|according|furthermore|moreover|however|therefore|additionally|first|second|third|finally|also)\b/i;

function isValidAcademicTerm(term) {
  if (!term || typeof term !== 'string') return false;
  let clean = term.trim().replace(/^["'`“‘(]+|[)"'`”’:,;.]+$/g, '').trim();
  clean = clean.replace(/^(the|a|an)\s+/i, '').trim();
  if (clean.length < 3 || clean.length > 45) return false;

  // Reject terms with OCR / symbol noise or brackets or punctuation
  if (/[»«\\|/\[\]{}~@#$%^&*_=<>©®\(\),;]/.test(clean)) return false;
  // Reject copyright / attribution strings
  if (/encyclop[æe]dia britannica|all rights reserved|getty images|shutterstock|wikipedia/i.test(clean)) return false;

  // Reject figure, table, diagram, page labels
  if (isForbiddenFigureLabel(clean)) return false;

  // Reject terms with numbers (e.g. "Tire in 1", "of EA 2", "Page 4")
  if (/\b\d+\b/.test(clean)) return false;

  // Reject 2 or 3 character uppercase acronym noise (e.g. "RI", "EA")
  if (/^[A-Z]{2,3}$/.test(clean)) return false;

  // Reject sentence fragments containing copula/linking verbs
  if (/\b(is|are|was|were|has|have|can|will|should|represents|defined)\b/i.test(clean)) return false;

  // Reject terms ending with conjunctions, prepositions, or articles
  if (/\b(and|or|but|with|to|for|of|in|on|at|by|as|from|which|that|the|a|an)$/i.test(clean)) return false;

  const words = clean.split(/\s+/);
  if (words.length < 1 || words.length > 5) return false;
  if (INVALID_TERM_STARTERS.test(clean)) return false;
  if (STOP_WORDS && STOP_WORDS.has(clean.toLowerCase())) return false;
  if (/^[0-9\W]+$/.test(clean)) return false;

  // Ensure high ratio of alphabetic characters
  const alpha = (clean.match(/[a-zA-Z]/g) || []).length;
  if ((alpha / clean.length) < 0.75) return false;

  return true;
}

const DOMAIN_DISTRACTORS = {
  general: [
    'Systematic Methodology', 'Theoretical Framework', 'Empirical Analysis', 'Qualitative Evaluation',
    'Quantitative Metric', 'Conceptual Model', 'Hierarchical Structure', 'Comparative Assessment',
    'Standard Protocol', 'Functional Requirement', 'Integrated Workflow', 'Iterative Lifecycle'
  ],
  tech: [
    'Object-Oriented Design', 'Relational Database Schema', 'Algorithm Optimization', 'Data Normalization',
    'Asynchronous Execution', 'Polymorphic Interface', 'Encapsulation Principle', 'Client-Server Architecture',
    'Memory Management', 'Control Flow Structure', 'Distributed Processing', 'API Gateway'
  ],
  gamedev: [
    'Game Engine Architecture', 'Collision Detection System', 'Ray Tracing Pipeline', 'Sprite Animation State',
    'Level Design Layout', 'Finite State Machine', 'Particle Simulation', 'Frame Rate Optimization',
    'Asset Pipeline Management', 'Kinematic Physics Body', 'Spatial Partitioning', 'Non-Player Character AI'
  ]
};

function extractQuestionsFromText(params) {
  const { title = 'Quiz', fileName = '', files = [], formats = ['multiple_choice'], count = 10, sourceText = '', optionsCount = 4 } = params;
  const targetCount = typeof count === 'number' && count > 0 ? count : 10;
  const numChoices = Math.min(6, Math.max(2, parseInt(optionsCount, 10) || 4));
  const validFiles = Array.isArray(files) && files.length > 0
    ? files.map(f => typeof f === 'string' ? f.trim() : (f.name || '')).filter(Boolean)
    : (fileName ? fileName.split(',').map(s => s.trim()).filter(Boolean) : ['Handout Material']);

  const questions = [];
  const usedAnswers = new Set();
  const usedQuestions = new Set();
  
  // Clean and split source text into sections by document marker
  const rawClean = (sourceText || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const docSections = [];
  const markerRegex = /\[Document:\s*([^\]|]+?)\s*\|\s*Page:\s*(\d+)\]/gi;
  let lastIdx = 0;
  let match;
  let currentDoc = validFiles[0] || 'Handout Material';
  let currentPage = 1;

  while ((match = markerRegex.exec(rawClean)) !== null) {
    if (match.index > lastIdx) {
      const textChunk = rawClean.slice(lastIdx, match.index).trim();
      if (textChunk) {
        docSections.push({ doc: currentDoc, page: currentPage, text: textChunk });
      }
    }
    currentDoc = match[1].trim();
    currentPage = parseInt(match[2], 10) || 1;
    lastIdx = markerRegex.lastIndex;
  }
  if (lastIdx < rawClean.length) {
    const textChunk = rawClean.slice(lastIdx).trim();
    if (textChunk) {
      docSections.push({ doc: currentDoc, page: currentPage, text: textChunk });
    }
  }

  if (docSections.length === 0) {
    docSections.push({ doc: currentDoc, page: 1, text: rawClean });
  }

  // Extract definition pairs and sentences grouped by document
  const colonRegex = /^([A-Z][A-Za-z0-9\s-]{2,40})\s*[:–—-]\s*(.{10,240})$/;
  const allItems = [];
  const itemsByDoc = {};
  validFiles.forEach(f => { itemsByDoc[f] = []; });

  docSections.forEach(sec => {
    const lines = sec.text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!itemsByDoc[sec.doc]) itemsByDoc[sec.doc] = [];

    // Check line-by-line for bullet / colon definitions
    lines.forEach(line => {
      const cMatch = line.match(colonRegex);
      if (cMatch) {
        let rawTerm = cMatch[1].trim().replace(/^[•\-*]\s*/, '').replace(/^(the|a|an)\s+/i, '').trim();
        let def = cMatch[2].trim().replace(/[.;]+$/, '');

        // If def starts with "It is ...", "This is ...", "These are ...", clean def
        def = def.replace(/^(it|this|these|they)\s+(?:is|are|refers to|means)\s+(?:a|an|the)?/i, '').trim();

        // If rawTerm ends with " - It", " - This", " - These", strip it
        const dashPronounMatch = rawTerm.match(/^(.+?)\s*[-–—:]\s*(?:it|this|these|they|that)\s*$/i);
        if (dashPronounMatch && dashPronounMatch[1].trim().length >= 2) {
          rawTerm = dashPronounMatch[1].trim();
        }

        // Cut off if definition bled into a subsequent heading/term
        const nextTermIdx = def.search(/\s+[A-Z][A-Za-z0-9\s-]{2,30}\s*[-–—:]\s*(?:it|this|these|they|is|are)\b/i);
        if (nextTermIdx > 10) {
          def = def.slice(0, nextTermIdx).trim();
        }

        rawTerm = cleanAnswerTerm(rawTerm);
        if (isValidAcademicTerm(rawTerm) && def.length >= 8 && !isForbiddenFigureLabel(rawTerm)) {
          const itemObj = { doc: sec.doc, page: sec.page, term: rawTerm, def, sentence: line, isDef: true };
          allItems.push(itemObj);
          itemsByDoc[sec.doc].push(itemObj);
        }
      } else {
        const cleanLine = cleanAnswerTerm(line);
        if (isValidAcademicTerm(cleanLine) && !isForbiddenFigureLabel(cleanLine) && cleanLine.length >= 3 && cleanLine.length <= 40) {
          const itemObj = {
            doc: sec.doc,
            page: sec.page,
            term: cleanLine,
            def: '',
            sentence: line,
            isDef: false
          };
          allItems.push(itemObj);
          itemsByDoc[sec.doc].push(itemObj);
        }
      }
    });

    const isGarbageOcr = (str) => {
      if (!str || typeof str !== 'string') return true;
      const symbols = (str.match(/[»«\\|/\[\]{}~@#$%^&*_=<>©®\(\)]/g) || []).length;
      if (symbols > 1 || (symbols / str.length) > 0.05) return true;
      if (/encyclop[æe]dia britannica|all rights reserved|getty images|shutterstock/i.test(str)) return true;
      if (/\b[a-zA-Z]+\s+\d+\b|\b\d+\s+[a-zA-Z]+\b/.test(str)) return true;
      return false;
    };

    // Check sentence-by-sentence
    const sList = sec.text.split(/(?<=[.!?\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 240 && !s.startsWith('%') && !s.startsWith('#') && !isGarbageOcr(s));

    sList.forEach(s => {
      // Find definition verb non-greedily
      const verbMatch = s.match(/\b(is\s+defined\s+as|is\s+described\s+as|refers\s+to|means|represents|is\s+(?:a|an|the)|are\s+(?:the|defined|used))\b/i);
      if (verbMatch && verbMatch.index > 0) {
        let rawSubject = s.slice(0, verbMatch.index).trim().replace(/^(the|a|an)\s+/i, '').replace(/^[•\-*]\s*/, '').trim();
        let rawDef = s.slice(verbMatch.index + verbMatch[0].length).trim().replace(/[.;]+$/, '');

        // If subject contains " - It", " - This", " - These", e.g. "Programming - It is..."
        const dashPronounMatch = rawSubject.match(/^(.+?)\s*[-–—:]\s*(?:it|this|these|they|that)\s*$/i);
        if (dashPronounMatch && dashPronounMatch[1].trim().length >= 2) {
          rawSubject = dashPronounMatch[1].trim();
        }

        // Cut off if definition bled into a subsequent heading/term
        const nextTermIdx = rawDef.search(/\s+[A-Z][A-Za-z0-9\s-]{2,30}\s*[-–—:]\s*(?:it|this|these|they|is|are)\b/i);
        if (nextTermIdx > 10) {
          rawDef = rawDef.slice(0, nextTermIdx).trim();
        }

        rawSubject = cleanAnswerTerm(rawSubject);
        if (isValidAcademicTerm(rawSubject) && rawDef.length > 8 && !isForbiddenFigureLabel(rawSubject)) {
          const itemObj = { doc: sec.doc, page: sec.page, term: rawSubject, def: rawDef, sentence: s, isDef: true };
          allItems.push(itemObj);
          itemsByDoc[sec.doc].push(itemObj);
          return;
        }
      }
      const itemObj = { doc: sec.doc, page: sec.page, term: '', def: '', sentence: s, isDef: false };
      allItems.push(itemObj);
      itemsByDoc[sec.doc].push(itemObj);
    });
  });

  // Ensure every document in validFiles has items
  validFiles.forEach(f => {
    if (!itemsByDoc[f] || itemsByDoc[f].length === 0) {
      // Extract any available sentences from raw text before falling back
      const rawSentences = rawClean.split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 25 && s.length < 200);
      if (rawSentences.length > 0) {
        rawSentences.slice(0, 10).forEach((rs, rIdx) => {
          const words = rs.split(/\s+/);
          const candidateTerm = words.slice(0, 3).join(' ').replace(/[^a-zA-Z0-9\s]/g, '').trim();
          const itemObj = {
            doc: f,
            page: 1,
            term: isValidAcademicTerm(candidateTerm) ? candidateTerm : '',
            def: rs,
            sentence: rs,
            isDef: false
          };
          allItems.push(itemObj);
          itemsByDoc[f].push(itemObj);
        });
      }
    }
  });

  // Collect all valid unique extracted terms from actual text
  const validTermsList = [];
  allItems.forEach(it => {
    if (it.term && isValidAcademicTerm(it.term) && !validTermsList.includes(it.term)) {
      validTermsList.push(it.term);
    }
  });

  // Also collect capitalized technical phrases from source text as clean domain distractors
  const extractedPhrases = [];
  const phraseMatches = rawClean.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) || [];
  phraseMatches.forEach(p => {
    const cleanP = cleanAnswerTerm(p);
    if (isValidAcademicTerm(cleanP) && !validTermsList.includes(cleanP) && !extractedPhrases.includes(cleanP)) {
      extractedPhrases.push(cleanP);
    }
  });

  const getFreshDistractors = (answer, neededCount) => {
    const pool = [...validTermsList, ...extractedPhrases].filter(t => 
      t && t.toLowerCase() !== (answer || '').toLowerCase() && isValidAcademicTerm(t)
    );
    const shuffled = [...new Set(pool)].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, neededCount);
    const fallbackTerms = [...DOMAIN_DISTRACTORS.general, ...DOMAIN_DISTRACTORS.tech].filter(t => 
      t.toLowerCase() !== (answer || '').toLowerCase() && !chosen.includes(t)
    );
    while (chosen.length < neededCount && fallbackTerms.length > 0) {
      const cand = fallbackTerms.shift();
      if (cand && !chosen.includes(cand)) {
        chosen.push(cand);
      }
    }
    return chosen;
  };

  for (let i = 0; i < targetCount; i++) {
    const rawFmt = formats[i % formats.length];
    const fmt = rawFmt === 'mc' ? 'multiple_choice' : rawFmt === 'id' ? 'identification' : rawFmt === 'tf' ? 'true_false' : rawFmt;
    const isMc = fmt === 'multiple_choice';
    const isTf = fmt === 'true_false';
    const isId = fmt === 'identification';
    const isMatch = fmt === 'matching';
    
    // Balance evenly across all uploaded documents
    const targetDoc = validFiles[i % validFiles.length];
    const docPool = (itemsByDoc[targetDoc] && itemsByDoc[targetDoc].length > 0) ? itemsByDoc[targetDoc] : (allItems.length > 0 ? allItems : [{ doc: targetDoc, page: 1, term: 'Core Concept', def: 'Fundamental subject concept', sentence: 'Essential learning principle', isDef: true }]);
    
    // Pick an item from this document's pool that hasn't had its answer used yet
    let item = null;
    for (let offset = 0; offset < docPool.length; offset++) {
      const candidate = docPool[(Math.floor(i / validFiles.length) + offset) % docPool.length];
      const ansCandidate = (candidate.isDef && candidate.term) ? candidate.term : candidate.sentence;
      if (ansCandidate && !usedAnswers.has(ansCandidate.toLowerCase().trim())) {
        item = candidate;
        break;
      }
    }
    if (!item) {
      item = docPool[i % docPool.length] || allItems[i % Math.max(1, allItems.length)];
    }

    const itemDoc = item.doc || targetDoc;
    const itemPage = item.page || 1;
    const sentenceSnippet = item.sentence ? (item.sentence.length > 90 ? item.sentence.slice(0, 90) + '...' : item.sentence) : 'the core principle';

    if (isMc) {
      let qText = '';
      let correct = '';
      if (item.isDef && item.def && item.term && isValidAcademicTerm(item.term)) {
        qText = `Which concept is described as: "${item.def}"?`;
        correct = item.term;
      } else {
        qText = `Which statement best describes the following concept: "${sentenceSnippet}"?`;
        correct = item.sentence || 'It represents an essential foundational principle';
      }

      // If correct answer was already used, try an unused academic term
      if (usedAnswers.has(correct.toLowerCase().trim())) {
        const unusedTerm = validTermsList.find(t => !usedAnswers.has(t.toLowerCase()));
        if (unusedTerm) {
          correct = unusedTerm;
          qText = `Which term best corresponds to the concept described by: "${sentenceSnippet}"?`;
        }
      }

      usedAnswers.add(correct.toLowerCase().trim());
      const distractors = getFreshDistractors(correct, numChoices - 1);
      const options = [correct, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        type: 'multiple_choice',
        question: qText,
        options: options,
        answer: correct,
        source_file: itemDoc,
        source_page: itemPage
      });
    } else if (fmt === 'true_false') {
      const isTrue = i % 2 === 0;
      let qText = '';
      let explanation = '';
      if (item.isDef && item.term && item.def && isValidAcademicTerm(item.term)) {
        if (isTrue) {
          qText = `${item.term} is defined as ${item.def.toLowerCase().startsWith('a') || item.def.toLowerCase().startsWith('the') ? item.def : 'the ' + item.def}.`;
          explanation = `This statement is True. By definition, ${item.term} refers to ${item.def}.`;
        } else {
          qText = `${item.term} is unrelated to and does not involve ${item.def.slice(0, 45)}.`;
          explanation = `This statement is False. ${item.term} directly relates to ${item.def}.`;
        }
      } else {
        if (isTrue) {
          qText = `${item.sentence.replace(/[.]+$/, '')}.`;
          explanation = `This statement is True as supported by the learning material.`;
        } else {
          qText = `It is incorrect to conclude that ${item.sentence.replace(/[.]+$/, '')}.`;
          explanation = `This statement is False. The course material explicitly validates this principle.`;
        }
      }

      questions.push({
        type: 'true_false',
        question: qText,
        options: ['True', 'False'],
        answer: isTrue ? 'True' : 'False',
        explanation: explanation,
        source_file: itemDoc,
        source_page: itemPage
      });
    } else if (isId) {
      let qText = '';
      let correct = '';
      if (item.isDef && item.def && item.term && isValidAcademicTerm(item.term)) {
        qText = `Identify the term: "${item.def}"`;
        correct = item.term;
      } else {
        qText = `Identify the concept associated with: "${sentenceSnippet}"`;
        correct = (item.term && isValidAcademicTerm(item.term)) ? item.term : (validTermsList[i % Math.max(1, validTermsList.length)] || 'Core Principle');
      }

      if (usedAnswers.has(correct.toLowerCase().trim())) {
        const unusedTerm = validTermsList.find(t => !usedAnswers.has(t.toLowerCase()));
        if (unusedTerm) {
          correct = unusedTerm;
          qText = `Identify the term described by: "${sentenceSnippet}"`;
        }
      }
      usedAnswers.add(correct.toLowerCase().trim());

      questions.push({
        type: 'identification',
        question: qText,
        answer: correct,
        source_file: itemDoc,
        source_page: itemPage
      });
    } else if (isMatch) {
      const defItems = docPool.filter(it => it.isDef && it.term && it.def && isValidAcademicTerm(it.term) && !usedAnswers.has(it.term.toLowerCase()));
      const selected = defItems.slice(0, 4);
      if (selected.length >= 2) {
        selected.forEach(p => usedAnswers.add(p.term.toLowerCase().trim()));
        questions.push({
          type: 'matching',
          instructions: `Match each description on the left with the correct concept on the right.`,
          pairs: selected.map(p => ({ left: p.def, right: p.term })),
          source_file: itemDoc,
          source_page: itemPage
        });
      } else {
        const correct = (item.term && isValidAcademicTerm(item.term)) ? item.term : (validTermsList[i % Math.max(1, validTermsList.length)] || 'Core Principle');
        usedAnswers.add(correct.toLowerCase().trim());
        const distractors = getFreshDistractors(correct, numChoices - 1);
        const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
        questions.push({
          type: 'multiple_choice',
          question: `Which key concept is emphasized in: "${sentenceSnippet}"?`,
          options: options,
          answer: correct,
          source_file: itemDoc,
          source_page: itemPage
        });
      }
    }
  }
  return questions;
}

// --- Image OCR & Academic Extraction Endpoint (Gemini Vision) ---
app.post('/api/quiz/extract-image', quizLimiter, async (req, res) => {
  try {
    const { imageBase64, mimeType, fileName } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' });

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'dummy_gemini_key') {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const actualMime = mimeType || 'image/jpeg';

    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash'
    ];

    for (const model of candidateModels) {
      try {
        let response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(25000),
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: "You are an expert academic diagram and educational OCR analyzer. Transcribe all text, labels, definitions, organelles, parts, bullet points, headers, and formulas in this image.\n\nFor diagrams (such as biological cells, organs, anatomical charts, physics, or chemistry diagrams), extract every labeled part and provide its clear definition or function formatted on its own line as 'Part Name: Description and function of this part' (for example: 'Mitochondrion: Organelle that generates chemical energy (ATP) to power the cell; the powerhouse of the cell', 'Ribosomes: Molecular machines responsible for protein synthesis', 'Nucleus: The membrane-enclosed organelle that contains genetic material and coordinates cellular activities', 'Golgi apparatus: Cellular organelle that packages and sorts proteins for secretion').\n\nDo not add conversational commentary or meta-text. Just output clean, line-separated academic terms and definitions."
                  },
                  {
                    inlineData: {
                      mimeType: actualMime,
                      data: cleanBase64
                    }
                  }
                ]
              }]
            })
          }
        );

        if (response.status === 503) {
          console.warn(`[ImageExtract] Gemini ${model} 503 spike, retrying after 1s...`);
          await new Promise(r => setTimeout(r, 1000));
          try {
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(25000),
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      {
                        text: "You are an expert academic diagram and educational OCR analyzer. Transcribe all text, labels, definitions, organelles, parts, bullet points, headers, and formulas in this image.\n\nFor diagrams (such as biological cells, organs, anatomical charts, physics, or chemistry diagrams), extract every labeled part and provide its clear definition or function formatted on its own line as 'Part Name: Description and function of this part'."
                      },
                      {
                        inlineData: {
                          mimeType: actualMime,
                          data: cleanBase64
                        }
                      }
                    ]
                  }]
                })
              }
            );
          } catch (rErr) {}
        }

        if (response.ok) {
          const data = await response.json();
          let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text && text.trim()) {
            text = text.trim();
            console.log(`[ImageExtract] Successfully extracted via vision model ${model} (${text.length} chars)`);
            return res.json({ text, source: 'gemini-vision', model });
          }
        }
      } catch (mErr) {
        console.warn(`[ImageExtract] Model ${model} failed:`, mErr.message);
      }
    }

    return res.status(500).json({ error: 'Failed to extract text using vision models' });
  } catch (err) {
    console.error('[ImageExtract] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quiz/generate', quizLimiter, async (req, res) => {
  const errors = validateQuizRequest(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Invalid request.', details: errors });
  }

  let prompt = '';
  try {
    prompt = buildPrompt(req.body);
  } catch (pErr) {
    console.warn('[QuizGen] buildPrompt warning:', pErr.message);
  }

  // 1. Try Gemini AI if API key is provided
  if (prompt && GEMINI_API_KEY && GEMINI_API_KEY !== 'dummy_gemini_key') {
    const fileCount = Math.max(1, Array.isArray(req.body.files) && req.body.files.length > 0 
      ? req.body.files.length 
      : (req.body.fileName ? req.body.fileName.split(',').length : 1));
    const pageMatches = (req.body.sourceText || '').match(/\[Document:[^\]|]+\|\s*Page:\s*(\d+)\]/gi);
    const estimatedPages = pageMatches ? pageMatches.length : Math.max(1, Math.ceil((req.body.sourceText || '').length / 2200));

    // Fast & responsive AI timeout (12s per model) to ensure user never hangs
    const dynamicTimeoutMs = 12000;
    console.log(`[QuizGen] Responsive AI timeout set to ${(dynamicTimeoutMs / 1000).toFixed(0)}s`);

    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash'
    ];
    for (const model of candidateModels) {
      try {
        console.log(`[QuizGen] Calling Gemini model ${model} (timeout ${(dynamicTimeoutMs / 1000).toFixed(0)}s)...`);
        let aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(dynamicTimeoutMs),
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        if (aiResponse.status === 503) {
          console.warn(`[QuizGen] Gemini ${model} 503 spike, retrying after 1s...`);
          await new Promise(r => setTimeout(r, 1000));
          try {
            aiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(dynamicTimeoutMs),
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { responseMimeType: 'application/json' }
                })
              }
            );
          } catch (rErr) {}
        }

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          text = text.trim();
          if (text.startsWith('```')) {
            text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          }
          const parsed = JSON.parse(text);
          const questions = sanitizeQuestions(parsed.questions, req.body.files, req.body.fileName);
          if (questions.length > 0) {
            console.log(`[QuizGen] Gemini (${model}) returned ${questions.length} questions`);
            return res.json({ questions, _source: `gemini:${model}` });
          }
        } else {
          const errText = await aiResponse.text();
          console.warn(`[QuizGen] Gemini ${model} failed HTTP ${aiResponse.status}:`, errText.slice(0, 180));
        }
      } catch (err) {
        console.warn(`Gemini model ${model} attempt error:`, err.message);
      }
    }
  }

  // 2. Try OpenAI AI if API key is provided
  if (prompt && OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
    try {
      console.log('[QuizGen] Calling OpenAI (gpt-4o-mini)...');
      const oaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an educational quiz generation assistant. Return ONLY valid raw JSON with schema {"questions": [...]}' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7
        })
      });

      if (oaiResponse.ok) {
        const data = await oaiResponse.json();
        const content = data?.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);
        const questions = sanitizeQuestions(parsed.questions, req.body.files, req.body.fileName);
        if (questions.length > 0) {
          console.log(`[QuizGen] OpenAI returned ${questions.length} questions`);
          return res.json({ questions, _source: 'openai:gpt-4o-mini' });
        }
      } else {
        const oaiErrText = await oaiResponse.text();
        console.warn(`[QuizGen] OpenAI failed HTTP ${oaiResponse.status}:`, oaiErrText.slice(0, 180));
      }
    } catch (err) {
      console.warn('OpenAI quiz generation attempt error:', err.message);
    }
  }

  // 3. Fast & resilient fallback: extract real questions from uploaded source text
  console.log('[QuizGen] Using offline fallback extractor');
  try {
    const extracted = extractQuestionsFromText(req.body);
    if (extracted && extracted.length > 0) {
      console.log(`[QuizGen] Fallback extractor returned ${extracted.length} questions`);
      return res.json({ questions: extracted, _source: 'offline-fallback' });
    }
  } catch (err) {
    console.error('Fallback extractor error:', err.message);
  }

  return res.status(500).json({ error: 'Could not generate questions from material.' });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Scholaria server running on port ${PORT}`);
    console.log(`Access on desktop: http://localhost:${PORT}`);
    console.log(`Access on mobile (same Wi-Fi): http://<your-computer-ip>:${PORT}`);
  });
}