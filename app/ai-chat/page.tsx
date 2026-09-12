"use client";

import React, { useState, useRef, useEffect } from "react";

interface Product {
  id: string;
  title: string;
  price?: number;
  image_url?: string;
  category?: string;
  subject?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "أهلاً بك في مكتبة أبو طوق! أنا مساعدك الذكي 🤖. أقدر أساعدك بأي سؤال، وأبحث لك داخل منتجات المكتبة من الدوسيات والقرطاسية والألعاب. كيف يمكنني مساعدتك اليوم؟",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ في الاتصال");
      }

      // حفظ المنتجات المرجعة من قاعدة البيانات لتتم مطابقتها وعرض صورها
      if (data.products) {
        setProducts(data.products);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "أهلاً بك، كيف بقدر أساعدك اليوم؟" },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "عذراً، صار في مشكلة بالاتصال. جرب مرة أخرى." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // دالة إضافة المنتج إلى السلة (يمكنك ربطها بنظام السلة الخاص بموقعك هنا)
  const handleAddToCart = (product: Product) => {
    // مثال: تخزين في LocalStorage أو استدعاء دالة سلة التسوق الخاصة بك
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.push(product);
    localStorage.setItem("cart", JSON.stringify(cart));
    alert(`تم إضافة "${product.title}" إلى السلة بنجاح! 🛒`);
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* رأس الشات */}
      <div className="bg-blue-900 text-white p-4 flex items-center justify-between">
        <h2 className="font-bold text-lg">مساعد مكتبة أبو طوق الذكي</h2>
        <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
      </div>

      {/* صندوق عرض الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {/* فقاعة النص */}
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>

            {/* إذا كانت الرسالة من المساعد، نبحث إذا كان الرد يحتوي على اسم منتج لنعرض صورته وزر السلة */}
            {msg.role === "assistant" && products.length > 0 && (
              <div className="w-full mt-2 space-y-2">
                {products.map((product) => {
                  // التحقق إذا كان اسم المنتج مذكوراً داخل رد الذكاء الاصطناعي
                  if (msg.content.includes(product.title)) {
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between bg-white border border-blue-100 p-3 rounded-xl shadow-sm max-w-md"
                      >
                        {/* صورة المنتج */}
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-14 h-14 object-cover rounded-lg border border-gray-100"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                              بدون صورة
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">{product.title}</h4>
                            <p className="text-blue-600 font-semibold text-xs mt-0.5">
                              {product.price ? `${product.price} د.أ` : "السعر غير محدد"}
                            </p>
                          </div>
                        </div>

                        {/* زر إضافة إلى السلة */}
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-lg font-medium transition shadow-sm"
                        >
                          إضافة للسلة 🛒
                        </button>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 space-x-reverse text-gray-400 text-sm">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-.2s]"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-.4s]"></div>
            <span>المساعد قاعد بيكتب...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* صندوق الإدخال */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اسألني عن أي دوسية، مادة، سعر، أو منتج..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center"
        >
          إرسال
        </button>
      </form>
    </div>
  );
}

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
