"use client";

import React, { useEffect, useState } from "react";
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
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Tab = "dossiers" | "stationery" | "orders";

type DossierType = "مادة" | "مكثف" | "بنك أسئلة";

type StationeryCategory = "قرطاسية" | "أدوات" | "ألعاب";

type Product = {
  id: string | number;
  title: string;
  price: number;
  image?: string | null;
  year?: string | number | null;
  semester?: string | null;
  subject?: string | null;
  dossier_type?: string | null;
  category?: string | null;
  created_at?: string | null;
};

type OrderItem = {
  id?: string | number;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
};

type Order = {
  id: string | number;
  created_at?: string | null;
  customer?: string | null;
  phone?: string | null;
  location?: string | null;
  map_link?: string | null;
  subtotal?: number | null;
  delivery_fee?: number | null;
  total?: number | null;
  status?: string | null;
  items?: OrderItem[] | null;
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

export default function DashboardPage() {
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

    const orderItems = Array.isArray(order.items)
      ? order.items.map((item) => item.name).join(" ")
      : "";

    return [
      order.id,
      order.customer,
      order.phone,
      order.location,
      order.status,
      orderItems,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedSearch)
      );
  });

  const loadProducts = async () => {
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
        allProducts.filter((item) => item.category === "دوسيات")
      );

      setStationery(
        allProducts.filter((item) =>
          ["قرطاسية", "أدوات", "ألعاب"].includes(item.category || "")
        )
      );
    } catch (error: any) {
      console.error("UNEXPECTED PRODUCTS LOAD ERROR:", error);
      alert("حدث خطأ أثناء تحميل المنتجات.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("ORDERS LOAD ERROR:", error);
        alert("تعذر تحميل الطلبات: " + error.message);
        return;
      }

      setOrders((data || []) as Order[]);
    } catch (error: any) {
      console.error("UNEXPECTED ORDERS LOAD ERROR:", error);
      alert("حدث خطأ أثناء تحميل الطلبات.");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setImagePreview(String(reader.result || ""));
    };

    reader.readAsDataURL(file);
  };

  const handleAddItem = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("اكتب اسم العنصر أولًا.");
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

    const newProduct = {
      title: title.trim(),
      price: numericPrice,
      image: imagePreview || null,
      year: isDossier ? year : null,
      semester: isDossier ? semester : null,
      subject: isDossier ? subject : null,
      dossier_type: isDossier ? dossierType : null,
      category: isDossier ? "دوسيات" : categoryType,
    };

    setLoadingProducts(true);

    try {
      const { data, error } = await supabase
        .from("products")
        .insert([newProduct])
        .select("*")
        .single();

      if (error) {
        console.error("PRODUCT INSERT ERROR:", error);
        alert("لم يتم حفظ المنتج: " + error.message);
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

      alert("تم حفظ المنتج ونشره بنجاح.");
    } catch (error: any) {
      console.error("UNEXPECTED INSERT ERROR:", error);
      alert("حدث خطأ أثناء حفظ المنتج.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDeleteProduct = async (
    productId: string | number,
    type: "dossiers" | "stationery"
  ) => {
    const confirmed = confirm("هل أنت متأكد من حذف هذا المنتج نهائيًا؟");

    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)
        .select("id");

      if (error) {
        console.error("PRODUCT DELETE ERROR:", error);
        alert("لم يتم حذف المنتج: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        alert(
          "لم يتم حذف المنتج. تحقق من سياسات الحماية RLS في Supabase."
        );
        return;
      }

      if (type === "dossiers") {
        setDossiers((previous) =>
          previous.filter((item) => item.id !== productId)
        );
      } else {
        setStationery((previous) =>
          previous.filter((item) => item.id !== productId)
        );
      }

      alert("تم حذف المنتج بنجاح.");
    } catch (error: any) {
      console.error("UNEXPECTED PRODUCT DELETE ERROR:", error);
      alert("حدث خطأ أثناء حذف المنتج.");
    }
  };

  const updateOrderStatus = async (
    orderId: string | number,
    newStatus: string
  ) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        console.error("ORDER STATUS UPDATE ERROR:", error);
        alert("تعذر تحديث حالة الطلب.");
        return;
      }

      setOrders((previous) =>
        previous.map((order) =>
          order.id === orderId ? (data as Order) : order
        )
      );
    } catch (error) {
      console.error("UNEXPECTED ORDER STATUS ERROR:", error);
      alert("حدث خطأ أثناء تحديث حالة الطلب.");
    }
  };

  const handleDeleteOrder = async (orderId: string | number) => {
    const confirmed = confirm("هل أنت متأكد من حذف الطلب نهائيًا؟");

    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId)
        .select("id");

      if (error) {
        console.error("ORDER DELETE ERROR:", error);
        alert("تعذر حذف الطلب: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        alert(
          "لم يتم حذف الطلب. تحقق من سياسات الحماية RLS في Supabase."
        );
        return;
      }

      setOrders((previous) =>
        previous.filter((order) => order.id !== orderId)
      );
    } catch (error) {
      console.error("UNEXPECTED ORDER DELETE ERROR:", error);
      alert("حدث خطأ أثناء حذف الطلب.");
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-800"
    >
      <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition"
              aria-label="العودة للموقع الرئيسي"
            >
              <ArrowRight className="w-6 h-6" />
            </Link>

            <h1 className="text-lg md:text-2xl font-black text-blue-950">
              إدارة مكتبة أبو طوق
            </h1>
          </div>

          <button
            onClick={() => {
              loadProducts();
              loadOrders();
            }}
            className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold"
          >
            تحديث البيانات
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
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 transition ${
              activeTab === "orders"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
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
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 transition ${
              activeTab === "dossiers"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
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
            className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 transition ${
              activeTab === "stationery"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-950 border-blue-100"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            المنتجات ({stationery.length})
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-5">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="ابحث هنا..."
          className="w-full h-14 px-5 bg-white border border-blue-100 rounded-2xl shadow-sm text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
        />
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {activeTab === "orders" ? (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-blue-950">
                الطلبات الواردة
              </h2>

              <button
                onClick={loadOrders}
                disabled={loadingOrders}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
              >
                {loadingOrders ? "جاري التحديث..." : "تحديث الطلبات"}
              </button>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center">
                <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-500">
                  لا توجد طلبات حاليًا
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const items = Array.isArray(order.items)
                  ? order.items
                  : [];

                const status = order.status || "قيد التجهيز";

                return (
                  <div
                    key={String(order.id)}
                    className="bg-white border border-blue-100 rounded-3xl p-5 md:p-6 shadow-sm space-y-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-lg text-xs font-black">
                            {order.id}
                          </span>

                          <span className="text-xs text-slate-400">
                            {order.created_at
                              ? new Date(
                                  order.created_at
                                ).toLocaleString("ar-JO")
                              : "بدون تاريخ"}
                          </span>
                        </div>

                        <h3 className="mt-2 font-black text-lg text-blue-950 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          {order.customer || "بدون اسم"}
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          الحالة: {status}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {order.phone && (
                          <a
                            href={`tel:${order.phone}`}
                            className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold flex items-center gap-2"
                          >
                            <Phone className="w-4 h-4 text-blue-600" />
                            {order.phone}
                          </a>
                        )}

                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "تم الاستلام")
                          }
                          className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          تم الاستلام
                        </button>

                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "جاري التوصيل")
                          }
                          className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2"
                        >
                          <Truck className="w-4 h-4" />
                          جاري التوصيل
                        </button>

                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100"
                          title="حذف الطلب"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-amber-600 shrink-0" />

                        <div>
                          <p className="text-xs font-black text-amber-900">
                            موقع الاستلام
                          </p>

                          <p className="text-sm text-amber-950 mt-1">
                            {order.location || "عبر الخريطة"}
                          </p>
                        </div>
                      </div>

                      {order.map_link && (
                        <a
                          href={order.map_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black"
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
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                          >
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-14 h-14 object-cover rounded-lg"
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

                              <p className="text-xs text-slate-500 mt-1">
                                السعر: {item.price} د.أ
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <p className="font-black text-blue-950">
                        الإجمالي:{" "}
                        <span className="text-emerald-600">
                          {order.total ?? 0} د.أ
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white border border-blue-100 rounded-3xl p-6 shadow-sm h-fit">
              <h2 className="text-lg font-black text-blue-950 flex items-center gap-2 mb-5">
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
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="اكتب اسم العنصر"
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1">
                    السعر بالدينار
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="مثال: 3.50"
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                {activeTab === "dossiers" ? (
                  <>
                    <div>
                      <label className="block text-xs font-black text-slate-600 mb-1">
                        الجيل
                      </label>

                      <select
                        value={year}
                        onChange={(event) => {
                          const selectedYear = event.target.value;
                          setYear(selectedYear);
                          setSubject(subjectsByYear[selectedYear][0]);
                        }}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
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
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
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
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                      >
                        {subjectsByYear[year].map((subjectName) => (
                          <option
                            key={subjectName}
                            value={subjectName}
                          >
                            {subjectName}
                          </option>
                        ))}
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
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
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
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                    >
                      <option value="قرطاسية">قرطاسية</option>
                      <option value="أدوات">أدوات</option>
                      <option value="ألعاب">ألعاب</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1">
                    صورة المنتج
                  </label>

                  <label className="cursor-pointer block p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                    <span className="text-xs font-bold text-slate-500">
                      <Upload className="w-4 h-4 inline-block ml-1 text-blue-600" />
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
                      className="w-20 h-20 object-cover rounded-xl mt-3 border border-slate-200"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loadingProducts}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black disabled:opacity-50"
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
                  : `المنتجات المتاحة (${filteredStationery.length})`}
              </h2>

              {activeTab === "dossiers" ? (
                filteredDossiers.length === 0 ? (
                  <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-500">
                      لا توجد دوسيات مضافة.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredDossiers.map((item) => (
                      <div
                        key={String(item.id)}
                        className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-16 h-16 object-cover rounded-xl"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-slate-400" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-1 rounded">
                              {item.dossier_type || "دوسية"}
                            </span>

                            <h3 className="font-bold text-sm text-blue-950 mt-2">
                              {item.title}
                            </h3>

                            <p className="text-xs text-slate-500 mt-1">
                              {item.subject || ""} - جيل {item.year || ""}
                            </p>

                            <p className="text-xs text-slate-500 mt-1">
                              الفصل {item.semester || ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="font-black text-emerald-600">
                            {item.price} د.أ
                          </span>

                          <button
                            onClick={() =>
                              handleDeleteProduct(item.id, "dossiers")
                            }
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"
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
                <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-500">
                    لا توجد منتجات مضافة.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredStationery.map((item) => (
                    <div
                      key={String(item.id)}
                      className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-xl"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-slate-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-2 py-1 rounded">
                            {item.category || "منتج"}
                          </span>

                          <h3 className="font-bold text-sm text-blue-950 mt-2">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="font-black text-emerald-600">
                          {item.price} د.أ
                        </span>

                        <button
                          onClick={() =>
                            handleDeleteProduct(item.id, "stationery")
                          }
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"
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
          </section>
        )}
      </main>
    </div>
  );
}
