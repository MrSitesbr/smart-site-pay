import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";

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

export function ArtigoIAModal({ isOpen, onClose, onGenerate, loading }: ArtigoIAModalProps) {
  const [config, setConfig] = useState<ArtigoIAConfig>({
    prompt: "",
    tamanho: "medio",
    keywords: ""
  });

  const handleGenerate = () => {
    onGenerate(config);
  };

  console.log("ArtigoIAModal render, isOpen:", isOpen);
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-blue-dark">
            <Sparkles className="w-5 h-5 text-brand-orange" />
            Gerar Artigo com IA
          </DialogTitle>
          <DialogDescription>
            Defina o tema e as configurações para que a IA crie um artigo otimizado para você.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Tema ou Título do Artigo</Label>
            <Input
              id="prompt"
              placeholder="Ex: Benefícios do networking em espaços de coworking..."
              value={config.prompt}
              onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tamanho">Tamanho do Artigo</Label>
            <Select 
              value={config.tamanho} 
              onValueChange={(val: any) => setConfig({ ...config, tamanho: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tamanho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pequeno">Pequeno (~300 palavras)</SelectItem>
                <SelectItem value="medio">Médio (~600 palavras)</SelectItem>
                <SelectItem value="grande">Grande / Cauda Longa (~1200+ palavras)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Palavras-chave (Opcional)</Label>
            <Textarea
              id="keywords"
              placeholder="Separe por vírgulas. Se deixar vazio, a IA escolherá as melhores para o tema."
              value={config.keywords}
              onChange={(e) => setConfig({ ...config, keywords: e.target.value })}
              className="h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={loading || !config.prompt}
            className="bg-brand-orange hover:bg-brand-orange/90 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Conteúdo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
