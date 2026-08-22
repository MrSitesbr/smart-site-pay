import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Mail, Lock } from "lucide-react";

export default function AdminSettings() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mistralKey, setMistralKey] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('site_sections')
      .select('content')
      .eq('section_key', 'global_settings')
      .single();
    
    if (data && data.content && typeof data.content === 'object') {
      const content = data.content as any;
      if (content.mistral_api_key) setMistralKey(content.mistral_api_key);
    }
  };

  const handleUpdateMistral = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('site_sections')
        .select('id, content')
        .eq('section_key', 'global_settings')
        .single();

      const newContent = existing?.content ? { ...(existing.content as any), mistral_api_key: mistralKey } : { mistral_api_key: mistralKey };

      if (existing) {
        await supabase
          .from('site_sections')
          .update({ content: newContent })
          .eq('id', existing.id);
      } else {
        // Busca uma página qualquer para vincular
        const { data: page } = await supabase.from('site_pages').select('id').limit(1).single();
        if (page) {
          await supabase.from('site_sections').insert({
            page_id: page.id,
            section_key: 'global_settings',
            content: newContent,
            order_index: 999
          });
        }
      }
      toast({ title: "Configurações salvas", description: "Chave da Mistral AI atualizada." });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      toast({
        title: "E-mail atualizado",
        description: "Um e-mail de confirmação foi enviado para o novo endereço.",
      });
      setEmail("");
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar e-mail",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-blue-dark">
              <Mail className="w-5 h-5" />
              Alterar E-mail
            </CardTitle>
            <CardDescription>
              Atualize o endereço de e-mail da conta administrativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Novo E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@coworking013.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-brand-blue-dark/10"
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || !email}
                className="w-full bg-brand-blue-dark hover:bg-brand-blue-dark/90 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Atualizar E-mail
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-blue-dark">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Defina uma nova senha segura para o painel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-brand-blue-dark/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-brand-blue-dark/10"
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading || !newPassword}
                className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Atualizar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
