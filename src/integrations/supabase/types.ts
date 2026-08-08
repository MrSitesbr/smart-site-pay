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
          status: Database["public"]["Enums"]["reserva_status"]
          telefone: string
          tipo: Database["public"]["Enums"]["reserva_tipo"]
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
          status?: Database["public"]["Enums"]["reserva_status"]
          telefone: string
          tipo: Database["public"]["Enums"]["reserva_tipo"]
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
          status?: Database["public"]["Enums"]["reserva_status"]
          telefone?: string
          tipo?: Database["public"]["Enums"]["reserva_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          created_at: string
          id: string
          name: string
          route: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          route: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          route?: string
        }
        Relationships: []
      }
      site_sections: {
        Row: {
          content: Json
          created_at: string
          id: string
          order_index: number | null
          page_id: string | null
          section_key: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          order_index?: number | null
          page_id?: string | null
          section_key: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          order_index?: number | null
          page_id?: string | null
          section_key?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
