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

type Product = {
  id: string;
  title: string;
  price: number;
  year?: string | null;
  semester?: string | null;
  subject?: string | null;
  dossier_type?: DossierType | null;
  category: string;
  image?: string | null;
  created_at?: string;
};

/*
|--------------------------------------------------------------------------
| البيانات التي يجب أن تتطابق مع صفحة المتجر
|--------------------------------------------------------------------------
*/

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

const dossierTypes: DossierType[] = [
  "مادة",
  "مكثف",
  "بنك أسئلة",
];

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
  const [savingProduct, setSavingProduct] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");

  const [year, setYear] = useState("2010");
  const [semester, setSemester] = useState("الأول");
  const [subject, setSubject] = useState(
    subjectsByYear["2010"][0]
  );
  const [dossierType, setDossierType] =
    useState<DossierType>("مادة");

  const [categoryType, setCategoryType] =
    useState<StationeryCategory>("قرطاسية");

  const [imagePreview, setImagePreview] = useState("");

  const [notification, setNotification] = useState<{
    id: string;
    customer: string;
  } | null>(null);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const firstOrdersLoadRef = useRef(true);
  const notificationTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | الفلترة
  |--------------------------------------------------------------------------
  */

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

    const itemNames =
      order.items?.map((item) => item.name).join(" ") || "";

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

  /*
  |--------------------------------------------------------------------------
  | الإشعارات
  |--------------------------------------------------------------------------
  */

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
      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );
      oscillator.frequency.setValueAtTime(
        660,
        audioContext.currentTime + 0.15
      );

      gainNode.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      );
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

      setTimeout(() => {
        audioContext.close().catch(() => {});
      }, 700);
    } catch (error) {
      console.log("Notification sound error:", error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (
        typeof window === "undefined" ||
        !("Notification" in window)
      ) {
        return;
      }

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch (error) {
      console.log("Notification permission error:", error);
    }
  };

  const showBrowserNotification = (order: Order) => {
    try {
      if (
        typeof window === "undefined" ||
        !("Notification" in window)
      ) {
        return;
      }

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

  /*
  |--------------------------------------------------------------------------
  | تحميل المنتجات
  |--------------------------------------------------------------------------
  */

  const loadProductsOnly = async () => {
    setLoadingProducts(true);

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("PRODUCTS LOAD ERROR:", error);
        alert("تعذر تحميل المنتجات: " + error.message);
        return;
      }

      const allProducts = (data || []) as Product[];

      setDossiers(
        allProducts.filter(
          (item) => item.category === "دوسيات"
        )
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
    } finally {
      setLoadingProducts(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | تحميل الطلبات
  |--------------------------------------------------------------------------
  */

  const isOrderExpired = (order: Order) => {
    if (!order.delete_after) return false;

    const deleteTime = new Date(
      order.delete_after
    ).getTime();

    return (
      !Number.isNaN(deleteTime) &&
      deleteTime <= Date.now()
    );
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
        console.error("ORDERS LOAD ERROR:", error);

        if (!silent) {
          alert("تعذر تحميل الطلبات: " + error.message);
        }

        return;
      }

      const allOrders = (data || []) as Order[];

      const expiredOrders = allOrders.filter((order) =>
        isOrderExpired(order)
      );

      if (expiredOrders.length > 0) {
        const expiredIds = expiredOrders.map(
          (order) => order.id
        );

        await supabase
          .from("orders")
          .delete()
          .in("id", expiredIds);
      }

      const activeOrders = allOrders.filter(
        (order) => !isOrderExpired(order)
      );

      setOrders(activeOrders);

      const currentIds = new Set(
        activeOrders.map((order) => order.id)
      );

      if (firstOrdersLoadRef.current) {
        knownOrderIdsRef.current = currentIds;
        firstOrdersLoadRef.current = false;
      } else if (silent) {
        const newOrders = activeOrders.filter(
          (order) =>
            (
              order.status === "قيد التجهيز والتوصيل" ||
              order.status === "قيد التجهيز"
            ) &&
            !knownOrderIdsRef.current.has(order.id)
        );

        knownOrderIdsRef.current = currentIds;

        if (newOrders.length > 0) {
          showNewOrderNotification(newOrders[0]);
        }
      } else {
        knownOrderIdsRef.current = currentIds;
      }
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
    }, 180000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | تسجيل الدخول
  |--------------------------------------------------------------------------
  */

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordInput === "201028") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("كلمة المرور غير صحيحة.");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | رفع صورة المنتج
  |--------------------------------------------------------------------------
  */

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة صحيح.");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setImagePreview(String(reader.result || ""));
    };

    reader.readAsDataURL(file);
  };

  /*
  |--------------------------------------------------------------------------
  | إضافة منتج أو دوسية
  |--------------------------------------------------------------------------
  */

  const handleAddItem = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    const numericPrice = Number(price);
    const isDossier = activeTab === "dossiers";

    if (!cleanTitle) {
      alert("يرجى كتابة اسم العنصر.");
      return;
    }

    if (
      price.trim() === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      alert("يرجى إدخال سعر صحيح.");
      return;
    }

    if (isDossier) {
      if (!["2009", "2010"].includes(year)) {
        alert("يرجى اختيار جيل صحيح.");
        return;
      }

      if (!["الأول", "الثاني"].includes(semester)) {
        alert("يرجى اختيار فصل صحيح.");
        return;
      }

      if (!subjectsByYear[year]?.includes(subject)) {
        alert("المادة لا تتوافق مع الجيل المحدد.");
        return;
      }

      if (!dossierTypes.includes(dossierType)) {
        alert("يرجى اختيار نوع دوسية صحيح.");
        return;
      }
    }

    const newItem = {
      title: cleanTitle,
      price: numericPrice,

      year: isDossier ? year : null,
      semester: isDossier ? semester : null,
      subject: isDossier ? subject : null,
      dossier_type: isDossier ? dossierType : null,

      category: isDossier ? "دوسيات" : categoryType,

      image: imagePreview || null,
    };

    setSavingProduct(true);

    try {
      const { data, error } = await supabase
        .from("products")
        .insert([newItem])
        .select("*")
        .single();

      if (error) {
        console.error("PRODUCT INSERT ERROR:", error);
        alert("لم يتم حفظ العنصر: " + error.message);
        return;
      }

      if (isDossier) {
        setDossiers((previous) => [
          data as Product,
          ...previous,
        ]);
      } else {
        setStationery((previous) => [
          data as Product,
          ...previous,
        ]);
      }

      setTitle("");
      setPrice("");
      setImagePreview("");

      alert("تم حفظ العنصر ونشره بنجاح.");
    } catch (error) {
      console.error("INSERT ERROR:", error);
      alert("حدث خطأ غير متوقع أثناء الحفظ.");
    } finally {
      setSavingProduct(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | حذف منتج
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (
    id: string,
    type: "dossiers" | "stationery"
  ) => {
    const confirmed = confirm(
      "هل أنت متأكد من حذف هذا العنصر نهائيًا؟"
    );

    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .select("id");

      if (error) {
        alert("لم يتم حذف العنصر: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        alert(
          "لم يتم حذف العنصر. تحقق من صلاحيات RLS في Supabase."
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
      console.error("DELETE ERROR:", error);
      alert("حدث خطأ أثناء حذف العنصر.");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | تحديث حالة الطلب
  |--------------------------------------------------------------------------
  */

  const handleMarkAsReceived = async (orderId: string) => {
    const deleteAfter = new Date(
      Date.now() + 15 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "تم الاستلام",
        delete_after: deleteAfter,
      })
      .eq("id", orderId)
      .select("id,status,delete_after")
      .maybeSingle();

    if (error || !data) {
      alert("تعذر تحديث حالة الطلب.");
      return;
    }

    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: "تم الاستلام",
              delete_after: deleteAfter,
            }
          : order
      )
    );

    knownOrderIdsRef.current.add(orderId);

    if (notification?.id === orderId) {
      setNotification(null);
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    const deleteAfter = new Date(
      Date.now() + 15 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("orders")
      .update({
        status: "جاري التوصيل",
        delete_after: deleteAfter,
      })
      .eq("id", orderId)
      .select("id,status,delete_after")
      .maybeSingle();

    if (error || !data) {
      alert("تعذر تغيير حالة الطلب.");
      return;
    }

    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: "جاري التوصيل",
              delete_after: deleteAfter,
            }
          : order
      )
    );

    knownOrderIdsRef.current.add(orderId);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائيًا؟")) {
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
      .select("id");

    if (error || !data || data.length === 0) {
      alert("تعذر حذف الطلب.");
      return;
    }

    setOrders((previous) =>
      previous.filter((order) => order.id !== orderId)
    );

    knownOrderIdsRef.current.delete(orderId);

    if (notification?.id === orderId) {
      setNotification(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | شاشة تسجيل الدخول
  |--------------------------------------------------------------------------
  */

  if (!isAuthenticated) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
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

          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <input
              type="password"
              value={passwordInput}
              onChange={(e) =>
                setPasswordInput(e.target.value)
              }
              placeholder="كلمة المرور"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-bold text-slate-900 outline-none focus:border-blue-600"
            />

            {authError && (
              <p className="text-xs text-red-600 text-center font-bold">
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

  /*
  |--------------------------------------------------------------------------
  | لوحة التحكم
  |--------------------------------------------------------------------------
  */

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-800"
    >
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-md">
          <div className="bg-white border-2 border-blue-500 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6" />
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

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-blue-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-slate-100 text-blue-900"
            >
              <ArrowRight className="w-6 h-6" />
            </Link>

            <h1 className="text-lg md:text-2xl font-black text-blue-950 truncate">
              إدارة مكتبة أبو طوق
            </h1>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-3 py-2 bg-red-50 text-red-600 font-bold rounded-xl text-xs border border-red-200 shrink-0"
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => {
              setActiveTab("orders");
              setSearchQuery("");
            }}
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 ${
              activeTab === "orders"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-blue-950 border-blue-100"
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            الطلبات ({orders.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("dossiers");
              setSearchQuery("");
            }}
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 ${
              activeTab === "dossiers"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-blue-950 border-blue-100"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            الدوسيات ({dossiers.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("stationery");
              setSearchQuery("");
            }}
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 ${
              activeTab === "stationery"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-blue-950 border-blue-100"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            المنتجات ({stationery.length})
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-5">
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            placeholder={
              activeTab === "orders"
                ? "ابحث برقم الطلب أو اسم الزبون أو الهاتف..."
                : activeTab === "dossiers"
                ? "ابحث عن دوسية أو مادة أو جيل..."
                : "ابحث عن منتج أو تصنيف..."
            }
            className="w-full h-14 px-5 bg-white border border-blue-100 rounded-2xl shadow-sm text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              title="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {activeTab === "orders" ? (
          <OrdersSection
            orders={filteredOrders}
            loading={loadingOrders}
            onRefresh={() => loadOrdersOnly(false)}
            onMarkReceived={handleMarkAsReceived}
            onStartDelivery={handleStartDelivery}
            onDelete={handleDeleteOrder}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white border border-blue-100 rounded-3xl p-6 shadow-sm h-fit">
              <h2 className="text-lg font-black text-blue-950 flex items-center gap-2 mb-6">
                <PlusCircle className="w-5 h-5 text-blue-600" />
                {activeTab === "dossiers"
                  ? "إضافة دوسية جديدة"
                  : "إضافة منتج جديد"}
              </h2>

              <form
                onSubmit={handleAddItem}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-black mb-1">
                    اسم العنصر
                  </label>

                  <input
                    type="text"
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
                    placeholder={
                      activeTab === "dossiers"
                        ? "مثال: مكثف الرياضيات"
                        : "مثال: دفتر مدرسي"
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black mb-1">
                    السعر بالدينار
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value)
                    }
                    placeholder="مثال: 3.50"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                  />
                </div>

                {activeTab === "dossiers" ? (
                  <>
                    <div>
                      <label className="block text-xs font-black mb-1">
                        الجيل الدراسي
                      </label>

                      <select
                        value={year}
                        onChange={(e) => {
                          const newYear = e.target.value;

                          setYear(newYear);
                          setSubject(
                            subjectsByYear[newYear][0]
                          );
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                      >
                        <option value="2010">
                          جيل 2010
                        </option>
                        <option value="2009">
                          جيل 2009
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black mb-1">
                        الفصل الدراسي
                      </label>

                      <select
                        value={semester}
                        onChange={(e) =>
                          setSemester(e.target.value)
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                      >
                        <option value="الأول">
                          الفصل الأول
                        </option>
                        <option value="الثاني">
                          الفصل الثاني
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black mb-1">
                        المادة الدراسية
                      </label>

                      <select
                        value={subject}
                        onChange={(e) =>
                          setSubject(e.target.value)
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                      >
                        {subjectsByYear[year].map(
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
                      <label className="block text-xs font-black mb-1">
                        نوع الدوسية
                      </label>

                      <select
                        value={dossierType}
                        onChange={(e) =>
                          setDossierType(
                            e.target.value as DossierType
                          )
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                      >
                        <option value="مادة">
                          مادة
                        </option>
                        <option value="مكثف">
                          مكثف
                        </option>
                        <option value="بنك أسئلة">
                          بنك أسئلة
                        </option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-black mb-1">
                      تصنيف المنتج
                    </label>

                    <select
                      value={categoryType}
                      onChange={(e) =>
                        setCategoryType(
                          e.target.value as StationeryCategory
                        )
                      }
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                    >
                      <option value="قرطاسية">
                        قرطاسية
                      </option>
                      <option value="أدوات">
                        أدوات
                      </option>
                      <option value="ألعاب">
                        ألعاب
                      </option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black mb-1">
                    صورة المنتج
                  </label>

                  <label className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-blue-500">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-600">
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
                    <img
                      src={imagePreview}
                      alt="معاينة الصورة"
                      className="w-full h-40 object-cover rounded-xl mt-3 border"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingProduct || loadingProducts}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {savingProduct
                    ? "جاري الحفظ..."
                    : "حفظ ونشر العنصر"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2">
              {loadingProducts ? (
                <div className="bg-white rounded-3xl p-12 text-center font-bold">
                  جاري تحميل المنتجات...
                </div>
              ) : activeTab === "dossiers" ? (
                <ProductList
                  title="الدوسيات المضافة"
                  products={filteredDossiers}
                  type="dossiers"
                  onDelete={handleDelete}
                  emptyText="لا توجد دوسيات مضافة حاليًا."
                />
              ) : (
                <ProductList
                  title="المنتجات المضافة"
                  products={filteredStationery}
                  type="stationery"
                  onDelete={handleDelete}
                  emptyText="لا توجد منتجات مضافة حاليًا."
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| قسم الطلبات
|--------------------------------------------------------------------------
*/

function OrdersSection({
  orders,
  loading,
  onRefresh,
  onMarkReceived,
  onStartDelivery,
  onDelete,
}: {
  orders: Order[];
  loading: boolean;
  onRefresh: () => void;
  onMarkReceived: (id: string) => void;
  onStartDelivery: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-blue-950">
          طلبات التوصيل الواردة
        </h2>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-white border rounded-xl text-xs font-bold disabled:opacity-50"
        >
          {loading ? "جاري التحديث..." : "تحديث الطلبات"}
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border rounded-3xl p-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-bold text-slate-500">
            لا توجد طلبات حاليًا.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isPending =
              order.status === "قيد التجهيز والتوصيل" ||
              order.status === "قيد التجهيز";

            const isReceived =
              order.status === "تم الاستلام";

            const isDelivery =
              order.status === "جاري التوصيل";

            return (
              <div
                key={order.id}
                className="bg-white border border-blue-100 rounded-3xl p-5 md:p-6 shadow-sm space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <span className="inline-block bg-blue-100 text-blue-900 px-3 py-1 rounded-lg text-xs font-black">
                      {order.id}
                    </span>

                    <p className="text-xs text-slate-400 mt-2">
                      {order.created_at
                        ? new Date(
                            order.created_at
                          ).toLocaleString("ar-JO")
                        : "بدون تاريخ"}
                    </p>

                    <h3 className="flex items-center gap-2 text-lg font-black text-blue-950 mt-2">
                      <User className="w-4 h-4 text-blue-600" />
                      {order.customer}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`tel:${order.phone}`}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold"
                    >
                      <Phone className="w-4 h-4 text-blue-600" />
                      {order.phone}
                    </a>

                    {isPending && (
                      <button
                        onClick={() =>
                          onMarkReceived(order.id)
                        }
                        className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                      >
                        <Check className="w-4 h-4" />
                        تم الاستلام
                      </button>
                    )}

                    {isReceived && (
                      <button
                        onClick={() =>
                          onStartDelivery(order.id)
                        }
                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                      >
                        <Truck className="w-4 h-4" />
                        جارٍ التوصيل
                      </button>
                    )}

                    <button
                      onClick={() => onDelete(order.id)}
                      className="p-2 text-red-500 bg-red-50 rounded-xl"
                      title="حذف الطلب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-amber-600 shrink-0" />

                    <div>
                      <p className="text-xs font-black text-amber-900">
                        موقع الاستلام
                      </p>

                      <p className="text-sm mt-1">
                        {order.location || "عبر الخريطة"}
                      </p>
                    </div>
                  </div>

                  {order.map_link && (
                    <a
                      href={order.map_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                    >
                      <Navigation className="w-4 h-4" />
                      فتح الموقع على خرائط قوقل
                    </a>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-500 mb-3">
                    المنتجات المطلوبة
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {order.items?.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="flex items-center gap-3 p-3 bg-slate-50 border rounded-xl"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-14 h-14 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-slate-400" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-xs font-black text-blue-950">
                            {item.name}
                          </p>

                          <p className="text-xs text-blue-700 mt-1">
                            الكمية: {item.quantity}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            السعر: {item.price} د.أ
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-black text-blue-950">
                    الإجمالي:{" "}
                    <span className="text-emerald-600">
                      {order.total} د.أ
                    </span>
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    الحالة الحالية:{" "}
                    <span className="font-bold">
                      {order.status}
                    </span>
                  </p>

                  {isDelivery && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      الطلب قيد التوصيل
                    </p>
                  )}

                  {isPending && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      الطلب بانتظار الاستلام
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| قائمة المنتجات والدوسيات
|--------------------------------------------------------------------------
*/

function ProductList({
  title,
  products,
  type,
  onDelete,
  emptyText,
}: {
  title: string;
  products: Product[];
  type: "dossiers" | "stationery";
  onDelete: (
    id: string,
    type: "dossiers" | "stationery"
  ) => void;
  emptyText: string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-blue-950">
        {title} ({products.length})
      </h2>

      {products.length === 0 ? (
        <div className="bg-white border rounded-3xl p-12 text-center">
          {type === "dossiers" ? (
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          ) : (
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          )}

          <p className="text-sm font-bold text-slate-500">
            {emptyText}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-20 h-20 rounded-xl object-cover border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center">
                    {type === "dossiers" ? (
                      <BookOpen className="w-7 h-7 text-slate-400" />
                    ) : (
                      <ShoppingBag className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-1 rounded">
                    {type === "dossiers"
                      ? item.dossier_type || "دوسية"
                      : item.category}
                  </span>

                  <h3 className="font-black text-sm text-blue-950 mt-2 break-words">
                    {item.title}
                  </h3>

                  {type === "dossiers" && (
                    <>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.subject}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        جيل {item.year} - الفصل{" "}
                        {item.semester}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-black text-emerald-600">
                  {Number(item.price).toFixed(2)} د.أ
                </span>

                <button
                  onClick={() =>
                    onDelete(item.id, type)
                  }
                  className="p-2 text-red-500 bg-red-50 rounded-xl"
                  title="حذف العنصر"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
