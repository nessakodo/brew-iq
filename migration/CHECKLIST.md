# Migration Checklist

Use this checklist to track your migration progress.

## Phase 1: Preparation ☐

- [ ] Read QUICK_START.md or README_MIGRATION.md
- [ ] Have Supabase account ready
- [ ] Have OpenAI account ready (for API key)
- [ ] Set aside 30-60 minutes for migration
- [ ] Have access to current Lovable/Supabase project

---

## Phase 2: Export Data ☐

- [ ] Open old Supabase SQL Editor
- [ ] Run `migration/01_export_all_data.sql`
- [ ] Copy all output to file named `my_data.sql`
- [ ] Verify you see INSERT statements for:
  - [ ] profiles
  - [ ] user_roles
  - [ ] trivia_sets
  - [ ] questions
  - [ ] events

---

## Phase 3: Create New Project ☐

- [ ] Go to https://supabase.com
- [ ] Click "New Project"
- [ ] Fill in project details
- [ ] Generate and **SAVE** strong password
- [ ] Wait for project creation (2-3 minutes)
- [ ] Save from Settings → API:
  - [ ] Project URL
  - [ ] Project ID (for CLI)
  - [ ] anon key
  - [ ] service_role key (for edge functions)

---

## Phase 4: Set Up Schema ☐

- [ ] Open new Supabase SQL Editor
- [ ] Run `supabase/migrations/20251120074720_remix_migration_from_pg_dump.sql`
- [ ] Wait for completion (~30 seconds)
- [ ] Run `supabase/migrations/20251208_fix_game_status_completed.sql`
- [ ] Run verification query to see 9 tables:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```
- [ ] Verify all 9 tables exist:
  - [ ] events
  - [ ] game_sessions
  - [ ] player_answers
  - [ ] player_sessions
  - [ ] player_stats
  - [ ] profiles
  - [ ] questions
  - [ ] trivia_sets
  - [ ] user_roles

---

## Phase 5: Import Data ☐

- [ ] In new Supabase SQL Editor
- [ ] Paste contents of `my_data.sql`
- [ ] Click Run
- [ ] If too large, split into chunks:
  - [ ] profiles
  - [ ] user_roles
  - [ ] trivia_sets
  - [ ] questions
  - [ ] events
- [ ] Run `migration/02_verify_new_database.sql`
- [ ] Check row counts match expected:
  - [ ] events: ~15 rows
  - [ ] trivia_sets: ~4 rows
  - [ ] questions: ~215 rows
  - [ ] profiles: ~5 rows

---

## Phase 6: Recreate Users ☐

Choose one option:

### Option A: Manual Recreation
- [ ] Go to Authentication → Users in new Supabase
- [ ] For each of 5 users, click "Add User"
- [ ] Enter their email
- [ ] User will receive password reset email

### Option B: Password Reset Flow
- [ ] Update app to use new Supabase (see Phase 7)
- [ ] Users click "Forgot Password"
- [ ] They set new password

---

## Phase 7: Deploy Edge Functions ☐

- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref YOUR_PROJECT_ID`
- [ ] Set OpenAI secret:
```bash
supabase secrets set OPENAI_API_KEY=your-openai-key
```
- [ ] Deploy edge functions:
```bash
supabase functions deploy create-user --no-verify-jwt
supabase functions deploy delete-user --no-verify-jwt
supabase functions deploy generate-trivia --no-verify-jwt
supabase functions deploy marketing-campaign --no-verify-jwt
```
- [ ] Verify in Supabase Dashboard → Edge Functions

---

## Phase 8: Update Local App ☐

- [ ] Create `.env.local` file (copy from `migration/.env.example`)
- [ ] Fill in:
```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
- [ ] Restart dev server: `npm run dev`
- [ ] Clear browser storage:
  - [ ] Open DevTools (F12)
  - [ ] Application tab → Clear storage
  - [ ] Clear all
  - [ ] Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

---

## Phase 9: Test Locally ☐

### Authentication
- [ ] Can log in with admin account
- [ ] Can log in with host account
- [ ] Can log in with player account
- [ ] Can log out

### Admin Dashboard
- [ ] Can see trivia sets
- [ ] Can generate AI trivia (tests OpenAI edge function)
- [ ] Can create events
- [ ] Can create new users (tests create-user edge function)
- [ ] Can view users

### Host Dashboard
- [ ] Can see assigned events
- [ ] Can start game from event
- [ ] Game code generates

### Game Flow
- [ ] Host can navigate through questions
- [ ] 30-second countdown works
- [ ] Answer reveal after 30s
- [ ] 10-second countdown until leaderboard
- [ ] Leaderboard shows
- [ ] 10-second countdown until next question
- [ ] Can advance to next question

### Player Flow
- [ ] Can join with game code
- [ ] Can see questions
- [ ] Can submit answers
- [ ] Can see correct/incorrect
- [ ] Can see leaderboard
- [ ] Stats update correctly

### End Game
- [ ] Host can click "End Game"
- [ ] Winner reveal shows on host view
- [ ] Winner reveal shows on player views
- [ ] Host returns to dashboard
- [ ] Players return to join screen
- [ ] Player stats update in database

---

## Phase 10: Deploy to Production ☐

See DEPLOYMENT.md for detailed instructions.

### Deploy to Vercel
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Login: `vercel login`
- [ ] Deploy: `vercel`
- [ ] Set environment variables in Vercel dashboard
- [ ] Deploy production: `vercel --prod`
- [ ] Test deployed app

### OR Deploy to Netlify
- [ ] Install Netlify CLI: `npm install -g netlify-cli`
- [ ] Login: `netlify login`
- [ ] Initialize: `netlify init`
- [ ] Set environment variables
- [ ] Deploy: `netlify deploy --prod`
- [ ] Test deployed app

### Configure Supabase Auth
- [ ] Set Site URL in Supabase Dashboard
- [ ] Add redirect URLs
- [ ] Enable email provider

---

## Phase 11: Test Production ☐

Run through all tests from Phase 9 on production URL.

- [ ] Authentication works
- [ ] Admin features work
- [ ] Host features work
- [ ] Player features work
- [ ] Real-time updates work
- [ ] Game end flow works

---

## Phase 12: Finalize ☐

- [ ] Notify users if password reset needed
- [ ] Monitor for 24 hours for errors
- [ ] Check Supabase edge function logs
- [ ] Check Vercel/Netlify deployment logs
- [ ] Verify no console errors in production
- [ ] Optional: Set up custom domain
- [ ] Optional: Set up analytics

---

## Phase 13: Cleanup ☐

After 1 week of successful production operation:

- [ ] Archive old Lovable project (don't delete yet!)
- [ ] Remove old `.env.local` backup
- [ ] Document any custom changes
- [ ] Update README with new setup instructions

After 1 month:
- [ ] Consider deleting old Lovable project
- [ ] Keep `my_data.sql` backup indefinitely

---

## Emergency Rollback ☐

If something goes wrong:

- [ ] Change `.env.local` back to old credentials
- [ ] Restart dev server
- [ ] Old database still works!
- [ ] Debug new setup at your own pace

---

## Common Issues

**"Failed to fetch"**
→ Check CORS settings in Supabase
→ Verify environment variables

**"No events showing"**
→ Check data import succeeded
→ Run verification script

**"Can't log in"**
→ Recreate users in Authentication tab
→ Check user_roles table

**"Failed to end game"**
→ Check status migration ran
→ Look for errors in console

**Edge functions not working**
→ Check secrets: `supabase secrets list`
→ Check function logs in dashboard

---

## Notes

Add your own notes here as you go through the migration:

```




```

---

**Progress Tracker**

- Preparation: ☐
- Export: ☐
- New Project: ☐
- Schema: ☐
- Import: ☐
- Users: ☐
- Edge Functions: ☐
- Local Update: ☐
- Local Testing: ☐
- Production Deploy: ☐
- Production Testing: ☐
- Finalize: ☐

**Current Phase**: _____________

**Estimated Completion**: _____________

---

Good luck with your migration! 🚀
