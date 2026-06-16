import { motion } from "motion/react";
import { Code2, ArrowRight, GitPullRequest, LayoutTemplate, Briefcase, FileCode2 } from "lucide-react";
import { Link } from "react-router";
import { useSitePreferences } from "../sitePreferences";

export function Programmer() {
  const { t, tKey } = useSitePreferences();

  return (
    <div className="pt-24 pb-20 min-h-screen relative overflow-hidden bg-transparent">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] bg-slate-50 flex items-center justify-center pointer-events-none opacity-60">
        <svg viewBox="0 0 100 50" className="w-[120vw] min-w-[800px] h-auto blur-[100px] transform">
          <motion.path
            d="M 10 25 L 50 10 L 90 25 L 50 40 Z"
            fill="none"
            stroke="url(#progGrad)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ pathLength: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="progGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-6"
          >
            <Code2 size={16} />
            <span>{tKey("marketing.programmer.badge")}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {tKey("marketing.programmer.hero.titleLine1")}<br/>{tKey("marketing.programmer.hero.titleLine2")}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-8 max-w-3xl rounded-2xl border border-white/60 bg-white/45 px-6 py-4 text-lg leading-relaxed text-gray-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
          >
            {t({
              zh: "智能助手用于需求澄清、信息整理、内容草拟和决策建议，帮你把零散的想法和问题，整理成可以直接执行的下一步",
              en: "The assistant clarifies needs, organizes information, drafts content, and suggests decisions, turning scattered ideas into an actionable next step",
            })}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2">
              <Code2 size={18} />
              {tKey("marketing.programmer.cta.chat")}
            </button>
            <button className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center">
              {tKey("marketing.programmer.cta.docs")}
            </button>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110">
              <GitPullRequest size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t({ zh: "想法澄清", en: "Idea clarification" })}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t({
                zh: "从一句模糊的描述出发，主动追问关键信息，帮你把真正的目标和约束梳理清楚",
                en: "Start from one vague sentence; the assistant asks the key questions to surface your real goal and constraints",
              })}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110">
              <FileCode2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t({ zh: "信息整理", en: "Information organizing" })}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t({
                zh: "把对话、资料和要点整理成结构化的清单、表格或摘要，随时可以复制带走",
                en: "Turn conversations, materials, and notes into structured lists, tables, or summaries you can copy and reuse",
              })}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all duration-300"
          >
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110">
              <Briefcase size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{t({ zh: "决策建议", en: "Decision support" })}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t({
                zh: "在你需要时给出可选方案和取舍建议，并能推荐合适的业务入口，但是否采用由你决定",
                en: "Offers options and trade-offs when you need them, and can point to the right business entry, while you stay in control",
              })}
            </p>
          </motion.div>
        </div>

        {/* Development Delivery Card Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col md:flex-row"
        >
          {/* Input Side */}
          <div className="md:w-5/12 bg-gray-50 p-8 border-r border-gray-200">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
              <LayoutTemplate size={16} /> {t({ zh: "你的输入", en: "Your input" })}
            </h4>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">{t({ zh: "你的问题", en: "Your question" })}</label>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800">
                  {t({
                    zh: "我想做一次新品促销，但不知道从哪里开始",
                    en: "I want to run a new-product promotion but don't know where to start",
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">{t({ zh: "背景信息", en: "Background" })}</label>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800">
                  {t({
                    zh: "我有一家小店，主要客户在海外，预算有限",
                    en: "I run a small shop, mostly overseas customers, limited budget",
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">{t({ zh: "你的要求", en: "Constraints" })}</label>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800">
                  {t({
                    zh: "希望两周内开始，方案要简单可落地",
                    en: "Hope to start within two weeks; keep the plan simple and doable",
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Output Side */}
          <div className="md:w-7/12 p-8">
             <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Code2 size={16} /> {t({ zh: "智能助手的整理输出", en: "Assistant's structured output" })}
            </h4>

            <div className="space-y-5">
              {/* Output Item 1 */}
              <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900 text-sm">{t({ zh: "目标澄清", en: "Goal summary" })}</h5>
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">{t({ zh: "重点", en: "Key points" })}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {t({ zh: "先锁定 ", en: "First lock in the " })}
                  <code>促销目标</code>
                  {t({ zh: " 和 ", en: " and " })}
                  <code>目标客户</code>
                  {t({ zh: "，再拆成 ", en: ", then break it into a " })}
                  <code>分步计划</code>
                  {t({ zh: " 逐步推进", en: " to move forward" })}
                </p>
              </div>

              {/* Output Item 2 */}
              <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900 text-sm">{t({ zh: "整理结果", en: "Organized result" })}</h5>
                  <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs">{t({ zh: "清单", en: "List" })}</span>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-300 overflow-x-auto relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, delay: 1 }}
                    className="overflow-hidden whitespace-nowrap border-r-2 border-green-400"
                    style={{ display: "inline-block" }}
                  >
                    <span className="text-blue-400">{t({ zh: "目标", en: "Goal" })}</span> {t({ zh: "新品首周销量提升 20%", en: "Lift first-week sales by 20%" })}<br/>
                    <span className="text-green-400">{t({ zh: "建议", en: "Plan" })}</span> {t({ zh: "首页 banner + 邮件 + 限时折扣券", en: "Home banner + email + limited-time coupon" })}
                  </motion.div>
                </div>
              </div>

              {/* Output Item 3 */}
              <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900 text-sm">{t({ zh: "下一步建议", en: "Suggested next steps" })}</h5>
                  <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs">{t({ zh: "建议", en: "Tips" })}</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>{t({ zh: "先用一周做小范围测试，验证转化效果", en: "Run a one-week small-scale test to validate conversion" })}</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>{t({ zh: "预算优先投放在转化最高的渠道", en: "Put budget first into the highest-converting channel" })}</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>{t({ zh: "需要时可一键把任务转交内容或客服团队承接", en: "When needed, hand the task to the content or support team in one click" })}</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
