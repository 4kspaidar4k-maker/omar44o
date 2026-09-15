"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { ShoppingCart, Send, Bot, User, Sparkles } from "lucide-react";

export default function ChatWidget() {
  const { addToCart } = useCart() as any;
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // التمرير التلقائي لأسفل المحادثة عند إضافة رسائل جديدة
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            product: data.product,
          },
        ]);
      }
    } catch (err) {
      console.error("CHAT ERROR:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "عذراً، حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCartAndGo = (product: any) => {
    addToCart(
      {
        id: product.id,
        name: product.title,
        price: Number(product.price),
        image: product.image,
      },
      1
    );

    router.push("/cart");
  };

  return (
    <div className="flex flex-col h-[550px] w-full max-w-xl bg-white border border-blue-100 rounded-3xl p-4 shadow-xl overflow-hidden">
      {/* رأس شاشة المحادثة */}
      <div className="flex items-center gap-3 pb-3 mb-2 border-b border-blue-100 px-2">
        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-900">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-black text-blue-950 text-base">مساعد مكتبة أبو طوق الذكي</h3>
          <p className="text-xs text-slate-500 font-medium">اسأل عن البطاقات، الدوسيات، والقرطاسية</p>
        </div>
      </div>

      {/* منطقة عرض الرسائل */}
      <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Sparkles className="w-10 h-10 text-blue-400 mb-2 animate-bounce" />
            <p className="text-sm font-bold text-slate-600">مرحباً بك! كيف يمكنني مساعدتك اليوم؟</p>
            <p className="text-xs text-slate-400 mt-1">اكتب اسم الدوسية أو المادة التي تبحث عنها</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* أيقونة المرسل */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                msg.role === "user"
                  ? "bg-blue-900 text-white"
                  : "bg-blue-100 text-blue-900"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* محتوى الرسالة */}
            <div className="flex flex-col max-w-[80%]">
              <div
                className={`p-3.5 rounded-2xl text-sm font-bold leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-900 text-white rounded-tr-none shadow-sm"
                    : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60"
                }`}
              >
                {msg.content}
              </div>

              {/* كرت المنتج إذا توفر */}
              {msg.product && (
                <div className="mt-3 bg-white border border-blue-200 rounded-2xl overflow-hidden shadow-md group">
                  {msg.product.image ? (
                    <img
                      src={msg.product.image}
                      alt={msg.product.title}
                      className="w-full h-36 object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 bg-blue-50 flex items-center justify-center text-blue-400 font-bold text-xs">
                      بدون صورة
                    </div>
                  )}
                  <div className="p-3">
                    <h4 className="font-black text-sm text-blue-950 line-clamp-1">
                      {msg.product.title}
                    </h4>
                    <p className="text-blue-700 font-black text-sm mt-1">
                      {msg.product.price} د.أ
                    </p>
                    <button
                      onClick={() => handleAddToCartAndGo(msg.product)}
                      className="w-full mt-3 py-2 px-3 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition shadow flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      إضافة للسلة وإتمام الطلب
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* مؤشر جاري التحميل */}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 font-bold text-xs p-2">
            <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center animate-spin">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span>مساعد أبو طوق يفكر...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* منطقة الإدخال */}
      <div className="flex gap-2 mt-2 pt-3 border-t border-blue-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="اكتب استفسارك هنا..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>إرسال</span>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
