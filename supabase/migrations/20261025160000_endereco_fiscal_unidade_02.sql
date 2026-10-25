-- Endereço Fiscal/Comercial: confirmado pelo coworking que em Praia Grande é a sala 906
-- (Unidade 02 - Av. Costa e Silva), e em São Vicente o Helbor (Unidade 04).
DELETE FROM public.plano_unidades pu
USING public.planos p
WHERE pu.plano_id = p.id AND p.categoria = 'endereco'
  AND pu.unidade_id = '66a610f6-1f6b-4673-903d-80aa57657982';

INSERT INTO public.plano_unidades (plano_id, unidade_id)
SELECT p.id, '7eccfbf5-a0fc-41cd-a6ad-bda50cfb9da5'::uuid
FROM public.planos p
WHERE p.categoria = 'endereco'
  AND NOT EXISTS (SELECT 1 FROM public.plano_unidades x WHERE x.plano_id = p.id AND x.unidade_id = '7eccfbf5-a0fc-41cd-a6ad-bda50cfb9da5');
