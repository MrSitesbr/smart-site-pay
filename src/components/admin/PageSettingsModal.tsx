import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Maximize2, Layout } from "lucide-react";
import { SectionData } from "@/types/page-builder";

interface PageSettingsModalProps {
  layout: SectionData[];
  onUpdateLayout: (newLayout: SectionData[]) => void;
  trigger?: React.ReactNode;
}

export const PageSettingsModal: React.FC<PageSettingsModalProps> = ({ 
  layout, 
  onUpdateLayout,
  trigger 
}) => {
  // We use the first section as a proxy for "page" width settings 
  // since our architecture is section-based, but often users want global control.
  // Alternatively, we apply to ALL sections.
  
  const handleGlobalWidthChange = (type: 'boxed' | 'full', width?: number) => {
    const newLayout = layout.map(section => ({
      ...section,
      settings: {
        ...section.settings,
        layoutType: type,
        fullWidth: type === 'full',
        maxWidth: type === 'full' ? undefined : (width || section.settings.maxWidth || 1400)
      }
    }));
    onUpdateLayout(newLayout);
  };

  const currentType = layout[0]?.settings?.layoutType || (layout[0]?.settings?.fullWidth ? 'full' : 'boxed');
  const currentWidth = layout[0]?.settings?.maxWidth || 1400;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Configurações da Página">
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-brand-orange" />
            Configurações de Largura da Página
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">Largura do Conteúdo (Global)</Label>
            <Select 
              value={currentType} 
              onValueChange={(v: 'boxed' | 'full') => handleGlobalWidthChange(v, currentWidth)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boxed">Boxed (Caixa Centralizada)</SelectItem>
                <SelectItem value="full">Full Width (Largura Total)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground italic">
              * Isso aplicará a configuração a todas as seções da página.
            </p>
          </div>

          {currentType === 'boxed' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label className="text-xs font-bold uppercase tracking-wider">Largura Máxima (px)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  value={currentWidth} 
                  onChange={(e) => handleGlobalWidthChange('boxed', parseInt(e.target.value))}
                />
                <span className="text-sm font-medium text-muted-foreground">px</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
