# Virada de produção e rollback

## Pré-condições

Não faça a virada enquanto houver falha em autenticação, isolamento de clientes, documentos privados, reservas ou funções críticas. Obtenha aprovação explícita para a janela de manutenção.

## Sequência de virada

1. Reduza o TTL do DNS com antecedência, quando aplicável.
2. Avise a janela e coloque o sistema de origem em modo somente leitura ou suspenda novas gravações.
3. Registre o horário exato do congelamento.
4. Gere backup final de banco e manifesto final de Storage.
5. Aplique somente o delta posterior ao ensaio.
6. Compare contagens, relacionamentos e objetos novamente.
7. Publique as Edge Functions e execute smoke tests internos.
8. Troque as variáveis do frontend para o destino e publique.
9. Valide pelo domínio real os fluxos críticos em desktop e mobile.
10. Monitore erros de autenticação, HTTP, funções, banco e Storage.
11. Mantenha a origem intacta durante a janela de rollback acordada.

## Critérios de rollback

Reverta imediatamente se ocorrer qualquer um destes eventos sem correção segura dentro da janela:

- usuários válidos não conseguem autenticar em volume relevante;
- isolamento entre clientes falha;
- reservas podem duplicar horários ou somem do calendário;
- documentos privados ficam públicos ou indisponíveis;
- divergência de dados cresce após a virada;
- funções críticas apresentam erros persistentes.

## Procedimento de rollback

1. Interrompa gravações no destino.
2. Preserve logs e exporte o delta criado no destino.
3. Restaure as variáveis/deploy anteriores sem expor seus valores.
4. Reative gravações na origem.
5. Reconcile o delta do destino antes de uma nova tentativa.
6. Documente causa, impacto e correção necessária.

## Desativação da origem

Somente depois do aceite:

1. confirme backups restauráveis;
2. confirme que DNS, frontend, Auth, banco, Storage, funções e e-mail usam o destino;
3. rotacione/revogue credenciais antigas;
4. remova integrações Lovable restantes do runtime;
5. arquive relatórios sem dados pessoais;
6. cancele o backend antigo apenas com autorização explícita do proprietário.

“Sem dependência do Lovable Cloud” significa que um clone limpo do GitHub consegue compilar, publicar e operar usando apenas o provedor externo e seus próprios secrets.