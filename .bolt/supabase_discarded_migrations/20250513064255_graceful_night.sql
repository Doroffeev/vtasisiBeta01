/*
  # Fix calvings and calving_logs tables with proper constraints

  1. This migration safely creates or modifies the calvings and calving_logs tables
  2. It ensures proper foreign key relationships and row level security
  3. All operations are wrapped in conditional blocks to prevent errors on reapplication
*/

DO $$
BEGIN
  -- Create calvings table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'calvings'
  ) THEN
    CREATE TABLE public.calvings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      mother_id uuid,
      date date NOT NULL,
      status text NOT NULL CHECK (status IN ('success', 'abortion', 'stillbirth')),
      child_id uuid,
      child_number text,
      child_responder text,
      child_group_id uuid,
      child_gender text CHECK (child_gender IN ('male', 'female')),
      child_weight text,
      notes text,
      has_mastitis boolean DEFAULT false,
      executor_id uuid,
      new_mother_group_id uuid,
      created_at timestamptz DEFAULT now(),
      is_deleted boolean DEFAULT false,
      deleted_at timestamptz,
      deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
      deletion_reason text
    );
  ELSE
    -- Update existing calvings table to ensure it has all required columns
    -- Add is_deleted column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'calvings' AND column_name = 'is_deleted'
    ) THEN
      ALTER TABLE public.calvings ADD COLUMN is_deleted boolean DEFAULT false;
    END IF;
    
    -- Add deleted_at column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'calvings' AND column_name = 'deleted_at'
    ) THEN
      ALTER TABLE public.calvings ADD COLUMN deleted_at timestamptz;
    END IF;
    
    -- Add deleted_by column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'calvings' AND column_name = 'deleted_by'
    ) THEN
      ALTER TABLE public.calvings ADD COLUMN deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add deletion_reason column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'calvings' AND column_name = 'deletion_reason'
    ) THEN
      ALTER TABLE public.calvings ADD COLUMN deletion_reason text;
    END IF;
  END IF;
  
  -- Enable RLS for calvings table if not already enabled
  ALTER TABLE public.calvings ENABLE ROW LEVEL SECURITY;
  
  -- Create calving_logs table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'calving_logs'
  ) THEN
    CREATE TABLE public.calving_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      calving_id uuid,
      user_id uuid REFERENCES public.users(id),
      action text NOT NULL CHECK (action IN ('CREATE', 'DELETE')),
      details text,
      timestamp timestamptz DEFAULT now()
    );
    
    -- Add the foreign key with ON DELETE SET NULL
    ALTER TABLE public.calving_logs 
    ADD CONSTRAINT calving_logs_calving_id_fkey 
    FOREIGN KEY (calving_id) 
    REFERENCES public.calvings(id) ON DELETE SET NULL;
  ELSE
    -- If table exists, ensure the foreign key has the correct properties
    -- First drop any existing constraints on calving_id
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'calving_logs_calving_id_fkey' 
      AND table_name = 'calving_logs'
    ) THEN
      ALTER TABLE public.calving_logs DROP CONSTRAINT calving_logs_calving_id_fkey;
    END IF;
    
    -- Make calving_id nullable if it's not already
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'calving_logs' 
      AND column_name = 'calving_id' 
      AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE public.calving_logs ALTER COLUMN calving_id DROP NOT NULL;
    END IF;
    
    -- Add the constraint with ON DELETE SET NULL
    ALTER TABLE public.calving_logs
    ADD CONSTRAINT calving_logs_calving_id_fkey 
    FOREIGN KEY (calving_id) 
    REFERENCES public.calvings(id) ON DELETE SET NULL;
  END IF;
  
  -- Enable RLS for calving_logs table if not already enabled
  ALTER TABLE public.calving_logs ENABLE ROW LEVEL SECURITY;
  
  -- Create RLS policies if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'calvings' AND policyname = 'All authenticated users can do anything with calvings'
  ) THEN
    CREATE POLICY "All authenticated users can do anything with calvings"
      ON public.calvings
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'calving_logs' AND policyname = 'All authenticated users can do anything with calving_logs'
  ) THEN
    CREATE POLICY "All authenticated users can do anything with calving_logs"
      ON public.calving_logs
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;