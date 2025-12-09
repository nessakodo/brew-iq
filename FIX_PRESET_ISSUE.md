# Fix: User-Generated Trivia Sets Showing as Presets

## The Problem

The function was setting `is_preset: true` for all AI-generated trivia sets, but only the 5 official preset sets should be marked as presets.

## The Fix

### Step 1: Update the Function (Already Done ✅)

The function has been updated to set `is_preset: false` for user-generated trivia sets.

**Redeploy the function:**
```bash
supabase functions deploy generate-trivia-gemini --no-verify-jwt
```

### Step 2: Fix Existing Data

Run this SQL script to fix any existing trivia sets that were incorrectly marked as presets:

**In Supabase SQL Editor:**
1. Copy and paste the contents of: `setup-preset-trivia-sets.sql`
2. Click Run

This script will:
- ✅ Unset `is_preset` for any sets that aren't the official 5
- ✅ Ensure the 5 official presets exist and are marked correctly
- ✅ Show you a verification report

### Step 3: Verify

After running the script, you should see:
- Exactly 5 preset sets (the official ones)
- All user-generated sets have `is_preset = false`

## The 5 Official Presets

Only these should be presets:
1. **Classic Pub Trivia** (id: a1111111-1111-1111-1111-111111111111)
2. **80s Music Mania** (id: b2222222-2222-2222-2222-222222222222)
3. **Sports Fanatic** (id: c3333333-3333-3333-3333-333333333333)
4. **Pop Culture Party** (id: d4444444-4444-4444-4444-444444444444)
5. **History Buff Challenge** (id: e5555555-5555-5555-5555-555555555555)

## Going Forward

- ✅ User-generated trivia sets will automatically have `is_preset: false`
- ✅ Only the 5 official presets will have `is_preset: true`
- ✅ The SQL script can be run anytime to ensure correctness

## Quick Check

Run this query to see current presets:
```sql
SELECT id, title, is_preset 
FROM trivia_sets 
WHERE is_preset = true 
ORDER BY title;
```

You should see exactly 5 rows.
