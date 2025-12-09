# Edge Functions Setup & Verification Guide

This guide helps you verify that all edge functions are properly configured and your database is ready.

## Quick Verification Checklist

### 1. Database Setup ✅

Run the verification script in Supabase SQL Editor:

```sql
-- Copy and paste the contents of verify-database-setup.sql
-- This will check:
-- - All required tables exist
-- - RLS is enabled correctly
-- - has_role function exists
-- - Admin users exist
```

**Expected Results:**
- ✅ All tables exist (trivia_sets, questions, user_roles, profiles)
- ✅ RLS enabled on all tables
- ✅ has_role function exists
- ✅ At least one admin user exists

### 2. Edge Functions Secrets

Verify all required secrets are set:

```bash
supabase secrets list
```

**Required Secrets:**
- `GEMINI_API_KEY` - For all AI functions (generate-trivia-gemini, generate-trivia, marketing-campaign)

### 3. Edge Functions Status

Check deployed functions:

```bash
supabase functions list
```

**Expected Functions:**
- `generate-trivia-gemini` ✅
- `generate-trivia` ✅
- `create-user` ✅
- `delete-user` ✅
- `marketing-campaign` ✅

## Common Issues & Fixes

### Issue: "Authorization header missing" or "Unauthorized"

**Cause:** User not logged in or token expired

**Fix:**
1. Make sure you're logged in to the app
2. Refresh the page to get a new token
3. Check browser console for auth errors

### Issue: "Only admins can generate trivia"

**Cause:** User doesn't have admin role

**Fix:**
1. Check if user has admin role in `user_roles` table:
   ```sql
   SELECT ur.*, p.email 
   FROM user_roles ur
   JOIN profiles p ON p.id = ur.user_id
   WHERE ur.role = 'admin';
   ```

2. If missing, add admin role:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('YOUR_USER_ID', 'admin');
   ```

### Issue: "Gemini API key not configured"

**Cause:** Secret not set in Supabase

**Fix:**
```bash
supabase secrets set GEMINI_API_KEY=YOUR_KEY_HERE
```

Then redeploy:
```bash
supabase functions deploy generate-trivia-gemini --no-verify-jwt
```

### Issue: "Failed to create trivia set" or "Failed to insert questions"

**Cause:** Database schema mismatch or RLS blocking

**Fix:**
1. Run the verification script to check schema
2. Ensure service role key is being used (all functions use it)
3. Check Supabase function logs for detailed errors

### Issue: "Failed to parse AI response as JSON"

**Cause:** Gemini API returned invalid format

**Fix:**
1. Check Gemini API logs in Supabase Dashboard
2. The function will log the raw response - check for formatting issues
3. Try again with a simpler theme/title

## Testing Edge Functions

### Test generate-trivia-gemini

1. **Via App UI:**
   - Log in as admin
   - Go to Presets tab
   - Fill in AI Trivia Generator form
   - Click "Generate Trivia Set"

2. **Via Supabase Dashboard:**
   - Go to Edge Functions → generate-trivia-gemini
   - Click "Invoke"
   - Use this payload:
   ```json
   {
     "title": "Test Quiz",
     "theme": "General knowledge",
     "difficulty": "medium",
     "questionCount": 5
   }
   ```

### Test create-user

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-user \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "display_name": "Test User",
    "role": "player"
  }'
```

## Database Schema Verification

### Required Tables

1. **trivia_sets**
   - Columns: id, title, description, theme, difficulty, is_preset, created_by, created_at, updated_at
   - RLS: Enabled
   - Policies: Admins can manage, everyone can view

2. **questions**
   - Columns: id, trivia_set_id, question_text, option_a, option_b, option_c, option_d, correct_answer, time_limit_seconds, order_index, created_at
   - RLS: Enabled
   - Policies: Admins can manage, hosts/admins can view with answers

3. **user_roles**
   - Columns: id, user_id, role, created_at
   - RLS: Enabled
   - Policies: Admins can manage all, users can view own

4. **profiles**
   - Columns: id, email, display_name, created_at, updated_at, account_status
   - RLS: Enabled
   - Policies: Users can view/update own, admins can view all

### Required Functions

- `has_role(uuid, app_role)` - Returns boolean if user has role
- `update_updated_at_column()` - Auto-updates updated_at timestamp
- `update_player_stats()` - Updates player stats on game end

### Required Enums

- `app_role`: 'admin' | 'host' | 'player'

## Deployment Commands

```bash
# Deploy all functions
supabase functions deploy generate-trivia-gemini --no-verify-jwt
supabase functions deploy generate-trivia --no-verify-jwt
supabase functions deploy create-user --no-verify-jwt
supabase functions deploy delete-user --no-verify-jwt
supabase functions deploy marketing-campaign --no-verify-jwt
```

## Monitoring & Debugging

### View Function Logs

```bash
supabase functions logs generate-trivia-gemini
```

Or in Supabase Dashboard:
- Edge Functions → [function name] → Logs

### Common Log Messages

- ✅ `"User created:"` - User creation successful
- ✅ `"Role assigned:"` - Role assignment successful
- ❌ `"Auth error:"` - Authentication failed
- ❌ `"Role check error:"` - Role verification failed
- ❌ `"Failed to parse AI response:"` - Gemini API response issue
- ❌ `"Failed to create trivia set:"` - Database insert failed

## Next Steps

1. ✅ Run `verify-database-setup.sql` in Supabase SQL Editor
2. ✅ Verify all secrets are set: `supabase secrets list`
3. ✅ Deploy all functions: `supabase functions deploy [function-name] --no-verify-jwt`
4. ✅ Test via app UI or Supabase Dashboard
5. ✅ Check logs if issues occur

If you encounter any issues not covered here, check the Supabase function logs for detailed error messages.
