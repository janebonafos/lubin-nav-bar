import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

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

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hey, I'm really glad you stopped by. How have you been feeling lately? Take your time — there's no rush.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (!text || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
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
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      const flushChunk = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
          return copy;
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
      className="relative flex min-h-screen flex-col bg-gradient-to-b from-[#F5F3FF] via-[#EFEAFE] to-[#F5F3FF]"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-brand-purple/30 to-brand-purple-accent/15 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-[#C4B5FD]/35 to-[#9990C9]/20 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-brand-purple/10 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 md:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-brand-purple-dark/70 transition-colors hover:bg-brand-purple/10 hover:text-brand-purple-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[13px] font-semibold text-brand-purple-dark">
              Lubin · listening
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-purple/10 px-3 py-1 text-[11px] font-medium text-brand-purple">
            <Sparkles className="h-3 w-3" />
            Private
          </span>
        </div>
      </header>

      {/* Messages */}
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 md:px-6">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto py-6"
          style={{ scrollBehavior: "smooth" }}
        >
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  style={{ animation: "msg-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both" }}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed shadow-sm ${
                      isUser
                        ? "rounded-br-sm bg-gradient-to-br from-brand-purple to-brand-purple-dark text-white"
                        : "rounded-bl-sm bg-white/90 text-[#2C2B4B] ring-1 ring-brand-purple/10 backdrop-blur-sm"
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
        <div className="sticky bottom-0 z-10 pb-4 pt-2">
          <div className="flex items-end gap-2 rounded-2xl border border-brand-purple/20 bg-white/90 p-2 shadow-[0_10px_40px_-15px_rgba(124,58,237,0.35)] backdrop-blur-md">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Share what's on your mind…"
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-[14.5px] leading-relaxed text-[#2C2B4B] placeholder:text-brand-purple-dark/40 focus:outline-none"
              disabled={isStreaming}
            />
            <button
              onClick={send}
              disabled={!input.trim() || isStreaming}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-brand-purple to-brand-purple-dark text-white shadow-sm transition-all hover:shadow-md disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-brand-purple-dark/45">
            Lubin is here to listen. This is not a substitute for professional care.
          </p>
        </div>
      </main>
    </div>
  );
}