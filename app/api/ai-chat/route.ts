"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, ShoppingCart, Bot, User, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string;
  products?: any[];
};

export default function AbuToqChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "أهلاً وسهلاً فيك بمكتبة أبو طوق! كيف بقدر أساعدك اليوم؟",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    const userMsgId = Date.now().toString();

    setMessages((prev) => [...prev, { id: userMsgId, sender: "user", text: userText }]);
    setInputText("");
    setLoading(true);

    try {
      // فحص إذا كان الزبون قاعد بيمزح أو بيستهبل بسؤال ما له داعي
      const lowercaseText = userText.toLowerCase();
      const nonsenseWords = ["بطاطا", "تخوت", "سيارة", "طيارة", "هبل", "تاريخ الميلاد", "بحبك", "من وين أنت"];
      const isNonsense = nonsenseWords.some((word) => lowercaseText.includes(word)) && !lowercaseText.includes("دوسية") && !lowercaseText.includes("قلم") && !lowercaseText.includes("كتاب");

      if (isNonsense) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: "أنت جاي تمزح معي ولا جاي تشتري؟ اخلص شو بدك من المكتبة؟",
          },
        ]);
        setLoading(false);
        return;
      }

      // البحث عن المنتجات المطلوبة في قاعدة البيانات (Supabase)
      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .ilike("title", `%${userText}%`)
        .limit(3);

      if (error) {
        console.error("Chat search error:", error);
      }

      if (products && products.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: "تفضل يا غالي، لقيت لك هاد الطلب:",
            products: products,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: "والله يا اخوي ما لقيت اشي بهذا الاسم عندي بالمكتبة، جرب اطلب اشي تاني.",
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "صار في خطأ صغير، رجع اطلب كمان مرة يا وحش.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addToCartFromChat = (product: any) => {
    try {
      const existingCart = localStorage.getItem("abutoq_cart");
      let cart = existingCart ? JSON.parse(existingCart) : [];
      const index = cart.findIndex((item: any) => item.id === product.id);

      if (index > -1) {
        cart[index].quantity += 1;
      } else {
        cart.push({
          id: product.id,
          name: product.title,
          price: product.price,
          image: product.image,
          quantity: 1,
        });
      }

      localStorage.setItem("abutoq_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("storage"));
      alert(`تم إضافة "${product.title}" لسلتك يا غالي! 🛒`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition hover:scale-105"
          title="مساعد مكتبة أبو طوق"
        >
          <Bot className="w-7 h-7" />
        </button>
      ) : (
        <div className="bg-white border border-blue-100 rounded-3xl shadow-2xl w-[90vw] sm:w-[380px] h-[500px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* رأس الشات */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm">مساعد أبو طوق</h3>
                <span className="text-[10px] text-blue-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  جاهز لخدمتك
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* محتوى الرسائل */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] font-medium leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-bl-none"
                      : "bg-white text-slate-800 border border-slate-200 rounded-br-none shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>

                {/* عرض المنتجات إن وجدت مع كبسة الإضافة للسلة */}
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-2 space-y-2 w-full">
                    {msg.products.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white border border-blue-100 rounded-2xl p-2.5 shadow-sm flex items-center gap-3"
                      >
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded-xl border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <ShoppingCart className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-blue-950 truncate">{product.title}</p>
                          <p className="text-emerald-600 font-black mt-0.5">{product.price} د.أ</p>
                        </div>
                        <button
                          onClick={() => addToCartFromChat(product)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] shrink-0 shadow-sm transition flex items-center gap-1"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>أضف</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 text-slate-400 p-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* صندوق الكتابة */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب طلبك هون..."
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-sm"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
