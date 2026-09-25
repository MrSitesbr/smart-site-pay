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

type UnidadePageData = {
  id: string;
  nome: string;
  descricao?: string | null;
  endereco?: string | null;
  foto_url?: string | null;
  galeria?: string[] | null;
  servicos_infra?: unknown;
};

const normalizeUnitServices = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      title: String(item.nome || "Infraestrutura"),
      description: String(item.descricao || "Disponível nesta unidade."),
    }));
};

export const unidadeDetailPageLayout = (unidade: UnidadePageData): SectionData[] => {
  const descricao = unidade.descricao?.trim() || "Conheça nossa infraestrutura e os espaços disponíveis.";
  const endereco = unidade.endereco?.trim() || "Endereço não informado";
  const gallery = Array.from(new Set([unidade.foto_url, ...(unidade.galeria || [])].filter((url): url is string => Boolean(url))));
  const services = normalizeUnitServices(unidade.servicos_infra);

  return [
    {
      id: `unit-${unidade.id}-hero`,
      settings: {
        layoutType: "full",
        padding: { top: 112, bottom: 112, left: 0, right: 0 },
        backgroundType: unidade.foto_url ? "classic" : "color",
        backgroundImage: unidade.foto_url || undefined,
        backgroundColor: "#12304a",
        backgroundPosition: "center center",
        backgroundSize: "cover",
        overlayOpacity: unidade.foto_url ? 0.62 : 0,
      },
      columns: [{
        id: `unit-${unidade.id}-hero-column`,
        widthPercentage: 100,
        settings: { padding: { top: 15, bottom: 15, left: 15, right: 15 } },
        widgets: [
          {
            id: `unit-${unidade.id}-title`,
            type: "heading",
            content: { text: unidade.nome, level: "h1" },
            styles: { alignment: "center", fontSize: "48px", color: "#ffffff", fontWeight: "bold" },
          },
          {
            id: `unit-${unidade.id}-address`,
            type: "text",
            content: { text: `<strong>Endereço:</strong> ${endereco}` },
            styles: { alignment: "center", fontSize: "18px", color: "#ffffff" },
          },
        ],
      }],
    },
    {
      id: `unit-${unidade.id}-about`,
      settings: { padding: { top: 72, bottom: 72, left: 0, right: 0 }, backgroundColor: "#ffffff" },
      columns: [{
        id: `unit-${unidade.id}-about-column`,
        widthPercentage: 100,
        settings: { padding: { top: 15, bottom: 15, left: 15, right: 15 } },
        widgets: [
          {
            id: `unit-${unidade.id}-about-title`,
            type: "heading",
            content: { text: "Conheça esta unidade", level: "h2" },
            styles: { alignment: "center", fontSize: "36px", color: "#12304a", fontWeight: "bold" },
          },
          {
            id: `unit-${unidade.id}-description`,
            type: "text",
            content: { text: descricao },
            styles: { alignment: "center", fontSize: "18px", color: "#64748b" },
          },
        ],
      }],
    },
    {
      id: `unit-${unidade.id}-gallery`,
      settings: { padding: { top: 56, bottom: 56, left: 0, right: 0 }, backgroundColor: "#f8fafc" },
      columns: [{
        id: `unit-${unidade.id}-gallery-column`,
        widthPercentage: 100,
        settings: { padding: { top: 15, bottom: 15, left: 15, right: 15 } },
        widgets: [
          {
            id: `unit-${unidade.id}-gallery-title`,
            type: "heading",
            content: { text: "Fotos da unidade", level: "h2" },
            styles: { alignment: "center", fontSize: "36px", color: "#12304a", fontWeight: "bold" },
          },
          {
            id: `unit-${unidade.id}-gallery-widget`,
            type: "gallery",
            content: { images: gallery, emptyText: "As fotos desta unidade serão publicadas em breve." },
            styles: {},
          },
        ],
      }],
    },
    {
      id: `unit-${unidade.id}-services`,
      settings: { padding: { top: 64, bottom: 64, left: 0, right: 0 }, backgroundColor: "#ffffff" },
      columns: [{
        id: `unit-${unidade.id}-services-column`,
        widthPercentage: 100,
        settings: { padding: { top: 15, bottom: 15, left: 15, right: 15 } },
        widgets: [{
          id: `unit-${unidade.id}-services-widget`,
          type: "features",
          content: {
            title: "Infraestrutura e comodidades",
            items: services.length > 0 ? services : [{ title: "Estrutura Coworking 013", description: "Consulte nossa equipe para conhecer tudo o que esta unidade oferece." }],
          },
          styles: {},
        }],
      }],
    },
    {
      id: `unit-${unidade.id}-rooms`,
      settings: { padding: { top: 64, bottom: 72, left: 0, right: 0 }, backgroundColor: "#f8fafc" },
      columns: [{
        id: `unit-${unidade.id}-rooms-column`,
        widthPercentage: 100,
        settings: { padding: { top: 15, bottom: 15, left: 15, right: 15 } },
        widgets: [
          {
            id: `unit-${unidade.id}-rooms-title`,
            type: "heading",
            content: { text: "Salas e espaços", level: "h2" },
            styles: { alignment: "center", fontSize: "36px", color: "#12304a", fontWeight: "bold" },
          },
          {
            id: `unit-${unidade.id}-rooms-grid`,
            type: "rooms_grid",
            content: { limit: 100, unidade_id: unidade.id },
            styles: {},
          },
        ],
      }],
    },
    {
      id: `unit-${unidade.id}-cta`,
      settings: { padding: { top: 72, bottom: 72, left: 0, right: 0 }, backgroundColor: "#12304a" },
      columns: [{
        id: `unit-${unidade.id}-cta-column`,
        widthPercentage: 100,
        settings: { padding: { top: 15, bottom: 15, left: 15, right: 15 } },
        widgets: [
          {
            id: `unit-${unidade.id}-cta-title`,
            type: "heading",
            content: { text: "Encontre o espaço ideal para você", level: "h2" },
            styles: { alignment: "center", fontSize: "36px", color: "#ffffff", fontWeight: "bold" },
          },
          {
            id: `unit-${unidade.id}-cta-button`,
            type: "button",
            content: { text: "CONSULTAR DISPONIBILIDADE", url: "/reservar/calendario" },
            styles: { alignment: "center" },
          },
        ],
      }],
    },
  ];
};
