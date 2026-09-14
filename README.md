# LIN ZIJING Portfolio

Next.js 個人作品網站，包含滾動影片首頁、六個初始作品 demo，以及本機 SQLite 作品後台。

## 開始

```sh
npm ci
npm run admin:setup
npm run dev
```

首頁：http://127.0.0.1:3000/

後台：http://127.0.0.1:3000/admin

先看 [後台操作與資料備份指南](docs/ADMIN.md)。管理員帳號由你在本機設定，沒有預設密碼。

## 修改位置

- 作品文字、封面、影片、發布與排序：在 `/admin` 管理。
- 首頁介紹：`content/intro.ts`。
- 頁尾文字：`content/footer.ts`。
- 網站標題：`content/site.ts`。
- 初始 demo：`content/projects/`，只在第一次建立資料庫時匯入。
- 詳情頁：`app/works/[slug]/page.tsx`。
- 首頁動畫：`components/ScrollVideoPrototype.tsx`。
- 後台畫面：`app/admin/`；接口：`app/api/admin/`。
- 資料庫／驗證：`lib/`；本機資料與素材：`data/`（不提交 Git）。

```sh
npm test
npm run typecheck
npm run build
npm start
```

`out/` 是先前的靜態快照；新版後台需 Node 伺服器，請用以上命令，不要使用 Live Server 或直接開啟 HTML。
