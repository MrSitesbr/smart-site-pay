import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Info, ExternalLink, ShieldCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AdminMediaProxy() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    if (!url || !url.startsWith("http")) {
      toast.error("Insira uma URL válida.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      toast.info("Processando via Proxy de Mídia...");
      
      // Attempt to fetch via Lovable Cloud's environment
      // If it fails with CORS here, we'll explain to the user.
      const response = await fetch(url, { 
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      }).catch(err => {
        throw new Error("Erro de CORS: O servidor de origem bloqueia o acesso direto. Tente baixar a imagem no seu PC e fazer o upload manual na Biblioteca de Mídias.");
      });

      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Erro ao converter para Base64"));
        reader.readAsDataURL(blob);
      });

      if (base64.startsWith("data:image/")) {
        const filename = url.split('/').pop()?.split('?')[0] || `proxy-${Date.now()}.jpg`;
        
        const { error: upsertError } = await supabase.from('media_library').upsert({
          filename,
          file_type: 'image',
          mime_type: blob.type || 'image/jpeg',
          url: base64,
          size_bytes: blob.size
        }, { onConflict: 'filename' });

        if (upsertError) throw upsertError;

        setResult(base64);
        toast.success("Imagem sincronizada com sucesso!");
      } else {
        throw new Error("O arquivo não é uma imagem válida.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-brand-blue-dark">Proxy de Mídia</h2>
        <p className="text-muted-foreground font-medium">
          Ferramenta para forçar a importação de imagens externas para o servidor local quando o editor visual falha por restrições de segurança (CORS).
        </p>
      </div>

      <Card className="p-8 border-none shadow-sm space-y-6 bg-white">
        <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100 text-orange-800">
          <Info className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="text-sm space-y-2">
            <p className="font-bold uppercase tracking-wider text-[10px]">Por que usar o Proxy?</p>
            <p>
              Muitos sites (como o WordPress do Coworking 013 original) protegem suas imagens. O navegador impede que o nosso site "leia" essas fotos diretamente. 
            </p>
            <p>
              Se ao clicar em sincronizar no editor você receber um erro de <strong>CORS</strong>, cole a URL da imagem aqui.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">URL da Imagem Externa</Label>
            <div className="flex gap-2">
              <Input 
                placeholder="https://exemplo.com/foto.jpg" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                className="font-mono text-sm"
              />
              <Button 
                onClick={handleSync} 
                disabled={loading}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold px-8 shrink-0"
              >
                {loading ? "PROCESSANDO..." : "SINCRONIZAR AGORA"}
              </Button>
            </div>
          </div>
        </div>

        {result && (
          <div className="pt-6 border-t space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" /> SUCESSO! IMAGEM HOSPEDADA LOCALMENTE
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prévia</Label>
                <div className="rounded-xl overflow-hidden border bg-slate-50 aspect-video flex items-center justify-center">
                  <img src={result} alt="Resultado" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Novo Endereço (Base64)</Label>
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    A imagem agora faz parte do seu banco de dados. O editor visual usará este código automaticamente.
                  </p>
                  <div className="bg-slate-900 text-white p-4 rounded-xl font-mono text-[9px] break-all max-h-[150px] overflow-y-auto custom-scrollbar">
                    {result.substring(0, 500)}...
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 font-bold"
                    onClick={() => {
                      navigator.clipboard.writeText(result);
                      toast.success("Código copiado!");
                    }}
                  >
                    COPIAR CÓDIGO
                  </Button>
                  <Button 
                    className="flex-1 bg-brand-blue-dark text-white font-bold"
                    onClick={() => {
                      setUrl("");
                      setResult(null);
                    }}
                  >
                    NOVA SINCRONIZAÇÃO
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-none shadow-sm bg-brand-blue-dark text-white space-y-4">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Download className="w-5 h-5 text-brand-orange" />
          </div>
          <h4 className="font-black uppercase tracking-widest text-sm">Opção B: Upload Manual</h4>
          <p className="text-sm text-white/70 font-medium">
            Se o Proxy falhar, a forma mais segura é baixar a imagem no seu computador e enviá-la pela Biblioteca de Mídias.
          </p>
        </Card>

        <Card className="p-6 border-none shadow-sm bg-white space-y-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-brand-blue-dark" />
          </div>
          <h4 className="font-black uppercase tracking-widest text-sm text-brand-blue-dark">Verificar na Biblioteca</h4>
          <p className="text-sm text-muted-foreground font-medium">
            Todas as imagens sincronizadas com sucesso aparecerão automaticamente na sua galeria.
          </p>
        </Card>
      </div>
    </div>
  );
}
