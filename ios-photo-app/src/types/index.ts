export interface PhotoItem {
  id: string | number;
  messageId: number;
  url: string; // Blob URL or Direct Telegram CDN URL
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  caption?: string;
  author?: string;
  originalUrl?: string;
  groupedId?: string;
  date: Date;
  isCarousel?: boolean;
  carouselIndex?: number;
  totalInCarousel?: number;
  carouselItems?: PhotoItem[];
}

export interface DateGroup {
  dateTitle: string; // e.g. "Hôm nay", "Hôm qua", "11 Tháng 11, 2026"
  photos: PhotoItem[];
}

export interface PostAlbum {
  id: string; // key from originalUrl or groupedId
  title: string;
  originalUrl?: string;
  author: string;
  date: Date;
  coverPhoto: PhotoItem;
  photos: PhotoItem[];
}

export interface TelegramConfig {
  apiId: string;
  apiHash: string;
  botToken: string;
  channelId: string;
  phoneNumber?: string;
  sessionString?: string;
  isLoggedIn?: boolean;
}
