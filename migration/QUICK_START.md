# 🚀 Quick Start - Migrate in 30 Minutes

This is the express version for migrating off Lovable. For detailed explanations, see `README_MIGRATION.md`.

## ⏱️ Timeline
- **Export data**: 5 minutes
- **Create new project**: 3 minutes
- **Set up schema**: 5 minutes
- **Import data**: 5 minutes
- **Update app**: 2 minutes
- **Test**: 10 minutes
- **Total**: ~30 minutes

---

## Step 1: Export Your Data (5 min)

1. Go to your **current Lovable/Supabase project**
2. Open **SQL Editor**
3. Run the script from: `migration/01_export_all_data.sql`
4. Copy ALL the output and save it as `my_data.sql`

**Note**: You'll see INSERT statements for profiles, trivia sets, questions, and events. Save all of it!

---

## Step 2: Create New Supabase Project (3 min)

1. Go to https://supabase.com
2. Click **New Project**
3. Fill in:
   - Name: `brew-iq-prod`
   - Password: (Generate strong password - SAVE IT!)
   - Region: (Choose closest to you)
4. Wait 2-3 minutes for setup

5. **Save these from Settings → API**:
   - Project URL: `https://xxxxx.supabase.co`
   - anon key: `eyJhbGc...`

---

## Step 3: Set Up Schema (5 min)

In your **NEW** Supabase SQL Editor:

### 3.1: Run Base Schema
Copy and paste the ENTIRE contents of:
`supabase/migrations/20251120074720_remix_migration_from_pg_dump.sql`

Click **Run**. Should take ~30 seconds.

### 3.2: Fix Status Constraint
Copy and paste the ENTIRE contents of:
`supabase/migrations/20251208_fix_game_status_completed.sql`

Click **Run**.

### 3.3: Verify
Run this quick check:
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

## Step 4: Import Your Data (5 min)

In the **NEW** Supabase SQL Editor:

Paste the contents of `my_data.sql` (the file you saved in Step 1) and click **Run**.

**Important**: You may need to split it into chunks if it's too large:
1. Run profiles first
2. Then user_roles
3. Then trivia_sets
4. Then questions
5. Finally events

---

## Step 5: Recreate Users (5 min)

Your 5 users need to be recreated:

### Option A: Manual (Easiest)
1. Go to **Authentication** → **Users** in new Supabase project
2. Click **Add User** for each of your 5 users
3. Enter their email (they'll get password reset email)

### Option B: Have them reset passwords
1. Update app to use new Supabase (next step)
2. Users click "Forgot Password" on login
3. They set new password

---

## Step 6: Update Your App (2 min)

1. Create `.env.local` file (if it doesn't exist):
```env
VITE_SUPABASE_URL=https://YOUR-NEW-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key-here
```

2. Restart your dev server:
```bash
npm run dev
```

3. Clear browser:
   - Open DevTools (F12)
   - Application tab → Clear storage → Clear all
   - Hard refresh (Cmd+Shift+R)

---

## Step 7: Test Everything (10 min)

### 7.1: Login
Try logging in with an admin/host account

### 7.2: Check Data
- Admin: Can see trivia sets? ✅
- Admin: Can see events? ✅
- Admin: Can create new event? ✅

### 7.3: Test Game Flow
- Host: Can see events? ✅
- Host: Can start game? ✅
- Player: Can join? ✅
- Play through a question ✅
- End game works? ✅

---

## 🎉 Done!

You're now running on your own Supabase project!

### Next Steps:
- Update production environment variables (Vercel/Netlify)
- Notify users if they need to reset passwords
- Delete old Lovable project (or keep as backup for a week)

### If Something Breaks:
- Check the detailed guide: `migration/README_MIGRATION.md`
- Run verification: `migration/02_verify_new_database.sql`
- Check console for errors

---

## 🆘 Emergency Rollback

If you need to roll back:
1. Change `.env.local` back to old Lovable credentials
2. Restart dev server
3. Old database still works!

You can take your time getting the new one right.

---

## 📞 Common Issues

**"Can't log in"**
→ Users not recreated. Go to Authentication → Users and add them.

**"No events showing"**
→ Data not imported. Re-run `my_data.sql` in SQL Editor.

**"Failed to end game"**
→ Status constraint not fixed. Re-run the status migration.

**"No trivia sets"**
→ Check SQL output - did the import succeed? Look for errors.

---

**Ready? Start with Step 1! 🚀**
