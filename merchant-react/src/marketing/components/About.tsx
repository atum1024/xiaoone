import { motion } from "motion/react";
import { CheckCircle2, Shield, BrainCircuit, Activity, Link2, MonitorSmartphone, Database } from "lucide-react";
import { Link } from "react-router";
import { useSitePreferences } from "../sitePreferences";

export function About() {
  const { t, tKey } = useSitePreferences();

  const problems = [
    {
      title: t({ zh: "工具极度分散", en: "Tools are fragmented" }),
      desc: t({ zh: "客服用一套系统，营销用一套，渠道对接靠微信群，导致商户的数字化资产无法沉淀", en: "Support, marketing, and channel work live in separate tools, so merchants fail to accumulate digital assets" }),
    },
    {
      title: t({ zh: "客服和业务上下文断裂", en: "Support and business context are disconnected" }),
      desc: t({ zh: "前端接待的客户线索，很难顺畅流转给开发或营销部门，协同效率低下", en: "Customer leads from the front line rarely flow smoothly to development or marketing" }),
    },
    {
      title: t({ zh: "AI 回答脱离业务实际", en: "AI answers can detach from business reality" }),
      desc: t({ zh: "通用 AI 无法结合商户的私有资料库回答问题，极易产生“幻觉”并给出错误承诺", en: "Generic AI cannot reliably answer from a merchant's private materials, causing hallucinations and bad promises" }),
    },
    {
      title: t({ zh: "服务开通缺少清晰流程", en: "Service activation lacks a clear flow" }),
      desc: t({ zh: "找渠道、找代办往往缺乏标准化的门槛判定和合规指引，试错成本高", en: "Channel and agency requests often lack standard gates and compliance guidance" }),
    },
  ];

  const principles = [
    {
      icon: Link2,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      title: t({ zh: "业务边界清楚", en: "Clear business boundaries" }),
      desc: t({ zh: "客服就是客服，开发就是开发，我们提供不同的专门入口，而不是用一个黑盒 AI 搪塞用户", en: "Support is support, development is development. xiaoone uses specialized entries instead of one black-box AI" }),
    },
    {
      icon: BrainCircuit,
      color: "text-blue-600",
      bg: "bg-blue-100",
      title: t({ zh: "AI 是能力底座，不替代业务规则", en: "AI is the capability layer, not a replacement for business rules" }),
      desc: t({ zh: "AI 负责理解意图、提取信息、生成建议草稿，但决定权和发送动作永远遵循严谨的业务规则", en: "AI understands intent, extracts information, and drafts suggestions, but decisions and sending follow business rules" }),
    },
    {
      icon: CheckCircle2,
      color: "text-amber-600",
      bg: "bg-amber-100",
      title: t({ zh: "人工随时可接管", en: "Humans can always take over" }),
      desc: t({ zh: "无论是客服接待还是开发联调，系统设计之初就保证了人工可以无缝介入并覆盖 AI 的行为", en: "Whether in support or development, humans can step in and override AI behavior" }),
    },
    {
      icon: Database,
      color: "text-indigo-600",
      bg: "bg-indigo-100",
      title: t({ zh: "数据流转可追溯", en: "Data flow is traceable" }),
      desc: t({ zh: "从访客的一句话，到语料库的一条记录，再到开发任务板上的一个卡片，链路清晰可查", en: "From a visitor message to a corpus entry to a development task, the path stays traceable" }),
    },
  ];

  const activeStages = [
    t({ zh: "官网展示层", en: "Website layer" }),
    t({ zh: "客服 SDK", en: "Support SDK" }),
    t({ zh: "用户端工作台", en: "User workspace" }),
    t({ zh: "Billing / IAM", en: "Billing / IAM" }),
    t({ zh: "AI 对话与智能创作", en: "AI chat and content studio" }),
  ];

  const plannedStages = [
    t({ zh: "平台治理后台 (持续优化)", en: "Platform governance, ongoing refinement" }),
  ];

  return (
    <div className="pt-24 pb-20 min-h-screen relative overflow-hidden flex flex-col items-center">
      <div className="fixed inset-0 z-[-1] flex items-center justify-center pointer-events-none opacity-70">
        <svg viewBox="0 0 100 50" className="w-[140vw] min-w-[800px] h-auto blur-[120px] transform">
          <motion.path
            d="M 10 25 C 20 10, 40 10, 50 25 C 60 40, 80 40, 90 25 C 80 10, 60 10, 50 25 C 40 40, 20 40, 10 25"
            fill="none"
            stroke="url(#aboutGrad)"
            strokeWidth="30"
            strokeLinecap="round"
            initial={{ scale: 0.9, rotate: -5 }}
            animate={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="aboutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="text-center max-w-3xl mx-auto mb-20 relative">
          <motion.div
            className="absolute -inset-10 bg-white/30 blur-[60px] rounded-full z-[-1]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
          />
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {tKey("marketing.about.hero.titleLine1")}<br />
            <span className="text-blue-700">{tKey("marketing.about.hero.titleHighlight")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg text-gray-700 leading-relaxed font-medium bg-white/40 backdrop-blur-md py-4 px-6 rounded-2xl border border-white/60 shadow-sm inline-block"
          >
            {t({
              zh: "xiaoone 是一支带业务上下文的 AI 团队与客服闭环，覆盖咨询接入、图文视频文案创作、软件开发、企业服务与渠道商务协作，而不是把所有问题都包装成一个聊天窗口",
              en: "xiaoone is an AI team with business context plus a connected support loop, covering inquiries, image/video/copy creation, development, business services, and channel collaboration—not one generic chat window",
            })}
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <Activity className="text-rose-500" /> {tKey("marketing.about.problems.title")}
            </h2>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
              }}
              className="space-y-6"
            >
              {problems.map((item) => (
                <motion.div
                  key={item.title}
                  variants={{ hidden: { opacity: 0, x: -20, scale: 0.95 }, visible: { opacity: 1, x: 0, scale: 1 } }}
                  className="bg-white/40 backdrop-blur-xl p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 hover:bg-white/60 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-400 to-rose-600 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300" />
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <Shield className="text-emerald-500" /> {tKey("marketing.about.principles.title")}
            </h2>
            <div className="space-y-6 relative">
              <div className="absolute left-6 top-10 bottom-10 w-px bg-gradient-to-b from-emerald-200 via-blue-200 to-indigo-200 z-0" />
              {principles.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex gap-5 relative z-10 p-4 rounded-2xl hover:bg-white/30 transition-colors"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center flex-shrink-0 ${item.color} shadow-sm border border-white/50 backdrop-blur-sm`}
                  >
                    <item.icon size={24} />
                  </motion.div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-white/40 backdrop-blur-2xl rounded-3xl p-10 shadow-[0_20px_40px_rgb(0,0,0,0.05)] border border-white/60 mb-16 relative overflow-hidden"
        >
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-300/30 blur-[40px] rounded-full z-[-1]" />
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center flex justify-center items-center gap-3">
            <MonitorSmartphone className="text-indigo-600" /> {tKey("marketing.about.stage.title")}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {activeStages.map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="px-5 py-2.5 bg-indigo-50/80 backdrop-blur-sm text-indigo-700 font-medium rounded-xl text-sm border border-indigo-200/50 shadow-sm"
              >
                {tag}
              </motion.span>
            ))}
            {plannedStages.map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="px-5 py-2.5 bg-gray-100/50 backdrop-blur-sm text-gray-500 font-medium rounded-xl text-sm border border-gray-200/50 shadow-sm"
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center pb-10"
        >
          <p className="text-gray-700 font-medium mb-8">{tKey("marketing.about.contact.lead")}</p>
          <div className="flex flex-wrap justify-center gap-5">
            <Link to="/contact">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-shadow"
              >
                {tKey("marketing.about.contact.business")}
              </motion.div>
            </Link>
            <Link to="/contact">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-white/60 backdrop-blur-md text-gray-800 border border-white shadow-sm rounded-xl text-sm font-medium hover:bg-white transition-colors dark:bg-slate-900/70 dark:text-slate-100 dark:border-white/10 dark:hover:bg-slate-800"
              >
                {tKey("marketing.about.contact.technical")}
              </motion.div>
            </Link>
            <Link to="/channel-business">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-white/60 backdrop-blur-md text-gray-800 border border-white shadow-sm rounded-xl text-sm font-medium hover:bg-white transition-colors inline-block"
              >
                {tKey("marketing.about.contact.channel")}
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
