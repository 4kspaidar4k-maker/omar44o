"use client";
import React, { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Send,
  Bot,
  User,
  Sparkles,
  RotateCcw,
} from "lucide-react";
type Message = {
  role: "user" | "assistant";
  content: string;
  product?: {
    id: string | number;
    title: string;
    price: number;
    image?: string;
  };
};
export default function ChatWidget() {
  const { addToCart } = useCart() as any;
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /* التمرير لآخر رسالة */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);
  /* إرسال الرسالة */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMessage: Message = {
      role: "user",
      content: text,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data?.reply) {
        throw new Error("لم يصل رد من الذكاء الاصطناعي");
      }
      const assistantMessage: Message = {
        role: "assistant",
        content: String(data.reply),
        product: data.product || undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI CHAT ERROR:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "عذراً، صار خطأ بسيط أثناء الاتصال بالمساعد. حاول مرة ثانية بعد قليل.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };
  /* إضافة المنتج للسلة والذهاب للسلة */
  const handleAddToCartAndGo = (product: Message["product"]) => {
    if (!product) return;
    addToCart(
      {
        id: String(product.id),
        name: product.title,
        price: Number(product.price),
        image: product.image,
      },
      1
    );
    router.push("/cart");
  };
  /* محادثة جديدة */
  const resetChat = () => {
    if (loading) return;
    setMessages([]);
    setInput("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };
  /* اقتراحات البداية */
  const quickQuestions = [
    "عندكم دوسيات جيل 2010؟",
    "بدي دوسية رياضيات",
    "شو عندكم بطاقات؟",
  ];
  return (
    <main
      dir="rtl"
      className="min-h-[100dvh] w-full bg-white text-slate-900 flex flex-col"
    >
      {/* ================= HEADER ================= */}
      <header className="shrink-0 w-full bg-white border-b border-slate-100">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          <div className="h-[72px] flex items-center justify-between">
            {/* معلومات المساعد */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-blue-800" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black text-slate-950 truncate">
                  مساعد مكتبة أبو طوق
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[11px] sm:text-xs text-slate-400 font-bold">
                    المساعد الذكي
                  </p>
                </div>
              </div>
            </div>
            {/* محادثة جديدة */}
            <button
              type="button"
              onClick={resetChat}
              disabled={loading || messages.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-800 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition"
              aria-label="محادثة جديدة"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">محادثة جديدة</span>
            </button>
          </div>
        </div>
      </header>
      {/* ================= CHAT ================= */}
      <section className="flex-1 min-h-0 w-full overflow-hidden">
        <div className="h-full w-full max-w-4xl mx-auto overflow-y-auto">
          <div className="min-h-full px-4 sm:px-6 py-6 sm:py-8">
            {/* الشاشة الترحيبية */}
            {messages.length === 0 && !loading && (
              <div className="min-h-[calc(100dvh-170px)] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
                  <Sparkles className="w-8 h-8 text-blue-700" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950">
                  أهلاً فيك 👋
                </h2>
                <p className="mt-2 text-sm text-slate-400 font-medium max-w-md leading-6">
                  أنا مساعد مكتبة أبو طوق. اسألني عن الدوسيات والبطاقات
                  والقرطاسية، وسأساعدك في العثور على اللي بدك إياه.
                </p>
                {/* اقتراحات */}
                <div className="w-full max-w-md mt-7 grid gap-2">
                  {quickQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => {
                        setInput(question);
                        setTimeout(() => {
                          inputRef.current?.focus();
                        }, 50);
                      }}
                      className="w-full text-right px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50 transition text-xs sm:text-sm font-bold text-slate-700"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* الرسائل */}
            <div className="space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={`${index}-${msg.role}`}
                    className={`flex items-start gap-3 ${
                      isUser ? "justify-start" : "justify-end"
                    }`}
                  >
                    {/* أيقونة المستخدم */}
                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`flex flex-col ${
                        isUser
                          ? "items-start max-w-[85%] sm:max-w-[70%]"
                          : "items-end w-full max-w-[92%] sm:max-w-[78%]"
                      }`}
                    >
                      {/* الرسالة */}
                      <div
                        className={
                          isUser
                            ? "px-4 py-3 rounded-2xl rounded-tr-md bg-slate-900 text-white text-sm font-bold leading-7 shadow-sm"
                            : "px-4 py-3 rounded-2xl rounded-tl-md bg-slate-50 border border-slate-100 text-slate-800 text-sm font-bold leading-7 w-fit"
                        }
                      >
                        {msg.content}
                      </div>
                      {/* كرت المنتج */}
                      {msg.product && (
                        <div className="w-full max-w-sm mt-3 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          {/* صورة المنتج */}
                          {msg.product.image ? (
                            <div className="relative w-full aspect-[2/3] max-h-[300px] bg-slate-100">
                              <img
                                src={msg.product.image}
                                alt={msg.product.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target =
                                    e.currentTarget as HTMLImageElement;
                                  target.style.display = "none";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-32 bg-slate-50 flex items-center justify-center">
                              <Bot className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                          {/* تفاصيل المنتج */}
                          <div className="p-4">
                            <h3 className="text-sm font-black text-slate-950 leading-6">
                              {msg.product.title}
                            </h3>
                            <div className="flex items-center justify-between gap-3 mt-3">
                              <span className="text-base font-black text-blue-800">
                                {Number(msg.product.price || 0).toFixed(2)} د.أ
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddToCartAndGo(msg.product)
                                }
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-900 text-white text-xs font-black transition shadow-sm"
                              >
                                <ShoppingCart className="w-4 h-4" />
                                إضافة للسلة
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* أيقونة المساعد */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
              {/* جاري التفكير */}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: "120ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: "240ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      </section>
      {/* ================= INPUT ================= */}
      <footer className="shrink-0 w-full bg-white border-t border-slate-100">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-blue-300 focus-within:bg-white transition shadow-sm">
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="on"
              spellCheck={false}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="اكتب سؤالك هنا..."
              disabled={loading}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none px-3 py-2.5 text-[16px] sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 disabled:opacity-50"
              style={{
                fontSize: "16px",
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-11 h-11 shrink-0 rounded-xl bg-slate-900 hover:bg-blue-900 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition shadow-sm"
              aria-label="إرسال"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-300 font-medium mt-2">
            مساعد مكتبة أبو طوق • اسأل عن منتجات المكتبة
          </p>
        </div>
      </footer>
    </main>
  );
}
