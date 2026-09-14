import type { Project } from "./types";

// 本作品首頁與獨立頁共用資料；detail 修改詳情頁文案，images / videos 修改媒體。
export const project04: Project = {
  "id": 4,
  "title": "Project 04",
  "description": "Image sequence · Placeholder",
  "cover": "/projects/project-04/cover.svg",
  "coverAlt": "Project 04 preview placeholder",
  "images": [
    "/projects/project-04/study-01.svg",
    "/projects/project-04/study-02.svg",
    "/projects/project-04/study-03.svg"
  ],
  "videos": [],
  "placeholderNumber": "04",
  "placeholderLabel": "PROJECT IMAGE PLACEHOLDER",
  "slug": "project-04",
  "detail": {
    "category": "AI Experiments",
    "headline": "An unexpected point of view.",
    "introduction": "A demo project page for future experiments with emerging image-making tools. All current visuals are placeholders.",
    "approach": "Begin with a clear visual question, compare variations, then refine the most promising direction through deliberate editing.",
    "year": "2026"
  }
};
