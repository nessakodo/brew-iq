# Debugging 400 Error on generate-trivia-gemini

You're getting a 400 Bad Request error. Here's how to find the exact cause:

## Step 1: Check Function Logs

The function now has detailed logging. Check the logs to see the exact error:

### Option A: Via Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project: `pwxtlbpfydpqolrliqux`
3. Navigate to: **Edge Functions** → **generate-trivia-gemini** → **Logs**
4. Look for the most recent error - it will show:
   - The exact error message
   - Error code (if database error)
   - Full error details

### Option B: Via CLI
```bash
supabase functions logs generate-trivia-gemini --follow
```

Then try generating trivia again and watch the logs in real-time.

## Step 2: Check Database Columns

Run this in Supabase SQL Editor to verify all columns exist:

```sql
-- Copy and paste the contents of check-database-columns.sql
```

This will show:
- ✅ All columns that exist
- ❌ Any missing required columns

## Step 3: Common Issues & Fixes

### Issue: "column X does not exist"

**Fix:** Run the column fix migration again:
```sql
-- Run: supabase/migrations/20251209_fix_missing_columns.sql
```

### Issue: "null value in column X violates not-null constraint"

**Fix:** The migration might not have set defaults. Check the column defaults:
```sql
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trivia_sets'
  AND column_name IN ('id', 'title', 'is_preset', 'created_at', 'updated_at');
```

If defaults are missing, add them:
```sql
ALTER TABLE trivia_sets 
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN is_preset SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();
```

### Issue: "permission denied for table trivia_sets"

**Fix:** The service role should bypass RLS, but check:
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('trivia_sets', 'questions');
```

If RLS is blocking, the function uses SERVICE_ROLE_KEY which should bypass it. Check that the function is deployed with the correct environment variables.

### Issue: "foreign key constraint violation"

**Fix:** Check if the foreign key constraint exists:
```sql
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conname LIKE '%trivia%';
```

## Step 4: Test Database Insert Directly

Try inserting a test trivia set directly to see if it works:

```sql
-- Test insert (replace YOUR_USER_ID with actual user ID)
INSERT INTO trivia_sets (title, theme, difficulty, is_preset, created_by)
VALUES ('Test Trivia', 'Test Theme', 'medium', true, 'YOUR_USER_ID')
RETURNING *;
```

If this fails, you'll see the exact database error.

## Step 5: Check Function Environment Variables

Make sure the function has access to required secrets:

```bash
supabase secrets list
```

Should show:
- ✅ `GEMINI_API_KEY`
- ✅ `SUPABASE_URL` (automatically set)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (automatically set)

## Step 6: Redeploy Function with Better Logging

I've updated the function with better error logging. Redeploy it:

```bash
supabase functions deploy generate-trivia-gemini --no-verify-jwt
```

Then try again and check the logs - you'll see much more detailed error information.

## What the Updated Function Logs

The function now logs:
- ✅ Request parameters received
- ✅ Trivia set data being inserted
- ✅ Full error details (code, message, details, hint)
- ✅ Question data being inserted
- ✅ Success confirmations

## Quick Fix Checklist

- [ ] Check function logs for exact error
- [ ] Run `check-database-columns.sql` to verify columns
- [ ] Run `20251209_fix_missing_columns.sql` if columns are missing
- [ ] Test direct database insert
- [ ] Verify secrets are set: `supabase secrets list`
- [ ] Redeploy function: `supabase functions deploy generate-trivia-gemini --no-verify-jwt`
- [ ] Try generating trivia again
- [ ] Check logs again for detailed error

## Next Steps

1. **Check the function logs first** - this will tell you exactly what's wrong
2. Share the error message from the logs and I can help fix it
3. The logs will show if it's:
   - Database column issue
   - Permission issue
   - Data validation issue
   - Gemini API issue

The improved logging will make it much easier to diagnose the problem!
