import React from 'react';
import { SectionData, WidgetData, ColumnData } from '@/types/page-builder';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Mail, Phone, ArrowRight, Building2, CreditCard, Armchair, MessageSquare, Layout as LayoutIcon, Check, Star, HelpCircle, MapPin, Calendar, Clock, Info, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UnitsWidget, PlansWidget, RoomsWidget, GlobalHeaderWidget, GlobalFooterWidget } from "./admin/layout/CoworkingWidgets";
import { ContactForm } from "./ContactForm";
import ReservaDialog from "./ReservaDialog";
import BlogHighlights from "./BlogHighlights";
import DOMPurify from "dompurify";

const LUCIDE_ICONS: Record<string, any> = {
  Check, Star, HelpCircle, MapPin, Calendar, Clock, Info, User, Mail, Phone, ArrowRight, Building2, CreditCard, Armchair, MessageSquare, Layout: LayoutIcon
};

interface PageRendererProps {
  layout: SectionData[];
  isAdmin?: boolean;
  onElementClick?: (type: 'section' | 'column' | 'widget', id: string, data: any) => void;
  activeDragId?: string | null;
  dropIndicator?: { position: 'before' | 'after' | 'inside'; targetId: string } | null;
}


export const PageRenderer: React.FC<PageRendererProps> = ({ layout, isAdmin, onElementClick, activeDragId, dropIndicator }) => {
  if (!layout || !Array.isArray(layout)) return null;

  return (
    <div className={`w-full overflow-x-hidden ${isAdmin ? 'min-h-[500px] pb-32' : ''}`}>
      {layout.filter(Boolean).map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          isAdmin={isAdmin}
          onElementClick={onElementClick}
          activeDragId={activeDragId}
          dropIndicator={dropIndicator}
          />
      ))}

      {isAdmin && layout.length > 0 && activeDragId && (
        <div className="py-10 flex justify-center">
          <div className="w-full max-w-4xl border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors group">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-brand-orange" />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Arraste uma nova seção aqui</p>
          </div>
        </div>
      )}
    </div>
  );
};

const SectionRenderer: React.FC<{
  section: SectionData;
  isAdmin?: boolean;
  onElementClick?: PageRendererProps['onElementClick'];
  activeDragId?: string | null;
  dropIndicator?: PageRendererProps['dropIndicator'];
}> = ({ section, isAdmin, onElementClick, activeDragId, dropIndicator }) => {
  const settings = section?.settings || {};
  const columns = Array.isArray(section?.columns) ? section.columns : [];
  
  const sectionStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundColor,
    backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : undefined,
    backgroundSize: settings.backgroundSize || 'cover',
    backgroundPosition: settings.backgroundPosition || 'center',
    backgroundAttachment: settings.backgroundAttachment || 'scroll',
    backgroundRepeat: settings.backgroundRepeat || 'no-repeat',
    paddingTop: settings.padding?.top ? `${settings.padding.top}px` : undefined,
    paddingBottom: settings.padding?.bottom ? `${settings.padding.bottom}px` : undefined,
    paddingLeft: settings.padding?.left ? `${settings.padding.left}px` : undefined,
    paddingRight: settings.padding?.right ? `${settings.padding.right}px` : undefined,
    marginTop: settings.margin?.top ? `${settings.margin.top}px` : undefined,
    marginBottom: settings.margin?.bottom ? `${settings.margin.bottom}px` : undefined,
    position: 'relative',
    zIndex: settings.zIndex,
    background: settings.backgroundType === 'gradient' ? settings.backgroundGradient : (settings.backgroundType === 'color' ? settings.backgroundColor : undefined),
  };

  // Ensure background color is applied even if backgroundType is 'color' (compatibility fix)
  if ((settings.backgroundType === 'color' || settings.backgroundType === 'classic' || !settings.backgroundType) && settings.backgroundColor) {
    sectionStyle.backgroundColor = settings.backgroundColor;
    // Force background color to show by ensuring no other conflicting styles if only color is intended
    if (settings.backgroundType === 'color' || (settings.backgroundType === 'classic' && !settings.backgroundImage)) {
      sectionStyle.backgroundImage = 'none';
      sectionStyle.background = settings.backgroundColor; // Force via background shorthand too
    }
  }
  
  // Also ensure classic type respects image
  if ((settings.backgroundType === 'classic' || !settings.backgroundType) && settings.backgroundImage) {
    sectionStyle.backgroundImage = `url(${settings.backgroundImage})`;
    sectionStyle.background = undefined; // Clear gradient if image is present
  }

  const getShapeDivider = () => {
    if (!settings.shapeDivider || settings.shapeDivider === 'none') return null;
    
    const shapes: Record<string, React.ReactNode> = {
      tilt: (
        <svg className="absolute bottom-0 left-0 w-full h-[100px] overflow-hidden leading-none z-10" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M1200 120L0 120 0 0z" fill={settings.backgroundColor || "#ffffff"} fillOpacity="0.1" />
        </svg>
      ),
      curve: (
        <svg className="absolute bottom-0 left-0 w-full h-[100px] overflow-hidden leading-none z-10" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M600 112.7L1200 8L1200 120L0 120L0 8L600 112.7Z" fill={settings.backgroundColor || "#ffffff"} fillOpacity="0.1" />
        </svg>
      )
    };

    return shapes[settings.shapeDivider];
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
      style={{
        ...sectionStyle, 
        width: '100%', 
      }} 
      className={`relative ${isAdmin ? 'hover:outline hover:outline-2 hover:outline-brand-orange cursor-pointer group/section' : ''} ${settings.animation && settings.animation !== 'none' ? `animate-${settings.animation}` : ''} ${settings.hideMobile ? 'hidden md:block' : ''}`}
      onClick={(e) => {
        if (isAdmin && onElementClick) {
          e.stopPropagation();
          onElementClick('section', section.id, section);
        }
      }}
    >
      {settings.backgroundType === 'video' && settings.backgroundVideoUrl && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="pointer-events-none absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover"
          >
            <source src="/assets/videoplayback.mp4" type="video/mp4" />
          </video>
        </div>
      )}
      {(settings.backgroundImage || (settings.backgroundType === 'video' && settings.backgroundVideoUrl)) && <div style={{ ...overlayStyle, zIndex: 1 }} />}
      {getShapeDivider()}
      
      <div className={`page-builder-columns relative z-10 w-full grid gap-4 grid-cols-1 ${settings.layoutType === 'full' || settings.fullWidth ? '' : 'px-4'}`}
           style={{
             '--page-columns': columns.length > 1 ? columns.map(c => `${c?.widthPercentage || (100 / columns.length)}%`).join(' ') : '1fr',
             width: '100%',
             maxWidth: (settings.layoutType === 'full' || settings.fullWidth) ? 'none' : (settings.maxWidth ? `${settings.maxWidth}px` : '1400px'),
             marginLeft: 'auto',
             marginRight: 'auto'
           } as React.CSSProperties}>
        {columns.filter(Boolean).map((column) => (
          <ColumnRenderer 
            key={column.id} 
            column={column} 
            isAdmin={isAdmin} 
            onElementClick={onElementClick}
            isOver={isAdmin && activeDragId ? (dropIndicator?.targetId === column.id || (dropIndicator?.targetId === section.id && dropIndicator?.position === 'inside')) : false}
            activeDragId={activeDragId}
            dropIndicator={dropIndicator}
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
  isOver?: boolean;
  activeDragId?: string | null;
  dropIndicator?: PageRendererProps['dropIndicator'];
}> = ({ column, isAdmin, onElementClick, isOver, activeDragId, dropIndicator }) => {
  const settings = column?.settings || {};
  const widgets = Array.isArray(column?.widgets) ? column.widgets : [];
  
  const columnStyle: React.CSSProperties = {
    backgroundColor: settings.backgroundColor,
    paddingTop: settings.padding?.top ? `${settings.padding.top}px` : undefined,
    paddingBottom: settings.padding?.bottom ? `${settings.padding.bottom}px` : undefined,
    paddingLeft: settings.padding?.left ? `${settings.padding.left}px` : undefined,
    paddingRight: settings.padding?.right ? `${settings.padding.right}px` : undefined,
    border: settings.borderWidth ? `${settings.borderWidth}px solid ${settings.borderColor || '#eee'}` : undefined,
    borderRadius: settings.borderRadius ? `${settings.borderRadius}px` : undefined,
  };

  return (
    <div 
      style={columnStyle}
      className={`relative flex flex-col gap-4 transition-all duration-200 ${isAdmin ? 'hover:outline hover:outline-2 hover:outline-blue-500 cursor-pointer group/column p-2 min-h-[50px]' : ''} ${isOver ? 'bg-blue-500/5 ring-2 ring-blue-500 ring-inset' : ''}`}
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
          isOver={isAdmin && activeDragId ? (dropIndicator?.targetId === widget.id) : false}
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
  isOver?: boolean;
}> = ({ widget, isAdmin, onElementClick, isOver }) => {
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
    paddingLeft: styles.padding?.left ? `${styles.padding.left}px` : undefined,
    paddingRight: styles.padding?.right ? `${styles.padding.right}px` : undefined,
    borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : undefined,
    textShadow: styles.textShadow,
    zIndex: styles.zIndex,
    animation: (styles.animation && styles.animation !== 'none') ? `${styles.animation} 0.8s ease-out forwards` : undefined,
  };

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'heading':
        const Tag = (content.level || 'h2') as keyof JSX.IntrinsicElements;
        return <Tag style={widgetStyle} className="font-heading font-bold" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.text || '') }} />;
      
      case 'text':
        return <div style={widgetStyle} className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.text || '') }} />;
      
      case 'image':
        return (
          <img 
            src={content.url || content.image} 
            alt={content.alt || ''} 
            className="w-full h-auto" 
            style={{ borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : undefined }} 
          />
        );

      case 'video': {
        const videoUrl = content.url || content.videoUrl;
        const youtubeId = videoUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&/]+)/)?.[1];

        if (!videoUrl) return null;

        return youtubeId ? (
          <div className="aspect-video w-full overflow-hidden rounded-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title={content.title || 'Vídeo'}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <video src={videoUrl} controls className="h-auto w-full rounded-2xl" />
        );
      }
      
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
                <h3 className="text-xl font-bold mb-4">{content.title || 'Solicitar Reserva'}</h3>
                <div className="flex flex-col gap-4">
                   <p className="text-sm opacity-80">Selecione o melhor dia e horário para seu coworking.</p>
                   <ReservaDialogWrapper buttonText={content.buttonText || "Abrir Calendário"} />
                </div>
              </div>
            ) : (
              <div className="text-white">
                <h3 className="text-xl font-bold mb-6">{content.title || 'Fale Conosco'}</h3>
                <ContactForm />
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

      case 'popup':
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button style={widgetStyle} className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold rounded-full px-8 py-3">
                {content.triggerText || "Abrir"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-brand-blue-dark uppercase tracking-tight">
                  {content.title}
                </DialogTitle>
              </DialogHeader>
              <div className="py-6 font-medium text-muted-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.content || '') }} />
              {content.actionType && content.actionType !== 'none' && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    className="bg-brand-blue-dark text-white font-bold"
                    onClick={() => {
                      if (content.actionType === 'login') window.location.href = '/auth';
                      if (content.actionType === 'register') window.location.href = '/auth?signup=true';
                      if (content.actionType === 'whatsapp') window.open('https://wa.me/5513992037957', '_blank');
                    }}
                  >
                    {content.actionType === 'login' ? 'Entrar Agora' : 
                     content.actionType === 'register' ? 'Criar Conta' : 'Falar no WhatsApp'}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        );

      case 'hero':
        const heroVideoUrl = content.backgroundVideoUrl;
        const heroVideoId = heroVideoUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&/]+)/)?.[1];
        return (
          <div className="relative w-full min-h-[500px] lg:min-h-[650px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-blue-dark via-brand-blue-dark to-brand-blue-dark/90">
            {/* Background Video */}
            {heroVideoId ? (
              <>
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="pointer-events-none absolute inset-0 w-full h-full object-cover z-0"
                >
                  <source src="/assets/videoplayback.mp4" type="video/mp4" />
                  Seu navegador não suporta vídeos em HTML5.
                </video>
                {/* Dark overlay for text contrast */}
                <div className="absolute inset-0 z-[1] bg-black/45 pointer-events-none" />
              </>
            ) : content.image ? (
              <>
                <img 
                  src={content.image} 
                  className="absolute inset-0 w-full h-full object-cover"
                  alt="" 
                />
                <div className="absolute inset-0 bg-black/50 pointer-events-none" />
              </>
            ) : null}

            {/* Content Container */}
            <div className="relative z-10 w-full">
              <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12 py-16 lg:py-20">
                <div className={`grid gap-8 lg:gap-16 items-center ${content.desktopColumns !== false ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                  
                  {/* Left: Text Content */}
                  <div className="flex flex-col justify-center space-y-4 sm:space-y-6">
                    {/* Eyebrow */}
                    <div className="inline-flex items-center w-max gap-3">
                      <div className="h-1 w-10 bg-brand-orange rounded-full" />
                      <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">
                        Solução Coworking
                      </span>
                    </div>

                    {/* Title - Reduced and moderate weight */}
                    <h1 
                      className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-snug tracking-tight"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.title || '') }}
                    />

                    {/* Subtitle */}
                    <p 
                      className="text-base sm:text-lg text-white/80 leading-relaxed max-w-md font-normal"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.subtitle || '') }}
                    />
                  </div>

                  {/* Right: CTA Card */}
                  {content.cta && content.desktopColumns !== false && (
                    <div className="flex items-center justify-center lg:justify-center">
                      <div className="w-full sm:w-72 p-6 sm:p-8 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-3">Próximo passo</p>
                        <h3 className="text-xl font-bold text-white mb-5">Solicitar reserva</h3>
                        <a 
                          href={content.ctaUrl || '/reservar'} 
                          className="block w-full px-5 py-2.5 bg-brand-orange text-white font-bold text-sm rounded-lg hover:bg-brand-orange/90 transition-colors text-center"
                        >
                          Consultar
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile CTA */}
            {content.cta && content.desktopColumns === false && (
              <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/80 to-transparent">
                <a 
                  href={content.ctaUrl || '/reservar'} 
                  className="block w-full px-5 py-3 bg-brand-orange text-white font-bold text-center rounded-lg hover:bg-brand-orange/90 transition-colors"
                >
                  {content.cta}
                </a>
              </div>
            )}
          </div>
        );

      case 'features':
        return (
          <div className="py-20 bg-white">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-black text-brand-blue-dark mb-12 text-center uppercase tracking-tighter">{content.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {content.items?.map((item: any, i: number) => (
                  <div key={i} className="p-8 rounded-3xl bg-brand-gray/30 border border-brand-gray/50 hover:shadow-xl transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-brand-orange flex items-center justify-center text-white mb-6">
                      <LayoutIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-brand-blue-dark mb-4">{item.title}</h3>
                    <p className="text-muted-foreground font-medium">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'ideal_para':
        return (
          <div className="py-20 bg-brand-gray/20">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-black text-brand-blue-dark mb-12 text-center uppercase tracking-tighter">{content.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {content.services?.map((service: any, i: number) => (
                  <div key={i} className="group relative h-80 rounded-3xl overflow-hidden shadow-2xl">
                    <img src={service.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={service.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-blue-dark via-transparent to-transparent opacity-90" />
                    <div className="absolute bottom-0 left-0 p-8 text-white">
                      <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">{service.title}</h3>
                      <p className="text-white/80 font-medium">{service.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'global_footer':
        return <GlobalFooterWidget content={content} styles={styles} />;

      case 'inner_section':
        return (
          <div className="grid gap-4" style={{ gridTemplateColumns: (content.columns || []).map((c: any) => `${c.widthPercentage}%`).join(' ') }}>
            {(content.columns || []).map((col: any) => (
              <div key={col.id} className="flex flex-col gap-4">
                {(col.widgets || []).map((w: any) => (
                  <WidgetRenderer 
                    key={w.id} 
                    widget={w} 
                    isAdmin={isAdmin} 
                    onElementClick={onElementClick} 
                  />
                ))}
              </div>
            ))}
          </div>
        );
      
      case 'icon_box':
        const IconComponent = LUCIDE_ICONS[content.icon || 'Check'] || LUCIDE_ICONS.Info;
        return (
          <div style={widgetStyle} className="flex flex-col items-center p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-brand-orange transition-all group">
            <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-4 group-hover:scale-110 transition-transform">
              <IconComponent className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-brand-blue-dark mb-2 uppercase tracking-tight">{content.title}</h4>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">{content.description}</p>
          </div>
        );
      case 'icon_list':
        return (
          <ul style={widgetStyle} className="space-y-3">
            {(content.items || []).map((item: any, idx: number) => {
              const ItemIcon = LUCIDE_ICONS[item.icon || 'Check'] || LUCIDE_ICONS.Check;
              return (
                <li key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="text-brand-orange"><ItemIcon className="w-4 h-4" /></span>
                  {item.text}
                </li>
              );
            })}
          </ul>
        );
      
      case 'social_icons':
        return (
          <div style={{ ...widgetStyle, justifyContent: styles.alignment === 'center' ? 'center' : styles.alignment === 'right' ? 'flex-end' : 'flex-start' }} className="flex gap-4">
            {(content.platforms || []).map((p: any, idx: number) => {
              // Note: Facebook/Instagram/Linkedin are not in Lucide 0.447.0
              // Fallback to Info or generic icon if not found
              const PlatformIcon = LUCIDE_ICONS[p.icon] || LUCIDE_ICONS.Info;
              return (
                <a key={idx} href={p.url} className="text-muted-foreground hover:text-brand-orange transition-colors">
                  <PlatformIcon size={styles.iconSize || 24} />
                </a>
              );
            })}
          </div>
        );

      case 'testimonials':
        return (
          <div style={widgetStyle} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(content.items || []).map((item: any, idx: number) => (
              <div key={idx} className="p-6 bg-white/5 rounded-2xl border border-white/10 italic text-sm text-muted-foreground">
                <div className="flex gap-1 mb-4 text-brand-orange">
                  {[...Array(item.rating || 5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                </div>
                <p className="mb-4">"{item.text}"</p>
                <div className="font-bold text-brand-blue-dark not-italic">{item.name}</div>
                <div className="text-[10px] uppercase tracking-widest opacity-50 not-italic">{item.role}</div>
              </div>
            ))}
          </div>
        );

      case 'accordion':
        return (
          <div style={widgetStyle} className="space-y-2">
            {(content.items || []).map((item: any, idx: number) => (
              <details key={idx} className="group bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <summary className="p-4 cursor-pointer font-bold text-sm text-brand-blue-dark flex justify-between items-center list-none">
                  {item.title}
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="p-4 pt-0 text-sm text-muted-foreground leading-relaxed">
                  {item.content}
                </div>
              </details>
            ))}
          </div>
        );

      case 'blog_articles':
        return <BlogHighlights content={content} />;

      default:
        return <div className="p-4 bg-muted text-xs italic">Widget: {widget.type}</div>;
    }
  };

  return (
    <div 
      className={`relative transition-all duration-200 ${isAdmin ? 'hover:outline hover:outline-1 hover:outline-brand-orange cursor-pointer group/widget p-1' : ''} ${isOver ? 'bg-brand-orange/5 ring-1 ring-brand-orange' : ''}`}
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

const ReservaDialogWrapper: React.FC<{ buttonText: string }> = ({ buttonText }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button 
        onClick={() => setOpen(true)}
        className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-6 rounded-xl"
      >
        {buttonText}
      </Button>
      <ReservaDialog open={open} onOpenChange={setOpen} />
    </>
  );
};
