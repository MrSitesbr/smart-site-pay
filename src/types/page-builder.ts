import React from 'react';

export type WidgetType = 
  | 'heading' 
  | 'text' 
  | 'image' 
  | 'button' 
  | 'form' 
  | 'gallery' 
  | 'container' 
  | 'video' 
  | 'map' 
  | 'spacer' 
  | 'units_grid' 
  | 'plans_grid' 
  | 'rooms_grid' 
  | 'popup' 
  | 'hero' 
  | 'features' 
  | 'ideal_para' 
  | 'global_header' 
  | 'global_footer' 
  | 'inner_section' 
  | 'icon_box'
  | 'icon_list'
  | 'social_icons'
  | 'testimonials'
  | 'accordion';

export interface WidgetData {
  id: string;
  type: WidgetType;
  content: any;
  styles: any;
  settings?: any;
}

export interface ColumnData {
  id: string;
  widthPercentage: number; // 1-100
  widgets: WidgetData[];
  settings: any;
}

export interface SectionData {
  id: string;
  columns: ColumnData[];
  settings: {
    fullWidth?: boolean;
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundType?: 'classic' | 'gradient' | 'video';
    backgroundGradient?: string;
    backgroundVideoUrl?: string;
    backgroundPosition?: 'center center' | 'center top' | 'center bottom' | 'left center' | 'left top' | 'left bottom' | 'right center' | 'right top' | 'right bottom';
    backgroundAttachment?: 'scroll' | 'fixed';
    backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
    backgroundSize?: 'cover' | 'contain' | 'auto';
    padding?: { top: number; bottom: number; left: number; right: number };
    margin?: { top: number; bottom: number };
    overlayOpacity?: number;
    textColor?: string;
    zIndex?: number;
    [key: string]: any;
  };
}

export interface PageLayoutJSON {
  sections: SectionData[];
}