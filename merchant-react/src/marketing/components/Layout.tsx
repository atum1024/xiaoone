import { Outlet } from "react-router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { SitePreferencesProvider } from "../sitePreferences";

export function Layout() {
  return (
    <SitePreferencesProvider>
      <div className="x1-site min-h-screen flex flex-col font-sans text-gray-900 bg-slate-50 dark:text-slate-100 dark:bg-slate-950 relative overflow-x-hidden">
        {/* Global Base Backdrop (can be overridden or augmented by pages) */}
        <div className="fixed inset-0 z-[-2] bg-slate-50 dark:bg-slate-950" />
        <Header />
        <main className="flex-grow relative z-0">
          <Outlet />
        </main>
        <Footer />
      </div>
    </SitePreferencesProvider>
  );
}
