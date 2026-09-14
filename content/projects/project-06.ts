import type { Project } from "./types";

// 本作品首頁與獨立頁共用資料；detail 修改詳情頁文案，images / videos 修改媒體。
export const project06: Project = {
  "id": 6,
  "title": "Project 06",
  "description": "Image sequence · Placeholder",
  "cover": "/projects/project-06/cover.svg",
  "coverAlt": "Project 06 preview placeholder",
  "images": [
    "/projects/project-06/study-01.svg",
    "/projects/project-06/study-02.svg",
    "/projects/project-06/study-03.svg"
  ],
  "videos": [],
  "placeholderNumber": "06",
  "placeholderLabel": "PROJECT IMAGE PLACEHOLDER",
  "slug": "project-06",
  "detail": {
    "category": "Creative research",
    "headline": "Observe, connect, make.",
    "introduction": "A demo research-led project connecting observations with small visual prototypes.",
    "approach": "Collect references, identify recurring patterns and translate them into a sequence of simple studies.",
    "year": "2026"
  }
};
