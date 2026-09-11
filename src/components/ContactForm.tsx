import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

export const ContactForm = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    mensagem: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('contract_requests')
        .insert([{
          nome: form.nome,
          email: form.email,
          telefone: form.telefone,
          observacoes: form.mensagem,
          status: 'pendente',
          origem: 'Formulário de Contato Site',
          ambiente: 'estacao', // Fallback required by enum
          plano_tipo: 'contato',
          preco: 0,
          user_id: (await supabase.auth.getUser()).data.user?.id || null
        }]);

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Em breve nossa equipe entrará em contato.",
      });

      setForm({ nome: '', email: '', telefone: '', mensagem: '' });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome Completo</Label>
        <Input 
          id="nome" 
          required 
          value={form.nome} 
          onChange={e => setForm({...form, nome: e.target.value})}
          placeholder="Seu nome"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input 
            id="email" 
            type="email" 
            required 
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})}
            placeholder="seu@email.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">WhatsApp</Label>
          <Input 
            id="telefone" 
            required 
            value={form.telefone} 
            onChange={e => setForm({...form, telefone: e.target.value})}
            placeholder="(13) 99999-9999"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mensagem">Como podemos ajudar?</Label>
        <Textarea 
          id="mensagem" 
          required 
          value={form.mensagem} 
          onChange={e => setForm({...form, mensagem: e.target.value})}
          placeholder="Conte-nos um pouco sobre sua necessidade..."
          rows={4}
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-6 rounded-xl"
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
        ENVIAR MENSAGEM
      </Button>
    </form>
  );
};
