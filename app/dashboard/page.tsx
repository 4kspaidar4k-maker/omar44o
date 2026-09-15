"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  PlusCircle,
  Trash2,
  BookOpen,
  ShoppingBag,
  ClipboardList,
  Upload,
  MapPin,
  Phone,
  User,
  Check,
  Navigation,
  Truck,
  Clock,
  Bell,
  X,
  Layers,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Tab = "dossiers" | "stationery" | "orders";

type DossierType = "مادة" | "مكثف" | "بنك أسئلة";

type StationeryCategory = "قرطاسية" | "أدوات" | "ألعاب";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
};

type Order = {
  id: string;
  created_at: string;
  customer: string;
  phone: string;
  location?: string | null;
  map_link?: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  delete_after?: string | null;
  items: OrderItem[];
};

// قائمة المواد المتاحة لجيل 2009 وجيل 2010
const SUBJECTS_2009_2010 = [
  "التربية الإسلامية",
  "اللغة العربية (تخصص)",
  "اللغة العربية (مهارات)",
  "اللغة الإنجليزية",
  "الرياضيات (علمي)",
  "الرياضيات (أدبي)",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "علوم الأرض والبيئة",
  "تاريخ الأردن",
  "الجغرافيا",
  "الحاسوب",
  "العلوم المالية والمصرفية",
];

// قائمة المواد الافتراضية للأجيال الأخرى (2007، 2008)
const SUBJECTS_OTHERS = [
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "تاريخ الأردن",
];

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("orders");

  const [dossiers, setDossiers] = useState<any[]>([]);
  const [stationery, setStationery] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");

  const [year, setYear] = useState("2010");
  const [semester, setSemester] = useState("الأول");
  const [subject, setSubject] = useState("الرياضيات (علمي)");
  const [dossierType, setDossierType] = useState<DossierType>("مادة");

  const [categoryType, setCategoryType] = useState<StationeryCategory>("قرطاسية");
  const [imagePreview, setImagePreview] = useState("");

  const [notification, setNotification] = useState<{ id: string; customer: string } | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const firstOrdersLoadRef = useRef(true);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  // تغيير المادة المحددة تلقائياً عند تغيير الجيل لتجنب خيارات غير منطقية
  const handleYearChange = (selectedYear: string) => {
    setYear(selectedYear);
    if (selectedYear === "2009" || selectedYear === "2010") {
      setSubject(SUBJECTS_2009_2010[0]);
    } else {
      setSubject(SUBJECTS_OTHERS[0]);
    }
  };

  const filteredDossiers = dossiers.filter((item: any) => {
    if (!normalizedSearch) return true;
    return [
      item.title,
      item.subject,
      item.year,
      item.semester,
      item.dossier_type,
      item.category,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });

  const filteredStationery = stationery.filter((item: any) => {
    if (!normalizedSearch) return true;
    return [item.title, item.category]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });

  const filteredOrders = orders.filter((order) => {
    if (!normalizedSearch) return true;
    const orderItems = order.items?.map((item) => item.name).join(" ") || "";
    return [
      order.id,
      order.customer,
      order.phone,
      order.location,
      order.status,
      orderItems,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });

  const isOrderExpired = (order: Order) => {
    if (!order.delete_after) return false;
    const deleteTime = new Date(order.delete_after).getTime();
    return !Number.isNaN(deleteTime) && deleteTime <= Date.now();
  };

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);

      setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 700);
    } catch (error) {
      console.log("Notification sound could not play:", error);
    }
  };

  const showBrowserNotification = (order: Order) => {
    try {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission === "granted") {
        new Notification("🔔 طلب جديد - مكتبة أبو طوق", {
          body: `وصل طلب جديد من ${order.customer}`,
          icon: "/favicon.ico",
        });
      }
    } catch (error) {
      console.log("Browser notification error:", error);
    }
  };

  const showNewOrderNotification = (order: Order) => {
    setNotification({ id: order.id, customer: order.customer });
    playNotificationSound();
    showBrowserNotification(order);

    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => setNotification(null), 8000);
  };

  const requestNotificationPermission = async () => {
    try {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission === "default") await Notification.requestPermission();
    } catch (error) {
      console.log("Notification permission error:", error);
    }
  };

  const loadProductsOnly = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("SUPABASE PRODUCTS LOAD ERROR:", error);
        alert("تعذر تحميل المنتجات: " + error.message);
      } else {
        const allProducts = data || [];
        setDossiers(allProducts.filter((item: any) => item.category === "دوسيات"));
        setStationery(
          allProducts.filter(
            (item: any) =>
              item.category === "قرطاسية" ||
              item.category === "أدوات" ||
              item.category === "ألعاب"
          )
        );
      }
    } catch (error: any) {
      console.error("LOAD PRODUCTS ERROR:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadOrdersOnly = async (silent = false) => {
    if (!silent) setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("SUPABASE ORDERS LOAD ERROR:", error);
        if (!silent) alert("تعذر تحميل الطلبات: " + error.message);
      } else {
        const allOrders = (data || []) as Order[];
        const expiredOrders = allOrders.filter((order) => isOrderExpired(order));

        if (expiredOrders.length > 0) {
          const expiredIds = expiredOrders.map((order) => order.id);
          await supabase.from("orders").delete().in("id", expiredIds);
        }

        const activeOrders = allOrders.filter((order) => !isOrderExpired(order));
        setOrders(activeOrders);

        const currentIds = new Set(activeOrders.map((order) => order.id));

        if (firstOrdersLoadRef.current) {
          knownOrderIdsRef.current = currentIds;
          firstOrdersLoadRef.current = false;
        } else if (silent) {
          const newlyArrivedOrders = activeOrders.filter(
            (order) =>
              (order.status === "قيد التجهيز والتوصيل" || order.status === "قيد التجهيز") &&
              !knownOrderIdsRef.current.has(order.id)
          );

          knownOrderIdsRef.current = currentIds;

          if (newlyArrivedOrders.length > 0) {
            showNewOrderNotification(newlyArrivedOrders[0]);
          }
        } else {
          knownOrderIdsRef.current = currentIds;
        }
      }
    } catch (error: any) {
      console.error("LOAD ORDERS ERROR:", error);
    } finally {
      if (!silent) setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    requestNotificationPermission();
    loadProductsOnly();
    loadOrdersOnly(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      loadOrdersOnly(true);
    }, 180000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "201028") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("كلمة المرور غير صحيحة.");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("اكتب اسم العنصر أولاً.");
      return;
    }

    if (!price || Number.isNaN(Number(price))) {
      alert("اكتب السعر بشكل صحيح.");
      return;
    }

    const numericPrice = Number(price);
    if (numericPrice < 0) {
      alert("السعر لا يمكن أن يكون سالباً.");
      return;
    }

    const isDossier = activeTab === "dossiers";

    const newItem = {
      title: title.trim(),
      price: numericPrice,
      year: isDossier ? year : null,
      semester: isDossier ? semester : null,
      subject: isDossier ? subject : null,
      dossier_type: isDossier ? dossierType : null,
      category: isDossier ? "دوسيات" : categoryType,
      image: imagePreview || null,
    };

    setLoadingProducts(true);

    try {
      const { data, error } = await supabase.from("products").insert([newItem]).select().single();

      if (error) {
        console.error("SUPABASE INSERT ERROR:", error);
        alert("لم يتم حفظ المنتج: " + error.message);
        return;
      }

      if (isDossier) {
        setDossiers((prev) => [data, ...prev]);
      } else {
        setStationery((prev) => [data, ...prev]);
      }

      setTitle("");
      setPrice("");
      setImagePreview("");
      alert("تم حفظ المنتج ونشره بنجاح!");
    } catch (error: any) {
      console.error("UNEXPECTED INSERT ERROR:", error);
      alert("حدث خطأ غير متوقع: " + (error?.message || ""));
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDelete = async (id: string, type: "dossiers" | "stationery") => {
    if (!confirm("هل أنت متأكد من حذف هذا العنصر نهائياً؟")) return;

    try {
      const { data, error } = await supabase.from("products").delete().eq("id", id).select("id");

      if (error) {
        console.error("SUPABASE DELETE ERROR:", error);
        alert("لم يتم حذف العنصر: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        alert("لم يتم حذف العنصر. تأكد من إعدادات الحماية في Supabase.");
        return;
      }

      if (type === "dossiers") {
        setDossiers((prev) => prev.filter((item) => item.id !== id));
      } else {
        setStationery((prev) => prev.filter((item) => item.id !== id));
      }

      alert("تم حذف العنصر بنجاح.");
    } catch (error: any) {
      console.error("UNEXPECTED DELETE ERROR:", error);
      alert("حدث خطأ أثناء الحذف: " + (error?.message || ""));
    }
  };

  const handleMarkAsReceived = async (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    try {
      const deleteAfter = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "تم الاستلام", delete_after: deleteAfter })
        .eq("id", orderId)
        .select("id,status,delete_after")
        .maybeSingle();

      if (error || !data) {
        alert("تعذر تحديث حالة الطلب.");
        return;
      }

      setOrders((prev) =>
        prev.map((item) =>
          item.id === orderId ? { ...item, status: "تم الاستلام", delete_after: deleteAfter } : item
        )
      );
      knownOrderIdsRef.current.add(orderId);
      if (notification?.id === orderId) setNotification(null);
    } catch (error: any) {
      alert("حدث خطأ أثناء استلام الطلب.");
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    try {
      const deleteAfter = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "جاري التوصيل", delete_after: deleteAfter })
        .eq("id", orderId)
        .select("id,status,delete_after")
        .maybeSingle();

      if (error || !data) {
        alert("تعذر تغيير حالة الطلب.");
        return;
      }

      setOrders((prev) =>
        prev.map((item) =>
          item.id === orderId ? { ...item, status: "جاري التوصيل", delete_after: deleteAfter } : item
        )
      );
      knownOrderIdsRef.current.add(orderId);
    } catch (error: any) {
      alert("حدث خطأ أثناء بدء التوصيل.");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من مسح هذا الطلب نهائياً؟")) return;

    try {
      const { data, error } = await supabase.from("orders").delete().eq("id", orderId).select("id");

      if (error || !data || data.length === 0) {
        alert("تعذر حذف الطلب.");
        return;
      }

      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      knownOrderIdsRef.current.delete(orderId);
      if (notification?.id === orderId) setNotification(null);
    } catch (error: any) {
      alert("حدث خطأ أثناء حذف الطلب.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="bg-white border border-blue-100 p-8 rounded-3xl max-w-md w-full shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-blue-950 mb-2">لوحة تحكم مكتبة أبو طوق</h1>
            <p className="text-xs text-slate-500">أدخل كلمة المرور الخاصة بالإدارة</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="كلمة المرور"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center tracking-widest text-lg font-bold text-slate-900 outline-none focus:border-blue-600"
            />
            {authError && <p className="text-xs text-rose-600 text-center font-bold">{authError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
            >
              تسجيل الدخول
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-slate-400 hover:text-blue-600 font-bold">
              العودة للموقع الرئيسي
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeSubjectsList = (year === "2009" || year === "2010") ? SUBJECTS_2009_2010 : SUBJECTS_OTHERS;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* إشعار الطلب الجديد */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-md">
          <div className="bg-white border-2 border-blue-500 rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top duration-300">
            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-blue-950 text-sm">🔔 طلب جديد!</p>
              <p className="text-xs text-slate-600 mt-1">
                وصل طلب جديد من <strong className="text-blue-700">{notification.customer}</strong>
              </p>
              <button
                onClick={() => {
                  setNotification(null);
                  setActiveTab("orders");
                  setSearchQuery("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-xs font-black text-blue-600 mt-2 hover:underline"
              >
                مشاهدة الطلب
              </button>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* الرأس */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-blue-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition">
              <ArrowRight className="w-6 h-6" />
            </Link>
            <h1 className="text-xl md:text-2xl font-black text-blue-950">إدارة مكتبة أبو طوق</h1>
          </div>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-4 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs border border-rose-200"
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      {/* التبويبات */}
      <div className="max-w-6xl mx-auto px-6 mt-6">
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => {
              setActiveTab("orders");
              setSearchQuery("");
            }}
            className={`p-4 rounded-2xl border font-bold text-sm md:text-base flex items-center justify-center gap-2 transition ${
              activeTab === "orders"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-950 border-blue-100 hover:border-blue-300"
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>الطلبات ({orders.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("dossiers");
              setSearchQuery("");
            }}
            className={`p-4 rounded-2xl border font-bold text-sm md:text-base flex items-center justify-center gap-2 transition ${
              activeTab === "dossiers"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-950 border-blue-100 hover:border-blue-300"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>الدوسيات ({dossiers.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("stationery");
              setSearchQuery("");
            }}
            className={`p-4 rounded-2xl border font-bold text-sm md:text-base flex items-center justify-center gap-2 transition ${
              activeTab === "stationery"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-950 border-blue-100 hover:border-blue-300"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>القرطاسية والأدوات والألعاب ({stationery.length})</span>
          </button>
        </div>
      </div>

      {/* شريط البحث */}
      <div className="max-w-6xl mx-auto px-6 mt-5">
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "orders"
                ? "ابحث برقم الطلب أو اسم الزبون أو رقم الهاتف..."
                : activeTab === "dossiers"
                ? "ابحث عن دوسية أو مادة أو جيل..."
                : "ابحث عن منتج أو قرطاسية أو أدوات أو ألعاب..."
            }
            className="w-full h-14 pr-5 pl-12 bg-white border border-blue-100 rounded-2xl shadow-sm text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition"
              title="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === "orders" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-blue-950">
                طلبات التوصيل الواردة (تحديث تلقائي كل 3 دقائق)
              </h2>
              <button
                onClick={() => loadOrdersOnly(false)}
                disabled={loadingOrders}
                className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-50 transition disabled:opacity-50"
              >
                {loadingOrders ? "جاري التحديث..." : "تحديث الطلبات يدوياً"}
              </button>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center shadow-sm">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-600">
                  {searchQuery ? "لا توجد نتائج مطابقة" : "لا توجد طلبات"}
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredOrders.map((order) => {
                  const orderDate = order.created_at
                    ? new Date(order.created_at).toLocaleString("ar-JO")
                    : "بدون تاريخ";
                  const isPending =
                    order.status === "قيد التجهيز والتوصيل" || order.status === "قيد التجهيز";
                  const isReceived = order.status === "تم الاستلام";
                  const isDelivery = order.status === "جاري التوصيل";

                  return (
                    <div
                      key={order.id}
                      className={`bg-white border rounded-3xl p-6 shadow-sm space-y-4 transition ${
                        isPending
                          ? "border-amber-200"
                          : isReceived
                          ? "border-emerald-200"
                          : "border-blue-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-blue-100 text-blue-900 text-xs font-black px-2.5 py-1 rounded-md">
                              {order.id}
                            </span>
                            <span className="text-xs text-slate-400">{orderDate}</span>
                            {isPending && (
                              <span className="flex items-center gap-1 bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-1 rounded-md animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                بانتظار الاستلام
                              </span>
                            )}
                            {isReceived && (
                              <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-md">
                                <Check className="w-3.5 h-3.5" />
                                تم الاستلام
                              </span>
                            )}
                            {isDelivery && (
                              <span className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-1 rounded-md">
                                <Truck className="w-3.5 h-3.5" />
                                جاري التوصيل
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-black text-blue-950 flex items-center gap-2 mt-1">
                            <User className="w-4 h-4 text-blue-600" />
                            <span>{order.customer}</span>
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`tel:${order.phone}`}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-800 border border-slate-200 font-bold rounded-xl text-xs hover:bg-slate-200 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                            <span>{order.phone}</span>
                          </a>
                          {isPending && (
                            <button
                              onClick={() => handleMarkAsReceived(order.id)}
                              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
                            >
                              <Check className="w-4 h-4" />
                              <span>تم الاستلام</span>
                            </button>
                          )}
                          {isReceived && (
                            <button
                              onClick={() => handleStartDelivery(order.id)}
                              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition flex items-center gap-1 shadow-sm"
                            >
                              <Truck className="w-4 h-4" />
                              <span>جارٍ التوصيل</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-100 transition"
                            title="حذف الطلب نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3 text-amber-950">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <strong className="text-xs block font-black text-amber-900">موقع الاستلام:</strong>
                            <p className="text-sm font-medium mt-0.5">{order.location || "عبر الخريطة"}</p>
                          </div>
                        </div>
                        {order.map_link && (
                          <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-xs font-bold text-amber-900">إحداثيات الـ GPS:</span>
                            <a
                              href={order.map_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition shadow-sm"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>فتح الموقع على خرائط قوقل</span>
                            </a>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-500 mb-2">المنتجات المطلوبة:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {order.items?.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                            >
                              {item.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-14 h-14 object-cover rounded-lg border border-slate-200"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center">
                                  <ShoppingBag className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-xs text-blue-950 line-clamp-1">{item.name}</p>
                                <p className="text-xs font-black text-blue-700 mt-1">الكمية: {item.quantity} حبة</p>
                                <p className="text-[11px] text-slate-500">السعر: {item.price} د.أ</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 gap-2 text-sm">
                        <span className="font-black text-blue-950">
                          الإجمالي المطلوب: <strong className="text-base text-emerald-600">{order.total} د.أ</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* تبويب الدوسيات والقرطاسية */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* نموذج إضافة عنصر جديد */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-blue-100 rounded-3xl p-6 shadow-sm sticky top-28">
                <h3 className="text-lg font-black text-blue-950 mb-4 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                  <span>{activeTab === "dossiers" ? "إضافة دوسية جديدة" : "إضافة صنف جديد"}</span>
                </h3>

                <form onSubmit={handleAddItem} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">اسم المنتج / الدوسية</label>
                    <input
                      type="text"
                      placeholder="مثال: دوسية الشامل في الرياضيات"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">السعر (بالدينار)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="مثال: 3.5"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600"
                    />
                  </div>

                  {activeTab === "dossiers" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">الجيل (السنة)</label>
                          <select
                            value={year}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600"
                          >
                            <option value="2007">2007</option>
                            <option value="2008">2008</option>
                            <option value="2009">2009</option>
                            <option value="2010">2010</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">الفصل الدراسي</label>
                          <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600"
                          >
                            <option value="الأول">الفصل الأول</option>
                            <option value="الثاني">الفصل الثاني</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">المادة</label>
                          <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600"
                          >
                            {activeSubjectsList.map((item, index) => (
                              <option key={index} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">نوع الدوسية</label>
                          <select
                            value={dossierType}
                            onChange={(e) => setDossierType(e.target.value as DossierType)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600"
                          >
                            <option value="مادة">مادة</option>
                            <option value="مكثف">مكثف</option>
                            <option value="بنك أسئلة">بنك أسئلة</option>
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">التصنيف</label>
                      <select
                        value={categoryType}
                        onChange={(e) => setCategoryType(e.target.value as StationeryCategory)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-600"
                      >
                        <option value="قرطاسية">قرطاسية</option>
                        <option value="أدوات">أدوات مكتبية</option>
                        <option value="ألعاب">ألعاب وتسلية</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">صورة المنتج</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  {imagePreview && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-xl border border-slate-200"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loadingProducts}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50"
                  >
                    {loadingProducts ? "جاري الحفظ..." : "إضافة المنتج"}
                  </button>
                </form>
              </div>
            </div>

            {/* قائمة المنتجات المعروضة */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-black text-blue-950">
                {activeTab === "dossiers" ? "قائمة الدوسيات" : "قائمة المنتجات"}
              </h3>

              {(activeTab === "dossiers" ? filteredDossiers : filteredStationery).length === 0 ? (
                <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center shadow-sm">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-600">
                    {searchQuery ? "لا توجد نتائج مطابقة" : "لا توجد عناصر مضافة بعد"}
                  </h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(activeTab === "dossiers" ? filteredDossiers : filteredStationery).map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-xl border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                            {activeTab === "dossiers" ? (
                              <BookOpen className="w-6 h-6 text-slate-400" />
                            ) : (
                              <ShoppingBag className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-blue-950 truncate">{item.title}</h4>
                          <p className="text-xs font-black text-emerald-600 mt-0.5">{item.price} د.أ</p>
                          {activeTab === "dossiers" ? (
                            <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1">
                              {item.subject} | {item.year} | {item.semester}
                            </span>
                          ) : (
                            <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id, activeTab as "dossiers" | "stationery")}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition shrink-0"
                        title="حذف المنتج"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
