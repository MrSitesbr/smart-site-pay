import React from 'react';

export type WidgetType = 'heading' | 'text' | 'image' | 'button' | 'form' | 'gallery' | 'container' | 'video' | 'map' | 'spacer';

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
