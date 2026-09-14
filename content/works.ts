import { project01 } from "./projects/project-01";
import { project02 } from "./projects/project-02";
import { project03 } from "./projects/project-03";
import { project04 } from "./projects/project-04";
import { project05 } from "./projects/project-05";
import { project06 } from "./projects/project-06";

// 清單從左至右就是展示順序；新增作品時先匯入上方，再加入對應清單。
export const selectedWorks = [project01, project02];
export const moreWorks = [project03, project04, project05, project06];

// More Works 標題與副標題；每個作品的名稱／說明在各自的文件。
export const worksCopy = {
  heading: 'More works.',
  subtitleLine1: 'Different mediums.',
  subtitleLine2: 'One way of thinking.',
  previous: 'Previous works',
  next: 'Next works',
};

// 所有獨立作品頁也使用這份清單。
export const allWorks = [...selectedWorks, ...moreWorks];
