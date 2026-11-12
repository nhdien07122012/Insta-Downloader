/**
 * photoStorage.ts - Quản lý lưu trữ bộ nhớ đệm ảnh (IndexedDB Persistent Cache)
 * Giúp app khởi động tức thì (<50ms) không cần tải lại từ Telegram
 */

import type { PhotoItem } from "../types";

const DB_NAME = "InstaPhotosCacheDB";
const DB_VERSION = 1;
const STORE_NAME = "cached_photos";

interface StoredPhotoRecord {
  messageId: number;
  id: string;
  thumbnailData: ArrayBuffer;
  hdData?: ArrayBuffer;
  author?: string;
  caption?: string;
  originalUrl?: string;
  groupedId?: string;
  timestamp: number;
  isCarousel?: boolean;
}

// In-memory URL cache để tránh tạo lại nhiều lần trong 1 session
const objectUrlMap = new Map<number, string>();
const hdUrlMap = new Map<number, string>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB không được hỗ trợ trên thiết bị này"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "messageId" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Đọc toàn bộ ảnh từ IndexedDB và chuyển sang PhotoItem để hiển thị tức thì
 */
export async function getCachedPhotosFromDB(): Promise<PhotoItem[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records: StoredPhotoRecord[] = request.result || [];
        // Sắp xếp bài mới nhất lên trước (timestamp giảm dần)
        records.sort((a, b) => b.timestamp - a.timestamp);

        const photos: PhotoItem[] = records.map((rec) => {
          let url = objectUrlMap.get(rec.messageId);
          if (!url) {
            const blob = new Blob([rec.thumbnailData], { type: "image/jpeg" });
            url = URL.createObjectURL(blob);
            objectUrlMap.set(rec.messageId, url);
          }

          return {
            id: rec.id,
            messageId: rec.messageId,
            url,
            thumbnailUrl: url,
            author: rec.author,
            caption: rec.caption,
            originalUrl: rec.originalUrl,
            groupedId: rec.groupedId,
            date: new Date(rec.timestamp),
            isCarousel: rec.isCarousel,
          };
        });

        resolve(photos);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Không thể đọc cache từ IndexedDB:", e);
    return [];
  }
}

/**
 * Kiểm tra danh sách messageId đã có trong IndexedDB
 */
export async function getCachedMessageIds(): Promise<Set<number>> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as number[];
        resolve(new Set(keys));
      };

      request.onerror = () => reject(request.error);
    });
  } catch {
    return new Set();
  }
}

/**
 * Lưu 1 ảnh vào IndexedDB
 */
export async function savePhotoToCache(
  item: Omit<StoredPhotoRecord, "thumbnailData"> & { thumbnailData: ArrayBuffer | Uint8Array }
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Chuyển sang ArrayBuffer sạch
    const buffer =
      item.thumbnailData instanceof ArrayBuffer
        ? item.thumbnailData
        : item.thumbnailData.buffer.slice(
            item.thumbnailData.byteOffset,
            item.thumbnailData.byteOffset + item.thumbnailData.byteLength
          );

    const record: StoredPhotoRecord = {
      ...item,
      thumbnailData: buffer as ArrayBuffer,
    };

    store.put(record);
  } catch (e) {
    console.warn(`Lỗi lưu cache tin nhắn ${item.messageId}:`, e);
  }
}

/**
 * Lấy URL HD đã lưu trong IndexedDB (nếu có)
 */
export async function getCachedHdPhoto(messageId: number): Promise<string | null> {
  if (hdUrlMap.has(messageId)) {
    return hdUrlMap.get(messageId)!;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(messageId);

      request.onsuccess = () => {
        const record = request.result as StoredPhotoRecord | undefined;
        if (record && record.hdData) {
          const blob = new Blob([record.hdData], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          hdUrlMap.set(messageId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Lưu dữ liệu ảnh HD vào IndexedDB
 */
export async function saveHdPhotoToCache(
  messageId: number,
  hdBuffer: ArrayBuffer | Uint8Array
): Promise<string> {
  const buffer =
    hdBuffer instanceof ArrayBuffer
      ? hdBuffer
      : hdBuffer.buffer.slice(
          hdBuffer.byteOffset,
          hdBuffer.byteOffset + hdBuffer.byteLength
        );

  const blob = new Blob([buffer as ArrayBuffer], { type: "image/jpeg" });
  const url = URL.createObjectURL(blob);
  hdUrlMap.set(messageId, url);

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(messageId);

    getReq.onsuccess = () => {
      const record = getReq.result as StoredPhotoRecord | undefined;
      if (record) {
        record.hdData = buffer as ArrayBuffer;
        store.put(record);
      }
    };
  } catch (e) {
    console.warn("Lỗi lưu ảnh HD vào cache:", e);
  }

  return url;
}

/**
 * Lấy thống kê dung lượng bộ nhớ đệm
 */
export async function getCacheStats(): Promise<{ count: number; sizeMB: string }> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result || []) as StoredPhotoRecord[];
        let totalBytes = 0;
        for (const rec of records) {
          if (rec.thumbnailData) totalBytes += rec.thumbnailData.byteLength || 0;
          if (rec.hdData) totalBytes += rec.hdData.byteLength || 0;
        }
        const sizeMB = (totalBytes / (1024 * 1024)).toFixed(1);
        resolve({ count: records.length, sizeMB });
      };

      request.onerror = () => resolve({ count: 0, sizeMB: "0" });
    });
  } catch {
    return { count: 0, sizeMB: "0" };
  }
}

/**
 * Xóa 1 ảnh cụ thể khỏi IndexedDB và giải phóng bộ nhớ
 */
export async function removePhotoFromCache(messageId: number): Promise<void> {
  const objUrl = objectUrlMap.get(messageId);
  if (objUrl) {
    URL.revokeObjectURL(objUrl);
    objectUrlMap.delete(messageId);
  }
  const hdUrl = hdUrlMap.get(messageId);
  if (hdUrl) {
    URL.revokeObjectURL(hdUrl);
    hdUrlMap.delete(messageId);
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(messageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn(`Lỗi xóa ảnh ${messageId} khỏi IndexedDB:`, e);
  }
}

/**
 * Xóa toàn bộ bộ nhớ đệm ảnh
 */
export async function clearPhotoCache(): Promise<void> {
  try {
    // Revoke các ObjectURL để tránh rò rỉ RAM
    objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
    objectUrlMap.clear();

    hdUrlMap.forEach((url) => URL.revokeObjectURL(url));
    hdUrlMap.clear();

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Lỗi khi xóa bộ nhớ đệm:", e);
  }
}
