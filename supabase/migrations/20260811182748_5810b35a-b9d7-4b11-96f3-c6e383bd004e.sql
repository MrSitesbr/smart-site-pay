
-- Sanitizar URLs das salas
UPDATE public.salas
SET foto_url = CASE 
    WHEN foto_url LIKE '%storage/v1/object/public/assets/%' THEN foto_url
    WHEN foto_url LIKE 'assets/%' THEN 'https://zhqelgjcvhpcjylaaesk.supabase.co/storage/v1/object/public/assets/' || foto_url
    ELSE foto_url
END,
galeria = ARRAY(
    SELECT CASE 
        WHEN g LIKE '%storage/v1/object/public/assets/%' THEN g
        WHEN g LIKE 'assets/%' THEN 'https://zhqelgjcvhpcjylaaesk.supabase.co/storage/v1/object/public/assets/' || g
        ELSE g
    END
    FROM unnest(galeria) AS g
)
WHERE foto_url IS NOT NULL OR galeria IS NOT NULL;

-- Sanitizar URLs das unidades
UPDATE public.unidades
SET foto_url = CASE 
    WHEN foto_url LIKE '%storage/v1/object/public/assets/%' THEN foto_url
    WHEN foto_url LIKE 'assets/%' THEN 'https://zhqelgjcvhpcjylaaesk.supabase.co/storage/v1/object/public/assets/' || foto_url
    ELSE foto_url
END,
galeria = ARRAY(
    SELECT CASE 
        WHEN g LIKE '%storage/v1/object/public/assets/%' THEN g
        WHEN g LIKE 'assets/%' THEN 'https://zhqelgjcvhpcjylaaesk.supabase.co/storage/v1/object/public/assets/' || g
        ELSE g
    END
    FROM unnest(galeria) AS g
)
WHERE foto_url IS NOT NULL OR galeria IS NOT NULL;
