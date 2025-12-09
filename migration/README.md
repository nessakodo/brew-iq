# BrewIQ Migration Package

Complete migration package to move off Lovable to self-hosted Supabase infrastructure.

## 📦 What's Included

This package contains everything you need to migrate your BrewIQ trivia application from Lovable to your own Supabase project.

### Database Scripts
- **`00_complete_schema.sql`** - Complete database schema with all tables, functions, triggers, and RLS policies
- **`01_export_all_data.sql`** - Export all data from your current database (~350 rows)
- **`02_verify_new_database.sql`** - Verify new database setup is correct

### Edge Functions (in `edge-functions/`)
- **`create-user/`** - Admin function to create new users with role assignment
- **`delete-user/`** - Admin function to delete users
- **`generate-trivia/`** - AI trivia generation using OpenAI (replaces Lovable API)
- **`marketing-campaign/`** - Marketing image generation using DALL-E (replaces Lovable API)

### Documentation
- **`QUICK_START.md`** - 30-minute express migration guide
- **`README_MIGRATION.md`** - Detailed 7-phase migration guide with explanations
- **`DEPLOYMENT.md`** - Production deployment instructions for Vercel/Netlify
- **`CHECKLIST.md`** - Interactive checklist to track migration progress
- **`.env.example`** - Environment variable template with instructions

## 🚀 Quick Start

**Total Time: ~30 minutes**

1. **Export data** (5 min) - Run `01_export_all_data.sql` in old database
2. **Create new Supabase project** (3 min) - Sign up at supabase.com
3. **Set up schema** (5 min) - Run schema migrations in new database
4. **Import data** (5 min) - Run exported data in new database
5. **Deploy edge functions** (5 min) - Use Supabase CLI
6. **Update app** (2 min) - Change `.env.local` to new credentials
7. **Test** (10 min) - Run through game flow

See `QUICK_START.md` for step-by-step instructions.

## 📚 Detailed Guide

For more detailed explanations, troubleshooting, and best practices, see `README_MIGRATION.md`.

## ✅ Checklist

Use `CHECKLIST.md` to track your progress through the migration. Print it out or check off items as you go.

## 🌐 Deployment

After local testing, deploy to production using `DEPLOYMENT.md`. Includes instructions for:
- Vercel deployment
- Netlify deployment
- Edge function deployment
- Environment configuration
- Monitoring and rollback

## 📊 Current Database Stats

Your current database contains:
- **events**: 15 rows
- **game_sessions**: 21 rows
- **player_answers**: 70 rows
- **player_sessions**: 19 rows
- **player_stats**: 2 rows
- **profiles**: 5 rows
- **questions**: 215 rows (across 4 trivia sets)
- **trivia_sets**: 4 rows
- **user_roles**: 0 rows (will be populated after user creation)

**Total**: ~350 rows

## 🔑 API Keys Needed

### Supabase (Free)
- Sign up at https://supabase.com
- Get URL and anon key from Settings → API

### OpenAI API (Pay-as-you-go)
- Sign up at https://platform.openai.com
- Create API key
- Estimated cost: $0-5/month for typical usage
  - Trivia generation: ~$0.002 per set
  - Marketing images: ~$0.04 per image

## 🎯 What Changes

### Before (Lovable)
- Hosted on Lovable infrastructure
- Uses Lovable API for AI features
- Database managed by Lovable
- Limited control over edge functions

### After (Self-hosted)
- Your own Supabase project
- OpenAI API for AI features
- Full database control
- Custom edge functions
- Deploy anywhere (Vercel, Netlify, etc.)

## ⚠️ Important Notes

1. **Your old database stays intact** - You can roll back anytime by changing environment variables
2. **Users will need to reset passwords** - Auth tokens don't migrate, but data does
3. **Edge functions use OpenAI** - You'll need an OpenAI API key (replacing Lovable API)
4. **Test locally first** - Don't deploy to production until you've tested everything

## 🆘 Getting Help

### Common Issues
- **"Failed to fetch"** → Check CORS settings in Supabase
- **"No events showing"** → Check data import succeeded
- **"Can't log in"** → Recreate users in Authentication tab
- **Edge functions fail** → Check OpenAI API key is set

### Resources
- Supabase Docs: https://supabase.com/docs
- OpenAI Docs: https://platform.openai.com/docs
- Migration issues: Check `README_MIGRATION.md` troubleshooting section

## 📈 Cost Comparison

### Lovable (Current)
- Unknown future costs
- Limited to Lovable ecosystem
- Risk of breaking changes

### Self-hosted (New)
- **Supabase**: Free tier (500MB database, 5GB bandwidth)
- **OpenAI**: ~$0-5/month for typical usage
- **Hosting**: Free tier on Vercel/Netlify
- **Total**: $0-5/month

## 🎉 Ready to Migrate?

Start with `QUICK_START.md` for the express version, or `README_MIGRATION.md` for the detailed guide.

Use `CHECKLIST.md` to track your progress.

---

**Version**: 1.0.0
**Last Updated**: December 8, 2024
**Database Schema Version**: 20251120074720
**Status Fix**: 20251208_fix_game_status_completed

---

## File Structure

```
migration/
├── README.md (this file)
├── QUICK_START.md
├── README_MIGRATION.md
├── DEPLOYMENT.md
├── CHECKLIST.md
├── .env.example
├── 00_complete_schema.sql
├── 01_export_all_data.sql
├── 02_verify_new_database.sql
└── edge-functions/
    ├── create-user/
    │   └── index.ts
    ├── delete-user/
    │   └── index.ts
    ├── generate-trivia/
    │   └── index.ts
    └── marketing-campaign/
        └── index.ts
```

---

Good luck with your migration! 🚀
