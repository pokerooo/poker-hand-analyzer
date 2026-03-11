/**
 * AI Coach Chat — Free-form poker Q&A with mascot and quick-question prompts
 * Features:
 *  - 3 visible prompts with shuffle
 *  - Back-to-hand link when arriving from replayer
 *  - Auto-prefill input with hand summary when arriving from replayer
 *  - "Study this concept" save button on each coach response
 *  - Session question counter in the header
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Send, RotateCcw, Zap, RefreshCw, ArrowLeft, BookOpen, Check } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const MASCOT_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663320611071/g6HPzuQNwUJzsGs4mHVNkx/coach_mascot_cfaa3837.png";

// Full pool — 3 shown at a time, shuffle cycles through
const PROMPT_POOL = [
  "How often should I defend my BB vs BTN steal in late-stage MTTs?",
  "I have AKs on the BTN — should I 3-bet or flat vs a CO open?",
  "What's the right c-bet frequency on a K72 rainbow board?",
  "When should I overbet the river for value?",
  "How do I adjust vs a player who never folds to c-bets?",
  "I've been running bad — how do I know if it's variance or a leak?",
  "What is a c-bet and when should I continuation bet?",
  "I'm a recreational player — what's the single biggest leak to fix first?",
  "How wide should I be 3-betting from the SB vs a CO open?",
  "When is it correct to slow-play a flopped set?",
  "How do I size my river bluffs to make villain indifferent?",
  "What hands should I be check-raising the flop with as the BB?",
];

function getRandomPrompts(exclude: string[] = []): string[] {
  const pool = PROMPT_POOL.filter((p) => !exclude.includes(p));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

interface Message {
  role: "user" | "assistant";
  content: string;
  question?: string; // the user question that prompted this assistant response (for Study button)
}

export default function CoachChat() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [visiblePrompts, setVisiblePrompts] = useState<string[]>(() => getRandomPrompts());
  const [savedTopics, setSavedTopics] = useState<Set<number>>(new Set()); // index of saved assistant messages
  const [sessionCount, setSessionCount] = useState(0); // questions asked this session
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Parse query params for hand context (slug + title from HandReplayer)
  const searchParams = useMemo(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
    []
  );
  const fromSlug = searchParams.get("from");
  const fromTitle = searchParams.get("title");

  // Auto-prefill input with hand summary when arriving from replayer
  useEffect(() => {
    if (fromSlug && fromTitle && messages.length === 0) {
      setInput(
        `I just reviewed my hand "${fromTitle}". Can you walk me through the key decision points and what I should focus on improving?`
      );
      // Focus input so user just hits Enter
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [fromSlug, fromTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  const chatMutation = trpc.chat.ask.useMutation({
    onMutate: () => setIsTyping(true),
    onSettled: () => setIsTyping(false),
    onSuccess: (data, variables) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, question: variables.question },
      ]);
      setSessionCount((c) => c + 1);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    },
  });

  const saveStudyMutation = trpc.study.save.useMutation({
    onSuccess: () => toast.success("Saved to your Study List"),
    onError: () => toast.error("Sign in to save study topics"),
  });

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isTyping) return;
      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      chatMutation.mutate({
        question: text.trim(),
        history: messages.slice(-10),
      });
    },
    [messages, isTyping, chatMutation]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const shufflePrompts = () => {
    setVisiblePrompts(getRandomPrompts(visiblePrompts));
  };

  const handleSaveTopic = (msgIndex: number, question: string, answer: string) => {
    if (savedTopics.has(msgIndex)) return;
    setSavedTopics((prev) => new Set(Array.from(prev).concat(msgIndex)));
    // Truncate answer to 500 chars for context
    const context = answer.length > 500 ? answer.slice(0, 497) + "..." : answer;
    saveStudyMutation.mutate({
      topic: question.length > 500 ? question.slice(0, 497) + "..." : question,
      context,
      handSlug: fromSlug ?? undefined,
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const showWelcome = messages.length === 0;

  // Session counter label
  const counterLabel =
    sessionCount === 0
      ? null
      : sessionCount === 1
      ? "1 question this session"
      : `${sessionCount} questions this session`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0e1a" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between shrink-0"
        style={{ background: "rgba(10,14,26,0.95)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          {/* Back to hand link if arrived from replayer */}
          {fromSlug ? (
            <Link href={`/hand/${fromSlug}`}>
              <button
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{
                  color: "#4ade80",
                  border: "1px solid rgba(74,222,128,0.2)",
                  background: "rgba(74,222,128,0.06)",
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {fromTitle ? `Back to "${fromTitle}"` : "Back to hand"}
              </button>
            </Link>
          ) : (
            <Link href="/my-hands">
              <button className="text-sm font-medium" style={{ color: "#64748b" }}>
                ← My Hands
              </button>
            </Link>
          )}
          <span style={{ color: "#334155" }}>/</span>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" style={{ color: "#4ade80" }} />
            <span className="font-bold text-white">AI Coach</span>
          </div>
        </div>

        {/* Right side: session counter + new chat */}
        <div className="flex items-center gap-3">
          {counterLabel && (
            <span
              className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{ color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}
            >
              <Zap className="h-3 w-3" />
              {counterLabel}
            </span>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setSessionCount(0); setSavedTopics(new Set()); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <RotateCcw className="h-3 w-3" />
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {showWelcome ? (
          /* Welcome screen */
          <div
            className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4 py-12"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          >
            {/* Mascot */}
            <div className="relative mb-6">
              <div
                className="w-24 h-24 rounded-2xl overflow-hidden"
                style={{ border: "2px solid rgba(74,222,128,0.3)", boxShadow: "0 0 40px rgba(74,222,128,0.15)" }}
              >
                <img src={MASCOT_URL} alt="AI Coach" className="w-full h-full object-cover" />
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "#16a34a", border: "2px solid #0a0e1a" }}
              >
                <Zap className="h-3 w-3 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white text-center mb-2">
              Instant review, evolve your poker mind.
            </h1>
            <p className="text-center max-w-md mb-8" style={{ color: "#64748b" }}>
              Ask anything — hand lines, theoretical concepts, tournament adjustments, or exploitative reads. Direct answers, no fluff.
            </p>

            {/* Hand context banner — shown when arriving from replayer */}
            {fromSlug && (
              <div
                className="w-full max-w-lg mb-6 rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}
              >
                <Zap className="h-4 w-4 shrink-0" style={{ color: "#4ade80" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {fromTitle ? `Reviewing: "${fromTitle}"` : "Hand context loaded"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                    Input pre-filled below — just press Enter to ask.
                  </p>
                </div>
                <button
                  className="text-xs px-2 py-1 rounded-lg shrink-0"
                  style={{ color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}
                  onClick={() => sendMessage(input)}
                >
                  Ask now →
                </button>
              </div>
            )}

            {/* Quick prompts — 3 visible with shuffle */}
            <div className="w-full max-w-lg space-y-2">
              {visiblePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left px-5 py-3.5 rounded-full text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(74,222,128,0.08)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(74,222,128,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                >
                  {prompt}
                </button>
              ))}

              {/* Shuffle button */}
              <button
                onClick={shufflePrompts}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium transition-all hover:scale-[1.01]"
                style={{
                  background: "transparent",
                  border: "1px dashed rgba(255,255,255,0.12)",
                  color: "#475569",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#475569";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
                }}
              >
                <RefreshCw className="h-3 w-3" />
                Show different questions
              </button>
            </div>
          </div>
        ) : (
          /* Conversation */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, i) => {
              // Find the preceding user message for this assistant response
              const prevUserMsg = msg.role === "assistant" && i > 0 ? messages[i - 1] : null;
              const questionForStudy = msg.question || prevUserMsg?.content || "";

              return (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {msg.role === "assistant" && (
                    <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(74,222,128,0.2)" }}>
                      <img src={MASCOT_URL} alt="Coach" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 max-w-[80%]">
                    <div
                      className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                      style={
                        msg.role === "user"
                          ? { background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", borderBottomRightRadius: "4px" }
                          : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", borderBottomLeftRadius: "4px" }
                      }
                    >
                      {msg.role === "assistant" ? (
                        <Streamdown>{msg.content}</Streamdown>
                      ) : (
                        msg.content
                      )}
                    </div>

                    {/* Study this concept button — only on assistant messages */}
                    {msg.role === "assistant" && questionForStudy && (
                      <button
                        onClick={() => handleSaveTopic(i, questionForStudy, msg.content)}
                        disabled={savedTopics.has(i)}
                        className="self-start flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
                        style={
                          savedTopics.has(i)
                            ? { color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", cursor: "default" }
                            : { color: "#64748b", background: "transparent", border: "1px solid rgba(255,255,255,0.06)" }
                        }
                        onMouseEnter={(e) => {
                          if (!savedTopics.has(i)) {
                            (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!savedTopics.has(i)) {
                            (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
                          }
                        }}
                      >
                        {savedTopics.has(i) ? (
                          <><Check className="h-3 w-3" /> Saved to Study List</>
                        ) : (
                          <><BookOpen className="h-3 w-3" /> Study this concept</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(74,222,128,0.2)" }}>
                  <img src={MASCOT_URL} alt="Coach" className="w-full h-full object-cover" />
                </div>
                <div
                  className="rounded-2xl px-4 py-3 flex items-center gap-1"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderBottomLeftRadius: "4px" }}
                >
                  {[0, 1, 2].map((dot) => (
                    <div
                      key={dot}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: "#4ade80", animationDelay: `${dot * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="sticky bottom-0 border-t px-4 py-3 shrink-0"
        style={{ background: "rgba(10,14,26,0.97)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="flex items-end gap-2 rounded-2xl px-4 py-2"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your game..."
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5"
              style={{
                color: "#e2e8f0",
                maxHeight: "120px",
                lineHeight: "1.5",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: input.trim() && !isTyping ? "linear-gradient(135deg, #16a34a, #15803d)" : "rgba(255,255,255,0.08)" }}
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: "#334155" }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
