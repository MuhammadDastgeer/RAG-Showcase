import { DocumentSession, ChatMessage } from "../types";

const DB_NAME = "RagShowcaseDB";
const DB_VERSION = 1;
const STORE_SESSIONS = "document_sessions";
const STORE_MESSAGES = "chat_messages";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const msgStore = db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
        msgStore.createIndex("sessionId_ragType", ["sessionId", "ragType"], { unique: false });
      }
    };
  });
}

export async function saveSessionToIDB(session: DocumentSession): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    const store = tx.objectStore(STORE_SESSIONS);
    const safeSession = JSON.parse(JSON.stringify(session));
    const req = store.put(safeSession);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSessionsFromIDB(): Promise<DocumentSession[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readonly");
    const store = tx.objectStore(STORE_SESSIONS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSessionFromIDB(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    const store = tx.objectStore(STORE_SESSIONS);
    const req = store.delete(sessionId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveChatMessageToIDB(sessionId: string, ragType: string, message: ChatMessage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MESSAGES, "readwrite");
    const store = tx.objectStore(STORE_MESSAGES);
    const safeMessage = JSON.parse(JSON.stringify({ ...message, sessionId, ragType }));
    const req = store.put(safeMessage);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getChatMessagesFromIDB(sessionId: string, ragType: string): Promise<ChatMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MESSAGES, "readonly");
    const store = tx.objectStore(STORE_MESSAGES);
    const req = store.getAll();
    req.onsuccess = () => {
      const all: any[] = req.result || [];
      const filtered = all
        .filter((item) => item.sessionId === sessionId && item.ragType === ragType)
        .sort((a, b) => a.timestamp - b.timestamp);
      resolve(filtered);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteChatSessionMessagesFromIDB(sessionId: string, ragType: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MESSAGES, "readwrite");
    const store = tx.objectStore(STORE_MESSAGES);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      const keys = req.result;
      const getReq = store.getAll();
      getReq.onsuccess = () => {
        const items = getReq.result || [];
        items.forEach((item, idx) => {
          if (item.sessionId === sessionId && item.ragType === ragType) {
            store.delete(keys[idx]);
          }
        });
        resolve();
      };
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllIDBData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SESSIONS, STORE_MESSAGES], "readwrite");
    tx.objectStore(STORE_SESSIONS).clear();
    tx.objectStore(STORE_MESSAGES).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
