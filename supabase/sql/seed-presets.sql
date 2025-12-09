-- Run this in Supabase SQL Editor to add preset trivia sets
-- Navigate to: Supabase Dashboard → SQL Editor → New Query → Paste this → Run

-- Insert preset trivia sets
INSERT INTO public.trivia_sets (id, title, description, theme, difficulty, topic, is_preset) VALUES
('a1111111-1111-1111-1111-111111111111', 'Classic Pub Trivia', 'A comprehensive mix of general knowledge perfect for 2 hours of gameplay', 'Classic', 'medium', 'General Knowledge', true),
('b2222222-2222-2222-2222-222222222222', '80s Music Mania', 'Two hours of nostalgic music trivia from the greatest decade', 'Retro', 'medium', 'Music', true),
('c3333333-3333-3333-3333-333333333333', 'Sports Fanatic', 'Challenge sports enthusiasts with 2 hours of athletic trivia', 'Sports', 'hard', 'Sports', true),
('d4444444-4444-4444-4444-444444444444', 'Pop Culture Party', 'Movies, TV, celebrities - 2 hours of entertainment trivia', 'Entertainment', 'easy', 'Pop Culture', true),
('e5555555-5555-5555-5555-555555555555', 'History Buff Challenge', 'Journey through time with 2 hours of historical questions', 'Academic', 'hard', 'History', true)
ON CONFLICT (id) DO NOTHING;

-- Insert Classic Pub Trivia questions (60 questions for 2-hour gameplay)
INSERT INTO public.questions (trivia_set_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_index, time_limit_seconds) VALUES
-- Geography & Countries (10 questions)
('a1111111-1111-1111-1111-111111111111', 'What is the capital of Australia?', 'Sydney', 'Melbourne', 'Canberra', 'Brisbane', 'C', 0, 60),
('a1111111-1111-1111-1111-111111111111', 'Which country has the most natural lakes?', 'United States', 'Canada', 'Russia', 'Finland', 'B', 1, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the largest desert in the world?', 'Sahara', 'Arabian', 'Gobi', 'Antarctic', 'D', 2, 60),
('a1111111-1111-1111-1111-111111111111', 'Which river flows through London?', 'Thames', 'Seine', 'Danube', 'Rhine', 'A', 3, 60),
('a1111111-1111-1111-1111-111111111111', 'Mount Everest is located in which mountain range?', 'Andes', 'Rockies', 'Alps', 'Himalayas', 'D', 4, 60),
('a1111111-1111-1111-1111-111111111111', 'Which country is known as the Land of the Rising Sun?', 'China', 'Japan', 'Thailand', 'Korea', 'B', 5, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the smallest country in the world?', 'Monaco', 'Vatican City', 'San Marino', 'Liechtenstein', 'B', 6, 60),
('a1111111-1111-1111-1111-111111111111', 'Which continent has no active volcanoes?', 'Europe', 'Australia', 'Asia', 'Africa', 'B', 7, 60),
('a1111111-1111-1111-1111-111111111111', 'The Great Barrier Reef is located off the coast of which country?', 'Indonesia', 'Philippines', 'Australia', 'New Zealand', 'C', 8, 60),
('a1111111-1111-1111-1111-111111111111', 'Which U.S. state is the Grand Canyon located in?', 'Utah', 'Nevada', 'Arizona', 'New Mexico', 'C', 9, 60),

-- Science & Nature (10 questions)
('a1111111-1111-1111-1111-111111111111', 'What is the chemical symbol for gold?', 'Go', 'Gd', 'Au', 'Ag', 'C', 10, 60),
('a1111111-1111-1111-1111-111111111111', 'How many bones are in the adult human body?', '186', '206', '226', '246', 'B', 11, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the largest organ in the human body?', 'Liver', 'Brain', 'Skin', 'Heart', 'C', 12, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the speed of light?', '186,000 mph', '186,000 km/s', '300,000 mph', '300,000 km/s', 'D', 13, 60),
('a1111111-1111-1111-1111-111111111111', 'Which planet is known as the Red Planet?', 'Venus', 'Mars', 'Jupiter', 'Mercury', 'B', 14, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the hardest natural substance on Earth?', 'Diamond', 'Titanium', 'Steel', 'Tungsten', 'A', 15, 60),
('a1111111-1111-1111-1111-111111111111', 'How many hearts does an octopus have?', 'One', 'Two', 'Three', 'Four', 'C', 16, 60),
('a1111111-1111-1111-1111-111111111111', 'What gas do plants absorb from the atmosphere?', 'Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen', 'C', 17, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the most abundant element in the universe?', 'Oxygen', 'Hydrogen', 'Helium', 'Carbon', 'B', 18, 60),
('a1111111-1111-1111-1111-111111111111', 'How long does it take for light from the Sun to reach Earth?', '4 minutes', '8 minutes', '12 minutes', '16 minutes', 'B', 19, 60),

-- History (10 questions)
('a1111111-1111-1111-1111-111111111111', 'In which year did World War II end?', '1943', '1944', '1945', '1946', 'C', 20, 60),
('a1111111-1111-1111-1111-111111111111', 'Who was the first President of the United States?', 'Thomas Jefferson', 'George Washington', 'John Adams', 'Benjamin Franklin', 'B', 21, 60),
('a1111111-1111-1111-1111-111111111111', 'The Great Wall of China was built to protect against invasions from which group?', 'Romans', 'Mongols', 'Japanese', 'Vikings', 'B', 22, 60),
('a1111111-1111-1111-1111-111111111111', 'Who painted the Mona Lisa?', 'Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Donatello', 'C', 23, 60),
('a1111111-1111-1111-1111-111111111111', 'In which year did the Titanic sink?', '1910', '1912', '1914', '1916', 'B', 24, 60),
('a1111111-1111-1111-1111-111111111111', 'Who was the first man to walk on the moon?', 'Buzz Aldrin', 'Neil Armstrong', 'John Glenn', 'Alan Shepard', 'B', 25, 60),
('a1111111-1111-1111-1111-111111111111', 'Which ancient wonder of the world still exists today?', 'Hanging Gardens', 'Colossus of Rhodes', 'Pyramids of Giza', 'Lighthouse of Alexandria', 'C', 26, 60),
('a1111111-1111-1111-1111-111111111111', 'The Declaration of Independence was signed in which year?', '1774', '1776', '1778', '1780', 'B', 27, 60),
('a1111111-1111-1111-1111-111111111111', 'Who was the British Prime Minister during most of World War II?', 'Neville Chamberlain', 'Winston Churchill', 'Clement Attlee', 'Anthony Eden', 'B', 28, 60),
('a1111111-1111-1111-1111-111111111111', 'The Roman Empire fell in which year?', '376 AD', '476 AD', '576 AD', '676 AD', 'B', 29, 60),

-- Entertainment & Pop Culture (10 questions)
('a1111111-1111-1111-1111-111111111111', 'Who played Jack in the movie Titanic?', 'Brad Pitt', 'Tom Cruise', 'Leonardo DiCaprio', 'Matt Damon', 'C', 30, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the highest-grossing film of all time (not adjusted for inflation)?', 'Titanic', 'Avatar', 'Avengers: Endgame', 'Star Wars', 'B', 31, 60),
('a1111111-1111-1111-1111-111111111111', 'Which band released the album "Abbey Road"?', 'The Rolling Stones', 'The Beatles', 'Led Zeppelin', 'Pink Floyd', 'B', 32, 60),
('a1111111-1111-1111-1111-111111111111', 'How many Harry Potter books are there?', '5', '6', '7', '8', 'C', 33, 60),
('a1111111-1111-1111-1111-111111111111', 'Who won the first season of American Idol?', 'Carrie Underwood', 'Kelly Clarkson', 'Fantasia Barrino', 'Ruben Studdard', 'B', 34, 60),
('a1111111-1111-1111-1111-111111111111', 'What year did the first iPhone come out?', '2005', '2006', '2007', '2008', 'C', 35, 60),
('a1111111-1111-1111-1111-111111111111', 'Which streaming service produced "Stranger Things"?', 'Hulu', 'Netflix', 'Amazon Prime', 'Disney+', 'B', 36, 60),
('a1111111-1111-1111-1111-111111111111', 'Who is known as the "King of Pop"?', 'Elvis Presley', 'Prince', 'Michael Jackson', 'David Bowie', 'C', 37, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the name of the fictional African country in Black Panther?', 'Zamunda', 'Wakanda', 'Genovia', 'Latveria', 'B', 38, 60),
('a1111111-1111-1111-1111-111111111111', 'How many Lord of the Rings movies are there?', '2', '3', '4', '5', 'B', 39, 60),

-- Sports (10 questions)
('a1111111-1111-1111-1111-111111111111', 'How many players are on a basketball team on the court?', '4', '5', '6', '7', 'B', 40, 60),
('a1111111-1111-1111-1111-111111111111', 'Which country has won the most FIFA World Cups?', 'Germany', 'Argentina', 'Brazil', 'Italy', 'C', 41, 60),
('a1111111-1111-1111-1111-111111111111', 'In which sport would you perform a slam dunk?', 'Volleyball', 'Basketball', 'Tennis', 'Football', 'B', 42, 60),
('a1111111-1111-1111-1111-111111111111', 'How many holes are played in a standard round of golf?', '9', '12', '18', '21', 'C', 43, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the maximum score in a single frame of bowling?', '100', '200', '300', '30', 'D', 44, 60),
('a1111111-1111-1111-1111-111111111111', 'Which tennis tournament is played on grass?', 'US Open', 'French Open', 'Wimbledon', 'Australian Open', 'C', 45, 60),
('a1111111-1111-1111-1111-111111111111', 'How many rings are on the Olympic flag?', '4', '5', '6', '7', 'B', 46, 60),
('a1111111-1111-1111-1111-111111111111', 'In which sport is the Davis Cup contested?', 'Football', 'Cricket', 'Tennis', 'Rugby', 'C', 47, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the national sport of Canada?', 'Hockey', 'Lacrosse', 'Basketball', 'Curling', 'B', 48, 60),
('a1111111-1111-1111-1111-111111111111', 'How long is an Olympic swimming pool in meters?', '25', '50', '75', '100', 'B', 49, 60),

-- Literature & Language (10 questions)
('a1111111-1111-1111-1111-111111111111', 'Who wrote "Romeo and Juliet"?', 'Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain', 'B', 50, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the longest word in the English language without a vowel?', 'Rhythms', 'Fly', 'Try', 'Myth', 'A', 51, 60),
('a1111111-1111-1111-1111-111111111111', 'Who wrote "1984"?', 'Aldous Huxley', 'Ray Bradbury', 'George Orwell', 'H.G. Wells', 'C', 52, 60),
('a1111111-1111-1111-1111-111111111111', 'What language has the most native speakers?', 'English', 'Spanish', 'Mandarin Chinese', 'Hindi', 'C', 53, 60),
('a1111111-1111-1111-1111-111111111111', 'Who wrote "To Kill a Mockingbird"?', 'Harper Lee', 'Truman Capote', 'F. Scott Fitzgerald', 'Ernest Hemingway', 'A', 54, 60),
('a1111111-1111-1111-1111-111111111111', 'What is the first book of the Bible?', 'Exodus', 'Genesis', 'Leviticus', 'Matthew', 'B', 55, 60),
('a1111111-1111-1111-1111-111111111111', 'How many syllables are in a haiku (first line)?', '3', '5', '7', '10', 'B', 56, 60),
('a1111111-1111-1111-1111-111111111111', 'Who is the author of the Harry Potter series?', 'J.R.R. Tolkien', 'J.K. Rowling', 'C.S. Lewis', 'Stephen King', 'B', 57, 60),
('a1111111-1111-1111-1111-111111111111', 'What does "e.g." stand for?', 'example given', 'exempli gratia', 'extra good', 'early generation', 'B', 58, 60),
('a1111111-1111-1111-1111-111111111111', 'Which novel begins with "It was the best of times, it was the worst of times"?', 'Great Expectations', 'Oliver Twist', 'A Tale of Two Cities', 'David Copperfield', 'C', 59, 60)
ON CONFLICT (trivia_set_id, order_index) DO NOTHING;
