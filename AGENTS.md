# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 项目概述

基于 Coze 和飞书的自动化运营工作流管理平台，实现选题策划、脚本生成、数据汇总与团队协作的全流程自动化管理。

## 目录结构

```
├── public/                       # 静态资源
├── scripts/                      # 构建与启动脚本
│   ├── build.sh                  # 构建脚本
│   ├── dev.sh                    # 开发环境启动脚本
│   ├── prepare.sh                # 预处理脚本
│   └── start.sh                  # 生产环境启动脚本
├── src/
│   ├── app/                      # 页面路由与布局
│   │   ├── layout.tsx            # 根布局（侧边栏 + 顶栏）
│   │   ├── page.tsx              # 运营总览（Dashboard）
│   │   ├── globals.css           # 全局样式
│   │   ├── topics/page.tsx       # 选题池（多维表视图）
│   │   ├── scripts/page.tsx      # 脚本工坊（AI脚本生成）
│   │   ├── analytics/page.tsx    # 数据看板（播放/点赞/评论）
│   │   ├── workflows/page.tsx    # 工作流管理（卡片式列表+执行监控）
│   │   ├── workflows/create/page.tsx # 工作流编辑器（可视化节点画布+AI助手）
│   │   ├── workflows/templates/page.tsx # 模板市场（浏览+一键克隆）
│   │   ├── team/page.tsx         # 团队协作（飞书Bot集成）
│   │   ├── settings/page.tsx     # 飞书集成设置（凭证+台账+数据源）
│   │   └── api/                  # API 路由
│   │       ├── analyze-topic/route.ts   # 选题热度分析（doubao-seed-2-0-lite）
│   │       ├── generate-script/route.ts # 脚本大纲生成（qwen-3-5-plus，流式SSE）
│   │       ├── data-summary/route.ts    # 数据周报生成（doubao-seed-2-0-mini）
│   │       ├── douyin-trending/route.ts # 抖音热榜实时抓取（Search + LLM）
│   │       ├── import-data/route.ts     # CSV/JSON 数据导入
│   │       ├── config/route.ts          # 平台配置 GET/POST（飞书/抖音/台账凭证）
│   │       ├── workflows/route.ts       # 工作流 CRUD（创建/编辑/删除）
│   │       ├── workflows/run/route.ts   # 工作流执行引擎（逐模块串行）
│   │       ├── workflows/templates/route.ts # 模块模板和模型列表
│   │       ├── workflows/clone/route.ts     # 从模板克隆工作流
│   │       ├── workflows/ai-assist/route.ts # AI 工作流助手（对话式生成工作流）
│   │       ├── feishu/                  # 飞书集成 API
│   │       │   ├── auth/route.ts        # OAuth 登录发起
│   │       │   ├── callback/route.ts    # OAuth 回调处理
│   │       │   ├── status/route.ts      # 登录状态检查
│   │       │   ├── sync/bitable/route.ts   # 多维表数据同步
│   │       │   ├── sync/wiki/route.ts      # 知识库数据同步
│   │       │   ├── sync/docs/route.ts      # 云文档数据同步
│   │       │   ├── sync/contacts/route.ts  # 通讯录/团队成员同步
│   │       │   └── bitable/
│   │       │       ├── create-table/route.ts # 创建台账多维表（17字段）
│   │       │       └── add-record/route.ts   # 向台账写入记录
│   │       └── douyin/                  # 抖音集成 API
│   │           ├── auth/route.ts        # OAuth 登录发起
│   │           ├── callback/route.ts    # OAuth 回调处理
│   │           ├── status/route.ts      # 登录状态检查
│   │           └── sync/route.ts        # 视频数据同步
│   ├── components/
│   │   ├── layout/               # 布局组件
│   │   │   ├── sidebar.tsx       # 侧边栏导航
│   │   │   └── header.tsx        # 顶部导航栏
│   │   └── ui/                   # Shadcn UI 组件库（仅保留已使用组件）
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具库
│   │   ├── utils.ts              # 通用工具函数 (cn)
│   │   ├── llm-config.ts         # LLM 多模型配置常量
│   │   ├── feishu-client.ts      # 飞书 API 客户端封装
│   │   ├── douyin-client.ts      # 抖音开放平台 API 客户端封装
│   │   ├── platform-config.ts    # 平台配置存储工具（.platform-config.json）
│   │   ├── workflow-store.ts     # 工作流存储工具（.workflows.json）
│   │   └── workflow-templates.ts # 工作流模板库（5个预设模板）
│   └── server.ts                 # 自定义服务端入口
├── DESIGN.md                     # 设计规范文件
├── next.config.ts                # Next.js 配置
├── package.json                  # 项目依赖管理
└── tsconfig.json                 # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**
