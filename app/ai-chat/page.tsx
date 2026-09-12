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
      content: "يا هلا وغلا بمكتبة أبو طوق! منور يا غالي 🤖. أنا مساعدك الذكي، اطلب وتمنى، شو أخدمك اليوم؟",
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
        throw new Error(data.error || "خطأ بالاتصال");
      }

      if (data.products) {
        setProducts(data.products);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "يا هلا بيك، تامر أمر!" },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "صار في مشكلة بسيطة باتصال النت يا غالي، جرب مرة ثانية." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart.push(product);
    localStorage.setItem("cart", JSON.stringify(cart));
    alert(`تم إضافة "${product.title}" إلى السلة بنجاح يا غالي! 🛒`);
  };

  return (
    <div className="flex flex-col h-[650px] w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden font-sans">
      {/* رأس الشات بلون أزرق وأبيض مرتب وأنيق */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h2 className="font-bold text-base">مساعد مكتبة أبو طوق الذكي</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-700/50 px-2.5 py-1 rounded-full text-xs">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>متواجد لخدمتك</span>
        </div>
      </div>

      {/* صندوق عرض الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-blue-50/30">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none shadow-sm"
                  : "bg-white text-gray-800 border border-blue-100 shadow-sm rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>

            {/* عرض صورة المنتج وزر السلة تحته إن وجد في الرد */}
            {msg.role === "assistant" && products.length > 0 && (
              <div className="w-full mt-2 space-y-2">
                {products.map((product) => {
                  if (msg.content.includes(product.title)) {
                    return (
                      <div
                        key={product.id}
                        className="flex flex-col sm:flex-row items-center justify-between bg-white border border-blue-200 p-3 rounded-xl shadow-sm max-w-sm gap-3"
                      >
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center text-xs text-blue-400 flex-shrink-0">
                              بدون صورة
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-gray-800 text-sm truncate">{product.title}</h4>
                            <p className="text-blue-600 font-semibold text-xs mt-1">
                              {product.price ? `${product.price} د.أ` : "السعر حسب الطلب"}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddToCart(product)}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2.5 rounded-lg font-medium transition shadow-sm flex items-center justify-center gap-1"
                        >
                          <span>إضافة للسلة</span>
                          <span>🛒</span>
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
          <div className="flex items-center space-x-2 space-x-reverse text-blue-500 text-xs font-medium bg-white p-2 rounded-xl w-fit shadow-sm border border-blue-100">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-.2s]"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-.4s]"></div>
            <span>المساعد قاعد بيفكر وبيكتب...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* صندوق الإدخال (مع حجم خط 16px لمنع التكبير التلقائي على الهواتف) */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-blue-100 flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب طلبك هون يا غالي..."
          style={{ fontSize: "16px" }} 
          className="flex-1 border border-blue-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 bg-blue-50/20 text-gray-800 placeholder-gray-400"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm flex items-center justify-center flex-shrink-0"
        >
          إرسال
        </button>
      </form>
    </div>
  );
}
