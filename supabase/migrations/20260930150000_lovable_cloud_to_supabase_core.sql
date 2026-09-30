-- Coworking 013: schema base migrated from Lovable Cloud to Supabase.
-- Destination: rvotuxwzgbxpbrlwcqps
-- This migration intentionally does not create a hard-coded admin password.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.unidades (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, endereco text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.salas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), unidade_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE, nome text NOT NULL, tipo text NOT NULL, capacidade integer DEFAULT 1, descricao text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.planos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, quantidade_horas integer NOT NULL, preco numeric(10,2) NOT NULL, validade_dias integer DEFAULT 30, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.sala_planos (sala_id uuid REFERENCES public.salas(id) ON DELETE CASCADE, plano_id uuid REFERENCES public.planos(id) ON DELETE CASCADE, PRIMARY KEY(sala_id,plano_id));
CREATE TABLE IF NOT EXISTS public.clientes_corp (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), razao_social text NOT NULL, cnpj text, responsavel_nome text, responsavel_email text, responsavel_telefone text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.funcionarios_cliente (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cliente_corp_id uuid REFERENCES public.clientes_corp(id) ON DELETE CASCADE, nome text NOT NULL, email text, cpf text, cargo text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.visitantes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cliente_corp_id uuid REFERENCES public.clientes_corp(id) ON DELETE CASCADE, sala_id uuid REFERENCES public.salas(id), nome text NOT NULL, documento text, data_hora_prevista timestamptz NOT NULL, observacoes text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.contratos_ativos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cliente_corp_id uuid REFERENCES public.clientes_corp(id), sala_id uuid REFERENCES public.salas(id), tipo_locacao text DEFAULT 'mensal', valor_mensal numeric(10,2), data_inicio date NOT NULL, data_fim date NOT NULL, automatic_renewal boolean DEFAULT true, status text DEFAULT 'ativo', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.servicos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, preco text, categoria text, icon text, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE(user_id,role));
CREATE TABLE IF NOT EXISTS public.plano_unidades (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE, unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(plano_id,unidade_id));
CREATE TABLE IF NOT EXISTS public.site_pages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, route text UNIQUE NOT NULL, is_global boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.site_sections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_id uuid NOT NULL REFERENCES public.site_pages(id) ON DELETE CASCADE, section_key text NOT NULL, content jsonb NOT NULL DEFAULT '{}'::jsonb, settings jsonb NOT NULL DEFAULT '{}'::jsonb, order_index integer DEFAULT 0, is_visible boolean DEFAULT true, created_at timestamptz DEFAULT now(), UNIQUE(page_id,section_key));
CREATE TABLE IF NOT EXISTS public.site_articles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, content text, author text, excerpt text, image_url text, status text DEFAULT 'Rascunho', slug text UNIQUE, published_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.media_library (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), filename text NOT NULL, file_type text NOT NULL, mime_type text, url text NOT NULL, size_bytes bigint, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.navigation_menus (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text UNIQUE NOT NULL, description text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.navigation_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), menu_id uuid NOT NULL REFERENCES public.navigation_menus(id) ON DELETE CASCADE, parent_id uuid REFERENCES public.navigation_items(id) ON DELETE CASCADE, label text NOT NULL, url text NOT NULL, order_index integer DEFAULT 0, is_external boolean DEFAULT false, icon text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['unidades','salas','planos','sala_planos','clientes_corp','funcionarios_cliente','visitantes','contratos_ativos','servicos','user_roles','plano_unidades','site_pages','site_sections','site_articles','media_library','navigation_menus','navigation_items','app_settings'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('DROP POLICY IF EXISTS permissive_copilot_access ON public.%I',t);
    EXECUTE format('CREATE POLICY permissive_copilot_access ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)',t);
  END LOOP;
END $$;
