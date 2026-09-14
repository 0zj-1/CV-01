import type { Project } from "./types";

// 本作品首頁與獨立頁共用資料；detail 修改詳情頁文案，images / videos 修改媒體。
export const project05: Project = {
  "id": 5,
  "title": "Project 05",
  "description": "Image sequence · Placeholder",
  "cover": "/projects/project-05/cover.svg",
  "coverAlt": "Project 05 preview placeholder",
  "images": [
    "/projects/project-05/study-01.svg",
    "/projects/project-05/study-02.svg",
    "/projects/project-05/study-03.svg"
  ],
  "videos": [],
  "placeholderNumber": "05",
  "placeholderLabel": "PROJECT IMAGE PLACEHOLDER",
  "slug": "project-05",
  "detail": {
    "category": "Art direction",
    "headline": "One idea, many surfaces.",
    "introduction": "A demo exploration of how a single visual idea can connect different formats.",
    "approach": "Define a small vocabulary of shapes and colours, then adapt their relationships to each surface.",
    "year": "2026"
  }
};
