DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salas' AND column_name = 'foto_url') THEN
        ALTER TABLE public.salas ADD COLUMN foto_url text;
    END IF;
END $$;