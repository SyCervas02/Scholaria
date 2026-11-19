require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEMO_EMAILS = [
  'demo-student@scholaria.test',
  'demo-teacher@scholaria.test',
  'demo-admin@scholaria.test'
];

async function flushData() {
  console.log('🚀 Starting Scholaria Presentation Database Flush...\n');
  console.log('🔒 PRESERVING ONLY THE 3 OFFICIAL DEMO ACCOUNTS:');
  console.log('   - Student: Joseph Andrew Asis (demo-student@scholaria.test)');
  console.log('   - Teacher: Benedict Callanta (demo-teacher@scholaria.test)');
  console.log('   - Admin:   Mr. S. Llorente Jr. (demo-admin@scholaria.test)\n');

  try {
    // 1. Chat Violations
    const { error: cvErr } = await supabaseAdmin.from('chat_violations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(cvErr ? `⚠️ chat_violations: ${cvErr.message}` : '✅ Cleared chat_violations');

    // 2. Messages
    const { error: msgErr } = await supabaseAdmin.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(msgErr ? `⚠️ messages: ${msgErr.message}` : '✅ Cleared messages');

    // 3. Conversation Participants
    const { error: cpErr } = await supabaseAdmin.from('conversation_participants').delete().neq('role', '___none___');
    console.log(cpErr ? `⚠️ conversation_participants: ${cpErr.message}` : '✅ Cleared conversation_participants');

    // 4. Conversations
    const { error: cErr } = await supabaseAdmin.from('conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(cErr ? `⚠️ conversations: ${cErr.message}` : '✅ Cleared conversations');

    // 5. Quiz Attempts
    const { error: qaErr } = await supabaseAdmin.from('quiz_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(qaErr ? `⚠️ quiz_attempts: ${qaErr.message}` : '✅ Cleared quiz_attempts');

    // 6. Class Records
    const { error: crErr } = await supabaseAdmin.from('class_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(crErr ? `⚠️ class_records: ${crErr.message}` : '✅ Cleared class_records');

    // 7. Quizzes
    const { error: qErr } = await supabaseAdmin.from('quizzes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(qErr ? `⚠️ quizzes: ${qErr.message}` : '✅ Cleared quizzes');

    // 8. Materials
    const { error: mErr } = await supabaseAdmin.from('materials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(mErr ? `⚠️ materials: ${mErr.message}` : '✅ Cleared materials');

    // 9. Teacher Lessons
    const { error: tlErr } = await supabaseAdmin.from('teacher_lessons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(tlErr ? `⚠️ teacher_lessons: ${tlErr.message}` : '✅ Cleared teacher_lessons');

    // 10. Delete All Non-Demo Users from auth.users and public.users
    console.log('\n🧹 Purging all non-demo user accounts...');
    const { data: allUsers } = await supabaseAdmin.from('users').select('id, email, full_name, is_demo');
    if (allUsers && allUsers.length) {
      for (const u of allUsers) {
        if (!DEMO_EMAILS.includes(u.email) && !u.is_demo) {
          await supabaseAdmin.from('users').delete().eq('id', u.id);
          await supabaseAdmin.auth.admin.deleteUser(u.id).catch(() => {});
          console.log(`   🗑️ Removed account: ${u.full_name} (${u.email})`);
        }
      }
    }

    // Also check auth.users directly for any orphaned logins
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    if (authData && authData.users) {
      for (const u of authData.users) {
        if (!DEMO_EMAILS.includes(u.email)) {
          await supabaseAdmin.auth.admin.deleteUser(u.id).catch(() => {});
          console.log(`   🗑️ Removed auth login: ${u.email}`);
        }
      }
    }

    // 11. Reset User Moderation Strikes & Online Status on Remaining Demo Users
    const { error: uErr } = await supabaseAdmin.from('users').update({
      profanity_strikes: 0,
      muted_until: null,
      permanently_muted: false,
      online_status: 'online',
      status_message: null
    }).neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(uErr ? `⚠️ reset user strikes: ${uErr.message}` : '✅ Reset moderation strikes & unmuted demo accounts');

    // 12. Clean Storage Bucket Objects
    try {
      const { data: files } = await supabaseAdmin.storage.from('learning-materials').list('', { limit: 100 });
      if (files && files.length) {
        for (const item of files) {
          const { data: subFiles } = await supabaseAdmin.storage.from('learning-materials').list(item.name);
          if (subFiles && subFiles.length) {
            const paths = subFiles.map(f => `${item.name}/${f.name}`);
            await supabaseAdmin.storage.from('learning-materials').remove(paths);
          }
          await supabaseAdmin.storage.from('learning-materials').remove([item.name]);
        }
        console.log('✅ Cleaned learning-materials storage bucket');
      }
    } catch (sErr) {
      console.warn('Storage cleanup note:', sErr.message);
    }

    // 13. Final Verification
    const { data: remainingUsers } = await supabaseAdmin.from('users').select('full_name, role, school_id, email');
    console.log('\n==================================================');
    console.log('🎉 Presentation Flush Complete!');
    console.log('👥 Active Demo Accounts Remaining:');
    console.table(remainingUsers);
    console.log('==================================================');
  } catch (err) {
    console.error('Unexpected error during flush:', err);
  }
}

flushData();
