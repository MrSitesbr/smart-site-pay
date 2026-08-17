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
  ChevronUp, ChevronDown, X, Download, Upload, Image as ImageIcon
} from "lucide-react";
import { MediaPickerModal } from "./MediaPickerModal";
import { SectionData, ColumnData, WidgetData } from "@/types/page-builder";

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

  const openPicker = (path: string) => {
    setPickerTarget(path);
    setIsPickerOpen(true);
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
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Texto</Label>
                      <Textarea 
                        value={data.content.text || ''} 
                        onChange={(e) => handleChange('content.text', e.target.value)}
                        className="min-h-[100px] text-sm"
                      />
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
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Conteúdo (HTML)</Label>
                        <Textarea 
                          value={data.content.content || ''} 
                          onChange={(e) => handleChange('content.content', e.target.value)}
                          className="min-h-[100px]"
                        />
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
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tighter">Nota: Os menus são carregados automaticamente das configurações de "Menus" no admin.</p>
                      </div>
                    </div>
                  ) : null}
                </>
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
                </div>
              )}
            </TabsContent>

            <TabsContent value="style" className="mt-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cor Principal</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      className="w-10 h-10 p-1"
                      value={data.styles?.color || data.settings?.backgroundColor || "#000000"} 
                      onChange={(e) => type === 'widget' ? handleChange('styles.color', e.target.value) : handleChange('settings.backgroundColor', e.target.value)} 
                    />
                  </div>
                </div>

                {type === 'widget' && (
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
                )}
              </div>

              {type === 'section' && (
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
            </TabsContent>

            <TabsContent value="advanced" className="mt-0 space-y-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Espaçamento Interno (Padding)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[8px] font-bold">TOP</Label>
                    <Input 
                      type="number" 
                      value={data.settings?.padding?.top || data.styles?.padding?.top || 0} 
                      onChange={(e) => type === 'widget' ? handleChange('styles.padding.top', parseInt(e.target.value)) : handleChange('settings.padding.top', parseInt(e.target.value))} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[8px] font-bold">BOTTOM</Label>
                    <Input 
                      type="number" 
                      value={data.settings?.padding?.bottom || data.styles?.padding?.bottom || 0} 
                      onChange={(e) => type === 'widget' ? handleChange('styles.padding.bottom', parseInt(e.target.value)) : handleChange('settings.padding.bottom', parseInt(e.target.value))} 
                    />
                  </div>
                </div>
              </div>

              {type === 'widget' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Z-Index</Label>
                  <Input type="number" value={data.styles?.zIndex || 0} onChange={(e) => handleChange('styles.zIndex', parseInt(e.target.value))} />
                </div>
              )}
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
