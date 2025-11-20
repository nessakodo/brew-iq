# Supabase Realtime Setup Guide

## Overview

This application relies heavily on Supabase Realtime to provide instant updates across all users. If realtime is not properly configured, users will experience:

- Hosts not appearing immediately after creation
- Trivia sets not showing up after generation
- Players not seeing questions when games start
- Leaderboards not updating during games
- Game state not syncing across devices

## Enable Realtime in Supabase

### Step 1: Access Database Settings

1. Go to your [Supabase Dashboard](https://supabase.com)
2. Select your project
3. Navigate to **Database** → **Replication**

### Step 2: Enable Realtime for Required Tables

Enable realtime for the following tables by clicking the toggle switch next to each:

**Critical Tables (Must Enable):**
- ✅ `user_roles` - For admin/host management updates
- ✅ `profiles` - For user profile updates
- ✅ `trivia_sets` - For trivia library updates
- ✅ `questions` - For question updates
- ✅ `game_sessions` - For game state changes
- ✅ `player_sessions` - For player join/leave events
- ✅ `player_answers` - For real-time answer tracking
- ✅ `player_stats` - For leaderboard updates

### Step 3: Verify Realtime Policies

Ensure your Row Level Security (RLS) policies allow realtime broadcasts:

1. Go to **Database** → **Tables**
2. For each table above, click on it
3. Go to the **Policies** tab
4. Ensure there are appropriate SELECT policies for the roles that need realtime updates

Example policies:

```sql
-- Allow admins to see user_roles changes in realtime
CREATE POLICY "Admins can view all user roles"
ON user_roles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow all authenticated users to see game sessions
CREATE POLICY "Authenticated users can view game sessions"
ON game_sessions FOR SELECT
TO authenticated
USING (true);

-- Allow players to see their own player_sessions
CREATE POLICY "Players can view their sessions"
ON player_sessions FOR SELECT
TO authenticated
USING (player_id = auth.uid());
```

## Testing Realtime Connections

### Browser Console Test

Open your browser's developer console while using the app and look for these log messages:

```
Host management subscription status: SUBSCRIBED
Trivia sets subscription status: SUBSCRIBED
Player game subscription status: SUBSCRIBED
Game play subscription status: SUBSCRIBED
Leaderboard subscription status: SUBSCRIBED
```

If you see `CHANNEL_ERROR` or `SUBSCRIPTION_ERROR`, check:

1. Realtime is enabled for the table
2. RLS policies allow SELECT for your user role
3. Your Supabase project is not rate-limited

### Manual Test

1. Open your app in two different browser windows (or incognito mode)
2. Log in as admin in both windows
3. In window 1, create a new host
4. Window 2 should immediately show the new host without refreshing

If this doesn't work, realtime is not properly configured.

## Realtime Change Detection Logs

The app now includes console logging for all realtime events. When a change is detected, you'll see:

```
Host role change detected
Profile change detected
Trivia set change detected
Questions change detected
Game session update received
New player answer detected
Player session updated
Player stats change detected
```

If these logs don't appear when data changes, realtime is not working.

## Troubleshooting

### Issue: "CHANNEL_ERROR" in Console

**Solution:**
- Check that realtime is enabled for the table in Database → Replication
- Verify your Supabase project is on a plan that supports realtime
- Check for rate limiting in Supabase dashboard

### Issue: Changes Not Appearing in Real-time

**Solutions:**
1. **Check RLS Policies**: Ensure SELECT policies allow the current user to see the data
2. **Browser Cache**: Clear browser cache and hard reload (Cmd+Shift+R or Ctrl+Shift+R)
3. **Check Network Tab**: Look for WebSocket connections to Supabase
4. **Verify Table Replication**: Ensure the table has replication enabled

### Issue: "Subscription status: TIMED_OUT"

**Solutions:**
- Check your internet connection
- Verify Supabase project is online
- Check if there are firewall restrictions blocking WebSocket connections
- Try disabling browser extensions that might block WebSockets

### Issue: Realtime Works Inconsistently

**Solutions:**
- Check Supabase usage limits in your dashboard
- Verify you're not hitting rate limits
- Consider upgrading your Supabase plan if on free tier
- Check for database performance issues

## Realtime Performance Optimization

### Channel Management

The app uses separate channels for different features:
- `host-management` - Admin dashboard updates
- `trivia-sets` - Trivia library updates
- `player-game-{sessionId}` - Individual player game updates
- `game-play-{sessionId}` - Host game view updates
- `game-lobby-{sessionId}` - Lobby updates
- `leaderboard-updates` - Global leaderboard updates

Channels are automatically cleaned up when components unmount.

### Recommended Supabase Settings

For optimal performance:

1. **Enable Connection Pooling** (in Database Settings)
2. **Use Proper Indexes** on frequently queried columns:
   - `game_sessions.id`
   - `player_sessions.game_session_id`
   - `player_answers.game_session_id`
   - `user_roles.user_id`

3. **Monitor Realtime Connections** in Supabase Dashboard → Logs

## Security Considerations

### Row Level Security (RLS)

Always use RLS policies with realtime. Never disable RLS to "fix" realtime issues. This would expose all data to all users.

Example secure policy:

```sql
-- ✅ GOOD: Only allow users to see their own game sessions
CREATE POLICY "Users see their own sessions"
ON player_sessions FOR SELECT
USING (player_id = auth.uid());

-- ❌ BAD: Don't do this!
CREATE POLICY "Allow all"
ON player_sessions FOR SELECT
USING (true);
```

### Broadcast Filters

The app uses filters to limit realtime broadcasts:

```typescript
// Only receive updates for specific game session
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'game_sessions',
  filter: `id=eq.${sessionId}`
}, handler)
```

This reduces network traffic and improves performance.

## Advanced Configuration

### Custom Realtime Settings

If you need to customize realtime behavior, edit `src/integrations/supabase/client.ts`:

```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit
    }
  }
});
```

## Monitoring Realtime Health

### Check Active Connections

Use this SQL query to see active realtime connections:

```sql
SELECT count(*) FROM pg_stat_activity
WHERE application_name LIKE '%supabase_realtime%';
```

### Realtime Metrics

Monitor in Supabase Dashboard:
- **API** → **Logs** → Filter by "realtime"
- **Database** → **Replication** → Check slot health
- **Settings** → **Database** → Connection info

## FAQ

**Q: How many concurrent realtime connections can I have?**
A: Depends on your Supabase plan:
- Free: 200 concurrent connections
- Pro: 500 concurrent connections
- Team/Enterprise: Custom limits

**Q: Does realtime work offline?**
A: No, realtime requires an active internet connection. The app will show cached data but won't receive updates until reconnected.

**Q: Can I disable realtime for specific tables?**
A: Yes, just don't subscribe to changes for those tables. The app will still work but require manual refreshes.

**Q: How do I debug realtime issues?**
A:
1. Open browser console
2. Look for subscription status logs
3. Check Supabase logs in dashboard
4. Verify network tab shows WebSocket connection
5. Test with simple INSERT in SQL editor while watching console

## Getting Help

If realtime issues persist:

1. Check [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
2. Review Supabase Dashboard → Logs
3. Test with [Supabase Realtime Inspector](https://supabase.com/docs/guides/realtime/inspector)
4. Contact Supabase support if on paid plan

---

**Last Updated**: 2025-01-20
**Version**: 1.0
