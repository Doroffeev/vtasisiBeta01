/*
  # Create and configure users table

  1. New Tables
    - `users` (if not exists)
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `full_name` (text)
      - `role` (text with role check constraint)
      - `is_active` (boolean)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `users` table if not already enabled
    - Conditionally add policies if they don't exist
  3. Data
    - Insert initial admin and manager users
*/

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN', 'CARETAKER', 'INSEMINATOR')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Conditionally create policies
DO $$
BEGIN
  -- Check if "Users can read own data" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can read own data'
  ) THEN
    -- Create policy to allow users to read their own data
    CREATE POLICY "Users can read own data"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  -- Check if "Admins can perform all operations on users" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Admins can perform all operations on users'
  ) THEN
    -- Create policy to allow admins to perform all operations on users
    CREATE POLICY "Admins can perform all operations on users"
      ON users
      FOR ALL 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
      );
  END IF;
END $$;

-- Insert initial admin and manager users
INSERT INTO users (username, full_name, role, is_active)
VALUES 
  ('admin', 'Администратор', 'ADMIN', true),
  ('manager', 'Руководитель', 'MANAGER', true)
ON CONFLICT (username) DO NOTHING;