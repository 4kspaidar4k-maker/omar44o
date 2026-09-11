"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Send,
  Bot,
  User,
  Sparkles,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "أهلاً بك في مكتبة أبو طوق! أنا مساعدك الذكي 🤖\nأقدر أساعدك بأي سؤال، وأبحث لك داخل منتجات المكتبة من الدوسيات والقرطاسية والألعاب. كيف يمكنني مساعدتك اليوم؟",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setInput("");

    const newUserMessage: Message = {
      role: "user",
      content: userQuery,
    };

    const updatedMessages: Message[] = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // إرسال الرسالة إلى مسار السيرفر الخلفي الذي يحتوي على المفتاح
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const responseText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `السيرفر أعاد ردًا غير صالح. كود الحالة: ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error || "حدث خطأ في المساعد الذكي."
        );
      }

      const aiReply =
        data?.reply || "عذرًا، لم أستطع تجهيز الإجابة حاليًا.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiReply,
        },
      ]);
    } catch (error: any) {
      console.error("AI Chat Error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error?.message ||
            "حدث خطأ في الاتصال بالمساعد الذكي. حاول مرة أخرى.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-800 flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-blue-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition"
              title="الرجوع للرئيسية"
            >
              <ArrowRight className="w-6 h-6" />
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-600 rounded-xl text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>

              <h1 className="text-lg md:text-xl font-black text-blue-950">
                مساعد مكتبة أبو طوق الذكي
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6 w-full flex-1 flex flex-col">
        <div className="bg-white border border-blue-100 rounded-3xl p-4 sm:p-6 shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="overflow-y-auto space-y-4 pr-2 max-h-[65vh] flex-1">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 border border-blue-100"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>

                {/* Message */}
                <div
                  className={`p-4 rounded-2xl max-w-[85%] text-sm sm:text-base leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none shadow-sm"
                      : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 animate-spin" />
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 text-slate-500 text-sm rounded-tl-none border border-slate-200 animate-pulse">
                  أبحث في منتجات المكتبة وأجهز الإجابة...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="اسألني عن أي دوسية، مادة، سعر، أو منتجات المكتبة..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 font-medium text-slate-900"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl transition shadow-sm flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        ©️ مكتبة أبو طوق - المدعوم بالذكاء الاصطناعي
      </footer>
    </div>
  );
}