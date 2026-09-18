# Agenda vertical com seleção por arraste

## Resultado
- Remover as unidades 01 e 04 da agenda pública e do agendamento de clientes, inclusive nas validações do banco.
- Manter calendário mensal e filtros somente com unidades e salas reserváveis.
- Trocar o Gantt horizontal por uma grade vertical no estilo Google Agenda: horários nas linhas e salas nas colunas.
- Permitir clicar e arrastar por horários livres da mesma sala para selecionar um intervalo contínuo.
- Ao soltar, abrir uma confirmação com sala, unidade, data e intervalo escolhido.
- Na confirmação, oferecer envio por WhatsApp ou solicitação pelo sistema.
- Se o visitante escolher o sistema sem estar conectado, encaminhá-lo para entrar ou cadastrar-se; clientes aprovados enviam a solicitação imediatamente.

## Regras de interação
- Células livres não terão botões, textos “Entrar” ou ícones de WhatsApp.
- Horários ocupados continuarão anônimos e coloridos, exibindo apenas “Indisponível”.
- O arraste não poderá atravessar um horário ocupado nem misturar salas.
- O toque em celular selecionará um horário; o usuário poderá ampliar a seleção tocando/arrastando pelos horários adjacentes.

## Implementação técnica
- Filtrar unidades 01 e 04 pelo identificador/nome cadastrado ao carregar unidades e salas.
- Atualizar as funções seguras de disponibilidade e solicitação para excluir/rejeitar salas dessas unidades, evitando contorno pelo navegador.
- Adicionar estado de seleção por ponteiro e diálogo de confirmação na página de agendamento.
- Preservar os dados de consulta já salvos para compor a mensagem do WhatsApp.
- Validar tipos, agenda pública em desktop e celular, seleção, bloqueios, WhatsApp e comportamento autenticado/anônimo.
