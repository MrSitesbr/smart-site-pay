import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxDocs?: number;
}

export const DocumentUpload = ({ value = [], onChange, maxDocs = 10 }: DocumentUploadProps) => {
  const [processing, setProcessing] = useState(false);

  const optimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error("Não foi possível obter o contexto do canvas"));
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as compressed JPEG
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(optimizedBase64);
        };
        img.onerror = () => reject(new Error("Erro ao carregar imagem"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setProcessing(true);
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newUrls = [...value];

      for (let i = 0; i < files.length; i++) {
        if (newUrls.length >= maxDocs) break;
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
          toast.error("Por favor, selecione apenas arquivos de imagem para documentos.");
          continue;
        }

        const optimized = await optimizeImage(file);
        newUrls.push(optimized);
      }

      onChange(newUrls);
      toast.success("Documento(s) otimizado(s) e adicionado(s)!");
    } catch (error: any) {
      toast.error("Erro ao processar documentos: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const removeDoc = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {value.map((url, index) => (
          <div key={index} className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <img src={url} alt={`Documento ${index + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeDoc(index)}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-1 px-2 backdrop-blur-sm">
              Doc {index + 1}
            </div>
          </div>
        ))}
        
        {value.length < maxDocs && (
          <label className="cursor-pointer aspect-[3/4] rounded-lg border-2 border-dashed border-slate-300 hover:border-brand-orange hover:bg-brand-orange/5 transition-all flex flex-col items-center justify-center gap-2 text-slate-500">
            {processing ? (
              <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
            ) : (
              <>
                <FileText className="w-6 h-6" />
                <span className="text-xs font-medium text-center px-2">Adicionar Documento</span>
              </>
            )}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={processing}
            />
          </label>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground italic">
        * As imagens são otimizadas automaticamente para reduzir o peso sem perder legibilidade.
      </p>
    </div>
  );
};