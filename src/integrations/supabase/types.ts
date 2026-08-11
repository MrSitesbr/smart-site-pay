export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      client_colors: {
        Row: {
          color: string
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          email: string
          id?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes_corp: {
        Row: {
          cnpj: string | null
          created_at: string
          documentos: string[] | null
          id: string
          plano_id: string | null
          razao_social: string
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          unidade_id: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          documentos?: string[] | null
          id?: string
          plano_id?: string | null
          razao_social: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          unidade_id?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          documentos?: string[] | null
          id?: string
          plano_id?: string | null
          razao_social?: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_corp_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_corp_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_requests: {
        Row: {
          admin_notes: string | null
          ambiente: Database["public"]["Enums"]["ambiente_tipo"]
          created_at: string
          data_inicio: string | null
          dias_selecionados: Json
          email: string
          google_event_id: string | null
          id: string
          nicho: string | null
          nome: string
          observacoes: string | null
          origem: string
          payment_link: string | null
          pix_codigo: string | null
          plano_tipo: string
          preco: number
          status: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          ambiente: Database["public"]["Enums"]["ambiente_tipo"]
          created_at?: string
          data_inicio?: string | null
          dias_selecionados?: Json
          email: string
          google_event_id?: string | null
          id?: string
          nicho?: string | null
          nome: string
          observacoes?: string | null
          origem?: string
          payment_link?: string | null
          pix_codigo?: string | null
          plano_tipo: string
          preco: number
          status?: string
          telefone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          ambiente?: Database["public"]["Enums"]["ambiente_tipo"]
          created_at?: string
          data_inicio?: string | null
          dias_selecionados?: Json
          email?: string
          google_event_id?: string | null
          id?: string
          nicho?: string | null
          nome?: string
          observacoes?: string | null
          origem?: string
          payment_link?: string | null
          pix_codigo?: string | null
          plano_tipo?: string
          preco?: number
          status?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contratos_ativos: {
        Row: {
          automatic_renewal: boolean | null
          cliente_corp_id: string | null
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          sala_id: string | null
          status: string | null
          tipo_locacao: string | null
          valor_mensal: number | null
        }
        Insert: {
          automatic_renewal?: boolean | null
          cliente_corp_id?: string | null
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          sala_id?: string | null
          status?: string | null
          tipo_locacao?: string | null
          valor_mensal?: number | null
        }
        Update: {
          automatic_renewal?: boolean | null
          cliente_corp_id?: string | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          sala_id?: string | null
          status?: string | null
          tipo_locacao?: string | null
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_ativos_cliente_corp_id_fkey"
            columns: ["cliente_corp_id"]
            isOneToOne: false
            referencedRelation: "clientes_corp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_ativos_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios_cliente: {
        Row: {
          cargo: string | null
          cliente_corp_id: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          cliente_corp_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          cliente_corp_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_cliente_cliente_corp_id_fkey"
            columns: ["cliente_corp_id"]
            isOneToOne: false
            referencedRelation: "clientes_corp"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_unidades: {
        Row: {
          created_at: string
          id: string
          plano_id: string
          unidade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plano_id: string
          unidade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plano_id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_unidades_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_unidades_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco: number
          quantidade_horas: number
          unidade_id: string | null
          validade_dias: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco: number
          quantidade_horas: number
          unidade_id?: string | null
          validade_dias?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco?: number
          quantidade_horas?: number
          unidade_id?: string | null
          validade_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          ambiente: Database["public"]["Enums"]["ambiente_tipo"]
          created_at: string
          data: string
          email: string
          google_calendar_id: string | null
          google_event_id: string | null
          hora_fim: string
          hora_inicio: string
          id: string
          nome: string
          observacoes: string | null
          origem: string
          sala_id: string | null
          status: Database["public"]["Enums"]["reserva_status"]
          telefone: string
          tipo: Database["public"]["Enums"]["reserva_tipo"]
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          ambiente: Database["public"]["Enums"]["ambiente_tipo"]
          created_at?: string
          data: string
          email: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          hora_fim: string
          hora_inicio: string
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string
          sala_id?: string | null
          status?: Database["public"]["Enums"]["reserva_status"]
          telefone: string
          tipo: Database["public"]["Enums"]["reserva_tipo"]
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          ambiente?: Database["public"]["Enums"]["ambiente_tipo"]
          created_at?: string
          data?: string
          email?: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string
          sala_id?: string | null
          status?: Database["public"]["Enums"]["reserva_status"]
          telefone?: string
          tipo?: Database["public"]["Enums"]["reserva_tipo"]
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      sala_planos: {
        Row: {
          plano_id: string
          sala_id: string
        }
        Insert: {
          plano_id: string
          sala_id: string
        }
        Update: {
          plano_id?: string
          sala_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sala_planos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sala_planos_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      salas: {
        Row: {
          capacidade: number | null
          created_at: string
          descricao: string | null
          foto_url: string | null
          galeria: string[] | null
          id: string
          nome: string
          tipo: string
          unidade_id: string | null
        }
        Insert: {
          capacidade?: number | null
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          galeria?: string[] | null
          id?: string
          nome: string
          tipo: string
          unidade_id?: string | null
        }
        Update: {
          capacidade?: number | null
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          galeria?: string[] | null
          id?: string
          nome?: string
          tipo?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          categoria: string | null
          created_at: string | null
          icon: string | null
          id: string
          nome: string
          preco: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          nome: string
          preco?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          nome?: string
          preco?: string | null
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          created_at: string
          id: string
          is_global: boolean | null
          name: string
          route: string
          unidade_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean | null
          name: string
          route: string
          unidade_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean | null
          name?: string
          route?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_pages_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      site_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_visible: boolean | null
          order_index: number | null
          page_id: string | null
          section_key: string
          settings: Json | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean | null
          order_index?: number | null
          page_id?: string | null
          section_key: string
          settings?: Json | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean | null
          order_index?: number | null
          page_id?: string | null
          section_key?: string
          settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "site_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          created_at: string
          descricao: string | null
          endereco: string | null
          foto_url: string | null
          galeria: string[] | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          endereco?: string | null
          foto_url?: string | null
          galeria?: string[] | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          endereco?: string | null
          foto_url?: string | null
          galeria?: string[] | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitantes: {
        Row: {
          cliente_corp_id: string | null
          created_at: string
          data_hora_prevista: string
          documento: string | null
          id: string
          nome: string
          observacoes: string | null
          sala_id: string | null
        }
        Insert: {
          cliente_corp_id?: string | null
          created_at?: string
          data_hora_prevista: string
          documento?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          sala_id?: string | null
        }
        Update: {
          cliente_corp_id?: string | null
          created_at?: string
          data_hora_prevista?: string
          documento?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          sala_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitantes_cliente_corp_id_fkey"
            columns: ["cliente_corp_id"]
            isOneToOne: false
            referencedRelation: "clientes_corp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitantes_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      woba_closings: {
        Row: {
          ano: number
          created_at: string
          data_pagamento: string | null
          data_prevista: string | null
          id: string
          mes: number
          nivel_repasse: number
          observacoes: string | null
          qtd_reservas: number
          status: string
          updated_at: string
          valor_repasse: number
          valor_total: number
        }
        Insert: {
          ano: number
          created_at?: string
          data_pagamento?: string | null
          data_prevista?: string | null
          id?: string
          mes: number
          nivel_repasse?: number
          observacoes?: string | null
          qtd_reservas?: number
          status?: string
          updated_at?: string
          valor_repasse?: number
          valor_total?: number
        }
        Update: {
          ano?: number
          created_at?: string
          data_pagamento?: string | null
          data_prevista?: string | null
          id?: string
          mes?: number
          nivel_repasse?: number
          observacoes?: string | null
          qtd_reservas?: number
          status?: string
          updated_at?: string
          valor_repasse?: number
          valor_total?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ambiente_tipo: "estacao" | "sala_privativa" | "sala_reuniao"
      app_role: "admin" | "user"
      reserva_status: "pendente" | "confirmada" | "realizada" | "cancelada"
      reserva_tipo: "hora" | "diaria"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ambiente_tipo: ["estacao", "sala_privativa", "sala_reuniao"],
      app_role: ["admin", "user"],
      reserva_status: ["pendente", "confirmada", "realizada", "cancelada"],
      reserva_tipo: ["hora", "diaria"],
    },
  },
} as const
