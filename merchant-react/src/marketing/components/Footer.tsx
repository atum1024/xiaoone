import { DeployEnvBadge } from "@xiaoone/react-ui";
import { Link } from "react-router";
import { logoAssetsForTheme } from "../brandAssets";
import { useSitePreferences } from "../sitePreferences";

export function Footer() {
  const { theme, locale, t, tKey } = useSitePreferences();
  const brand = logoAssetsForTheme(theme);
  const textSlogan = tKey("marketing.home.sloganText");

  /**
   * 「工作台总览」走用户端工作站；其余仍是站内 Link，external 为 true 的项使用
   * <a href> 直接外跳，避免被 React Router 视为内部路径，
   */
  const productLinks = [
    { to: "/register", external: false, key: "marketing.footer.workspace" },
    { to: "/customer-service", external: false, key: "marketing.header.nav.customerService" },
    { to: "/consultant", external: false, key: "marketing.header.nav.consultant" },
    { to: "/pricing", external: false, key: "marketing.footer.pricing" },
  ];

  const developerLinks: Array<{ to: string; key?: string; label?: string }> = [
    { to: "/developers/docs", key: "marketing.footer.docs" },
    { to: "/developers/sdk", label: "Web/App SDK" },
    { to: "/developers/api", label: "REST API" },
    { to: "/contact", key: "marketing.footer.integration" },
  ];

  const resourceLinks = [
    { to: "/about", key: "marketing.footer.about" },
    { to: "/contact", key: "marketing.footer.contact" },
    { to: "/privacy", key: "marketing.footer.privacy" },
    { to: "/terms", key: "marketing.footer.terms" },
    { to: "/refund-policy", key: "marketing.footer.refund" },
    { to: "/compliance", key: "marketing.footer.compliance" },
  ];

  return (
    <footer className="bg-gray-100 dark:bg-slate-950 text-gray-600 dark:text-slate-300 pt-16 pb-8 border-t border-gray-200 dark:border-white/10 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="md:col-span-12 lg:col-span-4 space-y-6">
            <Link to="/" className="inline-block">
              <img 
                src={brand.horizontal} 
                alt="xiaoone logo" 
                className="h-8 w-auto object-contain"
              />
            </Link>
            <div className="pt-2">
              {locale === "en" ? (
                <p
                  className="text-sm font-medium tracking-wide text-gray-500 dark:text-slate-400 opacity-80"
                  aria-label={textSlogan}
                >
                  {textSlogan}
                </p>
              ) : (
                <img
                  src={brand.slogan}
                  alt={textSlogan}
                  className="h-4 w-auto object-contain opacity-80"
                />
              )}
            </div>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-4 leading-relaxed max-w-sm">
              {t({
                zh: "面向商户的智能工作站，一支带业务上下文的 AI 团队与客服闭环，依托语料库与多渠道，构建可度量的服务闭环",
                en: "An intelligent workspace for merchants: an AI team with business context plus a connected support loop, powered by corpus and multi-channel access in one measurable workflow",
              })}
            </p>
            <div className="space-y-2 text-xs leading-5 text-gray-500 dark:text-slate-400">
              <p>{t({ zh: "由玄水科技（深圳）有限公司运营", en: "Operated by Xuanshui Technology (Shenzhen) Co., Ltd" })}</p>
              <p>{t({ zh: "统一社会信用代码：91440300MAKDBL7D3W", en: "Unified social credit code: 91440300MAKDBL7D3W" })}</p>
              <p>{t({ zh: "注册地址：深圳市龙华区龙华街道清华社区和平路33号盛龙时代广场B座1420", en: "Registered address: Room 1420, Block B, Shenglong Times Plaza, No. 33 Heping Road, Longhua, Shenzhen" })}</p>
              <p>
                <a
                  href="https://beian.miit.gov.cn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-600 dark:hover:text-indigo-300"
                >
                  {t({ zh: "粤ICP备2026061441号", en: "粤ICP备2026061441号" })}
                </a>
              </p>
              <p>{t({ zh: "联系电话：17307404063", en: "Phone: 17307404063" })}</p>
              <p>
                <a href="mailto:support@xiaoone.cn" className="hover:text-indigo-600 dark:hover:text-indigo-300">support@xiaoone.cn</a>
              </p>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-4 lg:col-span-2 lg:col-start-6">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4 tracking-wide text-sm">{tKey("marketing.footer.product")}</h3>
            <ul className="space-y-3">
              {productLinks.map(link => (
                <li key={link.key}>
                  {link.external ? (
                    <a href={link.to} className="text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors text-sm">
                      {tKey(link.key)}
                    </a>
                  ) : (
                    <Link to={link.to} className="text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors text-sm">
                      {tKey(link.key)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4 tracking-wide text-sm">{tKey("marketing.footer.developers")}</h3>
            <ul className="space-y-3">
              {developerLinks.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors text-sm">
                    {link.key ? tKey(link.key) : (link.label ?? "")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-4 lg:col-span-2">
            <h3 className="text-gray-900 dark:text-white font-semibold mb-4 tracking-wide text-sm">{tKey("marketing.footer.company")}</h3>
            <ul className="space-y-3">
              {resourceLinks.map(link => (
                <li key={link.key}>
                  <Link to={link.to} className="text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors text-sm">
                    {tKey(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            &copy; 2026 xiaoone {t({ zh: "由玄水科技（深圳）有限公司运营，保留所有权利", en: "Operated by Xuanshui Technology (Shenzhen) Co., Ltd. All rights reserved" })}
          </p>
          <DeployEnvBadge />
        </div>
      </div>
    </footer>
  );
}
