# Fix Missing Users in Admin Dashboard

When you manually create users in Supabase Auth, they might not automatically get profiles created. Let's fix this:

## Quick Fix - Run this SQL

**Go to SQL Editor**: https://supabase.com/dashboard/project/pwxtlbpfydpqolrliqux/sql

Run this query to create profiles for any users that don't have them:

```sql
-- Create missing profiles for users
INSERT INTO public.profiles (id, email, display_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

This will:
- Find all users in `auth.users` that don't have a profile
- Create their profile automatically
- Use their email username as display name

## Verify it worked

Run this to see all users with their profiles and roles:

```sql
SELECT
  u.email,
  p.display_name,
  ur.role,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;
```

You should now see all your users!

## Going Forward

**Important**: Always use the "Create User" button in the Admin Dashboard UI instead of manually creating in Supabase Auth. The UI uses the edge function which properly creates both the auth user AND the profile.

But if you do create manually again, just run that first SQL query to fix it.
