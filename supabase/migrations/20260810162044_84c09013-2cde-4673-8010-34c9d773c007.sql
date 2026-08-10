-- Deletar dados antigos de unidades para evitar conflitos (opcional, dependendo se já existem IDs fixos)
DELETE FROM public.unidades;

-- Inserir as novas unidades corretas
INSERT INTO public.unidades (nome, endereco) VALUES 
('Unidade Av. Costa e Silva', 'Av. P. Costa e Silva, 609 - S. 906, Boqueirão - Praia Grande - SP'),
('Unidade Rua São Caetano', 'R. São Caetano, 86, Boqueirão - Praia Grande - SP'),
('Unidade Rua Jaú', 'R. Jaú, 955 Conj. 26, Boqueirão - Praia Grande - SP');
