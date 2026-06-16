import { motion } from "motion/react";
import { HeadphonesIcon, MessageSquare, Database, Users, ShieldAlert, FileText, Settings, Webhook, Smartphone, MessageCircle, Code2, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { PartnerBrandMark } from "../../components/PartnerBrandMark";
import { useSitePreferences } from "../sitePreferences";

export function CustomerService() {
  const { t, tKey } = useSitePreferences();

  const workflowSteps = [
    { icon: FileText, label: t({ zh: "资料上传", en: "Upload materials" }), color: "text-gray-600" },
    { icon: Database, label: t({ zh: "语料生成与启停", en: "Corpus generation and toggles" }), color: "text-amber-500" },
    { icon: MessageSquare, label: t({ zh: "AI 建议答复", en: "AI suggested replies" }), color: "text-rose-500" },
    { icon: Users, label: t({ zh: "人工接管", en: "Human takeover" }), color: "text-violet-500" },
  ];

  const channels = [
    { icon: Webhook, color: "text-blue-500", label: "Web / App SDK" },
    { icon: Code2, color: "text-indigo-500", label: "REST API" },
    { icon: MessageCircle, color: "text-green-500", label: t({ zh: "在线消息", en: "Live messaging" }) },
    { icon: Smartphone, color: "text-sky-400", label: t({ zh: "客户社群", en: "Customer communities" }) },
    { icon: MessageSquare, color: "text-blue-600", label: t({ zh: "企业微信", en: "WeCom" }), brand: "wecom" as const },
  ];

  return (
    <div className="pt-24 pb-20 min-h-screen relative overflow-hidden">
      {/* Background showing Connection and Flow */}
      <div className="fixed inset-0 z-[-1] flex items-center justify-center pointer-events-none opacity-60">
        <svg viewBox="0 0 100 50" className="w-[130vw] min-w-[800px] h-auto blur-[110px] transform">
          <motion.path
            d="M 10 30 C 30 10, 70 50, 90 20"
            fill="none"
            stroke="url(#csGrad)"
            strokeWidth="40"
            strokeLinecap="round"
            initial={{ pathLength: 0.8, opacity: 0.5 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="csGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />    {/* Amber */}
              <stop offset="50%" stopColor="#ec4899" />   {/* Pink/Rose */}
              <stop offset="100%" stopColor="#8b5cf6" />  {/* Violet */}
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/40 backdrop-blur-md border border-white/60 text-rose-600 text-sm font-bold mb-6 shadow-sm"
          >
            <HeadphonesIcon size={16} />
            <span>{tKey("marketing.customerService.badge")}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {tKey("marketing.customerService.hero.titleLine1")}<br/>
            <span className="text-rose-600">{tKey("marketing.customerService.hero.highlight")}</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-700 mb-8 leading-relaxed max-w-3xl mx-auto bg-white/30 backdrop-blur-md py-4 px-6 rounded-2xl border border-white/50 shadow-sm inline-block"
          >
            {t({
              zh: "xiaoone 将网站访客、Web SDK、外部渠道、客服语料库和人工接管统一到客户咨询工作台，未接管时可结合语料库生成建议回复，接管后 AI 只作为建议工具",
              en: "xiaoone unifies website visitors, Web SDK, external channels, support corpus, and human takeover in one inbox. Before takeover, corpus-backed suggested replies are available; after takeover, AI remains an assistant only",
            })}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-4 mt-4"
          >
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-violet-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <HeadphonesIcon size={18} />
                {tKey("marketing.customerService.cta.create")}
              </motion.button>
            </Link>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-white/60 backdrop-blur-md text-gray-800 border border-white rounded-xl font-medium shadow-sm hover:bg-white transition-colors flex items-center justify-center"
            >
              {t({ zh: "查看 SDK 接入", en: "View SDK integration" })}
            </motion.button>
          </motion.div>
        </div>

        {/* Workflow Diagram */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col md:flex-row justify-center items-center gap-4 mb-16 text-sm font-bold relative"
        >
          {workflowSteps.map((step, i, arr) => (
            <div key={i} className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.1, y: -5 }}
                className="bg-white/60 backdrop-blur-md px-5 py-3.5 rounded-xl border border-white/80 shadow-md flex items-center gap-2 z-10 relative"
              >
                <step.icon size={18} className={step.color} />
                <span className="text-gray-800">{step.label}</span>
              </motion.div>
              {i < arr.length - 1 && (
                <div className="hidden md:flex items-center text-white/60">
                  <motion.div 
                    animate={{ x: [0, 10, 0] }} 
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <ArrowRight size={20} className="text-violet-400" />
                  </motion.div>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* 3-Column Glass Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="bg-white/40 backdrop-blur-2xl rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden mb-24 flex flex-col md:flex-row h-[600px] relative"
        >
          {/* Subtle inner glow for the glass panel */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

          {/* Left Column: Session List */}
          <div className="w-full md:w-1/4 border-r border-white/50 flex flex-col bg-white/20 hidden md:flex backdrop-blur-sm z-10">
            <div className="p-4 border-b border-white/40 flex justify-between items-center bg-white/30 backdrop-blur-md">
              <h3 className="font-bold text-gray-800">{t({ zh: "客户咨询", en: "Customer conversations" })}</h3>
              <div className="p-1.5 bg-white/50 rounded-lg text-gray-600 hover:bg-white transition-colors cursor-pointer"><Settings size={16} /></div>
            </div>
            
            <div className="flex px-2 pt-2 gap-1 border-b border-white/40 bg-white/10">
              <div className="px-3 py-2 text-xs font-bold text-rose-600 border-b-2 border-rose-500">{t({ zh: "等待中 (2)", en: "Waiting (2)" })}</div>
              <div className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 cursor-pointer">{t({ zh: "进行中", en: "In progress" })}</div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-white/30 hover:bg-white/40 cursor-pointer transition-colors border-l-2 border-transparent bg-white/20">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold text-gray-900">{t({ zh: "访客 #8921", en: "Visitor #8921" })}</span>
                  <span className="text-xs text-gray-500">10:42</span>
                </div>
                <p className="text-xs text-gray-600 truncate">{t({ zh: "这款产品支持异地发货吗？", en: "Does this product support intercity shipping?" })}</p>
                <div className="mt-2 flex gap-1">
                  <span className="px-1.5 py-0.5 bg-blue-100/50 text-blue-700 rounded text-[10px] font-medium border border-blue-200/50">Web</span>
                  <span className="px-1.5 py-0.5 bg-rose-100/50 text-rose-700 rounded text-[10px] font-medium border border-rose-200/50">{t({ zh: "未读", en: "Unread" })}</span>
                </div>
              </div>
              <div className="p-3 border-b border-white/30 hover:bg-white/40 cursor-pointer transition-colors border-l-2 border-green-500 bg-white/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-green-500/10 to-transparent pointer-events-none" />
                <div className="flex justify-between items-start mb-1 relative z-10">
                  <span className="text-sm font-bold text-gray-900">{t({ zh: "网站访客", en: "Website visitor" })}</span>
                  <span className="text-xs text-gray-500">10:38</span>
                </div>
                <p className="text-xs text-gray-600 truncate relative z-10">I need help with my account.</p>
                <div className="mt-2 flex gap-1 relative z-10">
                  <span className="px-1.5 py-0.5 bg-green-100/80 text-green-700 rounded text-[10px] font-medium border border-green-200/50">{t({ zh: "网站渠道", en: "Website channel" })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column: Chat Area */}
          <div className="w-full md:w-1/2 border-r border-white/50 flex flex-col bg-white/40 backdrop-blur-md z-10">
            <div className="p-4 border-b border-white/50 flex justify-between items-center bg-white/50 shadow-sm z-20 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center border border-green-200">
                  <MessageCircle size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{t({ zh: "网站访客", en: "Website visitor" })}</h3>
                  <p className="text-[10px] text-gray-500 font-medium">{t({ zh: "来源: 网站渠道 • 店铺: 官方商城", en: "Source: Website channel · Store: Official shop" })}</p>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-violet-700 transition-colors"
              >
                {t({ zh: "人工接管", en: "Human takeover" })}
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-transparent">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex justify-center">
                <span className="text-[10px] text-gray-500 font-medium bg-white/50 px-2 py-1 rounded-full border border-white/60">10:38 AM</span>
              </motion.div>
              
              {/* User Message */}
              <motion.div initial={{ opacity: 0, y: 10, x: -20 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ delay: 1 }} className="flex justify-start">
                <div className="bg-white/80 backdrop-blur-sm border border-white rounded-2xl rounded-tl-sm p-3.5 max-w-[80%] text-sm text-gray-800 shadow-sm relative">
                  Hi, I need help with my account. It says it's locked.
                </div>
              </motion.div>
              
              {/* AI Auto Reply */}
              <motion.div initial={{ opacity: 0, y: 10, x: 20 }} animate={{ opacity: 1, y: 0, x: 0 }} transition={{ delay: 2.5 }} className="flex justify-end">
                <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100/50 rounded-2xl rounded-tr-sm p-3.5 max-w-[80%] text-sm text-slate-800 shadow-sm relative overflow-hidden dark:from-rose-50 dark:to-orange-50 dark:text-slate-800">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-rose-400/10 blur-[20px] rounded-full pointer-events-none" />
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-rose-200/50">
                    <Database size={12} className="text-rose-500 animate-pulse" />
                    <span className="text-[10px] text-rose-600 font-bold tracking-wide">{t({ zh: "AI 建议回复 (基于语料库)", en: "AI suggested reply (from corpus)" })}</span>
                  </div>
                  Hello! I'm sorry to hear that. Account locks usually happen after multiple failed login attempts. Would you like me to send a password reset link to your registered email?
                </div>
              </motion.div>
            </div>

            <div className="p-4 border-t border-white/50 bg-white/40 backdrop-blur-md">
              <div className="bg-white/60 border border-white/80 rounded-xl p-2 flex items-center gap-2 shadow-inner">
                <input type="text" placeholder={t({ zh: "当前由 AI 接待，接管后可手动回复", en: "AI is handling this now. Take over to reply manually" })} className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-600 placeholder-gray-400" disabled />
                <button className="p-2 text-violet-500 hover:text-violet-600 bg-violet-50 rounded-lg" disabled><MessageSquare size={18} /></button>
              </div>
            </div>
          </div>

          {/* Right Column: AI Suggestions & Corpus */}
          <div className="w-full md:w-1/4 flex flex-col bg-white/30 backdrop-blur-md hidden md:flex z-10">
             <div className="p-4 border-b border-white/50 bg-white/40">
              <h3 className="font-bold text-gray-800">{t({ zh: "辅助信息", en: "Assisted context" })}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              
              {/* AI Suggestion Card */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 3, duration: 0.5 }}
              >
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-violet-500" /> {t({ zh: "AI 建议回复草稿", en: "AI suggested reply draft" })}
                </h4>
                <div className="bg-white/80 backdrop-blur-sm border border-violet-200/60 rounded-xl p-3 shadow-[0_0_20px_rgba(139,92,246,0.1)] relative overflow-hidden group hover:shadow-[0_0_25px_rgba(139,92,246,0.2)] transition-all duration-300">
                  <motion.div 
                    initial={{ top: "-100%" }} 
                    animate={{ top: "100%" }} 
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    className="absolute left-0 w-1 h-full bg-gradient-to-b from-transparent via-violet-500 to-transparent" 
                  />
                  <p className="text-xs text-gray-700 mb-3 pl-2 leading-relaxed font-medium">If you prefer, I can transfer you to a human agent to unlock it immediately. Please confirm your email address.</p>
                  <div className="flex justify-end gap-2 mt-2 relative z-10 border-t border-gray-100 pt-2">
                    <button className="px-3 py-1.5 text-[10px] font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">{t({ zh: "编辑修改", en: "Edit" })}</button>
                    <button className="px-3 py-1.5 text-[10px] font-bold bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors shadow-sm">{t({ zh: "一键发送", en: "Send" })}</button>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-600 font-medium bg-amber-50/50 p-1.5 rounded-lg border border-amber-100/50">
                  <ShieldAlert size={12} />
                  <span>{t({ zh: "高风险操作：已配置需人工确认后发送", en: "High-risk actions require human confirmation before sending" })}</span>
                </div>
              </motion.div>

              {/* Matched Corpus */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5 }}
              >
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Database size={12} className="text-amber-500" /> {t({ zh: "匹配语料来源", en: "Matched corpus sources" })}
                </h4>
                <div className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl p-3 shadow-sm hover:bg-white/80 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-800">{t({ zh: "账号锁定处理流程", en: "Account lock handling workflow" })}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title={t({ zh: "已启用", en: "Enabled" })}></span>
                  </div>
                  <p className="text-[10px] text-gray-600 line-clamp-3 leading-relaxed">{t({
                    zh: "来源: 《客服操作手册 v2.pdf》，当用户反馈账号被锁时，首先解释原因，然后提供重置密码或人工解锁选项",
                    en: "Source: Support handbook v2.pdf. When an account is locked, explain the reason first, then offer password reset or human unlock",
                  })}</p>
                  <div className="mt-2 pt-2 border-t border-gray-200/50 text-[10px] text-gray-500 font-medium flex justify-between">
                     <span>{t({ zh: "生效范围: 全局", en: "Scope: global" })}</span>
                     <span className="text-indigo-500">{t({ zh: "查看详情", en: "View details" })}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Multi-channel Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center bg-white/30 backdrop-blur-xl rounded-3xl p-10 border border-white/50 shadow-lg"
        >
           <h3 className="text-2xl font-bold text-gray-900 mb-8">{t({ zh: "全渠道接入，统一工作台", en: "All channels in one workspace" })}</h3>
           <div className="flex flex-wrap justify-center gap-4">
             {channels.map((channel, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/70 backdrop-blur-sm border border-white shadow-sm rounded-xl text-sm font-bold text-gray-700 hover:shadow-md transition-all"
                >
                  {"brand" in channel && channel.brand
                    ? <PartnerBrandMark brand={channel.brand} size={16} className="partner-brand-mark--sm" />
                    : <channel.icon size={18} className={channel.color} />}
                  {channel.label}
                </motion.div>
             ))}
           </div>
        </motion.div>

      </div>
    </div>
  );
}
