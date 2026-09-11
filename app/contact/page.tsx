"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Phone, Mail, Send, CheckCircle, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [messageType, setMessageType] = useState("شكوى");
  const [messageContent, setMessageContent] = useState("");
  const [isSent, setIsSent] = useState(false);

  // رقم هاتف المكتبة المعتمد للتواصل والواتساب
  const libraryPhoneNumber = "+962790000000"; 
  const libraryEmail = "abu.touq.library@gmail.com";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !messageContent) return;

    // فتح البريد الإلكتروني تلقائياً مع تفاصيل الرسالة
    const mailtoLink = `mailto:${libraryEmail}?subject=رسالة جديدة من الموقع - ${messageType} (${senderName})&body=الاسم: ${senderName}%0D%0Aالبريد: ${senderEmail}%0D%0Aنوع الرسالة: ${messageType}%0D%0A%0D%0Aالنص:%0D%0A${messageContent}`;
    
    window.location.href = mailtoLink;
    setIsSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-blue-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition">
            <ArrowRight className="w-6 h-6" />
          </Link>
          <h1 className="text-xl md:text-2xl font-black text-blue-950">اتصال وشكاوى مكتبة أبو طوق</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* معلومات الاتصال السريع */}
          <div className="space-y-4">
            <div className="bg-white border border-blue-100 p-6 rounded-3xl shadow-sm text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-500 text-xs mb-1">رقم الهاتف والواتساب</h3>
              <a href={`tel:${libraryPhoneNumber}`} className="text-lg font-black text-blue-950 hover:text-blue-600 transition" dir="ltr">
                079 000 0000
              </a>
            </div>

            <div className="bg-white border border-blue-100 p-6 rounded-3xl shadow-sm text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-500 text-xs mb-1">البريد الإلكتروني</h3>
              <span className="text-xs font-black text-slate-800 break-all">{libraryEmail}</span>
            </div>
          </div>

          {/* نموذج إرسال الشكاوى والاقتراحات والطلبات */}
          <div className="md:col-span-2 bg-white border border-blue-100 p-8 rounded-3xl shadow-sm">
            <h2 className="text-xl font-black text-blue-950 mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>أرسل لنا شكوى، اقتراح، أو طلب تعديل</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              نحن نحرص على خدمتكم وتطوير عملنا باستمرار. أرسل لنا رسالتك وسنرد عليك في أقرب وقت.
            </p>

            {isSent ? (
              <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                <h3 className="font-black text-emerald-900 text-lg mb-1">تم تجهيز وإرسال رسالتك بنجاح</h3>
                <p className="text-xs text-emerald-700">تم فتح برنامج البريد الإلكتروني الخاص بك لإرسال الرسالة للمكتبة.</p>
                <button
                  onClick={() => setIsSent(false)}
                  className="mt-6 px-6 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition"
                >
                  إرسال رسالة أخرى
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">الاسم الكريم</label>
                  <input
                    required
                    type="text"
                    placeholder="ادخل اسمك..."
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 text-slate-900 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">البريد الإلكتروني (اختياري)</label>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 text-slate-900 font-medium text-left"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">نوع المراسلة</label>
                    <select
                      value={messageType}
                      onChange={(e) => setMessageType(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-blue-600"
                    >
                      <option value="شكوى">شكوى</option>
                      <option value="اقتراح">اقتراح تطوير</option>
                      <option value="طلب تعديل">طلب تعديل على مادة/منتج</option>
                      <option value="استفسار عام">استفسار عام</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">تفاصيل الرسالة أو الشكوى</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="اكتب تفاصيل الشكوى، الاقتراح، أو التعديل المطلوب هنا..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-600 text-slate-900 font-medium resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition shadow-sm text-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال الرسالة عبر البريد الإلكتروني</span>
                </button>
              </form>
            )}
          </div>

        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        © مكتبة أبو طوق - جميع الحقوق محفوظة
      </footer>
    </div>
  );
}