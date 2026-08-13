import React from 'react';
import { SectionData, WidgetData, ColumnData } from '@/types/page-builder';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, ArrowRight, Building2, CreditCard, Armchair } from "lucide-react";
import { UnitsWidget, PlansWidget, RoomsWidget } from "./admin/layout/CoworkingWidgets";

interface PageRendererProps {
  layout: SectionData[];
  isAdmin?: boolean;
  onElementClick?: (type: 'section' | 'column' | 'widget', id: string, data: any) => void;
}


export const PageRenderer: React.FC<PageRendererProps> = ({ layout, isAdmin, onElementClick }) => {
  if (!layout || !Array.isArray(layout)) return null;

  return (
    <div className="w-full overflow-x-hidden">
      {layout.filter(Boolean).map((section) => (
        <SectionRenderer 
          key={section.id} 
          section={section} 
          isAdmin={isAdmin} 
          onElementClick={onElementClick} 
        />
      ))}
    </div>
  );
};

const SectionRenderer: React.FC<{
  section: SectionData;
  isAdmin?: boolean;
  onElementClick?: PageRendererProps['onElementClick'];
}> = ({ section, isAdmin, onElementClick }) => {
  const settings = section?.settings || {};
  const columns = Array.isArray(section?.columns) ? section.columns : [];
  
  const sectionStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundColor,
    backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    paddingTop: settings.padding?.top ? `${settings.padding.top}px` : undefined,
    paddingBottom: settings.padding?.bottom ? `${settings.padding.bottom}px` : undefined,
    paddingLeft: settings.padding?.left ? `${settings.padding.left}px` : undefined,
    paddingRight: settings.padding?.right ? `${settings.padding.right}px` : undefined,
    marginTop: settings.margin?.top ? `${settings.margin.top}px` : undefined,
    marginBottom: settings.margin?.bottom ? `${settings.margin.bottom}px` : undefined,
    position: 'relative',
    zIndex: settings.zIndex,
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'black',
    opacity: settings.overlayOpacity ?? 0,
    pointerEvents: 'none',
  };

  return (
    <section 
      style={sectionStyle} 
      className={`relative ${settings.fullWidth ? 'w-full' : 'container mx-auto px-4'} ${isAdmin ? 'hover:outline hover:outline-2 hover:outline-brand-orange cursor-pointer group/section' : ''}`}
      onClick={(e) => {
        if (isAdmin && onElementClick) {
          e.stopPropagation();
          onElementClick('section', section.id, section);
        }
      }}
    >
      {settings.backgroundImage && <div style={overlayStyle} />}
      
      <div className={`relative z-10 grid gap-4 ${columns.length > 1 ? `grid-cols-1 md:grid-cols-${columns.length}` : 'grid-cols-1'}`}
           style={{ gridTemplateColumns: columns.length > 1 ? columns.map(c => `${c?.widthPercentage || (100 / columns.length)}%`).join(' ') : '1fr' }}>
        {columns.filter(Boolean).map((column) => (
          <ColumnRenderer 
            key={column.id} 
            column={column} 
            isAdmin={isAdmin} 
            onElementClick={onElementClick} 
          />
        ))}
      </div>
      
      {isAdmin && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-brand-orange text-white px-2 py-0.5 rounded-b text-[10px] font-bold opacity-0 group-hover/section:opacity-100 transition-opacity">
          SEÇÃO
        </div>
      )}
    </section>
  );
};

const ColumnRenderer: React.FC<{
  column: ColumnData;
  isAdmin?: boolean;
  onElementClick?: PageRendererProps['onElementClick'];
}> = ({ column, isAdmin, onElementClick }) => {
  const settings = column?.settings || {};
  const widgets = Array.isArray(column?.widgets) ? column.widgets : [];
  
  const columnStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundColor,
    paddingTop: settings.padding?.top ? `${settings.padding.top}px` : undefined,
    paddingBottom: settings.padding?.bottom ? `${settings.padding.bottom}px` : undefined,
    paddingLeft: settings.padding?.left ? `${settings.padding.left}px` : undefined,
    paddingRight: settings.padding?.right ? `${settings.padding.right}px` : undefined,
  };

  return (
    <div 
      style={columnStyle}
      className={`relative flex flex-col gap-4 ${isAdmin ? 'hover:outline hover:outline-2 hover:outline-blue-500 cursor-pointer group/column p-2' : ''}`}
      onClick={(e) => {
        if (isAdmin && onElementClick) {
          e.stopPropagation();
          onElementClick('column', column.id, column);
        }
      }}
    >
      {widgets.filter(Boolean).map((widget) => (
        <WidgetRenderer 
          key={widget.id} 
          widget={widget} 
          isAdmin={isAdmin} 
          onElementClick={onElementClick} 
        />
      ))}
      
      {isAdmin && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white px-2 py-0.5 text-[8px] font-bold opacity-0 group-hover/column:opacity-100 transition-opacity">
          COLUNA
        </div>
      )}
    </div>
  );
};

const WidgetRenderer: React.FC<{
  widget: WidgetData;
  isAdmin?: boolean;
  onElementClick?: PageRendererProps['onElementClick'];
}> = ({ widget, isAdmin, onElementClick }) => {
  const content = widget?.content || {};
  const styles = widget?.styles || {};
  
  const widgetStyle: React.CSSProperties = {
    color: styles.color,
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    textAlign: styles.alignment as any,
    marginTop: styles.margin?.top ? `${styles.margin.top}px` : undefined,
    marginBottom: styles.margin?.bottom ? `${styles.margin.bottom}px` : undefined,
    paddingTop: styles.padding?.top ? `${styles.padding.top}px` : undefined,
    paddingBottom: styles.padding?.bottom ? `${styles.padding.bottom}px` : undefined,
    borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : undefined,
  };

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'heading':
        const Tag = (content.level || 'h2') as keyof JSX.IntrinsicElements;
        return <Tag style={widgetStyle} className="font-heading font-bold" dangerouslySetInnerHTML={{ __html: content.text || '' }} />;
      
      case 'text':
        return <div style={widgetStyle} className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content.text || '' }} />;
      
      case 'image':
        return (
          <img 
            src={content.url} 
            alt={content.alt || ''} 
            className="w-full h-auto" 
            style={{ borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : undefined }} 
          />
        );
      
      case 'button':
        return (
          <div style={{ textAlign: styles.alignment as any }}>
            <a 
              href={content.url} 
              className="inline-block px-8 py-3 bg-brand-orange text-white font-bold rounded-full hover:bg-brand-orange/90 transition-colors"
              style={widgetStyle}
            >
              {content.text}
            </a>
          </div>
        );

      case 'form':
        return (
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl">
            {content.formType === 'reserva' ? (
              <div className="text-white">
                <h3 className="text-xl font-bold mb-4">Reserva de Espaço</h3>
                <p className="text-sm opacity-80 mb-6 italic">Funcionalidade de formulário modular</p>
                {/* Mock del formulario */}
                <div className="space-y-4">
                  <div className="h-10 bg-white/20 rounded-lg"></div>
                  <div className="h-10 bg-white/20 rounded-lg"></div>
                  <div className="h-12 bg-brand-orange rounded-lg"></div>
                </div>
              </div>
            ) : (
              <div className="text-white">
                <h3 className="text-xl font-bold mb-4">Contato</h3>
                <div className="space-y-4">
                  <div className="h-10 bg-white/20 rounded-lg"></div>
                  <div className="h-12 bg-brand-orange rounded-lg"></div>
                </div>
              </div>
            )}
          </div>
        );

      case 'spacer':
        return <div style={{ height: `${content.height || 20}px` }}></div>;

      case 'units_grid':
        return <UnitsWidget content={content} styles={styles} />;
      
      case 'plans_grid':
        return <PlansWidget content={content} styles={styles} />;
      
      case 'rooms_grid':
        return <RoomsWidget content={content} styles={styles} />;

      default:
        return <div className="p-4 bg-muted text-xs italic">Widget: {widget.type}</div>;
    }
  };

  return (
    <div 
      className={`relative ${isAdmin ? 'hover:outline hover:outline-1 hover:outline-brand-orange cursor-pointer group/widget p-1' : ''}`}
      onClick={(e) => {
        if (isAdmin && onElementClick) {
          e.stopPropagation();
          onElementClick('widget', widget.id, widget);
        }
      }}
    >
      {renderWidgetContent()}
      
      {isAdmin && (
        <div className="absolute -top-4 right-0 bg-brand-orange text-white px-1.5 py-0.5 text-[7px] font-bold opacity-0 group-hover/widget:opacity-100 transition-opacity">
          WIDGET: {widget.type.toUpperCase()}
        </div>
      )}
    </div>
  );
};
