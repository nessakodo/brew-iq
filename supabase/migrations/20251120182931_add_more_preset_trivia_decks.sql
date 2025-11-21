INSERT INTO public.trivia_sets (id, title, description, theme, difficulty, topic, is_preset) VALUES
(DEFAULT, 'Classic Pub Trivia', 'A comprehensive mix of general knowledge perfect for 2 hours of gameplay', 'Classic', 'medium', 'General Knowledge', true),
(DEFAULT, '80s Music Mania', 'Two hours of nostalgic music trivia from the greatest decade', 'Retro', 'medium', 'Music', true),
(DEFAULT, 'Sports Fanatic', 'Challenge sports enthusiasts with 2 hours of athletic trivia', 'Sports', 'hard', 'Sports', true),
(DEFAULT, 'Pop Culture Party', 'Movies, TV, celebrities - 2 hours of entertainment trivia', 'Entertainment', 'easy', 'Pop Culture', true),
(DEFAULT, 'History Buff Challenge', 'Journey through time with 2 hours of historical questions', 'Academic', 'hard', 'History', true)
ON CONFLICT DO NOTHING;
