# Set Up Free Gemini API for Trivia Generation

Google's Gemini API is **completely FREE** with generous limits (1500 requests/day).

## Step 1: Get Your Free Gemini API Key (2 min)

1. **Go to**: https://aistudio.google.com/app/apikey

2. **Sign in** with your Google account

3. **Click "Create API Key"**

4. **Select "Create API key in new project"** (or use existing project)

5. **Copy the API key** - it looks like: `AIzaSyC...`

**SAVE THIS KEY!** You'll need it in the next step.

---

## Step 2: Deploy the Gemini Edge Function (5 min)

### Install Supabase CLI (if you haven't)

**On macOS (recommended):**
```bash
brew install supabase/tap/supabase
```

**On other platforms:** See https://github.com/supabase/cli#install-the-cli

### Login to Supabase (REQUIRED!)

**You MUST login first before deploying!** This will open your browser:

```bash
supabase login
```

Follow the prompts to authenticate with your Supabase account.

### Link to Your Project

```bash
cd /Users/nessakodo/brew-iq
supabase link --project-ref pwxtlbpfydpqolrliqux
```

**Note:** If you manually added the API key via the dashboard, you still need to set it via CLI for the function to access it:

```bash
supabase secrets set GEMINI_API_KEY=YOUR_API_KEY_HERE
```

Replace `YOUR_API_KEY_HERE` with the actual key you got from Google.

### Deploy the Function

```bash
cd /Users/nessakodo/brew-iq
supabase functions deploy generate-trivia-gemini --no-verify-jwt
```

---

## Step 3: Verify It Works

1. **Go to your app**: http://localhost:8080

2. **Log in as admin**

3. **Go to "Presets" tab**

4. **Fill in AI Trivia Generator**:
   - Title: "Test Quiz"
   - Theme: "General knowledge"
   - Difficulty: Medium
   - Questions: 5

5. **Click "Generate Trivia Set"**

6. **Should see**: "Trivia Set Generated!" toast message

7. **Check below**: Your new trivia set should appear in the Preset Library

---

## What's Included in Free Tier?

**Gemini 1.5 Flash (what we're using)**:
- **1500 requests per day** - More than enough!
- **1 million tokens per minute** - Plenty for trivia
- **Completely FREE** - No credit card required
- **Fast responses** - Usually 2-3 seconds

Compare to OpenAI:
- OpenAI charges ~$0.15 per million tokens
- Gemini is FREE for the same usage
- Perfect for your use case!

---

## Troubleshooting

**"Gemini API key not configured"**
→ Make sure you ran: `supabase secrets set GEMINI_API_KEY=...`
→ Verify with: `supabase secrets list`

**"Failed to deploy" or "Access token not provided"**
→ **You MUST login first!** Run: `supabase login`
→ Make sure you're in the project directory: `/Users/nessakodo/brew-iq`
→ Make sure you ran `supabase link` first
→ If you manually added the secret via dashboard, you still need to set it via CLI: `supabase secrets set GEMINI_API_KEY=...`

**"Generation failed"**
→ Check Supabase Dashboard → Edge Functions → generate-trivia-gemini → Logs
→ Look for error messages

**"No trivia set created"**
→ Check browser console for errors (F12)
→ Make sure you're logged in as admin
→ Check that title and theme are filled in

---

## API Key Security

Your Gemini API key is stored as a Supabase secret (server-side only). It's never exposed to the browser, so it's completely safe!

---

## Ready?

Run these commands:

```bash
# 1. Get your Gemini API key from: https://aistudio.google.com/app/apikey

# 2. Login to Supabase (REQUIRED - opens browser)
supabase login

# 3. Link to your project
cd /Users/nessakodo/brew-iq
supabase link --project-ref ywsvbhzdfsqxubftnvsz

# 4. Set the API key secret
supabase secrets set GEMINI_API_KEY=YOUR_KEY_HERE

# 5. Deploy the function
supabase functions deploy generate-trivia-gemini --no-verify-jwt

# 6. Test in your app!
```

**Get API Key**: https://aistudio.google.com/app/apikey 🎯
