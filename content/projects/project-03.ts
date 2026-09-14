import type { Project } from "./types";

// 本作品首頁與獨立頁共用資料；detail 修改詳情頁文案，images / videos 修改媒體。
export const project03: Project = {
  "id": 3,
  "title": "Project 03",
  "description": "Video preview · Demo footage",
  "cover": "/projects/project-03/cover.svg",
  "coverAlt": "Project 03 preview placeholder",
  "images": [
    "/projects/project-03/study-01.svg",
    "/projects/project-03/study-02.svg",
    "/projects/project-03/study-03.svg"
  ],
  "videos": [
    "/projects/project-03/preview.mp4"
  ],
  "placeholderNumber": "03",
  "placeholderLabel": "PROJECT IMAGE PLACEHOLDER",
  "slug": "project-03",
  "detail": {
    "category": "3D & CGI",
    "headline": "Light gives form a voice.",
    "introduction": "A demo material exploration using glass, reflection and movement. The video is sample footage for testing the project page.",
    "approach": "Observe how the silhouette changes as light travels through the material. Use still frames to study the relationship between colour and depth.",
    "year": "2026"
  }
};
