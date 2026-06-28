# 長期照顧專業人員數位學習平臺優化腳本

這是一個用於 `https://www.ltc-learning.org/` 的 Tampermonkey 腳本。

## Tampermonkey 使用方式

1. 安裝瀏覽器擴充套件 Tampermonkey。
2. 打開最新版本 userscript 地址：

```text
https://github.com/Capsule7446/ltc-tm/releases/latest/download/tempmonkey.user.js
```

3. Tampermonkey 會跳出安裝頁，點擊安裝。
4. 進入 `https://www.ltc-learning.org/` 相關課程頁面後，腳本會自動執行。

如果使用指定版本，請到 GitHub Releases 下載該版本的：

```text
tempmonkey.user.js
```

## 支援功能

- 自動偵測課程影片播放狀態。
- 每 1 分鐘檢查一次影片狀態。
- 影片播放中時，自動執行 `moj_warning_stop()`，清除學習警示。
- 從 pathTree 中尋找第一筆未完成影片並自動打開。
- 在右側 `s_main` 播放器中自動播放影片。
- 自動使用 2 倍速播放。
- 影片播放結束後，自動切換到下一筆未完成影片。
- 如果全部影片都已完成，會從目前選中的下一筆開始循環播放。
- 如果沒有選中的節點，循環播放會從第一筆開始。
