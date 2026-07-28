import type { ConversationTabCounts, ConversationTabKey } from "@/components/messaging/ConversationTabs";

export const ROBOT_AGENT_USER_ID = "ed0ca4bb-79e4-4cf5-b2bc-3ecd16ff9752";

export interface ConvLastMeta {
  sender_type?: string | null;
  sender_id?: string | null;
  attachment_type?: string | null;
}

interface FilterParams<T> {
  conversations: T[];
  getId: (c: T) => string;
  lastMetaMap: Map<string, ConvLastMeta>;
  unreadMap: Map<string, number>;
  videoConvSet: Set<string>;
  /** Sender type that means "the user themselves" (agent or admin) */
  selfSenderType: "agent" | "admin";
}

export function computeTabBuckets<T>({
  conversations,
  getId,
  lastMetaMap,
  unreadMap,
  videoConvSet,
  selfSenderType,
}: FilterParams<T>): { filtered: Record<ConversationTabKey, T[]>; counts: ConversationTabCounts } {
  const a_traiter: T[] = [];
  const videos: T[] = [];
  const clients: T[] = [];
  const robot: T[] = [];

  for (const conv of conversations) {
    const id = getId(conv);
    const meta = lastMetaMap.get(id) || {};
    const unread = unreadMap.get(id) || 0;

    // À traiter : unread > 0 ET dernier message pas de moi
    if (unread > 0 && meta.sender_type && meta.sender_type !== selfSenderType) {
      a_traiter.push(conv);
    }

    // Vidéos & visites : conversation contient au moins un message vidéo
    if (videoConvSet.has(id)) {
      videos.push(conv);
    }

    // Réponses clients : dernier message envoyé par client
    if (meta.sender_type === "client") {
      clients.push(conv);
    }

    // Offres du robot : dernier message par l'agent robot
    if (meta.sender_id === ROBOT_AGENT_USER_ID) {
      robot.push(conv);
    }
  }

  return {
    filtered: {
      a_traiter,
      videos,
      clients,
      robot,
      tout: conversations,
    },
    counts: {
      a_traiter: a_traiter.length,
      videos: videos.length,
      clients: clients.length,
      robot: robot.length,
      tout: conversations.length,
    },
  };
}
