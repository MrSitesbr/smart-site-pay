import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, X } from "lucide-react";

interface ArtigoIAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: ArtigoIAConfig) => void;
  loading: boolean;
}

export interface ArtigoIAConfig {
  prompt: string;
  tamanho: 'pequeno' | 'medio' | 'grande';
  keywords: string;
}

/**
 * Recriado sem Radix Dialog para garantir funcionamento 
 * e evitar conflitos de portal ou travamentos de foco.
 */
export function ArtigoIAModal({ isOpen, onClose, onGenerate, loading }: ArtigoIAModalProps) {
  const [config, setConfig] = useState<ArtigoIAConfig>({
    prompt: "",
    tamanho: "medio",
    keywords: ""
  });

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.prompt || loading) return;
    onGenerate(config);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={loading ? undefined : onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-border">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-brand-blue-dark/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-brand-blue-dark leading-none mb-1">Gerar c/ IA</h3>
              <p className="text-xs text-muted-foreground font-medium">Otimizado por Mistral AI</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            disabled={loading}
            className="rounded-xl hover:bg-brand-blue-dark/5"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col">
          {/* Body */}
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-brand-blue-dark font-bold">Qual o tema ou título?</Label>
              <Input
                placeholder="Ex: Como o coworking aumenta a produtividade..."
                value={config.prompt}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                className="h-12 border-brand-blue-dark/10 rounded-xl focus:ring-brand-orange"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground italic font-medium">
                Dica: Seja específico para melhores resultados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-brand-blue-dark font-bold">Tamanho</Label>
                <Select 
                  value={config.tamanho} 
                  onValueChange={(val: any) => setConfig({ ...config, tamanho: val })}
                >
                  <SelectTrigger className="h-12 border-brand-blue-dark/10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="pequeno">Curto (~300 words)</SelectItem>
                    <SelectItem value="medio">Médio (~600 words)</SelectItem>
                    <SelectItem value="grande">Longo (+1200 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-brand-blue-dark font-bold">Palavras-chave</Label>
                <Input
                  placeholder="SEO, tags..."
                  value={config.keywords}
                  onChange={(e) => setConfig({ ...config, keywords: e.target.value })}
                  className="h-12 border-brand-blue-dark/10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-brand-blue-dark font-bold opacity-70">Instruções Extras (Opcional)</Label>
              <Textarea
                placeholder="Ex: Escreva num tom formal e inclua uma lista de dicas."
                className="min-h-[80px] border-brand-blue-dark/10 rounded-xl resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border bg-slate-50 flex items-center justify-end gap-3">
            <Button 
              type="button"
              variant="ghost" 
              onClick={onClose} 
              disabled={loading}
              className="font-bold text-muted-foreground hover:bg-black/5 px-6 h-12 rounded-xl"
            >
              CANCELAR
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !config.prompt}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black px-8 h-12 rounded-xl shadow-lg shadow-brand-orange/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  GERANDO...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  GERAR CONTEÚDO
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
