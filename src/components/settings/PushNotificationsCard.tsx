import { useEffect, useState } from 'react';
import { Bell, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logPushStep } from '@/hooks/usePushNotifications';

type DeviceState = 'web' | 'granted' | 'denied' | 'prompt' | 'unknown';

/**
 * Notifications dans l'application (cloche + bannière) et alertes sur le téléphone (push).
 * - La cloche reçoit toujours toutes les notifications.
 * - « Alertes sur le téléphone » = notification_preferences.push_enabled (client).
 * - Sur l'app mobile : état de l'autorisation du téléphone + bouton pour l'activer.
 */
export function PushNotificationsCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [device, setDevice] = useState<DeviceState>('unknown');
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const isNative = Capacitor.isNativePlatform();

  const refreshDevice = async () => {
    if (!isNative) { setDevice('web'); return; }
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.checkPermissions();
      setDevice(perm.receive === 'granted' ? 'granted' : perm.receive === 'denied' ? 'denied' : 'prompt');
    } catch {
      setDevice('unknown');
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [{ data: client }, tokens] = await Promise.all([
          supabase.from('clients').select('id').eq('user_id', user.id).maybeSingle(),
          supabase.from('device_tokens').select('token', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);
        setHasToken(tokens.error ? null : (tokens.count ?? 0) > 0);
        if (client?.id) {
          setClientId(client.id);
          const { data: pr } = await (supabase.from('notification_preferences') as any)
            .select('push_enabled')
            .eq('client_id', client.id)
            .maybeSingle();
          if (pr && typeof pr.push_enabled === 'boolean') setPushEnabled(pr.push_enabled);
        } else {
          // Équipe (admin, agent…) : réglage porté par le profil.
          const { data: prof } = await (supabase.from('profiles') as any)
            .select('notifications_push')
            .eq('id', user.id)
            .maybeSingle();
          if (prof && typeof prof.notifications_push === 'boolean') setPushEnabled(prof.notifications_push);
        }
        await refreshDevice();
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const togglePush = async (checked: boolean) => {
    if (!user) return;
    setPushEnabled(checked);
    const { error } = clientId
      ? await (supabase.from('notification_preferences') as any)
          .upsert({ client_id: clientId, push_enabled: checked }, { onConflict: 'client_id' })
      : await (supabase.from('profiles') as any).update({ notifications_push: checked }).eq('id', user.id);
    if (error) {
      setPushEnabled(!checked);
      toast.error("Impossible d'enregistrer ce réglage");
    } else {
      toast.success(checked ? 'Alertes sur le téléphone activées' : 'Alertes sur le téléphone désactivées');
    }
  };

  const recheckToken = async () => {
    if (!user) return;
    const { count } = await supabase.from('device_tokens').select('token', { count: 'exact', head: true }).eq('user_id', user.id);
    setHasToken((count ?? 0) > 0);
  };

  const enableOnDevice = async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const res = await PushNotifications.requestPermissions();
      if (user) logPushStep(user.id, Capacitor.getPlatform(), 'bouton_activer', res.receive);
      if (res.receive === 'granted') {
        // Le jeton reçu est enregistré par l'écouteur branché au démarrage de l'app.
        await PushNotifications.register();
        toast.success('Notifications autorisées sur ce téléphone');
        window.setTimeout(() => void recheckToken(), 4000);
      } else {
        toast.error('Autorisez les notifications dans les réglages du téléphone (Réglages › Logisorama › Notifications).');
      }
    } catch {
      toast.error("Impossible d'activer les notifications sur cet appareil");
    }
    await refreshDevice();
  };

  if (loading) return null;

  const deviceText: Record<DeviceState, string> = {
    web: "Les alertes sur le téléphone fonctionnent avec l'application mobile Logisorama (App Store / Google Play).",
    granted: hasToken === false
      ? "Autorisées sur ce téléphone, mais l'appareil n'est pas encore enregistré : fermez puis rouvrez l'application."
      : 'Autorisées sur ce téléphone.',
    denied: 'Bloquées sur ce téléphone : activez-les dans Réglages › Logisorama › Notifications.',
    prompt: 'Pas encore autorisées sur ce téléphone.',
    unknown: "État de l'appareil inconnu.",
  };

  return (
    <section className="rounded-[14px] border border-[#dddddd] bg-white p-5 sm:p-6" aria-labelledby="param-inapp">
      <h2 id="param-inapp" className="flex items-center gap-2 text-[17px] font-semibold text-[#222222]">
        <Bell className="h-5 w-5" /> Notifications dans l'application
      </h2>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#ebebeb] p-4">
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-[#222222]">Cloche et bannières dans l'app</p>
            <p className="mt-0.5 text-[14px] text-[#6a6a6a]">Toujours actives : la cloche reçoit toutes vos notifications.</p>
          </div>
          <Switch checked disabled aria-label="Notifications dans l'application (toujours actives)" />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#ebebeb] p-4">
          <div className="min-w-0">
            <Label htmlFor="param-push" className="text-[15px] font-medium text-[#222222]">
              Alertes sur le téléphone
            </Label>
            <p className="mt-0.5 text-[14px] text-[#6a6a6a]">Recevoir une alerte même quand l'application est fermée.</p>
          </div>
          <Switch id="param-push" checked={pushEnabled} onCheckedChange={togglePush} />
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f7f7f7] p-4">
          <Smartphone className="h-5 w-5 shrink-0 text-[#222222]" />
          <p className="min-w-0 flex-1 text-[14px] text-[#3f3f3f]">{deviceText[device]}</p>
          {isNative && (device !== 'granted' || hasToken === false) && (
            <Button type="button" size="sm" onClick={enableOnDevice} className="h-9 rounded-lg">
              Activer sur ce téléphone
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
