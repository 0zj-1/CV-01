# 本機作品後台使用指南

## 第一次使用

在 VS Code 開啟整個 CV-01 資料夾，終端執行：

```sh
npm ci
npm run admin:setup
npm run dev
```

`admin:setup` 會要求你輸入管理員電郵，以及兩次密碼（至少 12 個字元）；密碼輸入不顯示。電郵不會發送驗證信，只作為登入名稱。沒有公開註冊頁。

開啟 http://127.0.0.1:3000/admin，使用剛設定的帳號登入。若 Codex 已啟動 3017 預覽，也可以在 http://127.0.0.1:3017/admin 登入，同一專案共用資料。

## 管理作品

- 首次讀取資料庫時會匯入六個 demo，一次而已。之後以資料庫為準。
- 左側點選作品；修改文字、封面、圖片或影片後按「儲存作品」。
- 新增作品預設是草稿。勾選「發布至網站」並儲存後，首頁與獨立作品頁才會顯示。
- 「主要作品」或「More Works」決定首頁位置；排序數字越小越前。
- 網址名称只使用小寫英文、數字與連字號，且不可重複。修改網址後舊網址會失效。
- 圖片／影片一次上傳一個；可重複上傳，會依序加入清單。清單每行一個素材路徑，可調換行的順序或移除一行。
- More Works 有影片時優先播放第一個影片，否則輪播圖片。詳情頁會展示所有影片與圖片。
- 可上傳 JPG、PNG、GIF、WebP、MP4，單檔最多 100 MB。不接受 SVG、HTML。原 demo 的 SVG 是受控本機素材，仍可正常使用。
- 上傳成功後還要儲存作品。從作品移除媒體路徑或刪除作品，不會清除硬碟素材，避免誤刪；未引用素材可之後整理。
- 上傳的素材以隨機網址提供瀏覽，並非私密文件儲存。草稿作品不會出現在公開清單或詳情頁，但已知的素材網址仍可直接存取。
- 儲存後重新整理前台即可看見變更，無需重新建置。

## 資料放在哪裡

- `data/portfolio.sqlite`：SQLite 資料庫。
- `data/uploads/`：上傳素材。
- `data/` 與 `.env*` 已加入 `.gitignore`，不會隨原始碼推送。
- `content/projects/` 現在只作為第一次初始化的 demo；修改它不會覆蓋已有資料庫。首頁介紹和頁尾文案仍從 `content/intro.ts` 和 `content/footer.ts` 修改。

備份前停止使用此專案資料的所有伺服器，再複製整個 `data/`（包括若存在的 sqlite-wal / sqlite-shm 檔）。還原時也先停止伺服器，再還原整個資料夾。不要只備份圖片或單獨複製正在寫入的 sqlite 主檔。

如需把資料放在其他持久磁碟，可以設定 `CV_DATA_DIR`，設定管理員與啟動網站時必須使用相同的目錄。

## 帳號與登入

密碼以 scrypt 加鹽雜湊儲存。Session 放在 HttpOnly、SameSite=Strict cookie，8 小時到期；登出會撤销 session。HTTPS 下 cookie 自動加 Secure。10 次登入失敗後限制 15 分鐘，此本機版採單管理員全域限制。

忘記密碼時，在本機再次執行 `npm run admin:setup`，即可重新設定管理員並撤销所有舊 session。不要把密碼貼到聊天或寫進作品內容。

## 執行與測試

```sh
npm test
npm run typecheck
npm run build
npm start
```

完整 HTTP 測試（需先 build，使用 3016 port 及臨時資料庫，不接觸正式資料）：

```sh
node --import tsx tests/http-smoke.ts
```

## 部署界線

這是有 Node 伺服器的動態網站。`out/` 仍是以前的靜態快照，不包含後台；`build:static` 已移除。不能以 Live Server 或 GitHub Pages 執行後台。

之後可部署到具有持久磁碟的 Node 主機；若使用不保留本機磁碟的 serverless 平台，需先改接雲端資料庫與物件儲存。此版本未開通雲端服務或公開託管。
