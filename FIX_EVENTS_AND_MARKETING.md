# Fix Events & Marketing Tools

## Issues Fixed

1. ✅ Events not appearing in admin/host dashboards
2. ✅ Marketing campaign function updated to use Gemini API
3. ✅ Added image generation prompts and SVG banner creation
4. ✅ Enhanced download functionality for marketing materials

## Step 1: Fix Events Table

Run this SQL script in Supabase SQL Editor:

**File:** `fix-events-table.sql`

This will:
- ✅ Ensure all required columns exist
- ✅ Set up proper RLS policies
- ✅ Allow admins to manage all events
- ✅ Allow hosts to view/update their assigned events
- ✅ Allow everyone to view events

## Step 2: Deploy Updated Functions

```bash
supabase functions deploy marketing-campaign --no-verify-jwt
```

## Step 3: Test Event Creation

1. Go to Admin Dashboard → Events tab
2. Create a new event
3. Verify it appears in the list immediately
4. Check Host Dashboard to see if hosts can see their assigned events

## Step 4: Test Marketing Tools

1. Click "Market" button on any event
2. You should get downloads for:
   - ✅ Social media post (.txt file)
   - ✅ SVG banner visual (.svg file)
   - ✅ Image generation prompt (.txt file)
3. Banner code is copied to clipboard

## What's Included in Marketing Materials

### 1. Social Media Post (.txt)
- AI-generated engaging post text
- Under 200 characters
- Includes emojis
- Ready to copy/paste

### 2. SVG Banner (.svg)
- 1200x630px social media banner
- Gradient background matching your theme
- Event title, date, and time
- Can be opened in any image editor

### 3. Image Prompt (.txt)
- Detailed description for image generation
- Prompt text for AI image generators
- Event details included
- Use with external image generation tools

### 4. Banner Code (Clipboard)
- HTML/CSS code for website banners
- Ready to paste into your site

## Troubleshooting

### Events Still Not Showing

1. **Check RLS Policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'events';
   ```

2. **Check if events exist:**
   ```sql
   SELECT id, title, event_date, assigned_host_id, created_by 
   FROM events 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **Check user roles:**
   ```sql
   SELECT ur.*, p.email 
   FROM user_roles ur
   JOIN profiles p ON p.id = ur.user_id
   WHERE ur.user_id = 'YOUR_USER_ID';
   ```

### Marketing Function Errors

1. **Check Gemini API key:**
   ```bash
   supabase secrets list
   ```
   Should show `GEMINI_API_KEY`

2. **Check function logs:**
   ```bash
   supabase functions logs marketing-campaign --follow
   ```

3. **Verify function is deployed:**
   ```bash
   supabase functions list
   ```

## Next Steps

1. ✅ Run `fix-events-table.sql` in Supabase SQL Editor
2. ✅ Deploy marketing-campaign function
3. ✅ Test event creation
4. ✅ Test marketing tools
5. ✅ Verify events appear in both admin and host dashboards

## Image Generation Options

The marketing function now generates:
- **SVG Banner** - Ready to use, scalable vector graphic
- **Image Description** - For use with AI image generators
- **Image Prompt** - Detailed prompt for external tools

For actual image generation, you can use:
- DALL-E API
- Midjourney
- Stable Diffusion
- Or any other image generation service

The `.txt` file with the image prompt can be used with these services.
