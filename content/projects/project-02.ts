import type { Project } from "./types";

// 本作品首頁與獨立頁共用資料；detail 修改詳情頁文案，images / videos 修改媒體。
export const project02: Project = {
  "id": 2,
  "title": "Project 02",
  "description": "Placeholder project — artwork and details to follow.",
  "cover": "",
  "coverAlt": "Project 2 image placeholder",
  "images": [
    "/projects/project-02/study-01.svg",
    "/projects/project-02/study-02.svg",
    "/projects/project-02/study-03.svg"
  ],
  "videos": [],
  "placeholderNumber": "02",
  "placeholderLabel": "PROJECT IMAGE PLACEHOLDER",
  "slug": "project-02",
  "detail": {
    "category": "Visual design",
    "headline": "Structure becomes expression.",
    "introduction": "A demo editorial direction built around scale, contrast and generous space.",
    "approach": "Use a consistent grid as a foundation, then let typography and image placement introduce variation.",
    "year": "2026"
  }
};
