import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload as UploadIcon, File as FileIcon, Trash2, Copy, Image as ImageIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MediaPickerModal } from "./MediaPickerModal";

interface MediaItem {
  id: string;
  filename: string;
  file_type: string;
  mime_type: string;
  url: string;
  size_bytes: number;
  created_at: string;
}

export default function AdminMidias() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_library')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error("Erro ao carregar mídias");
    } else {
      setMedia(data || []);
    }
    setLoading(false);
  };

  const filteredMedia = media.filter(item => 
    item.filename.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta mídia permanentemente?")) return;
    
    const { error } = await supabase.from('media_library').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir mídia");
    } else {
      toast.success("Mídia excluída");
      fetchMedia();
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-blue-dark uppercase tracking-tighter">Biblioteca de Mídias</h1>
          <p className="text-muted-foreground font-medium">Gerencie todas as imagens e arquivos do sistema</p>
        </div>
        <Button 
          onClick={() => setIsPickerOpen(true)}
          className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black px-8 py-6 rounded-2xl shadow-lg shadow-brand-orange/20"
        >
          <Plus className="w-5 h-5 mr-2" /> SUBIR NOVAS MÍDIAS
        </Button>
      </div>

      <Card className="p-6 border-none shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome do arquivo..." 
              className="pl-12 h-14 rounded-xl border-brand-gray/20 text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-3xl border-2 border-dashed border-muted/20">
            <ImageIcon className="w-20 h-20 text-muted-foreground/20 mb-6" />
            <p className="text-xl font-bold text-muted-foreground">Nenhuma mídia encontrada</p>
            <Button variant="link" onClick={() => setIsPickerOpen(true)} className="text-brand-orange font-bold">
              Subir primeiro arquivo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredMedia.map((item) => (
              <div key={item.id} className="group relative bg-white rounded-2xl border border-brand-gray/10 shadow-sm hover:shadow-xl transition-all overflow-hidden">
                <div className="aspect-square relative overflow-hidden bg-slate-50">
                  {item.file_type === 'image' ? (
                    <img src={item.url} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt={item.filename} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <FileIcon className="w-12 h-12 mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{item.mime_type.split('/')[1]}</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-brand-blue-dark/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                    <Button size="sm" variant="secondary" className="font-bold h-9 w-32" onClick={() => copyLink(item.url)}>
                      <Copy className="w-3 h-3 mr-2" /> COPIAR LINK
                    </Button>
                    <Button size="sm" variant="destructive" className="font-bold h-9 w-32" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-3 h-3 mr-2" /> EXCLUIR
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold truncate text-brand-blue-dark mb-1">{item.filename}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {(item.size_bytes / 1024).toFixed(1)} KB · {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <MediaPickerModal 
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(url) => {
          setIsPickerOpen(false);
          fetchMedia();
        }}
        allowedTypes={[]} // Allow all types
      />
    </div>
  );
}