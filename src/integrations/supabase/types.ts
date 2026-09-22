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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      checkins: {
        Row: {
          checked_in_at: string
          created_at: string
          id: string
          reservation_id: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          id?: string
          reservation_id: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          id?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cliente_documentos: {
        Row: {
          cliente_corp_id: string
          created_at: string
          descricao: string | null
          id: string
          mime_type: string | null
          nome: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          visivel_cliente: boolean
        }
        Insert: {
          cliente_corp_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          visivel_cliente?: boolean
        }
        Update: {
          cliente_corp_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          visivel_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cliente_documentos_cliente_corp_id_fkey"
            columns: ["cliente_corp_id"]
            isOneToOne: false
            referencedRelation: "clientes_corp"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_corp: {
        Row: {
          cnpj: string | null
          created_at: string
          deleted_at: string | null
          documentos: string[] | null
          id: string
          plano_id: string | null
          razao_social: string
          responsavel_cpf: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          sala_id: string | null
          status_acesso: string
          unidade_id: string | null
          user_id: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          documentos?: string[] | null
          id?: string
          plano_id?: string | null
          razao_social: string
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          sala_id?: string | null
          status_acesso?: string
          unidade_id?: string | null
          user_id?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          deleted_at?: string | null
          documentos?: string[] | null
          id?: string
          plano_id?: string | null
          razao_social?: string
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          sala_id?: string | null
          status_acesso?: string
          unidade_id?: string | null
          user_id?: string | null
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
            foreignKeyName: "clientes_corp_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      media_library: {
        Row: {
          created_at: string | null
          file_type: string
          filename: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          file_type: string
          filename: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          file_type?: string
          filename?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          url?: string
        }
        Relationships: []
      }
      navigation_items: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_external: boolean | null
          label: string
          menu_id: string
          order_index: number | null
          parent_id: string | null
          target: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_external?: boolean | null
          label: string
          menu_id: string
          order_index?: number | null
          parent_id?: string | null
          target?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_external?: boolean | null
          label?: string
          menu_id?: string
          order_index?: number | null
          parent_id?: string | null
          target?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "navigation_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_menus: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pendencias: {
        Row: {
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          prioridade: number
          responsavel: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          prioridade?: number
          responsavel?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          prioridade?: number
          responsavel?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      plano_solicitacoes: {
        Row: {
          admin_notes: string | null
          cliente_corp_id: string
          created_at: string
          id: string
          mensagem: string | null
          plano_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          cliente_corp_id: string
          created_at?: string
          id?: string
          mensagem?: string | null
          plano_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          cliente_corp_id?: string
          created_at?: string
          id?: string
          mensagem?: string | null
          plano_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_solicitacoes_cliente_corp_id_fkey"
            columns: ["cliente_corp_id"]
            isOneToOne: false
            referencedRelation: "clientes_corp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_solicitacoes_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
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
          deleted_at: string | null
          descricao: string | null
          horas_incluidas: number
          id: string
          nome: string
          periodo_apuracao: string
          preco: number
          quantidade_horas: number
          tipo: string | null
          unidade_id: string | null
          validade_dias: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          horas_incluidas?: number
          id?: string
          nome: string
          periodo_apuracao?: string
          preco: number
          quantidade_horas: number
          tipo?: string | null
          unidade_id?: string | null
          validade_dias?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          descricao?: string | null
          horas_incluidas?: number
          id?: string
          nome?: string
          periodo_apuracao?: string
          preco?: number
          quantidade_horas?: number
          tipo?: string | null
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
      reservation_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json
          previous_data: Json
          reservation_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data: Json
          previous_data: Json
          reservation_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json
          previous_data?: Json
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_history_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          ambiente: Database["public"]["Enums"]["ambiente_tipo"]
          calculo_justificativa: string | null
          cancel_motivo: string | null
          cancelled_at: string | null
          created_at: string
          data: string
          desconto_motivo: string | null
          desconto_por: string | null
          email: string
          google_calendar_id: string | null
          google_event_id: string | null
          hora_fim: string
          hora_inicio: string
          horas_cobertas_plano: number
          horas_excedentes: number
          horas_reservadas: number
          id: string
          modified_at: string | null
          modified_by: string | null
          nome: string
          observacoes: string | null
          origem: string
          plano_id: string | null
          sala_id: string | null
          serie_id: string | null
          status: Database["public"]["Enums"]["reserva_status"]
          telefone: string
          tipo: Database["public"]["Enums"]["reserva_tipo"]
          unidade_id: string | null
          updated_at: string
          valor: number | null
          valor_original: number | null
        }
        Insert: {
          ambiente: Database["public"]["Enums"]["ambiente_tipo"]
          calculo_justificativa?: string | null
          cancel_motivo?: string | null
          cancelled_at?: string | null
          created_at?: string
          data: string
          desconto_motivo?: string | null
          desconto_por?: string | null
          email: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          hora_fim: string
          hora_inicio: string
          horas_cobertas_plano?: number
          horas_excedentes?: number
          horas_reservadas?: number
          id?: string
          modified_at?: string | null
          modified_by?: string | null
          nome: string
          observacoes?: string | null
          origem?: string
          plano_id?: string | null
          sala_id?: string | null
          serie_id?: string | null
          status?: Database["public"]["Enums"]["reserva_status"]
          telefone: string
          tipo: Database["public"]["Enums"]["reserva_tipo"]
          unidade_id?: string | null
          updated_at?: string
          valor?: number | null
          valor_original?: number | null
        }
        Update: {
          ambiente?: Database["public"]["Enums"]["ambiente_tipo"]
          calculo_justificativa?: string | null
          cancel_motivo?: string | null
          cancelled_at?: string | null
          created_at?: string
          data?: string
          desconto_motivo?: string | null
          desconto_por?: string | null
          email?: string
          google_calendar_id?: string | null
          google_event_id?: string | null
          hora_fim?: string
          hora_inicio?: string
          horas_cobertas_plano?: number
          horas_excedentes?: number
          horas_reservadas?: number
          id?: string
          modified_at?: string | null
          modified_by?: string | null
          nome?: string
          observacoes?: string | null
          origem?: string
          plano_id?: string | null
          sala_id?: string | null
          serie_id?: string | null
          status?: Database["public"]["Enums"]["reserva_status"]
          telefone?: string
          tipo?: Database["public"]["Enums"]["reserva_tipo"]
          unidade_id?: string | null
          updated_at?: string
          valor?: number | null
          valor_original?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
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
          categoria: string | null
          categorias: string[]
          created_at: string
          descricao: string | null
          foto_url: string | null
          galeria: string[] | null
          id: string
          metadata: Json | null
          modalidades_locacao: string[]
          nome: string
          preco_locacao_mensal: number | null
          preco_periodo_locacao_avulsa: number | null
          preco_periodo_pacote_mensal: number | null
          status: string
          subtipo_periodo: string | null
          tipo: string
          tipo_locacao: string | null
          unidade_id: string | null
        }
        Insert: {
          capacidade?: number | null
          categoria?: string | null
          categorias?: string[]
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          galeria?: string[] | null
          id?: string
          metadata?: Json | null
          modalidades_locacao?: string[]
          nome: string
          preco_locacao_mensal?: number | null
          preco_periodo_locacao_avulsa?: number | null
          preco_periodo_pacote_mensal?: number | null
          status?: string
          subtipo_periodo?: string | null
          tipo: string
          tipo_locacao?: string | null
          unidade_id?: string | null
        }
        Update: {
          capacidade?: number | null
          categoria?: string | null
          categorias?: string[]
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          galeria?: string[] | null
          id?: string
          metadata?: Json | null
          modalidades_locacao?: string[]
          nome?: string
          preco_locacao_mensal?: number | null
          preco_periodo_locacao_avulsa?: number | null
          preco_periodo_pacote_mensal?: number | null
          status?: string
          subtipo_periodo?: string | null
          tipo?: string
          tipo_locacao?: string | null
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
          status: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          nome: string
          preco?: string | null
          status?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          nome?: string
          preco?: string | null
          status?: string
        }
        Relationships: []
      }
      site_articles: {
        Row: {
          author: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          published_at: string | null
          seo_metadata: Json | null
          slug: string | null
          status: string | null
          title: string
        }
        Insert: {
          author?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          seo_metadata?: Json | null
          slug?: string | null
          status?: string | null
          title: string
        }
        Update: {
          author?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          seo_metadata?: Json | null
          slug?: string | null
          status?: string | null
          title?: string
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
      support_messages: {
        Row: {
          autor_nome: string | null
          autor_tipo: string
          corpo: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          autor_nome?: string | null
          autor_tipo?: string
          corpo: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          autor_nome?: string | null
          autor_tipo?: string
          corpo?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assunto: string
          cliente_corp_id: string
          created_at: string
          id: string
          prioridade: string
          status: string
          updated_at: string
        }
        Insert: {
          assunto: string
          cliente_corp_id: string
          created_at?: string
          id?: string
          prioridade?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assunto?: string
          cliente_corp_id?: string
          created_at?: string
          id?: string
          prioridade?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_cliente_corp_id_fkey"
            columns: ["cliente_corp_id"]
            isOneToOne: false
            referencedRelation: "clientes_corp"
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
          horario_abertura: string
          horario_fechamento: string
          id: string
          nome: string
          servicos_infra: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          endereco?: string | null
          foto_url?: string | null
          galeria?: string[] | null
          horario_abertura?: string
          horario_fechamento?: string
          id?: string
          nome: string
          servicos_infra?: Json | null
          status?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          endereco?: string | null
          foto_url?: string | null
          galeria?: string[] | null
          horario_abertura?: string
          horario_fechamento?: string
          id?: string
          nome?: string
          servicos_infra?: Json | null
          status?: string
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
          data_hora_prevista: string | null
          documento: string | null
          id: string
          nome: string
          observacoes: string | null
          sala_id: string | null
        }
        Insert: {
          cliente_corp_id?: string | null
          created_at?: string
          data_hora_prevista?: string | null
          documento?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          sala_id?: string | null
        }
        Update: {
          cliente_corp_id?: string | null
          created_at?: string
          data_hora_prevista?: string | null
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
      waiting_list: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          id: string
          min_metragem: number | null
          needs_lavatory: boolean | null
          needs_window: boolean | null
          outros_requisitos: string | null
          priority: number | null
          status: string | null
          unidade_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          min_metragem?: number | null
          needs_lavatory?: boolean | null
          needs_window?: boolean | null
          outros_requisitos?: string | null
          priority?: number | null
          status?: string | null
          unidade_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          min_metragem?: number | null
          needs_lavatory?: boolean | null
          needs_window?: boolean | null
          outros_requisitos?: string | null
          priority?: number | null
          status?: string | null
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_corp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
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
      current_cliente_id: { Args: never; Returns: string }
      get_public_room_availability: {
        Args: { p_end_date: string; p_sala_id?: string; p_start_date: string }
        Returns: {
          color_slot: number
          data: string
          hora_fim: string
          hora_inicio: string
          sala_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      request_authenticated_reservation: {
        Args: {
          p_data: string
          p_hora_fim: string
          p_hora_inicio: string
          p_sala_id: string
        }
        Returns: string
      }
      request_authenticated_reservations:
        | { Args: { p_periodos: Json; p_sala_id: string }; Returns: string[] }
        | {
            Args: {
              p_email: string
              p_nome: string
              p_periodos: Json
              p_sala_id: string
              p_tipo_negocio: string
              p_whatsapp: string
            }
            Returns: string[]
          }
      save_admin_room: {
        Args: {
          p_capacidade: number
          p_categorias: string[]
          p_descricao: string
          p_foto_url: string
          p_galeria: string[]
          p_id: string
          p_metadata: Json
          p_modalidades: string[]
          p_nome: string
          p_planos: string[]
          p_preco_avulso: number
          p_preco_mensal: number
          p_status: string
          p_tipo: string
          p_unidade_id: string
        }
        Returns: string
      }
      submit_public_consultation: {
        Args: {
          p_email: string
          p_nome: string
          p_tipo_negocio: string
          p_whatsapp: string
        }
        Returns: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
