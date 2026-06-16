import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Code2,
  FileText,
  KeyRound,
  LockKeyhole,
  PlugZap,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Wrench,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import type { ReactNode } from "react";
import {
  PUBLIC_CHAT_API,
  deriveApiOrigin,
  deriveWidgetUrl,
  deriveWsOrigin,
} from "../../pages/kefuIntegrationContent";
import { useSitePreferences, type LocalizedCopy } from "../sitePreferences";

type DeveloperResourceKind = "docs" | "sdk" | "api";

type ResourceConfig = {
  icon: LucideIcon;
  eyebrow: LocalizedCopy;
  title: LocalizedCopy;
  summary: LocalizedCopy;
  activeId: "docs" | "sdk" | "api";
};

type DocCard = {
  id: "docs" | "sdk" | "api" | "ws";
  icon: LucideIcon;
  title: LocalizedCopy;
  desc: LocalizedCopy;
};

type FieldRow = {
  field: string;
  required: LocalizedCopy;
  description: LocalizedCopy;
};

type ErrorRow = {
  http: string;
  code: string;
  fix: LocalizedCopy;
};

type WsEventRow = {
  type: string;
  fields: string;
  description: LocalizedCopy;
};

const resources: Record<DeveloperResourceKind, ResourceConfig> = {
  docs: {
    icon: FileText,
    eyebrow: { zh: "开发者资源", en: "Developer resources" },
    title: { zh: "公开接入文档中心", en: "Public integration docs" },
    summary: {
      zh: "官网开发者页提供完整对接资料：Web Widget、App 自研接入、REST API、访客 WebSocket、附件、错误码和上线验收。商户专属 App ID、API Key 与允许域名注册后在商户端生成。",
      en: "The developer page includes the full integration material: Web Widget, custom app integration, REST APIs, visitor WebSocket, attachments, errors, and launch checks. Merchant-specific App ID, API Key, and allowed origins are generated after registration in the merchant console.",
    },
    activeId: "docs",
  },
  sdk: {
    icon: Smartphone,
    eyebrow: { zh: "Web/App SDK", en: "Web/App SDK" },
    title: { zh: "Web Widget 与 App 接入", en: "Web Widget and app integration" },
    summary: {
      zh: "网站优先使用 kefu-widget.js，一段脚本即可上线客服入口；App、小程序或自研前端使用同一套 REST + WebSocket 协议自行绘制聊天界面。",
      en: "Websites should start with kefu-widget.js. Apps, mini programs, and custom frontends can use the same REST plus WebSocket protocol to build their own chat UI.",
    },
    activeId: "sdk",
  },
  api: {
    icon: Code2,
    eyebrow: { zh: "REST API", en: "REST API" },
    title: { zh: "REST + WebSocket API", en: "REST + WebSocket API" },
    summary: {
      zh: "接口文档公开展示请求路径、字段、事件和错误码；实际调用时只需要把示例中的 <app_id>、<API Key>、<visitor_token> 替换为商户端生成或握手返回的值。",
      en: "The public API docs show paths, fields, events, and errors. When calling the APIs, replace <app_id>, <API Key>, and <visitor_token> with values generated in the console or returned by handshake.",
    },
    activeId: "api",
  },
};

const publicDocs: DocCard[] = [
  {
    id: "docs",
    icon: BookOpen,
    title: { zh: "文档中心", en: "Documentation center" },
    desc: {
      zh: "接入流程、名词解释、商户端配置位置、上线验收和安全边界都在本页公开。",
      en: "Integration flow, glossary, console location, launch checks, and security boundaries are all public here.",
    },
  },
  {
    id: "sdk",
    icon: PlugZap,
    title: { zh: "Web/App SDK", en: "Web/App SDK" },
    desc: {
      zh: "Web Widget 复制即用；App、小程序、自研入口使用 REST + WebSocket 实现自定义 UI。",
      en: "Web Widget is copy-ready. Apps and custom entries use REST plus WebSocket for a custom UI.",
    },
  },
  {
    id: "api",
    icon: TerminalSquare,
    title: { zh: "REST API", en: "REST API" },
    desc: {
      zh: "握手、发消息、拉历史、上传附件的接口路径、字段和示例请求公开可查。",
      en: "Handshake, message, history, and attachment API paths, fields, and examples are available here.",
    },
  },
  {
    id: "ws",
    icon: Wifi,
    title: { zh: "访客 WebSocket", en: "Visitor WebSocket" },
    desc: {
      zh: "实时消息、输入状态、会话状态和心跳事件协议公开，断线时用 REST 兜底。",
      en: "Realtime message, typing, state, and heartbeat events are documented. REST is the fallback.",
    },
  },
];

const privateItems = [
  {
    icon: KeyRound,
    title: { zh: "App ID", en: "App ID" },
    desc: {
      zh: "注册并创建网站接入后自动生成，用来标识哪一套商户客服入口。",
      en: "Generated after registration and website integration setup. It identifies the merchant entry.",
    },
  },
  {
    icon: LockKeyhole,
    title: { zh: "API Key", en: "API Key" },
    desc: {
      zh: "与 App ID 成对使用，可在商户端复制或重置；不要提交到公开代码仓库。",
      en: "Paired with App ID. Copy or rotate it in the merchant console. Do not commit it to public repositories.",
    },
  },
  {
    icon: ShieldCheck,
    title: { zh: "允许访问的网站", en: "Allowed origins" },
    desc: {
      zh: "注册后填写官网或独立站域名；未在名单内的页面会被拒绝连接。",
      en: "After registration, add your official site or store domains. Pages outside the list are rejected.",
    },
  },
];

const handshakeFields: FieldRow[] = [
  {
    field: "app_id",
    required: { zh: "是", en: "Yes" },
    description: { zh: "商户端生成的公开 ID，示例中先写 <app_id>。", en: "Public ID generated in the merchant console. Use <app_id> in public examples." },
  },
  {
    field: "api_key",
    required: { zh: "是", en: "Yes" },
    description: { zh: "商户端生成的 API Key，示例中先写 <API Key>。", en: "API Key generated in the merchant console. Use <API Key> in public examples." },
  },
  {
    field: "visitor_name",
    required: { zh: "否", en: "No" },
    description: { zh: "访客在聊天窗口中的显示名。", en: "Display name for the visitor in the chat window." },
  },
  {
    field: "visitor_key",
    required: { zh: "否", en: "No" },
    description: { zh: "你方用户唯一编号，用于识别同一访客再次来访。", en: "Your own stable visitor identifier for returning visitors." },
  },
  {
    field: "visitor_email",
    required: { zh: "否", en: "No" },
    description: { zh: "访客邮箱，可用于后续人工跟进。", en: "Visitor email for later human follow-up." },
  },
  {
    field: "channel",
    required: { zh: "否", en: "No" },
    description: { zh: "官网建议填 official_site，也可按业务入口自定义。", en: "Use official_site for websites, or set a custom business entry label." },
  },
  {
    field: "locale",
    required: { zh: "否", en: "No" },
    description: { zh: "语言，默认 zh-CN。", en: "Locale. Default is zh-CN." },
  },
  {
    field: "subject",
    required: { zh: "否", en: "No" },
    description: { zh: "首次会话主题，例如售前咨询。", en: "Initial conversation subject, such as pre-sales inquiry." },
  },
];

const clientEvents: WsEventRow[] = [
  { type: "visitor.send", fields: "content, client_message_id", description: { zh: "访客发送文字消息。", en: "Visitor sends a text message." } },
  { type: "visitor.typing", fields: "typing", description: { zh: "访客输入状态，可选。", en: "Optional visitor typing state." } },
  { type: "ping", fields: "ts", description: { zh: "心跳。", en: "Heartbeat." } },
];

const serverEvents: WsEventRow[] = [
  { type: "ready", fields: "-", description: { zh: "连接成功，可以开始聊天。", en: "Connection is ready." } },
  { type: "message", fields: "message", description: { zh: "收到新消息，sender_role 为 visitor、agent 或 bot。", en: "New message. sender_role is visitor, agent, or bot." } },
  { type: "message_updated", fields: "message", description: { zh: "消息翻译、附件或状态更新。", en: "Message translation, attachment, or status update." } },
  { type: "state", fields: "state", description: { zh: "会话状态变化。", en: "Conversation state changed." } },
  { type: "presence", fields: "online, typing", description: { zh: "客服在线或正在输入。", en: "Agent online or typing state." } },
  { type: "message_ack / message_nack", fields: "client_message_id", description: { zh: "消息发送成功或失败。", en: "Message accepted or rejected." } },
  { type: "pong", fields: "ts", description: { zh: "心跳回应。", en: "Heartbeat response." } },
];

const errorRows: ErrorRow[] = [
  { http: "400", code: "api_key_required", fix: { zh: "请求里没传 api_key，补上即可。", en: "api_key is missing. Add it to the request." } },
  { http: "400", code: "merchant_or_app_required", fix: { zh: "app_id 无效或没传，检查是否复制正确。", en: "app_id is missing or invalid. Check the copied value." } },
  { http: "403", code: "invalid_api_credentials", fix: { zh: "App ID 与 API Key 不匹配，或凭据已停用。", en: "App ID and API Key do not match, or the credential is disabled." } },
  { http: "403", code: "origin_not_allowed", fix: { zh: "在商户端把当前官网域名加入允许访问的网站。", en: "Add the current site domain to allowed origins in the merchant console." } },
  { http: "403", code: "store_disabled", fix: { zh: "店铺已停用，后台重新启用后再试。", en: "The store is disabled. Re-enable it in the console." } },
  { http: "403", code: "visitor_blocked", fix: { zh: "该访客已被拉黑。", en: "The visitor has been blocked." } },
  { http: "409", code: "store_mismatch", fix: { zh: "凭据与店铺不一致，去掉错误的 store_id。", en: "Credential and store do not match. Remove the wrong store_id." } },
  { http: "429", code: "visitor_rate_limited", fix: { zh: "发送太快，稍等几秒再发。", en: "Too many requests. Retry after a short wait." } },
  { http: "503", code: "remote_store_unavailable", fix: { zh: "附件或存储暂不可用，提示访客稍后重试。", en: "Attachment storage is temporarily unavailable. Ask the visitor to retry later." } },
];

const checklist: LocalizedCopy[] = [
  { zh: "店铺启用时，访客能打开客服并发出消息。", en: "When the store is enabled, visitors can open support and send messages." },
  { zh: "允许访问的网站没配对时，访客端能得到明确错误提示。", en: "When allowed origins are not configured, the visitor sees a clear error." },
  { zh: "AI 问答库有内容且已开启时，访客消息能触发自动回复。", en: "When the AI Q&A library is enabled and populated, visitor messages trigger auto replies." },
  { zh: "多个访客同时咨询时，接待台能分开会话并显示未读。", en: "Multiple visitors create separate conversations with unread states in the console." },
  { zh: "人工接入后，接待台能正常回复；需要时可关闭 AI 自动回复。", en: "After human takeover, agents can reply normally and disable auto reply when needed." },
  { zh: "WebSocket 断线后，REST 发消息和拉历史仍可工作。", en: "After WebSocket disconnects, REST send and history still work." },
];

function localized(t: (copy: LocalizedCopy) => string, copy: LocalizedCopy) {
  return t(copy);
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 text-slate-100 shadow-sm dark:border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs font-semibold text-slate-300">
        <span>{label}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-6">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionShell({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white/88 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/78 sm:p-6 lg:p-8">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">{kicker}</p>
      <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function FieldTable({
  rows,
  t,
}: {
  rows: FieldRow[];
  t: (copy: LocalizedCopy) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-bold">{t({ zh: "字段", en: "Field" })}</th>
            <th className="px-4 py-3 font-bold">{t({ zh: "必填", en: "Required" })}</th>
            <th className="px-4 py-3 font-bold">{t({ zh: "说明", en: "Description" })}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
          {rows.map(row => (
            <tr key={row.field} className="bg-white/70 dark:bg-slate-900/30">
              <td className="px-4 py-3 align-top font-mono text-xs text-indigo-700 dark:text-indigo-200">{row.field}</td>
              <td className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{localized(t, row.required)}</td>
              <td className="px-4 py-3 align-top leading-6 text-slate-600 dark:text-slate-300">{localized(t, row.description)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorTable({
  rows,
  t,
}: {
  rows: ErrorRow[];
  t: (copy: LocalizedCopy) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3 font-bold">HTTP</th>
            <th className="px-4 py-3 font-bold">{t({ zh: "错误码", en: "Error code" })}</th>
            <th className="px-4 py-3 font-bold">{t({ zh: "处理方式", en: "Fix" })}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
          {rows.map(row => (
            <tr key={row.code} className="bg-white/70 dark:bg-slate-900/30">
              <td className="px-4 py-3 align-top font-mono text-xs text-slate-700 dark:text-slate-200">{row.http}</td>
              <td className="px-4 py-3 align-top font-mono text-xs text-indigo-700 dark:text-indigo-200">{row.code}</td>
              <td className="px-4 py-3 align-top leading-6 text-slate-600 dark:text-slate-300">{localized(t, row.fix)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WsEventTable({
  title,
  rows,
  t,
}: {
  title: string;
  rows: WsEventRow[];
  t: (copy: LocalizedCopy) => string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-bold">{t({ zh: "事件", en: "Event" })}</th>
              <th className="px-4 py-3 font-bold">{t({ zh: "字段", en: "Fields" })}</th>
              <th className="px-4 py-3 font-bold">{t({ zh: "说明", en: "Description" })}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {rows.map(row => (
              <tr key={row.type} className="bg-white/70 dark:bg-slate-900/30">
                <td className="px-4 py-3 align-top font-mono text-xs text-indigo-700 dark:text-indigo-200">{row.type}</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-slate-700 dark:text-slate-200">{row.fields}</td>
                <td className="px-4 py-3 align-top leading-6 text-slate-600 dark:text-slate-300">{localized(t, row.description)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DeveloperResourcePage({ kind }: { kind: DeveloperResourceKind }) {
  const { t } = useSitePreferences();
  const resource = resources[kind];
  const Icon = resource.icon;
  const origin = typeof window === "undefined" ? "https://xiaoone.cn" : window.location.origin;
  const apiBase = deriveApiOrigin(origin);
  const wsBase = deriveWsOrigin(origin);
  const widgetUrl = deriveWidgetUrl(origin);
  const messageEndpoint = `${apiBase}/api/v1/chat/visitor/messages/`;
  const historyEndpoint = `${apiBase}/api/v1/chat/visitor/conversations/<conversation_id>/`;
  const attachmentEndpoint = `${apiBase}/api/v1/chat/visitor/conversations/<conversation_id>/attachments/`;
  const visitorWsUrl = `${wsBase.replace(/\/$/, "")}/ws/visitor/?conversation=<conversation_id>&token=<visitor_token>`;

  const widgetSnippet = [
    "<!-- Place before </body>. Replace <app_id> and <API Key> after registration. -->",
    "<script",
    `  src="${widgetUrl}"`,
    "  data-xiaoone-kefu",
    '  data-app-id="<app_id>"',
    '  data-api-key="<API Key>"',
    `  data-api-base-url="${apiBase}"`,
    `  data-ws-base-url="${wsBase}"`,
    '  data-visitor-name="访客昵称"',
    '  data-visitor-key="website-user-001"',
    '  data-channel="official_site"',
    '  data-locale="zh-CN"',
    '  data-subject="售前咨询"',
    "></script>",
  ].join("\n");

  const handshakePayload = {
    app_id: "<app_id>",
    api_key: "<API Key>",
    visitor_name: "访客昵称",
    visitor_key: "website-user-001",
    channel: "official_site",
    locale: "zh-CN",
    subject: "售前咨询",
  };

  const handshakeResponse = {
    code: 0,
    message: "ok",
    data: {
      visitor_token: "<visitor_token>",
      visitor_key: "<visitor_identity_key>",
      conversation: {
        id: "<conversation_id>",
        state: "waiting",
        store_name: "示例店铺",
      },
    },
  };

  const curlSnippet = [
    `curl -X POST '${apiBase}${PUBLIC_CHAT_API.path}' \\`,
    "  -H 'Content-Type: application/json' \\",
    `  -d '${JSON.stringify(handshakePayload)}'`,
  ].join("\n");

  const fetchSnippet = [
    `const response = await fetch('${apiBase}${PUBLIC_CHAT_API.path}', {`,
    "  method: 'POST',",
    "  headers: { 'Content-Type': 'application/json' },",
    "  body: JSON.stringify({",
    "    app_id: '<app_id>',",
    "    api_key: '<API Key>',",
    "    visitor_name: '访客昵称',",
    "    visitor_key: 'website-user-001',",
    "    channel: 'official_site',",
    "  }),",
    "})",
    "const { data } = await response.json()",
    "// Save data.visitor_token and data.conversation.id",
  ].join("\n");

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-24 pt-32 text-gray-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="rounded-3xl border border-slate-200 bg-white/82 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/78 sm:p-8 lg:p-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
              <Wrench size={16} />
              {t(resource.eyebrow)}
            </div>
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-200">
                <Icon size={28} />
              </div>
              <div className="min-w-0">
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-4xl">
                  {t(resource.title)}
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-gray-600 dark:text-slate-300">
                  {t(resource.summary)}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {publicDocs.map(item => {
                const CardIcon = item.icon;
                const active = item.id === resource.activeId;
                const cardClassName = active
                  ? "group rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950 transition-colors dark:border-indigo-300/30 dark:bg-indigo-400/12 dark:text-indigo-100"
                  : "group rounded-2xl border border-slate-200 bg-white/76 p-4 text-slate-900 transition-colors hover:border-indigo-200 hover:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:border-indigo-300/30 dark:hover:bg-slate-900/80";
                const descClassName = active
                  ? "mt-2 block text-sm leading-6 text-indigo-900/76 dark:text-indigo-100/76"
                  : "mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-300";
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={cardClassName}
                  >
                    <CardIcon size={20} className="mb-3 text-indigo-600 dark:text-indigo-300" />
                    <strong className="block text-sm font-bold">{t(item.title)}</strong>
                    <span className={descClassName}>{t(item.desc)}</span>
                  </a>
                );
              })}
            </div>
          </section>

          <aside className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5 text-indigo-950 shadow-sm dark:border-indigo-300/20 dark:bg-indigo-400/10 dark:text-indigo-100 lg:sticky lg:top-28">
            <div className="flex items-start gap-3">
              <KeyRound size={22} className="mt-1 shrink-0 text-indigo-600 dark:text-indigo-200" />
              <div>
                <h2 className="text-base font-bold">{t({ zh: "注册后获取专属凭证", en: "Credentials after registration" })}</h2>
                <p className="mt-2 text-sm leading-7 text-indigo-900/78 dark:text-indigo-100/78">
                  {t({
                    zh: "文档和接口规则无需登录即可查看；调用真实商户客服前，请先注册并在「工作台 -> 客服 -> 客服设置 -> 技术配置」新建网站接入。",
                    en: "Docs and API rules are public. To call a real merchant support entry, register and create a website integration under Workspace -> Support -> Settings -> Technical config.",
                  })}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {privateItems.map(item => {
                const ItemIcon = item.icon;
                return (
                  <div key={t(item.title)} className="rounded-2xl border border-indigo-200/70 bg-white/70 p-3 dark:border-indigo-200/20 dark:bg-slate-950/24">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <ItemIcon size={16} />
                      {t(item.title)}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-indigo-900/72 dark:text-indigo-100/72">{t(item.desc)}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
              >
                {t({ zh: "注册并生成凭证", en: "Register and generate credentials" })}
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white/72 px-5 py-3 text-sm font-bold text-indigo-700 transition-colors hover:bg-white dark:border-indigo-200/20 dark:bg-slate-950/24 dark:text-indigo-100"
              >
                {t({ zh: "接入咨询", en: "Integration support" })}
              </Link>
            </div>
          </aside>
        </div>

        <div className="mt-8 grid gap-8">
          <SectionShell id="docs" kicker={t({ zh: "Docs", en: "Docs" })} title={t({ zh: "对接范围与环境", en: "Integration scope and environment" })}>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: t({ zh: "公开 REST API", en: "Public REST API" }), value: apiBase },
                { label: t({ zh: "访客 WebSocket", en: "Visitor WebSocket" }), value: wsBase },
                { label: t({ zh: "Web Widget 脚本", en: "Web Widget script" }), value: widgetUrl },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/70">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{item.label}</dt>
                  <dd className="mt-3 break-all font-mono text-xs leading-6 text-slate-900 dark:text-slate-100">{item.value}</dd>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <CheckCircle2 size={16} />
                {t({ zh: "公开文档与专属凭证的边界", en: "Boundary between public docs and private credentials" })}
              </div>
              {t({
                zh: "本页展示所有通用对接规则。只有商户身份相关的 App ID、API Key、店铺、展示名和允许域名需要注册后在商户端生成或填写。",
                en: "This page documents all generic integration rules. Only merchant-specific App ID, API Key, store, display name, and allowed origins require registration and console setup.",
              })}
            </div>
          </SectionShell>

          <SectionShell id="sdk" kicker={t({ zh: "SDK", en: "SDK" })} title={t({ zh: "Web Widget 快速接入", en: "Web Widget quick start" })}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {t({
                    zh: "官网、品牌站或独立站推荐使用 Widget。发布前，把 <app_id> 和 <API Key> 换成注册后在商户端复制的真实值，并把网站域名加入允许访问的网站。",
                    en: "Use the Widget for official websites, brand sites, or standalone stores. Before launch, replace <app_id> and <API Key> with real console values, and add the site domain to allowed origins.",
                  })}
                </p>
                <CodeBlock label="HTML" code={widgetSnippet} />
              </div>
              <ol className="space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                {[
                  { zh: "注册并进入商户端技术配置，创建网站接入。", en: "Register, open technical config, and create a website integration." },
                  { zh: "复制 App ID 与 API Key，填写允许访问的网站。", en: "Copy App ID and API Key, then set allowed origins." },
                  { zh: "把脚本贴到网站 </body> 前并发布。", en: "Place the script before </body> and publish." },
                  { zh: "用隐身窗口发一条测试消息，在接待台确认可见。", en: "Send a test message in an incognito window and confirm it in the console." },
                ].map((step, index) => (
                  <li key={t(step)} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/70">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{index + 1}</span>
                    <span>{t(step)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </SectionShell>

          <SectionShell id="api" kicker={t({ zh: "REST", en: "REST" })} title={t({ zh: "REST API 速查", en: "REST API reference" })}>
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { method: "POST", path: `${apiBase}${PUBLIC_CHAT_API.path}`, desc: t({ zh: "创建访客会话，返回 visitor_token 和 conversation.id。", en: "Create a visitor conversation and return visitor_token plus conversation.id." }) },
                  { method: "POST", path: messageEndpoint, desc: t({ zh: "WebSocket 断线时发送消息。", en: "Send messages when WebSocket is unavailable." }) },
                  { method: "GET", path: `${historyEndpoint}?token=<visitor_token>`, desc: t({ zh: "访客刷新页面或 App 恢复时拉历史。", en: "Load history after page refresh or app resume." }) },
                  { method: "POST", path: attachmentEndpoint, desc: t({ zh: "multipart 上传图片或文件。", en: "Upload images or files with multipart form data." }) },
                ].map(item => (
                  <div key={`${item.method}-${item.path}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-900 px-2 py-1 font-mono text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-950">{item.method}</span>
                      <code className="break-all text-xs text-indigo-700 dark:text-indigo-200">{item.path}</code>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.desc}</p>
                  </div>
                ))}
              </div>

              <FieldTable rows={handshakeFields} t={t} />
              <div className="grid gap-4 lg:grid-cols-2">
                <CodeBlock label="curl" code={curlSnippet} />
                <CodeBlock label="success response" code={JSON.stringify(handshakeResponse, null, 2)} />
              </div>
              <CodeBlock label="TypeScript / JavaScript" code={fetchSnippet} />
            </div>
          </SectionShell>

          <SectionShell id="ws" kicker={t({ zh: "WebSocket", en: "WebSocket" })} title={t({ zh: "访客实时通道", en: "Visitor realtime channel" })}>
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/70">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">URL</dt>
                <dd className="mt-3 break-all font-mono text-xs leading-6 text-slate-900 dark:text-slate-100">{visitorWsUrl}</dd>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <WsEventTable title={t({ zh: "访客发送", en: "Client events" })} rows={clientEvents} t={t} />
                <WsEventTable title={t({ zh: "服务端推送", en: "Server events" })} rows={serverEvents} t={t} />
              </div>
              <CodeBlock
                label="visitor.send"
                code={JSON.stringify({
                  type: "visitor.send",
                  content: "这件商品还有库存吗？",
                  client_message_id: "website-unique-message-id",
                }, null, 2)}
              />
            </div>
          </SectionShell>

          <SectionShell id="errors" kicker={t({ zh: "Errors", en: "Errors" })} title={t({ zh: "错误码与上线验收", en: "Errors and launch checks" })}>
            <div className="space-y-6">
              <ErrorTable rows={errorRows} t={t} />
              <div className="grid gap-3 md:grid-cols-2">
                {checklist.map(item => (
                  <div key={t(item)} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-300">
                    <CheckCircle2 size={17} className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <span>{t(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionShell>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
            >
              {t({ zh: "注册后进入商户端配置", en: "Register and configure in console" })}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-gray-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <ArrowLeft size={16} />
              {t({ zh: "返回首页", en: "Back to home" })}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
