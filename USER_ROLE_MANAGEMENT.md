# User Role Management Guide

## Overview

BrewIQ uses a role-based access control system with three main roles:
- **Admin**: Full system access, can manage hosts and users
- **Host**: Can create and manage trivia games
- **Player**: Can join and play trivia games

## Role Assignment

User roles are stored in the `user_roles` table in your Supabase database. Each user can have one primary role.

## How to Change User Roles

### Method 1: Using Supabase Dashboard (Recommended)

1. **Access Your Supabase Dashboard**
   - Go to [Supabase](https://supabase.com)
   - Select your project
   - Navigate to **Database** → **Tables**

2. **Find the User**
   - Go to the `profiles` table
   - Find the user by email or display name
   - Copy their `id` (UUID)

3. **Update or Insert Role**

   **To Add a New Role:**
   - Navigate to the `user_roles` table
   - Click **Insert Row**
   - Fill in:
     - `user_id`: Paste the user's UUID
     - `role`: Select the role (admin, host, or player)
   - Click **Save**

   **To Change an Existing Role:**
   - Navigate to the `user_roles` table
   - Find the row with the user's `user_id`
   - Click the edit button
   - Change the `role` field to the desired role
   - Click **Save**

   **To Remove a Role:**
   - Navigate to the `user_roles` table
   - Find the row with the user's `user_id`
   - Click the delete button
   - Confirm deletion

### Method 2: Using SQL Queries

You can also manage roles using SQL in the Supabase SQL Editor.

#### Add Admin Role to a User

```sql
-- Replace 'user@example.com' with the actual email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email = 'user@example.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin'::app_role;
```

#### Add Host Role to a User

```sql
-- Replace 'user@example.com' with the actual email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'host'::app_role
FROM public.profiles
WHERE email = 'user@example.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'host'::app_role;
```

#### Change User Role

```sql
-- Replace with actual email and desired role
UPDATE public.user_roles
SET role = 'admin'::app_role  -- Change to 'host' or 'player' as needed
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'user@example.com'
);
```

#### Remove Admin/Host Role (Downgrade to Player)

```sql
-- Replace with actual email
UPDATE public.user_roles
SET role = 'player'::app_role
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'user@example.com'
);
```

#### Remove User Role Entirely

```sql
-- Replace with actual email
DELETE FROM public.user_roles
WHERE user_id = (
  SELECT id FROM public.profiles WHERE email = 'user@example.com'
);
```

#### View All Users and Their Roles

```sql
SELECT
  p.email,
  p.display_name,
  ur.role,
  p.account_status,
  p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;
```

## Role Permissions

### Admin Role
- Full access to Admin Dashboard
- Can create, edit, and delete host accounts
- Can manage all users (view, suspend, delete)
- Can create and manage trivia sets
- Can create and manage events
- Can generate AI-powered trivia questions
- Can access marketing tools
- Can view all game sessions and statistics

### Host Role
- Access to Host Dashboard
- Can create game sessions from events
- Can start and manage trivia games
- Can view game lobby and player count
- Can control game flow (pause, skip, end)
- Can view live leaderboards during games
- Cannot manage other users
- Cannot create events or trivia sets

### Player Role
- Can join games using game codes
- Can answer trivia questions
- Can view their own statistics
- Can view public leaderboards
- Cannot access admin or host features

## Security Best Practices

1. **Limit Admin Accounts**: Only assign admin role to trusted team members
2. **Regular Audits**: Periodically review user roles and remove unnecessary permissions
3. **Immediate Revocation**: Remove admin/host roles immediately when someone leaves your team
4. **User Account Status**: Use the `account_status` field in `profiles` table to suspend accounts without deleting them
5. **Log Changes**: Keep track of who has admin access and when changes are made

## Suspending vs. Deleting Accounts

### To Suspend an Account (Recommended)

Instead of deleting user roles, you can suspend accounts:

```sql
-- Suspend a user account
UPDATE public.profiles
SET account_status = 'suspended'
WHERE email = 'user@example.com';
```

This prevents login while preserving data.

### To Reactivate a Suspended Account

```sql
-- Reactivate a suspended account
UPDATE public.profiles
SET account_status = 'active'
WHERE email = 'user@example.com';
```

## Emergency: Remove All Admin Access

If you need to quickly remove all admin accounts (except your own):

```sql
-- Replace 'your-email@example.com' with your email
UPDATE public.user_roles
SET role = 'player'::app_role
WHERE role = 'admin'::app_role
AND user_id != (
  SELECT id FROM public.profiles WHERE email = 'your-email@example.com'
);
```

## Troubleshooting

### User Can't Access Dashboard After Role Assignment

1. **Clear Browser Cache**: Have the user clear their browser cache and cookies
2. **Force Logout**: User should log out completely and log back in
3. **Check Role in Database**: Verify the role was actually saved in `user_roles` table
4. **Check Account Status**: Ensure `account_status` in `profiles` is 'active', not 'suspended'

### Role Changes Not Taking Effect

Roles are cached in the user's session. The user must:
1. Log out completely
2. Close all browser tabs
3. Log back in

### Can't Find User in Profiles Table

- User may not have completed signup
- Check the `auth.users` table in Supabase to see if the account exists
- If account exists in `auth.users` but not in `profiles`, there may be an issue with your profile creation trigger

## Automated Role Management (Future Enhancement)

For automated role management, you can create Supabase Edge Functions or database triggers. Contact your development team if you need:

- Automatic role assignment based on email domain
- Bulk role updates
- Role expiration dates
- Audit logging for role changes

## Support

If you need help managing user roles or encounter issues:

1. Check the Supabase logs in your dashboard
2. Verify your database triggers are functioning
3. Review the auth policies for the `user_roles` table
4. Contact your technical administrator

---

**Last Updated**: 2025-01-20
**Version**: 1.0
