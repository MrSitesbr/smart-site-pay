# Agenda pública completa

## Resultado
- Abrir a página de agendamento mostrando todas as salas por padrão.
- Permitir filtros opcionais por unidade e sala.
- Mostrar o dia selecionado em um Gantt por sala e horário; reservas serão diferenciadas por cores, sem revelar nomes ou dados dos clientes.
- Exibir, em horários livres, ações para solicitar reserva e conversar pelo WhatsApp com os dados já informados, sala, data e horário.
- Adicionar “Agendamento” ao menu superior e ao rodapé.
- Guardar no navegador a consulta já enviada; quem ainda não enviou verá o formulário antes da agenda.

## Implementação
- Ampliar a consulta segura da agenda para devolver apenas faixa de horário e uma chave visual anônima.
- Reestruturar a tela mensal com filtros e Gantt diário responsivo.
- Reutilizar o formulário existente como etapa obrigatória de entrada e persistir somente seus dados de contato no navegador.
- Manter a reserva direta restrita a clientes cadastrados e autorizados.
- Validar criação do lead, navegação, filtros, privacidade, WhatsApp e bloqueio de reserva anônima.
