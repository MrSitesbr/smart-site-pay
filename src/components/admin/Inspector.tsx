import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Type, Palette, Maximize2, Trash2, MoveUp, MoveDown, 
  Settings2, AlignLeft, AlignCenter, AlignRight, Bold,
  ChevronUp, ChevronDown, X, Download, Upload, Image as ImageIcon,
  Plus, Star, List, Layout, Search, Layers, Code
} from "lucide-react";
import { MediaPickerModal } from "./MediaPickerModal";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { SectionData, ColumnData, WidgetData } from "@/types/page-builder";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface InspectorProps {
  type: 'section' | 'column' | 'widget';
  data: any;
  onUpdate: (data: any) => void;
  onClose: () => void;
  onDelete?: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({ type, data, onUpdate, onClose, onDelete }) => {
  const [activeTab, setActiveTab] = useState('content');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [showHtmlMode, setShowHtmlMode] = useState<Record<string, boolean>>({});

  const toggleHtmlMode = (fieldId: string) => {
    setShowHtmlMode(prev => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const openPicker = (path: string) => {
    setPickerTarget(path);
    setIsPickerOpen(true);
  };

  const handleSyncImage = async (path: string, url: string) => {
    if (!url || !url.startsWith('http') || url.startsWith('data:') || url.includes('localhost')) {
      toast.error("URL inválida para sincronização.");
      return;
    }

    try {
      toast.info("Sincronizando imagem externa...");
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Erro ao ler blob"));
        reader.readAsDataURL(blob);
      });
      
      if (base64.startsWith('data:image/')) {
        // Sync to library
        const filename = url.split('/').pop()?.split('?')[0] || `sync-${Date.now()}.jpg`;
        await supabase.from('media_library').upsert({
          filename,
          file_type: 'image',
          mime_type: blob.type || 'image/jpeg',
          url: base64,
          size_bytes: blob.size
        }, { onConflict: 'filename' });

        // Update layout data
        const newData = { ...data };
        const parts = path.split('.');
        let current = newData;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = base64;
        onUpdate(newData);
        
        toast.success("Imagem sincronizada com sucesso!");
      }
    } catch (e) {
      console.error("Erro na sincronização:", e);
      toast.error("Falha ao sincronizar imagem.");
    }
  };

  const handleChange = (path: string, value: any) => {
    const newData = { ...data };
    const parts = path.split('.');
    let current = newData;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    onUpdate(newData);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l shadow-xl w-[400px] z-50 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-4 border-b bg-brand-blue-dark text-white">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          <h3 className="font-black uppercase tracking-widest text-xs">
            Editar {type === 'section' ? 'Seção' : type === 'column' ? 'Coluna' : 'Widget'}
          </h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-none border-b">
            <TabsTrigger value="content" className="text-[10px] font-black uppercase tracking-tighter">Conteúdo</TabsTrigger>
            <TabsTrigger value="style" className="text-[10px] font-black uppercase tracking-tighter">Estilo</TabsTrigger>
            <TabsTrigger value="advanced" className="text-[10px] font-black uppercase tracking-tighter">Avançado</TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="content" className="mt-0 space-y-6">
              {type === 'widget' && (
                <>
                  {data.type === 'heading' || data.type === 'text' || data.type === 'button' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Texto</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-[8px] font-bold"
                          onClick={() => toggleHtmlMode('main-text')}
                        >
                          <Code className="w-3 h-3 mr-1" /> {showHtmlMode['main-text'] ? 'VISUAL' : 'HTML'}
                        </Button>
                      </div>
                      
                      {showHtmlMode['main-text'] ? (
                        <Textarea 
                          value={data.content.text || ''} 
                          onChange={(e) => handleChange('content.text', e.target.value)}
                          className="min-h-[200px] text-sm font-mono"
                        />
                      ) : (
                        <div className="bg-white rounded-md border overflow-hidden">
                          <ReactQuill 
                            theme="snow" 
                            value={data.content.text || ''} 
                            onChange={(content) => handleChange('content.text', content)}
                            modules={{
                              toolbar: [
                                [{ 'header': [1, 2, 3, false] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                ['link', 'clean']
                              ]
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : null}

                  {data.type === 'heading' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nível HTML</Label>
                      <Select value={data.content.level || 'h2'} onValueChange={(v) => handleChange('content.level', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].map(lvl => (
                            <SelectItem key={lvl} value={lvl}>{lvl.toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {data.type === 'image' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Imagem</Label>
                      <div className="flex gap-2">
                        <Input value={data.content.url || ''} onChange={(e) => handleChange('content.url', e.target.value)} />
                        {data.content.url && data.content.url.startsWith('http') && !data.content.url.startsWith('data:') && (
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            title="Sincronizar imagem externa" 
                            className="bg-brand-orange text-white hover:bg-brand-orange/90"
                            onClick={() => handleSyncImage('content.url', data.content.url)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="icon" onClick={() => openPicker('content.url')}>
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {data.type === 'form' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Formulário</Label>
                      <Select value={data.content.formType || 'reserva'} onValueChange={(v) => handleChange('content.formType', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reserva">Reserva</SelectItem>
                          <SelectItem value="contato">Contato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(data.type === 'units_grid' || data.type === 'plans_grid' || data.type === 'rooms_grid') && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limite de Itens</Label>
                      <Input 
                        type="number" 
                        value={data.content.limit || 6} 
                        onChange={(e) => handleChange('content.limit', parseInt(e.target.value))} 
                      />
                    </div>
                  )}
                  {data.type === 'icon_box' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Título</Label>
                        <Input value={data.content.title || ''} onChange={(e) => handleChange('content.title', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição</Label>
                        <Textarea value={data.content.description || ''} onChange={(e) => handleChange('content.description', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ícone (Nome Lucide)</Label>
                        <Input value={data.content.icon || 'Check'} onChange={(e) => handleChange('content.icon', e.target.value)} placeholder="Check, Star, Heart, etc." />
                      </div>
                    </div>
                  )}
                  {data.type === 'popup' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Texto do Botão Gatilho</Label>
                        <Input value={data.content.triggerText || ''} onChange={(e) => handleChange('content.triggerText', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Título do Popup</Label>
                        <Input value={data.content.title || ''} onChange={(e) => handleChange('content.title', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Conteúdo (HTML)</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-[8px] font-bold"
                            onClick={() => toggleHtmlMode('popup-content')}
                          >
                            <Code className="w-3 h-3 mr-1" /> {showHtmlMode['popup-content'] ? 'VISUAL' : 'HTML'}
                          </Button>
                        </div>

                        {showHtmlMode['popup-content'] ? (
                          <Textarea 
                            value={data.content.content || ''} 
                            onChange={(e) => handleChange('content.content', e.target.value)}
                            className="min-h-[150px] font-mono text-sm"
                          />
                        ) : (
                          <div className="bg-white rounded-md border overflow-hidden">
                            <ReactQuill 
                              theme="snow" 
                              value={data.content.content || ''} 
                              onChange={(content) => handleChange('content.content', content)}
                              modules={{
                                toolbar: [
                                  [{ 'header': [1, 2, 3, false] }],
                                  ['bold', 'italic', 'underline', 'strike'],
                                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                  ['link', 'clean']
                                ]
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Ação</Label>
                        <Select value={data.content.actionType || 'none'} onValueChange={(v) => handleChange('content.actionType', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma (Apenas Informação)</SelectItem>
                            <SelectItem value="login">Redirecionar para Login</SelectItem>
                            <SelectItem value="register">Redirecionar para Cadastro</SelectItem>
                            <SelectItem value="whatsapp">Abrir WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {data.type === 'global_header' || data.type === 'global_footer' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ícone do Logo (URL)</Label>
                        <div className="flex gap-2">
                          <Input value={data.content.logo_icon || ''} onChange={(e) => handleChange('content.logo_icon', e.target.value)} />
                          {data.content.logo_icon && data.content.logo_icon.startsWith('http') && !data.content.logo_icon.startsWith('data:') && (
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              title="Sincronizar ícone" 
                              className="bg-brand-orange text-white hover:bg-brand-orange/90"
                              onClick={() => handleSyncImage('content.logo_icon', data.content.logo_icon)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="icon" onClick={() => openPicker('content.logo_icon')}>
                            <ImageIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logo Texto Superior</Label>
                        <Input value={data.content.logo_text_top || 'CoWorking'} onChange={(e) => handleChange('content.logo_text_top', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logo Texto Inferior</Label>
                        <Input value={data.content.logo_text_bottom || '013'} onChange={(e) => handleChange('content.logo_text_bottom', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</Label>
                        <Input value={data.content.phone || '(13) 98805-0358'} onChange={(e) => handleChange('content.phone', e.target.value)} />
                      </div>
                      {data.type === 'global_header' && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Slug do Menu</Label>
                          <Select value={data.content.menu_slug || 'main-header'} onValueChange={(v) => handleChange('content.menu_slug', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main-header">Menu Principal</SelectItem>
                              <SelectItem value="footer-nav">Menu Footer</SelectItem>
                              <SelectItem value="footer-services">Menu Serviços</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tighter">
                          DICA: Use a aba "ESTILO" para mudar a cor de fundo deste bloco.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              {type === 'widget' && data.type === 'icon_list' && (
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Itens da Lista</Label>
                  {(data.content.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input 
                        value={item.text} 
                        onChange={(e) => {
                          const newItems = [...data.content.items];
                          newItems[idx].text = e.target.value;
                          handleChange('content.items', newItems);
                        }} 
                      />
                      <Button variant="ghost" size="icon" onClick={() => {
                        const newItems = data.content.items.filter((_: any, i: number) => i !== idx);
                        handleChange('content.items', newItems);
                      }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full text-[10px] font-bold" onClick={() => {
                    const newItems = [...(data.content.items || []), { text: "Novo Item", icon: "Check" }];
                    handleChange('content.items', newItems);
                  }}>
                    <Plus className="w-3 h-3 mr-1" /> ADICIONAR ITEM
                  </Button>
                </div>
              )}

              {type === 'widget' && data.type === 'testimonials' && (
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Depoimentos</Label>
                  {(data.content.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/20 rounded-lg space-y-2">
                      <Input 
                        placeholder="Nome"
                        value={item.name} 
                        onChange={(e) => {
                          const newItems = [...data.content.items];
                          newItems[idx].name = e.target.value;
                          handleChange('content.items', newItems);
                        }} 
                      />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Depoimento</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-[8px] font-bold"
                            onClick={() => toggleHtmlMode(`testimonial-${idx}`)}
                          >
                            <Code className="w-3 h-3 mr-1" /> {showHtmlMode[`testimonial-${idx}`] ? 'VISUAL' : 'HTML'}
                          </Button>
                        </div>

                        {showHtmlMode[`testimonial-${idx}`] ? (
                          <Textarea 
                            placeholder="Depoimento"
                            value={item.text} 
                            onChange={(e) => {
                              const newItems = [...data.content.items];
                              newItems[idx].text = e.target.value;
                              handleChange('content.items', newItems);
                            }} 
                            className="min-h-[100px] font-mono text-xs"
                          />
                        ) : (
                          <div className="bg-white rounded-md border overflow-hidden">
                            <ReactQuill 
                              theme="snow" 
                              value={item.text || ''} 
                              onChange={(content) => {
                                const newItems = [...data.content.items];
                                newItems[idx].text = content;
                                handleChange('content.items', newItems);
                              }}
                              modules={{
                                toolbar: [
                                  ['bold', 'italic', 'underline'],
                                  ['clean']
                                ]
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => {
                        const newItems = data.content.items.filter((_: any, i: number) => i !== idx);
                        handleChange('content.items', newItems);
                      }}>
                        <Trash2 className="w-3 h-3 text-red-500 mr-1" /> EXCLUIR
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full text-[10px] font-bold" onClick={() => {
                    const newItems = [...(data.content.items || []), { name: "Novo Cliente", text: "Excelente!", role: "Empresário", rating: 5 }];
                    handleChange('content.items', newItems);
                  }}>
                    <Plus className="w-3 h-3 mr-1" /> ADICIONAR DEPOIMENTO
                  </Button>
                </div>
              )}

              {type === 'column' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Largura (%)</Label>
                    <Input 
                      type="number" 
                      value={data.widthPercentage || 100} 
                      onChange={(e) => handleChange('widthPercentage', parseInt(e.target.value))} 
                    />
                  </div>
                </div>
              )}

              {type === 'section' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Largura Total</Label>
                    <input 
                      type="checkbox" 
                      checked={data.settings.fullWidth || false} 
                      onChange={(e) => handleChange('settings.fullWidth', e.target.checked)}
                      className="w-4 h-4 accent-brand-orange"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sobreposição (Overlay) - Opacidade</Label>
                    <Input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="1" 
                      value={data.settings.overlayOpacity || 0} 
                      onChange={(e) => handleChange('settings.overlayOpacity', parseFloat(e.target.value))} 
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="style" className="mt-0 space-y-6">
              {type === 'section' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Fundo</Label>
                    <Select value={data.settings.backgroundType || 'classic'} onValueChange={(v) => handleChange('settings.backgroundType', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">Clássico (Cor/Imagem)</SelectItem>
                        <SelectItem value="color">Cor Sólida</SelectItem>
                        <SelectItem value="gradient">Gradiente</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {data.settings.backgroundType === 'gradient' && (
                    <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
                      <Label className="text-[10px] font-black uppercase tracking-widest">Gradiente CSS</Label>
                      <Input 
                        placeholder="linear-gradient(45deg, #000, #333)" 
                        value={data.settings.backgroundGradient || ''} 
                        onChange={(e) => handleChange('settings.backgroundGradient', e.target.value)} 
                      />
                    </div>
                  )}

                  {data.settings.backgroundType === 'video' && (
                    <div className="space-y-2 p-3 bg-muted/20 rounded-lg">
                      <Label className="text-[10px] font-black uppercase tracking-widest">URL Vídeo YouTube</Label>
                      <Input 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        value={data.settings.backgroundVideoUrl || ''} 
                        onChange={(e) => handleChange('settings.backgroundVideoUrl', e.target.value)} 
                      />
                    </div>
                  )}

                  {(data.settings.backgroundType === 'classic' || data.settings.backgroundType === 'color' || !data.settings.backgroundType) && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cor de Fundo</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="color" 
                            className="w-10 h-10 p-1"
                            value={data.settings?.backgroundColor || "#ffffff"} 
                            onChange={(e) => handleChange('settings.backgroundColor', e.target.value)} 
                          />
                          <Input 
                            value={data.settings?.backgroundColor || ""} 
                            onChange={(e) => handleChange('settings.backgroundColor', e.target.value)} 
                            placeholder="#ffffff"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      {(data.settings.backgroundType === 'classic' || !data.settings.backgroundType) && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Imagem de Fundo</Label>
                          <div className="flex gap-2">
                            <Input value={data.settings.backgroundImage || ''} onChange={(e) => handleChange('settings.backgroundImage', e.target.value)} />
                            <Button variant="outline" size="icon" onClick={() => openPicker('settings.backgroundImage')}>
                              <ImageIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {data.settings.backgroundImage && (
                        <div className="space-y-4 p-3 border rounded-lg bg-muted/10">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Posição da Imagem</Label>
                            <Select value={data.settings.backgroundPosition || 'center center'} onValueChange={(v) => handleChange('settings.backgroundPosition', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="center center">Centro Centro</SelectItem>
                                <SelectItem value="center top">Centro Topo</SelectItem>
                                <SelectItem value="center bottom">Centro Base</SelectItem>
                                <SelectItem value="left center">Esquerda Centro</SelectItem>
                                <SelectItem value="left top">Esquerda Topo</SelectItem>
                                <SelectItem value="left bottom">Esquerda Base</SelectItem>
                                <SelectItem value="right center">Direita Centro</SelectItem>
                                <SelectItem value="right top">Direita Topo</SelectItem>
                                <SelectItem value="right bottom">Direita Base</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anexo (Attachment)</Label>
                            <Select value={data.settings.backgroundAttachment || 'scroll'} onValueChange={(v) => handleChange('settings.backgroundAttachment', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="scroll">Padrão (Rola com a página)</SelectItem>
                                <SelectItem value="fixed">Fixo (Paralaxe/Efeito Fixo)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Repetir</Label>
                            <Select value={data.settings.backgroundRepeat || 'no-repeat'} onValueChange={(v) => handleChange('settings.backgroundRepeat', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-repeat">Não Repetir</SelectItem>
                                <SelectItem value="repeat">Repetir</SelectItem>
                                <SelectItem value="repeat-x">Repetir Horizontal</SelectItem>
                                <SelectItem value="repeat-y">Repetir Vertical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tamanho (Size)</Label>
                            <Select value={data.settings.backgroundSize || 'cover'} onValueChange={(v) => handleChange('settings.backgroundSize', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cover">Preencher (Cover)</SelectItem>
                                <SelectItem value="contain">Conter (Contain)</SelectItem>
                                <SelectItem value="auto">Automático</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Divisor de Forma (Bottom Shape)</Label>
                    <Select value={data.settings.shapeDivider || 'none'} onValueChange={(v) => handleChange('settings.shapeDivider', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="tilt">Inclinação</SelectItem>
                        <SelectItem value="curve">Curva</SelectItem>
                        <SelectItem value="waves">Ondas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {type === 'column' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cor de Fundo</Label>
                    <Input 
                      type="color" 
                      className="w-full h-10 p-1"
                      value={data.settings?.backgroundColor || "#transparent"} 
                      onChange={(e) => handleChange('settings.backgroundColor', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Borda</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Largura" onChange={(e) => handleChange('settings.borderWidth', parseInt(e.target.value))} />
                      <Input type="color" className="p-1 h-10 w-full" onChange={(e) => handleChange('settings.borderColor', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {type === 'widget' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipografia</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold">TAMANHO (PX)</Label>
                        <Input 
                          type="number"
                          value={parseInt(data.styles?.fontSize) || 16} 
                          onChange={(e) => handleChange('styles.fontSize', `${e.target.value}px`)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[8px] font-bold">PESO</Label>
                        <Select value={data.styles?.fontWeight || 'normal'} onValueChange={(v) => handleChange('styles.fontWeight', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">300</SelectItem>
                            <SelectItem value="normal">400</SelectItem>
                            <SelectItem value="medium">500</SelectItem>
                            <SelectItem value="bold">700</SelectItem>
                            <SelectItem value="black">900</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cor do Texto</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        className="w-10 h-10 p-1"
                        value={data.styles?.color || "#000000"} 
                        onChange={(e) => handleChange('styles.color', e.target.value)} 
                      />
                      <Input 
                        value={data.styles?.color || ""} 
                        onChange={(e) => handleChange('styles.color', e.target.value)} 
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Alinhamento</Label>
                    <div className="flex bg-muted p-1 rounded-lg">
                      <Button 
                        variant={data.styles?.alignment === 'left' ? 'secondary' : 'ghost'} 
                        size="icon" className="h-8 flex-1"
                        onClick={() => handleChange('styles.alignment', 'left')}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant={data.styles?.alignment === 'center' ? 'secondary' : 'ghost'} 
                        size="icon" className="h-8 flex-1"
                        onClick={() => handleChange('styles.alignment', 'center')}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant={data.styles?.alignment === 'right' ? 'secondary' : 'ghost'} 
                        size="icon" className="h-8 flex-1"
                        onClick={() => handleChange('styles.alignment', 'right')}
                      >
                        <AlignRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sombra do Texto</Label>
                    <Input 
                      placeholder="0px 0px 10px rgba(0,0,0,0.5)" 
                      value={data.styles?.textShadow || ''} 
                      onChange={(e) => handleChange('styles.textShadow', e.target.value)} 
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="mt-0 space-y-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margem Externa (Margin)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[8px] font-bold">TOP</Label>
                      <Input 
                        type="number" 
                        value={type === 'widget' ? (data.styles?.margin?.top || 0) : (data.settings?.margin?.top || 0)} 
                        onChange={(e) => type === 'widget' ? handleChange('styles.margin.top', parseInt(e.target.value)) : handleChange('settings.margin.top', parseInt(e.target.value))} 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-bold">BOTTOM</Label>
                      <Input 
                        type="number" 
                        value={type === 'widget' ? (data.styles?.margin?.bottom || 0) : (data.settings?.margin?.bottom || 0)} 
                        onChange={(e) => type === 'widget' ? handleChange('styles.margin.bottom', parseInt(e.target.value)) : handleChange('settings.margin.bottom', parseInt(e.target.value))} 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Espaçamento Interno (Padding)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[8px] font-bold">TOP</Label>
                      <Input 
                        type="number" 
                        value={type === 'widget' ? (data.styles?.padding?.top || 0) : (data.settings?.padding?.top || 0)} 
                        onChange={(e) => type === 'widget' ? handleChange('styles.padding.top', parseInt(e.target.value)) : handleChange('settings.padding.top', parseInt(e.target.value))} 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-bold">BOT</Label>
                      <Input 
                        type="number" 
                        value={type === 'widget' ? (data.styles?.padding?.bottom || 0) : (data.settings?.padding?.bottom || 0)} 
                        onChange={(e) => type === 'widget' ? handleChange('styles.padding.bottom', parseInt(e.target.value)) : handleChange('settings.padding.bottom', parseInt(e.target.value))} 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-bold">LEF</Label>
                      <Input 
                        type="number" 
                        value={type === 'widget' ? (data.styles?.padding?.left || 0) : (data.settings?.padding?.left || 0)} 
                        onChange={(e) => type === 'widget' ? handleChange('styles.padding.left', parseInt(e.target.value)) : handleChange('settings.padding.left', parseInt(e.target.value))} 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-bold">RIG</Label>
                      <Input 
                        type="number" 
                        value={type === 'widget' ? (data.styles?.padding?.right || 0) : (data.settings?.padding?.right || 0)} 
                        onChange={(e) => type === 'widget' ? handleChange('styles.padding.right', parseInt(e.target.value)) : handleChange('settings.padding.right', parseInt(e.target.value))} 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Efeitos e Visibilidade</Label>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Animação de Entrada</Label>
                    <Select value={data.settings?.animation || data.styles?.animation || 'none'} onValueChange={(v) => type === 'widget' ? handleChange('styles.animation', v) : handleChange('settings.animation', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        <SelectItem value="fadeIn">Fade In</SelectItem>
                        <SelectItem value="fadeInUp">Fade In Up</SelectItem>
                        <SelectItem value="zoomIn">Zoom In</SelectItem>
                        <SelectItem value="slideInLeft">Slide In Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Ocultar no Mobile</Label>
                    <input 
                      type="checkbox" 
                      checked={type === 'widget' ? (data.styles?.hideMobile || false) : (data.settings?.hideMobile || false)} 
                      onChange={(e) => type === 'widget' ? handleChange('styles.hideMobile', e.target.checked) : handleChange('settings.hideMobile', e.target.checked)}
                      className="w-4 h-4 accent-brand-orange"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Z-Index (Camadas)</Label>
                    <Input 
                      type="number" 
                      value={type === 'widget' ? (data.styles?.zIndex || 0) : (data.settings?.zIndex || 0)} 
                      onChange={(e) => type === 'widget' ? handleChange('styles.zIndex', parseInt(e.target.value)) : handleChange('settings.zIndex', parseInt(e.target.value))} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CSS Customizado / Classes</Label>
                  <Input 
                    placeholder="my-custom-class" 
                    value={type === 'widget' ? (data.styles?.className || '') : (data.settings?.className || '')} 
                    onChange={(e) => type === 'widget' ? handleChange('styles.className', e.target.value) : handleChange('settings.className', e.target.value)} 
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className="p-4 border-t bg-muted/20 flex flex-col gap-2">
        {type === 'section' && (
          <Button 
            variant="outline" 
            className="w-full font-bold border-brand-blue-dark text-brand-blue-dark hover:bg-brand-blue-dark hover:text-white"
            onClick={() => {
              const dataStr = JSON.stringify(data, null, 2);
              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
              const exportFileDefaultName = `secao-${data.id}.json`;
              const linkElement = document.createElement('a');
              linkElement.setAttribute('href', dataUri);
              linkElement.setAttribute('download', exportFileDefaultName);
              linkElement.click();
            }}
          >
            <Download className="w-4 h-4 mr-2" /> EXPORTAR SEÇÃO
          </Button>
        )}
        {onDelete && (
          <Button variant="destructive" className="w-full font-bold" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> EXCLUIR
          </Button>
        )}
      </div>

      <MediaPickerModal 
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(url) => {
          if (pickerTarget) {
            handleChange(pickerTarget, url);
          }
          setIsPickerOpen(false);
        }}
      />
    </div>
  );
};
