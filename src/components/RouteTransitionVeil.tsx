import { useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import PageSkeleton from "@/components/PageSkeleton";

/**
 * Lightweight global loading veil shown while a route navigation is in
 * flight. Gives immediate feedback on click so short waits never look
 * like a frozen or broken page.
 */
export default function RouteTransitionVeil() {
  const isNavigating = useRouterState({
    select: (s) => s.status === "pending" || s.isTransitioning,
  });
  const location = useRouterState({ select: (s) => s.location.href });
  const [show, setShow] = useState(false);
  const hideAt = useRef(0);
  const router = useRouter();

  // Show instantly on any in-app link click, even if the route resolves fast,
  // so the click always produces visible feedback. Plain <a href="/..."> links
  // (not rendered through <Link>) are also routed client-side here so they
  // never trigger a full page reload — which would bypass this loader.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        !href.startsWith("/") ||
        /^\/\//.test(href)
      )
        return;
      if (href === window.location.pathname + window.location.search) return;

      // Bubble phase: if a <Link> already handled it, defaultPrevented is set.
      // Otherwise take over so navigation stays client-side.
      if (!e.defaultPrevented) {
        e.preventDefault();
        void router.navigate({ to: href, resetScroll: true });
      }

      hideAt.current = Date.now() + 550;
      setShow(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);


  useEffect(() => {
    if (isNavigating) {
      hideAt.current = Math.max(hideAt.current, Date.now() + 400);
      setShow(true);
      return;
    }
    const remaining = Math.max(0, hideAt.current - Date.now());
    const t = setTimeout(() => setShow(false), remaining);
    return () => clearTimeout(t);
  }, [isNavigating, location]);


  return (
    <div
      aria-hidden={!show}
      className="fixed inset-0 z-[9998] overflow-hidden"
      style={{
        opacity: show ? 1 : 0,
        pointerEvents: show ? "auto" : "none",
        transition: "opacity 160ms ease",
      }}
    >
      <div className="h-full w-full overflow-hidden bg-[#FBFAFF]">
        <PageSkeleton />
      </div>
    </div>
  );
}

