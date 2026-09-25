UPDATE public.site_sections AS section
SET content = jsonb_insert(
  section.content,
  '{layout,2}',
  jsonb_build_object(
    'id', 'home-endereco-virtual',
    'settings', jsonb_build_object(
      'layoutType', 'full',
      'fullWidth', true,
      'backgroundType', 'color',
      'backgroundColor', '#173F68',
      'padding', jsonb_build_object('top', 76, 'bottom', 0, 'left', 0, 'right', 0)
    ),
    'columns', jsonb_build_array(
      jsonb_build_object(
        'id', 'home-endereco-virtual-content',
        'widthPercentage', 55,
        'settings', jsonb_build_object('padding', jsonb_build_object('top', 20, 'bottom', 70, 'left', 15, 'right', 15)),
        'widgets', jsonb_build_array(
          jsonb_build_object(
            'id', 'home-endereco-virtual-heading',
            'type', 'heading',
            'content', jsonb_build_object('text', 'Endereço fiscal e comercial para a sua empresa', 'level', 'h2'),
            'styles', jsonb_build_object('color', '#FFFFFF', 'fontSize', '42px', 'fontWeight', 'bold')
          ),
          jsonb_build_object(
            'id', 'home-endereco-virtual-intro',
            'type', 'text',
            'content', jsonb_build_object('text', '<p>Tenha um endereço profissional para registrar seu CNPJ, divulgar sua empresa e preservar a privacidade da sua casa.</p>'),
            'styles', jsonb_build_object('color', '#E6EEF6', 'fontSize', '18px')
          ),
          jsonb_build_object(
            'id', 'home-endereco-virtual-benefits',
            'type', 'icon_list',
            'content', jsonb_build_object('items', jsonb_build_array(
              jsonb_build_object('icon', 'Building2', 'text', 'Endereço fiscal para abertura ou transferência do CNPJ'),
              jsonb_build_object('icon', 'MapPin', 'text', 'Endereço comercial para site, cartões e divulgação'),
              jsonb_build_object('icon', 'Mail', 'text', 'Recebimento e gestão de correspondências'),
              jsonb_build_object('icon', 'Check', 'text', 'Mais credibilidade sem o custo de um escritório físico')
            )),
            'styles', jsonb_build_object('color', '#FFFFFF', 'fontSize', '17px', 'margin', jsonb_build_object('top', 24, 'bottom', 28))
          ),
          jsonb_build_object(
            'id', 'home-endereco-virtual-button',
            'type', 'button',
            'content', jsonb_build_object('text', 'CONHEÇA O ENDEREÇO VIRTUAL', 'url', '/endereco-virtual'),
            'styles', jsonb_build_object('alignment', 'left')
          )
        )
      ),
      jsonb_build_object(
        'id', 'home-endereco-virtual-image-column',
        'widthPercentage', 45,
        'settings', jsonb_build_object('padding', jsonb_build_object('top', 0, 'bottom', 0, 'left', 15, 'right', 15)),
        'widgets', jsonb_build_array(
          jsonb_build_object(
            'id', 'home-endereco-virtual-image',
            'type', 'image',
            'content', jsonb_build_object(
              'url', '/__l5e/assets-v1/21e17a4a-e482-4b5f-9a8f-4d542a04ea51/endereco-virtual-profissionais.png',
              'alt', 'Profissionais atendidos pelo serviço de endereço virtual do Coworking 013'
            ),
            'styles', jsonb_build_object()
          )
        )
      )
    )
  ),
  false
)
WHERE section.page_id = (
  SELECT id FROM public.site_pages WHERE route = '/' AND unidade_id IS NULL LIMIT 1
)
  AND section.section_key = 'dynamic-layout'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(section.content->'layout', '[]'::jsonb)) AS item
    WHERE item->>'id' = 'home-endereco-virtual'
  );