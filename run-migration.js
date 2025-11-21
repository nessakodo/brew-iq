// Run preset trivia migration
// Run this with: node run-migration.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running preset trivia migration...');

  try {
    // Insert trivia sets directly
    console.log('Inserting trivia sets...');
    const triviaSets = [
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        title: 'Classic Pub Trivia',
        description: 'A comprehensive mix of general knowledge perfect for 2 hours of gameplay',
        theme: 'Classic',
        difficulty: 'medium',
        topic: 'General Knowledge',
        is_preset: true
      },
      {
        id: 'b2222222-2222-2222-2222-222222222222',
        title: '80s Music Mania',
        description: 'Two hours of nostalgic music trivia from the greatest decade',
        theme: 'Retro',
        difficulty: 'medium',
        topic: 'Music',
        is_preset: true
      },
      {
        id: 'c3333333-3333-3333-3333-333333333333',
        title: 'Sports Fanatic',
        description: 'Challenge sports enthusiasts with 2 hours of athletic trivia',
        theme: 'Sports',
        difficulty: 'hard',
        topic: 'Sports',
        is_preset: true
      },
      {
        id: 'd4444444-4444-4444-4444-444444444444',
        title: 'Pop Culture Party',
        description: 'Movies, TV, celebrities - 2 hours of entertainment trivia',
        theme: 'Entertainment',
        difficulty: 'easy',
        topic: 'Pop Culture',
        is_preset: true
      },
      {
        id: 'e5555555-5555-5555-5555-555555555555',
        title: 'History Buff Challenge',
        description: 'Journey through time with 2 hours of historical questions',
        theme: 'Academic',
        difficulty: 'hard',
        topic: 'History',
        is_preset: true
      }
    ];

    const { error: insertError } = await supabase
      .from('trivia_sets')
      .upsert(triviaSets, { onConflict: 'id' });

    if (insertError) {
      console.error('Error inserting trivia sets:', insertError);
      process.exit(1);
    }

    console.log('✓ Trivia sets inserted successfully');

    // Now insert the Classic Pub Trivia questions (60 questions)
    console.log('\nInserting Classic Pub Trivia questions (60 questions)...');

    // Read from migration file for questions
    const migrationSQL = readFileSync('./supabase/migrations/20251120182930_add_preset_trivia_decks.sql', 'utf8');

    // Extract questions data manually since SQL parsing is complex
    const classicQuestions = [
      // Geography & Countries (10 questions)
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the capital of Australia?', option_a: 'Sydney', option_b: 'Melbourne', option_c: 'Canberra', option_d: 'Brisbane', correct_answer: 'C', order_index: 0, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which country has the most natural lakes?', option_a: 'United States', option_b: 'Canada', option_c: 'Russia', option_d: 'Finland', correct_answer: 'B', order_index: 1, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the largest desert in the world?', option_a: 'Sahara', option_b: 'Arabian', option_c: 'Gobi', option_d: 'Antarctic', correct_answer: 'D', order_index: 2, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which river flows through London?', option_a: 'Thames', option_b: 'Seine', option_c: 'Danube', option_d: 'Rhine', correct_answer: 'A', order_index: 3, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Mount Everest is located in which mountain range?', option_a: 'Andes', option_b: 'Rockies', option_c: 'Alps', option_d: 'Himalayas', correct_answer: 'D', order_index: 4, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which country is known as the Land of the Rising Sun?', option_a: 'China', option_b: 'Japan', option_c: 'Thailand', option_d: 'Korea', correct_answer: 'B', order_index: 5, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the smallest country in the world?', option_a: 'Monaco', option_b: 'Vatican City', option_c: 'San Marino', option_d: 'Liechtenstein', correct_answer: 'B', order_index: 6, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which continent has no active volcanoes?', option_a: 'Europe', option_b: 'Australia', option_c: 'Asia', option_d: 'Africa', correct_answer: 'B', order_index: 7, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'The Great Barrier Reef is located off the coast of which country?', option_a: 'Indonesia', option_b: 'Philippines', option_c: 'Australia', option_d: 'New Zealand', correct_answer: 'C', order_index: 8, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which U.S. state is the Grand Canyon located in?', option_a: 'Utah', option_b: 'Nevada', option_c: 'Arizona', option_d: 'New Mexico', correct_answer: 'C', order_index: 9, time_limit_seconds: 60 },
      // Science & Nature (10 questions)
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the chemical symbol for gold?', option_a: 'Go', option_b: 'Gd', option_c: 'Au', option_d: 'Ag', correct_answer: 'C', order_index: 10, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How many bones are in the adult human body?', option_a: '186', option_b: '206', option_c: '226', option_d: '246', correct_answer: 'B', order_index: 11, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the largest organ in the human body?', option_a: 'Liver', option_b: 'Brain', option_c: 'Skin', option_d: 'Heart', correct_answer: 'C', order_index: 12, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the speed of light?', option_a: '186,000 mph', option_b: '186,000 km/s', option_c: '300,000 mph', option_d: '300,000 km/s', correct_answer: 'D', order_index: 13, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which planet is known as the Red Planet?', option_a: 'Venus', option_b: 'Mars', option_c: 'Jupiter', option_d: 'Mercury', correct_answer: 'B', order_index: 14, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the hardest natural substance on Earth?', option_a: 'Diamond', option_b: 'Titanium', option_c: 'Steel', option_d: 'Tungsten', correct_answer: 'A', order_index: 15, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How many hearts does an octopus have?', option_a: 'One', option_b: 'Two', option_c: 'Three', option_d: 'Four', correct_answer: 'C', order_index: 16, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What gas do plants absorb from the atmosphere?', option_a: 'Oxygen', option_b: 'Nitrogen', option_c: 'Carbon Dioxide', option_d: 'Hydrogen', correct_answer: 'C', order_index: 17, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the most abundant element in the universe?', option_a: 'Oxygen', option_b: 'Hydrogen', option_c: 'Helium', option_d: 'Carbon', correct_answer: 'B', order_index: 18, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How long does it take for light from the Sun to reach Earth?', option_a: '4 minutes', option_b: '8 minutes', option_c: '12 minutes', option_d: '16 minutes', correct_answer: 'B', order_index: 19, time_limit_seconds: 60 },
      // History (10 questions)
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'In which year did World War II end?', option_a: '1943', option_b: '1944', option_c: '1945', option_d: '1946', correct_answer: 'C', order_index: 20, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who was the first President of the United States?', option_a: 'Thomas Jefferson', option_b: 'George Washington', option_c: 'John Adams', option_d: 'Benjamin Franklin', correct_answer: 'B', order_index: 21, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'The Great Wall of China was built to protect against invasions from which group?', option_a: 'Romans', option_b: 'Mongols', option_c: 'Japanese', option_d: 'Vikings', correct_answer: 'B', order_index: 22, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who painted the Mona Lisa?', option_a: 'Michelangelo', option_b: 'Raphael', option_c: 'Leonardo da Vinci', option_d: 'Donatello', correct_answer: 'C', order_index: 23, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'In which year did the Titanic sink?', option_a: '1910', option_b: '1912', option_c: '1914', option_d: '1916', correct_answer: 'B', order_index: 24, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who was the first man to walk on the moon?', option_a: 'Buzz Aldrin', option_b: 'Neil Armstrong', option_c: 'John Glenn', option_d: 'Alan Shepard', correct_answer: 'B', order_index: 25, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which ancient wonder of the world still exists today?', option_a: 'Hanging Gardens', option_b: 'Colossus of Rhodes', option_c: 'Pyramids of Giza', option_d: 'Lighthouse of Alexandria', correct_answer: 'C', order_index: 26, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'The Declaration of Independence was signed in which year?', option_a: '1774', option_b: '1776', option_c: '1778', option_d: '1780', correct_answer: 'B', order_index: 27, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who was the British Prime Minister during most of World War II?', option_a: 'Neville Chamberlain', option_b: 'Winston Churchill', option_c: 'Clement Attlee', option_d: 'Anthony Eden', correct_answer: 'B', order_index: 28, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'The Roman Empire fell in which year?', option_a: '376 AD', option_b: '476 AD', option_c: '576 AD', option_d: '676 AD', correct_answer: 'B', order_index: 29, time_limit_seconds: 60 },
      // Entertainment & Pop Culture (10 questions)
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who played Jack in the movie Titanic?', option_a: 'Brad Pitt', option_b: 'Tom Cruise', option_c: 'Leonardo DiCaprio', option_d: 'Matt Damon', correct_answer: 'C', order_index: 30, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the highest-grossing film of all time (not adjusted for inflation)?', option_a: 'Titanic', option_b: 'Avatar', option_c: 'Avengers: Endgame', option_d: 'Star Wars', correct_answer: 'B', order_index: 31, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which band released the album "Abbey Road"?', option_a: 'The Rolling Stones', option_b: 'The Beatles', option_c: 'Led Zeppelin', option_d: 'Pink Floyd', correct_answer: 'B', order_index: 32, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How many Harry Potter books are there?', option_a: '5', option_b: '6', option_c: '7', option_d: '8', correct_answer: 'C', order_index: 33, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who won the first season of American Idol?', option_a: 'Carrie Underwood', option_b: 'Kelly Clarkson', option_c: 'Fantasia Barrino', option_d: 'Ruben Studdard', correct_answer: 'B', order_index: 34, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What year did the first iPhone come out?', option_a: '2005', option_b: '2006', option_c: '2007', option_d: '2008', correct_answer: 'C', order_index: 35, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which streaming service produced "Stranger Things"?', option_a: 'Hulu', option_b: 'Netflix', option_c: 'Amazon Prime', option_d: 'Disney+', correct_answer: 'B', order_index: 36, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who is known as the "King of Pop"?', option_a: 'Elvis Presley', option_b: 'Prince', option_c: 'Michael Jackson', option_d: 'David Bowie', correct_answer: 'C', order_index: 37, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the name of the fictional African country in Black Panther?', option_a: 'Zamunda', option_b: 'Wakanda', option_c: 'Genovia', option_d: 'Latveria', correct_answer: 'B', order_index: 38, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How many Lord of the Rings movies are there?', option_a: '2', option_b: '3', option_c: '4', option_d: '5', correct_answer: 'B', order_index: 39, time_limit_seconds: 60 },
      // Sports (10 questions)
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How many players are on a basketball team on the court?', option_a: '4', option_b: '5', option_c: '6', option_d: '7', correct_answer: 'B', order_index: 40, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which country has won the most FIFA World Cups?', option_a: 'Germany', option_b: 'Argentina', option_c: 'Brazil', option_d: 'Italy', correct_answer: 'C', order_index: 41, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'In which sport would you perform a slam dunk?', option_a: 'Volleyball', option_b: 'Basketball', option_c: 'Tennis', option_d: 'Football', correct_answer: 'B', order_index: 42, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How many holes are played in a standard round of golf?', option_a: '9', option_b: '12', option_c: '18', option_d: '21', correct_answer: 'C', order_index: 43, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the maximum score in a single frame of bowling?', option_a: '100', option_b: '200', option_c: '300', option_d: '30', correct_answer: 'D', order_index: 44, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which tennis tournament is played on grass?', option_a: 'US Open', option_b: 'French Open', option_c: 'Wimbledon', option_d: 'Australian Open', correct_answer: 'C', order_index: 45, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How many rings are on the Olympic flag?', option_a: '4', option_b: '5', option_c: '6', option_d: '7', correct_answer: 'B', order_index: 46, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'In which sport is the Davis Cup contested?', option_a: 'Football', option_b: 'Cricket', option_c: 'Tennis', option_d: 'Rugby', correct_answer: 'C', order_index: 47, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the national sport of Canada?', option_a: 'Hockey', option_b: 'Lacrosse', option_c: 'Basketball', option_d: 'Curling', correct_answer: 'B', order_index: 48, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How long is an Olympic swimming pool in meters?', option_a: '25', option_b: '50', option_c: '75', option_d: '100', correct_answer: 'B', order_index: 49, time_limit_seconds: 60 },
      // Literature & Language (10 questions)
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who wrote "Romeo and Juliet"?', option_a: 'Charles Dickens', option_b: 'William Shakespeare', option_c: 'Jane Austen', option_d: 'Mark Twain', correct_answer: 'B', order_index: 50, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the longest word in the English language without a vowel?', option_a: 'Rhythms', option_b: 'Fly', option_c: 'Try', option_d: 'Myth', correct_answer: 'A', order_index: 51, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who wrote "1984"?', option_a: 'Aldous Huxley', option_b: 'Ray Bradbury', option_c: 'George Orwell', option_d: 'H.G. Wells', correct_answer: 'C', order_index: 52, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What language has the most native speakers?', option_a: 'English', option_b: 'Spanish', option_c: 'Mandarin Chinese', option_d: 'Hindi', correct_answer: 'C', order_index: 53, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who wrote "To Kill a Mockingbird"?', option_a: 'Harper Lee', option_b: 'Truman Capote', option_c: 'F. Scott Fitzgerald', option_d: 'Ernest Hemingway', correct_answer: 'A', order_index: 54, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What is the first book of the Bible?', option_a: 'Exodus', option_b: 'Genesis', option_c: 'Leviticus', option_d: 'Matthew', correct_answer: 'B', order_index: 55, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'How many syllables are in a haiku (first line)?', option_a: '3', option_b: '5', option_c: '7', option_d: '10', correct_answer: 'B', order_index: 56, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Who is the author of the Harry Potter series?', option_a: 'J.R.R. Tolkien', option_b: 'J.K. Rowling', option_c: 'C.S. Lewis', option_d: 'Stephen King', correct_answer: 'B', order_index: 57, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'What does "e.g." stand for?', option_a: 'example given', option_b: 'exempli gratia', option_c: 'extra good', option_d: 'early generation', correct_answer: 'B', order_index: 58, time_limit_seconds: 60 },
      { trivia_set_id: 'a1111111-1111-1111-1111-111111111111', question_text: 'Which novel begins with "It was the best of times, it was the worst of times"?', option_a: 'Great Expectations', option_b: 'Oliver Twist', option_c: 'A Tale of Two Cities', option_d: 'David Copperfield', correct_answer: 'C', order_index: 59, time_limit_seconds: 60 }
    ];

    const { error: questionsError } = await supabase
      .from('questions')
      .upsert(classicQuestions, { onConflict: 'trivia_set_id,order_index' });

    if (questionsError) {
      console.error('Error inserting questions:', questionsError);
      process.exit(1);
    }

    console.log('✓ Classic Pub Trivia questions inserted successfully');
    console.log('\n✅ Migration completed! Check the Preset Library in the Admin Dashboard.');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigration();
