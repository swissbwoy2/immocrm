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
      abaninja_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      actes_vente: {
        Row: {
          acheteur_id: string | null
          acheteur_nom: string | null
          commission_agence: number | null
          commission_payee: boolean | null
          created_at: string
          created_by: string | null
          date_entree_jouissance: string | null
          date_paiement_commission: string | null
          date_signature_acte: string | null
          documents: Json | null
          frais_notaire: number | null
          id: string
          immeuble_id: string
          notaire_adresse: string | null
          notaire_id: string | null
          notaire_nom: string | null
          notaire_telephone: string | null
          notes: string | null
          offre_id: string | null
          prix_vente_final: number
          statut: string
          taux_commission: number | null
          updated_at: string
        }
        Insert: {
          acheteur_id?: string | null
          acheteur_nom?: string | null
          commission_agence?: number | null
          commission_payee?: boolean | null
          created_at?: string
          created_by?: string | null
          date_entree_jouissance?: string | null
          date_paiement_commission?: string | null
          date_signature_acte?: string | null
          documents?: Json | null
          frais_notaire?: number | null
          id?: string
          immeuble_id: string
          notaire_adresse?: string | null
          notaire_id?: string | null
          notaire_nom?: string | null
          notaire_telephone?: string | null
          notes?: string | null
          offre_id?: string | null
          prix_vente_final: number
          statut?: string
          taux_commission?: number | null
          updated_at?: string
        }
        Update: {
          acheteur_id?: string | null
          acheteur_nom?: string | null
          commission_agence?: number | null
          commission_payee?: boolean | null
          created_at?: string
          created_by?: string | null
          date_entree_jouissance?: string | null
          date_paiement_commission?: string | null
          date_signature_acte?: string | null
          documents?: Json | null
          frais_notaire?: number | null
          id?: string
          immeuble_id?: string
          notaire_adresse?: string | null
          notaire_id?: string | null
          notaire_nom?: string | null
          notaire_telephone?: string | null
          notes?: string | null
          offre_id?: string | null
          prix_vente_final?: number
          statut?: string
          taux_commission?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actes_vente_acheteur_id_fkey"
            columns: ["acheteur_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actes_vente_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actes_vente_notaire_id_fkey"
            columns: ["notaire_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actes_vente_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres_achat"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_badges: {
        Row: {
          agent_id: string
          badge_category: string
          badge_type: string
          description: string | null
          earned_at: string | null
          goal_id: string | null
          id: string
          metadata: Json | null
          title: string
        }
        Insert: {
          agent_id: string
          badge_category: string
          badge_type: string
          description?: string | null
          earned_at?: string | null
          goal_id?: string | null
          id?: string
          metadata?: Json | null
          title: string
        }
        Update: {
          agent_id?: string
          badge_category?: string
          badge_type?: string
          description?: string | null
          earned_at?: string | null
          goal_id?: string | null
          id?: string
          metadata?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_badges_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_badges_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "agent_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_goals: {
        Row: {
          agent_id: string
          created_at: string | null
          end_date: string | null
          goal_type: string
          id: string
          is_active: boolean | null
          period: string
          start_date: string | null
          target_value: number
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          end_date?: string | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          period: string
          start_date?: string | null
          target_value?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          end_date?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          period?: string
          start_date?: string | null
          target_value?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_goals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
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
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_actions: {
        Row: {
          action_payload: Json | null
          action_type: string
          ai_agent_id: string
          approved_at: string | null
          approved_by: string | null
          channel: string | null
          client_id: string | null
          created_at: string
          draft_content: string | null
          error_message: string | null
          executed_at: string | null
          execution_result: Json | null
          id: string
          property_id: string | null
          rejected_reason: string | null
          requires_approval: boolean
          source_type: string
          status: string
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          ai_agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          channel?: string | null
          client_id?: string | null
          created_at?: string
          draft_content?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_result?: Json | null
          id?: string
          property_id?: string | null
          rejected_reason?: string | null
          requires_approval?: boolean
          source_type?: string
          status?: string
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          ai_agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          channel?: string | null
          client_id?: string | null
          created_at?: string
          draft_content?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_result?: Json | null
          id?: string
          property_id?: string | null
          rejected_reason?: string | null
          requires_approval?: boolean
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_actions_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_actions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_assignments: {
        Row: {
          ai_agent_id: string
          assigned_at: string
          assigned_by: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          priority: string | null
          status: string
        }
        Insert: {
          ai_agent_id: string
          assigned_at?: string
          assigned_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
        }
        Update: {
          ai_agent_id?: string
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_assignments_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_call_logs: {
        Row: {
          agency_name: string | null
          ai_agent_id: string
          call_notes: string | null
          call_result: string | null
          call_script: string | null
          client_id: string | null
          contact_name: string | null
          created_at: string
          id: string
          next_callback_at: string | null
          phone_number: string | null
          status: string | null
        }
        Insert: {
          agency_name?: string | null
          ai_agent_id: string
          call_notes?: string | null
          call_result?: string | null
          call_script?: string | null
          client_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          next_callback_at?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Update: {
          agency_name?: string | null
          ai_agent_id?: string
          call_notes?: string | null
          call_result?: string | null
          call_script?: string | null
          client_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          next_callback_at?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_call_logs_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_call_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_drafts: {
        Row: {
          ai_agent_id: string
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          body: string | null
          channel: string | null
          client_id: string | null
          created_at: string
          draft_type: string
          id: string
          property_match_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          ai_agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          body?: string | null
          channel?: string | null
          client_id?: string | null
          created_at?: string
          draft_type: string
          id?: string
          property_match_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          ai_agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          body?: string | null
          channel?: string | null
          client_id?: string | null
          created_at?: string
          draft_type?: string
          id?: string
          property_match_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_drafts_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_drafts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_drafts_property_match_id_fkey"
            columns: ["property_match_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_property_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_property_matches: {
        Row: {
          address: string | null
          ai_agent_id: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          images: Json | null
          location: string | null
          match_details: Json | null
          match_score: number | null
          price: number | null
          property_type: string | null
          rooms: number | null
          source_platform: string | null
          source_url: string | null
          status: string
          surface: number | null
          title: string
        }
        Insert: {
          address?: string | null
          ai_agent_id: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          location?: string | null
          match_details?: Json | null
          match_score?: number | null
          price?: number | null
          property_type?: string | null
          rooms?: number | null
          source_platform?: string | null
          source_url?: string | null
          status?: string
          surface?: number | null
          title: string
        }
        Update: {
          address?: string | null
          ai_agent_id?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: Json | null
          location?: string | null
          match_details?: Json | null
          match_score?: number | null
          price?: number | null
          property_type?: string | null
          rooms?: number | null
          source_platform?: string | null
          source_url?: string | null
          status?: string
          surface?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_property_matches_ai_agent_id_fkey"
            columns: ["ai_agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_property_matches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          allowed_actions: Json
          api_token_hash: string | null
          assigned_manager: string | null
          audit_log_enabled: boolean
          created_at: string
          display_name: string
          email_channel: string | null
          id: string
          last_activity_at: string | null
          name: string
          requires_validation: boolean
          security_level: string
          status: string
          type: string
          updated_at: string
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          allowed_actions?: Json
          api_token_hash?: string | null
          assigned_manager?: string | null
          audit_log_enabled?: boolean
          created_at?: string
          display_name: string
          email_channel?: string | null
          id?: string
          last_activity_at?: string | null
          name: string
          requires_validation?: boolean
          security_level?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          allowed_actions?: Json
          api_token_hash?: string | null
          assigned_manager?: string | null
          audit_log_enabled?: boolean
          created_at?: string
          display_name?: string
          email_channel?: string | null
          id?: string
          last_activity_at?: string | null
          name?: string
          requires_validation?: boolean
          security_level?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_assigned_manager_fkey"
            columns: ["assigned_manager"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_matches: {
        Row: {
          agent_id: string | null
          client_id: string | null
          converted_to_offre_id: string | null
          created_at: string | null
          email_from: string | null
          email_id: string | null
          email_subject: string | null
          extracted_address: string | null
          extracted_disponibilite: string | null
          extracted_location: string | null
          extracted_pieces: number | null
          extracted_price: number | null
          extracted_regie: string | null
          extracted_surface: number | null
          extracted_type_bien: string | null
          id: string
          match_details: Json | null
          match_score: number | null
          processed_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          client_id?: string | null
          converted_to_offre_id?: string | null
          created_at?: string | null
          email_from?: string | null
          email_id?: string | null
          email_subject?: string | null
          extracted_address?: string | null
          extracted_disponibilite?: string | null
          extracted_location?: string | null
          extracted_pieces?: number | null
          extracted_price?: number | null
          extracted_regie?: string | null
          extracted_surface?: number | null
          extracted_type_bien?: string | null
          id?: string
          match_details?: Json | null
          match_score?: number | null
          processed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string | null
          converted_to_offre_id?: string | null
          created_at?: string | null
          email_from?: string | null
          email_id?: string | null
          email_subject?: string | null
          extracted_address?: string | null
          extracted_disponibilite?: string | null
          extracted_location?: string | null
          extracted_pieces?: number | null
          extracted_price?: number | null
          extracted_regie?: string | null
          extracted_surface?: number | null
          extracted_type_bien?: string | null
          id?: string
          match_details?: Json | null
          match_score?: number | null
          processed_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_matches_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_matches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_matches_converted_to_offre_id_fkey"
            columns: ["converted_to_offre_id"]
            isOneToOne: false
            referencedRelation: "offres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_matches_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "received_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      annonces_publiques: {
        Row: {
          acces_pmr: boolean | null
          adresse: string
          adresse_complementaire: string | null
          afficher_adresse_exacte: boolean | null
          animaux_autorises: boolean | null
          annee_construction: number | null
          annee_renovation: number | null
          annonceur_id: string
          balcon: boolean | null
          canton: string | null
          categorie_id: string | null
          charges_comprises: boolean | null
          charges_mensuelles: number | null
          classe_energetique: string | null
          code_postal: string
          created_at: string | null
          date_debut_mise_avant: string | null
          date_expiration: string | null
          date_fin_mise_avant: string | null
          date_moderation: string | null
          date_publication: string | null
          date_soumission: string | null
          depot_garantie: number | null
          description: string | null
          description_courte: string | null
          disponible_des: string | null
          disponible_immediatement: boolean | null
          duree_bail_min: number | null
          duree_publication: number | null
          email_contact: string | null
          emissions_co2: number | null
          equipements: Json | null
          est_mise_en_avant: boolean | null
          etage: number | null
          etat_bien: string | null
          external_id: string | null
          fumeurs_acceptes: boolean | null
          horaires_contact: string | null
          id: string
          indice_energetique: number | null
          jardin: boolean | null
          latitude: number | null
          longitude: number | null
          meta_description: string | null
          meta_title: string | null
          modere_par: string | null
          motif_refus: string | null
          mots_cles: string[] | null
          nb_chambres: number | null
          nb_contacts: number | null
          nb_etages_immeuble: number | null
          nb_favoris: number | null
          nb_mois_garantie: number | null
          nb_partages: number | null
          nb_places_parking: number | null
          nb_salles_bain: number | null
          nb_vues: number | null
          nb_vues_uniques: number | null
          nb_wc: number | null
          nom_contact: string | null
          nombre_pieces: number | null
          parking_inclus: boolean | null
          pays: string | null
          piscine: boolean | null
          points_forts: string[] | null
          position_mise_avant: number | null
          prix: number
          prix_affichage: string | null
          prix_au_m2: number | null
          quartier: string | null
          reference: string | null
          renouvellements: number | null
          slug: string | null
          source: string | null
          source_energie: string | null
          sous_type: string | null
          statut: string | null
          surface_balcon: number | null
          surface_habitable: number | null
          surface_jardin: number | null
          surface_terrain: number | null
          surface_terrasse: number | null
          surface_utile: number | null
          telephone_contact: string | null
          terrasse: boolean | null
          titre: string
          type_chauffage: string | null
          type_parking: string | null
          type_transaction: string
          updated_at: string | null
          ville: string
          whatsapp_contact: string | null
        }
        Insert: {
          acces_pmr?: boolean | null
          adresse: string
          adresse_complementaire?: string | null
          afficher_adresse_exacte?: boolean | null
          animaux_autorises?: boolean | null
          annee_construction?: number | null
          annee_renovation?: number | null
          annonceur_id: string
          balcon?: boolean | null
          canton?: string | null
          categorie_id?: string | null
          charges_comprises?: boolean | null
          charges_mensuelles?: number | null
          classe_energetique?: string | null
          code_postal: string
          created_at?: string | null
          date_debut_mise_avant?: string | null
          date_expiration?: string | null
          date_fin_mise_avant?: string | null
          date_moderation?: string | null
          date_publication?: string | null
          date_soumission?: string | null
          depot_garantie?: number | null
          description?: string | null
          description_courte?: string | null
          disponible_des?: string | null
          disponible_immediatement?: boolean | null
          duree_bail_min?: number | null
          duree_publication?: number | null
          email_contact?: string | null
          emissions_co2?: number | null
          equipements?: Json | null
          est_mise_en_avant?: boolean | null
          etage?: number | null
          etat_bien?: string | null
          external_id?: string | null
          fumeurs_acceptes?: boolean | null
          horaires_contact?: string | null
          id?: string
          indice_energetique?: number | null
          jardin?: boolean | null
          latitude?: number | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          modere_par?: string | null
          motif_refus?: string | null
          mots_cles?: string[] | null
          nb_chambres?: number | null
          nb_contacts?: number | null
          nb_etages_immeuble?: number | null
          nb_favoris?: number | null
          nb_mois_garantie?: number | null
          nb_partages?: number | null
          nb_places_parking?: number | null
          nb_salles_bain?: number | null
          nb_vues?: number | null
          nb_vues_uniques?: number | null
          nb_wc?: number | null
          nom_contact?: string | null
          nombre_pieces?: number | null
          parking_inclus?: boolean | null
          pays?: string | null
          piscine?: boolean | null
          points_forts?: string[] | null
          position_mise_avant?: number | null
          prix: number
          prix_affichage?: string | null
          prix_au_m2?: number | null
          quartier?: string | null
          reference?: string | null
          renouvellements?: number | null
          slug?: string | null
          source?: string | null
          source_energie?: string | null
          sous_type?: string | null
          statut?: string | null
          surface_balcon?: number | null
          surface_habitable?: number | null
          surface_jardin?: number | null
          surface_terrain?: number | null
          surface_terrasse?: number | null
          surface_utile?: number | null
          telephone_contact?: string | null
          terrasse?: boolean | null
          titre: string
          type_chauffage?: string | null
          type_parking?: string | null
          type_transaction: string
          updated_at?: string | null
          ville: string
          whatsapp_contact?: string | null
        }
        Update: {
          acces_pmr?: boolean | null
          adresse?: string
          adresse_complementaire?: string | null
          afficher_adresse_exacte?: boolean | null
          animaux_autorises?: boolean | null
          annee_construction?: number | null
          annee_renovation?: number | null
          annonceur_id?: string
          balcon?: boolean | null
          canton?: string | null
          categorie_id?: string | null
          charges_comprises?: boolean | null
          charges_mensuelles?: number | null
          classe_energetique?: string | null
          code_postal?: string
          created_at?: string | null
          date_debut_mise_avant?: string | null
          date_expiration?: string | null
          date_fin_mise_avant?: string | null
          date_moderation?: string | null
          date_publication?: string | null
          date_soumission?: string | null
          depot_garantie?: number | null
          description?: string | null
          description_courte?: string | null
          disponible_des?: string | null
          disponible_immediatement?: boolean | null
          duree_bail_min?: number | null
          duree_publication?: number | null
          email_contact?: string | null
          emissions_co2?: number | null
          equipements?: Json | null
          est_mise_en_avant?: boolean | null
          etage?: number | null
          etat_bien?: string | null
          external_id?: string | null
          fumeurs_acceptes?: boolean | null
          horaires_contact?: string | null
          id?: string
          indice_energetique?: number | null
          jardin?: boolean | null
          latitude?: number | null
          longitude?: number | null
          meta_description?: string | null
          meta_title?: string | null
          modere_par?: string | null
          motif_refus?: string | null
          mots_cles?: string[] | null
          nb_chambres?: number | null
          nb_contacts?: number | null
          nb_etages_immeuble?: number | null
          nb_favoris?: number | null
          nb_mois_garantie?: number | null
          nb_partages?: number | null
          nb_places_parking?: number | null
          nb_salles_bain?: number | null
          nb_vues?: number | null
          nb_vues_uniques?: number | null
          nb_wc?: number | null
          nom_contact?: string | null
          nombre_pieces?: number | null
          parking_inclus?: boolean | null
          pays?: string | null
          piscine?: boolean | null
          points_forts?: string[] | null
          position_mise_avant?: number | null
          prix?: number
          prix_affichage?: string | null
          prix_au_m2?: number | null
          quartier?: string | null
          reference?: string | null
          renouvellements?: number | null
          slug?: string | null
          source?: string | null
          source_energie?: string | null
          sous_type?: string | null
          statut?: string | null
          surface_balcon?: number | null
          surface_habitable?: number | null
          surface_jardin?: number | null
          surface_terrain?: number | null
          surface_terrasse?: number | null
          surface_utile?: number | null
          telephone_contact?: string | null
          terrasse?: boolean | null
          titre?: string
          type_chauffage?: string | null
          type_parking?: string | null
          type_transaction?: string
          updated_at?: string | null
          ville?: string
          whatsapp_contact?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "annonces_publiques_annonceur_id_fkey"
            columns: ["annonceur_id"]
            isOneToOne: false
            referencedRelation: "annonceurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annonces_publiques_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories_annonces"
            referencedColumns: ["id"]
          },
        ]
      }
      annonceurs: {
        Row: {
          adresse: string | null
          canton: string | null
          civilite: string | null
          code_postal: string | null
          created_at: string | null
          credits_annonces: number | null
          date_expiration_abonnement: string | null
          date_naissance: string | null
          date_verification: string | null
          derniere_connexion: string | null
          email: string
          est_verifie: boolean | null
          id: string
          langue_preferee: string | null
          logo_url: string | null
          motif_suspension: string | null
          nb_annonces_actives: number | null
          nb_annonces_publiees: number | null
          nb_avis: number | null
          nb_contacts_recus: number | null
          nb_vues_totales: number | null
          nom: string
          nom_entreprise: string | null
          note_moyenne: number | null
          notifications_email: boolean | null
          notifications_sms: boolean | null
          numero_registre_commerce: string | null
          pays: string | null
          prenom: string | null
          site_web: string | null
          statut: string | null
          telephone: string | null
          telephone_secondaire: string | null
          type_abonnement: string | null
          type_annonceur: string
          updated_at: string | null
          user_id: string | null
          verifie_par: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          canton?: string | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string | null
          credits_annonces?: number | null
          date_expiration_abonnement?: string | null
          date_naissance?: string | null
          date_verification?: string | null
          derniere_connexion?: string | null
          email: string
          est_verifie?: boolean | null
          id?: string
          langue_preferee?: string | null
          logo_url?: string | null
          motif_suspension?: string | null
          nb_annonces_actives?: number | null
          nb_annonces_publiees?: number | null
          nb_avis?: number | null
          nb_contacts_recus?: number | null
          nb_vues_totales?: number | null
          nom: string
          nom_entreprise?: string | null
          note_moyenne?: number | null
          notifications_email?: boolean | null
          notifications_sms?: boolean | null
          numero_registre_commerce?: string | null
          pays?: string | null
          prenom?: string | null
          site_web?: string | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          type_abonnement?: string | null
          type_annonceur: string
          updated_at?: string | null
          user_id?: string | null
          verifie_par?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          canton?: string | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string | null
          credits_annonces?: number | null
          date_expiration_abonnement?: string | null
          date_naissance?: string | null
          date_verification?: string | null
          derniere_connexion?: string | null
          email?: string
          est_verifie?: boolean | null
          id?: string
          langue_preferee?: string | null
          logo_url?: string | null
          motif_suspension?: string | null
          nb_annonces_actives?: number | null
          nb_annonces_publiees?: number | null
          nb_avis?: number | null
          nb_contacts_recus?: number | null
          nb_vues_totales?: number | null
          nom?: string
          nom_entreprise?: string | null
          note_moyenne?: number | null
          notifications_email?: boolean | null
          notifications_sms?: boolean | null
          numero_registre_commerce?: string | null
          pays?: string | null
          prenom?: string | null
          site_web?: string | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          type_abonnement?: string | null
          type_annonceur?: string
          updated_at?: string | null
          user_id?: string | null
          verifie_par?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      apporteurs: {
        Row: {
          adresse: string | null
          bic_swift: string | null
          civilite: string | null
          code_parrainage: string | null
          code_postal: string | null
          contrat_pdf_url: string | null
          contrat_signe: boolean | null
          created_at: string | null
          date_expiration: string | null
          date_signature: string | null
          dispositions_particulieres: string | null
          iban: string | null
          id: string
          minimum_location: number | null
          minimum_vente: number | null
          nom_banque: string | null
          nombre_clients_referes: number | null
          notes_admin: string | null
          pays: string | null
          piece_identite_url: string | null
          signature_data: string | null
          statut: string | null
          taux_commission: number | null
          telephone: string | null
          titulaire_compte: string | null
          total_commissions_gagnees: number | null
          updated_at: string | null
          user_id: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          bic_swift?: string | null
          civilite?: string | null
          code_parrainage?: string | null
          code_postal?: string | null
          contrat_pdf_url?: string | null
          contrat_signe?: boolean | null
          created_at?: string | null
          date_expiration?: string | null
          date_signature?: string | null
          dispositions_particulieres?: string | null
          iban?: string | null
          id?: string
          minimum_location?: number | null
          minimum_vente?: number | null
          nom_banque?: string | null
          nombre_clients_referes?: number | null
          notes_admin?: string | null
          pays?: string | null
          piece_identite_url?: string | null
          signature_data?: string | null
          statut?: string | null
          taux_commission?: number | null
          telephone?: string | null
          titulaire_compte?: string | null
          total_commissions_gagnees?: number | null
          updated_at?: string | null
          user_id: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          bic_swift?: string | null
          civilite?: string | null
          code_parrainage?: string | null
          code_postal?: string | null
          contrat_pdf_url?: string | null
          contrat_signe?: boolean | null
          created_at?: string | null
          date_expiration?: string | null
          date_signature?: string | null
          dispositions_particulieres?: string | null
          iban?: string | null
          id?: string
          minimum_location?: number | null
          minimum_vente?: number | null
          nom_banque?: string | null
          nombre_clients_referes?: number | null
          notes_admin?: string | null
          pays?: string | null
          piece_identite_url?: string | null
          signature_data?: string | null
          statut?: string | null
          taux_commission?: number | null
          telephone?: string | null
          titulaire_compte?: string | null
          total_commissions_gagnees?: number | null
          updated_at?: string | null
          user_id?: string
          ville?: string | null
        }
        Relationships: []
      }
      assurances_immeuble: {
        Row: {
          assureur: string
          created_at: string | null
          date_debut: string | null
          date_fin: string | null
          date_prochaine_echeance: string | null
          delai_resiliation_mois: number | null
          document_url: string | null
          franchise: number | null
          id: string
          immeuble_id: string
          mois_resiliation: number | null
          notes: string | null
          numero_police: string | null
          periodicite_paiement: string | null
          prime_annuelle: number | null
          risques_couverts: Json | null
          type_assurance: string | null
          updated_at: string | null
          valeur_assuree: number | null
        }
        Insert: {
          assureur: string
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_prochaine_echeance?: string | null
          delai_resiliation_mois?: number | null
          document_url?: string | null
          franchise?: number | null
          id?: string
          immeuble_id: string
          mois_resiliation?: number | null
          notes?: string | null
          numero_police?: string | null
          periodicite_paiement?: string | null
          prime_annuelle?: number | null
          risques_couverts?: Json | null
          type_assurance?: string | null
          updated_at?: string | null
          valeur_assuree?: number | null
        }
        Update: {
          assureur?: string
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_prochaine_echeance?: string | null
          delai_resiliation_mois?: number | null
          document_url?: string | null
          franchise?: number | null
          id?: string
          immeuble_id?: string
          mois_resiliation?: number | null
          notes?: string | null
          numero_police?: string | null
          periodicite_paiement?: string | null
          prime_annuelle?: number | null
          risques_couverts?: Json | null
          type_assurance?: string | null
          updated_at?: string | null
          valeur_assuree?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assurances_immeuble_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
        ]
      }
      avis_annonceurs: {
        Row: {
          annonceur_id: string
          auteur_id: string
          commentaire: string
          created_at: string | null
          date_moderation: string | null
          date_reponse: string | null
          id: string
          ip_address: string | null
          modere_par: string | null
          motif_refus: string | null
          note_communication: number | null
          note_globale: number
          note_professionnalisme: number | null
          note_reactivite: number | null
          reponse_annonceur: string | null
          statut: string | null
          titre: string | null
          transaction_verifiee: boolean | null
          updated_at: string | null
        }
        Insert: {
          annonceur_id: string
          auteur_id: string
          commentaire: string
          created_at?: string | null
          date_moderation?: string | null
          date_reponse?: string | null
          id?: string
          ip_address?: string | null
          modere_par?: string | null
          motif_refus?: string | null
          note_communication?: number | null
          note_globale: number
          note_professionnalisme?: number | null
          note_reactivite?: number | null
          reponse_annonceur?: string | null
          statut?: string | null
          titre?: string | null
          transaction_verifiee?: boolean | null
          updated_at?: string | null
        }
        Update: {
          annonceur_id?: string
          auteur_id?: string
          commentaire?: string
          created_at?: string | null
          date_moderation?: string | null
          date_reponse?: string | null
          id?: string
          ip_address?: string | null
          modere_par?: string | null
          motif_refus?: string | null
          note_communication?: number | null
          note_globale?: number
          note_professionnalisme?: number | null
          note_reactivite?: number | null
          reponse_annonceur?: string | null
          statut?: string | null
          titre?: string | null
          transaction_verifiee?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avis_annonceurs_annonceur_id_fkey"
            columns: ["annonceur_id"]
            isOneToOne: false
            referencedRelation: "annonceurs"
            referencedColumns: ["id"]
          },
        ]
      }
      baux: {
        Row: {
          ancien_locataire_charges: number | null
          ancien_locataire_depuis: string | null
          ancien_locataire_loyer_net: number | null
          ancien_locataire_nom: string | null
          autres_charges: number | null
          clauses_particulieres: string | null
          contrat_pdf_url: string | null
          created_at: string | null
          date_debut: string
          date_derniere_indexation: string | null
          date_fin: string | null
          date_signature: string | null
          date_versement_garantie: string | null
          destination_locaux: string | null
          document_url: string | null
          duree_initiale: string | null
          egid: string | null
          etage: string | null
          ewid: string | null
          id: string
          indice_reference: string | null
          ispc_base: string | null
          ispc_date: string | null
          ispc_valeur: number | null
          lieu_signature: string | null
          locataire_id: string | null
          lot_id: string
          loyer_actuel: number | null
          loyer_initial: number | null
          montant_garantie: number | null
          motif_hausse: string | null
          motif_resiliation: string | null
          nombre_occupants: number | null
          nombre_pieces: number | null
          notification_pdf_url: string | null
          periodicite_paiement: string | null
          preavis_mois: number | null
          provisions_chauffage: number | null
          provisions_eau: number | null
          statut: string | null
          surface_objet: number | null
          taux_hypothecaire_reference: number | null
          total_mensuel: number | null
          type_garantie: string | null
          updated_at: string | null
          valeur_indice_reference: number | null
        }
        Insert: {
          ancien_locataire_charges?: number | null
          ancien_locataire_depuis?: string | null
          ancien_locataire_loyer_net?: number | null
          ancien_locataire_nom?: string | null
          autres_charges?: number | null
          clauses_particulieres?: string | null
          contrat_pdf_url?: string | null
          created_at?: string | null
          date_debut: string
          date_derniere_indexation?: string | null
          date_fin?: string | null
          date_signature?: string | null
          date_versement_garantie?: string | null
          destination_locaux?: string | null
          document_url?: string | null
          duree_initiale?: string | null
          egid?: string | null
          etage?: string | null
          ewid?: string | null
          id?: string
          indice_reference?: string | null
          ispc_base?: string | null
          ispc_date?: string | null
          ispc_valeur?: number | null
          lieu_signature?: string | null
          locataire_id?: string | null
          lot_id: string
          loyer_actuel?: number | null
          loyer_initial?: number | null
          montant_garantie?: number | null
          motif_hausse?: string | null
          motif_resiliation?: string | null
          nombre_occupants?: number | null
          nombre_pieces?: number | null
          notification_pdf_url?: string | null
          periodicite_paiement?: string | null
          preavis_mois?: number | null
          provisions_chauffage?: number | null
          provisions_eau?: number | null
          statut?: string | null
          surface_objet?: number | null
          taux_hypothecaire_reference?: number | null
          total_mensuel?: number | null
          type_garantie?: string | null
          updated_at?: string | null
          valeur_indice_reference?: number | null
        }
        Update: {
          ancien_locataire_charges?: number | null
          ancien_locataire_depuis?: string | null
          ancien_locataire_loyer_net?: number | null
          ancien_locataire_nom?: string | null
          autres_charges?: number | null
          clauses_particulieres?: string | null
          contrat_pdf_url?: string | null
          created_at?: string | null
          date_debut?: string
          date_derniere_indexation?: string | null
          date_fin?: string | null
          date_signature?: string | null
          date_versement_garantie?: string | null
          destination_locaux?: string | null
          document_url?: string | null
          duree_initiale?: string | null
          egid?: string | null
          etage?: string | null
          ewid?: string | null
          id?: string
          indice_reference?: string | null
          ispc_base?: string | null
          ispc_date?: string | null
          ispc_valeur?: number | null
          lieu_signature?: string | null
          locataire_id?: string | null
          lot_id?: string
          loyer_actuel?: number | null
          loyer_initial?: number | null
          montant_garantie?: number | null
          motif_hausse?: string | null
          motif_resiliation?: string | null
          nombre_occupants?: number | null
          nombre_pieces?: number | null
          notification_pdf_url?: string | null
          periodicite_paiement?: string | null
          preavis_mois?: number | null
          provisions_chauffage?: number | null
          provisions_eau?: number | null
          statut?: string | null
          surface_objet?: number | null
          taux_hypothecaire_reference?: number | null
          total_mensuel?: number | null
          type_garantie?: string | null
          updated_at?: string | null
          valeur_indice_reference?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "baux_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires_immeuble"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baux_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          agent_id: string | null
          all_day: boolean | null
          client_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          priority: string | null
          reminder_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          all_day?: boolean | null
          client_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type: string
          id?: string
          priority?: string | null
          reminder_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          all_day?: boolean | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          priority?: string | null
          reminder_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatures: {
        Row: {
          agent_valide_regie: boolean | null
          agent_valide_regie_at: string | null
          alerte_cles_vue: boolean | null
          avis_google_envoye: boolean | null
          bail_recu: boolean | null
          bail_recu_at: string | null
          cles_remises: boolean | null
          cles_remises_at: string | null
          client_accepte_conclure: boolean | null
          client_accepte_conclure_at: string | null
          client_id: string
          created_at: string | null
          date_depot: string | null
          date_etat_lieux: string | null
          date_signature_choisie: string | null
          dates_signature_proposees: Json | null
          dossier_complet: boolean | null
          emails_recommandation: Json | null
          facture_finale_created_at: string | null
          facture_finale_invoice_id: string | null
          facture_finale_invoice_ref: string | null
          facture_finale_montant: number | null
          heure_etat_lieux: string | null
          id: string
          lieu_signature: string | null
          message_client: string | null
          offre_id: string
          recommandation_envoyee: boolean | null
          signature_effectuee: boolean | null
          signature_effectuee_at: string | null
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          agent_valide_regie?: boolean | null
          agent_valide_regie_at?: string | null
          alerte_cles_vue?: boolean | null
          avis_google_envoye?: boolean | null
          bail_recu?: boolean | null
          bail_recu_at?: string | null
          cles_remises?: boolean | null
          cles_remises_at?: string | null
          client_accepte_conclure?: boolean | null
          client_accepte_conclure_at?: string | null
          client_id: string
          created_at?: string | null
          date_depot?: string | null
          date_etat_lieux?: string | null
          date_signature_choisie?: string | null
          dates_signature_proposees?: Json | null
          dossier_complet?: boolean | null
          emails_recommandation?: Json | null
          facture_finale_created_at?: string | null
          facture_finale_invoice_id?: string | null
          facture_finale_invoice_ref?: string | null
          facture_finale_montant?: number | null
          heure_etat_lieux?: string | null
          id?: string
          lieu_signature?: string | null
          message_client?: string | null
          offre_id: string
          recommandation_envoyee?: boolean | null
          signature_effectuee?: boolean | null
          signature_effectuee_at?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_valide_regie?: boolean | null
          agent_valide_regie_at?: string | null
          alerte_cles_vue?: boolean | null
          avis_google_envoye?: boolean | null
          bail_recu?: boolean | null
          bail_recu_at?: string | null
          cles_remises?: boolean | null
          cles_remises_at?: string | null
          client_accepte_conclure?: boolean | null
          client_accepte_conclure_at?: string | null
          client_id?: string
          created_at?: string | null
          date_depot?: string | null
          date_etat_lieux?: string | null
          date_signature_choisie?: string | null
          dates_signature_proposees?: Json | null
          dossier_complet?: boolean | null
          emails_recommandation?: Json | null
          facture_finale_created_at?: string | null
          facture_finale_invoice_id?: string | null
          facture_finale_invoice_ref?: string | null
          facture_finale_montant?: number | null
          heure_etat_lieux?: string | null
          id?: string
          lieu_signature?: string | null
          message_client?: string | null
          offre_id?: string
          recommandation_envoyee?: boolean | null
          signature_effectuee?: boolean | null
          signature_effectuee_at?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatures_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatures_location: {
        Row: {
          adresse_actuelle: string | null
          civilite: string | null
          co_candidats: Json | null
          created_at: string | null
          date_emmenagement_souhaitee: string | null
          date_engagement: string | null
          date_naissance: string | null
          date_visite: string | null
          documents: Json | null
          email: string | null
          employeur: string | null
          id: string
          lot_id: string
          loyer_actuel: number | null
          motif_changement: string | null
          motif_refus: string | null
          nationalite: string | null
          nom: string
          nombre_occupants: number | null
          note_agent: string | null
          prenom: string
          profession: string | null
          revenus_mensuels: number | null
          score_dossier: number | null
          statut: string | null
          telephone: string | null
          type_contrat: string | null
          type_permis: string | null
          updated_at: string | null
        }
        Insert: {
          adresse_actuelle?: string | null
          civilite?: string | null
          co_candidats?: Json | null
          created_at?: string | null
          date_emmenagement_souhaitee?: string | null
          date_engagement?: string | null
          date_naissance?: string | null
          date_visite?: string | null
          documents?: Json | null
          email?: string | null
          employeur?: string | null
          id?: string
          lot_id: string
          loyer_actuel?: number | null
          motif_changement?: string | null
          motif_refus?: string | null
          nationalite?: string | null
          nom: string
          nombre_occupants?: number | null
          note_agent?: string | null
          prenom: string
          profession?: string | null
          revenus_mensuels?: number | null
          score_dossier?: number | null
          statut?: string | null
          telephone?: string | null
          type_contrat?: string | null
          type_permis?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse_actuelle?: string | null
          civilite?: string | null
          co_candidats?: Json | null
          created_at?: string | null
          date_emmenagement_souhaitee?: string | null
          date_engagement?: string | null
          date_naissance?: string | null
          date_visite?: string | null
          documents?: Json | null
          email?: string | null
          employeur?: string | null
          id?: string
          lot_id?: string
          loyer_actuel?: number | null
          motif_changement?: string | null
          motif_refus?: string | null
          nationalite?: string | null
          nom?: string
          nombre_occupants?: number | null
          note_agent?: string | null
          prenom?: string
          profession?: string | null
          revenus_mensuels?: number | null
          score_dossier?: number | null
          statut?: string | null
          telephone?: string | null
          type_contrat?: string | null
          type_permis?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatures_location_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      categories_annonces: {
        Row: {
          couleur: string | null
          created_at: string | null
          description: string | null
          est_active: boolean | null
          icone: string | null
          id: string
          nom: string
          ordre: number | null
          parent_id: string | null
          slug: string
        }
        Insert: {
          couleur?: string | null
          created_at?: string | null
          description?: string | null
          est_active?: boolean | null
          icone?: string | null
          id?: string
          nom: string
          ordre?: number | null
          parent_id?: string | null
          slug: string
        }
        Update: {
          couleur?: string | null
          created_at?: string | null
          description?: string | null
          est_active?: boolean | null
          icone?: string | null
          id?: string
          nom?: string
          ordre?: number | null
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_annonces_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories_annonces"
            referencedColumns: ["id"]
          },
        ]
      }
      cedules_hypothecaires: {
        Row: {
          created_at: string | null
          date_creation: string | null
          hypotheque_id: string | null
          id: string
          immeuble_id: string
          lieu_depot: string | null
          montant: number
          notes: string | null
          numero_cedule: string | null
          rang: number | null
          type_cedule: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_creation?: string | null
          hypotheque_id?: string | null
          id?: string
          immeuble_id: string
          lieu_depot?: string | null
          montant: number
          notes?: string | null
          numero_cedule?: string | null
          rang?: number | null
          type_cedule?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_creation?: string | null
          hypotheque_id?: string | null
          id?: string
          immeuble_id?: string
          lieu_depot?: string | null
          montant?: number
          notes?: string | null
          numero_cedule?: string | null
          rang?: number | null
          type_cedule?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cedules_hypothecaires_hypotheque_id_fkey"
            columns: ["hypotheque_id"]
            isOneToOne: false
            referencedRelation: "hypotheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cedules_hypothecaires_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_agents: {
        Row: {
          agent_id: string
          client_id: string
          commission_split: number | null
          created_at: string | null
          id: string
          is_primary: boolean | null
        }
        Insert: {
          agent_id: string
          client_id: string
          commission_split?: number | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
        }
        Update: {
          agent_id?: string
          client_id?: string
          commission_split?: number | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_agents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_candidates: {
        Row: {
          adresse: string | null
          anciennete_mois: number | null
          apport_personnel: number | null
          autres_credits: boolean | null
          charges_extraordinaires: boolean | null
          charges_mensuelles: number | null
          client_id: string
          contact_gerance: string | null
          created_at: string | null
          curatelle: boolean | null
          date_engagement: string | null
          date_naissance: string | null
          depuis_le: string | null
          email: string | null
          employeur: string | null
          gerance_actuelle: string | null
          id: string
          lien_avec_client: string | null
          loyer_actuel: number | null
          montant_charges_extra: number | null
          motif_changement: string | null
          nationalite: string | null
          nom: string
          pieces_actuel: number | null
          poursuites: boolean | null
          prenom: string
          profession: string | null
          revenus_mensuels: number | null
          secteur_activite: string | null
          situation_familiale: string | null
          source_revenus: string | null
          telephone: string | null
          type: string
          type_contrat: string | null
          type_permis: string | null
          updated_at: string | null
        }
        Insert: {
          adresse?: string | null
          anciennete_mois?: number | null
          apport_personnel?: number | null
          autres_credits?: boolean | null
          charges_extraordinaires?: boolean | null
          charges_mensuelles?: number | null
          client_id: string
          contact_gerance?: string | null
          created_at?: string | null
          curatelle?: boolean | null
          date_engagement?: string | null
          date_naissance?: string | null
          depuis_le?: string | null
          email?: string | null
          employeur?: string | null
          gerance_actuelle?: string | null
          id?: string
          lien_avec_client?: string | null
          loyer_actuel?: number | null
          montant_charges_extra?: number | null
          motif_changement?: string | null
          nationalite?: string | null
          nom: string
          pieces_actuel?: number | null
          poursuites?: boolean | null
          prenom: string
          profession?: string | null
          revenus_mensuels?: number | null
          secteur_activite?: string | null
          situation_familiale?: string | null
          source_revenus?: string | null
          telephone?: string | null
          type: string
          type_contrat?: string | null
          type_permis?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse?: string | null
          anciennete_mois?: number | null
          apport_personnel?: number | null
          autres_credits?: boolean | null
          charges_extraordinaires?: boolean | null
          charges_mensuelles?: number | null
          client_id?: string
          contact_gerance?: string | null
          created_at?: string | null
          curatelle?: boolean | null
          date_engagement?: string | null
          date_naissance?: string | null
          depuis_le?: string | null
          email?: string | null
          employeur?: string | null
          gerance_actuelle?: string | null
          id?: string
          lien_avec_client?: string | null
          loyer_actuel?: number | null
          montant_charges_extra?: number | null
          motif_changement?: string | null
          nationalite?: string | null
          nom?: string
          pieces_actuel?: number | null
          poursuites?: boolean | null
          prenom?: string
          profession?: string | null
          revenus_mensuels?: number | null
          secteur_activite?: string | null
          situation_familiale?: string | null
          source_revenus?: string | null
          telephone?: string | null
          type?: string
          type_contrat?: string | null
          type_permis?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_candidates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          agent_id: string
          client_id: string
          content: string
          created_at: string | null
          id: string
          is_completed: boolean | null
          note_type: string | null
          reminder_date: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          client_id: string
          content: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          note_type?: string | null
          reminder_date?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          client_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          note_type?: string | null
          reminder_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          abaninja_client_uuid: string | null
          abaninja_invoice_id: string | null
          abaninja_invoice_ref: string | null
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
          demande_mandat_id: string | null
          depuis_le: string | null
          employeur: string | null
          etat_avancement: string | null
          etat_civil: string | null
          garanties: string | null
          gerance_actuelle: string | null
          id: string
          instrument_musique: boolean | null
          loyer_actuel: number | null
          mandat_date_signature: string | null
          mandat_pdf_url: string | null
          mandat_signature_data: string | null
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
          type_recherche: string | null
          updated_at: string | null
          user_id: string
          utilisation_logement: string | null
          vehicules: boolean | null
        }
        Insert: {
          abaninja_client_uuid?: string | null
          abaninja_invoice_id?: string | null
          abaninja_invoice_ref?: string | null
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
          demande_mandat_id?: string | null
          depuis_le?: string | null
          employeur?: string | null
          etat_avancement?: string | null
          etat_civil?: string | null
          garanties?: string | null
          gerance_actuelle?: string | null
          id?: string
          instrument_musique?: boolean | null
          loyer_actuel?: number | null
          mandat_date_signature?: string | null
          mandat_pdf_url?: string | null
          mandat_signature_data?: string | null
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
          type_recherche?: string | null
          updated_at?: string | null
          user_id: string
          utilisation_logement?: string | null
          vehicules?: boolean | null
        }
        Update: {
          abaninja_client_uuid?: string | null
          abaninja_invoice_id?: string | null
          abaninja_invoice_ref?: string | null
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
          demande_mandat_id?: string | null
          depuis_le?: string | null
          employeur?: string | null
          etat_avancement?: string | null
          etat_civil?: string | null
          garanties?: string | null
          gerance_actuelle?: string | null
          id?: string
          instrument_musique?: boolean | null
          loyer_actuel?: number | null
          mandat_date_signature?: string | null
          mandat_pdf_url?: string | null
          mandat_signature_data?: string | null
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
          type_recherche?: string | null
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
          {
            foreignKeyName: "clients_demande_mandat_id_fkey"
            columns: ["demande_mandat_id"]
            isOneToOne: false
            referencedRelation: "demandes_mandat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      co_proprietaires: {
        Row: {
          adresse: string | null
          civilite: string | null
          created_at: string | null
          date_signature: string | null
          email: string | null
          etat_civil: string | null
          id: string
          immeuble_id: string
          nom: string
          prenom: string
          quote_part: number | null
          regime_matrimonial: string | null
          signature_obtenue: boolean | null
          signature_requise: boolean | null
          telephone: string | null
          type_lien: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          adresse?: string | null
          civilite?: string | null
          created_at?: string | null
          date_signature?: string | null
          email?: string | null
          etat_civil?: string | null
          id?: string
          immeuble_id: string
          nom: string
          prenom: string
          quote_part?: number | null
          regime_matrimonial?: string | null
          signature_obtenue?: boolean | null
          signature_requise?: boolean | null
          telephone?: string | null
          type_lien: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          adresse?: string | null
          civilite?: string | null
          created_at?: string | null
          date_signature?: string | null
          email?: string | null
          etat_civil?: string | null
          id?: string
          immeuble_id?: string
          nom?: string
          prenom?: string
          quote_part?: number | null
          regime_matrimonial?: string | null
          signature_obtenue?: boolean | null
          signature_requise?: boolean | null
          telephone?: string | null
          type_lien?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "co_proprietaires_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
        ]
      }
      commentaires_developpement: {
        Row: {
          auteur_id: string
          contenu: string
          created_at: string | null
          est_interne: boolean | null
          id: string
          projet_id: string
        }
        Insert: {
          auteur_id: string
          contenu: string
          created_at?: string | null
          est_interne?: boolean | null
          id?: string
          projet_id: string
        }
        Update: {
          auteur_id?: string
          contenu?: string
          created_at?: string | null
          est_interne?: boolean | null
          id?: string
          projet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commentaires_developpement_auteur_id_fkey"
            columns: ["auteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commentaires_developpement_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets_developpement"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          adresse: string | null
          agent_id: string
          civilite: string | null
          code_postal: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string | null
          email: string | null
          entreprise: string | null
          fonction: string | null
          id: string
          is_favorite: boolean | null
          nom: string
          notes: string | null
          prenom: string | null
          tags: string[] | null
          telephone: string | null
          telephone_secondaire: string | null
          updated_at: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          agent_id: string
          civilite?: string | null
          code_postal?: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          email?: string | null
          entreprise?: string | null
          fonction?: string | null
          id?: string
          is_favorite?: boolean | null
          nom: string
          notes?: string | null
          prenom?: string | null
          tags?: string[] | null
          telephone?: string | null
          telephone_secondaire?: string | null
          updated_at?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          agent_id?: string
          civilite?: string | null
          code_postal?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          email?: string | null
          entreprise?: string | null
          fonction?: string | null
          id?: string
          is_favorite?: boolean | null
          nom?: string
          notes?: string | null
          prenom?: string | null
          tags?: string[] | null
          telephone?: string | null
          telephone_secondaire?: string | null
          updated_at?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_agents: {
        Row: {
          agent_id: string
          conversation_id: string
          id: string
          joined_at: string | null
        }
        Insert: {
          agent_id: string
          conversation_id: string
          id?: string
          joined_at?: string | null
        }
        Update: {
          agent_id?: string
          conversation_id?: string
          id?: string
          joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_agents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          admin_user_id: string | null
          agent_id: string
          client_id: string | null
          client_name: string | null
          conversation_type: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          last_message_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          admin_user_id?: string | null
          agent_id: string
          client_id?: string | null
          client_name?: string | null
          conversation_type?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          admin_user_id?: string | null
          agent_id?: string
          client_id?: string | null
          client_name?: string | null
          conversation_type?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      conversations_annonces: {
        Row: {
          annonce_id: string | null
          archive_par_1: boolean | null
          archive_par_2: boolean | null
          bloque_par_1: boolean | null
          bloque_par_2: boolean | null
          created_at: string | null
          dernier_message_at: string | null
          id: string
          participant_1_id: string
          participant_2_id: string
        }
        Insert: {
          annonce_id?: string | null
          archive_par_1?: boolean | null
          archive_par_2?: boolean | null
          bloque_par_1?: boolean | null
          bloque_par_2?: boolean | null
          created_at?: string | null
          dernier_message_at?: string | null
          id?: string
          participant_1_id: string
          participant_2_id: string
        }
        Update: {
          annonce_id?: string | null
          archive_par_1?: boolean | null
          archive_par_2?: boolean | null
          bloque_par_1?: boolean | null
          bloque_par_2?: boolean | null
          created_at?: string | null
          dernier_message_at?: string | null
          id?: string
          participant_1_id?: string
          participant_2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_annonces_annonce_id_fkey"
            columns: ["annonce_id"]
            isOneToOne: false
            referencedRelation: "annonces_publiques"
            referencedColumns: ["id"]
          },
        ]
      }
      coursiers: {
        Row: {
          created_at: string
          email: string | null
          iban: string | null
          id: string
          nom: string
          prenom: string
          statut: string
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          nom?: string
          prenom?: string
          statut?: string
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          nom?: string
          prenom?: string
          statut?: string
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coursiers_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      default_agent_goals: {
        Row: {
          created_at: string | null
          description: string | null
          goal_type: string
          id: string
          is_active: boolean | null
          period: string
          target_max: number
          target_min: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          period: string
          target_max?: number
          target_min?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          period?: string
          target_max?: number
          target_min?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      demandes_mandat: {
        Row: {
          abaninja_client_uuid: string | null
          abaninja_invoice_id: string | null
          abaninja_invoice_ref: string | null
          adresse: string
          animaux: boolean | null
          apport_personnel: number | null
          budget_max: number
          candidats: Json | null
          cgv_acceptees: boolean
          cgv_acceptees_at: string | null
          charges_extraordinaires: boolean | null
          code_promo: string | null
          contact_gerance: string
          created_at: string | null
          curatelle: boolean | null
          date_engagement: string | null
          date_naissance: string
          date_paiement: string | null
          decouverte_agence: string
          depuis_le: string
          documents_uploades: Json | null
          email: string
          employeur: string
          etat_civil: string
          gerance_actuelle: string
          id: string
          instrument_musique: boolean | null
          loyer_actuel: number
          montant_acompte: number | null
          montant_charges_extra: number | null
          motif_changement: string
          nationalite: string
          nom: string
          nombre_occupants: number
          notes_admin: string | null
          numero_plaques: string | null
          pieces_actuel: number
          pieces_recherche: string
          poursuites: boolean | null
          prenom: string
          processed_at: string | null
          processed_by: string | null
          profession: string
          region_recherche: string
          revenus_mensuels: number
          signature_data: string | null
          souhaits_particuliers: string | null
          statut: string | null
          telephone: string
          type_bien: string
          type_permis: string
          type_recherche: string
          updated_at: string | null
          user_id: string | null
          utilisation_logement: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vehicules: boolean | null
        }
        Insert: {
          abaninja_client_uuid?: string | null
          abaninja_invoice_id?: string | null
          abaninja_invoice_ref?: string | null
          adresse: string
          animaux?: boolean | null
          apport_personnel?: number | null
          budget_max?: number
          candidats?: Json | null
          cgv_acceptees?: boolean
          cgv_acceptees_at?: string | null
          charges_extraordinaires?: boolean | null
          code_promo?: string | null
          contact_gerance: string
          created_at?: string | null
          curatelle?: boolean | null
          date_engagement?: string | null
          date_naissance: string
          date_paiement?: string | null
          decouverte_agence: string
          depuis_le: string
          documents_uploades?: Json | null
          email: string
          employeur: string
          etat_civil: string
          gerance_actuelle: string
          id?: string
          instrument_musique?: boolean | null
          loyer_actuel?: number
          montant_acompte?: number | null
          montant_charges_extra?: number | null
          motif_changement: string
          nationalite: string
          nom: string
          nombre_occupants?: number
          notes_admin?: string | null
          numero_plaques?: string | null
          pieces_actuel?: number
          pieces_recherche: string
          poursuites?: boolean | null
          prenom: string
          processed_at?: string | null
          processed_by?: string | null
          profession: string
          region_recherche: string
          revenus_mensuels?: number
          signature_data?: string | null
          souhaits_particuliers?: string | null
          statut?: string | null
          telephone: string
          type_bien: string
          type_permis: string
          type_recherche?: string
          updated_at?: string | null
          user_id?: string | null
          utilisation_logement?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vehicules?: boolean | null
        }
        Update: {
          abaninja_client_uuid?: string | null
          abaninja_invoice_id?: string | null
          abaninja_invoice_ref?: string | null
          adresse?: string
          animaux?: boolean | null
          apport_personnel?: number | null
          budget_max?: number
          candidats?: Json | null
          cgv_acceptees?: boolean
          cgv_acceptees_at?: string | null
          charges_extraordinaires?: boolean | null
          code_promo?: string | null
          contact_gerance?: string
          created_at?: string | null
          curatelle?: boolean | null
          date_engagement?: string | null
          date_naissance?: string
          date_paiement?: string | null
          decouverte_agence?: string
          depuis_le?: string
          documents_uploades?: Json | null
          email?: string
          employeur?: string
          etat_civil?: string
          gerance_actuelle?: string
          id?: string
          instrument_musique?: boolean | null
          loyer_actuel?: number
          montant_acompte?: number | null
          montant_charges_extra?: number | null
          motif_changement?: string
          nationalite?: string
          nom?: string
          nombre_occupants?: number
          notes_admin?: string | null
          numero_plaques?: string | null
          pieces_actuel?: number
          pieces_recherche?: string
          poursuites?: boolean | null
          prenom?: string
          processed_at?: string | null
          processed_by?: string | null
          profession?: string
          region_recherche?: string
          revenus_mensuels?: number
          signature_data?: string | null
          souhaits_particuliers?: string | null
          statut?: string | null
          telephone?: string
          type_bien?: string
          type_permis?: string
          type_recherche?: string
          updated_at?: string | null
          user_id?: string | null
          utilisation_logement?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vehicules?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "demandes_mandat_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_requests: {
        Row: {
          candidate_id: string | null
          client_id: string
          created_at: string | null
          document_label: string
          document_type: string
          fulfilled_at: string | null
          id: string
          note: string | null
          requested_by: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          candidate_id?: string | null
          client_id: string
          created_at?: string | null
          document_label: string
          document_type: string
          fulfilled_at?: string | null
          id?: string
          note?: string | null
          requested_by: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string | null
          client_id?: string
          created_at?: string | null
          document_label?: string
          document_type?: string
          fulfilled_at?: string | null
          id?: string
          note?: string | null
          requested_by?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "client_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          candidate_id: string | null
          client_id: string | null
          created_at: string | null
          date_upload: string | null
          id: string
          nom: string
          offre_id: string | null
          statut: string | null
          taille: number | null
          type: string
          type_document: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          candidate_id?: string | null
          client_id?: string | null
          created_at?: string | null
          date_upload?: string | null
          id?: string
          nom: string
          offre_id?: string | null
          statut?: string | null
          taille?: number | null
          type: string
          type_document?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          candidate_id?: string | null
          client_id?: string | null
          created_at?: string | null
          date_upload?: string | null
          id?: string
          nom?: string
          offre_id?: string | null
          statut?: string | null
          taille?: number | null
          type?: string
          type_document?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "client_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_developpement: {
        Row: {
          ajoute_par: string | null
          created_at: string | null
          fichier_url: string
          id: string
          nom_fichier: string
          projet_id: string
          taille_fichier: number | null
          type_document: string
          visibilite: string | null
        }
        Insert: {
          ajoute_par?: string | null
          created_at?: string | null
          fichier_url: string
          id?: string
          nom_fichier: string
          projet_id: string
          taille_fichier?: number | null
          type_document: string
          visibilite?: string | null
        }
        Update: {
          ajoute_par?: string | null
          created_at?: string | null
          fichier_url?: string
          id?: string
          nom_fichier?: string
          projet_id?: string
          taille_fichier?: number | null
          type_document?: string
          visibilite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_developpement_ajoute_par_fkey"
            columns: ["ajoute_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_developpement_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets_developpement"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_immeuble: {
        Row: {
          annee: number | null
          confidentialite: string | null
          created_at: string | null
          date_document: string | null
          description: string | null
          est_confidentiel: boolean | null
          id: string
          immeuble_id: string | null
          locataire_id: string | null
          lot_id: string | null
          mime_type: string | null
          nom: string
          tags: Json | null
          taille: number | null
          type_document: string
          updated_at: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          annee?: number | null
          confidentialite?: string | null
          created_at?: string | null
          date_document?: string | null
          description?: string | null
          est_confidentiel?: boolean | null
          id?: string
          immeuble_id?: string | null
          locataire_id?: string | null
          lot_id?: string | null
          mime_type?: string | null
          nom: string
          tags?: Json | null
          taille?: number | null
          type_document: string
          updated_at?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          annee?: number | null
          confidentialite?: string | null
          created_at?: string | null
          date_document?: string | null
          description?: string | null
          est_confidentiel?: boolean | null
          id?: string
          immeuble_id?: string | null
          locataire_id?: string | null
          lot_id?: string | null
          mime_type?: string | null
          nom?: string
          tags?: Json | null
          taille?: number | null
          type_document?: string
          updated_at?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_immeuble_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_immeuble_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires_immeuble"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_immeuble_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      email_configurations: {
        Row: {
          created_at: string | null
          display_name: string | null
          email_from: string
          id: string
          is_active: boolean | null
          signature_html: string | null
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_secure: boolean | null
          smtp_user: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email_from: string
          id?: string
          is_active?: boolean | null
          signature_html?: string | null
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_secure?: boolean | null
          smtp_user: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email_from?: string
          id?: string
          is_active?: boolean | null
          signature_html?: string | null
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_secure?: boolean | null
          smtp_user?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_template: string
          category: string
          created_at: string
          id: string
          is_system: boolean
          name: string
          subject_template: string | null
          updated_at: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          body_template: string
          category?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          subject_template?: string | null
          updated_at?: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          body_template?: string
          category?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          subject_template?: string | null
          updated_at?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
      employes: {
        Row: {
          adresse: string | null
          avs_number: string | null
          banque: string | null
          bareme_impot_source: string | null
          canton_domicile: string | null
          canton_travail: string | null
          code_postal: string | null
          created_at: string | null
          date_engagement: string | null
          date_fin: string | null
          date_naissance: string | null
          email: string | null
          etat_civil: string | null
          iban: string | null
          id: string
          is_independant: boolean | null
          mode_remuneration: string
          nationalite: string | null
          nom: string
          nombre_enfants: number | null
          notes: string | null
          poste: string | null
          prenom: string
          salaire_horaire: number | null
          salaire_mensuel: number | null
          statut: string | null
          taux_activite: number | null
          telephone: string | null
          type_contrat: string | null
          type_permis: string | null
          updated_at: string | null
          user_id: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          avs_number?: string | null
          banque?: string | null
          bareme_impot_source?: string | null
          canton_domicile?: string | null
          canton_travail?: string | null
          code_postal?: string | null
          created_at?: string | null
          date_engagement?: string | null
          date_fin?: string | null
          date_naissance?: string | null
          email?: string | null
          etat_civil?: string | null
          iban?: string | null
          id?: string
          is_independant?: boolean | null
          mode_remuneration?: string
          nationalite?: string | null
          nom: string
          nombre_enfants?: number | null
          notes?: string | null
          poste?: string | null
          prenom: string
          salaire_horaire?: number | null
          salaire_mensuel?: number | null
          statut?: string | null
          taux_activite?: number | null
          telephone?: string | null
          type_contrat?: string | null
          type_permis?: string | null
          updated_at?: string | null
          user_id?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          avs_number?: string | null
          banque?: string | null
          bareme_impot_source?: string | null
          canton_domicile?: string | null
          canton_travail?: string | null
          code_postal?: string | null
          created_at?: string | null
          date_engagement?: string | null
          date_fin?: string | null
          date_naissance?: string | null
          email?: string | null
          etat_civil?: string | null
          iban?: string | null
          id?: string
          is_independant?: boolean | null
          mode_remuneration?: string
          nationalite?: string | null
          nom?: string
          nombre_enfants?: number | null
          notes?: string | null
          poste?: string | null
          prenom?: string
          salaire_horaire?: number | null
          salaire_mensuel?: number | null
          statut?: string | null
          taux_activite?: number | null
          telephone?: string | null
          type_contrat?: string | null
          type_permis?: string | null
          updated_at?: string | null
          user_id?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      favoris_annonces: {
        Row: {
          alerte_prix: boolean | null
          annonce_id: string
          created_at: string | null
          id: string
          note_personnelle: string | null
          user_id: string
        }
        Insert: {
          alerte_prix?: boolean | null
          annonce_id: string
          created_at?: string | null
          id?: string
          note_personnelle?: string | null
          user_id: string
        }
        Update: {
          alerte_prix?: boolean | null
          annonce_id?: string
          created_at?: string | null
          id?: string
          note_personnelle?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoris_annonces_annonce_id_fkey"
            columns: ["annonce_id"]
            isOneToOne: false
            referencedRelation: "annonces_publiques"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_salaire: {
        Row: {
          absences_payees: number | null
          annee: number
          autres_deductions: number | null
          cout_total_employeur: number | null
          created_at: string | null
          created_by: string | null
          date_paiement: string | null
          detail_autres_deductions: string | null
          detail_commissions: Json | null
          employe_id: string
          heures_supplementaires: number | null
          id: string
          mode_remuneration: string
          mois: number
          montant_aanp: number | null
          montant_aap: number | null
          montant_ac: number | null
          montant_ac_employeur: number | null
          montant_af: number | null
          montant_avs: number | null
          montant_avs_employeur: number | null
          montant_commissions: number | null
          montant_ijm: number | null
          montant_impot_source: number | null
          montant_lpcfam: number | null
          montant_lpcfam_employeur: number | null
          montant_lpp: number | null
          montant_lpp_employeur: number | null
          nombre_heures: number | null
          notes: string | null
          pdf_url: string | null
          primes: number | null
          salaire_base: number | null
          salaire_brut: number | null
          salaire_net: number | null
          statut: string | null
          taux_aanp: number | null
          taux_aap: number | null
          taux_ac: number | null
          taux_ac_employeur: number | null
          taux_af: number | null
          taux_avs: number | null
          taux_avs_employeur: number | null
          taux_horaire_utilise: number | null
          taux_ijm: number | null
          taux_impot_source: number | null
          taux_lpcfam: number | null
          taux_lpcfam_employeur: number | null
          total_charges_employeur: number | null
          total_deductions: number | null
          updated_at: string | null
        }
        Insert: {
          absences_payees?: number | null
          annee: number
          autres_deductions?: number | null
          cout_total_employeur?: number | null
          created_at?: string | null
          created_by?: string | null
          date_paiement?: string | null
          detail_autres_deductions?: string | null
          detail_commissions?: Json | null
          employe_id: string
          heures_supplementaires?: number | null
          id?: string
          mode_remuneration?: string
          mois: number
          montant_aanp?: number | null
          montant_aap?: number | null
          montant_ac?: number | null
          montant_ac_employeur?: number | null
          montant_af?: number | null
          montant_avs?: number | null
          montant_avs_employeur?: number | null
          montant_commissions?: number | null
          montant_ijm?: number | null
          montant_impot_source?: number | null
          montant_lpcfam?: number | null
          montant_lpcfam_employeur?: number | null
          montant_lpp?: number | null
          montant_lpp_employeur?: number | null
          nombre_heures?: number | null
          notes?: string | null
          pdf_url?: string | null
          primes?: number | null
          salaire_base?: number | null
          salaire_brut?: number | null
          salaire_net?: number | null
          statut?: string | null
          taux_aanp?: number | null
          taux_aap?: number | null
          taux_ac?: number | null
          taux_ac_employeur?: number | null
          taux_af?: number | null
          taux_avs?: number | null
          taux_avs_employeur?: number | null
          taux_horaire_utilise?: number | null
          taux_ijm?: number | null
          taux_impot_source?: number | null
          taux_lpcfam?: number | null
          taux_lpcfam_employeur?: number | null
          total_charges_employeur?: number | null
          total_deductions?: number | null
          updated_at?: string | null
        }
        Update: {
          absences_payees?: number | null
          annee?: number
          autres_deductions?: number | null
          cout_total_employeur?: number | null
          created_at?: string | null
          created_by?: string | null
          date_paiement?: string | null
          detail_autres_deductions?: string | null
          detail_commissions?: Json | null
          employe_id?: string
          heures_supplementaires?: number | null
          id?: string
          mode_remuneration?: string
          mois?: number
          montant_aanp?: number | null
          montant_aap?: number | null
          montant_ac?: number | null
          montant_ac_employeur?: number | null
          montant_af?: number | null
          montant_avs?: number | null
          montant_avs_employeur?: number | null
          montant_commissions?: number | null
          montant_ijm?: number | null
          montant_impot_source?: number | null
          montant_lpcfam?: number | null
          montant_lpcfam_employeur?: number | null
          montant_lpp?: number | null
          montant_lpp_employeur?: number | null
          nombre_heures?: number | null
          notes?: string | null
          pdf_url?: string | null
          primes?: number | null
          salaire_base?: number | null
          salaire_brut?: number | null
          salaire_net?: number | null
          statut?: string | null
          taux_aanp?: number | null
          taux_aap?: number | null
          taux_ac?: number | null
          taux_ac_employeur?: number | null
          taux_af?: number | null
          taux_avs?: number | null
          taux_avs_employeur?: number | null
          taux_horaire_utilise?: number | null
          taux_ijm?: number | null
          taux_impot_source?: number | null
          taux_lpcfam?: number | null
          taux_lpcfam_employeur?: number | null
          total_charges_employeur?: number | null
          total_deductions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiches_salaire_employe_id_fkey"
            columns: ["employe_id"]
            isOneToOne: false
            referencedRelation: "employes"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string | null
          calendar_id: string
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hypotheques: {
        Row: {
          compte_3a: string | null
          creancier: string
          created_at: string | null
          date_debut: string | null
          date_fin: string | null
          date_prochaine_echeance: string | null
          document_url: string | null
          id: string
          immeuble_id: string
          marge_saron: number | null
          montant_actuel: number | null
          montant_amortissement: number | null
          montant_initial: number
          notes: string | null
          numero: string | null
          numero_pret: string | null
          periodicite_amortissement: string | null
          rang: number | null
          taux_interet: number | null
          type_amortissement: string | null
          type_taux: string | null
          updated_at: string | null
        }
        Insert: {
          compte_3a?: string | null
          creancier: string
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_prochaine_echeance?: string | null
          document_url?: string | null
          id?: string
          immeuble_id: string
          marge_saron?: number | null
          montant_actuel?: number | null
          montant_amortissement?: number | null
          montant_initial: number
          notes?: string | null
          numero?: string | null
          numero_pret?: string | null
          periodicite_amortissement?: string | null
          rang?: number | null
          taux_interet?: number | null
          type_amortissement?: string | null
          type_taux?: string | null
          updated_at?: string | null
        }
        Update: {
          compte_3a?: string | null
          creancier?: string
          created_at?: string | null
          date_debut?: string | null
          date_fin?: string | null
          date_prochaine_echeance?: string | null
          document_url?: string | null
          id?: string
          immeuble_id?: string
          marge_saron?: number | null
          montant_actuel?: number | null
          montant_amortissement?: number | null
          montant_initial?: number
          notes?: string | null
          numero?: string | null
          numero_pret?: string | null
          periodicite_amortissement?: string | null
          rang?: number | null
          taux_interet?: number | null
          type_amortissement?: string | null
          type_taux?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hypotheques_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
        ]
      }
      imap_configurations: {
        Row: {
          created_at: string | null
          id: string
          imap_host: string
          imap_password: string
          imap_port: number
          imap_secure: boolean | null
          imap_user: string
          is_active: boolean | null
          last_sync_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          imap_host: string
          imap_password: string
          imap_port?: number
          imap_secure?: boolean | null
          imap_user: string
          is_active?: boolean | null
          last_sync_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          imap_host?: string
          imap_password?: string
          imap_port?: number
          imap_secure?: boolean | null
          imap_user?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      immeubles: {
        Row: {
          accessibilite_data: Json | null
          accord_proprietaire_publication: boolean | null
          administrateur_ppe: string | null
          adresse: string
          agent_responsable_id: string | null
          annee_construction: number | null
          annee_renovation: number | null
          annonces_comparables: Json | null
          bruit_ferroviaire_jour: number | null
          bruit_ferroviaire_nuit: number | null
          bruit_routier_jour: number | null
          bruit_routier_nuit: number | null
          canton: string | null
          caracteristiques_entourage: Json | null
          caracteristiques_vue: Json | null
          categorie_ofs: string | null
          charges_chauffage_ec: number | null
          charges_locataire: number | null
          charges_ppe: number | null
          classe_energetique: string | null
          classification_batiment: string | null
          classification_ofs: string | null
          code_postal: string | null
          combustible: string | null
          commission_agence_prevue: number | null
          commission_mode: string | null
          commodites_details: Json | null
          commodites_scores: Json | null
          commune_rf: string | null
          created_at: string | null
          date_accord_publication: string | null
          date_acquisition: string | null
          date_derniere_estimation: string | null
          date_mise_en_vente: string | null
          date_visite_initiale: string | null
          description_commerciale: string | null
          distance_autoroute: number | null
          distance_banque: number | null
          distance_bus: number | null
          distance_commerces: number | null
          distance_ecole_primaire: number | null
          distance_ecole_secondaire: number | null
          distance_garderie: number | null
          distance_gare: number | null
          distance_gymnase: number | null
          distance_poste: number | null
          donnees_distribution_prix: Json | null
          donnees_socio_economiques: Json | null
          duree_publication_moyenne: number | null
          egaid: string | null
          egid: string | null
          egrid: string | null
          email_locataire: string | null
          emprise_sol: number | null
          emprise_sol_m2: number | null
          ensoleillement_data: Json | null
          equipements_cuisine: Json | null
          equipements_exterieur: Json | null
          equipements_interieur: Json | null
          equipements_securite: Json | null
          est_apport_affaire: boolean | null
          est_loue: boolean | null
          estimation_agent: number | null
          estimation_date: string | null
          estimation_methode: string | null
          estimation_notes: string | null
          estimation_prix_m2: number | null
          estimation_valeur_basse: number | null
          estimation_valeur_haute: number | null
          estimation_valeur_recommandee: number | null
          etage: number | null
          etat_bien: Json | null
          etat_locatif_annuel: number | null
          evolution_prix_median_1an: number | null
          evolution_prix_secteur: number | null
          exposition: Json | null
          facteurs_negatifs: Json | null
          facteurs_positifs: Json | null
          folio_rf: string | null
          fonds_renovation: number | null
          frequence_rapport: string | null
          hauteur_plafond: number | null
          id: string
          indice_energetique: number | null
          installation_solaire_actuelle: string | null
          locataire_actuel: string | null
          logements_details: Json | null
          lots_rf: string | null
          loyer_actuel: number | null
          loyer_estime_cc: number | null
          loyer_estime_hc: number | null
          mode_exploitation: string | null
          nb_biens_comparables: number | null
          nb_chambres: number | null
          nb_etages_batiment: number | null
          nb_garages: number | null
          nb_logements: number | null
          nb_nouvelles_annonces: number | null
          nb_places_ext: number | null
          nb_places_int: number | null
          nb_salles_eau: number | null
          nb_unites: number | null
          nb_wc: number | null
          niveau_bruit_jour: number | null
          niveau_bruit_nuit: number | null
          no_eca: string | null
          no_rf_base: string | null
          no_rf_feuillet: string | null
          nom: string
          nombre_pieces: number | null
          notes: string | null
          numero_feuillet: string | null
          numero_officiel_batiment: string | null
          numero_parcelle: string | null
          pays: string | null
          permis_construire: Json | null
          places_parc_incluses: boolean | null
          plan_affectation_nom: string | null
          plan_affectation_type: string | null
          points_forts: string[] | null
          potentiel_developpement: string | null
          potentiel_solaire: Json | null
          potentiel_solaire_aptitude: string | null
          potentiel_solaire_exposition: number | null
          prix_acquisition: number | null
          prix_commercial: number | null
          prix_m2_secteur: number | null
          prix_median_secteur: number | null
          prix_vendeur: number | null
          prix_vente_demande: number | null
          prix_vente_estime: number | null
          proprietaire_id: string
          publier_espace_acheteur: boolean | null
          rapport_estimation_images: Json | null
          recommandation_commercialisation: string | null
          reglement_urbanisme: string | null
          rendement_brut: number | null
          rendement_net: number | null
          restrictions_parcelle: Json | null
          score_sous_exploitation: number | null
          source_energie_chauffage: string | null
          sous_type_bien: string | null
          statut: string | null
          statut_vente: string | null
          strategie_vente: string | null
          surface_au_sol_batiment: number | null
          surface_au_sol_garage: number | null
          surface_balcon: number | null
          surface_jardin: number | null
          surface_logement_totale: number | null
          surface_parcelle: number | null
          surface_ppe: number | null
          surface_reference_energetique: number | null
          surface_terrasse: number | null
          surface_totale: number | null
          systeme_chauffage_principal: Json | null
          systeme_chauffage_supplementaire: Json | null
          systeme_eau_chaude: Json | null
          systeme_eau_chaude_supplementaire: Json | null
          taux_vacance: number | null
          tel_locataire: string | null
          tendance_marche: string | null
          travaux_plus_value: number | null
          type_bien: string | null
          type_chauffage: string | null
          type_parcelle: string | null
          type_sol: Json | null
          updated_at: string | null
          valeur_assurance: number | null
          valeur_eca: number | null
          valeur_estimee: number | null
          valeur_fiscale: number | null
          ville: string | null
          volume_batiment: number | null
          volume_eca: number | null
          zone_affectation: string | null
          zone_construction: string | null
        }
        Insert: {
          accessibilite_data?: Json | null
          accord_proprietaire_publication?: boolean | null
          administrateur_ppe?: string | null
          adresse: string
          agent_responsable_id?: string | null
          annee_construction?: number | null
          annee_renovation?: number | null
          annonces_comparables?: Json | null
          bruit_ferroviaire_jour?: number | null
          bruit_ferroviaire_nuit?: number | null
          bruit_routier_jour?: number | null
          bruit_routier_nuit?: number | null
          canton?: string | null
          caracteristiques_entourage?: Json | null
          caracteristiques_vue?: Json | null
          categorie_ofs?: string | null
          charges_chauffage_ec?: number | null
          charges_locataire?: number | null
          charges_ppe?: number | null
          classe_energetique?: string | null
          classification_batiment?: string | null
          classification_ofs?: string | null
          code_postal?: string | null
          combustible?: string | null
          commission_agence_prevue?: number | null
          commission_mode?: string | null
          commodites_details?: Json | null
          commodites_scores?: Json | null
          commune_rf?: string | null
          created_at?: string | null
          date_accord_publication?: string | null
          date_acquisition?: string | null
          date_derniere_estimation?: string | null
          date_mise_en_vente?: string | null
          date_visite_initiale?: string | null
          description_commerciale?: string | null
          distance_autoroute?: number | null
          distance_banque?: number | null
          distance_bus?: number | null
          distance_commerces?: number | null
          distance_ecole_primaire?: number | null
          distance_ecole_secondaire?: number | null
          distance_garderie?: number | null
          distance_gare?: number | null
          distance_gymnase?: number | null
          distance_poste?: number | null
          donnees_distribution_prix?: Json | null
          donnees_socio_economiques?: Json | null
          duree_publication_moyenne?: number | null
          egaid?: string | null
          egid?: string | null
          egrid?: string | null
          email_locataire?: string | null
          emprise_sol?: number | null
          emprise_sol_m2?: number | null
          ensoleillement_data?: Json | null
          equipements_cuisine?: Json | null
          equipements_exterieur?: Json | null
          equipements_interieur?: Json | null
          equipements_securite?: Json | null
          est_apport_affaire?: boolean | null
          est_loue?: boolean | null
          estimation_agent?: number | null
          estimation_date?: string | null
          estimation_methode?: string | null
          estimation_notes?: string | null
          estimation_prix_m2?: number | null
          estimation_valeur_basse?: number | null
          estimation_valeur_haute?: number | null
          estimation_valeur_recommandee?: number | null
          etage?: number | null
          etat_bien?: Json | null
          etat_locatif_annuel?: number | null
          evolution_prix_median_1an?: number | null
          evolution_prix_secteur?: number | null
          exposition?: Json | null
          facteurs_negatifs?: Json | null
          facteurs_positifs?: Json | null
          folio_rf?: string | null
          fonds_renovation?: number | null
          frequence_rapport?: string | null
          hauteur_plafond?: number | null
          id?: string
          indice_energetique?: number | null
          installation_solaire_actuelle?: string | null
          locataire_actuel?: string | null
          logements_details?: Json | null
          lots_rf?: string | null
          loyer_actuel?: number | null
          loyer_estime_cc?: number | null
          loyer_estime_hc?: number | null
          mode_exploitation?: string | null
          nb_biens_comparables?: number | null
          nb_chambres?: number | null
          nb_etages_batiment?: number | null
          nb_garages?: number | null
          nb_logements?: number | null
          nb_nouvelles_annonces?: number | null
          nb_places_ext?: number | null
          nb_places_int?: number | null
          nb_salles_eau?: number | null
          nb_unites?: number | null
          nb_wc?: number | null
          niveau_bruit_jour?: number | null
          niveau_bruit_nuit?: number | null
          no_eca?: string | null
          no_rf_base?: string | null
          no_rf_feuillet?: string | null
          nom: string
          nombre_pieces?: number | null
          notes?: string | null
          numero_feuillet?: string | null
          numero_officiel_batiment?: string | null
          numero_parcelle?: string | null
          pays?: string | null
          permis_construire?: Json | null
          places_parc_incluses?: boolean | null
          plan_affectation_nom?: string | null
          plan_affectation_type?: string | null
          points_forts?: string[] | null
          potentiel_developpement?: string | null
          potentiel_solaire?: Json | null
          potentiel_solaire_aptitude?: string | null
          potentiel_solaire_exposition?: number | null
          prix_acquisition?: number | null
          prix_commercial?: number | null
          prix_m2_secteur?: number | null
          prix_median_secteur?: number | null
          prix_vendeur?: number | null
          prix_vente_demande?: number | null
          prix_vente_estime?: number | null
          proprietaire_id: string
          publier_espace_acheteur?: boolean | null
          rapport_estimation_images?: Json | null
          recommandation_commercialisation?: string | null
          reglement_urbanisme?: string | null
          rendement_brut?: number | null
          rendement_net?: number | null
          restrictions_parcelle?: Json | null
          score_sous_exploitation?: number | null
          source_energie_chauffage?: string | null
          sous_type_bien?: string | null
          statut?: string | null
          statut_vente?: string | null
          strategie_vente?: string | null
          surface_au_sol_batiment?: number | null
          surface_au_sol_garage?: number | null
          surface_balcon?: number | null
          surface_jardin?: number | null
          surface_logement_totale?: number | null
          surface_parcelle?: number | null
          surface_ppe?: number | null
          surface_reference_energetique?: number | null
          surface_terrasse?: number | null
          surface_totale?: number | null
          systeme_chauffage_principal?: Json | null
          systeme_chauffage_supplementaire?: Json | null
          systeme_eau_chaude?: Json | null
          systeme_eau_chaude_supplementaire?: Json | null
          taux_vacance?: number | null
          tel_locataire?: string | null
          tendance_marche?: string | null
          travaux_plus_value?: number | null
          type_bien?: string | null
          type_chauffage?: string | null
          type_parcelle?: string | null
          type_sol?: Json | null
          updated_at?: string | null
          valeur_assurance?: number | null
          valeur_eca?: number | null
          valeur_estimee?: number | null
          valeur_fiscale?: number | null
          ville?: string | null
          volume_batiment?: number | null
          volume_eca?: number | null
          zone_affectation?: string | null
          zone_construction?: string | null
        }
        Update: {
          accessibilite_data?: Json | null
          accord_proprietaire_publication?: boolean | null
          administrateur_ppe?: string | null
          adresse?: string
          agent_responsable_id?: string | null
          annee_construction?: number | null
          annee_renovation?: number | null
          annonces_comparables?: Json | null
          bruit_ferroviaire_jour?: number | null
          bruit_ferroviaire_nuit?: number | null
          bruit_routier_jour?: number | null
          bruit_routier_nuit?: number | null
          canton?: string | null
          caracteristiques_entourage?: Json | null
          caracteristiques_vue?: Json | null
          categorie_ofs?: string | null
          charges_chauffage_ec?: number | null
          charges_locataire?: number | null
          charges_ppe?: number | null
          classe_energetique?: string | null
          classification_batiment?: string | null
          classification_ofs?: string | null
          code_postal?: string | null
          combustible?: string | null
          commission_agence_prevue?: number | null
          commission_mode?: string | null
          commodites_details?: Json | null
          commodites_scores?: Json | null
          commune_rf?: string | null
          created_at?: string | null
          date_accord_publication?: string | null
          date_acquisition?: string | null
          date_derniere_estimation?: string | null
          date_mise_en_vente?: string | null
          date_visite_initiale?: string | null
          description_commerciale?: string | null
          distance_autoroute?: number | null
          distance_banque?: number | null
          distance_bus?: number | null
          distance_commerces?: number | null
          distance_ecole_primaire?: number | null
          distance_ecole_secondaire?: number | null
          distance_garderie?: number | null
          distance_gare?: number | null
          distance_gymnase?: number | null
          distance_poste?: number | null
          donnees_distribution_prix?: Json | null
          donnees_socio_economiques?: Json | null
          duree_publication_moyenne?: number | null
          egaid?: string | null
          egid?: string | null
          egrid?: string | null
          email_locataire?: string | null
          emprise_sol?: number | null
          emprise_sol_m2?: number | null
          ensoleillement_data?: Json | null
          equipements_cuisine?: Json | null
          equipements_exterieur?: Json | null
          equipements_interieur?: Json | null
          equipements_securite?: Json | null
          est_apport_affaire?: boolean | null
          est_loue?: boolean | null
          estimation_agent?: number | null
          estimation_date?: string | null
          estimation_methode?: string | null
          estimation_notes?: string | null
          estimation_prix_m2?: number | null
          estimation_valeur_basse?: number | null
          estimation_valeur_haute?: number | null
          estimation_valeur_recommandee?: number | null
          etage?: number | null
          etat_bien?: Json | null
          etat_locatif_annuel?: number | null
          evolution_prix_median_1an?: number | null
          evolution_prix_secteur?: number | null
          exposition?: Json | null
          facteurs_negatifs?: Json | null
          facteurs_positifs?: Json | null
          folio_rf?: string | null
          fonds_renovation?: number | null
          frequence_rapport?: string | null
          hauteur_plafond?: number | null
          id?: string
          indice_energetique?: number | null
          installation_solaire_actuelle?: string | null
          locataire_actuel?: string | null
          logements_details?: Json | null
          lots_rf?: string | null
          loyer_actuel?: number | null
          loyer_estime_cc?: number | null
          loyer_estime_hc?: number | null
          mode_exploitation?: string | null
          nb_biens_comparables?: number | null
          nb_chambres?: number | null
          nb_etages_batiment?: number | null
          nb_garages?: number | null
          nb_logements?: number | null
          nb_nouvelles_annonces?: number | null
          nb_places_ext?: number | null
          nb_places_int?: number | null
          nb_salles_eau?: number | null
          nb_unites?: number | null
          nb_wc?: number | null
          niveau_bruit_jour?: number | null
          niveau_bruit_nuit?: number | null
          no_eca?: string | null
          no_rf_base?: string | null
          no_rf_feuillet?: string | null
          nom?: string
          nombre_pieces?: number | null
          notes?: string | null
          numero_feuillet?: string | null
          numero_officiel_batiment?: string | null
          numero_parcelle?: string | null
          pays?: string | null
          permis_construire?: Json | null
          places_parc_incluses?: boolean | null
          plan_affectation_nom?: string | null
          plan_affectation_type?: string | null
          points_forts?: string[] | null
          potentiel_developpement?: string | null
          potentiel_solaire?: Json | null
          potentiel_solaire_aptitude?: string | null
          potentiel_solaire_exposition?: number | null
          prix_acquisition?: number | null
          prix_commercial?: number | null
          prix_m2_secteur?: number | null
          prix_median_secteur?: number | null
          prix_vendeur?: number | null
          prix_vente_demande?: number | null
          prix_vente_estime?: number | null
          proprietaire_id?: string
          publier_espace_acheteur?: boolean | null
          rapport_estimation_images?: Json | null
          recommandation_commercialisation?: string | null
          reglement_urbanisme?: string | null
          rendement_brut?: number | null
          rendement_net?: number | null
          restrictions_parcelle?: Json | null
          score_sous_exploitation?: number | null
          source_energie_chauffage?: string | null
          sous_type_bien?: string | null
          statut?: string | null
          statut_vente?: string | null
          strategie_vente?: string | null
          surface_au_sol_batiment?: number | null
          surface_au_sol_garage?: number | null
          surface_balcon?: number | null
          surface_jardin?: number | null
          surface_logement_totale?: number | null
          surface_parcelle?: number | null
          surface_ppe?: number | null
          surface_reference_energetique?: number | null
          surface_terrasse?: number | null
          surface_totale?: number | null
          systeme_chauffage_principal?: Json | null
          systeme_chauffage_supplementaire?: Json | null
          systeme_eau_chaude?: Json | null
          systeme_eau_chaude_supplementaire?: Json | null
          taux_vacance?: number | null
          tel_locataire?: string | null
          tendance_marche?: string | null
          travaux_plus_value?: number | null
          type_bien?: string | null
          type_chauffage?: string | null
          type_parcelle?: string | null
          type_sol?: Json | null
          updated_at?: string | null
          valeur_assurance?: number | null
          valeur_eca?: number | null
          valeur_estimee?: number | null
          valeur_fiscale?: number | null
          ville?: string | null
          volume_batiment?: number | null
          volume_eca?: number | null
          zone_affectation?: string | null
          zone_construction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immeubles_agent_responsable_id_fkey"
            columns: ["agent_responsable_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immeubles_proprietaire_id_fkey"
            columns: ["proprietaire_id"]
            isOneToOne: false
            referencedRelation: "proprietaires"
            referencedColumns: ["id"]
          },
        ]
      }
      interets_acheteur: {
        Row: {
          client_id: string
          created_at: string | null
          date_visite: string | null
          id: string
          immeuble_id: string
          message: string | null
          notes_agent: string | null
          statut: string | null
          type_interet: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          date_visite?: string | null
          id?: string
          immeuble_id: string
          message?: string | null
          notes_agent?: string | null
          statut?: string | null
          type_interet: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          date_visite?: string | null
          id?: string
          immeuble_id?: string
          message?: string | null
          notes_agent?: string | null
          statut?: string | null
          type_interet?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interets_acheteur_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interets_acheteur_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          a_garant: boolean | null
          accord_bancaire: boolean | null
          apport_personnel: string | null
          budget: string | null
          contacted: boolean | null
          created_at: string | null
          email: string
          id: string
          is_qualified: boolean | null
          localite: string | null
          nom: string | null
          notes: string | null
          permis_nationalite: string | null
          poursuites: boolean | null
          prenom: string | null
          source: string | null
          statut_emploi: string | null
          telephone: string | null
          type_bien: string | null
          type_recherche: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          a_garant?: boolean | null
          accord_bancaire?: boolean | null
          apport_personnel?: string | null
          budget?: string | null
          contacted?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          is_qualified?: boolean | null
          localite?: string | null
          nom?: string | null
          notes?: string | null
          permis_nationalite?: string | null
          poursuites?: boolean | null
          prenom?: string | null
          source?: string | null
          statut_emploi?: string | null
          telephone?: string | null
          type_bien?: string | null
          type_recherche?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          a_garant?: boolean | null
          accord_bancaire?: boolean | null
          apport_personnel?: string | null
          budget?: string | null
          contacted?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          is_qualified?: boolean | null
          localite?: string | null
          nom?: string | null
          notes?: string | null
          permis_nationalite?: string | null
          poursuites?: boolean | null
          prenom?: string | null
          source?: string | null
          statut_emploi?: string | null
          telephone?: string | null
          type_bien?: string | null
          type_recherche?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      link_previews: {
        Row: {
          created_at: string | null
          description: string | null
          favicon_url: string | null
          fetched_at: string | null
          id: string
          image_url: string | null
          site_name: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          favicon_url?: string | null
          fetched_at?: string | null
          id?: string
          image_url?: string | null
          site_name?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          favicon_url?: string | null
          fetched_at?: string | null
          id?: string
          image_url?: string | null
          site_name?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      locataires_immeuble: {
        Row: {
          charges: number | null
          civilite: string | null
          created_at: string | null
          date_entree: string | null
          date_naissance: string | null
          date_preavis: string | null
          date_sortie: string | null
          email: string | null
          employeur: string | null
          garantie: number | null
          id: string
          lot_id: string
          loyer: number | null
          nationalite: string | null
          nom: string
          notes: string | null
          numero_garantie: string | null
          prenom: string | null
          profession: string | null
          solde_locataire: number | null
          statut: string | null
          telephone: string | null
          telephone_urgence: string | null
          total_mensuel: number | null
          type_garantie: string | null
          updated_at: string | null
        }
        Insert: {
          charges?: number | null
          civilite?: string | null
          created_at?: string | null
          date_entree?: string | null
          date_naissance?: string | null
          date_preavis?: string | null
          date_sortie?: string | null
          email?: string | null
          employeur?: string | null
          garantie?: number | null
          id?: string
          lot_id: string
          loyer?: number | null
          nationalite?: string | null
          nom: string
          notes?: string | null
          numero_garantie?: string | null
          prenom?: string | null
          profession?: string | null
          solde_locataire?: number | null
          statut?: string | null
          telephone?: string | null
          telephone_urgence?: string | null
          total_mensuel?: number | null
          type_garantie?: string | null
          updated_at?: string | null
        }
        Update: {
          charges?: number | null
          civilite?: string | null
          created_at?: string | null
          date_entree?: string | null
          date_naissance?: string | null
          date_preavis?: string | null
          date_sortie?: string | null
          email?: string | null
          employeur?: string | null
          garantie?: number | null
          id?: string
          lot_id?: string
          loyer?: number | null
          nationalite?: string | null
          nom?: string
          notes?: string | null
          numero_garantie?: string | null
          prenom?: string | null
          profession?: string | null
          solde_locataire?: number | null
          statut?: string | null
          telephone?: string | null
          telephone_urgence?: string | null
          total_mensuel?: number | null
          type_garantie?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locataires_immeuble_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          charges_actuelles: number | null
          created_at: string | null
          date_liberation: string | null
          designation: string | null
          equipements: Json | null
          etage: string | null
          id: string
          immeuble_id: string
          loyer_actuel: number | null
          nb_pieces: number | null
          notes: string | null
          provisions_chauffage: number | null
          reference: string | null
          statut: string | null
          surface: number | null
          total_mensuel: number | null
          type_lot: string | null
          updated_at: string | null
        }
        Insert: {
          charges_actuelles?: number | null
          created_at?: string | null
          date_liberation?: string | null
          designation?: string | null
          equipements?: Json | null
          etage?: string | null
          id?: string
          immeuble_id: string
          loyer_actuel?: number | null
          nb_pieces?: number | null
          notes?: string | null
          provisions_chauffage?: number | null
          reference?: string | null
          statut?: string | null
          surface?: number | null
          total_mensuel?: number | null
          type_lot?: string | null
          updated_at?: string | null
        }
        Update: {
          charges_actuelles?: number | null
          created_at?: string | null
          date_liberation?: string | null
          designation?: string | null
          equipements?: Json | null
          etage?: string | null
          id?: string
          immeuble_id?: string
          loyer_actuel?: number | null
          nb_pieces?: number | null
          notes?: string | null
          provisions_chauffage?: number | null
          reference?: string | null
          statut?: string | null
          surface?: number | null
          total_mensuel?: number | null
          type_lot?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lots_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
        ]
      }
      mandate_audit_logs: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          created_at: string | null
          event_description: string | null
          event_type: string
          id: string
          ip_address: string | null
          is_client_visible: boolean | null
          mandate_id: string
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_description?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          is_client_visible?: boolean | null
          mandate_id: string
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string | null
          event_description?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          is_client_visible?: boolean | null
          mandate_id?: string
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mandate_audit_logs_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
        ]
      }
      mandate_contract_texts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      mandate_documents: {
        Row: {
          created_at: string | null
          document_category: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          mandate_id: string
        }
        Insert: {
          created_at?: string | null
          document_category?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          mandate_id: string
        }
        Update: {
          created_at?: string | null
          document_category?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          mandate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandate_documents_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
        ]
      }
      mandate_pdf_exports: {
        Row: {
          file_path: string
          generated_at: string | null
          generated_by: string | null
          id: string
          mandate_id: string
          version: number | null
        }
        Insert: {
          file_path: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          mandate_id: string
          version?: number | null
        }
        Update: {
          file_path?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          mandate_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mandate_pdf_exports_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
        ]
      }
      mandate_related_parties: {
        Row: {
          created_at: string | null
          date_naissance: string | null
          email: string | null
          employeur: string | null
          id: string
          lien_avec_mandant: string | null
          mandate_id: string
          nationalite: string | null
          nom: string
          prenom: string
          profession: string | null
          revenus_mensuels: number | null
          role: string
          signature_status: string | null
          telephone: string | null
          type_permis: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_naissance?: string | null
          email?: string | null
          employeur?: string | null
          id?: string
          lien_avec_mandant?: string | null
          mandate_id: string
          nationalite?: string | null
          nom: string
          prenom: string
          profession?: string | null
          revenus_mensuels?: number | null
          role?: string
          signature_status?: string | null
          telephone?: string | null
          type_permis?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_naissance?: string | null
          email?: string | null
          employeur?: string | null
          id?: string
          lien_avec_mandant?: string | null
          mandate_id?: string
          nationalite?: string | null
          nom?: string
          prenom?: string
          profession?: string | null
          revenus_mensuels?: number | null
          role?: string
          signature_status?: string | null
          telephone?: string | null
          type_permis?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mandate_related_parties_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
        ]
      }
      mandate_signature_checkpoints: {
        Row: {
          checked_at: string | null
          checkpoint_key: string
          id: string
          ip_address: string | null
          mandate_id: string
        }
        Insert: {
          checked_at?: string | null
          checkpoint_key: string
          id?: string
          ip_address?: string | null
          mandate_id: string
        }
        Update: {
          checked_at?: string | null
          checkpoint_key?: string
          id?: string
          ip_address?: string | null
          mandate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandate_signature_checkpoints_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
        ]
      }
      mandate_team_assignments: {
        Row: {
          agent_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          id: string
          mandate_id: string
          role: string | null
        }
        Insert: {
          agent_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          mandate_id: string
          role?: string | null
        }
        Update: {
          agent_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          mandate_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mandate_team_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandate_team_assignments_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
        ]
      }
      mandates: {
        Row: {
          access_token: string
          acompte_montant: number | null
          activation_deposit_paid: boolean | null
          adresse: string | null
          animaux: boolean | null
          budget_max: number | null
          commission_description: string | null
          contract_version_id: string | null
          created_at: string | null
          created_by: string | null
          criteres_obligatoires: string | null
          criteres_souhaites: string | null
          date_entree_souhaitee: string | null
          date_naissance: string | null
          duree_mandat_mois: number | null
          email: string
          employeur: string | null
          etat_civil: string | null
          id: string
          legal_acceptation_generale: boolean | null
          legal_acompte: boolean | null
          legal_commission: boolean | null
          legal_droit_applicable: boolean | null
          legal_duree: boolean | null
          legal_exclusivite: boolean | null
          legal_litiges: boolean | null
          legal_obligations_agence: boolean | null
          legal_obligations_client: boolean | null
          legal_protection_donnees: boolean | null
          legal_resiliation: boolean | null
          nationalite: string | null
          nom: string
          nombre_enfants: number | null
          notes_personnelles: string | null
          npa: string | null
          pieces_min: string | null
          prenom: string
          profession: string | null
          reconduction_tacite: boolean | null
          revenus_mensuels: number | null
          signature_data: string | null
          signature_hash: string | null
          signature_ip: string | null
          signature_user_agent: string | null
          signed_at: string | null
          status: string | null
          telephone: string | null
          token_invalidated_at: string | null
          type_bien: string | null
          type_permis: string | null
          type_recherche: string | null
          updated_at: string | null
          ville: string | null
          zone_recherche: string | null
        }
        Insert: {
          access_token?: string
          acompte_montant?: number | null
          activation_deposit_paid?: boolean | null
          adresse?: string | null
          animaux?: boolean | null
          budget_max?: number | null
          commission_description?: string | null
          contract_version_id?: string | null
          created_at?: string | null
          created_by?: string | null
          criteres_obligatoires?: string | null
          criteres_souhaites?: string | null
          date_entree_souhaitee?: string | null
          date_naissance?: string | null
          duree_mandat_mois?: number | null
          email: string
          employeur?: string | null
          etat_civil?: string | null
          id?: string
          legal_acceptation_generale?: boolean | null
          legal_acompte?: boolean | null
          legal_commission?: boolean | null
          legal_droit_applicable?: boolean | null
          legal_duree?: boolean | null
          legal_exclusivite?: boolean | null
          legal_litiges?: boolean | null
          legal_obligations_agence?: boolean | null
          legal_obligations_client?: boolean | null
          legal_protection_donnees?: boolean | null
          legal_resiliation?: boolean | null
          nationalite?: string | null
          nom: string
          nombre_enfants?: number | null
          notes_personnelles?: string | null
          npa?: string | null
          pieces_min?: string | null
          prenom: string
          profession?: string | null
          reconduction_tacite?: boolean | null
          revenus_mensuels?: number | null
          signature_data?: string | null
          signature_hash?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          status?: string | null
          telephone?: string | null
          token_invalidated_at?: string | null
          type_bien?: string | null
          type_permis?: string | null
          type_recherche?: string | null
          updated_at?: string | null
          ville?: string | null
          zone_recherche?: string | null
        }
        Update: {
          access_token?: string
          acompte_montant?: number | null
          activation_deposit_paid?: boolean | null
          adresse?: string | null
          animaux?: boolean | null
          budget_max?: number | null
          commission_description?: string | null
          contract_version_id?: string | null
          created_at?: string | null
          created_by?: string | null
          criteres_obligatoires?: string | null
          criteres_souhaites?: string | null
          date_entree_souhaitee?: string | null
          date_naissance?: string | null
          duree_mandat_mois?: number | null
          email?: string
          employeur?: string | null
          etat_civil?: string | null
          id?: string
          legal_acceptation_generale?: boolean | null
          legal_acompte?: boolean | null
          legal_commission?: boolean | null
          legal_droit_applicable?: boolean | null
          legal_duree?: boolean | null
          legal_exclusivite?: boolean | null
          legal_litiges?: boolean | null
          legal_obligations_agence?: boolean | null
          legal_obligations_client?: boolean | null
          legal_protection_donnees?: boolean | null
          legal_resiliation?: boolean | null
          nationalite?: string | null
          nom?: string
          nombre_enfants?: number | null
          notes_personnelles?: string | null
          npa?: string | null
          pieces_min?: string | null
          prenom?: string
          profession?: string | null
          reconduction_tacite?: boolean | null
          revenus_mensuels?: number | null
          signature_data?: string | null
          signature_hash?: string | null
          signature_ip?: string | null
          signature_user_agent?: string | null
          signed_at?: string | null
          status?: string | null
          telephone?: string | null
          token_invalidated_at?: string | null
          type_bien?: string | null
          type_permis?: string | null
          type_recherche?: string | null
          updated_at?: string | null
          ville?: string | null
          zone_recherche?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          offre_id: string | null
          payload: Json | null
          read: boolean | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          offre_id?: string | null
          payload?: Json | null
          read?: boolean | null
          sender_id: string
          sender_type: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          offre_id?: string | null
          payload?: Json | null
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
          {
            foreignKeyName: "messages_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres"
            referencedColumns: ["id"]
          },
        ]
      }
      messages_annonces: {
        Row: {
          contenu: string
          conversation_id: string
          created_at: string | null
          date_lecture: string | null
          expediteur_id: string
          id: string
          lu: boolean | null
          piece_jointe_nom: string | null
          piece_jointe_url: string | null
          supprime: boolean | null
        }
        Insert: {
          contenu: string
          conversation_id: string
          created_at?: string | null
          date_lecture?: string | null
          expediteur_id: string
          id?: string
          lu?: boolean | null
          piece_jointe_nom?: string | null
          piece_jointe_url?: string | null
          supprime?: boolean | null
        }
        Update: {
          contenu?: string
          conversation_id?: string
          created_at?: string | null
          date_lecture?: string | null
          expediteur_id?: string
          id?: string
          lu?: boolean | null
          piece_jointe_nom?: string | null
          piece_jointe_url?: string | null
          supprime?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_annonces_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations_annonces"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_lead_logs: {
        Row: {
          ad_id: string | null
          created_at: string | null
          error_message: string | null
          event_type: string
          form_id: string | null
          id: string
          leadgen_id: string | null
          page_id: string | null
          payload: Json | null
          status: string
        }
        Insert: {
          ad_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type: string
          form_id?: string | null
          id?: string
          leadgen_id?: string | null
          page_id?: string | null
          payload?: Json | null
          status: string
        }
        Update: {
          ad_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          form_id?: string | null
          id?: string
          leadgen_id?: string | null
          page_id?: string | null
          payload?: Json | null
          status?: string
        }
        Relationships: []
      }
      meta_leads: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          ad_reference_label: string | null
          ad_reference_url: string | null
          adset_id: string | null
          adset_name: string | null
          assigned_to: string | null
          campaign_id: string | null
          campaign_name: string | null
          city: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          form_id: string | null
          form_name: string | null
          full_name: string | null
          id: string
          imported_at: string | null
          is_organic: boolean | null
          last_name: string | null
          lead_created_time_meta: string | null
          lead_status: string
          leadgen_id: string
          notes: string | null
          page_id: string | null
          page_name: string | null
          phone: string | null
          postal_code: string | null
          raw_answers: Json | null
          raw_meta_payload: Json | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_name?: string | null
          ad_reference_label?: string | null
          ad_reference_url?: string | null
          adset_id?: string | null
          adset_name?: string | null
          assigned_to?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          form_id?: string | null
          form_name?: string | null
          full_name?: string | null
          id?: string
          imported_at?: string | null
          is_organic?: boolean | null
          last_name?: string | null
          lead_created_time_meta?: string | null
          lead_status?: string
          leadgen_id: string
          notes?: string | null
          page_id?: string | null
          page_name?: string | null
          phone?: string | null
          postal_code?: string | null
          raw_answers?: Json | null
          raw_meta_payload?: Json | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_name?: string | null
          ad_reference_label?: string | null
          ad_reference_url?: string | null
          adset_id?: string | null
          adset_name?: string | null
          assigned_to?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          form_id?: string | null
          form_name?: string | null
          full_name?: string | null
          id?: string
          imported_at?: string | null
          is_organic?: boolean | null
          last_name?: string | null
          lead_created_time_meta?: string | null
          lead_status?: string
          leadgen_id?: string
          notes?: string | null
          page_id?: string | null
          page_name?: string | null
          phone?: string | null
          postal_code?: string | null
          raw_answers?: Json | null
          raw_meta_payload?: Json | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          email_sent: boolean | null
          id: string
          link: string | null
          message: string | null
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_sent?: boolean | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      offres_achat: {
        Row: {
          acheteur_email: string | null
          acheteur_id: string | null
          acheteur_nom: string | null
          acheteur_telephone: string | null
          conditions: string | null
          contre_offre_montant: number | null
          created_at: string
          created_by: string | null
          date_acceptation: string | null
          date_contre_offre: string | null
          date_offre: string
          date_validite: string | null
          id: string
          immeuble_id: string
          montant_offre: number
          notes_negociation: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          acheteur_email?: string | null
          acheteur_id?: string | null
          acheteur_nom?: string | null
          acheteur_telephone?: string | null
          conditions?: string | null
          contre_offre_montant?: number | null
          created_at?: string
          created_by?: string | null
          date_acceptation?: string | null
          date_contre_offre?: string | null
          date_offre?: string
          date_validite?: string | null
          id?: string
          immeuble_id: string
          montant_offre: number
          notes_negociation?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          acheteur_email?: string | null
          acheteur_id?: string | null
          acheteur_nom?: string | null
          acheteur_telephone?: string | null
          conditions?: string | null
          contre_offre_montant?: number | null
          created_at?: string
          created_by?: string | null
          date_acceptation?: string | null
          date_contre_offre?: string | null
          date_offre?: string
          date_validite?: string | null
          id?: string
          immeuble_id?: string
          montant_offre?: number
          notes_negociation?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offres_achat_acheteur_id_fkey"
            columns: ["acheteur_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offres_achat_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements_annonces: {
        Row: {
          annonce_id: string | null
          annonceur_id: string
          created_at: string | null
          date_paiement: string | null
          description: string | null
          devise: string | null
          duree_jours: number | null
          facture_url: string | null
          id: string
          methode_paiement: string | null
          montant: number
          nb_credits: number | null
          numero_facture: string | null
          reference_externe: string | null
          statut_paiement: string | null
          type_paiement: string
        }
        Insert: {
          annonce_id?: string | null
          annonceur_id: string
          created_at?: string | null
          date_paiement?: string | null
          description?: string | null
          devise?: string | null
          duree_jours?: number | null
          facture_url?: string | null
          id?: string
          methode_paiement?: string | null
          montant: number
          nb_credits?: number | null
          numero_facture?: string | null
          reference_externe?: string | null
          statut_paiement?: string | null
          type_paiement: string
        }
        Update: {
          annonce_id?: string | null
          annonceur_id?: string
          created_at?: string | null
          date_paiement?: string | null
          description?: string | null
          devise?: string | null
          duree_jours?: number | null
          facture_url?: string | null
          id?: string
          methode_paiement?: string | null
          montant?: number
          nb_credits?: number | null
          numero_facture?: string | null
          reference_externe?: string | null
          statut_paiement?: string | null
          type_paiement?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiements_annonces_annonce_id_fkey"
            columns: ["annonce_id"]
            isOneToOne: false
            referencedRelation: "annonces_publiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_annonces_annonceur_id_fkey"
            columns: ["annonceur_id"]
            isOneToOne: false
            referencedRelation: "annonceurs"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_exports_immeuble: {
        Row: {
          created_at: string | null
          genere_par: string | null
          id: string
          immeuble_id: string
          taille: number | null
          type_export: string
          url: string | null
        }
        Insert: {
          created_at?: string | null
          genere_par?: string | null
          id?: string
          immeuble_id: string
          taille?: number | null
          type_export: string
          url?: string | null
        }
        Update: {
          created_at?: string | null
          genere_par?: string | null
          id?: string
          immeuble_id?: string
          taille?: number | null
          type_export?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_exports_immeuble_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos_annonces_publiques: {
        Row: {
          annonce_id: string
          created_at: string | null
          est_principale: boolean | null
          hauteur: number | null
          id: string
          largeur: number | null
          legende: string | null
          ordre: number | null
          taille_octets: number | null
          type_media: string | null
          url: string
          url_thumbnail: string | null
        }
        Insert: {
          annonce_id: string
          created_at?: string | null
          est_principale?: boolean | null
          hauteur?: number | null
          id?: string
          largeur?: number | null
          legende?: string | null
          ordre?: number | null
          taille_octets?: number | null
          type_media?: string | null
          url: string
          url_thumbnail?: string | null
        }
        Update: {
          annonce_id?: string
          created_at?: string | null
          est_principale?: boolean | null
          hauteur?: number | null
          id?: string
          largeur?: number | null
          legende?: string | null
          ordre?: number | null
          taille_octets?: number | null
          type_media?: string | null
          url?: string
          url_thumbnail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_annonces_publiques_annonce_id_fkey"
            columns: ["annonce_id"]
            isOneToOne: false
            referencedRelation: "annonces_publiques"
            referencedColumns: ["id"]
          },
        ]
      }
      photos_immeuble: {
        Row: {
          created_at: string | null
          est_principale: boolean | null
          id: string
          immeuble_id: string
          legende: string | null
          lot_id: string | null
          ordre: number | null
          type_photo: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          est_principale?: boolean | null
          id?: string
          immeuble_id: string
          legende?: string | null
          lot_id?: string | null
          ordre?: number | null
          type_photo?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          est_principale?: boolean | null
          id?: string
          immeuble_id?: string
          legende?: string | null
          lot_id?: string | null
          ordre?: number | null
          type_photo?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_immeuble_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_immeuble_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          actif: boolean | null
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          nom: string
          notifications_email: boolean | null
          prenom: string
          telephone: string | null
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          is_online?: boolean | null
          last_seen_at?: string | null
          nom: string
          notifications_email?: boolean | null
          prenom: string
          telephone?: string | null
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          nom?: string
          notifications_email?: boolean | null
          prenom?: string
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projets_developpement: {
        Row: {
          adresse: string | null
          agent_id: string | null
          architecte_id: string | null
          batiment_existant: boolean | null
          besoin_devis: boolean | null
          budget_max: number | null
          budget_min: number | null
          budget_previsionnel: number | null
          commune: string | null
          cos: number | null
          created_at: string | null
          date_soumission: string | null
          delai_realisation: string | null
          ibus: number | null
          id: string
          immeuble_id: string | null
          isus: number | null
          nombre_unites: number | null
          notes_internes: string | null
          objectifs: string | null
          ocus: number | null
          parcelle_numero: string | null
          proprietaire_id: string
          service_souhaite: string | null
          servitudes_connues: boolean | null
          servitudes_details: string | null
          statut: string | null
          surface_terrain: number | null
          type_construction_souhaitee: string | null
          type_projet: string
          updated_at: string | null
          zone_affectation: string | null
        }
        Insert: {
          adresse?: string | null
          agent_id?: string | null
          architecte_id?: string | null
          batiment_existant?: boolean | null
          besoin_devis?: boolean | null
          budget_max?: number | null
          budget_min?: number | null
          budget_previsionnel?: number | null
          commune?: string | null
          cos?: number | null
          created_at?: string | null
          date_soumission?: string | null
          delai_realisation?: string | null
          ibus?: number | null
          id?: string
          immeuble_id?: string | null
          isus?: number | null
          nombre_unites?: number | null
          notes_internes?: string | null
          objectifs?: string | null
          ocus?: number | null
          parcelle_numero?: string | null
          proprietaire_id: string
          service_souhaite?: string | null
          servitudes_connues?: boolean | null
          servitudes_details?: string | null
          statut?: string | null
          surface_terrain?: number | null
          type_construction_souhaitee?: string | null
          type_projet: string
          updated_at?: string | null
          zone_affectation?: string | null
        }
        Update: {
          adresse?: string | null
          agent_id?: string | null
          architecte_id?: string | null
          batiment_existant?: boolean | null
          besoin_devis?: boolean | null
          budget_max?: number | null
          budget_min?: number | null
          budget_previsionnel?: number | null
          commune?: string | null
          cos?: number | null
          created_at?: string | null
          date_soumission?: string | null
          delai_realisation?: string | null
          ibus?: number | null
          id?: string
          immeuble_id?: string | null
          isus?: number | null
          nombre_unites?: number | null
          notes_internes?: string | null
          objectifs?: string | null
          ocus?: number | null
          parcelle_numero?: string | null
          proprietaire_id?: string
          service_souhaite?: string | null
          servitudes_connues?: boolean | null
          servitudes_details?: string | null
          statut?: string | null
          surface_terrain?: number | null
          type_construction_souhaitee?: string | null
          type_projet?: string
          updated_at?: string | null
          zone_affectation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projets_developpement_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projets_developpement_architecte_id_fkey"
            columns: ["architecte_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projets_developpement_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projets_developpement_proprietaire_id_fkey"
            columns: ["proprietaire_id"]
            isOneToOne: false
            referencedRelation: "proprietaires"
            referencedColumns: ["id"]
          },
        ]
      }
      proprietaires: {
        Row: {
          adresse: string | null
          agent_id: string | null
          canton: string | null
          civilite: string | null
          code_postal: string | null
          created_at: string | null
          iban: string | null
          id: string
          nom_banque: string | null
          notes_admin: string | null
          statut: string | null
          telephone: string | null
          telephone_secondaire: string | null
          titulaire_compte: string | null
          updated_at: string | null
          user_id: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          agent_id?: string | null
          canton?: string | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string | null
          iban?: string | null
          id?: string
          nom_banque?: string | null
          notes_admin?: string | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          titulaire_compte?: string | null
          updated_at?: string | null
          user_id: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          agent_id?: string | null
          canton?: string | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string | null
          iban?: string | null
          id?: string
          nom_banque?: string | null
          notes_admin?: string | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          titulaire_compte?: string | null
          updated_at?: string | null
          user_id?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proprietaires_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      received_emails: {
        Row: {
          ai_analyzed: boolean | null
          ai_analyzed_at: string | null
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          created_at: string | null
          folder: string | null
          from_email: string
          from_name: string | null
          id: string
          is_read: boolean | null
          is_starred: boolean | null
          message_id: string
          received_at: string | null
          subject: string | null
          to_email: string
          user_id: string
        }
        Insert: {
          ai_analyzed?: boolean | null
          ai_analyzed_at?: string | null
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          folder?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          message_id: string
          received_at?: string | null
          subject?: string | null
          to_email: string
          user_id: string
        }
        Update: {
          ai_analyzed?: boolean | null
          ai_analyzed_at?: string | null
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string | null
          folder?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          is_read?: boolean | null
          is_starred?: boolean | null
          message_id?: string
          received_at?: string | null
          subject?: string | null
          to_email?: string
          user_id?: string
        }
        Relationships: []
      }
      recherches_sauvegardees: {
        Row: {
          alerte_active: boolean | null
          canton: string | null
          categorie_id: string | null
          code_postal: string | null
          created_at: string | null
          derniere_alerte: string | null
          equipements_requis: string[] | null
          frequence_alerte: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nom: string
          pieces_max: number | null
          pieces_min: number | null
          prix_max: number | null
          prix_min: number | null
          rayon_km: number | null
          surface_max: number | null
          surface_min: number | null
          type_transaction: string | null
          updated_at: string | null
          user_id: string
          ville: string | null
        }
        Insert: {
          alerte_active?: boolean | null
          canton?: string | null
          categorie_id?: string | null
          code_postal?: string | null
          created_at?: string | null
          derniere_alerte?: string | null
          equipements_requis?: string[] | null
          frequence_alerte?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom: string
          pieces_max?: number | null
          pieces_min?: number | null
          prix_max?: number | null
          prix_min?: number | null
          rayon_km?: number | null
          surface_max?: number | null
          surface_min?: number | null
          type_transaction?: string | null
          updated_at?: string | null
          user_id: string
          ville?: string | null
        }
        Update: {
          alerte_active?: boolean | null
          canton?: string | null
          categorie_id?: string | null
          code_postal?: string | null
          created_at?: string | null
          derniere_alerte?: string | null
          equipements_requis?: string[] | null
          frequence_alerte?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom?: string
          pieces_max?: number | null
          pieces_min?: number | null
          prix_max?: number | null
          prix_min?: number | null
          rayon_km?: number | null
          surface_max?: number | null
          surface_min?: number | null
          type_transaction?: string | null
          updated_at?: string | null
          user_id?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recherches_sauvegardees_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories_annonces"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          apporteur_id: string | null
          client_email: string | null
          client_id: string | null
          client_nom: string
          client_prenom: string | null
          client_telephone: string | null
          created_at: string | null
          date_conclusion: string | null
          date_paiement: string | null
          date_validation: string | null
          demande_mandat_id: string | null
          id: string
          lieu_situation: string | null
          montant_commission: number | null
          montant_frais_agence: number | null
          notes: string | null
          notes_admin: string | null
          reference_virement: string | null
          statut: string | null
          taux_commission: number | null
          type_affaire: string
          updated_at: string | null
        }
        Insert: {
          apporteur_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_nom: string
          client_prenom?: string | null
          client_telephone?: string | null
          created_at?: string | null
          date_conclusion?: string | null
          date_paiement?: string | null
          date_validation?: string | null
          demande_mandat_id?: string | null
          id?: string
          lieu_situation?: string | null
          montant_commission?: number | null
          montant_frais_agence?: number | null
          notes?: string | null
          notes_admin?: string | null
          reference_virement?: string | null
          statut?: string | null
          taux_commission?: number | null
          type_affaire: string
          updated_at?: string | null
        }
        Update: {
          apporteur_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_nom?: string
          client_prenom?: string | null
          client_telephone?: string | null
          created_at?: string | null
          date_conclusion?: string | null
          date_paiement?: string | null
          date_validation?: string | null
          demande_mandat_id?: string | null
          id?: string
          lieu_situation?: string | null
          montant_commission?: number | null
          montant_frais_agence?: number | null
          notes?: string | null
          notes_admin?: string | null
          reference_virement?: string | null
          statut?: string | null
          taux_commission?: number | null
          type_affaire?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_demande_mandat_id_fkey"
            columns: ["demande_mandat_id"]
            isOneToOne: false
            referencedRelation: "demandes_mandat"
            referencedColumns: ["id"]
          },
        ]
      }
      renouvellements_mandat: {
        Row: {
          agent_id: string | null
          client_id: string
          created_at: string | null
          date_ancien_mandat: string
          date_nouveau_mandat: string
          id: string
          raison: string | null
        }
        Insert: {
          agent_id?: string | null
          client_id: string
          created_at?: string | null
          date_ancien_mandat: string
          date_nouveau_mandat?: string
          id?: string
          raison?: string | null
        }
        Update: {
          agent_id?: string | null
          client_id?: string
          created_at?: string | null
          date_ancien_mandat?: string
          date_nouveau_mandat?: string
          id?: string
          raison?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renouvellements_mandat_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renouvellements_mandat_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_emails: {
        Row: {
          attachments: Json | null
          body_html: string | null
          client_id: string | null
          error_message: string | null
          id: string
          recipient_email: string
          recipient_name: string | null
          sender_id: string
          sent_at: string | null
          status: string | null
          subject: string
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          client_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_name?: string | null
          sender_id: string
          sent_at?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          client_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          sender_id?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_file_links: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          document_ids: string[]
          download_count: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          token: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          document_ids: string[]
          download_count?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          token: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          document_ids?: string[]
          download_count?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_file_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      signalements_annonces: {
        Row: {
          action_prise: string | null
          annonce_id: string | null
          annonceur_id: string | null
          created_at: string | null
          date_traitement: string | null
          description: string
          id: string
          notes_internes: string | null
          preuves_urls: string[] | null
          signale_par: string
          statut: string | null
          traite_par: string | null
          type_signalement: string
        }
        Insert: {
          action_prise?: string | null
          annonce_id?: string | null
          annonceur_id?: string | null
          created_at?: string | null
          date_traitement?: string | null
          description: string
          id?: string
          notes_internes?: string | null
          preuves_urls?: string[] | null
          signale_par: string
          statut?: string | null
          traite_par?: string | null
          type_signalement: string
        }
        Update: {
          action_prise?: string | null
          annonce_id?: string | null
          annonceur_id?: string | null
          created_at?: string | null
          date_traitement?: string | null
          description?: string
          id?: string
          notes_internes?: string | null
          preuves_urls?: string[] | null
          signale_par?: string
          statut?: string | null
          traite_par?: string | null
          type_signalement?: string
        }
        Relationships: [
          {
            foreignKeyName: "signalements_annonces_annonce_id_fkey"
            columns: ["annonce_id"]
            isOneToOne: false
            referencedRelation: "annonces_publiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signalements_annonces_annonceur_id_fkey"
            columns: ["annonceur_id"]
            isOneToOne: false
            referencedRelation: "annonceurs"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_techniques: {
        Row: {
          agent_id: string | null
          categorie: string | null
          created_at: string | null
          cree_par: string | null
          date_intervention_prevue: string | null
          date_intervention_reelle: string | null
          date_resolution: string | null
          description: string | null
          facture_url: string | null
          fournisseur_id: string | null
          fournisseur_nom: string | null
          id: string
          immeuble_id: string
          locataire_id: string | null
          lot_id: string | null
          montant_devis: number | null
          montant_facture: number | null
          notes: string | null
          numero_ticket: string | null
          photos: Json | null
          priorite: string | null
          statut: string | null
          titre: string
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          categorie?: string | null
          created_at?: string | null
          cree_par?: string | null
          date_intervention_prevue?: string | null
          date_intervention_reelle?: string | null
          date_resolution?: string | null
          description?: string | null
          facture_url?: string | null
          fournisseur_id?: string | null
          fournisseur_nom?: string | null
          id?: string
          immeuble_id: string
          locataire_id?: string | null
          lot_id?: string | null
          montant_devis?: number | null
          montant_facture?: number | null
          notes?: string | null
          numero_ticket?: string | null
          photos?: Json | null
          priorite?: string | null
          statut?: string | null
          titre: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          categorie?: string | null
          created_at?: string | null
          cree_par?: string | null
          date_intervention_prevue?: string | null
          date_intervention_reelle?: string | null
          date_resolution?: string | null
          description?: string | null
          facture_url?: string | null
          fournisseur_id?: string | null
          fournisseur_nom?: string | null
          id?: string
          immeuble_id?: string
          locataire_id?: string | null
          lot_id?: string | null
          montant_devis?: number | null
          montant_facture?: number | null
          notes?: string | null
          numero_ticket?: string | null
          photos?: Json | null
          priorite?: string | null
          statut?: string | null
          titre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_techniques_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_techniques_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_techniques_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires_immeuble"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_techniques_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          adresse: string | null
          agent_id: string | null
          client_id: string | null
          commission_mode: string | null
          commission_payee: boolean | null
          commission_totale: number
          created_at: string | null
          date_debut_bail: string | null
          date_etat_lieux: string | null
          date_paiement_commission: string | null
          date_transaction: string | null
          etage: string | null
          etat_lieux_confirme: boolean | null
          id: string
          montant_total: number
          notes_internes: string | null
          offre_id: string | null
          part_agence: number
          part_agent: number
          pieces: number | null
          prix_vendeur_transaction: number | null
          prix_vente_final: number | null
          regie_contact: string | null
          regie_email: string | null
          regie_nom: string | null
          regie_telephone: string | null
          statut: string | null
          surface: number | null
          type_bien: string | null
          type_transaction: string | null
          updated_at: string | null
        }
        Insert: {
          adresse?: string | null
          agent_id?: string | null
          client_id?: string | null
          commission_mode?: string | null
          commission_payee?: boolean | null
          commission_totale: number
          created_at?: string | null
          date_debut_bail?: string | null
          date_etat_lieux?: string | null
          date_paiement_commission?: string | null
          date_transaction?: string | null
          etage?: string | null
          etat_lieux_confirme?: boolean | null
          id?: string
          montant_total: number
          notes_internes?: string | null
          offre_id?: string | null
          part_agence: number
          part_agent: number
          pieces?: number | null
          prix_vendeur_transaction?: number | null
          prix_vente_final?: number | null
          regie_contact?: string | null
          regie_email?: string | null
          regie_nom?: string | null
          regie_telephone?: string | null
          statut?: string | null
          surface?: number | null
          type_bien?: string | null
          type_transaction?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse?: string | null
          agent_id?: string | null
          client_id?: string | null
          commission_mode?: string | null
          commission_payee?: boolean | null
          commission_totale?: number
          created_at?: string | null
          date_debut_bail?: string | null
          date_etat_lieux?: string | null
          date_paiement_commission?: string | null
          date_transaction?: string | null
          etage?: string | null
          etat_lieux_confirme?: boolean | null
          id?: string
          montant_total?: number
          notes_internes?: string | null
          offre_id?: string | null
          part_agence?: number
          part_agent?: number
          pieces?: number | null
          prix_vendeur_transaction?: number | null
          prix_vente_final?: number | null
          regie_contact?: string | null
          regie_email?: string | null
          regie_nom?: string | null
          regie_telephone?: string | null
          statut?: string | null
          surface?: number | null
          type_bien?: string | null
          type_transaction?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_transactions_offre"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres"
            referencedColumns: ["id"]
          },
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
      transactions_comptables: {
        Row: {
          categorie: string
          created_at: string | null
          credit: number | null
          date_echeance: string | null
          date_paiement: string | null
          date_transaction: string
          debit: number | null
          document_url: string | null
          est_recurrente: boolean | null
          id: string
          immeuble_id: string
          libelle: string
          locataire_id: string | null
          lot_id: string | null
          mode_paiement: string | null
          notes: string | null
          numero_facture: string | null
          numero_piece: string | null
          periodicite: string | null
          sous_categorie: string | null
          statut: string | null
          tiers_nom: string | null
          tiers_reference: string | null
          updated_at: string | null
        }
        Insert: {
          categorie: string
          created_at?: string | null
          credit?: number | null
          date_echeance?: string | null
          date_paiement?: string | null
          date_transaction: string
          debit?: number | null
          document_url?: string | null
          est_recurrente?: boolean | null
          id?: string
          immeuble_id: string
          libelle: string
          locataire_id?: string | null
          lot_id?: string | null
          mode_paiement?: string | null
          notes?: string | null
          numero_facture?: string | null
          numero_piece?: string | null
          periodicite?: string | null
          sous_categorie?: string | null
          statut?: string | null
          tiers_nom?: string | null
          tiers_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          categorie?: string
          created_at?: string | null
          credit?: number | null
          date_echeance?: string | null
          date_paiement?: string | null
          date_transaction?: string
          debit?: number | null
          document_url?: string | null
          est_recurrente?: boolean | null
          id?: string
          immeuble_id?: string
          libelle?: string
          locataire_id?: string | null
          lot_id?: string | null
          mode_paiement?: string | null
          notes?: string | null
          numero_facture?: string | null
          numero_piece?: string | null
          periodicite?: string | null
          sous_categorie?: string | null
          statut?: string | null
          tiers_nom?: string | null
          tiers_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_comptables_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_comptables_locataire_id_fkey"
            columns: ["locataire_id"]
            isOneToOne: false
            referencedRelation: "locataires_immeuble"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_comptables_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
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
      visit_reminders: {
        Row: {
          created_at: string
          id: string
          reminder_type: string
          sent_at: string
          user_id: string
          visite_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_type: string
          sent_at?: string
          user_id: string
          visite_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
          visite_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_reminders_visite_id_fkey"
            columns: ["visite_id"]
            isOneToOne: false
            referencedRelation: "visites"
            referencedColumns: ["id"]
          },
        ]
      }
      visites: {
        Row: {
          adresse: string
          agent_id: string | null
          client_id: string | null
          coursier_id: string | null
          created_at: string | null
          date_visite: string
          date_visite_fin: string | null
          est_deleguee: boolean | null
          feedback_agent: string | null
          feedback_coursier: string | null
          id: string
          medias: Json | null
          notes: string | null
          offre_id: string | null
          paye_coursier: boolean | null
          recommandation_agent: string | null
          remuneration_coursier: number | null
          source: string | null
          statut: string | null
          statut_coursier: string | null
          updated_at: string | null
        }
        Insert: {
          adresse: string
          agent_id?: string | null
          client_id?: string | null
          coursier_id?: string | null
          created_at?: string | null
          date_visite: string
          date_visite_fin?: string | null
          est_deleguee?: boolean | null
          feedback_agent?: string | null
          feedback_coursier?: string | null
          id?: string
          medias?: Json | null
          notes?: string | null
          offre_id?: string | null
          paye_coursier?: boolean | null
          recommandation_agent?: string | null
          remuneration_coursier?: number | null
          source?: string | null
          statut?: string | null
          statut_coursier?: string | null
          updated_at?: string | null
        }
        Update: {
          adresse?: string
          agent_id?: string | null
          client_id?: string | null
          coursier_id?: string | null
          created_at?: string | null
          date_visite?: string
          date_visite_fin?: string | null
          est_deleguee?: boolean | null
          feedback_agent?: string | null
          feedback_coursier?: string | null
          id?: string
          medias?: Json | null
          notes?: string | null
          offre_id?: string | null
          paye_coursier?: boolean | null
          recommandation_agent?: string | null
          remuneration_coursier?: number | null
          source?: string | null
          statut?: string | null
          statut_coursier?: string | null
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
            foreignKeyName: "visites_coursier_id_fkey"
            columns: ["coursier_id"]
            isOneToOne: false
            referencedRelation: "coursiers"
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
      visites_vente: {
        Row: {
          acheteur_email: string | null
          acheteur_nom: string | null
          acheteur_telephone: string | null
          agent_id: string | null
          created_at: string | null
          date_visite: string
          feedback_acheteur: string | null
          id: string
          immeuble_id: string
          interet_acheteur_id: string | null
          note_interet: number | null
          notes_visite: string | null
          statut: string | null
          updated_at: string | null
        }
        Insert: {
          acheteur_email?: string | null
          acheteur_nom?: string | null
          acheteur_telephone?: string | null
          agent_id?: string | null
          created_at?: string | null
          date_visite: string
          feedback_acheteur?: string | null
          id?: string
          immeuble_id: string
          interet_acheteur_id?: string | null
          note_interet?: number | null
          notes_visite?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Update: {
          acheteur_email?: string | null
          acheteur_nom?: string | null
          acheteur_telephone?: string | null
          agent_id?: string | null
          created_at?: string | null
          date_visite?: string
          feedback_acheteur?: string | null
          id?: string
          immeuble_id?: string
          interet_acheteur_id?: string | null
          note_interet?: number | null
          notes_visite?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visites_vente_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visites_vente_immeuble_id_fkey"
            columns: ["immeuble_id"]
            isOneToOne: false
            referencedRelation: "immeubles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visites_vente_interet_acheteur_id_fkey"
            columns: ["interet_acheteur_id"]
            isOneToOne: false
            referencedRelation: "interets_acheteur"
            referencedColumns: ["id"]
          },
        ]
      }
      vues_annonces: {
        Row: {
          annonce_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          annonce_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          annonce_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vues_annonces_annonce_id_fkey"
            columns: ["annonce_id"]
            isOneToOne: false
            referencedRelation: "annonces_publiques"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_agent_on_login: { Args: never; Returns: undefined }
      activate_apporteur_on_login: { Args: never; Returns: undefined }
      activate_coursier_on_login: { Args: never; Returns: undefined }
      can_agent_create_conversation: {
        Args: { _agent_id: string; _client_id: string }
        Returns: boolean
      }
      check_demande_by_email: {
        Args: { check_email: string }
        Returns: boolean
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      decrement_agent_clients: {
        Args: { agent_uuid: string }
        Returns: undefined
      }
      generate_parrainage_code: { Args: never; Returns: string }
      get_client_agent_id: {
        Args: { _client_user_id: string }
        Returns: string
      }
      get_current_user_id: { Args: never; Returns: string }
      get_my_agent_id: { Args: never; Returns: string }
      get_my_co_agent_client_ids: { Args: never; Returns: string[] }
      get_next_abaninja_client_number: { Args: never; Returns: string }
      has_access_to_immeuble: {
        Args: { _immeuble_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_agent_clients: {
        Args: { agent_uuid: string }
        Returns: undefined
      }
      is_agent_of_client: { Args: { profile_id: string }; Returns: boolean }
      is_agent_of_client_record: {
        Args: { _client_id: string }
        Returns: boolean
      }
      is_agent_of_client_via_junction: {
        Args: { _client_id: string }
        Returns: boolean
      }
      is_agent_of_proprietaire: {
        Args: { _proprietaire_id: string }
        Returns: boolean
      }
      is_assigned_agent: { Args: { _client_user_id: string }; Returns: boolean }
      is_coursier_for_agent: { Args: { _agent_id: string }; Returns: boolean }
      is_coursier_for_agent_profile: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      is_coursier_for_client: { Args: { _client_id: string }; Returns: boolean }
      is_coursier_for_profile: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      is_my_assigned_agent: { Args: { _agent_id: string }; Returns: boolean }
      is_proprietaire_owner: {
        Args: { _proprietaire_id: string }
        Returns: boolean
      }
      log_mandate_event: {
        Args: {
          p_actor_id?: string
          p_actor_type?: string
          p_event_description: string
          p_event_type: string
          p_ip_address?: string
          p_is_client_visible?: boolean
          p_mandate_id: string
          p_metadata?: Json
          p_user_agent?: string
        }
        Returns: string
      }
      mark_inactive_users_offline: { Args: never; Returns: number }
      record_signature_checkpoint: {
        Args: {
          p_checkpoint_key: string
          p_ip_address?: string
          p_mandate_id: string
        }
        Returns: string
      }
      search_annonces_radius: {
        Args: {
          category_id?: string
          lat: number
          lng: number
          max_pieces?: number
          max_price?: number
          min_pieces?: number
          min_price?: number
          radius_km: number
          transaction_type?: string
        }
        Returns: {
          acces_pmr: boolean | null
          adresse: string
          adresse_complementaire: string | null
          afficher_adresse_exacte: boolean | null
          animaux_autorises: boolean | null
          annee_construction: number | null
          annee_renovation: number | null
          annonceur_id: string
          balcon: boolean | null
          canton: string | null
          categorie_id: string | null
          charges_comprises: boolean | null
          charges_mensuelles: number | null
          classe_energetique: string | null
          code_postal: string
          created_at: string | null
          date_debut_mise_avant: string | null
          date_expiration: string | null
          date_fin_mise_avant: string | null
          date_moderation: string | null
          date_publication: string | null
          date_soumission: string | null
          depot_garantie: number | null
          description: string | null
          description_courte: string | null
          disponible_des: string | null
          disponible_immediatement: boolean | null
          duree_bail_min: number | null
          duree_publication: number | null
          email_contact: string | null
          emissions_co2: number | null
          equipements: Json | null
          est_mise_en_avant: boolean | null
          etage: number | null
          etat_bien: string | null
          external_id: string | null
          fumeurs_acceptes: boolean | null
          horaires_contact: string | null
          id: string
          indice_energetique: number | null
          jardin: boolean | null
          latitude: number | null
          longitude: number | null
          meta_description: string | null
          meta_title: string | null
          modere_par: string | null
          motif_refus: string | null
          mots_cles: string[] | null
          nb_chambres: number | null
          nb_contacts: number | null
          nb_etages_immeuble: number | null
          nb_favoris: number | null
          nb_mois_garantie: number | null
          nb_partages: number | null
          nb_places_parking: number | null
          nb_salles_bain: number | null
          nb_vues: number | null
          nb_vues_uniques: number | null
          nb_wc: number | null
          nom_contact: string | null
          nombre_pieces: number | null
          parking_inclus: boolean | null
          pays: string | null
          piscine: boolean | null
          points_forts: string[] | null
          position_mise_avant: number | null
          prix: number
          prix_affichage: string | null
          prix_au_m2: number | null
          quartier: string | null
          reference: string | null
          renouvellements: number | null
          slug: string | null
          source: string | null
          source_energie: string | null
          sous_type: string | null
          statut: string | null
          surface_balcon: number | null
          surface_habitable: number | null
          surface_jardin: number | null
          surface_terrain: number | null
          surface_terrasse: number | null
          surface_utile: number | null
          telephone_contact: string | null
          terrasse: boolean | null
          titre: string
          type_chauffage: string | null
          type_parking: string | null
          type_transaction: string
          updated_at: string | null
          ville: string
          whatsapp_contact: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "annonces_publiques"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_user_offline: { Args: never; Returns: undefined }
      update_user_presence: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "agent"
        | "client"
        | "apporteur"
        | "proprietaire"
        | "annonceur"
        | "coursier"
        | "agent_ia"
      contact_type:
        | "proprietaire"
        | "gerant_regie"
        | "concierge"
        | "locataire"
        | "client_potentiel"
        | "regie"
        | "notaire"
        | "autre"
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
      app_role: [
        "admin",
        "agent",
        "client",
        "apporteur",
        "proprietaire",
        "annonceur",
        "coursier",
        "agent_ia",
      ],
      contact_type: [
        "proprietaire",
        "gerant_regie",
        "concierge",
        "locataire",
        "client_potentiel",
        "regie",
        "notaire",
        "autre",
      ],
    },
  },
} as const
