CREATE OR REPLACE FUNCTION public.notify_offre_action_required(_offre_id uuid, _title text, _type text, _link_prefix text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec record;
  admin_row record;
  msg text;
BEGIN
  BEGIN
    SELECT o.id, o.adresse, o.prix, o.client_id, o.agent_id, o.missing_info, o.lien_annonce,
           COALESCE(NULLIF(TRIM(COALESCE(p.prenom,'') || ' ' || COALESCE(p.nom,'')), ''), p.email, 'Client') AS client_name,
           a.user_id AS agent_user_id
      INTO rec
      FROM public.offres o
      LEFT JOIN public.clients c ON c.id = o.client_id
      LEFT JOIN public.profiles p ON p.id = c.user_id
      LEFT JOIN public.agents a ON a.id = o.agent_id
      WHERE o.id = _offre_id;

    IF NOT FOUND THEN
      RETURN;
    END IF;

    msg := rec.client_name || ' — ' || COALESCE(rec.adresse, 'annonce sans adresse')
         || CASE WHEN rec.missing_info IS NOT NULL AND _type = 'auto_offre_incomplete'
                 THEN E'\nÀ compléter : ' || rec.missing_info
                 ELSE '' END;

    IF rec.agent_user_id IS NOT NULL THEN
      BEGIN
        PERFORM public.create_notification(
          rec.agent_user_id, _type, _title, msg,
          _link_prefix || rec.id::text,
          jsonb_build_object('offre_id', rec.id, 'client_id', rec.client_id, 'missing_info', rec.missing_info)
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_offre_action_required: agent notify failed: %', SQLERRM;
      END;
    END IF;

    FOR admin_row IN SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LOOP
      IF rec.agent_user_id IS NULL OR admin_row.user_id <> rec.agent_user_id THEN
        BEGIN
          PERFORM public.create_notification(
            admin_row.user_id, _type, _title, msg,
            '/admin/offres-auto',
            jsonb_build_object('offre_id', rec.id, 'client_id', rec.client_id, 'missing_info', rec.missing_info)
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'notify_offre_action_required: admin notify failed: %', SQLERRM;
        END;
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_offre_action_required failed for offre %: %', _offre_id, SQLERRM;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.offres_notify_action_required()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_future_visit boolean;
BEGIN
  IF NEW.envoi_auto IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  BEGIN
    IF NEW.needs_agent_action = true AND NEW.action_notified_at IS NULL THEN
      PERFORM public.notify_offre_action_required(
        NEW.id,
        '⚠️ Offre auto à compléter — action requise',
        'auto_offre_incomplete',
        '/admin/offres-auto?offre='
      );
      UPDATE public.offres SET action_notified_at = now()
        WHERE id = NEW.id AND action_notified_at IS NULL;
    END IF;

    IF NEW.statut IN ('interesse', 'candidature')
       AND NEW.interesse_notified_at IS NULL
       AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM NEW.statut) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.visites v
        WHERE v.offre_id = NEW.id
          AND v.date_visite > now()
          AND COALESCE(v.statut, '') NOT IN ('annulee', 'a_fixer')
      ) INTO has_future_visit;

      IF NOT has_future_visit THEN
        PERFORM public.notify_offre_action_required(
          NEW.id,
          '✅ Client intéressé — fixer la visite',
          'auto_offre_interesse_no_visit',
          '/admin/offres-auto?offre='
        );
        UPDATE public.offres SET interesse_notified_at = now()
          WHERE id = NEW.id AND interesse_notified_at IS NULL;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'offres_notify_action_required trigger swallowed error for offre %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;