import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export const ImageUpload = ({ value = [], onChange, maxImages = 10 }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newUrls = [...value];

      for (let i = 0; i < files.length; i++) {
        if (newUrls.length >= maxImages) break;

        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('assets')
          .getPublicUrl(filePath);

        const finalUrl = publicUrl;

        // Debug: Log the generated URL
        console.log("Generated Public URL:", finalUrl);

        newUrls.push(finalUrl);
      }

      onChange(newUrls);
      toast.success("Imagens enviadas com sucesso!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (urlToRemove: string) => {
    onChange(value.filter(url => url !== urlToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {value.map((url, index) => (
          <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <img src={url} alt="Upload" className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(url)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            {index === 0 && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-brand-orange text-white text-[10px] font-bold rounded">
                Destaque
              </div>
            )}
          </div>
        ))}
        
        {value.length < maxImages && (
          <label className="cursor-pointer aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-orange hover:bg-brand-orange/5 transition-all flex flex-col items-center justify-center gap-2 text-slate-500">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-xs font-medium">Adicionar Fotos</span>
              </>
            )}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
        A primeira imagem será usada como foto de destaque.
      </p>
    </div>
  );
};
