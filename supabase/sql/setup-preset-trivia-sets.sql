-- Setup the 5 Official Preset Trivia Sets
-- Run this in Supabase SQL Editor to ensure only these 5 sets are marked as presets

-- First, unset is_preset for any existing sets that aren't the official 5
UPDATE trivia_sets 
SET is_preset = false 
WHERE id NOT IN (
  'a1111111-1111-1111-1111-111111111111', -- Classic Pub Trivia
  'b2222222-2222-2222-2222-222222222222', -- 80s Music Mania
  'c3333333-3333-3333-3333-333333333333', -- Sports Fanatic
  'd4444444-4444-4444-4444-444444444444', -- Pop Culture Party
  'e5555555-5555-5555-5555-555555555555'  -- History Buff Challenge
);

-- Ensure the 5 official presets exist and are marked as presets
INSERT INTO trivia_sets (id, title, description, theme, difficulty, topic, is_preset)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    'Classic Pub Trivia',
    'A comprehensive mix of general knowledge perfect for 2 hours of gameplay. Categories: World Geography, History, Science and Nature, Language and wordplay, Logic and common sense, Pop culture.',
    'General Knowledge',
    'medium',
    'General Knowledge',
    true
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    '80s Music Mania',
    'Two hours of nostalgic music trivia from the greatest decade. Categories: Artists and bands, Song titles and lyrics, Albums and release years, Music videos and MTV era, One-hit wonders, Cultural impact.',
    '1980s music',
    'medium',
    'Music',
    true
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'Sports Fanatic',
    'Challenge sports enthusiasts with 2 hours of athletic trivia. Categories: Major US sports (NFL, NBA, MLB, NHL), Global sports moments, Legendary athletes, Championship history, Records and stats, Sports rules edge cases.',
    'Sports',
    'hard',
    'Sports',
    true
  ),
  (
    'd4444444-4444-4444-4444-444444444444',
    'Pop Culture Party',
    'Movies, TV, celebrities - 2 hours of entertainment trivia. Categories: Popular movies, TV shows (past and recent), Famous actors and celebrities, Viral moments, Award shows, Light internet culture.',
    'Movies, TV, and celebrities',
    'easy',
    'Pop Culture',
    true
  ),
  (
    'e5555555-5555-5555-5555-555555555555',
    'History Buff Challenge',
    'Journey through time with 2 hours of historical questions. Categories: Ancient civilizations, World wars, Political movements, Influential leaders, Cultural milestones, Cause-and-effect historical reasoning.',
    'World History',
    'hard',
    'History',
    true
  )
ON CONFLICT (id) 
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  theme = EXCLUDED.theme,
  difficulty = EXCLUDED.difficulty,
  topic = EXCLUDED.topic,
  is_preset = true; -- Always ensure these 5 are presets

-- Verify the presets
SELECT 
  'PRESET SETS' as check_type,
  id,
  title,
  theme,
  difficulty,
  is_preset,
  CASE 
    WHEN id IN (
      'a1111111-1111-1111-1111-111111111111',
      'b2222222-2222-2222-2222-222222222222',
      'c3333333-3333-3333-3333-333333333333',
      'd4444444-4444-4444-4444-444444444444',
      'e5555555-5555-5555-5555-555555555555'
    ) THEN '✅ OFFICIAL PRESET'
    ELSE '❌ NOT PRESET'
  END as status
FROM trivia_sets
WHERE is_preset = true
ORDER BY title;

-- Show count
SELECT 
  'SUMMARY' as check_type,
  COUNT(*) as total_preset_sets,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ CORRECT - Exactly 5 presets'
    WHEN COUNT(*) > 5 THEN '⚠️ WARNING - Too many presets'
    ELSE '❌ ERROR - Missing presets'
  END as status
FROM trivia_sets
WHERE is_preset = true;
