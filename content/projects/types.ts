// 每個作品共用的欄位。素材網址以 /projects/ 開頭，不寫 public/。
export type Project = {
  id: number;
  slug: string; // 網址名稱，例如 project-01
  detail: {
    category: string;
    year: string;
    headline: string;
    introduction: string;
    approach: string;
  };
  title: string;
  description: string;
  cover: string; // 主要作品留空時顯示原來的佔位畫面
  coverAlt: string;
  coverCrop?: CoverCrop;
  featuredMedia?: string; // 詳情頁首屏素材；留空時優先使用第一個影片
  morePreviewMedia?: string; // 舊資料相容欄位，不再由 More Works 使用
  images: string[]; // 無影片時，More Works 按這個順序輪播
  videos: string[]; // More Works 優先播放第一個影片
  placeholderNumber: string;
  placeholderLabel: string;
};

export type CoverCrop = {
  normal: { x: number; y: number; scale: number };
  hover: { x: number; y: number; scale: number };
};
