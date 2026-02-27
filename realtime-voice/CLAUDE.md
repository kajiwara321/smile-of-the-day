# realtime-voice — Claude Code Instructions

## プロジェクト概要

OpenAI Realtime API（WebRTC）を使ったリアルタイム音声会話アプリ。
`kajiwara321/kenji-lab` の `realtime-voice/` ディレクトリとして管理。

## 起動方法

```bash
# .env が必要（OPENAI_API_KEY を設定）
npm start
# → http://localhost:3000
```

`.env` は `.gitignore` 済みで Git 管理外。新規環境では `.env.example` を参考に作成。

## 主要ファイル

| ファイル | 役割 |
|---------|------|
| `server.js` | Express サーバー・セッション設定（instructions, voice, model） |
| `client/components/App.jsx` | WebRTC 接続・VAD 設定・マイクロフォン制御 |
| `client/components/ToolPanel.jsx` | ツール定義と UI 表示（現在: 天気予報） |

## アーキテクチャ

```
ブラウザ (React/WebRTC)
  ↓ /token  → OpenAI client_secrets → 一時キー発行
  ↓ SDP交換 → OpenAI Realtime API (gpt-realtime)
  ↓ DataChannel → イベント送受信（session.update, response.create 等）
  ↓ AudioTrack → 音声ストリーム双方向
```

## カスタマイズポイント

- **AI の指示・性格**: `server.js` の `sessionConfig.session.instructions`
- **声**: `server.js` の `voice`（alloy / echo / fable / onyx / nova / shimmer / marin）
- **ツール追加**: `ToolPanel.jsx` の `sessionUpdate.session.tools` に関数定義を追加

## 注意事項

- `OPENAI_API_KEY` は ephemeral key 経由でブラウザに渡す設計（直接露出しない）
- マイクは Chrome の macOS Privacy & Security で許可が必要
- ポート 3000 が競合する場合は `lsof -ti:3000 | xargs kill -9`
