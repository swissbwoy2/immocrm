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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string | null
          id: string
          nombre_clients_assignes: number | null
          statut: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre_clients_assignes?: number | null
          statut?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre_clients_assignes?: number | null
          statut?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          adresse: string | null
          agent_id: string | null
          anciennete_mois: number | null
          animaux: boolean | null
          apport_personnel: number | null
          autres_credits: boolean | null
          budget_max: number | null
          charges_extraordinaires: boolean | null
          charges_mensuelles: number | null
          commission_split: number | null
          contact_gerance: string | null
          created_at: string | null
          curatelle: boolean | null
          date_ajout: string | null
          date_engagement: string | null
          date_naissance: string | null
          decouverte_agence: string | null
          depuis_le: string | null
          employeur: string | null
          etat_avancement: string | null
          etat_civil: string | null
          garanties: string | null
          gerance_actuelle: string | null
          id: string
          instrument_musique: boolean | null
          loyer_actuel: number | null
          montant_charges_extra: number | null
          motif_changement: string | null
          nationalite: string | null
          nombre_occupants: number | null
          note_agent: string | null
          numero_plaques: string | null
          pieces: number | null
          pieces_actuel: number | null
          poursuites: boolean | null
          priorite: string | null
          profession: string | null
          region_recherche: string | null
          residence: string | null
          revenus_mensuels: number | null
          secteur_activite: string | null
          situation_familiale: string | null
          situation_financiere: string | null
          souhaits_particuliers: string | null
          source_revenus: string | null
          statut: string | null
          type_bien: string | null
          type_contrat: string | null
          type_permis: string | null
          updated_at: string | null
          user_id: string
          utilisation_logement: string | null
          vehicules: boolean | null
        }
        Insert: {
          adresse?: string | null
          agent_id?: string | null
          anciennete_mois?: number | null
          animaux?: boolean | null
          apport_personnel?: number | null
          autres_credits?: boolean | null
          budget_max?: number | null
          charges_extraordinaires?: boolean | null
          charges_mensuelles?: number | null
          commission_split?: number | null
          contact_gerance?: string | null
          created_at?: string | null
          curatelle?: boolean | null
          date_ajout?: string | null
          date_engagement?: string | null
          date_naissance?: string | null
          decouverte_agence?: string | null
          depuis_le?: string | null
          employeur?: string | null
          etat_avancement?: string | null
          etat_civil?: string | null
          garanties?: string | null
          gerance_actuelle?: string | null
          id?: string
          instrument_musique?: boolean | null
          loyer_actuel?: number | null
          montant_charges_extra?: number | null
          motif_changement?: string | null
          nationalite?: string | null
          nombre_occupants?: number | null
          note_agent?: string | null
          numero_plaques?: string | null
          pieces?: number | null
          pieces_actuel?: number | null
          poursuites?: boolean | null
          priorite?: string | null
          profession?: string | null
          region_recherche?: string | null
          residence?: string | null
          revenus_mensuels?: number | null
          secteur_activite?: string | null
          situation_familiale?: string | null
          situation_financiere?: string | null
          souhaits_particuliers?: string | null
          source_revenus?: string | null
          statut?: string | null
          type_bien?: string | null
          type_contrat?: string | null
          type_permis?: string | null
          updated_at?: string | null
          user_id: string
          utilisation_logement?: string | null
          vehicules?: boolean | null
        }
        Update: {
          adresse?: string | null
          agent_id?: string | null
          anciennete_mois?: number | null
          animaux?: boolean | null
          apport_personnel?: number | null
          autres_credits?: boolean | null
          budget_max?: number | null
          charges_extraordinaires?: boolean | null
          charges_mensuelles?: number | null
          commission_split?: number | null
          contact_gerance?: string | null
          created_at?: string | null
          curatelle?: boolean | null
          date_ajout?: string | null
          date_engagement?: string | null
          date_naissance?: string | null
          decouverte_agence?: string | null
          depuis_le?: string | null
          employeur?: string | null
          etat_avancement?: string | null
          etat_civil?: string | null
          garanties?: string | null
          gerance_actuelle?: string | null
          id?: string
          instrument_musique?: boolean | null
          loyer_actuel?: number | null
          montant_charges_extra?: number | null
          motif_changement?: string | null
          nationalite?: string | null
          nombre_occupants?: number | null
          note_agent?: string | null
          numero_plaques?: string | null
          pieces?: number | null
          pieces_actuel?: number | null
          poursuites?: boolean | null
          priorite?: string | null
          profession?: string | null
          region_recherche?: string | null
          residence?: string | null
          revenus_mensuels?: number | null
          secteur_activite?: string | null
          situation_familiale?: string | null
          situation_financiere?: string | null
          souhaits_particuliers?: string | null
          source_revenus?: string | null
          statut?: string | null
          type_bien?: string | null
          type_contrat?: string | null
          type_permis?: string | null
          updated_at?: string | null
          user_id?: string
          utilisation_logement?: string | null
          vehicules?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string | null
          id: string
          last_message_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          client_id: string | null
          created_at: string | null
          date_upload: string | null
          id: string
          nom: string
          statut: string | null
          taille: number | null
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          date_upload?: string | null
          id?: string
          nom: string
          statut?: string | null
          taille?: number | null
          type: string
          url?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          date_upload?: string | null
          id?: string
          nom?: string
          statut?: string | null
          taille?: number | null
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      offres: {
        Row: {
          adresse: string
          agent_id: string | null
          client_id: string | null
          code_immeuble: string | null
          commentaires: string | null
          concierge_nom: string | null
          concierge_tel: string | null
          created_at: string | null
          date_envoi: string | null
          description: string | null
          disponibilite: string | null
          etage: string | null
          id: string
          lien_annonce: string | null
          locataire_nom: string | null
          locataire_tel: string | null
          pieces: number | null
          prix: number
          statut: string | null
          surface: number | null
          titre: string | null
          type_bien: string | null
          updated_at: string | null
        }
        Insert: {
          adresse: string
          agent_id?: string | null
          client_id?: string | null
          code_immeuble?: string | null
          commentaires?: string | null
          concierge_nom?: string | null
          concierge_tel?: string | null
          created_at?: string | null
          date_envoi?: string | null
          description?: string | null
          disponibilite?: string | null
          etage?: string | null
          id?: string
          lien_annonce?: string | null
          locataire_nom?: string | null
          locataire_tel?: string | null
          pieces?: number | null
          prix: number
          statut?: string | null
          surface?: number | null
          titre?: string | null
          type_bien?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse?: string
          agent_id?: string | null
          client_id?: string | null
          code_immeuble?: string | null
          commentaires?: string | null
          concierge_nom?: string | null
          concierge_tel?: string | null
          created_at?: string | null
          date_envoi?: string | null
          description?: string | null
          disponibilite?: string | null
          etage?: string | null
          id?: string
          lien_annonce?: string | null
          locataire_nom?: string | null
          locataire_tel?: string | null
          pieces?: number | null
          prix?: number
          statut?: string | null
          surface?: number | null
          titre?: string | null
          type_bien?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offres_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offres_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          actif: boolean | null
          created_at: string | null
          email: string
          id: string
          nom: string
          prenom: string
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          email: string
          id: string
          nom: string
          prenom: string
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nom?: string
          prenom?: string
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          agent_id: string | null
          client_id: string | null
          commission_totale: number
          created_at: string | null
          date_transaction: string | null
          id: string
          montant_total: number
          offre_id: string | null
          part_agence: number
          part_agent: number
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          client_id?: string | null
          commission_totale: number
          created_at?: string | null
          date_transaction?: string | null
          id?: string
          montant_total: number
          offre_id?: string | null
          part_agence: number
          part_agent: number
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string | null
          commission_totale?: number
          created_at?: string | null
          date_transaction?: string | null
          id?: string
          montant_total?: number
          offre_id?: string | null
          part_agence?: number
          part_agent?: number
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visites: {
        Row: {
          adresse: string
          agent_id: string | null
          client_id: string | null
          created_at: string | null
          date_visite: string
          id: string
          notes: string | null
          offre_id: string | null
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          adresse: string
          agent_id?: string | null
          client_id?: string | null
          created_at?: string | null
          date_visite: string
          id?: string
          notes?: string | null
          offre_id?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse?: string
          agent_id?: string | null
          client_id?: string | null
          created_at?: string | null
          date_visite?: string
          id?: string
          notes?: string | null
          offre_id?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visites_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visites_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agent_of_client: { Args: { profile_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "agent" | "client"
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
      app_role: ["admin", "agent", "client"],
    },
  },
} as const
