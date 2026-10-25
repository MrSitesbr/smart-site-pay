-- Etapa 7: grade de planos do site alimentada pelo cadastro do admin.
UPDATE public.planos SET tipo = 'endereco' WHERE categoria = 'endereco' AND coalesce(tipo, '') <> 'endereco';
UPDATE public.planos SET tipo = 'privativo' WHERE slug = 'tranquilidade' AND coalesce(tipo, '') = '';
UPDATE public.planos SET tipo = 'avulso' WHERE slug = 'avulso' AND coalesce(tipo, '') = '';

-- Página de Endereço Virtual: a grade mostra os planos de endereço com os valores oficiais.
UPDATE public.site_sections
SET content = replace(replace(content::text,
    '"id": "ev-plans-grid", "type": "plans_grid", "styles": {}, "content": {"type": "all"',
    '"id": "ev-plans-grid", "type": "plans_grid", "styles": {}, "content": {"type": "endereco"'),
    ' Todos os valores são apresentados sob consulta.', '')::jsonb
WHERE content::text LIKE '%"id": "ev-plans-grid", "type": "plans_grid", "styles": {}, "content": {"type": "all"%';
