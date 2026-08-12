import { 
  Type, Image as ImageIcon, MousePointer2, Layout as LayoutIcon, 
  Columns, AlignLeft, AlignCenter, AlignRight, Bold, Italic, 
  Trash2, MoveUp, MoveDown, Plus, Settings2, Palette, Maximize2 
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
  }
};
