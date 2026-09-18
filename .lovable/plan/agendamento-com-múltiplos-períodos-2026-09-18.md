# Agendamento com múltiplos períodos

## O que será feito
- Transformar a confirmação em um resumo editável com nome, e-mail, WhatsApp e tipo de negócio.
- Permitir manter a mesma sala e adicionar vários dias e intervalos livres à solicitação.
- Exibir cada período em uma lista, com opção de remover antes do envio.
- Enviar toda a lista em uma única mensagem pelo WhatsApp.
- Para clientes autenticados, gravar todos os períodos juntos; se qualquer horário ficar indisponível, nenhum será gravado.
- Manter a seleção ao entrar ou cadastrar e retornar à agenda.

## Validação e segurança
- Validar dados e limites no navegador antes de gerar links ou enviar solicitações.
- Validar novamente no banco: mesma sala, datas úteis futuras, horários permitidos e ausência de conflitos.
- Limitar a quantidade de períodos por solicitação para evitar abuso.

## Validação final
- Verificar tipos e testes existentes.
- Testar seleção, edição, remoção, WhatsApp e redirecionamento em desktop e celular.
