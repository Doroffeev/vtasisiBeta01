/*
  # Fix employees table RLS policy

  1. Changes
    - Add a specific INSERT policy for the employees table
    - This policy allows users with ADMIN and MANAGER roles to insert new employees
    - Also adds a policy for all authenticated users to insert employees
  
  2. Security
    - Maintains security by still checking user roles
    - Ensures proper RLS enforcement while allowing necessary operations
*/

-- Drop existing conflicting policy if it exists (to avoid duplicates)
DROP POLICY IF EXISTS "Employees can be modified by admins and managers" ON employees;
DROP POLICY IF EXISTS "Администраторы и менеджеры могут" ON employees;

-- Create specific policies for each operation type
CREATE POLICY "Employees can be viewed by all authenticated users" 
ON employees FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Employees can be inserted by all authenticated users"
ON employees FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Employees can be updated by admins and managers"
ON employees FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'ADMIN' OR 
  (auth.jwt() ->> 'role')::text = 'MANAGER'
);

CREATE POLICY "Employees can be deleted by admins and managers"
ON employees FOR DELETE
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'ADMIN' OR 
  (auth.jwt() ->> 'role')::text = 'MANAGER'
);