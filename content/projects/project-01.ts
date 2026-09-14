import type { Project } from "./types";

// 本作品首頁與獨立頁共用資料；detail 修改詳情頁文案，images / videos 修改媒體。
export const project01: Project = {
  "id": 1,
  "title": "Project 01",
  "description": "Placeholder project — artwork and details to follow.",
  "cover": "",
  "coverAlt": "Project 1 image placeholder",
  "images": [
    "/projects/project-01/study-01.svg",
    "/projects/project-01/study-02.svg",
    "/projects/project-01/study-03.svg"
  ],
  "videos": [],
  "placeholderNumber": "01",
  "placeholderLabel": "PROJECT IMAGE PLACEHOLDER",
  "slug": "project-01",
  "detail": {
    "category": "Branding",
    "headline": "A system with room to move.",
    "introduction": "A demo identity study exploring how a simple geometric language can become a flexible visual system.",
    "approach": "Start with a modular mark, then test its rhythm across a poster, a printed object and a digital surface.",
    "year": "2026"
  }
};
