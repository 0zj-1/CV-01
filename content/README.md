# 網站內容修改指南

平常改文字或作品，從這個資料夾開始，不需要修改動畫程式。

| 想修改什麼 | 打開哪個文件 |
| --- | --- |
| 首頁四段文案、背景影片 | `intro.ts` |
| 主要作品、More Works 的順序與展示清單 | `works.ts` |
| More Works 標題、副標題 | `works.ts` 的 `worksCopy` |
| 作品一的名稱、封面、說明、素材 | `projects/project-01.ts` |
| 其他作品 | 對應的 `projects/project-02.ts` 至 `project-06.ts` |
| 頁尾標題、四欄、電郵、底部文字、FORM | `footer.ts` |
| 頁尾跳動單詞、玻璃圖片 | `footer.ts` |
| 瀏覽器分頁名稱、網站描述 | `site.ts` |

## 改一個作品

例如作品三：打開 `projects/project-03.ts`。

- `title`：作品名稱。
- `description`：作品下方說明。
- `cover`：封面圖片路徑。
- `coverAlt`：圖片的文字描述。
- `videos`：影片清單；More Works 滑鼠預覽優先播放第一個影片。
- `images`：圖片清單；沒有影片時，More Works 按此順序循環播放。
- `id`：唯一編號，不要與其他作品重複。
- `placeholderNumber`、`placeholderLabel`：主要作品尚無封面時的佔位文字。

素材放在根目錄 `public/projects/project-03/`，例如放入 `cover.jpg` 後，填寫：

```ts
cover: '/projects/project-03/cover.jpg',
images: ['/projects/project-03/01.jpg', '/projects/project-03/02.jpg'],
videos: [],
```

路徑不包含 `public`。目前作品一、二保留原佔位畫面；填入 `cover` 就會顯示圖片，並保留放大效果。主要作品區僅顯示封面，More Works 才有滑鼠預覽。

## 換順序或新增作品

1. 複製一份作品文件，例如 `project-06.ts` → `project-10.ts`。
2. 把匯出名稱改為 `project10`、`id` 改為 `10`，並修改內容。
3. 建立 `public/projects/project-10/` 並放入素材。
4. 在 `works.ts` 加上 `import { project10 } from './projects/project-10';`。
5. 把 `project10` 加進 `selectedWorks`（主要作品）或 `moreWorks`（更多作品）清單；清單順序就是畫面順序。

刪除清單中的項目只會取消首頁展示，不會刪除作品文件或素材。同一份作品可以出現在兩個清單中，內容只需維護一次。每個作品已有 `/works/project-01` 形式的獨立 demo 頁，尚未建立後台。

## 文案與動畫

只修改引號中的文字，保留逗號、括號和欄位名稱。首頁 `processWords` 和頁尾 `rotatingWords` 各保留四個詞，以配合目前的動畫節奏。長詞可能超出現有遮罩寬度，修改後需預覽。

動畫程式保留在 `components/ScrollVideoPrototype.tsx`、`MoreWorks.tsx`、`EndingSection.tsx`。主要作品版面在 `components/SelectedWorks.tsx`。字體、間距、顏色和尺寸在 `styles/globals.css`。

## 預覽與檢查

在專案根目錄執行 `npm run dev`，開啟 http://127.0.0.1:3000。修改內容並儲存後會自動更新。

執行 `npm run typecheck` 檢查格式與型別，`npm run build` 檢查正式建置。不要直接修改生成的 `.next/` 或 `out/`，否則下次建置會覆蓋。

## 作品獨立頁

目前共六個作品（01–06），各自的 `detail` 欄位控制分類、年份、標題、介紹與設計方法。`slug` 決定網址；`images` 和 `videos` 同時供詳情頁與 More Works 預覽使用。詳情頁模板在 `app/works/[slug]/page.tsx`，共用按鈕文案在 `content/project-page.ts`。

首頁主要作品 01–02，More Works 03–06。點擊封面或作品名稱即可跳轉。詳情頁提供返回作品區和下一個作品；影片須點擊播放。所有 demo 文案和素材均為佔位內容。
