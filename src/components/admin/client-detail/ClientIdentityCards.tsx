import { Calendar, Mail, MapPin, Phone, Shield, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnlineStatusBadge } from '@/components/premium/OnlineStatusBadge';
import { DetailRow, DetailRows, dateCH } from '@/components/details/DetailPrimitives';
import { FicheCard, Field, FieldGrid } from './parts';
import type { Agent, Client, Profile } from './model';

/** Informations personnelles : statut en ligne, coordonnées cliquables, état civil, nationalité, permis. */
export function PersonalInfoCard({ client, profile, stablePermis }: { client: Client; profile: Profile; stablePermis: boolean }) {
  const tel = (profile.telephone || '').replace(/[^+0-9]/g, '');
  return (
    <FicheCard icon={User} title="Informations personnelles" action={
      <OnlineStatusBadge lastSeenAt={profile.last_seen_at} isOnline={profile.is_online} size="md" />
    }>
      <DetailRows>
        <DetailRow icon={Mail} label="E-mail" value={profile.email} href={profile.email ? `mailto:${profile.email}` : undefined} />
        <DetailRow icon={Phone} label="Téléphone" value={profile.telephone || 'Non renseigné'} href={tel ? `tel:${tel}` : undefined} />
        {client.date_naissance && <DetailRow icon={Calendar} label="Date de naissance" value={dateCH(client.date_naissance)} />}
        {client.adresse && <DetailRow icon={MapPin} label="Adresse actuelle" value={client.adresse} />}
      </DetailRows>
      <FieldGrid className="mt-3">
        <Field label="État civil" value={client.etat_civil} />
        <Field label="Nationalité" value={client.nationalite} />
        <Field
          label="Type de permis"
          wide
          value={client.type_permis ? (
            <span className={stablePermis ? '' : 'text-amber-700 dark:text-amber-400'}>
              <Shield className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
              {client.type_permis}{!stablePermis && ' · statut non stable'}
            </span>
          ) : null}
        />
      </FieldGrid>
    </FicheCard>
  );
}

/** Suivi : agent assigné (ou bouton d'assignation), commission, date d'ajout, notes de l'agent. */
export function FollowUpCard({ client, agent, onAssign }: { client: Client; agent: Agent | null; onAssign: () => void }) {
  return (
    <FicheCard icon={Users} title="Suivi">
      <FieldGrid cols={3}>
        {agent ? (
          <Field
            label="Agent assigné"
            emphasis
            value={(
              <span>
                <span className="block">{agent.profile.prenom} {agent.profile.nom}</span>
                <span className="block break-all text-sm font-normal text-muted-foreground">{agent.profile.email}</span>
              </span>
            )}
          />
        ) : (
          <div className="flex min-w-0 flex-col items-start justify-center gap-2 rounded-2xl bg-muted/40 px-3.5 py-2.5 dark:bg-white/[0.04]">
            <span className="text-[13px] text-muted-foreground">Aucun agent assigné</span>
            <Button variant="outline" size="sm" onClick={onAssign}>
              <Users className="h-4 w-4" />
              Assigner un agent
            </Button>
          </div>
        )}
        <Field label="Commission split" value={`${client.commission_split || 50}%`} />
        <Field label="Date d'ajout" value={dateCH(client.date_ajout || client.created_at || '')} />
      </FieldGrid>
      {client.note_agent && (
        <div className="mt-3 rounded-2xl bg-muted/40 px-3.5 py-3 dark:bg-white/[0.04]">
          <p className="text-[13px] text-muted-foreground">Notes de l'agent</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] text-foreground">{client.note_agent}</p>
        </div>
      )}
    </FicheCard>
  );
}
