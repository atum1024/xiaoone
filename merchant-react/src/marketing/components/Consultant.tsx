import { motion } from "motion/react";
import { MessageSquare, ArrowRight, Compass, Target, CheckCircle2, Navigation } from "lucide-react";
import { Link } from "react-router";
import { useSitePreferences } from "../sitePreferences";

export function Consultant() {
  const { t, tKey } = useSitePreferences();

  const canDoItems = [
    t({ zh: "梳理业务目标，把模糊的想法变成具体的诉求", en: "Turn vague ideas into clear business requirements" }),
    t({ zh: "拆解问题边界，分析当前面临的核心卡点", en: "Break down the problem boundary and identify the real blockers" }),
    t({ zh: "生成下一步行动清单，提供可落地的执行建议", en: "Generate concrete next actions and practical recommendations" }),
    t({ zh: "推荐合适业务板块，为你指引正确的解决路径", en: "Recommend the right business module and guide the next path" }),
  ];

  const cannotDoItems = [
    t({ zh: "不自动替用户开通服务，所有决策由你掌控", en: "It will not activate services automatically. You stay in control" }),
    t({ zh: "不自动提交第三方业务，只负责建议和指引", en: "It will not submit third-party service requests automatically" }),
    t({ zh: "不把所有问题混到一个万能 AI 中，保持专业分工", en: "It keeps role boundaries instead of hiding everything inside one generic AI" }),
  ];

  const workspaceItems = [
    {
      title: t({ zh: "社交发帖", en: "Social posting" }),
      desc: t({ zh: "素材包管理、多平台即时或定时发布与排期，生成内容可从仓库选取", en: "Manage asset packs, schedule multi-platform publishing, and reuse generated content from the warehouse" }),
    },
    {
      title: t({ zh: "仓库", en: "Warehouse" }),
      desc: t({ zh: "汇总 AI 图片、视频、文件与 PPT 等生成素材，并提供「我的空间」统一管理与复用", en: "Collect AI images, videos, files, and decks in one space for reuse" }),
    },
    {
      title: t({ zh: "自动化", en: "Automation" }),
      desc: t({ zh: "模板、定时任务与资讯收集，为内容创作与日常运营提供结构化输入", en: "Templates, scheduled tasks, and feeds that support content studio and daily operations" }),
    },
  ];

  return (
    <div className="pt-24 pb-20 min-h-screen relative overflow-hidden bg-transparent">
      <div className="fixed inset-0 z-[-1] bg-slate-50 flex items-center justify-center pointer-events-none opacity-60">
        <svg viewBox="0 0 100 50" className="w-[120vw] min-w-[800px] h-auto blur-[100px] transform">
          <motion.path
            d="M 20 20 C 50 10, 50 40, 80 20"
            fill="none"
            stroke="url(#consultantGrad)"
            strokeWidth="30"
            strokeLinecap="round"
            animate={{ pathLength: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="consultantGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-6"
          >
            <Compass size={16} />
            <span>{tKey("marketing.consultant.badge")}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {tKey("marketing.consultant.hero.titleLine1")}<br />{tKey("marketing.consultant.hero.titleLine2")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-8 max-w-3xl rounded-2xl border border-white/60 bg-white/45 px-6 py-4 text-lg leading-relaxed text-gray-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
          >
            {tKey("marketing.consultant.hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2">
              <MessageSquare size={18} />
              {tKey("marketing.consultant.cta.chat")}
            </button>
            <Link
              to="/register"
              className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center"
            >
              {tKey("marketing.consultant.cta.workspace")}
            </Link>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 transition-all duration-300"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Target className="text-indigo-600" />
              {tKey("marketing.consultant.canDo.title")}
            </h3>
            <ul className="space-y-4">
              {canDoItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="text-green-500 mt-0.5 flex-shrink-0" size={18} />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 transition-all duration-300"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Navigation className="text-amber-500" />
              {tKey("marketing.consultant.cannotDo.title")}
            </h3>
            <ul className="space-y-4">
              {cannotDoItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="max-w-4xl mx-auto mb-20 bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">{tKey("marketing.consultant.workspace.title")}</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            {tKey("marketing.consultant.workspace.desc")}
          </p>
          <ul className="space-y-4">
            {workspaceItems.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <CheckCircle2 className="text-indigo-600 mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <h4 className="text-gray-900 font-semibold mb-1">{item.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
        >
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <MessageSquare size={16} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{tKey("marketing.consultant.preview.title")}</h4>
              <p className="text-xs text-gray-500">{tKey("marketing.consultant.preview.status")}</p>
            </div>
          </div>

          <div className="p-6 md:p-10 space-y-6 bg-gray-50/50">
            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] shadow-sm">
                <p className="text-sm leading-relaxed">
                  {t({ zh: "我想搭建品牌官网或电商页面，顺便整理内容推广思路，不知道从哪开始", en: "I want to build a brand site or storefront and plan content promotion, but I do not know where to start" })}
                </p>
              </div>
            </div>

            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm p-5 max-w-[85%] shadow-sm">
                <p className="text-sm leading-relaxed mb-4">
                  {t({
                    zh: "了解，针对您的需求，我们可以分为两步来推进：",
                    en: "Understood. We can split this into two steps:",
                  })}
                  <br /><br />
                  {t({
                    zh: "1. 官网或商城页面搭建属于技术开发范畴，需要规划页面结构、商品管理和订单流程",
                    en: "1. Site or storefront work is development: page structure, product management, and order flow",
                  })}
                  <br />
                  {t({
                    zh: "2. 内容运营属于推广范畴，需要策划素材方向、发布计划和复盘指标",
                    en: "2. Content operations are promotion: creative direction, publishing plans, and review metrics",
                  })}
                </p>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">{tKey("marketing.consultant.preview.nextActions")}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-white px-4 py-3 text-left text-sm font-medium text-indigo-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-300/20 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-slate-800 group">
                      <span className="flex min-w-0 flex-col">
                        <span className="whitespace-nowrap">{t({ zh: "打开软件开发", en: "Open developer" })}</span>
                        <span className="text-xs font-normal text-indigo-500 dark:text-indigo-200">{t({ zh: "梳理建站需求", en: "Clarify site requirements" })}</span>
                      </span>
                      <ArrowRight size={16} className="text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </button>
                    <button className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-purple-200 bg-white px-4 py-3 text-left text-sm font-medium text-purple-700 transition-colors hover:border-purple-400 hover:bg-purple-50 dark:border-purple-300/20 dark:bg-slate-900 dark:text-purple-200 dark:hover:bg-slate-800 group">
                      <span className="flex min-w-0 flex-col">
                        <span className="whitespace-nowrap">{t({ zh: "打开内容创作", en: "Open content studio" })}</span>
                        <span className="text-xs font-normal text-purple-500 dark:text-purple-200">{t({ zh: "制定图文视频文案计划", en: "Plan image, video, and copy" })}</span>
                      </span>
                      <ArrowRight size={16} className="text-purple-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
