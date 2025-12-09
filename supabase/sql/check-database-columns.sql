-- Quick diagnostic to check if columns exist in trivia_sets and questions tables

-- Check trivia_sets columns
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

-- Check questions columns
SELECT 
  'questions' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN ('id', 'trivia_set_id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'order_index') THEN 'REQUIRED'
    ELSE 'OPTIONAL'
  END as importance
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'questions'
ORDER BY 
  CASE 
    WHEN column_name = 'id' THEN 1
    WHEN column_name = 'trivia_set_id' THEN 2
    WHEN column_name = 'question_text' THEN 3
    WHEN column_name = 'option_a' THEN 4
    WHEN column_name = 'option_b' THEN 5
    WHEN column_name = 'option_c' THEN 6
    WHEN column_name = 'option_d' THEN 7
    WHEN column_name = 'correct_answer' THEN 8
    WHEN column_name = 'order_index' THEN 9
    ELSE 10
  END,
  ordinal_position;

-- Check for missing required columns in trivia_sets
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

-- Check for missing required columns in questions
SELECT 
  'MISSING IN questions' as issue,
  column_name as missing_column
FROM (
  VALUES 
    ('id'),
    ('trivia_set_id'),
    ('question_text'),
    ('option_a'),
    ('option_b'),
    ('option_c'),
    ('option_d'),
    ('correct_answer'),
    ('order_index')
) AS required(column_name)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'questions'
    AND columns.column_name = required.column_name
);
