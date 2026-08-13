import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload as UploadIcon, File as FileIcon, Check, Trash2, Copy, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MediaItem {
  id: string;
  filename: string;
  file_type: string;
  mime_type: string;
  url: string;
  size_bytes: number;
  created_at: string;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  allowedTypes?: string[];
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  title = "Biblioteca de Mídia",
  allowedTypes = ['image']
}) => {
  const [activeTab, setActiveTab] = useState('library');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen]);

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

  const optimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max 1200px width/height for optimization
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let finalUrl = "";
        let fileType = "other";
        
        if (file.type.startsWith('image/')) {
          finalUrl = await optimizeImage(file);
          fileType = "image";
        } else {
          // For other files, use normal Base64
          finalUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => resolve(e.target?.result as string);
          });
        }

        const { error } = await supabase.from('media_library').insert({
          filename: file.name,
          file_type: fileType,
          mime_type: file.type,
          url: finalUrl,
          size_bytes: file.size
        });

        if (error) throw error;
      } catch (err) {
        console.error(err);
        toast.error(`Erro ao subir ${file.name}`);
      }
    }
    
    toast.success("Arquivos enviados!");
    fetchMedia();
    setActiveTab('library');
    setUploading(false);
  };

  const filteredMedia = media.filter(item => 
    item.filename.toLowerCase().includes(search.toLowerCase()) &&
    (allowedTypes.length === 0 || allowedTypes.includes(item.file_type))
  );

  const selectedMedia = media.find(m => m.id === selectedId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-brand-blue-dark">
            {title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b bg-muted/20">
            <TabsList className="h-12 bg-transparent gap-6">
              <TabsTrigger value="upload" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-orange rounded-none h-full px-0 font-bold">
                Enviar Arquivos
              </TabsTrigger>
              <TabsTrigger value="library" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-orange rounded-none h-full px-0 font-bold">
                Biblioteca de Mídia
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden flex">
            <TabsContent value="upload" className="flex-1 m-0 p-12">
              <div className="border-2 border-dashed border-muted-foreground/20 rounded-3xl h-full flex flex-col items-center justify-center p-12 bg-muted/5">
                <div className="w-20 h-20 bg-brand-orange/10 rounded-full flex items-center justify-center mb-6">
                  <UploadIcon className="w-10 h-10 text-brand-orange" />
                </div>
                <h3 className="text-xl font-bold mb-2">Arraste arquivos para enviar</h3>
                <p className="text-muted-foreground mb-8 text-center max-w-sm">Ou clique no botão abaixo para selecionar arquivos do seu computador.</p>
                <input 
                  type="file" 
                  id="media-upload" 
                  className="hidden" 
                  multiple 
                  onChange={handleFileUpload} 
                  accept={allowedTypes.includes('image') ? 'image/*' : '*/*'}
                />
                <Button 
                  onClick={() => document.getElementById('media-upload')?.click()}
                  disabled={uploading}
                  className="bg-brand-blue-dark hover:bg-brand-blue-dark/90 text-white font-black px-12 py-6 rounded-2xl"
                >
                  {uploading ? "ENVIANDO..." : "SELECIONAR ARQUIVOS"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="library" className="flex-1 m-0 flex overflow-hidden">
              <div className="flex-1 flex flex-col border-r bg-slate-50/50">
                <div className="p-4 border-b bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar mídias..." 
                      className="pl-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-40">Carregando...</div>
                  ) : filteredMedia.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                      <p>Nenhuma mídia encontrada</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                      {filteredMedia.map((item) => (
                        <div 
                          key={item.id}
                          className={`aspect-square relative rounded-lg border-2 overflow-hidden cursor-pointer group transition-all ${selectedId === item.id ? 'border-brand-orange ring-2 ring-brand-orange/20' : 'border-transparent hover:border-brand-blue-dark/20'}`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          {item.file_type === 'image' ? (
                            <img src={item.url} className="w-full h-full object-cover" alt={item.filename} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground">
                              <FileIcon className="w-8 h-8 mb-1" />
                              <span className="text-[10px] truncate w-full px-2 text-center">{item.filename}</span>
                            </div>
                          )}
                          {selectedId === item.id && (
                            <div className="absolute top-1 right-1 bg-brand-orange text-white rounded-full p-0.5">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="w-[300px] p-6 bg-white flex flex-col overflow-y-auto">
                {selectedMedia ? (
                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Detalhes da Mídia</h3>
                    <div className="aspect-video bg-muted rounded-xl overflow-hidden border">
                      {selectedMedia.file_type === 'image' ? (
                        <img src={selectedMedia.url} className="w-full h-full object-contain" alt={selectedMedia.filename} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Nome do Arquivo</p>
                        <p className="text-sm font-bold truncate">{selectedMedia.filename}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Data de Envio</p>
                        <p className="text-sm font-medium">{new Date(selectedMedia.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Tamanho</p>
                        <p className="text-sm font-medium">{(selectedMedia.size_bytes / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="pt-6 border-t flex flex-col gap-3">
                      <Button 
                        onClick={() => onSelect(selectedMedia.url)}
                        className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-black h-12 rounded-xl"
                      >
                        INSERIR MÍDIA
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 h-10" onClick={() => {
                          navigator.clipboard.writeText(selectedMedia.url);
                          toast.success("Link copiado!");
                        }}>
                          <Copy className="w-4 h-4 mr-2" /> Link
                        </Button>
                        <Button variant="outline" className="h-10 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={async () => {
                          if (confirm("Excluir esta mídia permanentemente?")) {
                            await supabase.from('media_library').delete().eq('id', selectedMedia.id);
                            fetchMedia();
                            setSelectedId(null);
                            toast.success("Mídia excluída");
                          }
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-sm">Selecione uma mídia para ver os detalhes</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};