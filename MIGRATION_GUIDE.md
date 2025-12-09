# Complete Migration Guide - Off Lovable, Full Gemini Setup

This guide will help you:
1. ✅ Migrate all AI functions from Lovable to Gemini
2. ✅ Run all database migrations
3. ✅ Verify everything is set up correctly
4. ✅ Deploy updated edge functions

## Step 1: Update Edge Functions to Use Gemini

All edge functions have been updated to use Gemini API directly. You need to redeploy them:

```bash
# Make sure you're logged in
supabase login

# Link to your project
cd /Users/nessakodo/brew-iq
supabase link --project-ref pwxtlbpfydpqolrliqux

# Set Gemini API key (if not already set)
supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# Deploy all updated functions
supabase functions deploy generate-trivia-gemini --no-verify-jwt
supabase functions deploy generate-trivia --no-verify-jwt
supabase functions deploy marketing-campaign --no-verify-jwt
supabase functions deploy create-user --no-verify-jwt
supabase functions deploy delete-user --no-verify-jwt
```

## Step 2: Run Database Migrations

### Option A: Run in Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Navigate to: **SQL Editor** → **New Query**

2. **Run the main migration first** (if not already run):
   - Open: `supabase/migrations/20251120074720_remix_migration_from_pg_dump.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **Run**

3. **Run the comprehensive migration script**:
   - Open: `run-all-migrations.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **Run**
   - This will apply all remaining migrations and verify everything

4. **Verify the results**:
   - Check the output messages - should see all ✓ checks
   - Run the verification queries at the bottom of the script

### Option B: Use Supabase CLI

```bash
# Make sure you're in the project directory
cd /Users/nessakodo/brew-iq

# Push all migrations
supabase db push
```

## Step 3: Verify Database Setup

Run these queries in Supabase SQL Editor to verify:

### Check Admin Users
```sql
SELECT 
  ur.user_id,
  p.email,
  p.display_name,
  ur.role,
  ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at;
```

**Expected:** At least one admin user should exist.

**If no admin users:**
```sql
-- Replace YOUR_USER_ID with your actual user ID from auth.users
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Check Preset Trivia Sets
```sql
SELECT 
  ts.id,
  ts.title,
  ts.theme,
  ts.difficulty,
  COUNT(q.id) as question_count
FROM trivia_sets ts
LEFT JOIN questions q ON ts.id = q.trivia_set_id
WHERE ts.is_preset = true
GROUP BY ts.id, ts.title, ts.theme, ts.difficulty
ORDER BY ts.title;
```

**Expected:** Should see preset trivia sets (Classic Pub Trivia, 80s Music Mania, etc.)

### Check All Tables Exist
```sql
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'trivia_sets', 'questions', 'user_roles', 'profiles',
    'events', 'game_sessions', 'player_answers', 
    'player_sessions', 'player_stats'
  )
ORDER BY tablename;
```

**Expected:** All tables listed with "RLS Enabled"

### Check Functions Exist
```sql
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('has_role', 'handle_new_user', 'get_trivia_set_counts', 'update_player_stats_on_game_end')
ORDER BY proname;
```

**Expected:** All 4 functions should exist

## Step 4: Verify Edge Functions

### Check Function Secrets
```bash
supabase secrets list
```

**Required:**
- ✅ `GEMINI_API_KEY` - Must be set
- ❌ `LOVABLE_API_KEY` - No longer needed (can be removed)

### Test Functions

1. **Test generate-trivia-gemini:**
   - Log in to your app as admin
   - Go to Presets tab
   - Fill in AI Trivia Generator form
   - Click "Generate Trivia Set"
   - Should see success message

2. **Check function logs:**
   ```bash
   supabase functions logs generate-trivia-gemini --follow
   ```

## Step 5: Clean Up (Optional)

Remove Lovable API key if you want:

```bash
supabase secrets unset LOVABLE_API_KEY
```

## Troubleshooting

### "No admin users found"

**Fix:**
```sql
-- Find your user ID first
SELECT id, email FROM auth.users;

-- Then add admin role (replace YOUR_USER_ID)
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### "Gemini API key not configured"

**Fix:**
```bash
supabase secrets set GEMINI_API_KEY=YOUR_KEY_HERE
supabase functions deploy generate-trivia-gemini --no-verify-jwt
supabase functions deploy generate-trivia --no-verify-jwt
supabase functions deploy marketing-campaign --no-verify-jwt
```

### "Function deployment failed"

**Check:**
1. Are you logged in? `supabase login`
2. Is project linked? `supabase link --project-ref pwxtlbpfydpqolrliqux`
3. Check logs: `supabase functions logs [function-name]`

### "Database migration errors"

**If you see errors about existing objects:**
- This is normal - the migration script uses `CREATE OR REPLACE` and `DROP IF EXISTS`
- The script is idempotent (safe to run multiple times)

**If you see errors about missing objects:**
- Make sure you ran the main migration first: `20251120074720_remix_migration_from_pg_dump.sql`
- Check that you're running in the correct database

### "RLS blocking queries"

**All edge functions use SERVICE_ROLE_KEY which bypasses RLS**, so this shouldn't be an issue. If you see RLS errors:

1. Check that RLS is enabled: Run verification queries above
2. Check function is using service role: All functions should use `SUPABASE_SERVICE_ROLE_KEY`

## Migration Checklist

- [ ] Updated all edge functions to use Gemini
- [ ] Deployed all edge functions
- [ ] Set GEMINI_API_KEY secret
- [ ] Ran main database migration
- [ ] Ran comprehensive migration script
- [ ] Verified admin users exist
- [ ] Verified preset trivia sets exist
- [ ] Verified all tables have RLS enabled
- [ ] Verified all functions exist
- [ ] Tested generate-trivia-gemini function
- [ ] Removed LOVABLE_API_KEY (optional)

## What Changed

### Edge Functions Updated:
1. ✅ `generate-trivia` - Now uses Gemini API directly
2. ✅ `generate-trivia-gemini` - Already using Gemini (improved error handling)
3. ✅ `marketing-campaign` - Now uses Gemini API directly

### Database:
- All migrations applied and verified
- RLS policies ensured
- Functions updated
- Triggers verified

### Dependencies Removed:
- ❌ No longer need `LOVABLE_API_KEY`
- ✅ Only need `GEMINI_API_KEY`

## Next Steps

1. ✅ Run `run-all-migrations.sql` in Supabase SQL Editor
2. ✅ Verify admin users exist
3. ✅ Deploy all updated edge functions
4. ✅ Test trivia generation
5. ✅ Enjoy your fully migrated app! 🎉

## Support

If you encounter issues:
1. Check function logs: `supabase functions logs [function-name]`
2. Check database logs in Supabase Dashboard
3. Run verification queries to identify missing pieces
4. Review error messages carefully - they usually point to the issue
