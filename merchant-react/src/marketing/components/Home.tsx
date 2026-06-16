import { ArrowRight, Bot, MessageSquare, Database, Network, CheckCircle2, ChevronRight, User, Globe, Users, MonitorSmartphone, Settings, Plus, ArrowUp, Mic, ChevronDown } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { setPortalStyleMode } from "../../portal/portalStyleMode";
import { startHomePortalTransition } from "../../portal/homePortalTransition";
import { logoAssetsForThemeAndLocale } from "../brandAssets";
import { SloganMark } from "./SloganMark";
import { useSitePreferences } from "../sitePreferences";
import { useShowCrossBorderPublicCopy } from "../lib/publicRegionCopy";
import { billingCurrencyForRegion, formatPlanPrice } from "../../lib/planPricing";
import { useRegion } from "@xiaoone/region";
import { PartnerBrandMark } from "../../components/PartnerBrandMark";
import { FirstScreenBackdrop } from "../../components/FirstScreenBackdrop";

export function Home() {
  const { locale, theme, t } = useSitePreferences();
  const showCrossBorderCopy = useShowCrossBorderPublicCopy();
  const { region } = useRegion();
  const businessPlanPrice = formatPlanPrice(
    showCrossBorderCopy ? 199 : 1288,
    billingCurrencyForRegion(showCrossBorderCopy ? "overseas" : region),
  );
  const [intent, setIntent] = useState("");
  const [portalLaunching, setPortalLaunching] = useState(false);
  const composerShellRef = useRef<HTMLFormElement>(null);
  const brand = logoAssetsForThemeAndLocale(theme, locale);
  const workspaceRoles = [
    t({ zh: "xiaoone", en: "xiaoone" }),
    t({ zh: "软件开发", en: "Developer" }),
    t({ zh: "图片设计", en: "Image" }),
    t({ zh: "视频制作", en: "Video" }),
    t({ zh: "文案生成", en: "Copy" }),
    t({ zh: "客服", en: "Support" }),
    t({ zh: "企业服务", en: "Business" }),
  ];

  useEffect(() => {
    document.documentElement.classList.add("x1-home-page");
    return () => {
      document.documentElement.classList.remove("x1-home-page");
    };
  }, []);

  function submitIntent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = intent.trim();
    const shell = composerShellRef.current;
    if (!shell)
      return;

    const composer = shell.querySelector<HTMLElement>(".x1-message-composer");
    const sourceEl = composer ?? shell;
    const rect = sourceEl.getBoundingClientRect();

    setPortalLaunching(true);
    setPortalStyleMode("chat");
    startHomePortalTransition({
      intent: query,
      sourceRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      theme: theme === "dark" ? "dark" : "light",
      createdAt: Date.now(),
    });
  }

  return (
    <div className="x1-home-root flex flex-col items-center">
      <FirstScreenBackdrop className="x1-home-backdrop" />

      {/* 1. Hero Section */}
      <section className="x1-home-hero-section relative z-10 w-full min-h-[100svh] pt-28 pb-20 md:pt-36 md:pb-28 px-4 sm:px-6 lg:px-8 text-center overflow-hidden bg-transparent flex items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: portalLaunching ? 0 : 1, y: portalLaunching ? -12 : 0 }}
          transition={{ duration: portalLaunching ? 0.34 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="x1-home-hero-inner max-w-5xl mx-auto flex w-full flex-col items-center relative z-10"
        >
          <h1 className="sr-only">
            {t({
              zh: 'xiaoone — 商户智能工作站，AI 团队与客服闭环',
              en: 'xiaoone — Merchant intelligence workspace with an AI team and connected support loop',
            })}
          </h1>
          {/* Logo */}
          <img 
            src={brand.horizontal} 
            alt="xiaoone Logo" 
            className="h-14 md:h-20 mb-5 object-contain" 
          />

          <SloganMark />
          
          {/* Demand Input Box (Glassmorphism Message Box) */}
          <motion.form
            ref={composerShellRef}
            onSubmit={submitIntent}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: portalLaunching ? 0 : 1,
              scale: portalLaunching ? 0.98 : 1,
            }}
            transition={
              portalLaunching
                ? { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                : { delay: 0.2, type: "spring", stiffness: 100, damping: 20 }
            }
            className={`x1-message-composer-shell w-full mb-10 relative group ${portalLaunching ? "is-launching" : ""}`}
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/20 via-indigo-500/20 to-purple-500/20 rounded-[1.75rem] opacity-50 group-hover:opacity-100 transition duration-700 blur-xl"></div>
            <div className="x1-message-composer relative flex flex-col bg-white/40 backdrop-blur-[40px] border border-white/60 rounded-[1.5rem] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-300">
              
              <textarea
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                placeholder={t({ zh: "输入你的手机号或邮箱进行登录", en: "Describe your business scenario and find the right workstation" })}
                className="x1-message-composer__textarea flex-1 w-full bg-transparent border-none text-gray-900 px-2 pt-2 pb-4 text-lg focus:outline-none focus:ring-0 placeholder-gray-500 resize-none font-medium leading-relaxed"
                rows={2}
              ></textarea>
              
              <div className="flex justify-between items-center px-1 mt-auto">
                <button type="button" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/60 backdrop-blur-sm text-gray-500 hover:text-gray-800 shadow-sm border border-white/80 transition-colors" aria-label={t({ zh: "补充场景", en: "Add context" })}>
                  <Plus size={18} strokeWidth={2} />
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex items-center text-gray-700 hover:text-gray-900 cursor-pointer transition-colors text-sm font-bold">
                    {t({ zh: "创建", en: "Build" })} <ChevronDown size={14} className="ml-1 opacity-70" />
                  </div>
                  <button type="button" className="text-gray-600 hover:text-gray-900 transition-colors" aria-label={t({ zh: "语音输入", en: "Voice input" })}>
                    <Mic size={18} />
                  </button>
                  <button
                    type="submit"
                    disabled={portalLaunching}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-all hover:scale-105 disabled:pointer-events-none"
                    aria-label={t({ zh: "进入 AI 登录", en: "Open AI sign-in" })}
                  >
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

            </div>
          </motion.form>

        </motion.div>
      </section>

      <div className="x1-home-floating-content relative z-10 flex w-full flex-col items-center">

      {/* 2. Workstation Preview（大屏完整拟真；小屏隐藏以免三栏固定宽布局撑破视口） */}
      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 mb-16 py-10 lg:py-14 overflow-visible"
      >
        <div className="max-w-6xl mx-auto relative group">
          <div className="absolute -inset-x-10 -inset-y-12 bg-gradient-to-r from-blue-500/12 via-cyan-400/8 to-purple-500/12 blur-[58px] opacity-70 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none hidden lg:block" />

          <div className="lg:hidden rounded-2xl border border-white/70 bg-white/55 backdrop-blur-xl p-6 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12)] relative z-10">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{t({ zh: "商户智能工作站", en: "Merchant intelligence workspace" })}</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {t({
                zh: "左侧智能团队、中间客户咨询、右侧渠道与 AI 建议的一体化界面适合在宽屏下浏览；手机端为您摘要核心能力",
                en: "The wide-screen workspace combines AI roles, customer conversations, channel context, and AI recommendations. Mobile shows the core capability summary",
              })}
            </p>
            <ul className="text-sm text-gray-700 space-y-2.5 mb-5">
              {[
                t({ zh: "多模块入口（xiaoone、客服、软件开发、内容创作等）统一在一套工作台", en: "Multiple modules in one workspace: xiaoone, support, developer, content studio, and more" }),
                t({ zh: "客户咨询支持语料库自动答复与人工接管", en: "Knowledge-based AI replies with human takeover" }),
                t({ zh: "侧栏展示渠道来源、建议回复与语料命中", en: "Side panels show source, suggestions, and matched corpus" }),
              ].map((line) => (
                <li key={line} className="flex gap-2.5">
                  <CheckCircle2 size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
            >
              {t({ zh: "免费创建工作站", en: "Create a free workspace" })}
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="hidden lg:flex bg-white/40 backdrop-blur-3xl rounded-2xl border border-white/60 shadow-[0_34px_74px_-18px_rgba(15,23,42,0.22),0_16px_42px_-28px_rgba(79,70,229,0.36)] overflow-hidden flex-col min-h-[600px] transition-shadow duration-500 relative z-10">
            {/* Preview Header */}
            <div className="h-12 border-b border-white/40 flex items-center px-4 justify-between bg-white/30 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm border border-red-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm border border-yellow-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm border border-green-500/20"></div>
                </div>
                <div className="ml-4 flex items-center gap-4 text-sm text-gray-700 font-bold">
                  <span className="hover:text-gray-900 cursor-pointer transition-colors pt-[1px]">{t({ zh: "xiaoone", en: "xiaoone" })}</span>
                  <span className="text-indigo-600 border-b-2 border-indigo-600 pb-[13px] mt-[13px]">{t({ zh: "客户咨询", en: "Inbox" })}</span>
                  <span className="hover:text-gray-900 cursor-pointer transition-colors pt-[1px]">{t({ zh: "技能", en: "Skills" })}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <img src={brand.horizontal} alt="xiaoone workspace logo" className="h-4 opacity-80" />
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white">M</div>
              </div>
            </div>
            
            {/* Preview Body */}
            <div className="flex flex-1 min-h-[552px]">
              {/* Left Sidebar */}
              <div className="w-56 border-r border-gray-200 bg-gray-50/50 p-3 flex flex-col gap-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">{t({ zh: "智能团队", en: "AI team" })}</div>
                {workspaceRoles.map((role, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-default ${i === 5 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-blue-950/65'}`}>
                    {i === 0 ? <Bot size={16} /> : i === 6 ? <Settings size={16} /> : <User size={16} />}
                    {role}
                  </div>
                ))}
                
                <div className="mt-auto">
                  <div className="border-t border-gray-200 pt-3 mt-3"></div>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 cursor-default">
                    <MessageSquare size={16} />
                    {t({ zh: "问题反馈", en: "Feedback" })}
                  </div>
                </div>
              </div>

              {/* Main Canvas */}
              <div className="flex-1 bg-white flex flex-col">
                <div className="h-14 border-b border-gray-200 flex items-center px-6 justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-gray-800 font-medium">{t({ zh: "新客户咨询 - 价格方案", en: "New inquiry - Pricing" })}</h2>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-orange-50 text-orange-600 border border-orange-200">{t({ zh: "等待中", en: "Waiting" })}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors">{t({ zh: "接管对话", en: "Take over" })}</button>
                    <button className="px-3 py-1.5 rounded-md bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 border border-gray-200 shadow-sm transition-colors">{t({ zh: "归档", en: "Archive" })}</button>
                  </div>
                </div>
                
                <div className="flex-1 p-6 flex flex-col gap-6 bg-gray-50/30">
                  <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-medium">{t({ zh: "访", en: "V" })}</div>
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm p-4 text-sm text-gray-700 max-w-[80%] hover:shadow-md transition-shadow">
                      {t({
                        zh: "你好，我们在独立站上看到你们的服务，想了解一下如果我们需要接入门店的会员系统，应该选择哪个套餐？",
                        en: "Hello, we found your services on our site and want to know which plan supports connecting our store membership system",
                      })}
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.6 }} className="flex gap-4 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-white"><Bot size={16} /></div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tr-sm p-4 text-sm text-indigo-950 max-w-[80%] flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow dark:bg-indigo-50 dark:text-indigo-950">
                      <div className="flex items-center gap-2 text-xs text-indigo-600 mb-1 font-medium">
                        <CheckCircle2 size={14} /> {t({ zh: '基于语料库 "定价与套餐指南" 自动回复', en: 'Auto-reply from corpus "Pricing and plan guide"' })}
                      </div>
                      <span>{t({
                        zh: "您好！感谢关注，如果您需要接入第三方门店会员系统，这属于高级定制化集成能力",
                        en: "Hello. If you need to connect a third-party store membership system, this is an advanced custom integration capability",
                      })}</span>
                      <span>{t({
                        zh: `建议选择商户版（${businessPlanPrice}/月），该版本支持完整 REST API、Webhook 订阅和团队协同，可与会员系统双向同步`,
                        en: `We recommend Ultra (${businessPlanPrice}/mo). It supports full REST APIs, webhooks, and team collaboration for two-way membership sync`,
                      })}</span>
                    </div>
                  </motion.div>
                </div>
                
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center text-gray-400 text-sm hover:border-gray-300 transition-colors cursor-text">
                    {t({ zh: "请输入回复内容，或输入 / 唤起快捷指令", en: "Write a reply, or type / for quick actions" })}
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="w-72 border-l border-gray-200 bg-gray-50/50 p-4 flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t({ zh: "渠道信息", en: "Channel info" })}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm hover:bg-gray-100/50 p-1 rounded transition-colors">
                      <span className="text-gray-500">{t({ zh: "来源", en: "Source" })}</span>
                      <span className="text-gray-700 flex items-center gap-1.5 font-medium"><Globe size={14} className="text-gray-400" /> Web SDK</span>
                    </div>
                    <div className="flex justify-between text-sm hover:bg-gray-100/50 p-1 rounded transition-colors">
                      <span className="text-gray-500">{t({ zh: "页面", en: "Page" })}</span>
                      <span className="text-gray-700 font-medium">/pricing</span>
                    </div>
                    <div className="flex justify-between text-sm hover:bg-gray-100/50 p-1 rounded transition-colors">
                      <span className="text-gray-500">{t({ zh: "IP 地区", en: "IP region" })}</span>
                      <span className="text-gray-700 font-medium">{showCrossBorderCopy ? "Singapore" : t({ zh: "中国大陆", en: "Mainland China" })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t({ zh: "AI 建议回复", en: "AI suggestions" })}</h3>
                  <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-3 text-sm text-gray-700 mb-2 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all">
                    {t({ zh: "是否需要我为您安排技术工程师，评估具体的接口对接方案？", en: "Should I arrange an engineer to evaluate the integration plan?" })}
                  </div>
                  <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-3 text-sm text-gray-700 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all">
                    {t({ zh: "您可以查看我们的 API 文档了解具体能力", en: "You can review the API docs for exact capabilities" })}
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                    {t({ zh: "命中语料", en: "Corpus match" })} 
                    <span className="text-indigo-600 text-[10px] bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-medium">{t({ zh: "1 条", en: "1 item" })}</span>
                  </h3>
                  <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="text-xs text-indigo-700 mb-1 font-semibold">{t({ zh: "商户版权限说明", en: "Ultra plan permissions" })}</div>
                    <p className="text-[11px] text-gray-500 line-clamp-3">{t({
                      zh: "商户版包含 API 访问、Webhook 事件、5 店铺、10 团队席位和账户中心管理能力，可支持门店会员系统对接",
                      en: "Ultra includes API access, webhooks, 5 stores, 10 team seats, and account-center management for store membership integrations",
                    })}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 3. Customer Service Loop */}
      <section id="customer-service" className="w-full py-20 bg-gray-50 px-4 sm:px-6 lg:px-8 border-b border-gray-200 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
              }}
            >
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 }}} className="inline-flex items-center gap-2 text-indigo-600 font-medium mb-4 bg-indigo-50 px-3 py-1.5 rounded-full text-sm">
                <MessageSquare size={18} /> {t({ zh: "客服闭环", en: "Support loop" })}
              </motion.div>
              <motion.h2 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 }}} className="text-3xl font-bold text-gray-900 mb-6">{t({ zh: "从访客咨询到人工接管，服务不断线", en: "From visitor inquiry to human takeover, service stays connected" })}</motion.h2>
              <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 }}} className="text-gray-600 text-lg mb-8 leading-relaxed">
                {t({
                  zh: "多渠道咨询统一进入客户咨询工作台，常见问题先由语料承接，涉及报价、规则或例外情况时，再带着上下文交给人工处理",
                  en: "Multi-channel inquiries enter one support workspace. Common questions are handled from the corpus first, while pricing, rules, and exceptions move to staff with full context",
                })}
              </motion.p>
              
              <div className="space-y-6">
                {[
                  { title: t({ zh: "首轮承接", en: "First response" }), desc: t({ zh: "高频问题先被接住，不让咨询停在第一轮", en: "Frequent questions are caught early so an inquiry does not stop at the first message" }) },
                  { title: t({ zh: "关键分流", en: "Key routing" }), desc: t({ zh: "报价、规则确认和复杂需求，及时提示人工介入", en: "Pricing, rule confirmation, and complex requests are flagged for staff at the right moment" }) },
                  { title: t({ zh: "接管带上下文", en: "Takeover with context" }), desc: t({ zh: "客服接手时保留完整对话、语料命中和建议回复", en: "Staff receive the full conversation, matched corpus, and suggested replies when they take over" }) },
                  { title: t({ zh: "状态可追踪", en: "Trackable states" }), desc: t({ zh: "等待中 → 进行中 → 已归档，处理进度清晰可查", en: "Waiting to in progress to archived, with clear progress for every case" }) }
                ].map((item, i) => (
                  <motion.div key={i} variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 }}} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    </div>
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-1">{item.title}</h4>
                      <p className="text-gray-600 text-sm">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-white rounded-2xl p-8 border border-gray-200 shadow-xl relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 blur-[50px]"></div>
              
              <div className="space-y-4 relative z-10">
                <motion.div 
                  animate={{ y: [0, -5, 0] }} 
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} 
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center hover:shadow-md transition-shadow cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">A</div>
                    <div>
                      <div className="text-gray-900 font-medium">Alice (Web)</div>
                      <div className="text-gray-500 text-xs mt-0.5">{t({ zh: "需要发票抬头修改", en: "Needs invoice header update" })}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-200">{t({ zh: "等待中", en: "Waiting" })}</span>
                </motion.div>
                
                <motion.div 
                  animate={{ y: [0, -8, 0] }} 
                  transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }} 
                  className="bg-white border-2 border-indigo-500/30 rounded-xl p-4 flex justify-between items-center shadow-[0_4px_20px_rgba(99,102,241,0.08)] cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <PartnerBrandMark brand="wechat" size={20} />
                    <div>
                      <div className="text-gray-900 font-medium">{t({ zh: "Bob (微信)", en: "Bob (WeChat)" })}</div>
                      <div className="text-indigo-600 font-medium text-xs mt-0.5 flex items-center gap-1">
                        {t({ zh: "正在输入中", en: "Typing" })}
                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>…</motion.span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">{t({ zh: "进行中", en: "In progress" })}</span>
                </motion.div>
                
                <motion.div 
                  animate={{ y: [0, -4, 0] }} 
                  transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 2 }} 
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <PartnerBrandMark brand="wecom" size={20} />
                    <div>
                      <div className="text-gray-700 font-medium">{t({ zh: "Charlie (企业微信)", en: "Charlie (WeCom)" })}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{t({ zh: "已解决退款问题", en: "Refund issue resolved" })}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">{t({ zh: "已归档", en: "Archived" })}</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. Knowledge Base & Smart Team */}
      <section id="smart-team" className="w-full py-20 bg-white px-4 sm:px-6 lg:px-8 border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t({ zh: "不同业务入口，各自带着上下文找 AI", en: "Each business entry brings its own context to AI" })}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
              <span>{t({
                zh: "业务入口负责上下文和权限，AI 能力层负责模型调用与限流",
                en: "Business entries handle context and permissions, while the AI layer handles model calls and limits",
              })}</span>
              <br />
              <span>{t({
                zh: "我们提供完整的智能角色协作矩阵",
                en: "xiaoone provides a complete collaboration matrix for intelligent roles",
              })}</span>
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
            }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
          >
            {[
              { icon: <MessageSquare size={24} />, name: t({ zh: "客户咨询", en: "Customer conversations" }), desc: t({ zh: "统一接入各渠道会话，支持 AI 建议回复与人工无缝接管，历史记录完整归档", en: "Unify channel conversations with AI suggested replies, human takeover, and archived history" }) },
              { icon: <Database size={24} />, name: t({ zh: "语料库", en: "Corpus" }), desc: t({ zh: "上传原始资料转化为语料，支持按店铺/渠道启停，严格约束 AI 答复边界", en: "Turn uploaded materials into corpus entries, scoped by store and channel to keep AI answers bounded" }) },
              { icon: <Users size={24} />, name: t({ zh: "智能团队", en: "AI team" }), desc: t({ zh: "包含 xiaoone、软件开发、图片设计、视频制作、文案生成、客服与企业服务；xiaoone 提供纯对话推荐，不自动跳流", en: "Includes xiaoone, developer, image, video, copy, support, and business services. xiaoone gives conversational recommendations without auto-routing" }) },
              { icon: <Settings size={24} />, name: t({ zh: "自动化", en: "Automation" }), desc: t({ zh: "模板、定时任务与资讯收集，配合内容创作与社交发帖；生成素材可沉淀到仓库", en: "Templates, scheduled tasks, and feeds that support content studio and social posting, with assets saved to the warehouse" }) },
              {
                icon: <CheckCircle2 size={24} />,
                name: t({ zh: "服务开通", en: "Service activation" }),
                desc: t({ zh: "提供企业服务咨询、材料协助等合规入口，清晰展示 KYC 与付费套餐门槛，由平台客服承接", en: "Compliance-aware service requests for enterprise services and document assistance, with KYC and plan gates handled by platform support" }),
              }
            ].map((module, i) => (
              <motion.div 
                key={i} 
                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }} 
                className="bg-gray-50 p-6 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-50 transition-all duration-300 shadow-sm">
                  {module.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{module.name}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{module.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* 5. Multi-channel */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-gray-50 rounded-3xl p-10 border border-gray-200 flex flex-col md:flex-row items-center gap-10 overflow-hidden relative"
          >
            <div className="md:w-1/2 relative z-10">
              <div className="inline-flex items-center gap-2 text-cyan-700 font-medium mb-4 bg-cyan-50 px-3 py-1.5 rounded-full text-sm">
                <Network size={18} /> {t({ zh: "多渠道接入", en: "Multi-channel access" })}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{t({ zh: "统一接入，按店铺和渠道隔离", en: "Unified access, isolated by store and channel" })}</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {t({
                  zh: "无论您的客户来自官网、App 还是已开通的业务渠道，xiaoone 都能将消息统一路由到用户端工作台，同时保持严格的数据隔离",
                  en: "Whether customers arrive from your site, app, or enabled business channels, xiaoone routes messages into the user workspace with strict data isolation",
                })}
              </p>
              <ul className="grid grid-cols-2 gap-4">
                {[
                      { label: 'Web SDK' },
                      { label: t({ zh: '官网访客', en: 'Website visitors' }), brand: undefined },
                      { label: t({ zh: '企业微信', en: 'WeCom' }), brand: 'wecom' },
                      { label: 'REST API' },
                      { label: t({ zh: '实时消息同步', en: 'Realtime sync' }) },
                      { label: t({ zh: 'App / 自研接入', en: 'App / custom API' }) },
                    ].map((item, i) => (
                  <motion.li 
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-2 text-gray-700 text-sm font-medium"
                  >
                    {item.brand
                      ? <PartnerBrandMark brand={item.brand} size={14} className="partner-brand-mark--sm" />
                      : <CheckCircle2 size={16} className="text-cyan-600" />}
                    {item.label}
                  </motion.li>
                ))}
              </ul>
            </div>
            <div className="md:w-1/2 flex justify-center relative z-10">
              <div className="relative w-full max-w-sm aspect-square">
                {/* Central Hub */}
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], boxShadow: ["0 10px 15px -3px rgba(0,0,0,0.1)", "0 20px 25px -5px rgba(6,182,212,0.3)", "0 10px 15px -3px rgba(0,0,0,0.1)"] }} 
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-24 bg-white border border-gray-200 rounded-2xl flex items-center justify-center z-20 shadow-lg"
                >
                  <img src={brand.horizontal} alt="xiaoone multi-channel hub" className="w-full px-4 object-contain" />
                </motion.div>
                
                {/* Satellites */}
                <motion.div 
                  animate={{ y: [0, -12, 0] }} 
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0 }} 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-indigo-600 z-20 hover:scale-110 transition-transform cursor-pointer"
                >
                  <MonitorSmartphone size={20} />
                </motion.div>
                <motion.div 
                  animate={{ y: [0, 12, 0] }} 
                  transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1 }} 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-cyan-600 z-20 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Network size={20} />
                </motion.div>
                <motion.div 
                  animate={{ x: [0, -12, 0] }} 
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }} 
                  className="absolute top-1/2 left-0 -translate-y-1/2 w-12 h-12 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-orange-500 z-20 hover:scale-110 transition-transform cursor-pointer"
                >
                  <MessageSquare size={20} />
                </motion.div>
                <motion.div 
                  animate={{ x: [0, 12, 0] }} 
                  transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut", delay: 1.5 }} 
                  className="absolute top-1/2 right-0 -translate-y-1/2 w-12 h-12 bg-white border border-gray-200 shadow-md rounded-full flex items-center justify-center text-green-600 z-20 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Users size={20} />
                </motion.div>
                
                {/* Connecting Lines with flow animation */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <motion.line x1="50%" y1="10%" x2="50%" y2="50%" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 6" animate={{ strokeDashoffset: [0, -24] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} />
                  <motion.line x1="50%" y1="90%" x2="50%" y2="50%" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 6" animate={{ strokeDashoffset: [0, -24] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} />
                  <motion.line x1="10%" y1="50%" x2="50%" y2="50%" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 6" animate={{ strokeDashoffset: [0, -24] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} />
                  <motion.line x1="90%" y1="50%" x2="50%" y2="50%" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 6" animate={{ strokeDashoffset: [0, -24] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6. Registration Stepper */}
      <section className="w-full py-24 bg-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-gray-900 mb-16"
          >
            {t({ zh: "6 步创建你的智能工作站", en: "Create your AI workspace in 6 steps" })}
          </motion.h2>
          
          <div className="relative">
            {/* Horizontal Line */}
            <motion.div 
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="hidden md:block absolute top-6 left-12 right-12 h-px bg-gray-200 origin-left"
            ></motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
              }}
              className="grid grid-cols-1 md:grid-cols-6 gap-8"
            >
              {[
                { step: "1", title: t({ zh: "你的身份", en: "Identity" }), icon: <User size={18} /> },
                { step: "2", title: t({ zh: "业务目标", en: "Goal" }), icon: <CheckCircle2 size={18} /> },
                { step: "3", title: t({ zh: "系统命名", en: "Name it" }), icon: <Settings size={18} /> },
                { step: "4", title: t({ zh: "选择套餐", en: "Plan" }), icon: <Database size={18} /> },
                { step: "5", title: t({ zh: "手机验证", en: "Verify" }), icon: <MonitorSmartphone size={18} /> },
                { step: "6", title: t({ zh: "进入工作台", en: "Enter" }), icon: <ArrowRight size={18} /> }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  variants={{ hidden: { opacity: 0, y: 20, scale: 0.8 }, visible: { opacity: 1, y: 0, scale: 1 } }} 
                  className="relative flex flex-col items-center group cursor-default"
                >
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-indigo-500 text-indigo-600 flex items-center justify-center font-bold relative z-10 mb-4 shadow-md group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    {item.step}
                  </div>
                  <div className="text-gray-900 font-semibold mb-2">{item.title}</div>
                  <div className="text-gray-400 flex items-center justify-center bg-gray-50 w-8 h-8 rounded-full border border-gray-100 group-hover:text-indigo-500 transition-colors">
                    {item.icon}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="mt-16"
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              {t({ zh: "免费注册，进入工作站", en: "Sign up free and enter the workspace" })}
              <ChevronRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>
      </div>
    </div>
  );
}
