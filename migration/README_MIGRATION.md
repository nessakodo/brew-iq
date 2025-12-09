# Complete Migration Off Lovable - Step by Step Guide

This guide will help you migrate from Lovable to your own Supabase project.

## 📊 Current Database Size
- **events**: 15 rows
- **game_sessions**: 21 rows
- **player_answers**: 70 rows
- **player_sessions**: 19 rows
- **player_stats**: 2 rows
- **profiles**: 5 rows
- **questions**: 215 rows
- **trivia_sets**: 4 rows
- **user_roles**: 0 rows
- **Total**: ~347 rows

## 🎯 Migration Plan

### Phase 1: Export Data from Current Database
### Phase 2: Create New Supabase Project
### Phase 3: Set Up Schema in New Project
### Phase 4: Import Data
### Phase 5: Update Application Configuration
### Phase 6: Test & Verify
### Phase 7: Deploy

---

## Phase 1: Export Data from Current Database

### Step 1.1: Run Export Scripts

**In your current Supabase SQL Editor**, run these export scripts in order:

#### 1. Export Trivia Sets
```sql
-- Copy this output and save as trivia_sets.sql
SELECT
  'INSERT INTO trivia_sets (id, title, description, theme, difficulty, topic, is_preset, created_by, created_at, updated_at) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
      id, title, description, theme, difficulty, topic, is_preset, created_by, created_at, updated_at
    ), E',\n'
  ) || ';'
FROM trivia_sets;
```

#### 2. Export Questions
```sql
-- Copy this output and save as questions.sql
SELECT
  'INSERT INTO questions (id, trivia_set_id, question_text, option_a, option_b, option_c, option_d, correct_answer, time_limit_seconds, order_index, created_at) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
      id, trivia_set_id, question_text, option_a, option_b, option_c, option_d, correct_answer, time_limit_seconds, order_index, created_at
    ), E',\n'
  ) || ';'
FROM questions;
```

#### 3. Export Events
```sql
-- Copy this output and save as events.sql
SELECT
  'INSERT INTO events (id, title, event_date, event_time, theme, trivia_set_id, assigned_host_id, status, marketing_image_url, created_by, created_at, updated_at) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
      id, title, event_date, event_time, theme, trivia_set_id, assigned_host_id, status, marketing_image_url, created_by, created_at, updated_at
    ), E',\n'
  ) || ';'
FROM events;
```

#### 4. Export Profiles
```sql
-- Copy this output and save as profiles.sql
SELECT
  'INSERT INTO profiles (id, email, display_name, created_at, updated_at, account_status) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L, %L, %L)',
      id, email, display_name, created_at, updated_at, account_status
    ), E',\n'
  ) || ';'
FROM profiles;
```

#### 5. Export User Roles (if any exist)
```sql
-- Copy this output and save as user_roles.sql
SELECT
  'INSERT INTO user_roles (id, user_id, role, created_at) VALUES ' ||
  string_agg(
    format('(%L, %L, %L, %L)',
      id, user_id, role, created_at
    ), E',\n'
  ) || ';'
FROM user_roles
WHERE user_id IS NOT NULL;
```

**Note:** Game sessions, player answers, and player stats are likely old test data - you probably don't need to migrate these. Focus on migrating:
- ✅ Trivia sets (your question content)
- ✅ Questions (your actual questions)
- ✅ Events (scheduled events)
- ✅ Profiles (user accounts)
- ✅ User roles (permissions)

---

## Phase 2: Create New Supabase Project

### Step 2.1: Sign up for Supabase
1. Go to https://supabase.com
2. Sign up for a **free account** (or paid if needed)
3. Click **"New Project"**
4. Fill in:
   - **Name**: brew-iq-production
   - **Database Password**: (Generate a strong password - SAVE THIS!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start

### Step 2.2: Wait for Project Setup
- Takes 2-3 minutes
- You'll see a dashboard when ready

### Step 2.3: Save Your Credentials
Click **Settings** → **API** and copy:
- ✅ **Project URL** (looks like: https://xxxxx.supabase.co)
- ✅ **anon/public key** (starts with: eyJhbGc...)
- ✅ **service_role key** (starts with: eyJhbGc... - keep this SECRET!)

---

## Phase 3: Set Up Schema in New Project

### Step 3.1: Apply Base Schema

**In your NEW Supabase project SQL Editor**, run the complete schema from:
`supabase/migrations/20251120074720_remix_migration_from_pg_dump.sql`

(This creates all tables, constraints, functions, triggers, and RLS policies)

### Step 3.2: Apply the Completed Status Fix

Run this migration:
`supabase/migrations/20251208_fix_game_status_completed.sql`

(This fixes the game status trigger to use 'completed' instead of 'ended')

### Step 3.3: Verify Schema
```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should show:
-- events
-- game_sessions
-- player_answers
-- player_sessions
-- player_stats
-- profiles
-- questions
-- trivia_sets
-- user_roles
```

---

## Phase 4: Import Data

### Step 4.1: Import in Correct Order

**IMPORTANT**: Import in this order to respect foreign key constraints:

1. **Profiles first** (no dependencies)
2. **User roles** (depends on profiles)
3. **Trivia sets** (no dependencies)
4. **Questions** (depends on trivia sets)
5. **Events** (depends on trivia sets and profiles)

Run each saved SQL file from Phase 1 in the SQL Editor.

### Step 4.2: Verify Data Import
```sql
-- Check row counts
SELECT 'trivia_sets' as table_name, COUNT(*) as rows FROM trivia_sets
UNION ALL
SELECT 'questions', COUNT(*) FROM questions
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles;

-- Should match your original counts
```

---

## Phase 5: Update Application Configuration

### Step 5.1: Update Environment Variables

Create/update `.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_anon_key_here
```

### Step 5.2: Update Supabase Client (if needed)

Check `src/integrations/supabase/client.ts` - it should automatically use the env vars.

### Step 5.3: Clear Browser Data
- Clear cookies
- Clear local storage
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

---

## Phase 6: Test & Verify

### Step 6.1: Test Authentication
1. Try logging in with existing account
2. If login fails, you may need to recreate auth users (see below)

### Step 6.2: Test Each Feature
- ✅ Admin can see trivia sets
- ✅ Admin can see events
- ✅ Host can see assigned events
- ✅ Host can start a game
- ✅ Players can join
- ✅ Game plays correctly
- ✅ Winner reveal works
- ✅ Stats are saved

### Step 6.3: Recreate Auth Users (if needed)

If users can't log in, you'll need to recreate them in the new project:

**Option A: Manual (for 5 users)**
1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter email and password for each user
4. Users will get an email to set password

**Option B: SQL Script**
```sql
-- This creates user records in auth.users
-- But they'll need to reset their passwords
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES
  -- Get these values from your old database auth.users table
  -- Or just recreate manually - it's only 5 users
```

Then run the `handle_new_user()` trigger for each:
```sql
-- This creates the profile
INSERT INTO profiles (id, email, display_name)
VALUES
  ('user-uuid-here', 'user@email.com', 'Display Name');
```

---

## Phase 7: Deploy

### Step 7.1: Update Production Environment

If you're deploying to Vercel/Netlify/etc:
1. Update environment variables in your hosting dashboard
2. Redeploy the app

### Step 7.2: Monitor for Issues
- Check error logs
- Watch for authentication issues
- Verify game sessions work end-to-end

---

## 🚨 Common Issues & Solutions

### Issue: "relation does not exist"
**Solution**: Schema not applied correctly. Re-run the migration SQL files.

### Issue: "violates foreign key constraint"
**Solution**: Import data in wrong order. Follow the import order exactly.

### Issue: Users can't log in
**Solution**: Auth users not migrated. Recreate users manually or have them reset passwords.

### Issue: "violates check constraint status"
**Solution**: Make sure you applied the completed status fix migration.

### Issue: Events not showing for host
**Solution**: Check `assigned_host_id` matches the user's ID in the new database.

---

## 📋 Quick Checklist

- [ ] Export all data from old database
- [ ] Create new Supabase project
- [ ] Save new credentials
- [ ] Apply base schema migration
- [ ] Apply status fix migration
- [ ] Import profiles
- [ ] Import user roles
- [ ] Import trivia sets
- [ ] Import questions
- [ ] Import events
- [ ] Update `.env.local` with new credentials
- [ ] Clear browser data
- [ ] Test login
- [ ] Test admin dashboard
- [ ] Test host dashboard
- [ ] Test game flow
- [ ] Deploy to production

---

## 🎯 Next Steps

Once migration is complete:
1. Delete old Lovable project (or keep as backup for a week)
2. Update any documentation with new Supabase URL
3. Notify users if they need to reset passwords
4. Consider setting up automated backups

**Ready to start? Begin with Phase 1 - Export your data!**
