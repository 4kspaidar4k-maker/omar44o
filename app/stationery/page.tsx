"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

import {
  ArrowRight,
  ShoppingCart,
  CheckCircle,
  Search,
  Gamepad2,
  PenTool,
  Wrench,
  ChevronLeft,
} from "lucide-react";

import { useCart } from "../../context/CartContext";
import { supabase } from "@/lib/supabase";

export default function StationeryAndGamesPage() {
  const { addToCart, totalItems } = useCart() as any;

  const [products, setProducts] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>(
    {}
  );

  // الأقسام الثلاثة
  const [selectedCategory, setSelectedCategory] = useState<
    "قرطاسية" | "ألعاب" | "أدوات" | null
  >(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);

  // ============================================================
  // تحميل المنتجات من Supabase
  // ============================================================

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .in("category", ["قرطاسية", "ألعاب", "أدوات"])
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("SUPABASE PRODUCTS ERROR:", error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error("LOAD PRODUCTS ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // تحميل أول مرة + تحديث تلقائي
  // ============================================================

  useEffect(() => {
    loadProducts();

    // تحديث المنتجات كل 5 ثواني
    const interval = setInterval(() => {
      loadProducts();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ============================================================
  // تغيير الكمية
  // ============================================================

  const handleQuantityChange = (
    id: string,
    delta: number
  ) => {
    setQuantities((prev) => {
      const current = prev[id] || 1;
      const next = current + delta;

      return {
        ...prev,
        [id]: next > 1 ? next : 1,
      };
    });
  };

  // ============================================================
  // إضافة للسلة
  // ============================================================

  const handleAddToCart = (product: any) => {
    const qty = quantities[product.id] || 1;

    addToCart(
      {
        id: product.id,
        name: product.title,
        price: Number(product.price),
        image: product.image || null,
      },
      qty
    );

    setQuantities((prev) => ({
      ...prev,
      [product.id]: 1,
    }));

    alert("تمت الإضافة إلى السلة بنجاح!");
  };

  // ============================================================
  // تصفية المنتجات حسب القسم والبحث
  // ============================================================

  const filteredProducts = products.filter((p) => {
    if (!selectedCategory) return false;

    const categoryMatch =
      p.category === selectedCategory;

    const title = String(p.title || "");

    const searchMatch = title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return categoryMatch && searchMatch;
  });

  // ============================================================
  // الرجوع لاختيار الأقسام
  // ============================================================

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSearchQuery("");
  };

  // ============================================================
  // الواجهة
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">

      {/* ======================================================
          Header
      ====================================================== */}

      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-blue-100 shadow-sm">

        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">

          <div className="flex items-center gap-4">

            {selectedCategory ? (
              <button
                onClick={handleBackToCategories}
                className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition flex items-center gap-1 font-bold text-sm"
              >
                <ArrowRight className="w-5 h-5" />

                <span>
                  رجوع للاختيار
                </span>
              </button>
            ) : (
              <Link
                href="/"
                className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition"
              >
                <ArrowRight className="w-6 h-6" />
              </Link>
            )}

            <h1 className="text-xl md:text-2xl font-black text-blue-950">
              القرطاسية والألعاب والأدوات
            </h1>

          </div>

          {/* السلة */}

          <Link
            href="/cart"
            className="relative flex items-center justify-center p-3 rounded-full bg-blue-50 border border-blue-200 hover:bg-blue-100 transition shadow-sm"
          >

            <ShoppingCart className="w-5 h-5 text-blue-900" />

            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                {totalItems}
              </span>
            )}

          </Link>

        </div>

      </header>

      {/* ======================================================
          Breadcrumb
      ====================================================== */}

      <div className="max-w-6xl mx-auto px-6 pt-6">

        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-bold overflow-x-auto pb-2">

          <button
            onClick={handleBackToCategories}
            className="hover:text-blue-600"
          >
            القرطاسية والألعاب والأدوات
          </button>

          {selectedCategory && (
            <>
              <ChevronLeft className="w-4 h-4 text-slate-400" />

              <span className="text-blue-600">
                {selectedCategory}
              </span>
            </>
          )}

        </div>

      </div>

      {/* ======================================================
          Main
      ====================================================== */}

      <main className="max-w-6xl mx-auto px-6 py-6">

        {/* ====================================================
            اختيار القسم
        ==================================================== */}

        {!selectedCategory ? (

          <div>

            <h2 className="text-xl font-black text-blue-950 mb-6 text-center">
              اختر القسم الذي ترغب بتصفحه:
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">

              {/* القرطاسية */}

              <button
                onClick={() =>
                  setSelectedCategory("قرطاسية")
                }
                className="p-8 bg-white border border-blue-100 hover:border-blue-500 rounded-3xl shadow-sm hover:shadow-md transition text-right flex flex-col items-center text-center group h-60 justify-center"
              >

                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">

                  <PenTool className="w-8 h-8" />

                </div>

                <h3 className="text-2xl font-black text-blue-950 group-hover:text-blue-600 transition">
                  القرطاسية
                </h3>

                <p className="text-sm text-slate-400 mt-2">
                  أقلام، دفاتر، ومستلزمات مدرسية
                </p>

              </button>

              {/* الألعاب */}

              <button
                onClick={() =>
                  setSelectedCategory("ألعاب")
                }
                className="p-8 bg-white border border-emerald-100 hover:border-emerald-500 rounded-3xl shadow-sm hover:shadow-md transition text-right flex flex-col items-center text-center group h-60 justify-center"
              >

                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">

                  <Gamepad2 className="w-8 h-8" />

                </div>

                <h3 className="text-2xl font-black text-blue-950 group-hover:text-emerald-600 transition">
                  الألعاب
                </h3>

                <p className="text-sm text-slate-400 mt-2">
                  ألعاب ترفيهية وتعليمية وهدايا مميزة
                </p>

              </button>

              {/* الأدوات */}

              <button
                onClick={() =>
                  setSelectedCategory("أدوات")
                }
                className="p-8 bg-white border border-amber-100 hover:border-amber-500 rounded-3xl shadow-sm hover:shadow-md transition text-right flex flex-col items-center text-center group h-60 justify-center"
              >

                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">

                  <Wrench className="w-8 h-8" />

                </div>

                <h3 className="text-2xl font-black text-blue-950 group-hover:text-amber-600 transition">
                  الأدوات
                </h3>

                <p className="text-sm text-slate-400 mt-2">
                  أدوات ومستلزمات متنوعة
                </p>

              </button>

            </div>

          </div>

        ) : (

          /* ==================================================
             عرض المنتجات
          ================================================== */

          <div>

            {/* البحث */}

            <div className="relative mb-8 max-w-xl mx-auto">

              <input
                type="text"
                placeholder={`ابحث في قسم ${selectedCategory}...`}
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(e.target.value)
                }
                className="w-full pl-12 pr-4 py-4 bg-white border border-blue-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-sm text-sm md:text-base font-bold text-blue-950"
              />

              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />

            </div>

            {/* تحميل */}

            {loading ? (

              <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center shadow-sm max-w-xl mx-auto">

                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />

                <p className="text-sm font-bold text-slate-500">
                  جاري تحميل المنتجات...
                </p>

              </div>

            ) : filteredProducts.length === 0 ? (

              /* لا توجد منتجات */

              <div className="bg-white border border-blue-100 rounded-3xl p-12 text-center shadow-sm max-w-xl mx-auto">

                <h3 className="text-lg font-black text-blue-950 mb-2">
                  لا توجد منتجات مضافة في قسم{" "}
                  {selectedCategory} حالياً
                </h3>

                <p className="text-xs text-slate-400 mt-1">

                  {searchQuery
                    ? "لا توجد نتائج مطابقة لبحثك."
                    : `اذهب إلى لوحة تحكم الإدارة وأضف منتجات جديدة واختر تصنيف (${selectedCategory}) لتظهر هنا فوراً.`}

                </p>

              </div>

            ) : (

              /* =================================================
                 المنتجات
              ================================================= */

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                {filteredProducts.map((product) => {

                  const qty =
                    quantities[product.id] || 1;

                  return (

                    <div
                      key={product.id}
                      className="bg-white border border-blue-100 rounded-2xl overflow-hidden hover:border-blue-400 shadow-sm hover:shadow-md transition-all flex flex-col"
                    >

                      {/* صورة المنتج */}

                      <div className="relative h-56 bg-slate-100">

                        {product.image ? (

                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />

                        ) : (

                          <div className="w-full h-full flex items-center justify-center">

                            <ShoppingCart className="w-12 h-12 text-slate-300" />

                          </div>

                        )}

                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-white/90 border border-slate-200 shadow-sm">

                          <CheckCircle className="w-3 h-3 text-emerald-600" />

                          <span className="text-emerald-700">
                            متوفر
                          </span>

                        </div>

                      </div>

                      {/* تفاصيل المنتج */}

                      <div className="p-5 flex flex-col flex-1">

                        <h3 className="text-lg font-bold text-blue-950 mb-4">
                          {product.title}
                        </h3>

                        <div className="mt-auto flex items-center justify-between mb-4">

                          <span className="text-xl font-black text-blue-800">

                            {Number(
                              product.price || 0
                            ).toFixed(2)}{" "}
                            دينار

                          </span>

                        </div>

                        {/* الكمية + السلة */}

                        <div className="flex items-center gap-3">

                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden h-10">

                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  product.id,
                                  -1
                                )
                              }
                              className="px-3 text-slate-600 hover:bg-slate-200 font-bold"
                            >
                              -
                            </button>

                            <span className="w-8 text-center font-bold text-sm text-blue-950">
                              {qty}
                            </span>

                            <button
                              onClick={() =>
                                handleQuantityChange(
                                  product.id,
                                  1
                                )
                              }
                              className="px-3 text-slate-600 hover:bg-slate-200 font-bold"
                            >
                              +
                            </button>

                          </div>

                          <button
                            onClick={() =>
                              handleAddToCart(product)
                            }
                            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 shadow-sm text-sm"
                          >

                            <ShoppingCart className="w-4 h-4" />

                            إضافة للسلة

                          </button>

                        </div>

                      </div>

                    </div>

                  );
                })}

              </div>

            )}

          </div>

        )}

      </main>

    </div>
  );
}