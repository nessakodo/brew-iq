-- Check trivia_sets table columns
SELECT 
  'trivia_sets' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN ('id', 'title', 'is_preset', 'created_at', 'updated_at') THEN 'REQUIRED'
    ELSE 'OPTIONAL'
  END as importance
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trivia_sets'
ORDER BY 
  CASE 
    WHEN column_name = 'id' THEN 1
    WHEN column_name = 'title' THEN 2
    WHEN column_name = 'is_preset' THEN 3
    WHEN column_name = 'created_at' THEN 4
    WHEN column_name = 'updated_at' THEN 5
    ELSE 6
  END,
  ordinal_position;

-- Check for missing required columns
SELECT 
  'MISSING IN trivia_sets' as issue,
  column_name as missing_column
FROM (
  VALUES 
    ('id'),
    ('title'),
    ('is_preset'),
    ('created_at'),
    ('updated_at')
) AS required(column_name)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'trivia_sets'
    AND columns.column_name = required.column_name
);

-- Test insert to see what error we get
-- Replace YOUR_USER_ID with an actual user ID from auth.users
SELECT 
  'Test insert would use:' as test_type,
  'gen_random_uuid()' as id,
  'Test Title' as title,
  'Test Theme' as theme,
  'medium' as difficulty,
  true as is_preset,
  'YOUR_USER_ID' as created_by,
  'now()' as created_at,
  'now()' as updated_at;
