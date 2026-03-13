/**
 * AI Coach Chat — Free-form poker Q&A with mascot and quick-question prompts
 * Features:
 *  - 3 visible prompts with shuffle
 *  - Back-to-hand link when arriving from replayer
 *  - Auto-prefill input with hand summary when arriving from replayer
 *  - "Study this concept" save button on each coach response
 *  - Session question counter in the header
 *  - Elapsed time indicator while Claude is thinking
 *  - Daily remaining AI calls badge for free users
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Send, RotateCcw, Zap, RefreshCw, ArrowLeft, BookOpen, Check, Clock, AlertCircle } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  elapsed?: number;  // seconds taken for this response
}

export default function CoachChat() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingCalls, setRemainingCalls] = useState<number | null>(null);
  const [visiblePrompts, setVisiblePrompts] = useState<string[]>(() => getRandomPrompts());
  const [savedTopics, setSavedTopics] = useState<Set<number>>(new Set()); // index of saved assistant messages
  const [sessionCount, setSessionCount] = useState(0); // questions asked this session
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Parse query params for hand context (slug + title from HandReplayer)
  const searchParams = useMemo(
    () => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""),
    []
  );
  const fromSlug = searchParams.get("from");
  const fromTitle = searchParams.get("title");

  // Fetch rate limit status on mount (authenticated users only)
  const { data: rateLimitStatus } = trpc.rateLimit.getStatus.useQuery(undefined, {
    enabled: !!isAuthenticated,
    refetchOnWindowFocus: false,
  });

  // Sync remainingCalls from server on load
  useEffect(() => {
    if (rateLimitStatus && !rateLimitStatus.allowed) {
      setRemainingCalls(0);
    } else if (rateLimitStatus) {
      setRemainingCalls(rateLimitStatus.remaining === Infinity ? null : rateLimitStatus.remaining);
    }
  }, [rateLimitStatus]);

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

  // Start/stop elapsed timer
  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const chatMutation = trpc.chat.ask.useMutation({
    onMutate: () => {
      setIsTyping(true);
      startTimer();
    },
    onSettled: () => {
      setIsTyping(false);
    },
    onSuccess: (data, variables) => {
      const elapsed = stopTimer();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, question: variables.question, elapsed },
      ]);
      setSessionCount((c) => c + 1);
      // Update remaining calls from server response
      if (data.remaining !== null && data.remaining !== undefined) {
        setRemainingCalls(data.remaining);
      }
    },
    onError: (error) => {
      stopTimer();
      const isRateLimit = error.message?.includes("Daily AI limit reached");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isRateLimit
            ? "**Daily limit reached.** You've used all 20 AI calls for today. Your limit resets at midnight UTC.\n\nUpgrade to **Pro** for unlimited access."
            : "Something went wrong. Please try again.",
        },
      ]);
      if (isRateLimit) {
        setRemainingCalls(0);
      }
    },
  });

  const saveStudyMutation = trpc.study.save.useMutation({
    onSuccess: () => toast.success("Saved to your Study List"),
    onError: () => toast.error("Sign in to save study topics"),
  });

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isTyping) return;
      if (remainingCalls === 0) {
        toast.error("Daily AI limit reached. Resets at midnight UTC.");
        return;
      }
      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      chatMutation.mutate({
        question: text.trim(),
        history: messages.slice(-10),
        language: language as "en" | "zh" | "es",
      });
    },
    [messages, isTyping, chatMutation, remainingCalls]
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

  // Remaining calls badge color
  const remainingColor =
    remainingCalls === null
      ? null // Pro user — no badge needed
      : remainingCalls === 0
      ? "#ef4444"
      : remainingCalls <= 5
      ? "#f59e0b"
      : "#4ade80";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--poker-page-bg)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b px-4 py-3 flex items-center justify-between shrink-0"
        style={{ background: "var(--poker-header-bg)", borderColor: "var(--poker-border)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          {/* Back to hand link if arrived from replayer */}
          {fromSlug ? (
            <Link href={`/hand/${fromSlug}`}>
              <button
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
                style={{
                  color: "var(--poker-green)",
                  border: "1px solid var(--poker-green-subtle-border)",
                  background: "var(--poker-green-subtle)",
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {fromTitle ? `Back to "${fromTitle}"` : "Back to hand"}
              </button>
            </Link>
          ) : (
            <Link href="/my-hands">
              <button className="text-sm font-medium" style={{ color: "var(--poker-text-muted)" }}>
                ← My Hands
              </button>
            </Link>
          )}
            <span style={{ color: "var(--poker-text-muted)" }}>/</span>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" style={{ color: "var(--poker-green)" }} />
            <span className="font-bold text-white">{t("coachChatTitle")}</span>
          </div>
        </div>

        {/* Right side: remaining calls + session counter + new chat */}
        <div className="flex items-center gap-3">
          {/* Daily remaining calls badge — only for free authenticated users */}
          {isAuthenticated && remainingCalls !== null && (
            <span
              className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{
                color: remainingColor!,
                background: `${remainingColor}14`,
                border: `1px solid ${remainingColor}26`,
              }}
            >
              {remainingCalls === 0 ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
              {remainingCalls === 0 ? "Limit reached" : `${remainingCalls} calls left today`}
            </span>
          )}

          {counterLabel && (
            <span
              className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{ color: "var(--poker-green)", background: "var(--poker-green-subtle)", border: "1px solid var(--poker-green-subtle-border)" }}
            >
              <Zap className="h-3 w-3" />
              {counterLabel}
            </span>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setSessionCount(0); setSavedTopics(new Set()); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "var(--poker-text-muted)", border: "1px solid var(--poker-border)" }}
            >
              <RotateCcw className="h-3 w-3" />
              {t("coachChatClear")}
            </button>
          )}
          <LanguageToggle />
          <ThemeToggle inline />
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
                style={{ border: "2px solid var(--poker-green-subtle-border)" }}
              >
                <img src={MASCOT_URL} alt="AI Coach" className="w-full h-full object-cover" />
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "var(--poker-green)", border: "2px solid var(--poker-page-bg)" }}
              >
                <Zap className="h-3 w-3 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white text-center mb-2">
              {t("coachChatTitle")}
            </h1>
            <p className="text-center max-w-md mb-8" style={{ color: "var(--poker-text-muted)" }}>
              {t("coachChatWelcome")}
            </p>

            {/* Daily limit notice for free users near limit */}
            {isAuthenticated && remainingCalls !== null && remainingCalls <= 5 && (
              <div
                className="w-full max-w-lg mb-6 rounded-xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: remainingCalls === 0 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                  border: `1px solid ${remainingCalls === 0 ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                }}
              >
                <AlertCircle className="h-4 w-4 shrink-0" style={{ color: remainingCalls === 0 ? "#ef4444" : "#f59e0b" }} />
                <p className="text-sm" style={{ color: remainingCalls === 0 ? "#ef4444" : "#f59e0b" }}>
                  {remainingCalls === 0
                    ? "Daily limit reached. Resets at midnight UTC. Upgrade to Pro for unlimited access."
                    : `${remainingCalls} AI call${remainingCalls === 1 ? "" : "s"} remaining today. Resets at midnight UTC.`}
                </p>
              </div>
            )}

            {/* Hand context banner — shown when arriving from replayer */}
            {fromSlug && (
              <div
                className="w-full max-w-lg mb-6 rounded-xl px-4 py-3 flex items-center gap-3"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}
              >
                <Zap className="h-4 w-4 shrink-0" style={{ color: "var(--poker-green)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--poker-text)" }}>
                    {fromTitle ? `Reviewing: "${fromTitle}"` : "Hand context loaded"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--poker-text-muted)" }}>
                    Input pre-filled below — just press Enter to ask.
                  </p>
                </div>
                <button
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ color: "var(--poker-green)", border: "1px solid var(--poker-green-subtle-border)" }}
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
                  disabled={remainingCalls === 0}
                  className="w-full text-left px-5 py-3.5 rounded-full text-sm font-medium transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--poker-surface)",
                    border: "1px solid var(--poker-border)",
                    color: "var(--poker-text)",
                  }}
                  onMouseEnter={(e) => {
                    if (remainingCalls !== 0) {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--poker-green-subtle)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--poker-green-subtle-border)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--poker-surface)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--poker-border)";
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
                    border: "1px dashed var(--poker-border)",
                    color: "var(--poker-text-muted)",
                  }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--poker-text)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--poker-border-strong)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--poker-text-muted)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--poker-border)";
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
                          : { background: "var(--poker-surface)", border: "1px solid var(--poker-border)", color: "var(--poker-text)", borderBottomLeftRadius: "4px" }
                      }
                    >
                      {msg.role === "assistant" ? (
                        <Streamdown>{msg.content}</Streamdown>
                      ) : (
                        msg.content
                      )}
                    </div>

                    {/* Elapsed time + Study button row — only on assistant messages */}
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2">
                        {/* Elapsed time */}
                        {msg.elapsed !== undefined && msg.elapsed > 0 && (
                          <span
                            className="flex items-center gap-1 text-xs"
                            style={{ color: "var(--poker-text-muted)" }}
                          >
                            <Clock className="h-3 w-3" />
                            {msg.elapsed}s
                          </span>
                        )}

                        {/* Study this concept button */}
                        {questionForStudy && (
                          <button
                            onClick={() => handleSaveTopic(i, questionForStudy, msg.content)}
                            disabled={savedTopics.has(i)}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all"
                            style={
                              savedTopics.has(i)
                                ? { color: "var(--poker-green)", background: "var(--poker-green-subtle)", border: "1px solid var(--poker-green-subtle-border)", cursor: "default" }
                                : { color: "var(--poker-text-muted)", background: "transparent", border: "1px solid var(--poker-border)" }
                            }
                            onMouseEnter={(e) => {
                              if (!savedTopics.has(i)) {
                              (e.currentTarget as HTMLButtonElement).style.color = "var(--poker-text)";
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--poker-border-strong)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!savedTopics.has(i)) {
                              (e.currentTarget as HTMLButtonElement).style.color = "var(--poker-text-muted)";
                              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--poker-border)";
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
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator with elapsed timer */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(74,222,128,0.2)" }}>
                  <img src={MASCOT_URL} alt="Coach" className="w-full h-full object-cover" />
                </div>
                <div
                  className="rounded-2xl px-4 py-3 flex items-center gap-3"
                  style={{ background: "var(--poker-surface)", border: "1px solid var(--poker-border)", borderBottomLeftRadius: "4px" }}
                >
                  {/* Animated dots */}
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((dot) => (
                      <div
                        key={dot}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: "var(--poker-green)", animationDelay: `${dot * 0.15}s` }}
                      />
                    ))}
                  </div>
                  {/* Elapsed time */}
                  <span
                    className="flex items-center gap-1 text-xs font-mono"
                    style={{ color: "var(--poker-green)" }}
                  >
                    <Clock className="h-3 w-3" />
                    Thinking... {elapsedSeconds}s
                  </span>
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
        style={{ background: "var(--poker-header-bg)", borderColor: "var(--poker-border)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="flex items-end gap-2 rounded-2xl px-4 py-2"
            style={{
              background: "var(--poker-surface)",
              border: `1px solid ${remainingCalls === 0 ? "rgba(239,68,68,0.3)" : "var(--poker-border)"}`,

            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={remainingCalls === 0 ? t("coachRateLimitHit") : t("coachChatPlaceholder")}
              disabled={remainingCalls === 0}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5 disabled:cursor-not-allowed"
              style={{
                color: remainingCalls === 0 ? "var(--poker-text-muted)" : "var(--poker-text)",
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
              disabled={!input.trim() || isTyping || remainingCalls === 0}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: input.trim() && !isTyping && remainingCalls !== 0 ? "var(--poker-green)" : "var(--poker-surface-2)" }}
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: "var(--poker-text-muted)" }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
