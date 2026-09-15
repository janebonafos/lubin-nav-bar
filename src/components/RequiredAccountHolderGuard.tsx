import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { loadProxyPending } from "@/lib/proxySignup";

/**
 * Prototype-only guard: while an authenticated new client hasn't answered
 * "who is this account for?", every page sends them back to that required
 * question. Refreshing or navigating away can't skip it.
 */
export default function RequiredAccountHolderGuard() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (pathname === "/auth") return;
    if (!loadProxyPending()) return;
    navigate({ to: "/auth", search: { mode: "signup" }, replace: true });
  }, [pathname, navigate]);

  return null;
}
