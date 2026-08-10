import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => (
  <a
    href="https://wa.me/5513988050358?text=Ol%C3%A1!%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20o%20Coworking%20013"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] hover:scale-110 transition-transform flex items-center justify-center shadow-2xl group"
    aria-label="Fale conosco no WhatsApp"
  >
    <MessageCircle className="w-7 h-7 text-white fill-white" />
    <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
  </a>
);

export default WhatsAppButton;
