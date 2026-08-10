-- 1. Unidades e Salas
CREATE TABLE IF NOT EXISTS public.unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    endereco TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.salas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    capacidade INTEGER DEFAULT 1,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Planos por horas
CREATE TABLE IF NOT EXISTS public.planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    quantidade_horas INTEGER NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    validade_dias INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sala_planos (
    sala_id UUID REFERENCES public.salas(id) ON DELETE CASCADE,
    plano_id UUID REFERENCES public.planos(id) ON DELETE CASCADE,
    PRIMARY KEY (sala_id, plano_id)
);

-- 3. Clientes e Funcionários
CREATE TABLE IF NOT EXISTS public.clientes_corp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    cnpj TEXT,
    responsavel_nome TEXT,
    responsavel_email TEXT,
    responsavel_telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.funcionarios_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_corp_id UUID REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    cargo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Sistema de Visitantes
CREATE TABLE IF NOT EXISTS public.visitantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_corp_id UUID REFERENCES public.clientes_corp(id) ON DELETE CASCADE,
    sala_id UUID REFERENCES public.salas(id),
    nome TEXT NOT NULL,
    documento TEXT,
    data_hora_prevista TIMESTAMP WITH TIME ZONE NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Contratos e Locação Fixa
CREATE TABLE IF NOT EXISTS public.contratos_ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_corp_id UUID REFERENCES public.clientes_corp(id),
    sala_id UUID REFERENCES public.salas(id),
    tipo_locacao TEXT DEFAULT 'mensal',
    valor_mensal DECIMAL(10,2),
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    automatic_renewal BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sala_planos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_corp TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios_cliente TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitantes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_ativos TO authenticated;

GRANT ALL ON public.unidades TO service_role;
GRANT ALL ON public.salas TO service_role;
GRANT ALL ON public.planos TO service_role;
GRANT ALL ON public.sala_planos TO service_role;
GRANT ALL ON public.clientes_corp TO service_role;
GRANT ALL ON public.funcionarios_cliente TO service_role;
GRANT ALL ON public.visitantes TO service_role;
GRANT ALL ON public.contratos_ativos TO service_role;

-- RLS
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_corp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_ativos ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified without block if possible, or using procedural if tool allows)
CREATE POLICY "Admins full access unidades" ON public.unidades TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access salas" ON public.salas TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access planos" ON public.planos TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access sala_planos" ON public.sala_planos TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access clientes_corp" ON public.clientes_corp TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access funcionarios_cliente" ON public.funcionarios_cliente TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access visitantes" ON public.visitantes TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access contratos_ativos" ON public.contratos_ativos TO authenticated USING (public.has_role(auth.uid(), 'admin'));
