"use client";

import React, { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";

export default function ChatWidget() {
  const { addToCart } = useCart() as any;
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
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
            product: data.product, // يحتفظ ببيانات المنتج إن وجد
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCartAndGo = (product: any) => {
    // 1. إضافة المنتج إلى السلة
    addToCart(
      {
        id: product.id,
        name: product.title,
        price: Number(product.price),
        image: product.image,
      },
      1
    );

    // 2. الانتقال المباشر إلى صفحة السلة
    router.push("/cart");
  };

  return (
    <div className="flex flex-col h-[500px] w-full max-w-lg bg-white border rounded-2xl p-4 shadow-lg">
      <div className="flex-1 overflow-y-auto space-y-4 p-2">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            {/* نص الرسالة */}
            <div
              className={`p-3 rounded-2xl max-w-[80%] text-sm font-bold ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-slate-100 text-slate-800 rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>

            {/* عرض بطاقة المنتج إذا وُجدت مع رسالة الـ AI */}
            {msg.product && (
              <div className="mt-3 w-64 bg-white border border-blue-200 rounded-2xl overflow-hidden shadow-md">
                {msg.product.image ? (
                  <img
                    src={msg.product.image}
                    alt={msg.product.title}
                    className="w-full h-36 object-cover"
                  />
                ) : (
                  <div className="w-full h-36 bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
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
                    className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    أضف للسلة والانتقال
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="text-xs text-slate-400 font-bold animate-pulse">
            جاري التفكير...
          </div>
        )}
      </div>

      {/* منطقة الإدخال */}
      <div className="flex gap-2 mt-2 pt-2 border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="اسأل عن أي دوسية أو بطاقة..."
          className="flex-1 px-4 py-2 border rounded-xl text-sm font-bold outline-none focus:border-blue-500"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700"
        >
          إرسال
        </button>
      </div>
    </div>
  );
}
