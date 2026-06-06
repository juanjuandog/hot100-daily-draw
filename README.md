# Hot100 Daily Draw

一个带有轻量仪式感的刷题小工具：每天摇一摇，从瓶子里抽出当天要做的 LeetCode Hot100 题目。

## Features

- 以玻璃瓶和纸条为核心视觉
- 每天固定安排 10 道 Hot100 题目
- 做完 100 道后自动进入下一轮
- 每天只展示 2 张题签，完成后后续题目继续补位
- 使用本地 SQLite 持久化保存轮次、抽题记录和完成状态

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- Node.js
- SQLite via `node:sqlite`

## Project Structure

```text
.
├── app.js
├── hot100-data.js
├── index.html
├── package.json
├── server.js
├── styles.css
└── data/
```

## Getting Started

### Prerequisites

- Node.js 23+

### Run locally

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

## Persistence

The app stores runtime state in a local SQLite database:

```text
data/hot100.db
```

This file is intended for local usage and is ignored by Git.

## Future Improvements

- Stronger bottle-exit animation for queued tickets
- Optional reset action for the current cycle
- Optional manual marking for skipped questions

## License

MIT
