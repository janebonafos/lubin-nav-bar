import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import AuthModal, { type ProxySignup, type UserRole } from "@/components/AuthModal";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signup", "signin"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (
    input: Record<string, unknown>,
  ): { redirect?: string; mode?: "signin" | "signup" } => {
    const result = searchSchema.safeParse(input);
    return result.success ? result.data : { mode: "signup" as const };
  },
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign up or sign in — Lubin" },
      { name: "description", content: "Create or access your Lubin account to continue." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const redirect = search.redirect || "/profile";

  const completeAuth = (role?: UserRole, proxy?: ProxySignup | null) => {
    if (role !== "client" && role !== "provider") {
      console.warn("Auth completed without an explicit role; aborting navigation.");
      return;
    }
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lubin.userRole", role);
        window.localStorage.setItem("lubin.signedIn", "1");
        if (proxy) {
          window.localStorage.setItem("lubin.proxySignup", JSON.stringify(proxy));
        } else {
          window.localStorage.removeItem("lubin.proxySignup");
        }
        if (!window.localStorage.getItem("lubin.userName")) {
          const fallbackName = role === "provider" ? "Dr. Provider" : "Guest User";
          window.localStorage.setItem("lubin.userName", fallbackName);
        }
        window.dispatchEvent(new Event("lubin:auth-change"));
      }
    } catch {
      /* ignore */
    }
    navigate({ to: redirect });
  };

  return (
    <div className="min-h-screen bg-[#F9F8FF]" style={{ fontFamily: "Inter, sans-serif" }}>
      <AuthModal
        open={true}
        mode={search.mode || "signup"}
        onClose={() => navigate({ to: "/" })}
        onContinueWithEmail={completeAuth}
        onContinueWithGoogle={completeAuth}
        onContinueWithLinkedIn={completeAuth}
        onContinueWithFacebook={completeAuth}
      />
    </div>
  );
}
