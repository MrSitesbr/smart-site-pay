import { SectionData } from "@/types/page-builder";

export const unidadesPageLayout: SectionData[] = [
  {
    id: "units-directory-section",
    settings: { padding: { top: 72, bottom: 72, left: 0, right: 0 }, backgroundColor: "#ffffff" },
    columns: [
      {
        id: "units-directory-column",
        widthPercentage: 100,
        settings: { padding: { top: 15, bottom: 15, left: 15, right: 15 } },
        widgets: [
          {
            id: "units-directory-title",
            type: "heading",
            content: { text: "Nossas unidades", level: "h1" },
            styles: { alignment: "center", fontSize: "42px", color: "#12304a", fontWeight: "bold" },
          },
          {
            id: "units-directory-intro",
            type: "text",
            content: { text: "Conheça nossas unidades, veja a infraestrutura disponível e escolha o espaço ideal para você." },
            styles: { alignment: "center", fontSize: "18px", color: "#64748b" },
          },
          {
            id: "units-directory-grid",
            type: "units_grid",
            content: { limit: 100 },
            styles: {},
          },
        ],
      },
    ],
  },
];

export const unidadeDetailPageLayout = (nome: string, descricao: string, endereco: string, unidadeId: string): SectionData[] => [
  {
    id: "unit-detail-section",
    settings: { padding: { top: 64, bottom: 64, left: 0, right: 0 }, backgroundColor: "#ffffff" },
    columns: [
      {
        id: "unit-detail-column",
        widthPercentage: 100,
        settings: { padding: { top: 15, bottom: 15, left: 15, right: 15 } },
        widgets: [
          {
            id: "unit-detail-title",
            type: "heading",
            content: { text: nome, level: "h1" },
            styles: { alignment: "center", fontSize: "42px", color: "#12304a", fontWeight: "bold" },
          },
          {
            id: "unit-detail-description",
            type: "text",
            content: { text: `${descricao || "Conheça nossa infraestrutura e os espaços disponíveis."}<br><strong>Endereço:</strong> ${endereco || "Endereço não informado"}` },
            styles: { alignment: "center", fontSize: "18px", color: "#64748b" },
          },
          {
            id: "unit-detail-rooms",
            type: "rooms_grid",
            content: { limit: 100, unidade_id: unidadeId },
            styles: {},
          },
        ],
      },
    ],
  },
];
