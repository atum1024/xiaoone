import { Link } from "react-router";
import { Languages, Menu, Moon, Sun, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { logoAssetsForTheme } from "../brandAssets";
import { LocalIpRegionToggle, LocalPartnerRoleToggle, LocalRealNameToggle, RegionMismatchBanner } from "@xiaoone/region";
import { useSitePreferences, type SiteLocale, type SiteTheme } from "../sitePreferences";
import { hasAccessToken } from "../../auth/token";
import { displayUserName } from "../../lib/userDisplay";
import { useAuthStore } from "../../store/auth";

const navItems = [
  { to: "/consultant", key: "marketing.header.nav.consultant" },
  { to: "/programmer", key: "marketing.header.nav.programmer" },
  { to: "/customer-service", key: "marketing.header.nav.customerService" },
  { to: "/marketing", key: "marketing.header.nav.contentStudio" },
  { to: "/channel-business", key: "marketing.header.nav.businessServices" },
  { to: "/pricing", key: "marketing.header.nav.pricing" },
  { to: "/about", key: "marketing.header.nav.about" },
] as const;

function SiteToggleBar({
  locale,
  theme,
  toggleLocale,
  toggleTheme,
  tKey,
}: {
  locale: SiteLocale;
  theme: SiteTheme;
  toggleLocale: () => void;
  toggleTheme: () => void;
  tKey: (key: string, fallback?: string) => string;
}) {
  const isDark = theme === "dark";

  return (
    <div className="x1-site-toggle">
      <motion.button
        type="button"
        onClick={toggleTheme}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.94 }}
        className="x1-site-toggle__btn"
        aria-label={isDark ? tKey("marketing.header.theme.light") : tKey("marketing.header.theme.dark")}
        title={isDark ? "Light" : "Dark"}
      >
        {isDark ? <Sun size={15} strokeWidth={2.2} /> : <Moon size={15} strokeWidth={2.2} />}
      </motion.button>
      <motion.button
        type="button"
        onClick={toggleLocale}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.96 }}
        className="x1-site-toggle__lang"
        aria-label={locale === "zh" ? tKey("marketing.header.locale.switchEn") : tKey("marketing.header.locale.switchZh")}
        title={locale === "zh" ? "English" : "中文"}
      >
        <Languages size={14} strokeWidth={2.15} />
        <span>{locale === "zh" ? "EN" : "中文"}</span>
      </motion.button>
      <LocalIpRegionToggle locale={locale} className="x1-site-toggle__ip" />
      <LocalRealNameToggle locale={locale} className="x1-site-toggle__ip" />
      <LocalPartnerRoleToggle locale={locale} className="x1-site-toggle__ip" />
    </div>
  );
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const auth = useAuthStore();
  const { locale, theme, toggleLocale, toggleTheme, t, tKey } = useSitePreferences();
  const brand = logoAssetsForTheme(theme);
  const isAuthed = auth.status === "authed";
  const hasSessionHint = typeof window !== "undefined" && hasAccessToken();
  const workspaceLink = isAuthed || hasSessionHint ? "/workbench" : "/login";
  const workspaceLabel = isAuthed
    ? tKey("marketing.header.workspace.signedIn")
    : hasSessionHint
    ? tKey("marketing.header.workspace.enter")
    : tKey("marketing.header.workspace.signIn");
  const loggedInLabel = auth.user
    ? `${tKey("marketing.header.signedIn")} ${displayUserName(auth.user)}`
    : "";

  useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const next = window.scrollY > 20;
        setIsScrolled(prev => prev === next ? prev : next);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
    <RegionMismatchBanner locale={locale} />
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 backdrop-blur-md ${
      isScrolled ? "bg-white/80 border-b border-gray-200 dark:bg-slate-950/82 dark:border-white/10" : "bg-transparent border-b border-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Area */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img 
                src={brand.header} 
                alt="xiaoone logo" 
                className="h-5 md:h-6 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center space-x-6 2xl:space-x-8">
            {navItems.map(item => (
              <Link key={item.to} to={item.to} className="whitespace-nowrap text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white text-sm font-medium transition-colors">
                {tKey(item.key)}
              </Link>
            ))}
            
            <div className="h-4 w-px bg-gray-200 dark:bg-white/15 mx-1 lg:mx-2"></div>

            <SiteToggleBar
              locale={locale}
              theme={theme}
              toggleLocale={toggleLocale}
              toggleTheme={toggleTheme}
              tKey={tKey}
            />
            
            {isAuthed && loggedInLabel ? (
              <span
                className="hidden xl:inline-flex max-w-[11rem] items-center truncate rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                title={loggedInLabel}
              >
                {loggedInLabel}
              </span>
            ) : null}

            <Link
              to={workspaceLink}
              className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 !text-white hover:!text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {workspaceLabel}
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="xl:hidden flex items-center gap-2">
            <SiteToggleBar
              locale={locale}
              theme={theme}
              toggleLocale={toggleLocale}
              toggleTheme={toggleTheme}
              tKey={tKey}
            />
            {isAuthed && loggedInLabel ? (
              <span
                className="inline-flex max-w-[7.5rem] items-center truncate rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200 sm:max-w-[9.5rem] sm:px-3 sm:py-1.5 sm:text-xs"
                title={loggedInLabel}
              >
                {loggedInLabel}
              </span>
            ) : null}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 dark:text-slate-200 dark:hover:text-white focus:outline-none p-2"
              aria-label={isMenuOpen ? tKey("marketing.header.menu.close") : tKey("marketing.header.menu.open")}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="xl:hidden bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-white/10 shadow-lg">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navItems.map(item => (
              <Link key={item.to} to={item.to} className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10">
                {tKey(item.key)}
              </Link>
            ))}
            <div className="border-t border-gray-100 dark:border-white/10 my-2"></div>
            {isAuthed && loggedInLabel ? (
              <div className="px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-200">
                {loggedInLabel}
              </div>
            ) : null}
            <Link
              to={workspaceLink}
              className="block w-full text-center mt-4 bg-indigo-600 !text-white hover:!text-white px-3 py-2.5 rounded-md font-medium"
            >
              {workspaceLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
    </>
  );
}
