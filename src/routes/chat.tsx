import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Plus,
  MessageSquare,
  Trash2,
  HeartHandshake,
  Sun,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import lubinLogo from "@/assets/lubin-logo.svg";

// Refined, minimal sidebar toggle glyph
const SidebarGlyph = ({
  open = true,
  className = "h-[18px] w-[18px]",
}: {
  open?: boolean;
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <rect x="3.25" y="4.75" width="17.5" height="14.5" rx="3.2" />
    <line x1="9.25" y1="5" x2="9.25" y2="19" />
    {open ? (
      <path d="M14.25 9.5l-2 2.5 2 2.5" />
    ) : (
      <path d="M13.75 9.5l2 2.5-2 2.5" />
    )}
  </svg>
);

// Lubin brand mark (butterfly) — extracted from the wordmark
const LubinMark = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    viewBox="0 0 94 70"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M65.4418 69C63.2434 69 61.1538 68.4555 59.1967 67.3637C53.8138 64.3647 50.4116 57.5956 48.0395 50.6235C43.4424 59.485 34.7132 72.152 23.818 68.1848C21.2516 67.2518 17.0107 64.3823 17.4815 55.6885C17.667 52.2804 18.5764 48.478 19.9832 45.014C13.3554 39.7253 1.84207 28.8124 0.205718 17.9818C-0.535936 13.061 0.729584 8.67291 3.97285 4.94109C7.4545 0.756045 12.1899 -0.827328 17.6316 0.408763C28.2767 2.82797 40.4316 16.5515 46.5297 27.2143C52.3099 18.9472 65.8509 4.4908 77.7115 1.96271C83.0355 0.82668 87.6562 2.18344 91.0554 5.89465C93.0979 8.1255 95.2051 12.1752 93.6306 18.803C91.3909 28.2149 82.6382 39.1985 76.4519 45.1229C77.7821 48.7752 78.4767 52.7631 78.306 56.1329C77.997 62.3339 75.0951 66.6308 70.1449 68.2201C68.5291 68.741 66.9605 69 65.4418 69ZM49.6111 33.7096C49.8171 34.3012 49.9937 34.8662 50.1261 35.3872L50.6058 37.3149C52.5777 45.2641 55.8798 58.5756 62.1486 62.0632C63.9497 63.0727 65.9598 63.1933 68.2878 62.4458C70.7364 61.66 72.0667 59.435 72.2492 55.8209C72.361 53.5901 72.0255 51.2739 71.4251 49.1284C71.2691 49.2078 71.1249 49.2755 70.9954 49.3197C67.4991 50.6411 61.7571 49.4286 59.2967 45.8292C58.3696 44.4695 56.6597 40.8201 60.7977 36.2142C62.9844 33.9657 65.7332 33.3977 68.4114 34.5661C70.3656 35.4166 72.1315 37.153 73.6148 39.378C78.8711 33.9068 86.4995 24.283 87.9093 16.5339C88.4331 13.6644 88.0005 11.5218 86.5849 9.97669C84.6366 7.85474 82.2262 7.1896 78.9741 7.87828C66.9075 10.4682 51.0797 30.0985 49.6111 33.7096ZM25.0864 48.6369C24.4655 50.388 23.9622 52.3128 23.6914 54.3406C23.4707 55.9857 22.9763 61.4245 25.8899 62.487C33.898 65.3977 42.5418 48.9312 45.4643 41.7589C45.2023 40.723 44.9551 39.7341 44.7197 38.7776L44.2429 36.8734C42.171 28.6417 27.6087 8.89364 16.2837 6.3214C13.0875 5.59151 10.6419 6.4038 8.59053 8.87009C6.498 11.2805 5.72986 13.9498 6.20076 17.0783C7.46922 25.469 16.9459 34.6485 22.8468 39.5163C24.7509 36.6645 27.02 34.5749 29.4157 33.9833C30.7636 33.6537 34.157 33.33 36.6527 37.5091C36.6939 37.5739 36.7292 37.6504 36.7675 37.721C39.1043 42.4623 37.5916 46.1323 35.396 47.9835C32.6825 50.2821 28.5298 50.4969 25.0864 48.6369ZM27.7058 43.151C29.142 44.0516 30.7519 43.9721 31.4876 43.3511C32.2734 42.6889 31.7201 41.2203 31.3846 40.5111C31.0962 40.049 30.8725 39.8665 30.8078 39.8371C30.1838 39.9077 28.9713 41.135 27.7058 43.151ZM65.7038 40.0461C65.5802 40.0461 65.4566 40.1285 65.2241 40.3668C65.071 40.5405 63.9291 41.8619 64.3058 42.4123C65.0092 43.4482 67.7316 44.0663 68.8529 43.6513C68.9147 43.6131 68.9941 43.5777 69.0736 43.5218C68.0494 41.7854 66.934 40.5434 65.9863 40.1314C65.8745 40.0843 65.7891 40.0461 65.7038 40.0461Z" />
  </svg>
);

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat with Lubin — Your private companion" },
      {
        name: "description",
        content:
          "Talk through how you're feeling with Lubin. A private, gentle space to reflect and feel heard.",
      },
      { property: "og:title", content: "Chat with Lubin" },
      {
        property: "og:description",
        content: "A private, gentle space to talk through how you're feeling.",
      },
    ],
  }),
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; messages: Msg[]; updatedAt: number };

const STORAGE_KEY = "lubin.chat.threads.v1";
const ACTIVE_KEY = "lubin.chat.activeId.v1";

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hey, I'm really glad you stopped by. How have you been feeling lately? Take your time — there's no rush.",
};

const newThread = (): Thread => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Date.now()),
  title: "New conversation",
  messages: [WELCOME],
  updatedAt: Date.now(),
});

const QUICK_ACTIONS = [
  { to: "/my-health-passport", label: "My Health Passport", Icon: HeartHandshake },
  { to: "/check-in", label: "How are you feeling?", Icon: Sun },
  { to: "/self-discovery", label: "Self Discovery", Icon: Sparkles },
] as const;

const STARTERS = [
  "I've been feeling overwhelmed lately…",
  "My mind won't slow down",
  "I'm not sure what I'm feeling",
  "Help me reflect on my week",
];

function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  // Mobile drawer (overlay) — closed by default
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop sidebar collapsed state — persisted
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load threads from localStorage on mount (client-only to avoid hydration mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const savedActive = localStorage.getItem(ACTIVE_KEY) ?? "";
      if (raw) {
        const parsed: Thread[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
          setActiveId(parsed.find((t) => t.id === savedActive)?.id ?? parsed[0].id);
          setHydrated(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    const t = newThread();
    setThreads([t]);
    setActiveId(t.id);
    setHydrated(true);
  }, []);

  // Persist threads
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {
      // ignore
    }
  }, [threads, activeId, hydrated]);

  const active = threads.find((t) => t.id === activeId);
  const messages = active?.messages ?? [WELCOME];

  const updateActive = (updater: (t: Thread) => Thread) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === activeId ? { ...updater(t), updatedAt: Date.now() } : t)),
    );
  };

  const createNewThread = () => {
    const t = newThread();
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    setInput("");
    setMobileOpen(false);
  };

  const deleteThread = (id: string) => {
    setThreads((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        const t = newThread();
        setActiveId(t.id);
        return [t];
      }
      if (id === activeId) setActiveId(filtered[0].id);
      return filtered;
    });
  };

  // Load desktop collapsed pref
  useEffect(() => {
    try {
      const v = localStorage.getItem("lubin.chat.sidebarCollapsed.v1");
      if (v === "1") setDesktopCollapsed(true);
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "lubin.chat.sidebarCollapsed.v1",
        desktopCollapsed ? "1" : "0",
      );
    } catch {
      // ignore
    }
  }, [desktopCollapsed]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming || !active) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    const isFirstUserMsg = messages.filter((m) => m.role === "user").length === 0;
    updateActive((t) => ({
      ...t,
      title: isFirstUserMsg ? text.slice(0, 48) : t.title,
      messages: next,
    }));
    setInput("");
    setIsStreaming(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        if (resp.status === 429) toast.error("Too many messages — please wait a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in Settings.");
        else toast.error("Couldn't reach Lubin. Please try again.");
        console.error("chat error", resp.status, errText);
        setIsStreaming(false);
        return;
      }

      let assistantSoFar = "";
      updateActive((t) => ({ ...t, messages: [...next, { role: "assistant", content: "" }] }));

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      const flushChunk = (chunk: string) => {
        assistantSoFar += chunk;
        updateActive((t) => {
          const copy = [...t.messages];
          copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
          return { ...t, messages: copy };
        });
      };

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) flushChunk(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection interrupted. Please try again.");
    } finally {
      setIsStreaming(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      className="relative flex h-screen overflow-hidden bg-gradient-to-br from-[#F7F4FF] via-[#EEE9FB] to-[#F4EEFB]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-brand-purple/25 to-brand-purple-accent/10 blur-[120px]" />
        <div className="absolute top-1/4 -right-48 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[#C4B5FD]/30 to-[#9990C9]/15 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-[#E9D8FD]/40 to-transparent blur-[120px]" />
      </div>

      {/* Sidebar — thread list */}
      {mobileOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-brand-navy/30 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[82vw] max-w-[300px] flex-col border-r border-brand-purple/10 bg-white/80 backdrop-blur-xl transition-all duration-300 md:relative md:w-72 md:max-w-none md:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        } ${desktopCollapsed ? "md:hidden" : "md:flex"}`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={lubinLogo} alt="Lubin" className="h-5 w-auto" />
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDesktopCollapsed(true)}
              className="hidden rounded-full p-1.5 text-brand-purple-dark/60 transition-colors hover:bg-brand-purple/10 hover:text-brand-purple-dark md:inline-flex"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-full p-1.5 text-brand-purple-dark/60 hover:bg-brand-purple/10 md:hidden"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="px-3 pb-1">
          <Link
            to="/"
            className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-brand-purple-dark/60 transition-colors hover:text-brand-purple-dark"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <button
            onClick={createNewThread}
            className="flex w-full items-center gap-2 rounded-[12px] bg-gradient-to-br from-brand-purple to-brand-purple-dark px-3 py-2.5 text-[13.5px] font-medium text-white shadow-[0_6px_20px_-8px_rgba(126,107,175,0.6)] transition-all hover:shadow-[0_8px_24px_-8px_rgba(126,107,175,0.7)]"
          >
            <Plus className="h-4 w-4" />
            New conversation
          </button>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto px-2 pb-3">
          <p className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-brand-purple-dark/45">
            Recent
          </p>
          {threads
            .slice()
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((t) => {
              const isActive = t.id === activeId;
              return (
                <div
                  key={t.id}
                  className={`group flex items-center gap-2 rounded-[10px] px-2.5 py-2 transition-colors ${
                    isActive ? "bg-brand-purple/12" : "hover:bg-brand-purple/8"
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveId(t.id);
                      setMobileOpen(false);
                    }}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-brand-purple/70" />
                    <span
                      className={`truncate text-[13px] ${
                        isActive
                          ? "font-semibold text-brand-purple-dark"
                          : "text-brand-purple-dark/75"
                      }`}
                    >
                      {t.title}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteThread(t.id)}
                    className="rounded p-1 text-brand-purple-dark/40 opacity-0 transition-opacity hover:bg-brand-purple/10 hover:text-brand-purple-dark group-hover:opacity-100"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
        </div>
        <div className="border-t border-brand-purple/10 bg-white/50 px-4 py-3 text-[11px] text-brand-purple-dark/55">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Link to="/resources" className="hover:text-brand-purple-dark hover:underline">
              Terms
            </Link>
            <Link to="/resources" className="hover:text-brand-purple-dark hover:underline">
              Privacy
            </Link>
            <Link to="/resources" className="hover:text-brand-purple-dark hover:underline">
              Need urgent help?
            </Link>
          </div>
        </div>
      </aside>

      {/* Main chat column */}
      <main className="relative z-10 flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-2 border-b border-brand-purple/10 bg-white/60 px-3 py-3 backdrop-blur-md md:px-6">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setMobileOpen(true);
              } else {
                setDesktopCollapsed((v) => !v);
              }
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-purple-dark/70 transition-colors hover:bg-brand-purple/10 hover:text-brand-purple-dark"
            aria-label="Toggle conversations"
          >
            <span className="md:hidden">
              <Menu className="h-4.5 w-4.5" />
            </span>
            <span className="hidden md:inline">
              {desktopCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </span>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-brand-purple-dark text-white shadow-[0_4px_12px_-4px_rgba(126,107,175,0.6)]">
                <Leaf className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[14px] font-semibold text-brand-purple-dark">
                {active?.title && active.title !== "New conversation"
                  ? active.title
                  : "Lubin"}
              </p>
              <p className="truncate text-[10.5px] text-brand-purple-dark/55">
                Private &amp; encrypted
              </p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
          {/* Top fade */}
          <div className="pointer-events-none sticky top-0 z-10 -mb-6 h-6 bg-gradient-to-b from-[#F4EEFB] to-transparent" />
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 md:px-6">
            {messages.length === 1 && messages[0].role === "assistant" ? (
              <div
                className="flex flex-col items-center pt-8 pb-4 text-center"
                style={{ animation: "msg-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both" }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple-dark shadow-[0_12px_30px_-10px_rgba(126,107,175,0.6)]">
                  <Leaf className="h-7 w-7 text-white" strokeWidth={2.2} />
                </div>
                <h2 className="mt-5 text-[22px] font-semibold tracking-tight text-brand-purple-dark">
                  Hey, I'm Lubin.
                </h2>
                <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-brand-purple-dark/60">
                  How have you been feeling lately? Take your time — there's no rush, and nothing
                  you share leaves this space.
                </p>
                <div className="mt-7 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        textareaRef.current?.focus();
                      }}
                      className="group rounded-2xl border border-brand-purple/15 bg-white/70 px-4 py-3 text-left text-[13px] leading-relaxed text-brand-purple-dark/80 transition-all hover:-translate-y-0.5 hover:border-brand-purple/35 hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(126,107,175,0.4)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={i}
                    className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                    style={{ animation: "msg-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both" }}
                  >
                    {!isUser && (
                      <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-brand-purple-dark shadow-sm">
                        <Leaf className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${
                        isUser
                          ? "rounded-br-md bg-gradient-to-br from-brand-navy to-[#1f1e3a] text-white shadow-[0_6px_20px_-12px_rgba(44,43,75,0.6)]"
                          : "rounded-bl-md bg-white/90 text-brand-navy ring-1 ring-brand-purple/10 backdrop-blur-sm"
                      }`}
                    >
                      {m.content || (
                        <span className="inline-flex items-center gap-1">
                          {[0, 150, 300].map((d) => (
                            <span
                              key={d}
                              className="block h-1.5 w-1.5 rounded-full bg-brand-purple/60"
                              style={{
                                animation: "dot-bounce 1.2s ease-in-out infinite",
                                animationDelay: `${d}ms`,
                              }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="px-4 pb-4 pt-2 md:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <div
              suppressHydrationWarning
              className="group flex flex-col gap-2 rounded-2xl border border-brand-purple/20 bg-white/95 px-3.5 py-3 shadow-[0_12px_40px_-18px_rgba(124,58,237,0.35)] backdrop-blur-md transition-all focus-within:border-brand-purple/45 focus-within:shadow-[0_16px_50px_-18px_rgba(124,58,237,0.45)]"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask anything…"
                suppressHydrationWarning
                className="max-h-40 w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-brand-navy placeholder:text-brand-purple-dark/40 focus:outline-none"
                disabled={isStreaming}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_ACTIONS.map(({ to, label, Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/15 bg-brand-purple/[0.04] px-3 py-1.5 text-[12px] font-medium text-brand-purple-dark/80 transition-all hover:-translate-y-0.5 hover:border-brand-purple/30 hover:bg-brand-purple/10 hover:text-brand-purple-dark"
                    >
                      <Icon className="h-3.5 w-3.5 text-brand-purple" />
                      {label}
                    </Link>
                  ))}
                </div>
                <button
                  onClick={send}
                  disabled={!input.trim() || isStreaming}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-brand-purple-dark text-white shadow-[0_4px_14px_-4px_rgba(126,107,175,0.7)] transition-all hover:scale-105 hover:shadow-[0_6px_18px_-4px_rgba(126,107,175,0.85)] disabled:cursor-not-allowed disabled:bg-none disabled:bg-brand-purple/25 disabled:shadow-none disabled:hover:scale-100"
                  aria-label="Send"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2.5 text-center text-[11px] text-brand-purple-dark/50">
              Lubin is here to listen. Not a substitute for professional care.{" "}
              <Link to="/resources" className="underline-offset-2 hover:underline">
                Terms
              </Link>{" "}
              ·{" "}
              <Link to="/resources" className="underline-offset-2 hover:underline">
                Privacy
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}