## Objetivo
Transformar a página `/reservar` (formulário de reserva) em um popup modal que abre sobre a página ativa, com fundo preto semitransparente (overlay).

## Mudanças

1. **Novo componente `src/components/ReservaDialog.tsx`**
   - Move todo o conteúdo do formulário atual de `src/pages/Reservar.tsx` (campos, verificação de disponibilidade, envio ao WhatsApp) para dentro de um `Dialog` do shadcn.
   - Props: `open`, `onOpenChange`, `defaultAmbiente?`, `defaultData?`.
   - Overlay preto com transparência (já é o padrão do `DialogOverlay` — `bg-black/80`).
   - Conteúdo scrollável (`max-h-[90vh] overflow-y-auto`) para caber em telas menores.

2. **Gatilhos de abertura**
   - `HeroSection`, `PricingSection` (botão "Reservar" da linha diária/hora, se houver) e qualquer outro CTA que hoje leva para `/reservar` passam a abrir o `ReservaDialog` via estado local em vez de navegar.
   - Botões de "Selecionar" da tabela de planos continuam como links (não alterados).

3. **Rota `/reservar` (retrocompatibilidade)**
   - Mantém a rota funcional: `src/pages/Reservar.tsx` vira uma página fina que renderiza `<ReservaDialog open onOpenChange={() => navigate("/")}/>` sobre a Home, para que links diretos e QR codes antigos continuem funcionando abrindo o popup sobre a home.

## Fora de escopo
- Nenhuma mudança de lógica de negócio, validação, integração com Supabase Functions ou fluxo do WhatsApp.
- Nenhuma mudança visual no formulário em si além de encaixá-lo no modal.
