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
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Tab = "dossiers" | "stationery" | "orders";

type DossierType = "مادة" | "مكثف" | "بنك أسئلة";

type StationeryCategory = "قرطاسية" | "أدوات" | "ألعاب";

type Product = {
  id: string;
  created_at?: string;
  title: string;
  price: number;
  year?: string | null;
  semester?: string | null;
  subject?: string | null;
  category: string;
  image?: string | null;
  dossier_type?: string | null;
};

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
  items: OrderItem[] | unknown;
};

const subjectsByYear: Record<string, string[]> = {
  "2010": [
    "الرياضيات",
    "اللغة العربية",
    "التربية الإسلامية",
    "تاريخ الأردن",
  ],
  "2009": [
    "الرياضيات",
    "الرياضيات أعمال",
    "اللغة العربية",
    "اللغة الإنجليزية",
    "التربية الإسلامية",
    "تاريخ الأردن",
    "الكيمياء",
    "الفيزياء",
    "الأحياء",
    "علوم الأرض",
    "علم النفس",
  ],
};

const stationeryCategories: StationeryCategory[] = [
  "قرطاسية",
  "أدوات",
  "ألعاب",
];

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("orders");

  const [dossiers, setDossiers] = useState<Product[]>([]);
  const [stationery, setStationery] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");

  const [year, setYear] = useState("2010");
  const [semester, setSemester] = useState("الأول");
  const [subject, setSubject] = useState(subjectsByYear["2010"][0]);
  const [dossierType, setDossierType] = useState<DossierType>("مادة");

  const [categoryType, setCategoryType] =
    useState<StationeryCategory>("قرطاسية");

  const [imagePreview, setImagePreview] = useState("");

  const [notification, setNotification] = useState<{
    id: string;
    customer: string;
  } | null>(null);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const firstOrdersLoadRef = useRef(true);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredDossiers = dossiers.filter((item) => {
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
      .some((value) =>
        String(value).toLowerCase().includes(normalizedSearch)
      );
  });

  const filteredStationery = stationery.filter((item) => {
    if (!normalizedSearch) return true;

    return [item.title, item.category]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedSearch)
      );
  });

  const filteredOrders = orders.filter((order) => {
    if (!normalizedSearch) return true;

    const items = Array.isArray(order.items)
      ? (order.items as OrderItem[])
      : [];

    const itemNames = items.map((item) => item.name).join(" ");

    return [
      order.id,
      order.customer,
      order.phone,
      order.location,
      order.status,
      itemNames,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedSearch)
      );
  });

  const showDatabaseError = (
    titleText: string,
    error: {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    }
  ) => {
    console.error(titleText, error);

    const details = [
      error.message ? `الرسالة: ${error.message}` : "",
      error.code ? `الكود: ${error.code}` : "",
      error.details ? `التفاصيل: ${error.details}` : "",
      error.hint ? `التلميح: ${error.hint}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    alert(`${titleText}\n\n${details || "لا توجد تفاصيل إضافية."}`);
  };

  const playNotificationSound = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(
        660,
        audioContext.currentTime + 0.15
      );

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.25,
        audioContext.currentTime + 0.02
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.5
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);

      window.setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 700);
    } catch (error) {
      console.error("Notification sound error:", error);
    }
  };

  const showBrowserNotification = (order: Order) => {
    try {
      if (!("Notification" in window)) return;

      if (Notification.permission === "granted") {
        new Notification("🔔 طلب جديد - مكتبة أبو طوق", {
          body: `وصل طلب جديد من ${order.customer}`,
          icon: "/favicon.ico",
        });
      }
    } catch (error) {
      console.error("Browser notification error:", error);
    }
  };

  const showNewOrderNotification = (order: Order) => {
    setNotification({
      id: order.id,
      customer: order.customer,
    });

    playNotificationSound();
    showBrowserNotification(order);

    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 8000);
  };

  const requestNotificationPermission = async () => {
    try {
      if (!("Notification" in window)) return;

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch (error) {
      console.error("Notification permission error:", error);
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
        showDatabaseError("تعذر تحميل المنتجات من Supabase.", error);
        return;
      }

      const allProducts = (data || []) as Product[];

      setDossiers(
        allProducts.filter((item) => item.category === "دوسيات")
      );

      setStationery(
        allProducts.filter((item) =>
          stationeryCategories.includes(
            item.category as StationeryCategory
          )
        )
      );
    } catch (error) {
      console.error("LOAD PRODUCTS ERROR:", error);
      alert("حدث خطأ غير متوقع أثناء تحميل المنتجات.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadOrdersOnly = async (silent = false) => {
    if (!silent) {
      setLoadingOrders(true);
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (!silent) {
          showDatabaseError("تعذر تحميل الطلبات من Supabase.", error);
        } else {
          console.error("SUPABASE ORDERS POLLING ERROR:", error);
        }

        return;
      }

      const allOrders = (data || []) as Order[];

      setOrders(allOrders);

      const currentIds = new Set(allOrders.map((order) => order.id));

      if (firstOrdersLoadRef.current) {
        knownOrderIdsRef.current = currentIds;
        firstOrdersLoadRef.current = false;
        return;
      }

      if (silent) {
        const newlyCreatedOrders = allOrders.filter(
          (order) =>
            !knownOrderIdsRef.current.has(order.id) &&
            (order.status === "قيد التجهيز والتوصيل" ||
              order.status === "قيد التجهيز")
        );

        if (newlyCreatedOrders.length > 0) {
          showNewOrderNotification(newlyCreatedOrders[0]);
        }
      }

      knownOrderIdsRef.current = currentIds;
    } catch (error) {
      console.error("LOAD ORDERS ERROR:", error);
    } finally {
      if (!silent) {
        setLoadingOrders(false);
      }
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
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordInput === "201028") {
      setIsAuthenticated(true);
      setAuthError("");
      return;
    }

    setAuthError("كلمة المرور غير صحيحة.");
  };

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة فقط.");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setImagePreview(String(reader.result || ""));
    };

    reader.readAsDataURL(file);
  };

  const handleAddItem = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("اكتب اسم العنصر أولاً.");
      return;
    }

    if (!price.trim() || !Number.isFinite(Number(price))) {
      alert("اكتب السعر بشكل صحيح.");
      return;
    }

    const numericPrice = Number(price);

    if (numericPrice < 0) {
      alert("السعر لا يمكن أن يكون سالبًا.");
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
      const { data, error } = await supabase
        .from("products")
        .insert([newItem])
        .select("*")
        .single();

      if (error) {
        showDatabaseError("لم يتم حفظ المنتج داخل قاعدة البيانات.", error);
        return;
      }

      const savedProduct = data as Product;

      if (isDossier) {
        setDossiers((previous) => [savedProduct, ...previous]);
      } else {
        setStationery((previous) => [savedProduct, ...previous]);
      }

      setTitle("");
      setPrice("");
      setImagePreview("");

      alert("تم حفظ العنصر داخل قاعدة البيانات ونشره بنجاح.");
    } catch (error) {
      console.error("UNEXPECTED INSERT ERROR:", error);
      alert("حدث خطأ غير متوقع أثناء حفظ العنصر.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDeleteProduct = async (
    id: string,
    type: "dossiers" | "stationery"
  ) => {
    if (!confirm("هل أنت متأكد من حذف هذا العنصر نهائيًا؟")) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .select("id");

      if (error) {
        showDatabaseError("لم يتم حذف العنصر من قاعدة البيانات.", error);
        return;
      }

      if (!data || data.length === 0) {
        alert(
          "لم يتم حذف العنصر. قد تكون سياسات RLS تمنع الحذف من Supabase."
        );
        return;
      }

      if (type === "dossiers") {
        setDossiers((previous) =>
          previous.filter((item) => item.id !== id)
        );
      } else {
        setStationery((previous) =>
          previous.filter((item) => item.id !== id)
        );
      }

      alert("تم حذف العنصر بنجاح.");
    } catch (error) {
      console.error("DELETE PRODUCT ERROR:", error);
      alert("حدث خطأ أثناء حذف العنصر.");
    }
  };

  const handleMarkAsReceived = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: "تم الاستلام",
        })
        .eq("id", orderId)
        .select("id,status")
        .maybeSingle();

      if (error) {
        showDatabaseError("تعذر تحديث حالة الطلب.", error);
        return;
      }

      if (!data) {
        alert("لم يتم تحديث الطلب. تحقق من صلاحيات Supabase.");
        return;
      }

      setOrders((previous) =>
        previous.map((order) =>
          order.id === orderId
            ? { ...order, status: "تم الاستلام" }
            : order
        )
      );

      knownOrderIdsRef.current.add(orderId);

      if (notification?.id === orderId) {
        setNotification(null);
      }
    } catch (error) {
      console.error("MARK RECEIVED ERROR:", error);
      alert("حدث خطأ أثناء استلام الطلب.");
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: "جاري التوصيل",
        })
        .eq("id", orderId)
        .select("id,status")
        .maybeSingle();

      if (error) {
        showDatabaseError("تعذر تغيير حالة الطلب.", error);
        return;
      }

      if (!data) {
        alert("لم يتم تحديث الطلب. تحقق من صلاحيات Supabase.");
        return;
      }

      setOrders((previous) =>
        previous.map((order) =>
          order.id === orderId
            ? { ...order, status: "جاري التوصيل" }
            : order
        )
      );

      knownOrderIdsRef.current.add(orderId);
    } catch (error) {
      console.error("START DELIVERY ERROR:", error);
      alert("حدث خطأ أثناء بدء التوصيل.");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائيًا؟")) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId)
        .select("id");

      if (error) {
        showDatabaseError("تعذر حذف الطلب من قاعدة البيانات.", error);
        return;
      }

      if (!data || data.length === 0) {
        alert(
          "لم يتم حذف الطلب. تحقق من سياسات RLS في جدول orders."
        );
        return;
      }

      setOrders((previous) =>
        previous.filter((order) => order.id !== orderId)
      );

      knownOrderIdsRef.current.delete(orderId);

      if (notification?.id === orderId) {
        setNotification(null);
      }
    } catch (error) {
      console.error("DELETE ORDER ERROR:", error);
      alert("حدث خطأ أثناء حذف الطلب.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800"
      >
        <div className="bg-white border border-blue-100 p-8 rounded-3xl max-w-md w-full shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-blue-950 mb-2">
              لوحة تحكم مكتبة أبو طوق
            </h1>

            <p className="text-xs text-slate-500">
              أدخل كلمة المرور الخاصة بالإدارة
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="كلمة المرور"
              value={passwordInput}
              onChange={(event) =>
                setPasswordInput(event.target.value)
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center tracking-widest text-lg font-bold text-slate-900 outline-none focus:border-blue-600"
            />

            {authError && (
              <p className="text-xs text-rose-600 text-center font-bold">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
            >
              تسجيل الدخول
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-blue-600 font-bold"
            >
              العودة للموقع الرئيسي
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-800"
    >
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-md">
          <div className="bg-white border-2 border-blue-500 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-black text-blue-950 text-sm">
                🔔 طلب جديد!
              </p>

              <p className="text-xs text-slate-600 mt-1">
                وصل طلب جديد من{" "}
                <strong className="text-blue-700">
                  {notification.customer}
                </strong>
              </p>

              <button
                onClick={() => {
                  setNotification(null);
                  setActiveTab("orders");
                  setSearchQuery("");
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
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

      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 border-b border-blue-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition"
            >
              <ArrowRight className="w-6 h-6" />
            </Link>

            <h1 className="text-lg md:text-2xl font-black text-blue-950">
              إدارة مكتبة أبو طوق
            </h1>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-3 md:px-4 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs border border-rose-200"
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-6">
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <button
            onClick={() => {
              setActiveTab("orders");
              setSearchQuery("");
            }}
            className={`p-3 md:p-4 rounded-2xl border font-bold text-xs md:text-base flex flex-col md:flex-row items-center justify-center gap-2 transition ${
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
            className={`p-3 md:p-4 rounded-2xl border font-bold text-xs md:text-base flex flex-col md:flex-row items-center justify-center gap-2 transition ${
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
            className={`p-3 md:p-4 rounded-2xl border font-bold text-xs md:text-base flex flex-col md:flex-row items-center justify-center gap-2 transition ${
              activeTab === "stationery"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-950 border-blue-100 hover:border-blue-300"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-center">
              المتجر ({stationery.length})
            </span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-5">
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder={
              activeTab === "orders"
                ? "ابحث برقم الطلب أو اسم الزبون..."
                : activeTab === "dossiers"
                ? "ابحث عن دوسية أو مادة أو جيل..."
                : "ابحث عن منتج أو تصنيف..."
            }
            className="w-full h-14 px-5 bg-white border border-blue-100 rounded-2xl shadow-sm text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition placeholder:text-slate-400"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              title="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {activeTab === "orders" ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg md:text-xl font-black text-blue-950">
                طلبات الزبائن
              </h2>

              <button
                onClick={() => loadOrdersOnly(false)}
                disabled={loadingOrders}
                className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold hover:bg-slate-50 transition disabled:opacity-50"
              >
                {loadingOrders
                  ? "جاري التحديث..."
                  : "تحديث الطلبات"}
              </button>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center shadow-sm">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />

                <h3 className="text-lg font-bold text-slate-600">
                  {searchQuery
                    ? "لا توجد نتائج مطابقة"
                    : "لا توجد طلبات حاليًا"}
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredOrders.map((order) => {
                  const orderDate = order.created_at
                    ? new Date(order.created_at).toLocaleString(
                        "ar-JO"
                      )
                    : "بدون تاريخ";

                  const isPending =
                    order.status === "قيد التجهيز والتوصيل" ||
                    order.status === "قيد التجهيز";

                  const isReceived = order.status === "تم الاستلام";
                  const isDelivery = order.status === "جاري التوصيل";

                  const items = Array.isArray(order.items)
                    ? (order.items as OrderItem[])
                    : [];

                  return (
                    <div
                      key={order.id}
                      className={`bg-white border rounded-3xl p-4 md:p-6 shadow-sm space-y-4 ${
                        isPending
                          ? "border-amber-200"
                          : isReceived
                          ? "border-emerald-200"
                          : "border-blue-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-blue-100 text-blue-900 text-xs font-black px-2.5 py-1 rounded-md break-all">
                              {order.id}
                            </span>

                            <span className="text-xs text-slate-400">
                              {orderDate}
                            </span>

                            {isPending && (
                              <span className="flex items-center gap-1 bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-1 rounded-md">
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

                          <h3 className="text-lg font-black text-blue-950 flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            {order.customer}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`tel:${order.phone}`}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-800 border border-slate-200 font-bold rounded-xl text-xs"
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                            {order.phone}
                          </a>

                          {isPending && (
                            <button
                              onClick={() =>
                                handleMarkAsReceived(order.id)
                              }
                              className="px-3 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1"
                            >
                              <Check className="w-4 h-4" />
                              تم الاستلام
                            </button>
                          )}

                          {isReceived && (
                            <button
                              onClick={() =>
                                handleStartDelivery(order.id)
                              }
                              className="px-3 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center gap-1"
                            >
                              <Truck className="w-4 h-4" />
                              بدء التوصيل
                            </button>
                          )}

                          <button
                            onClick={() =>
                              handleDeleteOrder(order.id)
                            }
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-100"
                            title="حذف الطلب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 text-amber-950">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 text-amber-600 shrink-0" />

                          <div>
                            <strong className="text-xs block font-black">
                              موقع الاستلام:
                            </strong>

                            <p className="text-sm mt-1">
                              {order.location || "الموقع موجود عبر الخريطة"}
                            </p>
                          </div>
                        </div>

                        {order.map_link && (
                          <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs font-bold">
                              موقع GPS:
                            </span>

                            <a
                              href={order.map_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              فتح الموقع على خرائط قوقل
                            </a>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-500 mb-2">
                          المنتجات المطلوبة:
                        </h4>

                        {items.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            لا توجد تفاصيل للمنتجات داخل الطلب.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {items.map((item, index) => (
                              <div
                                key={`${order.id}-${index}`}
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

                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-blue-950">
                                    {item.name}
                                  </p>

                                  <p className="text-xs font-black text-blue-700 mt-1">
                                    الكمية: {item.quantity}
                                  </p>

                                  <p className="text-[11px] text-slate-500">
                                    السعر: {item.price} د.أ
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        <span className="font-black text-blue-950">
                          المجموع الفرعي:{" "}
                          <span className="text-emerald-600">
                            {order.subtotal} د.أ
                          </span>
                        </span>

                        <span className="font-black text-blue-950">
                          التوصيل:{" "}
                          <span className="text-emerald-600">
                            {order.delivery_fee} د.أ
                          </span>
                        </span>

                        <span className="font-black text-blue-950">
                          الإجمالي:{" "}
                          <span className="text-emerald-600">
                            {order.total} د.أ
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white border border-blue-100 rounded-3xl p-6 shadow-sm space-y-6 h-fit">
              <h2 className="text-lg font-black text-blue-950 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-600" />

                {activeTab === "dossiers"
                  ? "إضافة دوسية جديدة"
                  : "إضافة منتج جديد"}
              </h2>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1">
                    اسم العنصر
                  </label>

                  <input
                    type="text"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    placeholder={
                      activeTab === "dossiers"
                        ? "اكتب اسم الدوسية"
                        : "اكتب اسم المنتج"
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1">
                    السعر بالدينار الأردني
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) =>
                      setPrice(event.target.value)
                    }
                    placeholder="مثال: 3.50"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                {activeTab === "dossiers" ? (
                  <>
                    <div>
                      <label className="block text-xs font-black text-slate-600 mb-1">
                        الجيل / سنة الدراسة
                      </label>

                      <select
                        value={year}
                        onChange={(event) => {
                          const selectedYear = event.target.value;
                          setYear(selectedYear);

                          const availableSubjects =
                            subjectsByYear[selectedYear] || [];

                          setSubject(
                            availableSubjects[0] || ""
                          );
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="2010">جيل 2010</option>
                        <option value="2009">جيل 2009</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-600 mb-1">
                        الفصل الدراسي
                      </label>

                      <select
                        value={semester}
                        onChange={(event) =>
                          setSemester(event.target.value)
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="الأول">الفصل الأول</option>
                        <option value="الثاني">الفصل الثاني</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-600 mb-1">
                        المادة الدراسية
                      </label>

                      <select
                        value={subject}
                        onChange={(event) =>
                          setSubject(event.target.value)
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                      >
                        {(subjectsByYear[year] || []).map(
                          (subjectName) => (
                            <option
                              key={subjectName}
                              value={subjectName}
                            >
                              {subjectName}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-600 mb-1">
                        نوع الدوسية
                      </label>

                      <select
                        value={dossierType}
                        onChange={(event) =>
                          setDossierType(
                            event.target.value as DossierType
                          )
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                      >
                        <option value="مادة">مادة</option>
                        <option value="مكثف">مكثف</option>
                        <option value="بنك أسئلة">بنك أسئلة</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">
                      تصنيف المنتج
                    </label>

                    <select
                      value={categoryType}
                      onChange={(event) =>
                        setCategoryType(
                          event.target.value as StationeryCategory
                        )
                      }
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                    >
                      <option value="قرطاسية">قرطاسية</option>
                      <option value="ألعاب">ألعاب</option>
                      <option value="أدوات">أدوات</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1">
                    صورة المنتج أو الدوسية
                  </label>

                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer bg-slate-50 border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 text-center transition">
                      <span className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5">
                        <Upload className="w-4 h-4 text-blue-600" />
                        اختر صورة
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>

                    {imagePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreview}
                        alt="معاينة الصورة"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                      />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingProducts}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  {loadingProducts
                    ? "جاري الحفظ..."
                    : "حفظ ونشر العنصر"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-black text-blue-950">
                {activeTab === "dossiers"
                  ? `الدوسيات المتاحة (${filteredDossiers.length})`
                  : `منتجات المتجر (${filteredStationery.length})`}
              </h2>

              {activeTab === "dossiers" ? (
                filteredDossiers.length === 0 ? (
                  <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center shadow-sm">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-500">
                      لا توجد دوسيات مضافة حاليًا
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDossiers.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col justify-between"
                      >
                        <div className="flex items-start gap-3">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-16 h-16 object-cover rounded-xl border border-slate-100"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-slate-400" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded">
                              {item.dossier_type || "دوسية"}
                            </span>

                            <h3 className="font-bold text-sm text-blue-950 mt-1 break-words">
                              {item.title}
                            </h3>

                            <p className="text-xs text-slate-500 mt-1">
                              {item.subject} - جيل {item.year}
                            </p>

                            <p className="text-xs text-slate-500">
                              الفصل {item.semester}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <span className="font-black text-emerald-600 text-sm">
                            {item.price} د.أ
                          </span>

                          <button
                            onClick={() =>
                              handleDeleteProduct(
                                item.id,
                                "dossiers"
                              )
                            }
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : filteredStationery.length === 0 ? (
                <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center shadow-sm">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />

                  <p className="text-sm font-bold text-slate-500">
                    لا توجد منتجات مضافة حاليًا
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredStationery.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-xl border border-slate-100"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-slate-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded">
                            {item.category}
                          </span>

                          <h3 className="font-bold text-sm text-blue-950 mt-1 break-words">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="font-black text-emerald-600 text-sm">
                          {item.price} د.أ
                        </span>

                        <button
                          onClick={() =>
                            handleDeleteProduct(
                              item.id,
                              "stationery"
                            )
                          }
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
