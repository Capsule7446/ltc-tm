# Tempmonkey

这是一个用于构建 Tampermonkey userscript 的现代 Vite 模板，参考 `Capsule7446/sdo_tm_script` 的构建思路，但不内置无效 UI 组件，只保留 TypeScript 规则入口和 userscript 构建链。

## 环境

- Node.js 24 已验证
- npm

## 安装

```bash
npm install
```

## 开发构建

```bash
npm run dev
```

Vite 启动后，Tampermonkey 安装控制台输出的 `*.user.js` 地址，用于本地调试。

## 生产构建

```bash
npm run build
```

构建结果在 `dist/`，安装 `dist/*.user.js` 即可。

## CI 和发版

CI 会在 `main` / `master` 推送和 PR 时执行：

```bash
npm ci
npm run typecheck
npm run build
```

发布新版本时推送 tag：

```bash
git tag v0.1.1
git push origin v0.1.1
```

GitHub Actions 会自动构建并创建 Release，上传 `dist/tempmonkey.user.js`。Release 说明中会包含 Tampermonkey 安装地址：

```text
https://github.com/<owner>/<repo>/releases/download/<tag>/tempmonkey.user.js
```

最新版本固定地址：

```text
https://github.com/<owner>/<repo>/releases/latest/download/tempmonkey.user.js
```

## 添加优化规则

1. 在 `src/actions/` 新增一个 `Action` 对象或工厂。
2. 配置 `name`、`match` 和 `run()`。
3. 在 `src/actions/index.ts` 的 `actions` 数组中注册新规则。

示例：

```ts
import type { Action } from './Action';

const demoAction: Action = {
  name: 'Demo',
  match: /^https:\/\/example\.com\//,
  run() {
    document.body.dataset.tempmonkey = 'enabled';
  },
};

export const actions: Action[] = [demoAction];
```
