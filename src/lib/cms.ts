
import { supabase } from "@/integrations/supabase/client";

export type PageSection = {
  id: string;
  page_id: string;
  section_key: string;
  content: any;
  settings: any;
  order_index: number;
  is_visible: boolean;
};

export const getPageContent = async (pageRoute: string, unidadeId?: string) => {
  let query = (supabase as any)
    .from('site_pages')
    .select('*, site_sections(*)');
  
  if (unidadeId) {
    query = query.eq('unidade_id', unidadeId);
  } else {
    query = query.eq('route', pageRoute).is('unidade_id', null);
  }

  const { data, error } = await query.single();
  
  if (error) {
    console.error(`Error fetching page ${pageRoute}:`, error);
    return null;
  }
  
  return data;
};

export const updateSectionContent = async (sectionId: string, content: any, settings: any = {}, is_visible: boolean = true) => {
  const { data, error } = await (supabase as any)
    .from('site_sections')
    .update({ content, settings, is_visible })
    .eq('id', sectionId);
    
  if (error) throw error;
  return data;
};

export const getUnidades = async () => {
  const { data, error } = await supabase.from('unidades').select('*').order('nome');
  if (error) throw error;
  return data;
};

export const createPageForUnidade = async (name: string, route: string, unidadeId: string) => {
  const { data, error } = await (supabase as any)
    .from('site_pages')
    .insert({ name, route, unidade_id: unidadeId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const addSectionToPage = async (pageId: string, sectionKey: string, orderIndex: number) => {
  const { data, error } = await (supabase as any)
    .from('site_sections')
    .insert({ 
      page_id: pageId, 
      section_key: sectionKey, 
      order_index: orderIndex,
      content: {},
      settings: {}
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteSection = async (sectionId: string) => {
  const { error } = await (supabase as any)
    .from('site_sections')
    .delete()
    .eq('id', sectionId);
  if (error) throw error;
};

export const reorderSectionsInDb = async (sections: {id: string, order_index: number}[]) => {
  const { error } = await (supabase as any)
    .from('site_sections')
    .upsert(sections);
  if (error) throw error;
};


