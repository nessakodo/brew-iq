# Quick Setup - Connect to New Database

Your app is already configured to use your new Supabase database. Just need to set up the schema and create users!

## Step 1: Run Schema Migrations (5 min)

1. **Go to your Supabase dashboard**: https://supabase.com/dashboard/project/ywsvbhzdfsqxubftnvsz

2. **Open SQL Editor** (left sidebar)

3. **Run the base schema** - Copy the ENTIRE contents of this file:
   ```
   supabase/migrations/20251120074720_remix_migration_from_pg_dump.sql
   ```
   - Click "New Query"
   - Paste the entire file
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Wait ~30 seconds for completion

4. **Run the status fix** - Copy the ENTIRE contents of this file:
   ```
   supabase/migrations/20251208_fix_game_status_completed.sql
   ```
   - Click "New Query"
   - Paste the entire file
   - Click "Run"

5. **Verify it worked** - Run this query:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name;
   ```

   You should see 9 tables:
   - events
   - game_sessions
   - player_answers
   - player_sessions
   - player_stats
   - profiles
   - questions
   - trivia_sets
   - user_roles

---

## Step 2: Create Admin User (2 min)

Still in Supabase dashboard:

1. **Go to Authentication → Users** (left sidebar)

2. **Click "Add User"** (top right)

3. **Fill in**:
   - Email: your email (e.g., admin@brewiq.com)
   - Password: (create a strong password)
   - Auto Confirm User: ✅ ON

4. **Click "Create User"**

5. **Get the user ID** - Copy the UUID from the user you just created (it looks like: `12345678-1234-1234-1234-123456789abc`)

6. **Assign admin role** - In SQL Editor, run:
   ```sql
   -- Replace USER_ID_HERE with the UUID you copied
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('USER_ID_HERE', 'admin');
   ```

---

## Step 3: Create Some Sample Data (Optional, 3 min)

If you want to test with sample trivia:

```sql
-- Create a sample trivia set
INSERT INTO public.trivia_sets (id, title, description, theme, difficulty, is_preset)
VALUES (
  gen_random_uuid(),
  'General Knowledge',
  'Basic trivia questions',
  'General',
  'medium',
  true
);

-- Get the trivia set ID you just created
SELECT id, title FROM public.trivia_sets ORDER BY created_at DESC LIMIT 1;

-- Create sample questions (replace TRIVIA_SET_ID with the ID from above)
INSERT INTO public.questions (trivia_set_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_index)
VALUES
  ('TRIVIA_SET_ID', 'What is the capital of France?', 'London', 'Berlin', 'Paris', 'Madrid', 'C', 0),
  ('TRIVIA_SET_ID', 'What color is the sky?', 'Green', 'Blue', 'Red', 'Yellow', 'B', 1),
  ('TRIVIA_SET_ID', 'How many days in a week?', '5', '6', '7', '8', 'C', 2);
```

---

## Step 4: Start Your App (1 min)

```bash
# Make sure you're in the project directory
cd /Users/nessakodo/brew-iq

# Install dependencies if needed
npm install

# Start the dev server
npm run dev
```

Your app will open at `http://localhost:5173`

---

## Step 5: Test (5 min)

1. **Clear browser storage**:
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data
   - Click "Clear all"
   - Close DevTools

2. **Log in**:
   - Use the email and password you created in Step 2
   - You should see the admin dashboard

3. **Test admin features**:
   - ✅ Can you see "Admin Dashboard"?
   - ✅ Can you see trivia sets (if you created sample data)?
   - ✅ Can you create a new event?

---

## Troubleshooting

**"Failed to fetch" or "Invalid API key"**
- Your .env file already has the right credentials
- Try restarting dev server: Ctrl+C, then `npm run dev`

**"No tables found"**
- Go back to Step 1 and run the schema migrations

**"Can't log in"**
- Make sure you created the user in Step 2
- Check the email/password are correct
- Clear browser storage and try again

**"No admin dashboard showing"**
- Make sure you ran the role assignment query in Step 2
- Verify with: `SELECT * FROM user_roles;`

---

## What About Edge Functions?

For AI trivia generation and marketing images, you'll need to deploy edge functions later. For now, you can:
- Manually create trivia sets
- Skip AI generation
- Focus on getting the game flow working

See `migration/DEPLOYMENT.md` when you're ready to deploy edge functions.

---

## Ready?

Start with Step 1! Open your Supabase dashboard and run those migrations. 🚀

**Supabase Dashboard**: https://supabase.com/dashboard/project/ywsvbhzdfsqxubftnvsz
