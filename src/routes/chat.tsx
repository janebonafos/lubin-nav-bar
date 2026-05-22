import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Plus,
  MessageSquare,
  Trash2,
  Leaf,
  Sun,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import lubinLogo from "@/assets/lubin-logo.svg";

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
  { to: "/my-health-passport", label: "My Health Passport", Icon: Leaf },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    setSidebarOpen(false);
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
      className="relative flex h-screen overflow-hidden bg-gradient-to-b from-[#F5F3FF] via-[#EFEAFE] to-[#F5F3FF]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-brand-purple/30 to-brand-purple-accent/15 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-[#C4B5FD]/35 to-[#9990C9]/20 blur-3xl" />
      </div>

      {/* Sidebar — thread list */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-brand-navy/30 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-brand-purple/10 bg-white/85 backdrop-blur-xl transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium text-brand-purple-dark/70 transition-colors hover:bg-brand-purple/10 hover:text-brand-purple-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-full p-1.5 text-brand-purple-dark/60 hover:bg-brand-purple/10 md:hidden"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-3">
          <button
            onClick={createNewThread}
            className="flex w-full items-center gap-2 rounded-[12px] border border-brand-purple/20 bg-white px-3 py-2.5 text-[13.5px] font-medium text-brand-purple-dark transition-all hover:border-brand-purple/40 hover:shadow-sm"
          >
            <Plus className="h-4 w-4 text-brand-purple" />
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
                      setSidebarOpen(false);
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
        <div className="border-t border-brand-purple/10 px-4 py-3 text-[11px] text-brand-purple-dark/55">
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
        <header className="flex items-center justify-between border-b border-brand-purple/10 bg-white/60 px-4 py-3 backdrop-blur-md md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-brand-purple-dark/70 hover:bg-brand-purple/10 md:hidden"
            aria-label="Open conversations"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-brand-purple-dark/70 hover:bg-brand-purple/10 hover:text-brand-purple-dark md:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <h1 className="truncate px-2 text-[14px] font-semibold text-brand-purple-dark">
            {active?.title ?? "Chat with Lubin"}
          </h1>
          <button
            onClick={createNewThread}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple/10 px-3 py-1.5 text-[12.5px] font-medium text-brand-purple hover:bg-brand-purple/15"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-6 md:px-6">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  style={{ animation: "msg-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both" }}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed ${
                      isUser
                        ? "rounded-br-md bg-brand-navy text-white shadow-sm"
                        : "rounded-bl-md bg-brand-lavender text-brand-navy"
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
            })}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-brand-purple/10 bg-white/70 px-4 pb-4 pt-3 backdrop-blur-md md:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <div
              suppressHydrationWarning
              className="flex flex-col gap-2 rounded-2xl border border-brand-purple/20 bg-white px-3 py-2.5 shadow-[0_8px_30px_-15px_rgba(124,58,237,0.25)]"
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
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-purple/15 bg-white px-3 py-1.5 text-[12px] font-medium text-brand-purple-dark/80 transition-colors hover:border-brand-purple/30 hover:bg-brand-purple/8 hover:text-brand-purple-dark"
                    >
                      <Icon className="h-3.5 w-3.5 text-brand-purple" />
                      {label}
                    </Link>
                  ))}
                </div>
                <button
                  onClick={send}
                  disabled={!input.trim() || isStreaming}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-purple text-white transition-all hover:bg-brand-purple-dark disabled:cursor-not-allowed disabled:bg-brand-purple/30"
                  aria-label="Send"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-brand-purple-dark/45">
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