import type { PhotoItem, TelegramConfig } from "../types";
import {
  getCachedPhotosFromDB,
  getCachedMessageIds,
  savePhotoToCache,
  getCachedHdPhoto,
  saveHdPhotoToCache,
} from "./photoStorage";

// Khóa lưu cấu hình trong LocalStorage
const CONFIG_STORAGE_KEY = "insta_photos_tg_config";

export const DEFAULT_CONFIG: TelegramConfig = {
  apiId: localStorage.getItem("tg_api_id") || "",
  apiHash: localStorage.getItem("tg_api_hash") || "",
  botToken: "9259768287:AAHtvb_axOPOWrbHznw1tdok92gHjLqxY-U",
  channelId: "-1004288667686",
  phoneNumber: localStorage.getItem("tg_phone") || "",
  sessionString: localStorage.getItem("tg_session") || "",
  isLoggedIn: !!localStorage.getItem("tg_session"),
};

export function getStoredConfig(): TelegramConfig {
  const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

export function saveStoredConfig(config: TelegramConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  if (config.sessionString) {
    localStorage.setItem("tg_session", config.sessionString);
  } else if (config.isLoggedIn === false) {
    localStorage.removeItem("tg_session");
  }
}

/**
 * Trích xuất tác giả và caption từ nội dung tin nhắn bot đã đăng (Instagram & Twitter/X)
 */
function parseCaptionAndAuthor(text: string) {
  let author = "";
  let caption = "";
  let originalUrl = "";
  let platform: "instagram" | "twitter" = "instagram";

  const authorMatch = text.match(/Tác giả:\s*@?([a-zA-Z0-9._]+)/i);
  if (authorMatch) author = authorMatch[1];

  const urlMatch = text.match(
    /https?:\/\/(?:www\.|mobile\.)?(?:instagram\.com|twitter\.com|x\.com)\/[^\s<>"]+/i
  );
  if (urlMatch) {
    originalUrl = urlMatch[0];
    if (originalUrl.includes("twitter.com") || originalUrl.includes("x.com")) {
      platform = "twitter";
    }
  }

  const lines = text.split("\n");
  const captionLines = lines.filter(
    (l) =>
      !l.includes("Lưu Trữ") &&
      !l.includes("Tác giả:") &&
      !l.includes("Xem trên") &&
      !l.includes("Số lượng:")
  );
  caption = captionLines.join(" ").trim();

  return { author, caption, originalUrl, platform };
}

/**
 * Dữ liệu mẫu (Sample Data) hiển thị khi chưa điền API_ID/API_HASH từ my.telegram.org
 */
export const SAMPLE_PHOTOS: PhotoItem[] = [
  {
    id: "sample-1",
    messageId: 101,
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    author: "vyvy.babieeeew",
    caption: "at night ✨ (Instagram HD)",
    originalUrl: "https://www.instagram.com/p/Dfms9w1k4x6/",
    groupedId: "sample-carousel-1",
    date: new Date(),
    isCarousel: true,
    carouselIndex: 1,
    totalInCarousel: 3,
  },
  {
    id: "sample-2",
    messageId: 102,
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    author: "vyvy.babieeeew",
    caption: "at night (slide 2)",
    originalUrl: "https://www.instagram.com/p/Dfms9w1k4x6/",
    groupedId: "sample-carousel-1",
    date: new Date(),
    isCarousel: true,
    carouselIndex: 2,
    totalInCarousel: 3,
  },
  {
    id: "sample-3",
    messageId: 103,
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
    author: "vyvy.babieeeew",
    caption: "at night (slide 3)",
    originalUrl: "https://www.instagram.com/p/Dfms9w1k4x6/",
    groupedId: "sample-carousel-1",
    date: new Date(),
    isCarousel: true,
    carouselIndex: 3,
    totalInCarousel: 3,
  },
  {
    id: "sample-4",
    messageId: 104,
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    author: "natgeo",
    caption: "Majestic nature photography from Yosemite Valley.",
    originalUrl: "https://www.instagram.com/p/C4iW3Q_r_gV/",
    date: new Date(Date.now() - 86400000), // Hôm qua
    isCarousel: false,
  },
  {
    id: "sample-5",
    messageId: 105,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
    author: "tech_insider",
    caption: "Cinematic drone capture of night city lights 🔥 (Video MP4)",
    originalUrl: "https://x.com/tech_insider/status/1789012345678901234",
    date: new Date(Date.now() - 86400000 * 2), // 2 ngày trước
    isCarousel: false,
    mediaType: "video",
    duration: 15,
    platform: "twitter",
  },
  {
    id: "sample-6",
    messageId: 106,
    url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80",
    author: "x_creator",
    caption: "Rainy streets reflection aesthetic on Twitter (X).",
    originalUrl: "https://x.com/x_creator/status/1789012345678901235",
    date: new Date(Date.now() - 86400000 * 3),
    isCarousel: false,
    mediaType: "photo",
    platform: "twitter",
  },
];

let globalClient: any = null;

/**
 * Khởi tạo MTProto Client qua GramJS
 */
export async function initTelegramClient(config: TelegramConfig): Promise<any> {
  if (globalClient && globalClient.connected) {
    return globalClient;
  }

  if (!config.apiId || !config.apiHash) {
    throw new Error("Chưa điền API_ID hoặc API_HASH từ my.telegram.org");
  }

  const { TelegramClient } = await import("telegram");
  const { StringSession } = await import("telegram/sessions");

  const session = new StringSession(config.sessionString || "");
  const client = new TelegramClient(
    session,
    parseInt(config.apiId, 10),
    config.apiHash,
    {
      connectionRetries: 5,
      useWSS: true,
    }
  );

  await client.connect();

  if (!config.sessionString && config.botToken) {
    try {
      await client.start({
        botAuthToken: config.botToken,
      });
    } catch (e) {
      console.warn("Khởi động bot token MTProto:", e);
    }
  }

  globalClient = client;
  return client;
}

/**
 * Gửi mã xác nhận Telegram về điện thoại (MTProto Login)
 */
export async function requestTelegramCode(
  apiId: string,
  apiHash: string,
  phoneNumber: string
): Promise<{ phoneCodeHash: string }> {
  const { TelegramClient } = await import("telegram");
  const { StringSession } = await import("telegram/sessions");

  const client = new TelegramClient(
    new StringSession(""),
    parseInt(apiId, 10),
    apiHash,
    { connectionRetries: 5, useWSS: true }
  );

  await client.connect();
  const res = await client.sendCode(
    {
      apiId: parseInt(apiId, 10),
      apiHash,
    },
    phoneNumber
  );

  globalClient = client;
  return { phoneCodeHash: res.phoneCodeHash };
}

/**
 * Xác thực mã đăng nhập và lưu phiên (Session)
 */
export async function verifyTelegramCode(
  phoneNumber: string,
  phoneCodeHash: string,
  code: string,
  password?: string
): Promise<string> {
  if (!globalClient) {
    throw new Error("Client chưa khởi tạo");
  }

  const { Api } = await import("telegram");

  try {
    await globalClient.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code,
      })
    );
  } catch (err: any) {
    if (err.errorMessage === "SESSION_PASSWORD_NEEDED" && password) {
      await globalClient.signInWithPassword({
        password: async () => password,
      });
    } else {
      throw err;
    }
  }

  const sessionString = globalClient.session.save();
  localStorage.setItem("tg_session", sessionString);
  return sessionString;
}

/**
 * Đăng xuất Telegram
 */
export async function logoutTelegram(): Promise<void> {
  if (globalClient) {
    try {
      await globalClient.disconnect();
    } catch {}
    globalClient = null;
  }
  localStorage.removeItem("tg_session");
}

/**
 * Lấy danh sách ảnh trực tiếp từ Kênh Telegram với hỗ trợ IndexedDB Persistent Cache
 */
export async function fetchChannelPhotos(
  config: TelegramConfig,
  limit: number = 80
): Promise<PhotoItem[]> {
  if (!config.apiId || !config.apiHash) {
    return SAMPLE_PHOTOS;
  }

  if (!config.sessionString && !config.isLoggedIn) {
    throw new Error(
      "CHUA_DANG_NHAP: Bạn cần đăng nhập tài khoản Telegram bằng số điện thoại để đọc ảnh từ Kênh lưu trữ."
    );
  }

  try {
    const client = await initTelegramClient(config);
    let targetPeer: any = config.channelId;
    try {
      targetPeer = await client.getEntity(config.channelId);
    } catch {
      try {
        targetPeer = await client.getEntity(BigInt(config.channelId));
      } catch {
        targetPeer = config.channelId;
      }
    }

    // 1. Kiểm tra danh sách messageId đã lưu trong IndexedDB máy
    const cachedIds = await getCachedMessageIds();

    // 2. Lấy danh sách tin nhắn mới từ Telegram
    const messages = await client.getMessages(targetPeer, { limit });

    // 3. Tải thumbnail CHO CÁC TIN NHẮN MỚI CHƯA CÓ TRONG CACHE (cả Ảnh và Video)
    for (const msg of messages) {
      if (!msg.media) continue;

      const isPhoto = !!msg.media.photo;
      const isVideo = !!(
        msg.media.document &&
        (msg.media.document.mimeType?.startsWith("video/") ||
          msg.media.document.attributes?.some(
            (a: any) => a.className === "DocumentAttributeVideo"
          ))
      );

      if (!isPhoto && !isVideo) continue;

      let duration = 0;
      if (isVideo && msg.media.document?.attributes) {
        const videoAttr = msg.media.document.attributes.find(
          (a: any) => a.className === "DocumentAttributeVideo"
        );
        if (videoAttr && videoAttr.duration) {
          duration = Math.round(videoAttr.duration);
        }
      }

      // Nếu đã có trong IndexedDB, bỏ qua không tải lại
      if (cachedIds.has(msg.id)) continue;

      const { author, caption, originalUrl, platform } = parseCaptionAndAuthor(
        msg.message || ""
      );

      try {
        // Tải thumbnail sắc nét (thumb: 1 hoặc 2) cho Retina màn hình iPhone
        const buffer = await client.downloadMedia(msg.media, { thumb: isVideo ? 1 : 2 });
        if (buffer) {
          await savePhotoToCache({
            messageId: msg.id,
            id: `tg-${msg.id}`,
            thumbnailData: buffer,
            author,
            caption,
            originalUrl,
            groupedId: msg.groupedId ? String(msg.groupedId) : undefined,
            timestamp: msg.date * 1000,
            isCarousel: msg.groupedId != null,
            mediaType: isVideo ? "video" : "photo",
            duration,
            platform,
          });
          cachedIds.add(msg.id);
        }
      } catch (e) {
        console.warn(`Lỗi tải media tin nhắn ${msg.id}:`, e);
      }
    }

    // 4. Trả về toàn bộ ảnh từ IndexedDB (cực kỳ nhanh, đúng thứ tự)
    const allPhotos = await getCachedPhotosFromDB();
    return allPhotos;
  } catch (error: any) {
    console.error("Lỗi kết nối Telegram MTProto:", error);
    // Nếu gặp lỗi mạng, trả về ảnh đã có trong IndexedDB để người dùng vẫn xem được
    const fallbackPhotos = await getCachedPhotosFromDB();
    if (fallbackPhotos.length > 0) {
      return fallbackPhotos;
    }
    throw error;
  }
}

/**
 * Tải ảnh hoặc video gốc độ phân giải cao nhất (HD Full Resolution) từ Telegram CDN hoặc IndexedDB
 */
export async function fetchFullResolutionPhoto(
  config: TelegramConfig,
  messageId: number
): Promise<string | null> {
  // 1. Kiểm tra cache IndexedDB trước (mở tức thì)
  const cachedHd = await getCachedHdPhoto(messageId);
  if (cachedHd) {
    return cachedHd;
  }

  try {
    const client = await initTelegramClient(config);
    let targetPeer: any = config.channelId;
    try {
      targetPeer = await client.getEntity(config.channelId);
    } catch {
      targetPeer = config.channelId;
    }

    const messages = await client.getMessages(targetPeer, { ids: [messageId] });
    if (messages && messages[0] && messages[0].media) {
      const isVideo = !!(
        messages[0].media.document &&
        (messages[0].media.document.mimeType?.startsWith("video/") ||
          messages[0].media.document.attributes?.some(
            (a: any) => a.className === "DocumentAttributeVideo"
          ))
      );
      const mimeType = isVideo ? "video/mp4" : "image/jpeg";

      // Tải media nguyên bản không nén (100% gốc HD/4K/MP4)
      const buffer = await client.downloadMedia(messages[0].media);
      if (buffer) {
        const hdUrl = await saveHdPhotoToCache(messageId, buffer, mimeType);
        return hdUrl;
      }
    }
  } catch (err) {
    console.warn(`Lỗi tải media gốc tin nhắn ${messageId}:`, err);
  }
  return null;
}

/**
 * Gửi liên kết Instagram đến Kênh lưu trữ qua Telegram MTProto
 */
export async function sendInstagramLinkToChannel(
  config: TelegramConfig,
  url: string
): Promise<boolean> {
  const client = await initTelegramClient(config);
  let targetPeer: any = config.channelId;
  try {
    targetPeer = await client.getEntity(config.channelId);
  } catch {
    try {
      targetPeer = await client.getEntity(BigInt(config.channelId));
    } catch {
      targetPeer = config.channelId;
    }
  }

  await client.sendMessage(targetPeer, { message: url.trim() });
  return true;
}

export const sendMediaLinkToChannel = sendInstagramLinkToChannel;

/**
 * Gửi lệnh /scan đến Kênh lưu trữ qua Telegram MTProto để kích hoạt bot TX3 Mini quét & tải link tồn đọng
 */
export async function triggerChannelScan(
  config: TelegramConfig,
  limit: number = 20
): Promise<boolean> {
  if (!config.sessionString && !config.isLoggedIn) {
    return false;
  }
  try {
    const client = await initTelegramClient(config);
    let targetPeer: any = config.channelId;
    try {
      targetPeer = await client.getEntity(config.channelId);
    } catch {
      try {
        targetPeer = await client.getEntity(BigInt(config.channelId));
      } catch {
        targetPeer = config.channelId;
      }
    }
    const cmd = limit && limit !== 20 ? `/scan ${limit}` : `/scan`;
    await client.sendMessage(targetPeer, { message: cmd });
    return true;
  } catch (err) {
    console.warn("Lỗi gửi lệnh /scan đến Kênh qua MTProto:", err);
    return false;
  }
}

/**
 * Xóa tin nhắn ảnh vĩnh viễn trên Kênh Telegram
 */
export async function deleteTelegramPhoto(
  config: TelegramConfig,
  messageId: number
): Promise<boolean> {
  let deleted = false;

  // Cách 1: Sử dụng MTProto Client với phiên đăng nhập người dùng
  if (config.sessionString || config.isLoggedIn) {
    try {
      const client = await initTelegramClient(config);
      let targetPeer: any = config.channelId;
      try {
        targetPeer = await client.getEntity(config.channelId);
      } catch {
        try {
          targetPeer = await client.getEntity(BigInt(config.channelId));
        } catch {
          targetPeer = config.channelId;
        }
      }

      await client.deleteMessages(targetPeer, [messageId], { revoke: true });
      deleted = true;
    } catch (err) {
      console.warn("Lỗi xóa ảnh qua MTProto:", err);
    }
  }

  // Cách 2: Dự phòng qua Telegram Bot API (nếu có botToken)
  if (!deleted && config.botToken && config.channelId) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${config.botToken}/deleteMessage?chat_id=${config.channelId}&message_id=${messageId}`
      );
      const json = await res.json();
      if (json && json.ok) {
        deleted = true;
      }
    } catch (err) {
      console.warn("Lỗi xóa ảnh qua Bot API:", err);
    }
  }

  return deleted;
}
