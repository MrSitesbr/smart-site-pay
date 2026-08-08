
import { supabase } from "@/integrations/supabase/client";

export type PageSection = {
  id: string;
  page_id: string;
  section_key: string;
  content: any;
  order_index: number;
};

export const getPageContent = async (pageRoute: string) => {
  const { data, error } = await (supabase as any)
    .from('site_pages')
    .select('*, site_sections(*)')
    .eq('route', pageRoute)
    .single();
  
  if (error) {
    console.error(`Error fetching page ${pageRoute}:`, error);
    return null;
  }
  
  return data;
};

export const updateSectionContent = async (sectionId: string, content: any) => {
  const { data, error } = await (supabase as any)
    .from('site_sections')
    .update({ content })
    .eq('id', sectionId);
    
  if (error) throw error;
  return data;
};


