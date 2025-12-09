# Create Your Own Supabase Database - 15 Minutes

You need to create your own Supabase project. Here's exactly what to do:

---

## Step 1: Create Supabase Account (2 min)

1. **Go to**: https://supabase.com
2. **Click "Start your project"** (top right)
3. **Sign up with**:
   - GitHub (recommended - fastest)
   - Or email/password
4. Verify your email if needed

---

## Step 2: Create New Project (3 min)

1. **Click "New Project"** (big green button)

2. **Fill in**:
   - **Organization**: Keep default or create new
   - **Name**: `brew-iq` (or whatever you want)
   - **Database Password**: Click "Generate a password" - **SAVE THIS!**
   - **Region**: Choose closest to you (e.g., US West, US East, Europe)
   - **Pricing Plan**: Free (totally fine for this app)

3. **Click "Create new project"**

4. **Wait 2-3 minutes** - You'll see "Setting up project..."
   - Don't close the browser!
   - Get a coffee ☕

---

## Step 3: Get Your Credentials (1 min)

Once your project is ready:

1. **Go to Settings** (left sidebar, gear icon at bottom)

2. **Click "API"** in the settings menu

3. **Copy these values** - you'll need them:

   **Project URL**:
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon/public key** (long string starting with `eyJ...`):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

**KEEP THIS TAB OPEN** - you'll need it in the next steps!

---

## Step 4: Update Your App (2 min)

Come back here and tell me:
1. Your Project URL
2. Your anon key

I'll update your `.env` file for you!

Or if you prefer, you can do it yourself:

```bash
# Open .env file and replace these values:
VITE_SUPABASE_URL="https://YOUR-PROJECT-ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGc..."
```

---

## Step 5: Set Up Database (5 min)

In your Supabase dashboard:

1. **Click "SQL Editor"** (left sidebar)

2. **Click "New Query"**

3. **Copy and paste** the ENTIRE contents of this file:
   ```
   /Users/nessakodo/brew-iq/supabase/migrations/20251120074720_remix_migration_from_pg_dump.sql
   ```

4. **Click "RUN"** (or press Cmd+Enter)
   - You'll see lots of output - that's good!
   - Wait ~30 seconds

5. **Click "New Query"** again

6. **Copy and paste** the ENTIRE contents of this file:
   ```
   /Users/nessakodo/brew-iq/supabase/migrations/20251208_fix_game_status_completed.sql
   ```

7. **Click "RUN"**

8. **Verify it worked** - Run this query:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
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

## Step 6: Create Your Admin User (2 min)

Still in Supabase dashboard:

1. **Click "Authentication"** (left sidebar)

2. **Click "Users"**

3. **Click "Add User"** (green button, top right)

4. **Fill in**:
   - Email: your email
   - Password: create a password (you'll use this to log in)
   - ✅ Auto Confirm User: **ON** (important!)

5. **Click "Create User"**

6. **Copy the user ID** (looks like: `12345678-abcd-1234-abcd-123456789abc`)

7. **Go back to SQL Editor**

8. **Run this** (replace `YOUR_USER_ID` with the ID you copied):
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('YOUR_USER_ID', 'admin');
   ```

---

## Step 7: Restart Your App (1 min)

After updating your `.env` file:

```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

## Step 8: Test! (5 min)

1. **Open**: http://localhost:8080

2. **Clear browser cache**:
   - Open DevTools (F12)
   - Application tab → Storage
   - Click "Clear site data"
   - Close DevTools

3. **Log in** with the email/password you created in Step 6

4. **You should see**:
   - Admin Dashboard
   - Empty trivia sets (we'll create some!)
   - Empty events

---

## What's Next?

### Create Sample Trivia (Optional)

In SQL Editor:

```sql
-- Create a sample trivia set
INSERT INTO public.trivia_sets (title, description, theme, difficulty, is_preset)
VALUES ('Sample Quiz', 'Test trivia for testing', 'General', 'easy', true)
RETURNING id;

-- Copy the ID from above, then replace TRIVIA_SET_ID below:
INSERT INTO public.questions (trivia_set_id, question_text, option_a, option_b, option_c, option_d, correct_answer, order_index, time_limit_seconds)
VALUES
  ('TRIVIA_SET_ID', 'What is 2+2?', '3', '4', '5', '6', 'B', 0, 30),
  ('TRIVIA_SET_ID', 'What color is the sky?', 'Red', 'Blue', 'Green', 'Yellow', 'B', 1, 30),
  ('TRIVIA_SET_ID', 'How many days in a week?', '5', '6', '7', '8', 'C', 2, 30);
```

### Deploy Edge Functions (Later)

For AI trivia generation, see `migration/DEPLOYMENT.md` - but you can skip this for now and manually create trivia.

---

## Troubleshooting

**"Failed to fetch"**
→ Double-check your .env file has the right URL and key
→ Restart dev server

**"Can't log in"**
→ Make sure you clicked "Auto Confirm User" when creating the user
→ Check email/password are correct

**"No admin dashboard"**
→ Make sure you ran the role assignment SQL
→ Verify: `SELECT * FROM user_roles;`

**Tables don't exist**
→ Re-run Step 5 (the schema migrations)

---

## Ready?

**Start here**: https://supabase.com

Create your account, create your project, then come back and tell me your credentials! 🚀

**Estimated time**: 15 minutes total
