import { intro } from './intro';
import { footer } from './footer';
import { worksCopy } from './works';
import { projectPageCopy } from './project-page';
export const chineseIntro = { ...intro,
  first: { line: '從結構出發，', emphasis: '讓想像成形。' },
  second: { line: '媒介各異，', emphasis: '思路相通。' },
  processWords: ['觀察。', '探問。', '構築。', '推敲。'],
  final: '餘下的，交給作品。', loading: '正在載入影片…', videoError: '影片未能載入。',
};
export const chineseWorks = { ...worksCopy, heading: '更多作品。', subtitleLine1: '媒介各異，', subtitleLine2: '思路相通。', previous: '上一組作品', next: '下一組作品' };
export const chineseProjectPage = { ...projectPageCopy, back: '← 所有作品', demo: '作品示範 / 暫用內容', overview: '作品介紹', approach: '設計方法', next: '下一個作品 →', videoFallback: '你的瀏覽器不支援此影片。' };
export const chineseFooter = { ...footer,
  headlineBefore: '下一個想法，', headlineAfter: '一起讓它成形。', rotatingWords: ['品牌設計', '三維建模', '視覺創作', '遊戲設計'],
  columns: {
    work: { title: '作品', items: ['精選作品', '品牌設計', '3D 與電腦影像', 'AI 實驗'] },
    about: { title: '關於', items: ['個人簡介', '經歷', '履歷'] },
    connect: { ...footer.columns.connect, title: '社交平台' },
    contact: { ...footer.columns.contact, title: '聯絡' },
  },
  bottomLeft: '香港・設計師與創作者', bottomRight: '品牌、視覺、3D 與新技術',
};
