# LIN ZIJING Portfolio

Next.js 個人作品網站，包含滾動影片首頁、六個初始作品 demo，以及以 Cloudflare D1 儲存資料的作品後台。正式網站部署在 Cloudflare Workers。

## 本機啟動

需要 Node.js 22 或以上版本。

```sh
npm ci
npx wrangler d1 migrations apply cv01-portfolio --local
npm run dev:vinext
```

首頁：http://127.0.0.1:3001/

後台：http://127.0.0.1:3001/admin

正式首頁：https://cv01-portfolio.0zjcszwsmqs.workers.dev/

正式後台：https://cv01-portfolio.0zjcszwsmqs.workers.dev/admin

先看 [後台操作與資料備份指南](docs/ADMIN.md)。

## 修改位置

- 作品文字、封面、影片、發布與排序：在 `/admin` 管理。
- 首頁介紹：`content/intro.ts`。
- 頁尾文字：`content/footer.ts`。
- 網站標題：`content/site.ts`。
- 初始 demo：`content/projects/`，只在第一次建立資料庫時匯入。
- 詳情頁：`app/works/[slug]/page.tsx`。
- 首頁動畫：`components/ScrollVideoPrototype.tsx`。
- 後台畫面：`app/admin/`；接口：`app/api/admin/`。
- 資料庫／驗證：`lib/`；資料儲存在 Cloudflare D1，作品素材使用 R2。

```sh
npm test
npm run typecheck
npm run build:vinext
npm run deploy
```

## 自動部署

`.github/workflows/deploy.yml` 會在 `main` 分支收到新 commit 時執行測試、型別檢查並部署到 Cloudflare Workers。

GitHub 倉庫需設定一個 Actions secret：

- `CLOUDFLARE_API_TOKEN`：只授予此帳號 Workers Scripts 編輯、D1 讀取及 Account Settings 讀取權限的 Cloudflare API Token。

設定位置：GitHub 倉庫的 **Settings → Secrets and variables → Actions → New repository secret**。設定完成後，推送 `main` 或在 **Actions → Deploy to Cloudflare Workers → Run workflow** 即可部署。

`out/` 是先前的靜態快照；目前版本需透過 vinext／Cloudflare Workers 執行，請勿使用 Live Server 或直接開啟 HTML。
