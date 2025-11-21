-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, to prevent errors on re-run
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.profiles;

-- Create a policy that allows users to select their own profile data
CREATE POLICY "Allow authenticated users to read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Grant select permission on the table to the authenticated role.
-- The RLS policy will handle the row-level access control.
GRANT SELECT ON TABLE public.profiles TO authenticated;
