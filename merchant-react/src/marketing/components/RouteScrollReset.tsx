import { useLayoutEffect } from "react";
import { Outlet, useLocation } from "react-router";

export function RouteScrollReset() {
  const { hash, pathname } = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    if (!hash) {
      const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      resetScroll();
      window.requestAnimationFrame(() => {
        resetScroll();
      });
      const timers = [80, 240, 480].map(delay => window.setTimeout(resetScroll, delay));
      return () => timers.forEach(timer => window.clearTimeout(timer));
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById(hash.slice(1));
      target?.scrollIntoView({ block: "start" });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hash, pathname]);

  useLayoutEffect(() => {
    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  return <Outlet />;
}
