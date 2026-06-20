import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, HeartHandshake, Sun, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  { title: "Release Stress", text: "I've been feeling overwhelmed lately…" },
  { title: "Quiet the Noise", text: "My mind won't slow down" },
  { title: "Name a Feeling", text: "I'm not sure what I'm feeling" },
  { title: "Weekly Reflection", text: "Help me reflect on my week" },
];

export default function EmbeddedChat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      /* ignore */
    }
    const t = newThread();
    setThreads([t]);
    setActiveId(t.id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {
      /* ignore */
    }
  }, [threads, activeId, hydrated]);

  const active = threads.find((t) => t.id === activeId);
  const messages = active?.messages ?? [WELCOME];

  const updateActive = (updater: (t: Thread) => Thread) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...updater(t), updatedAt: Date.now() } : t,
      ),
    );
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

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
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
        if (resp.status === 429) toast.error("Too many messages — please wait a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in Settings.");
        else toast.error("Couldn't reach Lubin. Please try again.");
        setIsStreaming(false);
        return;
      }

      let assistantSoFar = "";
      updateActive((t) => ({
        ...t,
        messages: [...next, { role: "assistant", content: "" }],
      }));

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

  const isEmpty = messages.length === 1 && messages[0].role === "assistant";

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[720px] flex-col overflow-hidden rounded-2xl border border-[#E3DBF5]/60 bg-gradient-to-br from-[#F7F4FF] via-[#EEE9FB] to-[#F4EEFB]">
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center pt-10 text-center">
              <p className="max-w-md text-[14px] leading-relaxed text-[#7E6BAF]/70">
                I'm here to listen, reflect, and walk with you through whatever's on your mind today.
              </p>
              <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => send(s.text)}
                    className="rounded-xl border border-[#E3DBF5]/70 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#7E6BAF]/40 hover:shadow-[0_8px_24px_-12px_rgba(126,107,175,0.4)]"
                  >
                    <p className="text-[13px] font-semibold text-[#7E6BAF]">{s.title}</p>
                    <p className="mt-1 text-[12.5px] text-[#A89BD0]">{s.text}</p>
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
                >
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                      isUser
                        ? "rounded-br-md bg-gradient-to-br from-[#3D2E6B] to-[#1f1e3a] text-white"
                        : "rounded-bl-md bg-white/90 text-[#3D2E6B] ring-1 ring-[#7E6BAF]/10"
                    }`}
                  >
                    {m.content || (
                      <span className="inline-flex items-center gap-1">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="block h-1.5 w-1.5 rounded-full bg-[#7E6BAF]/60"
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

      <div className="px-3 pb-3 pt-2">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex flex-col gap-2 rounded-2xl border border-[#7E6BAF]/20 bg-white px-3 py-2.5 shadow-[0_12px_40px_-18px_rgba(124,58,237,0.35)] focus-within:border-[#7E6BAF]/45">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask anything…"
              className="max-h-40 w-full resize-none bg-transparent text-[14px] leading-relaxed text-[#3D2E6B] placeholder:text-[#7E6BAF]/40 focus:outline-none"
              disabled={isStreaming}
            />
            <div className="flex items-center gap-2">
              <div className="-mx-1 flex flex-1 items-center gap-1.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {QUICK_ACTIONS.map(({ to, label, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#7E6BAF]/15 bg-[#7E6BAF]/[0.04] px-2.5 py-1.5 text-[11.5px] font-medium text-[#3D2E6B]/80 transition hover:-translate-y-0.5 hover:border-[#7E6BAF]/30 hover:bg-[#7E6BAF]/10"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#7E6BAF]" />
                    {label}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => send()}
                disabled={!input.trim() || isStreaming}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7E6BAF] to-[#3D2E6B] text-white shadow-[0_4px_14px_-4px_rgba(126,107,175,0.7)] transition hover:scale-105 disabled:cursor-not-allowed disabled:bg-none disabled:bg-[#7E6BAF]/25 disabled:shadow-none disabled:hover:scale-100"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-[#7E6BAF]/60">
            Lubin is here to listen — not a substitute for professional care.
          </p>
        </div>
      </div>
    </div>
  );
}