# Fix Missing Columns in Database

Your verification showed that `trivia_sets` and `questions` tables are missing critical columns.

## Quick Fix

Run this migration in Supabase SQL Editor:

1. **Open Supabase Dashboard** → **SQL Editor** → **New Query**
2. **Copy and paste** the entire contents of: `supabase/migrations/20251209_fix_missing_columns.sql`
3. **Click Run**

This migration will:
- ✅ Add missing `id`, `title`, `is_preset`, `created_at`, `updated_at` columns to `trivia_sets`
- ✅ Add all missing columns to `questions` table
- ✅ Add all required constraints and foreign keys
- ✅ Create necessary triggers

## What Gets Fixed

### trivia_sets table will have:
- `id` (uuid, primary key)
- `title` (text, required)
- `description` (text, optional)
- `theme` (text, optional)
- `difficulty` (text, optional)
- `topic` (text, optional)
- `is_preset` (boolean, default false)
- `created_by` (uuid, optional)
- `created_at` (timestamp, default now())
- `updated_at` (timestamp, default now())

### questions table will have:
- `id` (uuid, primary key)
- `trivia_set_id` (uuid, foreign key to trivia_sets)
- `question_text` (text, required)
- `option_a`, `option_b`, `option_c`, `option_d` (text, required)
- `correct_answer` (text, must be A, B, C, or D)
- `time_limit_seconds` (integer, default 30)
- `order_index` (integer, required)
- `created_at` (timestamp, default now())

## After Running

Verify the fix worked:

```sql
-- Check trivia_sets columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trivia_sets'
ORDER BY ordinal_position;

-- Check questions columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'questions'
ORDER BY ordinal_position;
```

You should see all columns listed above.

## Next Steps

After running this migration:
1. ✅ Re-run `verify-database-setup.sql` to confirm everything passes
2. ✅ Test creating a trivia set in your app
3. ✅ Test generating trivia with the AI generator
