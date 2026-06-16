import { motion } from "motion/react";
import { Megaphone, Calendar, Share2, RefreshCw, Layers, LineChart, Target, Image as ImageIcon, Video, FileText } from "lucide-react";
import { Link } from "react-router";
import { useSitePreferences } from "../sitePreferences";

export function Marketing() {
  const { t, tKey } = useSitePreferences();

  return (
    <div className="pt-24 pb-20 min-h-screen relative overflow-hidden bg-transparent">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] bg-slate-50 flex items-center justify-center pointer-events-none opacity-60">
        <svg viewBox="0 0 100 50" className="w-[120vw] min-w-[800px] h-auto blur-[100px] transform">
          <motion.path
            d="M 10 20 C 30 10, 70 50, 90 20"
            fill="none"
            stroke="url(#marketingGrad)"
            strokeWidth="30"
            strokeLinecap="round"
            animate={{ pathLength: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="marketingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium mb-6"
          >
            <Megaphone size={16} />
            <span>{tKey("marketing.contentStudio.badge")}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {tKey("marketing.contentStudio.hero.titleLine1")}<br/>{tKey("marketing.contentStudio.hero.titleLine2")}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-8 max-w-3xl rounded-2xl border border-white/60 bg-white/45 px-6 py-4 text-lg leading-relaxed text-gray-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
          >
            {t({
              zh: "内容创作整合工作台的图片设计、视频制作与文案大师，并衔接社交发帖与仓库沉淀；涉及第三方平台发布或投放时，以平台规则、账户状态和已开通能力为准",
              en: "Content studio combines image, video, and copy tools with social posting and warehouse assets, subject to platform rules and enabled capabilities",
            })}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <button className="px-6 py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors shadow-sm flex items-center justify-center gap-2">
              <Megaphone size={18} />
              {tKey("marketing.contentStudio.cta.chat")}
            </button>
            <button className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center">
              {tKey("marketing.contentStudio.cta.automation")}
            </button>
          </motion.div>
        </div>

        {/* Content Workflow & Automation */}
        <div className="grid lg:grid-cols-12 gap-8 mb-20">
          
          {/* Left: Workflow */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="text-rose-500" />
                {tKey("marketing.contentStudio.workflow.title")}
              </h3>
              <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                {tKey("marketing.contentStudio.workflow.note")}
              </div>
            </div>
            <div className="p-8">
              <div className="relative">
                {/* Connecting Line */}
                <div className="absolute left-[23px] top-4 bottom-4 w-px bg-gray-100">
                  <motion.div 
                    initial={{ height: 0 }}
                    whileInView={{ height: "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                    className="w-full bg-rose-200"
                  />
                </div>
                
                <div className="space-y-8 relative">
                  <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.6 }} className="flex items-start gap-6 group cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 z-10 shrink-0 transition-transform group-hover:scale-110 group-hover:bg-rose-100">
                      <ImageIcon size={20} />
                    </div>
                    <div className="transition-transform group-hover:translate-x-1">
                      <h4 className="font-medium text-gray-900 mb-1">{t({ zh: "图片设计", en: "Image" })}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{t({
                        zh: "8 种创作 skill + 20 个 Seedream 场景模板；支持文生图、参考图、组图与虚拟人像，生成结果可一键衔接视频制作",
                        en: "8 creation skills + 20 Seedream scene templates; supports text-to-image, reference images, image sets, and virtual portraits, with one-click handoff to video production",
                      })}</p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.8 }} className="flex items-start gap-6 group cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 z-10 shrink-0 transition-transform group-hover:scale-110 group-hover:bg-indigo-100">
                      <Video size={20} />
                    </div>
                    <div className="transition-transform group-hover:translate-x-1">
                      <h4 className="font-medium text-gray-900 mb-1">{t({ zh: "视频制作", en: "Video" })}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{t({
                        zh: "22 个 Seedance 场景模板；支持文生视频、图生视频、首尾帧与虚拟人物出镜，可从图片任务直接带入参考素材",
                        en: "22 Seedance scene templates; supports text-to-video, image-to-video, first/last frame, and virtual human appearances, importing reference assets from image tasks",
                      })}</p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 1.0 }} className="flex items-start gap-6 group cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 z-10 shrink-0 transition-transform group-hover:scale-110 group-hover:bg-blue-100">
                      <FileText size={20} />
                    </div>
                    <div className="transition-transform group-hover:translate-x-1">
                      <h4 className="font-medium text-gray-900 mb-1">{t({ zh: "文案大师", en: "Copy master" })}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed">{t({
                        zh: "4 种文案 skill（官方公告、日常寒暄、人生感悟、视图配文），支持 26+ 种输出语言；可结合上传图片或视频生成发布文案",
                        en: "4 copy skills (official announcements, casual greetings, life reflections, view captions), 26+ output languages; generate publish copy from uploaded images or videos",
                      })}</p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 1.2 }} className="flex items-start gap-6 group cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 z-10 shrink-0 transition-transform group-hover:scale-110 group-hover:bg-amber-100">
                      <Target size={20} />
                    </div>
                    <div className="transition-transform group-hover:translate-x-1">
                      <h4 className="font-medium text-gray-900 mb-1">{t({ zh: "选题与脚本", en: "Topics & scripts" })}</h4>
                      <p className="text-sm text-gray-500">{t({
                        zh: "围绕经营场景整理选题、脚本、素材方向与复盘，为三类创作入口提供连续上下文",
                        en: "Organize topics, scripts, creative direction, and reviews around business scenarios, providing continuous context for all three creation entry points",
                      })}</p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 1.4 }} className="flex items-start gap-6 group cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 z-10 shrink-0 transition-transform group-hover:scale-110 group-hover:bg-emerald-100">
                      <LineChart size={20} />
                    </div>
                    <div className="transition-transform group-hover:translate-x-1">
                      <h4 className="font-medium text-gray-900 mb-1">{t({ zh: "数据复盘", en: "Performance review" })}</h4>
                      <p className="text-sm text-gray-500">{t({
                        zh: "结合投放或自然流量数据迭代下一步策略（以已开通能力为准）",
                        en: "Iterate next-step strategy with paid or organic traffic data (subject to enabled capabilities)",
                      })}</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Automation & Channels */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-4 space-y-6"
          >
            {/* Automation Linkage */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <RefreshCw className="text-indigo-500" size={18} />
                {t({ zh: "自动化、发帖与仓库", en: "Automation, posting, and warehouse" })}
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {t({
                  zh: "自动化可收集行业资讯与公开内容趋势；社交发帖支持素材包与多平台即时或定时发布；图片、视频与文案成果可沉淀到仓库统一管理与复用",
                  en: "Automation collects trends; social posting supports packs and scheduled multi-platform publishing; assets are saved to the warehouse",
                })}
              </p>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700 flex items-start gap-2">
                <div className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500"></div>
                {t({
                  zh: "每天早上 9:00，整理已授权渠道的公开内容趋势并提取结构",
                  en: "Every day at 9:00 AM, summarize public content trends from authorized channels and extract structure",
                })}
              </div>
            </div>

            {/* Supported Channels */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Share2 className="text-blue-500" size={18} />
                {t({ zh: "覆盖渠道矩阵", en: "Channel coverage matrix" })}
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100">{t({ zh: "小红书", en: "RED" })}</span>
                <span className="px-3 py-1.5 bg-slate-900 text-slate-100 text-xs font-medium rounded-full">{t({ zh: "视频号", en: "Channels" })}</span>
                <span className="px-3 py-1.5 bg-gray-100 text-gray-800 text-xs font-medium rounded-full border border-gray-200">{t({ zh: "抖音", en: "Douyin" })}</span>
                <span className="px-3 py-1.5 bg-purple-600 text-purple-50 text-xs font-medium rounded-full">{t({ zh: "公众号", en: "Official accounts" })}</span>
                <span className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-200">{t({ zh: "问答社区", en: "Q&A communities" })}</span>
                <span className="px-3 py-1.5 bg-blue-50 text-blue-500 text-xs font-medium rounded-full border border-blue-100">{t({ zh: "知乎", en: "Zhihu" })}</span>
                <span className="px-3 py-1.5 bg-slate-900 text-slate-100 text-xs font-medium rounded-full">{t({ zh: "企业自有渠道", en: "Owned channels" })}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
