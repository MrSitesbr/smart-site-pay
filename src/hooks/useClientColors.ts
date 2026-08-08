import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ColorOverrides } from "@/lib/clientColors";

export function useClientColors() {
  const [overrides, setOverrides] = useState<ColorOverrides>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("client_colors").select("email,color");
    if (!error && data) {
      const map: ColorOverrides = {};
      data.forEach((row: any) => { map[row.email.toLowerCase()] = row.color; });
      setOverrides(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setColor = useCallback(async (email: string, color: string) => {
    const key = email.toLowerCase();
    setOverrides((prev) => ({ ...prev, [key]: color }));
    const { error } = await supabase
      .from("client_colors")
      .upsert({ email: key, color }, { onConflict: "email" });
    if (error) console.error("setColor", error);
  }, []);

  const clearColor = useCallback(async (email: string) => {
    const key = email.toLowerCase();
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    await supabase.from("client_colors").delete().eq("email", key);
  }, []);

  return { overrides, loading, setColor, clearColor, reload: load };
}
