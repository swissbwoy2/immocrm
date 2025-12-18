import { openDB, DBSchema, IDBPDatabase } from "idb";

interface OfflineDBSchema extends DBSchema {
  notifications: {
    key: string;
    value: {
      id: string;
      title: string;
      message: string | null;
      type: string;
      read: boolean;
      created_at: string;
      link: string | null;
    };
    indexes: { "by-date": string };
  };
  messages: {
    key: string;
    value: {
      id: string;
      conversation_id: string;
      content: string | null;
      sender_id: string;
      sender_type: string;
      created_at: string;
      read: boolean;
    };
    indexes: { "by-conversation": string };
  };
  offres: {
    key: string;
    value: {
      id: string;
      titre: string | null;
      adresse: string;
      prix: number;
      pieces: number | null;
      surface: number | null;
      statut: string | null;
      created_at: string | null;
    };
    indexes: { "by-date": string };
  };
  syncQueue: {
    key: number;
    value: {
      id?: number;
      type: string;
      table: string;
      data: unknown;
      method: "insert" | "update" | "delete";
      timestamp: number;
      retries: number;
    };
    indexes: { "by-timestamp": number };
  };
}

const DB_NAME = "immocrm-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Notifications store
        if (!db.objectStoreNames.contains("notifications")) {
          const notifStore = db.createObjectStore("notifications", { keyPath: "id" });
          notifStore.createIndex("by-date", "created_at");
        }

        // Messages store
        if (!db.objectStoreNames.contains("messages")) {
          const msgStore = db.createObjectStore("messages", { keyPath: "id" });
          msgStore.createIndex("by-conversation", "conversation_id");
        }

        // Offres store
        if (!db.objectStoreNames.contains("offres")) {
          const offreStore = db.createObjectStore("offres", { keyPath: "id" });
          offreStore.createIndex("by-date", "created_at");
        }

        // Sync queue store
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", { 
            keyPath: "id", 
            autoIncrement: true 
          });
          syncStore.createIndex("by-timestamp", "timestamp");
        }
      },
    });
  }
  return dbPromise;
}

// CRUD operations for specific stores
export const offlineStorage = {
  notifications: {
    async getAll() {
      const db = await getDB();
      return db.getAll("notifications");
    },
    async get(key: string) {
      const db = await getDB();
      return db.get("notifications", key);
    },
    async put(value: OfflineDBSchema["notifications"]["value"]) {
      const db = await getDB();
      return db.put("notifications", value);
    },
    async delete(key: string) {
      const db = await getDB();
      return db.delete("notifications", key);
    },
    async clear() {
      const db = await getDB();
      return db.clear("notifications");
    },
    async bulkPut(values: OfflineDBSchema["notifications"]["value"][]) {
      const db = await getDB();
      const tx = db.transaction("notifications", "readwrite");
      await Promise.all([...values.map((v) => tx.store.put(v)), tx.done]);
    },
  },
  messages: {
    async getAll() {
      const db = await getDB();
      return db.getAll("messages");
    },
    async get(key: string) {
      const db = await getDB();
      return db.get("messages", key);
    },
    async put(value: OfflineDBSchema["messages"]["value"]) {
      const db = await getDB();
      return db.put("messages", value);
    },
    async delete(key: string) {
      const db = await getDB();
      return db.delete("messages", key);
    },
    async clear() {
      const db = await getDB();
      return db.clear("messages");
    },
    async bulkPut(values: OfflineDBSchema["messages"]["value"][]) {
      const db = await getDB();
      const tx = db.transaction("messages", "readwrite");
      await Promise.all([...values.map((v) => tx.store.put(v)), tx.done]);
    },
    async getByConversation(conversationId: string) {
      const db = await getDB();
      return db.getAllFromIndex("messages", "by-conversation", conversationId);
    },
  },
  offres: {
    async getAll() {
      const db = await getDB();
      return db.getAll("offres");
    },
    async get(key: string) {
      const db = await getDB();
      return db.get("offres", key);
    },
    async put(value: OfflineDBSchema["offres"]["value"]) {
      const db = await getDB();
      return db.put("offres", value);
    },
    async delete(key: string) {
      const db = await getDB();
      return db.delete("offres", key);
    },
    async clear() {
      const db = await getDB();
      return db.clear("offres");
    },
    async bulkPut(values: OfflineDBSchema["offres"]["value"][]) {
      const db = await getDB();
      const tx = db.transaction("offres", "readwrite");
      await Promise.all([...values.map((v) => tx.store.put(v)), tx.done]);
    },
  },
  syncQueue: {
    async getAll() {
      const db = await getDB();
      return db.getAll("syncQueue");
    },
    async add(value: Omit<OfflineDBSchema["syncQueue"]["value"], "id">) {
      const db = await getDB();
      return db.add("syncQueue", value as OfflineDBSchema["syncQueue"]["value"]);
    },
    async delete(key: number) {
      const db = await getDB();
      return db.delete("syncQueue", key);
    },
    async clear() {
      const db = await getDB();
      return db.clear("syncQueue");
    },
    async count() {
      const db = await getDB();
      return db.count("syncQueue");
    },
    async getAllByTimestamp() {
      const db = await getDB();
      return db.getAllFromIndex("syncQueue", "by-timestamp");
    },
  },
};
