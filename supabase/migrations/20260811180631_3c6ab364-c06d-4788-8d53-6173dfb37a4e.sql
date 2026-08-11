
-- 1. Move has_role into a private (non API-exposed) schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO postgres, service_role;

-- 2. Drop all overly permissive public policies
DROP POLICY IF EXISTS "Allow all for everyone on client_colors" ON public.client_colors;
DROP POLICY IF EXISTS "Allow all for everyone on clientes_corp" ON public.clientes_corp;
DROP POLICY IF EXISTS "Allow all for everyone on contract_requests" ON public.contract_requests;
DROP POLICY IF EXISTS "Allow all for everyone on contratos_ativos" ON public.contratos_ativos;
DROP POLICY IF EXISTS "Allow all for everyone on funcionarios_cliente" ON public.funcionarios_cliente;
DROP POLICY IF EXISTS "Allow all for everyone on planos" ON public.planos;
DROP POLICY IF EXISTS "Allow all for everyone on reservations" ON public.reservations;
DROP POLICY IF EXISTS "Allow all for everyone on sala_planos" ON public.sala_planos;
DROP POLICY IF EXISTS "Allow all for everyone on salas" ON public.salas;
DROP POLICY IF EXISTS "Allow all for everyone on servicos" ON public.servicos;
DROP POLICY IF EXISTS "Allow all for everyone on site_pages" ON public.site_pages;
DROP POLICY IF EXISTS "Allow all for everyone on site_sections" ON public.site_sections;
DROP POLICY IF EXISTS "Allow all for everyone on unidades" ON public.unidades;
DROP POLICY IF EXISTS "Allow all for everyone on visitantes" ON public.visitantes;
DROP POLICY IF EXISTS "Allow admin all" ON public.unidades;
DROP POLICY IF EXISTS "Allow public read for roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow public check for login" ON public.user_roles;

-- 3. Recreate admin policies against private.has_role
DROP POLICY IF EXISTS "Admins can delete client colors" ON public.client_colors;
DROP POLICY IF EXISTS "Admins can insert client colors" ON public.client_colors;
DROP POLICY IF EXISTS "Admins can update client colors" ON public.client_colors;
CREATE POLICY "Admins manage client colors" ON public.client_colors FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins full access clientes_corp" ON public.clientes_corp;
CREATE POLICY "Admins full access clientes_corp" ON public.clientes_corp FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins delete requests" ON public.contract_requests;
DROP POLICY IF EXISTS "Admins update requests" ON public.contract_requests;
DROP POLICY IF EXISTS "Users view own requests" ON public.contract_requests;
CREATE POLICY "Admins delete requests" ON public.contract_requests FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update requests" ON public.contract_requests FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own requests" ON public.contract_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins full access contratos_ativos" ON public.contratos_ativos;
CREATE POLICY "Admins full access contratos_ativos" ON public.contratos_ativos FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins full access funcionarios_cliente" ON public.funcionarios_cliente;
CREATE POLICY "Admins full access funcionarios_cliente" ON public.funcionarios_cliente FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins full access plano_unidades" ON public.plano_unidades;
CREATE POLICY "Admins full access plano_unidades" ON public.plano_unidades FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read plano_unidades" ON public.plano_unidades FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins full access planos" ON public.planos;
CREATE POLICY "Admins full access planos" ON public.planos FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read planos" ON public.planos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can view reservations" ON public.reservations;
CREATE POLICY "Admins can delete reservations" ON public.reservations FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update reservations" ON public.reservations FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can view reservations" ON public.reservations FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins full access sala_planos" ON public.sala_planos;
CREATE POLICY "Admins full access sala_planos" ON public.sala_planos FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read sala_planos" ON public.sala_planos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins full access salas" ON public.salas;
CREATE POLICY "Admins full access salas" ON public.salas FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read salas" ON public.salas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage services" ON public.servicos;
CREATE POLICY "Admins can manage services" ON public.servicos FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Public read servicos" ON public.servicos FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin update on site_pages" ON public.site_pages;
CREATE POLICY "Allow admin update on site_pages" ON public.site_pages FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Allow admin update on site_sections" ON public.site_sections;
CREATE POLICY "Allow admin update on site_sections" ON public.site_sections FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins full access unidades" ON public.unidades;
CREATE POLICY "Admins full access unidades" ON public.unidades FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins full access visitantes" ON public.visitantes;
CREATE POLICY "Admins full access visitantes" ON public.visitantes FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage woba closings" ON public.woba_closings;
CREATE POLICY "Admins manage woba closings" ON public.woba_closings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- 4. Remove the API-exposed SECURITY DEFINER function
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 5. Tighten storage write access on the assets bucket
DROP POLICY IF EXISTS "Anyone can upload to assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update own assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete own assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Full Access" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins update assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete assets" ON storage.objects;
CREATE POLICY "Admins upload assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assets' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assets' AND private.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'assets' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assets' AND private.has_role(auth.uid(),'admin'));

REVOKE INSERT, UPDATE, DELETE ON storage.objects FROM anon;
REVOKE ALL ON storage.buckets FROM anon;
GRANT SELECT ON storage.buckets TO anon, authenticated;

-- 6. Tighten table grants
REVOKE ALL ON public.client_colors, public.clientes_corp, public.contract_requests,
  public.contratos_ativos, public.funcionarios_cliente, public.visitantes,
  public.woba_closings, public.user_roles FROM anon;
GRANT SELECT ON public.unidades, public.salas, public.planos, public.servicos,
  public.sala_planos, public.plano_unidades, public.site_pages, public.site_sections TO anon;
GRANT INSERT ON public.reservations TO anon;
REVOKE SELECT, UPDATE, DELETE ON public.reservations FROM anon;
