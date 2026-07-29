import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { initAnalytics, setRole } from "@/lib/analytics/client";
import { getConsent, subscribeConsent } from "@/lib/analytics/consent";
import { sanitizePath } from "@/lib/analytics/sanitize";
import { track } from "@/lib/analytics/events";

function readRole(): "client" | "provider" | "guest" {
  if (typeof window === "undefined") return "guest";
  try {
    const r = window.localStorage.getItem("lubin.userRole");
    if (r === "client" || r === "provider") return r;
  } catch {
    /* ignore */
  }
  return "guest";
}

export function AnalyticsProvider() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastRoute = useRef<string | null>(null);

  // Init on mount if consent already granted; update role from storage.
  useEffect(() => {
    setRole(readRole());
    if (getConsent() === "granted") void initAnalytics();

    const onAuth = () => setRole(readRole());
    window.addEventListener("lubin:auth-change", onAuth);
    const unsub = subscribeConsent(() => {
      if (getConsent() === "granted") void initAnalytics();
    });
    return () => {
      window.removeEventListener("lubin:auth-change", onAuth);
      unsub();
    };
  }, []);

  // Emit sanitized page_view on route change.
  useEffect(() => {
    const route = sanitizePath(pathname);
    if (route === lastRoute.current) return;
    lastRoute.current = route;
    track("page_view", { route });
  }, [pathname]);

  return null;
}