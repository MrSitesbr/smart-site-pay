# Corrigir a renderização completa das páginas de unidades

## Objetivo
Garantir que cada página pública de unidade mostre todas as seções salvas no JSON, na ordem definida no painel, e tenha uma página completa mesmo quando ainda não existir um JSON próprio para aquela unidade.

## Implementação
- Ajustar o carregamento para reunir todos os layouts visíveis da unidade, respeitando `order_index`, em vez de usar somente o primeiro registro encontrado.
- Manter prioridade para o JSON específico vinculado à unidade e ignorar apenas seções ocultas ou inválidas.
- Ampliar o modelo padrão das unidades com blocos separados de apresentação, endereço, fotos, infraestrutura, salas disponíveis e chamada para agendamento.
- Carregar no modelo padrão os dados reais já cadastrados da unidade: foto, galeria, serviços, descrição, endereço e salas.
- Preservar o conteúdo existente das demais páginas e o editor administrativo.

## Validação
- Conferir as quatro páginas de unidade no computador e no celular.
- Confirmar a quantidade e a ordem das seções renderizadas.
- Executar verificação de tipos, testes e compilação.
