# Deployment Guide

This guide covers deploying your migrated BrewIQ application to production.

## Prerequisites

- ✅ New Supabase project created
- ✅ Schema set up (`00_complete_schema.sql` run)
- ✅ Data imported (`01_export_all_data.sql` run)
- ✅ Database verified (`02_verify_new_database.sql` run)
- ✅ Supabase CLI installed: `npm install -g supabase`

---

## Part 1: Deploy Edge Functions

### 1.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 1.2 Login to Supabase

```bash
supabase login
```

This will open a browser to authenticate.

### 1.3 Link to Your Project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

Get your project ID from Supabase Dashboard → Settings → General

### 1.4 Set Environment Secrets

```bash
# Set OpenAI API key for AI features
supabase secrets set OPENAI_API_KEY=your-openai-api-key-here
```

Get OpenAI API key from: https://platform.openai.com/api-keys

### 1.5 Deploy Edge Functions

From the `migration` directory:

```bash
# Deploy all edge functions
supabase functions deploy create-user --no-verify-jwt
supabase functions deploy delete-user --no-verify-jwt
supabase functions deploy generate-trivia --no-verify-jwt
supabase functions deploy marketing-campaign --no-verify-jwt
```

**Note**: `--no-verify-jwt` is needed because we verify auth tokens manually in the functions.

### 1.6 Verify Edge Functions

Go to Supabase Dashboard → Edge Functions and confirm all 4 functions are deployed.

---

## Part 2: Deploy Frontend

### Option A: Deploy to Vercel (Recommended)

#### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

#### 2.2 Login to Vercel

```bash
vercel login
```

#### 2.3 Deploy

From your project root:

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? (select your account)
- Link to existing project? **N**
- Project name? **brew-iq** (or your preferred name)
- Directory? **./** (press Enter)
- Override settings? **N**

#### 2.4 Set Environment Variables

In Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL` = `https://YOUR-PROJECT.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`

Or via CLI:

```bash
vercel env add VITE_SUPABASE_URL
# Paste your Supabase URL when prompted

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your anon key when prompted
```

#### 2.5 Redeploy with Environment Variables

```bash
vercel --prod
```

---

### Option B: Deploy to Netlify

#### 2.1 Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2.2 Login to Netlify

```bash
netlify login
```

#### 2.3 Initialize Netlify

```bash
netlify init
```

Follow the prompts:
- Create & configure a new site? **Yes**
- Team? (select your team)
- Site name? **brew-iq** (or your preferred name)
- Build command? **npm run build**
- Directory to deploy? **dist**

#### 2.4 Set Environment Variables

```bash
netlify env:set VITE_SUPABASE_URL "https://YOUR-PROJECT.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
```

#### 2.5 Deploy

```bash
netlify deploy --prod
```

---

## Part 3: Configure Supabase Authentication

### 3.1 Set Site URL

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-deployed-app.vercel.app` (or your Netlify URL)
- **Redirect URLs**: Add:
  - `https://your-deployed-app.vercel.app/**`
  - `http://localhost:5173/**` (for local development)

### 3.2 Enable Email Auth

In Supabase Dashboard → Authentication → Providers:

- Ensure **Email** provider is enabled
- Set **Confirm email** to ON (recommended for production)

---

## Part 4: Create Admin User

You need at least one admin user to access the admin dashboard.

### 4.1 Create User in Supabase

1. Go to Supabase Dashboard → Authentication → Users
2. Click **Add User**
3. Enter email and password
4. Click **Create User**

### 4.2 Assign Admin Role

In SQL Editor, run:

```sql
-- Get the user ID from the users table
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Insert admin role (replace USER_ID with the actual ID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID', 'admin');
```

### 4.3 Verify Admin Access

1. Log in to your deployed app
2. Navigate to `/admin`
3. You should see the admin dashboard

---

## Part 5: Testing Checklist

### 5.1 Authentication
- [ ] Can create new account
- [ ] Can log in with existing account
- [ ] Can log out
- [ ] Password reset works

### 5.2 Admin Features
- [ ] Can access admin dashboard
- [ ] Can view trivia sets
- [ ] Can generate AI trivia questions
- [ ] Can create events
- [ ] Can assign hosts to events
- [ ] Can create new users
- [ ] Can delete users

### 5.3 Host Features
- [ ] Can view assigned events
- [ ] Can start game from event
- [ ] Can navigate through questions
- [ ] Countdown timers work (10s for answer reveal, 10s for leaderboard)
- [ ] Can see live player counts
- [ ] Can end game
- [ ] Winner reveal works
- [ ] Returns to dashboard after game

### 5.4 Player Features
- [ ] Can join game with code
- [ ] Can see questions
- [ ] Can submit answers
- [ ] Can see if answer was correct
- [ ] Can see leaderboard
- [ ] Stats update correctly
- [ ] End game screen shows rankings
- [ ] Returns to join screen after game

### 5.5 Real-time Features
- [ ] Player joins show on host dashboard immediately
- [ ] Answers appear in real-time on host view
- [ ] Leaderboard updates after answer reveal
- [ ] Score syncs across all views
- [ ] Game end broadcasts to all players

---

## Part 6: Monitoring and Maintenance

### 6.1 Monitor Edge Functions

Supabase Dashboard → Edge Functions → (function name) → Logs

Watch for errors and invocation count.

### 6.2 Monitor Database Performance

Supabase Dashboard → Database → Query Performance

Check slow queries and optimize indexes if needed.

### 6.3 Check RLS Policies

If users report permission errors, check:
- Supabase Dashboard → Authentication → Policies
- Ensure RLS policies match your use case

### 6.4 Backup Strategy

Supabase provides automatic backups, but you can also:

```bash
# Manual backup
supabase db dump -f backup.sql
```

---

## Part 7: Rollback Plan

If something goes wrong:

### 7.1 Quick Rollback (Frontend Only)

Change environment variables back to old Lovable/Supabase:

```bash
# Vercel
vercel env add VITE_SUPABASE_URL
# Enter old URL

vercel env add VITE_SUPABASE_ANON_KEY
# Enter old key

vercel --prod
```

### 7.2 Database Rollback

Your old database is still intact. Just point your app back to it via environment variables.

---

## Common Issues

### "Failed to fetch" errors
→ Check CORS settings in Supabase Dashboard → API → CORS
→ Ensure your deployed URL is in allowed origins

### "Invalid API key" errors
→ Verify environment variables are set correctly
→ Check Supabase URL and anon key match your new project

### Edge functions not working
→ Check secrets are set: `supabase secrets list`
→ Check function logs for errors
→ Ensure OpenAI API key is valid

### Users can't log in
→ Verify users exist in new database
→ Check Authentication → URL Configuration matches your deployed URL

---

## Cost Estimation

### Supabase (Free Tier)
- Database: 500 MB included
- Bandwidth: 5 GB included
- Edge Functions: 2M requests/month

**Your Usage**:
- ~350 database rows = ~1 MB
- Estimated: Well within free tier

### OpenAI API
- GPT-4o-mini: ~$0.15 per 1M input tokens
- DALL-E 3: ~$0.04 per image (1024x1024)

**Your Usage**:
- 1 trivia generation = ~$0.002
- 1 marketing image = ~$0.04
- Estimated: <$5/month for typical use

### Hosting (Vercel/Netlify Free Tier)
- Bandwidth: 100 GB/month
- Build minutes: 300/month
- Estimated: Free for most use cases

**Total Estimated Cost**: $0-5/month

---

## Next Steps After Deployment

1. **Monitor for 24 hours**: Watch for errors in production
2. **Notify users**: Send password reset emails if needed
3. **Update DNS**: Point custom domain to Vercel/Netlify (optional)
4. **Set up analytics**: Add Google Analytics or Plausible (optional)
5. **Create backup schedule**: Weekly database dumps recommended

---

## Support

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- OpenAI Docs: https://platform.openai.com/docs

---

**🎉 Deployment Complete!**

You're now running on your own infrastructure, free from Lovable!
