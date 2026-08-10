/**
 * Run once to create the demo account: node scripts/seed-demo-account.js
 *
 * Creates a real Supabase Auth login plus a matching public.users
 * profile row with is_demo = true, using the SAME id for both (this
 * is what server.js's requireAdmin() / RLS's "id = auth.uid()" rely
 * on). Safe to re-run — it skips creation if the account already
 * exists and just prints its id.
 *
 * Reads DEMO_EMAIL / DEMO_PASSWORD from .env, so the demo login this
 * script creates always matches the credentials server.js will sign
 * in with at POST /api/auth/demo-login.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEMO_ACCOUNTS = [
  {
    email: process.env.DEMO_STUDENT_EMAIL,
    password: process.env.DEMO_STUDENT_PASSWORD,
    role: 'student',
    profile: {
      full_name: 'Joseph Andrew Asis',
      school_id: 'HWA-DEMO-001',
      strand: 'STEM',
      grade_level: 'Grade 12',
      section: 'Section A'
    }
  },
  {
    email: process.env.DEMO_TEACHER_EMAIL,
    password: process.env.DEMO_TEACHER_PASSWORD,
    role: 'teacher',
    profile: {
      full_name: 'Benedict Callanta',
      school_id: 'HWA-T-DEMO',
      subjects: 'Web Systems, Programming',
      strand: 'STEM'
    }
  },
  {
    email: process.env.DEMO_ADMIN_EMAIL,
    password: process.env.DEMO_ADMIN_PASSWORD,
    role: 'admin',
    profile: {
      full_name: 'Mr. S. Llorente Jr.',
      school_id: 'HWA-A-DEMO'
    }
  }
];

async function seedOne(acct) {
  if (!acct.email || !acct.password) {
    console.error(`Skipping ${acct.role}: missing email/password in .env`);
    return;
  }

  const { data: existingPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) throw listErr;
  let user = existingPage.users.find(u => u.email === acct.email);

  if (!user) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: acct.email,
      password: acct.password,
      email_confirm: true,
      user_metadata: { full_name: acct.profile.full_name, role: acct.role, is_demo: true }
    });
    if (createErr) throw createErr;
    user = created.user;
    console.log(`Created demo auth user (${acct.role}):`, user.id);
  } else {
    console.log(`Demo auth user already exists (${acct.role}):`, user.id);
  }

  const { data: existingProfile } = await supabaseAdmin
    .from('users').select('id').eq('id', user.id).maybeSingle();

  if (existingProfile) {
    console.log(`Demo profile row already exists (${acct.role}) — nothing to do.`);
    return;
  }

  const { error: profileErr } = await supabaseAdmin.from('users').insert({
    id: user.id,
    full_name: acct.profile.full_name,
    school_id: acct.profile.school_id,
    role: acct.role,
    strand: acct.profile.strand || null,
    grade_level: acct.profile.grade_level || null,
    section: acct.profile.section || null,
    subjects: acct.profile.subjects || null,
    email: acct.email,
    is_active: true,
    is_demo: true
  });
  if (profileErr) throw profileErr;

  console.log(`Demo profile row created (${acct.role}). Ready.`);
}

async function main() {
  for (const acct of DEMO_ACCOUNTS) {
    try {
      await seedOne(acct);
    } catch (err) {
      console.error(`Failed to seed ${acct.role}:`, err.message);
    }
  }
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});