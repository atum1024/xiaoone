import { motion } from "motion/react";
import { Building2, Network, Globe, Briefcase, FileText, CheckCircle2, AlertCircle, CreditCard, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { useSitePreferences } from "../sitePreferences";

export function ChannelBusiness() {
  const { t, tKey } = useSitePreferences();
  const channelItems = [
    {
      icon: Network,
      title: t({ zh: "渠道资源范围咨询", en: "Channel resource scope consultation" }),
      desc: t({ zh: "按地区、用途和合规要求确认可咨询的渠道资源范围", en: "Confirm available channel resources by region, use case, and compliance requirements" }),
    },
    {
      icon: Globe,
      title: t({ zh: "业务访问与协作支持咨询", en: "Business access and collaboration support consultation" }),
      desc: t({ zh: "面向业务访问、协作和内容发布链路的资源咨询，具体以已开通能力为准", en: "Resource consultation for business access, collaboration, and content publishing workflows, subject to enabled capabilities" }),
    },
    {
      icon: Briefcase,
      title: t({ zh: "内容推广资源咨询", en: "Content promotion resource consultation" }),
      desc: t({ zh: "围绕内容发布、账户资料、流程材料和资源对接做前置咨询，具体开通结果以合同、资质和平台确认为准", en: "Consult on content publishing, account materials, workflow documents, and resource coordination, with activation subject to contracts, qualifications, and platform confirmation" }),
    },
  ];

  return (
    <div className="pt-24 pb-20 min-h-screen relative overflow-hidden bg-transparent">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-[-1] bg-slate-50 flex items-center justify-center pointer-events-none opacity-60">
        <svg viewBox="0 0 100 50" className="w-[120vw] min-w-[800px] h-auto blur-[100px] transform">
          <motion.path
            d="M 10 40 C 40 10, 60 50, 90 10"
            fill="none"
            stroke="url(#channelGrad)"
            strokeWidth="30"
            strokeLinecap="round"
            animate={{ pathLength: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="channelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#eab308" />
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
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-sm font-medium mb-6"
          >
            <Building2 size={16} />
            <span>{tKey("marketing.header.nav.businessServices")}</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {t({ zh: "企业服务咨询", en: "Enterprise service consultation" })}<br/>{t({ zh: "先确认范围再提交", en: "Confirm scope before submitting" })}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mb-8 max-w-3xl rounded-2xl border border-white/60 bg-white/45 px-6 py-4 text-lg leading-relaxed text-gray-600 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200"
          >
            {t({
              zh: "企业服务入口用于咨询、资料确认和服务提交，涵盖资源对接与商务材料协助；涉及第三方服务、资质、税务、报关、金融或合同事项时，需以人工确认和合作机构资质为准",
              en: "The business services entry handles consultation, materials, and requests, subject to partner qualifications for tax, customs, finance, and contracts",
            })}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link to="/contact" className="px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-sm flex items-center justify-center gap-2">
              <Network size={18} />
              {t({ zh: "咨询企业服务", en: "Consult business services" })}
            </Link>
            <Link to="/contact" className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2">
              <Briefcase size={18} />
              {t({ zh: "提交材料协助", en: "Submit document assistance" })}
            </Link>
          </motion.div>
        </div>

        {/* Services Split */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          
          {/* Channel Specialist */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-slate-900">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-400/10 dark:text-blue-200">
                <Network size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t({ zh: "资源与推广咨询", en: "Resource and promotion consultation" })}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-300">
                  {t({ zh: "渠道资源与营销服务咨询", en: "Channel resource and marketing service consultation" })}
                </p>
              </div>
            </div>
            
            <div className="p-6">
              <ul className="space-y-4 mb-8">
                {channelItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.li key={item.title} whileHover={{ x: 5 }} className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-blue-50/50 transition-colors">
                      <Icon className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
                      <div>
                        <span className="font-medium text-gray-900 block">{item.title}</span>
                        <span className="text-sm text-gray-500">{item.desc}</span>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </motion.div>

          {/* Business Manager */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gradient-to-r from-purple-50 to-white dark:from-slate-800 dark:to-slate-900">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg dark:bg-purple-400/10 dark:text-purple-200">
                <Briefcase size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t({ zh: "企业服务办理", en: "Enterprise service processing" })}</h2>
                <p className="text-sm text-gray-500 dark:text-slate-300">{t({ zh: "企业服务咨询与材料协助", en: "Enterprise service consultation and document assistance" })}</p>
              </div>
            </div>
            
            <div className="p-6">
              <ul className="space-y-4 mb-8">
                <motion.li whileHover={{ x: 5 }} className="flex items-start gap-3 bg-purple-50/50 p-2 -mx-2 rounded-lg hover:bg-purple-100/50 transition-colors border border-purple-100/50">
                  <FileText className="text-purple-600 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <span className="font-medium text-purple-950 flex items-center gap-2">{t({ zh: "物流、报关与税务流程咨询", en: "Logistics, customs, and tax process consultation" })} <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded animate-pulse">{t({ zh: "重点咨询", en: "Priority" })}</span></span>
                    <span className="text-sm text-purple-900/75">{t({ zh: "协助梳理材料、流程和第三方服务边界，具体办理以合作机构资质和合同为准", en: "Help clarify materials, workflows, and third-party service boundaries, with execution subject to partner qualifications and contracts" })}</span>
                  </div>
                </motion.li>
                <motion.li whileHover={{ x: 5 }} className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-purple-50/50 transition-colors">
                  <Building2 className="text-purple-500 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <span className="font-medium text-gray-900 block">{t({ zh: "企业服务咨询", en: "Enterprise service consultation" })}</span>
                    <span className="text-sm text-gray-500">{t({ zh: "协助梳理主体设立、资料准备和合作机构对接流程", en: "Help clarify entity setup, material preparation, and partner handoff workflows" })}</span>
                  </div>
                </motion.li>
                <motion.li whileHover={{ x: 5 }} className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-purple-50/50 transition-colors">
                  <CheckCircle2 className="text-purple-500 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <span className="font-medium text-gray-900 block">{t({ zh: "资质申请咨询与材料协助", en: "Qualification consultation and material assistance" })}</span>
                    <span className="text-sm text-gray-500">{t({ zh: "按行业、地区和业务类型确认材料要求，不承诺办理结果", en: "Confirm material requirements by industry, region, and business type without guaranteeing outcomes" })}</span>
                  </div>
                </motion.li>
                <motion.li whileHover={{ x: 5 }} className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-purple-50/50 transition-colors">
                  <CreditCard className="text-purple-500 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <span className="font-medium text-gray-900 block">
                      {t({ zh: "对账与税务流程咨询", en: "Reconciliation and tax process consultation" })}
                    </span>
                    <span className="text-sm text-gray-500">
                      {t({ zh: "仅提供流程咨询和材料协助，金融与税务事项需人工确认", en: "Process consultation and document assistance only; finance and tax matters require human confirmation" })}
                    </span>
                  </div>
                </motion.li>
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Process Flow */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-8 text-center">{t({ zh: "规范化开通服务流程", en: "Standard service activation flow" })}</h3>
          
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 md:gap-0 relative">
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gray-100 -z-10"></div>
            
            <div className="flex flex-col items-center z-10 bg-white px-2 dark:bg-slate-900">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold mb-3 border-2 border-white shadow-sm">1</div>
              <span className="text-sm font-medium text-gray-800">{t({ zh: "描述需求", en: "Describe requirement" })}</span>
            </div>
            
            <ChevronRight className="md:hidden text-gray-300 mx-auto" />
            
            <div className="flex flex-col items-center z-10 bg-white px-2 dark:bg-slate-900">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold mb-3 border-2 border-white shadow-sm">2</div>
              <span className="text-sm font-medium text-gray-800">{t({ zh: "确认业务范围", en: "Confirm scope" })}</span>
            </div>
            
            <ChevronRight className="md:hidden text-gray-300 mx-auto" />
            
            <div className="flex flex-col items-center z-10 bg-white px-2 relative group dark:bg-slate-900">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold mb-3 border-2 border-white shadow-sm cursor-help">3</div>
              <span className="text-sm font-medium text-gray-800">{t({ zh: "提交业务材料", en: "Submit materials" })}</span>
              <div className="absolute top-full mt-2 w-48 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center">
                {t({ zh: "上传相关的营业执照或授权文件", en: "Upload business license or authorization documents" })}
              </div>
            </div>
            
            <ChevronRight className="md:hidden text-gray-300 mx-auto" />
            
            <div className="flex flex-col items-center z-10 bg-white px-2 dark:bg-slate-900">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold mb-3 border-2 border-white shadow-sm">4</div>
              <span className="text-sm font-medium text-gray-800">{t({ zh: "提交运营服务", en: "Submit service request" })}</span>
            </div>
          </div>
          
          <div className="mt-10 p-4 bg-gray-50 border border-gray-100 rounded-xl text-center text-sm text-gray-500">
            <p><strong>{t({ zh: "合规提示：", en: "Compliance note:" })}</strong>{t({ zh: "本页仅展示咨询与服务提交流程，不直接连接第三方供应商，最终办理细节以合作机构资质、订单、合同或平台确认信息为准", en: "This page only shows the consultation and request flow. Final details depend on partner qualifications, orders, contracts, or platform confirmation" })}</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
