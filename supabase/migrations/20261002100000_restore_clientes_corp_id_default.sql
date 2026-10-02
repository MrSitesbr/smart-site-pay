DO $$
DECLARE
  client_id_type regtype;
BEGIN
  SELECT attribute.atttypid::regtype
    INTO client_id_type
    FROM pg_attribute AS attribute
   WHERE attribute.attrelid = 'public.clientes_corp'::regclass
     AND attribute.attname = 'id'
     AND attribute.attnum > 0
     AND NOT attribute.attisdropped;

  IF client_id_type = 'text'::regtype THEN
    ALTER TABLE public.clientes_corp
      ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  ELSIF client_id_type = 'uuid'::regtype THEN
    ALTER TABLE public.clientes_corp
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
  ELSE
    RAISE EXCEPTION 'Unsupported clientes_corp.id type: %', client_id_type;
  END IF;
END;
$$;