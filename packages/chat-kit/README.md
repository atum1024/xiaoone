# @xiaoone/chat-kit

官网与用户端共用的 chat / team / kefu / agent / ai HTTP 与 `RealtimeSocket`、`AgentLiveSocket`、访客 **`VisitorLiveSocket`**、团队 **`TeamLiveSocket`**（`ws/team/`）封装。

## 源码布局

```
src/
  auth/readAccessToken.ts   # ReadAccessToken 类型
  types/live.ts               # Live / Channel 领域类型与 assignDefined
  realtime/                   # 传输层与 WS 薄封装
  api/                        # HTTP 工厂（chat、team、kefu、agent、ai）
  createChatKit.ts
  initChatKit.ts              # initChatKit / getChatKit（与 createChatKit 二选一或组合）
  index.ts
```

## 使用方式

各端在初始化时注入 **axios 实例**、**readAccessToken**、以及用于流式请求的 **authFetch**（与 axios 拦截器行为一致）。

**方式 A — `createChatKit`（函数式单例由宿主持有）：**

```ts
import { createChatKit } from '@xiaoone/chat-kit'
import { api } from './api'
import { readAccessToken } from './authEvents'
import { authFetch } from './authFetch'

export const chatKit = createChatKit({
  readAccessToken,
  apiClient: api,
  authFetch,
})

export const { ChatAPI, TeamChatAPI, createAgentLiveSocket, StoreAPI, AgentThreadAPI, streamThreadChat, dispatchChat } = chatKit
```

**方式 B — `initChatKit` + `getChatKit`（入口最早初始化，其余模块只 import 包名）：**

```ts
import { initChatKit, getChatKit } from '@xiaoone/chat-kit'

initChatKit({ readAccessToken, apiClient: api, authFetch })
const { ChatAPI, TeamChatAPI } = getChatKit()
```

**方式 B + 侧载引导（本仓库 merchant）**：在 `main.ts` **第一行** `import './lib/chatKitBoot'`，由 `chatKitBoot.ts` 单独调用 `initChatKit`；业务模块只 `import { getChatKit, type … } from '@xiaoone/chat-kit'`，避免与 `api` / `authFetch` 形成环依赖。

## 约束

- 不依赖任何具体端的 Pinia store；刷新 token 后的 WS 重启由各端 `authEvents` 等自行触发。
