# BrewIQ - Create Your Admin Account

## Step 1: Create Admin Account via Signup

1. Navigate to `/auth` in your app
2. Click "Don't have an account? Sign up"
3. Fill in the signup form:
   - **Email**: `admin@brewiq.com` (or your preferred admin email)
   - **Password**: Choose a strong password (min 8 characters)
   - **Display Name**: Your name

4. Click "Sign Up"

## Step 2: Assign Admin Role

After signing up, you need to assign the admin role to your account.

### Option A: Using Supabase Dashboard

1. Open your Supabase project dashboard
2. Navigate to Database → Tables → user_roles
3. Click "Insert Row"
4. Fill in:
   - **user_id**: Your user ID (copy from profiles table)
   - **role**: Select "admin"
5. Click "Save"

### Option B: Using SQL Query

Run this SQL query in your Supabase SQL Editor (replace with your email):

```sql
-- Find your user ID and insert admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email = 'admin@brewiq.com';
```

## Step 3: Log Out and Log Back In

1. Log out of your account
2. Log back in with your admin credentials
3. You'll be redirected to the Admin Dashboard at `/admin`

## What You Can Do as Admin

✅ **Manage Hosts**: Create, suspend, and delete host accounts
✅ **Manage Players**: View and suspend player accounts  
✅ **Create Trivia**: Generate AI-powered trivia sets
✅ **Schedule Events**: Create and manage trivia events
✅ **Assign Hosts**: Link hosts to specific events

## Security Notes

- Only create admin accounts for trusted users
- Change your password regularly
- Never share admin credentials
- Monitor user activity through the admin dashboard

## Need Help?

If you encounter issues:
- Ensure you've signed up successfully (check your browser console)
- Verify your email is correct in the profiles table
- Confirm the role was assigned in user_roles table
- Clear your browser cache and try logging in again
