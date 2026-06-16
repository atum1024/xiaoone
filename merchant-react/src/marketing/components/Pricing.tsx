import { motion } from "motion/react";
import { ArrowRight, HelpCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useSitePreferences } from "../sitePreferences";
import { PlanFeatureList } from "../lib/planFeatures";
import {
  billingCurrencyForRegion,
  formatPlanPrice,
  planDisplayPrice,
  planListPrice,
  type BillingCurrency,
} from "../../lib/planPricing";
import { useRegion, withLocalIpRegionHeaders } from "@xiaoone/region";

type TermMonths = 1 | 3 | 6 | 12;

type PlanRow = {
  code: "personal" | "startup" | "business" | string;
  name: string;
  description: string;
  list_price_cny: string;
  display_price_cny: string;
  price_cny: string;
  list_price_usd?: string;
  display_price_usd?: string;
  price_usd?: string;
  included_points_usd?: number;
  included_points?: number;
  sort?: number;
  term_discounts?: Array<{ term_months: number; discount_percent: string; is_active?: boolean }>;
  entitlements?: Record<string, any>;
};

const TERMS: Array<{ months: TermMonths; zh: string; en: string }> = [
  { months: 1, zh: "1 个月", en: "1 month" },
  { months: 3, zh: "3 个月", en: "3 months" },
  { months: 6, zh: "6 个月", en: "6 months" },
  { months: 12, zh: "12 个月", en: "12 months" },
];

const FALLBACK_PLANS: PlanRow[] = [
  {
    code: "personal",
    name: "娱乐版",
    description: "适合娱乐体验与轻量业务验证。",
    list_price_cny: "598",
    display_price_cny: "298",
    price_cny: "298",
    list_price_usd: "98",
    display_price_usd: "49",
    price_usd: "49",
    included_points: 20000,
    sort: 0,
    entitlements: {
      monthly_traffic_gb: 10,
      stores_max: 1,
      team_seats_max: 0,
      features: {
        social_posting: true,
        network_acceleration: false,
        us_phone_number: false,
        payment_card: false,
        data_reports: true,
      },
      included_addons: {},
    },
  },
  {
    code: "startup",
    name: "创业版",
    description: "适合小团队起步，含基础客服与协同能力。",
    list_price_cny: "1288",
    display_price_cny: "688",
    price_cny: "688",
    list_price_usd: "198",
    display_price_usd: "99",
    price_usd: "99",
    included_points: 80000,
    sort: 10,
    entitlements: {
      monthly_traffic_gb: 30,
      stores_max: 2,
      team_seats_max: 2,
      features: {
        kefu: true,
        cross_border_ecommerce: false,
        network_acceleration: false,
        us_phone_number: false,
        payment_card: false,
        social_posting: true,
      },
      included_addons: {},
    },
  },
  {
    code: "business",
    name: "商户版",
    description: "适合规模化商户，含团队协同、店铺管理与开放接口能力。",
    list_price_cny: "2588",
    display_price_cny: "1288",
    price_cny: "1288",
    list_price_usd: "398",
    display_price_usd: "199",
    price_usd: "199",
    included_points: 200000,
    sort: 20,
    entitlements: {
      monthly_traffic_gb: 100,
      stores_max: 5,
      team_seats_max: 10,
      us_native_ip_server: 0,
      features: {
        kefu: true,
        cross_border_ecommerce: false,
        network_acceleration: false,
        us_phone_number: false,
        payment_card: false,
        social_posting: true,
      },
      included_addons: {},
    },
  },
];

function numberValue(value: unknown, fallback = 0): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function discountFor(plan: PlanRow, term: TermMonths): number {
  const matched = (plan.term_discounts || []).find(
    item => Number(item.term_months) === term && item.is_active !== false,
  );
  if (!matched)
    return ({ 1: 1, 3: 0.95, 6: 0.9, 12: 0.8 } as const)[term];
  return numberValue(matched.discount_percent, 1);
}

function localizedPlan(plan: PlanRow, locale: "zh" | "en") {
  const copy = {
    personal: {
      zhName: "娱乐版",
      enName: "Lite",
      zhDesc: "适合娱乐体验与轻量业务验证。",
      enDesc: "For entertainment, lightweight validation, and early operations.",
      zhCta: "选择娱乐版",
      enCta: "Choose Lite",
    },
    startup: {
      zhName: "创业版",
      enName: "Pro",
      zhDesc: "适合小团队起步，含基础客服与协同能力。",
      enDesc: "For small teams starting with support and collaboration.",
      zhCta: "选择创业版",
      enCta: "Choose Pro",
    },
    business: {
      zhName: "商户版",
      enName: "Ultra",
      zhDesc: "适合规模化商户，含团队协同、店铺管理与开放接口能力。",
      enDesc: "For scaling merchants with team seats, store management, and open APIs.",
      zhCta: "选择商户版",
      enCta: "Choose Ultra",
    },
  } as const;
  const item = copy[plan.code as keyof typeof copy];
  if (!item) {
    return {
      name: plan.name,
      description: plan.description,
      cta: locale === "zh" ? "注册并开通" : "Register & Activate",
    };
  }
  return {
    name: locale === "zh" ? item.zhName : item.enName,
    description: locale === "zh" ? item.zhDesc : item.enDesc,
    cta: locale === "zh" ? item.zhCta : item.enCta,
  };
}

export function Pricing() {
  const { locale, t } = useSitePreferences();
  const { region, ipRegion, localIpRegionOverride } = useRegion();
  const pricingRegion = localIpRegionOverride ?? ipRegion ?? region;
  const billingCurrency: BillingCurrency = billingCurrencyForRegion(pricingRegion);
  const showCrossBorderCopy = pricingRegion === "overseas";
  const [term, setTerm] = useState<TermMonths>(1);
  const [plans, setPlans] = useState<PlanRow[]>(FALLBACK_PLANS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/billing/public/plans/", withLocalIpRegionHeaders())
      .then(res => res.ok ? res.json() : Promise.reject(new Error("plans_failed")))
      .then((payload) => {
        if (cancelled) return;
        const data = payload?.data ?? payload;
        const items = Array.isArray(data?.items) ? data.items : [];
        const next = items.filter((item: PlanRow) => ["personal", "startup", "business"].includes(item.code));
        if (next.length)
          setPlans(next);
      })
      .catch(() => {
        if (!cancelled)
          setPlans(FALLBACK_PLANS);
      });
    return () => {
      cancelled = true;
    };
  }, [pricingRegion]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => numberValue(a.sort, 0) - numberValue(b.sort, 0)),
    [plans],
  );

  return (
    <div className="pt-24 pb-24 min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 z-[-1] flex items-center justify-center pointer-events-none opacity-60">
        <svg viewBox="0 0 100 50" className="w-[120vw] min-w-[800px] h-auto blur-[100px] transform">
          <motion.path
            d="M 20 20 Q 50 10 80 20 T 80 40 Q 50 50 20 40 T 20 20"
            fill="url(#pricingGrad)"
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1.1, y: -10 }}
            transition={{ duration: 15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="pricingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight"
          >
            {t({ zh: "简单、清晰、无负担的", en: "Simple, clear, low-friction" })}<br />
            <span className="text-teal-700">{t({ zh: "透明定价方案", en: "transparent pricing" })}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-700 bg-white/40 backdrop-blur-md py-3 px-6 rounded-2xl border border-white/60 shadow-sm inline-block"
          >
            {t({
              zh: "三档会员按月计费，长周期开通自动享受时长折扣，注册后即可在账户中心完成付款。",
              en: "Three monthly plans with automatic term discounts. Complete payment from the account center after registration.",
            })}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-14 flex flex-wrap justify-center gap-3"
        >
          {TERMS.map(item => (
            <button
              key={item.months}
              type="button"
              onClick={() => setTerm(item.months)}
              className={`rounded-full border px-5 py-2 text-sm font-bold shadow-sm transition-all ${
                term === item.months
                  ? "border-teal-500 bg-teal-500 text-white shadow-teal-500/25"
                  : "border-white/70 bg-white/55 text-gray-700 backdrop-blur-xl hover:border-teal-300 hover:bg-white/80"
              }`}
            >
              {locale === "zh" ? item.zh : item.en}
            </button>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
          }}
          className="grid md:grid-cols-3 gap-8 mb-20"
        >
          {sortedPlans.map((plan, i) => {
            const copy = localizedPlan(plan, locale);
            const listPrice = planListPrice(plan, billingCurrency);
            const displayPrice = planDisplayPrice(plan, billingCurrency);
            const finalPrice = Math.ceil(displayPrice * discountFor(plan, term) * term * 100) / 100;
            const monthlyEquivalent = finalPrice / term;
            const popular = plan.code === "startup";
            const registerTo = `/register?plan_code=${encodeURIComponent(plan.code)}&term=${encodeURIComponent(String(term))}`;

            return (
              <motion.div
                key={plan.code}
                variants={{ hidden: { opacity: 0, y: 40, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 } }}
                whileHover={{ y: -12, scale: 1.02 }}
                className={`bg-white/50 backdrop-blur-xl rounded-3xl p-6 2xl:p-8 relative flex flex-col transition-all duration-300 border shadow-lg ${
                  popular
                    ? "border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/20"
                    : "border-white/60 shadow-black/5 hover:border-teal-300/50"
                }`}
              >
                {popular && (
                  <>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-b from-emerald-400/10 to-transparent rounded-3xl z-[-1]"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-1.5 rounded-full text-xs font-bold tracking-wider shadow-md flex items-center gap-1 whitespace-nowrap">
                      <Sparkles size={12} /> {t({ zh: "创业版", en: "Pro" })}
                    </div>
                  </>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{copy.name}</h3>
                  <p className="text-sm text-gray-600 min-h-10">{copy.description}</p>
                </div>

                <div className="mb-8 pb-8 border-b border-gray-200/50 relative">
                  <div className="text-sm text-gray-500 line-through mb-1">{formatPlanPrice(listPrice, billingCurrency)}{t({ zh: "/月", en: "/mo" })}</div>
                  <div className="flex items-end gap-2 min-w-0">
                    <motion.span
                      key={`${plan.code}-${term}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
                      className="whitespace-nowrap text-[2.35rem] sm:text-[2.5rem] font-extrabold tracking-normal leading-none text-orange-500 dark:text-orange-300"
                    >
                      {formatPlanPrice(monthlyEquivalent, billingCurrency)}
                    </motion.span>
                    <span className="shrink-0 text-sm text-gray-500 mb-1">{t({ zh: "/月", en: "/mo" })}</span>
                    <span className="mb-1 shrink-0 whitespace-nowrap rounded-full bg-orange-100 px-2 py-1 text-[11px] font-bold leading-none text-orange-700 ring-1 ring-orange-200/80">
                      {t({ zh: "特别优惠", en: "Special offer" })}
                    </span>
                  </div>
                  <div className="mt-3 rounded-2xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-800">
                    {t({
                      zh: `${term} 个月应付 ${formatPlanPrice(finalPrice, billingCurrency)}，折合 ${formatPlanPrice(monthlyEquivalent, billingCurrency)}/月`,
                      en: `${term} months total ${formatPlanPrice(finalPrice, billingCurrency)}, about ${formatPlanPrice(monthlyEquivalent, billingCurrency)}/mo`,
                    })}
                  </div>
                </div>

                <div className="flex-1">
                  <PlanFeatureList
                    plan={plan}
                    region={showCrossBorderCopy ? 'overseas' : 'mainland'}
                    locale={locale}
                    showRegionRestricted={showCrossBorderCopy}
                  />
                </div>

                <div className="mt-5">
                  <Link to={registerTo} className="w-full relative group">
                    <div className={`absolute inset-0 rounded-xl blur transition-opacity opacity-0 group-hover:opacity-100 ${
                      popular ? "bg-emerald-400/50" : "bg-teal-400/30"
                    }`} />
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      className={`w-full py-3.5 px-4 rounded-xl text-center text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 relative ${
                        popular
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-transparent"
                          : "bg-white/80 border border-teal-200/50 text-gray-800 hover:bg-white"
                      }`}
                    >
                      {t({ zh: "立即开通", en: "Activate now" })}
                      <ArrowRight size={16} />
                    </motion.div>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto bg-white/40 backdrop-blur-2xl rounded-3xl p-10 border border-white/60 shadow-lg relative overflow-hidden"
        >
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-teal-300/20 blur-[50px] rounded-full z-[-1]" />
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center flex items-center justify-center gap-3">
            <HelpCircle className="text-teal-600" /> {t({ zh: "常见问题解答", en: "FAQ" })}
          </h2>

          <div className="grid md:grid-cols-2 gap-10">
            {[
              {
                q: t({ zh: "官网点立即开通后去哪？", en: "Where does activation start?" }),
                a: t({ zh: "会跳转到用户端注册页，注册页会展示已选套餐；注册完成后进入账户中心付款。", en: "You will go to the user registration page with the selected plan shown, then pay from the account center." }),
              },
              {
                q: t({ zh: "时长折扣怎么计算？", en: "How are term discounts calculated?" }),
                a: t({ zh: "按当前月价和所选时长自动计算，最终以付款页报价为准。", en: "The selected term is calculated from the current monthly price, with the checkout quote as the final amount." }),
              },
              {
                q: t({ zh: "娱乐版为什么不能创建店铺或邀请团队？", en: "Why does Lite not include stores or team seats?" }),
                a: t({ zh: "娱乐版用于轻量体验和业务验证，店铺与团队协同从创业版开始开放；用户端会提示升级。", en: "Lite is for lightweight experiences and validation. Stores and team collaboration start from Pro, with upgrade prompts in the app." }),
              },
              {
                q: t({ zh: "支付方式有哪些？", en: "Which payment methods are available?" }),
                a: t(showCrossBorderCopy
                  ? { zh: "付款页支持支付宝、Cardixon 和折扣码，实际可用渠道以地区和平台配置为准。", en: "The payment dialog supports Alipay, Cardixon, and discount codes, subject to region and platform configuration." }
                  : { zh: "付款页支持支付宝和折扣码，实际可用渠道以地区和平台配置为准。", en: "The payment dialog supports Alipay and discount codes, subject to region and platform configuration." }),
              },
            ].map((faq, i) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/30 rounded-2xl p-5 border border-white/40 hover:bg-white/50 transition-colors"
              >
                <h4 className="font-bold text-gray-900 mb-2">{faq.q}</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
