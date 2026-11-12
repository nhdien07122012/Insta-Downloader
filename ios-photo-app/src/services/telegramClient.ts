import type { PhotoItem, TelegramConfig } from "../types";

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
}

// Bộ nhớ cache tạm trong RAM để không tải lại ảnh đã tải
const mediaCache = new Map<number, string>();

/**
 * Trích xuất tác giả và caption từ nội dung tin nhắn bot đã đăng
 */
function parseCaptionAndAuthor(text: string) {
  let author = "";
  let caption = "";
  let originalUrl = "";

  const authorMatch = text.match(/Tác giả:\s*@?([a-zA-Z0-9._]+)/i);
  if (authorMatch) author = authorMatch[1];

  const urlMatch = text.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s<>"]+/i);
  if (urlMatch) originalUrl = urlMatch[0];

  const lines = text.split("\n");
  const captionLines = lines.filter(
    (l) =>
      !l.includes("Instagram Lưu Trữ") &&
      !l.includes("Tác giả:") &&
      !l.includes("Xem trên Instagram") &&
      !l.includes("Số lượng:")
  );
  caption = captionLines.join(" ").trim();

  return { author, caption, originalUrl };
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
    url: "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?auto=format&fit=crop&w=400&q=80",
    author: "travel.gram",
    caption: "Sunset over the coastal cliff edge.",
    originalUrl: "https://www.instagram.com/",
    date: new Date(Date.now() - 86400000 * 2), // 2 ngày trước
    isCarousel: false,
  },
  {
    id: "sample-6",
    messageId: 106,
    url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80",
    author: "street.photography",
    caption: "Rainy streets reflection.",
    originalUrl: "https://www.instagram.com/",
    date: new Date(Date.now() - 86400000 * 3),
    isCarousel: false,
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
 * Lấy danh sách ảnh trực tiếp từ Kênh Telegram
 */
export async function fetchChannelPhotos(
  config: TelegramConfig,
  limit: number = 60
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

    const messages = await client.getMessages(targetPeer, { limit });
    const photos: PhotoItem[] = [];

    for (const msg of messages) {
      if (!msg.media) continue;

      const { author, caption, originalUrl } = parseCaptionAndAuthor(
        msg.message || ""
      );

      // Nếu là ảnh (Photo)
      if (msg.media.photo) {
        let photoUrl = mediaCache.get(msg.id);
        if (!photoUrl) {
          try {
            // Tải thumbnail sắc nét (thumb: 2 ~800px) cho Retina màn hình iPhone
            const buffer = await client.downloadMedia(msg.media, { thumb: 2 });
            if (buffer) {
              const blob = new Blob([buffer], { type: "image/jpeg" });
              photoUrl = URL.createObjectURL(blob);
              mediaCache.set(msg.id, photoUrl);
            }
          } catch (e) {
            console.warn(`Lỗi tải media tin nhắn ${msg.id}:`, e);
          }
        }

        if (photoUrl) {
          photos.push({
            id: `tg-${msg.id}`,
            messageId: msg.id,
            url: photoUrl,
            thumbnailUrl: photoUrl,
            author,
            caption,
            originalUrl,
            groupedId: msg.groupedId ? String(msg.groupedId) : undefined,
            date: new Date(msg.date * 1000),
            isCarousel: msg.groupedId != null,
          });
        }
      }
    }

    return photos;
  } catch (error: any) {
    console.error("Lỗi kết nối Telegram MTProto:", error);
    throw error;
  }
}

const fullResolutionCache = new Map<number, string>();

/**
 * Tải ảnh gốc độ phân giải cao nhất (HD Full Resolution) từ Telegram CDN
 */
export async function fetchFullResolutionPhoto(
  config: TelegramConfig,
  messageId: number
): Promise<string | null> {
  if (fullResolutionCache.has(messageId)) {
    return fullResolutionCache.get(messageId)!;
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
      // Tải ảnh nguyên bản không nén (100% gốc HD/4K)
      const buffer = await client.downloadMedia(messages[0].media);
      if (buffer) {
        const blob = new Blob([buffer], { type: "image/jpeg" });
        const hdUrl = URL.createObjectURL(blob);
        fullResolutionCache.set(messageId, hdUrl);
        return hdUrl;
      }
    }
  } catch (err) {
    console.warn(`Lỗi tải ảnh gốc tin nhắn ${messageId}:`, err);
  }
  return null;
}
