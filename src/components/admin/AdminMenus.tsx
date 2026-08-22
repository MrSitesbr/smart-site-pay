import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save, ExternalLink, ChevronDown, ChevronRight, List } from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  url: string;
  order_index: number;
  parent_id?: string | null;
  target: string;
  items?: MenuItem[];
}

interface Menu {
  id: string;
  name: string;
  slug: string;
}

export default function AdminMenus() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [pages, setPages] = useState<{ name: string; route: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMenus();
    fetchPages();
  }, []);

  const fetchMenus = async () => {
    const { data, error } = await supabase.from('navigation_menus').select('*').order('name');
    if (error) toast.error("Erro ao carregar menus");
    else setMenus(data || []);
  };

  const fetchPages = async () => {
    const { data, error } = await supabase.from('site_pages').select('name, route').order('name');
    if (error) toast.error("Erro ao carregar páginas");
    else setPages(data || []);
  };

  const fetchMenuItems = async (menuId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('navigation_items')
      .select('*')
      .eq('menu_id', menuId)
      .order('order_index');
    
    if (error) toast.error("Erro ao carregar itens do menu");
    else {
      // Organize hierarchy
      const items = (data || []).map(i => ({ ...i, target: i.target || '_self' }));
      const rootItems = items.filter(i => !i.parent_id);
      const withSub = rootItems.map(root => ({
        ...root,
        items: items.filter(i => i.parent_id === root.id)
      }));
      setMenuItems(withSub);
    }
    setLoading(false);
  };

  const handleSelectMenu = (menu: Menu) => {
    setSelectedMenu(menu);
    fetchMenuItems(menu.id);
  };

  const addItem = (parent_id: string | null = null) => {
    const newItem: MenuItem = {
      id: `temp-${Date.now()}`,
      label: 'Novo Item',
      url: '/',
      order_index: menuItems.length,
      parent_id,
      target: '_self'
    };

    if (!parent_id) {
      setMenuItems([...menuItems, newItem]);
    } else {
      setMenuItems(menuItems.map(item => {
        if (item.id === parent_id) {
          return { ...item, items: [...(item.items || []), newItem] };
        }
        return item;
      }));
    }
  };

  const removeItem = (id: string, parent_id?: string | null) => {
    if (!parent_id) {
      setMenuItems(menuItems.filter(i => i.id !== id));
    } else {
      setMenuItems(menuItems.map(item => {
        if (item.id === parent_id) {
          return { ...item, items: item.items?.filter(i => i.id !== id) };
        }
        return item;
      }));
    }
  };

  const updateItem = (id: string, patch: Partial<MenuItem>, parent_id?: string | null) => {
    if (!parent_id) {
      setMenuItems(menuItems.map(i => i.id === id ? { ...i, ...patch } : i));
    } else {
      setMenuItems(menuItems.map(item => {
        if (item.id === parent_id) {
          return { ...item, items: item.items?.map(i => i.id === id ? { ...i, ...patch } : i) };
        }
        return item;
      }));
    }
  };

  const saveMenu = async () => {
    if (!selectedMenu) return;
    setLoading(true);

    try {
      // Delete existing
      await supabase.from('navigation_items').delete().eq('menu_id', selectedMenu.id);

      // Insert fresh
      let idx = 0;
      for (const item of menuItems) {
        const { data: root, error: rootErr } = await supabase.from('navigation_items').insert({
          menu_id: selectedMenu.id,
          label: item.label,
          url: item.url,
          target: item.target,
          order_index: idx++
        }).select().single();

        if (rootErr) throw rootErr;

        if (item.items && item.items.length > 0) {
          let sIdx = 0;
          for (const sub of item.items) {
            await supabase.from('navigation_items').insert({
              menu_id: selectedMenu.id,
              parent_id: root.id,
              label: sub.label,
              url: sub.url,
              target: sub.target,
              order_index: sIdx++
            });
          }
        }
      }

      toast.success("Menu salvo com sucesso!");
      fetchMenuItems(selectedMenu.id);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar menu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black text-brand-blue-dark">Gestão de Menus</h2>
        <p className="text-muted-foreground font-medium">Configure a estrutura de navegação do Cabeçalho e Rodapé.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4 md:col-span-1 border-none shadow-sm h-fit">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <List className="w-4 h-4" /> Menus Disponíveis
          </h3>
          <div className="space-y-2">
            {menus.map(menu => (
              <Button
                key={menu.id}
                variant={selectedMenu?.id === menu.id ? "default" : "ghost"}
                className={`w-full justify-start font-bold ${selectedMenu?.id === menu.id ? 'bg-brand-orange text-white' : ''}`}
                onClick={() => handleSelectMenu(menu)}
              >
                {menu.name}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-6 md:col-span-3 border-none shadow-sm min-h-[500px]">
          {!selectedMenu ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <List className="w-8 h-8 opacity-20" />
              </div>
              <p>Selecione um menu para editar sua estrutura.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-xl font-black text-brand-blue-dark">{selectedMenu.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedMenu.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => addItem()} variant="outline" size="sm" className="font-bold border-brand-orange text-brand-orange">
                    <Plus className="w-4 h-4 mr-2" /> ADD ITEM
                  </Button>
                  <Button onClick={saveMenu} disabled={loading} className="bg-brand-blue-dark hover:bg-brand-blue-dark/90 text-white font-bold">
                    <Save className="w-4 h-4 mr-2" /> SALVAR ESTRUTURA
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {menuItems.map((item) => (
                  <div key={item.id} className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <Input 
                        value={item.label} 
                        onChange={(e) => updateItem(item.id, { label: e.target.value })}
                        placeholder="Nome do Link"
                        className="font-bold bg-white"
                      />
                      <Select 
                        value={item.url} 
                        onValueChange={(val) => updateItem(item.id, { url: val })}
                      >
                        <SelectTrigger className="w-[150px] bg-white">
                          <SelectValue placeholder="Selecione Link" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="#">(Nenhum / Submenu)</SelectItem>
                          {pages.map(p => (
                            <SelectItem key={p.route} value={p.route}>{p.name}</SelectItem>
                          ))}
                          <SelectItem value="external">Link Externo</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select 
                        value={item.target} 
                        onValueChange={(val) => updateItem(item.id, { target: val })}
                      >
                        <SelectTrigger className="w-[120px] bg-white">
                          <SelectValue placeholder="Janela" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_self">Mesma Aba</SelectItem>
                          <SelectItem value="_blank">Nova Aba</SelectItem>
                        </SelectContent>
                      </Select>
                      {item.url === 'external' && (
                        <Input 
                          placeholder="https://..." 
                          onChange={(e) => updateItem(item.id, { url: e.target.value })}
                          className="w-[200px] bg-white"
                        />
                      )}
                      <Button onClick={() => addItem(item.id)} variant="ghost" size="icon" title="Adicionar Submenu">
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => removeItem(item.id)} variant="ghost" size="icon" className="text-red-500 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Submenu items */}
                    {item.items && item.items.length > 0 && (
                      <div className="ml-12 mt-4 space-y-2 border-l-2 border-slate-200 pl-4">
                        {item.items.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-3">
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                            <Input 
                              value={sub.label} 
                              onChange={(e) => updateItem(sub.id, { label: e.target.value }, item.id)}
                              placeholder="Nome do Sub-link"
                              className="bg-white text-sm"
                            />
                            <Select 
                              value={sub.url} 
                              onValueChange={(val) => updateItem(sub.id, { url: val }, item.id)}
                            >
                              <SelectTrigger className="w-[140px] bg-white text-sm">
                                <SelectValue placeholder="Link" />
                              </SelectTrigger>
                              <SelectContent>
                                {pages.map(p => (
                                  <SelectItem key={p.route} value={p.route}>{p.name}</SelectItem>
                                ))}
                                <SelectItem value="external">Link Externo</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select 
                              value={sub.target} 
                              onValueChange={(val) => updateItem(sub.id, { target: val }, item.id)}
                            >
                              <SelectTrigger className="w-[110px] bg-white text-sm">
                                <SelectValue placeholder="Janela" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_self">Mesma Aba</SelectItem>
                                <SelectItem value="_blank">Nova Aba</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={() => removeItem(sub.id, item.id)} variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {menuItems.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                    Nenhum item adicionado a este menu.
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
