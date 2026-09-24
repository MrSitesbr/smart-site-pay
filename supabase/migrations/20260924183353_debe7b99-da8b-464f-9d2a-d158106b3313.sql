UPDATE public.site_sections AS section
SET content = jsonb_build_object(
  'layout', jsonb_build_array(
    jsonb_build_object(
      'id', 'ev-hero-2026',
      'settings', jsonb_build_object('layoutType','full','fullWidth',true,'backgroundType','classic','backgroundImage','/__l5e/assets-v1/3c4a6a22-0fca-4f0b-bee0-ab6b11a49fe8/hero-endereco-virtual-2026.jpg','backgroundPosition','center center','backgroundSize','cover','backgroundRepeat','no-repeat','overlayOpacity',0.58,'padding',jsonb_build_object('top',120,'bottom',108,'left',0,'right',0)),
      'columns', jsonb_build_array(jsonb_build_object('id','ev-hero-col','widthPercentage',100,'settings',jsonb_build_object(),'widgets',jsonb_build_array(
        jsonb_build_object('id','ev-hero-kicker','type','text','content',jsonb_build_object('text','ENDEREÇO FISCAL E COMERCIAL EM PRAIA GRANDE'),'styles',jsonb_build_object('color','#F58220','fontSize','13px','fontWeight','bold','alignment','left')),
        jsonb_build_object('id','ev-hero-title','type','heading','content',jsonb_build_object('text','Sua empresa com presença profissional, sem o custo de um escritório próprio.','level','h1'),'styles',jsonb_build_object('color','#FFFFFF','fontSize','48px','fontWeight','bold','alignment','left')),
        jsonb_build_object('id','ev-hero-text','type','text','content',jsonb_build_object('text','Use um endereço estratégico para registrar seu CNPJ, divulgar sua empresa e receber correspondências com atendimento profissional.'),'styles',jsonb_build_object('color','#FFFFFF','fontSize','19px','alignment','left')),
        jsonb_build_object('id','ev-hero-cta','type','button','content',jsonb_build_object('text','QUERO CONHECER OS PLANOS','url','#planos-endereco-virtual'),'styles',jsonb_build_object('alignment','left'))
      )))
    ),
    jsonb_build_object(
      'id','ev-intro-2026','settings',jsonb_build_object('layoutType','boxed','maxWidth',1180,'backgroundType','color','backgroundColor','#FFFFFF','padding',jsonb_build_object('top',88,'bottom',88,'left',20,'right',20)),
      'columns',jsonb_build_array(
        jsonb_build_object('id','ev-intro-copy','widthPercentage',54,'settings',jsonb_build_object('padding',jsonb_build_object('top',20,'bottom',20,'left',0,'right',44)),'widgets',jsonb_build_array(
          jsonb_build_object('id','ev-intro-kicker','type','text','content',jsonb_build_object('text','COMECE CERTO, CRESÇA COM CREDIBILIDADE'),'styles',jsonb_build_object('color','#F58220','fontSize','12px','fontWeight','bold')),
          jsonb_build_object('id','ev-intro-title','type','heading','content',jsonb_build_object('text','Um endereço à altura do seu negócio','level','h2'),'styles',jsonb_build_object('color','#173F68','fontSize','38px','fontWeight','bold')),
          jsonb_build_object('id','ev-intro-text','type','text','content',jsonb_build_object('text','<p>O Endereço Virtual é a solução para quem precisa formalizar a empresa, proteger o endereço residencial e transmitir uma imagem mais profissional.</p><p>Você conta com um ponto de referência comercial em Praia Grande, gestão de correspondências e uma estrutura pronta para apoiar sua operação — pagando apenas pelo que realmente precisa.</p>'),'styles',jsonb_build_object('color','#5B6875','fontSize','17px')),
          jsonb_build_object('id','ev-intro-list','type','icon_list','content',jsonb_build_object('items',jsonb_build_array(jsonb_build_object('text','Endereço fiscal para abertura ou regularização do CNPJ','icon','Building2'),jsonb_build_object('text','Endereço comercial para site, cartões e materiais de divulgação','icon','MapPin'),jsonb_build_object('text','Recebimento organizado de cartas e encomendas','icon','Mail'))),'styles',jsonb_build_object())
        )),
        jsonb_build_object('id','ev-intro-image-col','widthPercentage',46,'settings',jsonb_build_object(),'widgets',jsonb_build_array(
          jsonb_build_object('id','ev-intro-image','type','image','content',jsonb_build_object('url','/__l5e/assets-v1/ead88cc6-1279-45e7-8001-b8948e59c2fc/correspondencias-endereco-virtual-2026.jpg','alt','Atendimento profissional e gestão de correspondências no Coworking 013'),'styles',jsonb_build_object('borderRadius',8))
        ))
      )
    ),
    jsonb_build_object(
      'id','ev-benefits-2026','settings',jsonb_build_object('layoutType','boxed','maxWidth',1180,'backgroundType','color','backgroundColor','#F3F6F8','padding',jsonb_build_object('top',84,'bottom',84,'left',20,'right',20)),
      'columns',jsonb_build_array(
        jsonb_build_object('id','ev-benefits-col','widthPercentage',100,'settings',jsonb_build_object(),'widgets',jsonb_build_array(
          jsonb_build_object('id','ev-benefits-kicker','type','text','content',jsonb_build_object('text','VANTAGENS PARA SUA EMPRESA'),'styles',jsonb_build_object('color','#F58220','fontSize','12px','fontWeight','bold','alignment','center')),
          jsonb_build_object('id','ev-benefits-title','type','heading','content',jsonb_build_object('text','Mais profissionalismo. Menos custo fixo.','level','h2'),'styles',jsonb_build_object('color','#173F68','fontSize','38px','fontWeight','bold','alignment','center')),
          jsonb_build_object('id','ev-benefits-grid','type','features','content',jsonb_build_object('title','','items',jsonb_build_array(
            jsonb_build_object('title','Credibilidade','description','Apresente um endereço profissional para clientes, parceiros e fornecedores.'),
            jsonb_build_object('title','Privacidade','description','Evite divulgar seu endereço residencial nos registros e canais da empresa.'),
            jsonb_build_object('title','Economia','description','Tenha presença comercial sem assumir aluguel, condomínio e estrutura própria.'),
            jsonb_build_object('title','Correspondências','description','Receba documentos e encomendas com organização e aviso de chegada.')
          )),'styles',jsonb_build_object())
        ))
      )
    ),
    jsonb_build_object(
      'id','ev-difference-2026','settings',jsonb_build_object('layoutType','boxed','maxWidth',1180,'backgroundType','color','backgroundColor','#FFFFFF','padding',jsonb_build_object('top',84,'bottom',84,'left',20,'right',20)),
      'columns',jsonb_build_array(
        jsonb_build_object('id','ev-fiscal-col','widthPercentage',50,'settings',jsonb_build_object('padding',jsonb_build_object('top',28,'bottom',28,'left',28,'right',28),'backgroundColor','#173F68','borderRadius',8),'widgets',jsonb_build_array(
          jsonb_build_object('id','ev-fiscal-icon','type','icon_box','content',jsonb_build_object('title','Endereço Fiscal','description','Utilizado no registro do CNPJ e nos documentos oficiais da empresa. A disponibilidade depende da atividade e da análise das exigências aplicáveis.','icon','Building2'),'styles',jsonb_build_object('color','#FFFFFF'))
        )),
        jsonb_build_object('id','ev-commercial-col','widthPercentage',50,'settings',jsonb_build_object('padding',jsonb_build_object('top',28,'bottom',28,'left',28,'right',28),'backgroundColor','#FFFFFF','borderWidth',1,'borderColor','#D9E1E8','borderRadius',8),'widgets',jsonb_build_array(
          jsonb_build_object('id','ev-commercial-icon','type','icon_box','content',jsonb_build_object('title','Endereço Comercial','description','Usado na divulgação da sua empresa: site, redes sociais, cartões, propostas e materiais institucionais.','icon','MapPin'),'styles',jsonb_build_object())
        ))
      )
    ),
    jsonb_build_object(
      'id','ev-forwho-2026','settings',jsonb_build_object('layoutType','boxed','maxWidth',1180,'backgroundType','color','backgroundColor','#F3F6F8','padding',jsonb_build_object('top',84,'bottom',84,'left',20,'right',20)),
      'columns',jsonb_build_array(jsonb_build_object('id','ev-forwho-col','widthPercentage',100,'settings',jsonb_build_object(),'widgets',jsonb_build_array(
        jsonb_build_object('id','ev-forwho-title','type','heading','content',jsonb_build_object('text','Para quem o Endereço Virtual faz sentido?','level','h2'),'styles',jsonb_build_object('color','#173F68','fontSize','36px','fontWeight','bold','alignment','center')),
        jsonb_build_object('id','ev-forwho-list','type','icon_list','content',jsonb_build_object('items',jsonb_build_array(jsonb_build_object('text','Profissionais autônomos e prestadores de serviço','icon','Check'),jsonb_build_object('text','Empresas digitais, consultorias e negócios remotos','icon','Check'),jsonb_build_object('text','Quem está abrindo ou regularizando uma empresa','icon','Check'),jsonb_build_object('text','Empresas de outras cidades que precisam de presença local','icon','Check'))),'styles',jsonb_build_object('alignment','center'))
      )))
    ),
    jsonb_build_object(
      'id','ev-plans-2026','settings',jsonb_build_object('layoutType','boxed','maxWidth',1180,'backgroundType','color','backgroundColor','#FFFFFF','padding',jsonb_build_object('top',84,'bottom',84,'left',20,'right',20),'className','plans-section'),
      'columns',jsonb_build_array(jsonb_build_object('id','ev-plans-col','widthPercentage',100,'settings',jsonb_build_object(),'widgets',jsonb_build_array(
        jsonb_build_object('id','ev-plans-title','type','heading','content',jsonb_build_object('text','Planos de Endereço Virtual','level','h2'),'styles',jsonb_build_object('color','#173F68','fontSize','38px','fontWeight','bold','alignment','center')),
        jsonb_build_object('id','ev-plans-text','type','text','content',jsonb_build_object('text','Escolha a solução adequada ao momento da sua empresa. Todos os valores são apresentados sob consulta.'),'styles',jsonb_build_object('color','#5B6875','fontSize','17px','alignment','center')),
        jsonb_build_object('id','ev-plans-grid','type','plans_grid','content',jsonb_build_object('type','virtual','limit',6),'styles',jsonb_build_object())
      )))
    ),
    jsonb_build_object(
      'id','ev-final-2026','settings',jsonb_build_object('layoutType','boxed','maxWidth',1180,'backgroundType','color','backgroundColor','#173F68','padding',jsonb_build_object('top',72,'bottom',72,'left',20,'right',20)),
      'columns',jsonb_build_array(jsonb_build_object('id','ev-final-col','widthPercentage',100,'settings',jsonb_build_object(),'widgets',jsonb_build_array(
        jsonb_build_object('id','ev-final-title','type','heading','content',jsonb_build_object('text','Pronto para dar um endereço profissional à sua empresa?','level','h2'),'styles',jsonb_build_object('color','#FFFFFF','fontSize','36px','fontWeight','bold','alignment','center')),
        jsonb_build_object('id','ev-final-text','type','text','content',jsonb_build_object('text','Fale com a equipe do Coworking 013 e descubra a opção ideal para o seu negócio.'),'styles',jsonb_build_object('color','#FFFFFF','fontSize','17px','alignment','center')),
        jsonb_build_object('id','ev-final-cta','type','button','content',jsonb_build_object('text','FALAR COM UM ESPECIALISTA','url','https://wa.me/5513988050358?text=Olá%2C%20quero%20saber%20mais%20sobre%20Endereço%20Virtual'),'styles',jsonb_build_object('alignment','center'))
      )))
    )
  )
)
WHERE section.page_id = (SELECT id FROM public.site_pages WHERE route = '/endereco-virtual' AND unidade_id IS NULL LIMIT 1)
  AND section.section_key = 'dynamic-layout';