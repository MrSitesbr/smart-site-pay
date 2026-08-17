import { 
  Type, Image as ImageIcon, MousePointer2, Layout as LayoutIcon, 
  Columns, AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Trash2, MoveUp, MoveDown, Plus, Settings2, Palette, Maximize2, 
  Building2, CreditCard, Armchair, MessageSquare, Box, 
  List, CheckSquare, Facebook, Instagram, Linkedin, Search, 
  ArrowRightCircle, Star
} from "lucide-react";
import { WidgetType } from "@/types/page-builder";

export const WIDGET_REGISTRY: Record<WidgetType, {
  label: string;
  icon: any;
  defaultContent: any;
  defaultStyles: any;
}> = {
  heading: {
    label: "Título",
    icon: Type,
    defaultContent: { text: "Novo Título", level: "h2" },
    defaultStyles: { fontSize: "32px", color: "#1a1a1a", fontWeight: "bold", alignment: "left" }
  },
  text: {
    label: "Texto",
    icon: AlignLeft,
    defaultContent: { text: "Insira seu texto aqui..." },
    defaultStyles: { fontSize: "16px", color: "#4b5563", alignment: "left" }
  },
  image: {
    label: "Imagem",
    icon: ImageIcon,
    defaultContent: { url: "https://images.unsplash.com/photo-1497366216548-37526070297c", alt: "Imagem" },
    defaultStyles: { borderRadius: 12 }
  },
  button: {
    label: "Botão",
    icon: MousePointer2,
    defaultContent: { text: "Clique Aqui", url: "#" },
    defaultStyles: { alignment: "center" }
  },
  form: {
    label: "Formulário",
    icon: LayoutIcon,
    defaultContent: { formType: "reserva", title: "Solicitar Reserva" },
    defaultStyles: {}
  },
  gallery: {
    label: "Galeria",
    icon: ImageIcon,
    defaultContent: { images: [] },
    defaultStyles: {}
  },
  container: {
    label: "Container",
    icon: Columns,
    defaultContent: {},
    defaultStyles: {}
  },
  video: {
    label: "Vídeo",
    icon: ImageIcon,
    defaultContent: { url: "" },
    defaultStyles: {}
  },
  map: {
    label: "Mapa",
    icon: ImageIcon,
    defaultContent: { address: "" },
    defaultStyles: {}
  },
  spacer: {
    label: "Espaçador",
    icon: Maximize2,
    defaultContent: { height: 40 },
    defaultStyles: {}
  },
  units_grid: {
    label: "Grade de Unidades",
    icon: Building2,
    defaultContent: { limit: 6 },
    defaultStyles: {}
  },
  plans_grid: {
    label: "Grade de Planos",
    icon: CreditCard,
    defaultContent: { limit: 3 },
    defaultStyles: {}
  },
  rooms_grid: {
    label: "Grade de Salas",
    icon: Armchair,
    defaultContent: { limit: 6 },
    defaultStyles: {}
  },
  popup: {
    label: "Popup/Modal",
    icon: MessageSquare,
    defaultContent: { 
      title: "Título do Popup", 
      triggerText: "Abrir Popup",
      content: "Conteúdo do popup aqui...",
      type: "info" // info, form, promo
    },
    defaultStyles: { buttonColor: "#ff6b00" }
  },
  hero: {
    label: "Hero Banner",
    icon: LayoutIcon,
    defaultContent: { title: "Título Principal", subtitle: "Subtítulo da página", cta: "Botão", image: "https://images.unsplash.com/photo-1497366216548-37526070297c" },
    defaultStyles: {}
  },
  features: {
    label: "Recursos/Vantagens",
    icon: LayoutIcon,
    defaultContent: { title: "Por que nós?", items: [{ title: "Vantagem 1", description: "Descrição aqui" }] },
    defaultStyles: {}
  },
  ideal_para: {
    label: "Ideal Para (Galeria)",
    icon: ImageIcon,
    defaultContent: { title: "O espaço ideal", services: [{ title: "Serviço", description: "Descrição", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f" }] },
    defaultStyles: {}
  },
  global_header: {
    label: "Bloco Header",
    icon: LayoutIcon,
    defaultContent: { type: 'main', menu_slug: 'main-header', logo_text_top: 'CoWorking', logo_text_bottom: '013', phone: '(13) 98805-0358' },
    defaultStyles: { backgroundColor: '#002f5e' }
  },
  global_footer: {
    label: "Bloco Footer",
    icon: LayoutIcon,
    defaultContent: { type: 'main', logo_text_top: 'CoWorking', logo_text_bottom: '013', phone: '(13) 98805-0358' },
    defaultStyles: { backgroundColor: '#0b0b0b' }
  },
  inner_section: {
    label: "Seção Interna",
    icon: Columns,
    defaultContent: {
      columns: [
        { id: `col_inner_${Math.random().toString(36).substr(2, 9)}`, widthPercentage: 50, widgets: [] },
        { id: `col_inner_${Math.random().toString(36).substr(2, 9)}`, widthPercentage: 50, widgets: [] }
      ]
    },
    defaultStyles: {}
  },
  icon_box: {
    label: "Caixa de Ícone",
    icon: Box,
    defaultContent: { title: "Título do Recurso", description: "Breve descrição sobre esta vantagem competitiva.", icon: "Check" },
    defaultStyles: { iconColor: "#ff6b00", alignment: "center" }
  },
  icon_list: {
    label: "Lista com Ícones",
    icon: List,
    defaultContent: { 
      items: [
        { text: "Item da lista 1", icon: "Check" },
        { text: "Item da lista 2", icon: "Check" },
        { text: "Item da lista 3", icon: "Check" }
      ] 
    },
    defaultStyles: { iconColor: "#ff6b00" }
  },
  social_icons: {
    label: "Ícones Sociais",
    icon: Facebook,
    defaultContent: { 
      platforms: [
        { name: "Facebook", url: "#", icon: "Facebook" },
        { name: "Instagram", url: "#", icon: "Instagram" },
        { name: "LinkedIn", url: "#", icon: "Linkedin" }
      ] 
    },
    defaultStyles: { alignment: "center", iconSize: 24 }
  },
  testimonials: {
    label: "Depoimentos",
    icon: Star,
    defaultContent: { 
      items: [
        { name: "Cliente Nome", text: "Excelente espaço de trabalho!", role: "CEO na Empresa", rating: 5 }
      ] 
    },
    defaultStyles: {}
  },
  accordion: {
    label: "Acordeão (FAQ)",
    icon: List,
    defaultContent: { 
      items: [
        { title: "Pergunta 1?", content: "Resposta detalhada aqui." },
        { title: "Pergunta 2?", content: "Resposta detalhada aqui." }
      ] 
    },
    defaultStyles: {}
  }
};