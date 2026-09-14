"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Trash2,
  CheckCircle,
  ShoppingCart,
  MapPin,
  Phone,
  User,
  Navigation,
  Truck,
  Package,
  Eye,
  X,
  Clock,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";

import { useCart } from "../../context/CartContext";
import { supabase } from "../../lib/supabase";

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
  location: string | null;
  map_link: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  items: OrderItem[];
  delete_after?: string | null;
};

const DELIVERY_FEE = 2.0;

/*
 * الحالات النهائية التي لا نحتاج عرضها للزبون
 * الحذف الحقيقي من قاعدة البيانات يتم عن طريق delete_after
 */
const FINISHED_STATUSES = [
  "تم التسليم",
  "مكتمل",
];

export default function CartPage() {
  const { cart, removeFromCart } = useCart() as any;

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [mapLink, setMapLink] = useState("");

  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [ordersError, setOrdersError] = useState("");

  /*
   * ============================================================
   * حساب السلة
   * ============================================================
   */

  const itemsTotal =
    cart?.reduce(
      (total: number, item: any) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    ) || 0;

  const finalTotal = itemsTotal + DELIVERY_FEE;

  /*
   * ============================================================
   * تحميل بيانات الزبون
   * ============================================================
   */

  useEffect(() => {
    try {
      const savedName = localStorage.getItem(
        "abu_touq_customer_name"
      );

      const savedPhone = localStorage.getItem(
        "abu_touq_customer_phone"
      );

      if (savedName) {
        setCustomerName(savedName);
      }

      if (savedPhone) {
        setCustomerPhone(savedPhone);
      }
    } catch (error) {
      console.error(
        "CUSTOMER STORAGE ERROR:",
        error
      );
    }
  }, []);

  /*
   * ============================================================
   * جلب طلبات الزبون
   * ============================================================
   */

  const loadMyOrders = async (
    openWindow: boolean = true
  ) => {
    setLoadingOrders(true);
    setOrdersError("");

    try {
      let orderIds: string[] = [];

      try {
        const savedIds = localStorage.getItem(
          "abu_touq_order_ids"
        );

        orderIds = savedIds
          ? JSON.parse(savedIds)
          : [];

        if (!Array.isArray(orderIds)) {
          orderIds = [];
        }

        orderIds = orderIds
          .map((id) => String(id))
          .filter(Boolean);
      } catch (error) {
        console.error(
          "ORDER IDS PARSE ERROR:",
          error
        );

        orderIds = [];
      }

      /*
       * إذا لا يوجد طلبات محفوظة
       */

      if (!orderIds.length) {
        setMyOrders([]);

        if (openWindow) {
          setShowOrders(true);
        }

        return;
      }

      /*
       * جلب الطلبات من Supabase
       */

      const {
        data,
        error,
      } = await supabase
        .from("orders")
        .select("*")
        .in("id", orderIds)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "SUPABASE LOAD ORDERS ERROR:",
          error
        );

        setOrdersError(
          "تعذر تحميل طلباتك حالياً. حاول مرة أخرى."
        );

        return;
      }

      const ordersFromDatabase =
        (data || []) as Order[];

      /*
       * ========================================================
       * تنظيف الطلبات التي لم تعد موجودة في Supabase
       * ========================================================
       */

      const existingOrderIds =
        new Set(
          ordersFromDatabase.map(
            (order) => String(order.id)
          )
        );

      const validOrderIds =
        orderIds.filter((id) =>
          existingOrderIds.has(
            String(id)
          )
        );

      try {
        localStorage.setItem(
          "abu_touq_order_ids",
          JSON.stringify(validOrderIds)
        );
      } catch (storageError) {
        console.error(
          "ORDER IDS CLEANUP ERROR:",
          storageError
        );
      }

      /*
       * تحديث الطلبات
       */

      setMyOrders(
        ordersFromDatabase
      );

      /*
       * إذا الطلب المفتوح انحذف من قاعدة البيانات
       * نغلق نافذة التفاصيل
       */

      setSelectedOrder(
        (currentSelected) => {
          if (!currentSelected) {
            return null;
          }

          const stillExists =
            ordersFromDatabase.some(
              (order) =>
                order.id ===
                currentSelected.id
            );

          return stillExists
            ? currentSelected
            : null;
        }
      );

      if (openWindow) {
        setShowOrders(true);
      }
    } catch (error) {
      console.error(
        "LOAD MY ORDERS ERROR:",
        error
      );

      setOrdersError(
        "حدث خطأ غير متوقع أثناء تحميل الطلبات."
      );
    } finally {
      setLoadingOrders(false);
    }
  };

  /*
   * ============================================================
   * تحديث الطلبات تلقائياً
   *
   * كل 10 ثواني عندما تكون نافذة طلباتي مفتوحة
   * ============================================================
   */

  useEffect(() => {
    if (!showOrders) {
      return;
    }

    const interval =
      setInterval(() => {
        loadMyOrders(false);
      }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [showOrders]);

  /*
   * ============================================================
   * تحديد الموقع GPS
   * ============================================================
   */

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert(
        "خاصية تحديد الموقع غير مدعومة في متصفحك."
      );

      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {
          latitude,
          longitude,
        } = position.coords;

        const generatedLink =
          `https://www.google.com/maps?q=${latitude},${longitude}`;

        setMapLink(
          generatedLink
        );

        setCustomerLocation(
          "تم تحديد الموقع الجغرافي بدقة عبر GPS"
        );

        setIsLocating(false);
      },

      (error) => {
        console.error(
          "GPS ERROR:",
          error
        );

        setIsLocating(false);

        alert(
          "تعذر جلب موقعك تلقائياً. يرجى السماح بالوصول إلى الموقع أو كتابة العنوان يدوياً."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  /*
   * ============================================================
   * إرسال الطلب
   * ============================================================
   */

  const handleCheckout = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("يرجى كتابة الاسم.");
      return;
    }

    if (!customerPhone.trim()) {
      alert("يرجى كتابة رقم الهاتف.");
      return;
    }

    if (
      !customerLocation.trim() &&
      !mapLink
    ) {
      alert(
        "يرجى كتابة موقع التوصيل أو تحديد موقعك عبر GPS."
      );

      return;
    }

    if (
      !cart ||
      cart.length === 0
    ) {
      alert("السلة فارغة.");
      return;
    }

    setIsSubmitting(true);

    try {
      /*
       * حفظ بيانات الزبون
       */

      localStorage.setItem(
        "abu_touq_customer_name",
        customerName.trim()
      );

      localStorage.setItem(
        "abu_touq_customer_phone",
        customerPhone.trim()
      );

      /*
       * تجهيز المنتجات
       */

      const orderItems: OrderItem[] =
        cart.map((item: any) => ({
          id: String(item.id),

          name: String(
            item.name || "منتج"
          ),

          price: Number(
            item.price || 0
          ),

          quantity: Number(
            item.quantity || 1
          ),

          image:
            item.image || null,
        }));

      /*
       * إنشاء الطلب
       */

      const {
        data,
        error,
      } = await supabase
        .from("orders")
        .insert([
          {
            customer:
              customerName.trim(),

            phone:
              customerPhone.trim(),

            location:
              customerLocation.trim() ||
              null,

            map_link:
              mapLink || null,

            subtotal:
              Number(
                itemsTotal.toFixed(2)
              ),

            delivery_fee:
              DELIVERY_FEE,

            total:
              Number(
                finalTotal.toFixed(2)
              ),

            /*
             * الحالة الأولى
             */

            status:
              "قيد التجهيز والتوصيل",

            /*
             * لا يوجد وقت حذف عند إنشاء الطلب
             * يبدأ بعد ضغط الإدارة على حالة الطلب
             */

            delete_after: null,

            items:
              orderItems,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error(
          "ORDER INSERT ERROR:",
          error
        );

        alert(
          `تعذر إرسال الطلب إلى قاعدة البيانات.\n\n${error.message}`
        );

        return;
      }

      if (!data) {
        alert(
          "تم إرسال الطلب ولكن لم يتم إرجاع بيانات الطلب."
        );

        return;
      }

      /*
       * ========================================================
       * حفظ رقم الطلب
       * ========================================================
       */

      try {
        const oldIdsRaw =
          localStorage.getItem(
            "abu_touq_order_ids"
          );

        let oldOrderIds: string[] =
          [];

        try {
          oldOrderIds =
            oldIdsRaw
              ? JSON.parse(
                  oldIdsRaw
                )
              : [];

          if (
            !Array.isArray(
              oldOrderIds
            )
          ) {
            oldOrderIds = [];
          }
        } catch {
          oldOrderIds = [];
        }

        const newOrderIds = [
          String(data.id),

          ...oldOrderIds
            .map((id) =>
              String(id)
            )
            .filter(
              (id) =>
                id !==
                String(data.id)
            ),
        ];

        localStorage.setItem(
          "abu_touq_order_ids",
          JSON.stringify(
            newOrderIds
          )
        );
      } catch (storageError) {
        console.error(
          "ORDER ID STORAGE ERROR:",
          storageError
        );
      }

      /*
       * ========================================================
       * تجهيز الطلب الأخير
       * ========================================================
       */

      const createdOrder: Order = {
        id: data.id,

        created_at:
          data.created_at,

        customer:
          data.customer,

        phone:
          data.phone,

        location:
          data.location,

        map_link:
          data.map_link,

        subtotal:
          Number(
            data.subtotal
          ),

        delivery_fee:
          Number(
            data.delivery_fee
          ),

        total:
          Number(data.total),

        status:
          data.status,

        items:
          data.items || [],

        delete_after:
          data.delete_after ||
          null,
      };

      setLastOrder(
        createdOrder
      );

      /*
       * ========================================================
       * تفريغ السلة
       * ========================================================
       */

      try {
        cart.forEach(
          (item: any) => {
            removeFromCart(
              item.id
            );
          }
        );
      } catch (cartError) {
        console.error(
          "CART CLEAR ERROR:",
          cartError
        );

        localStorage.removeItem(
          "abu_touq_cart"
        );
      }

      /*
       * تحديث الطلبات الموجودة
       */

      setMyOrders(
        (currentOrders) => [
          createdOrder,

          ...currentOrders.filter(
            (order) =>
              order.id !==
              createdOrder.id
          ),
        ]
      );

      /*
       * إظهار شاشة النجاح
       */

      setOrderSuccess(true);
    } catch (error: any) {
      console.error(
        "CHECKOUT ERROR:",
        error
      );

      alert(
        error?.message ||
          "حدث خطأ أثناء إرسال الطلب."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ============================================================
   * فتح طلباتي بعد نجاح الطلب
   * ============================================================
   */

  const handleShowOrdersAfterSuccess =
    async () => {
      setOrderSuccess(false);

      await loadMyOrders(true);
    };

  /*
   * ============================================================
   * نص حالة الطلب
   * ============================================================
   */

  const getStatusText = (
    status: string
  ) => {
    if (
      status ===
      "قيد التجهيز والتوصيل"
    ) {
      return "قيد التجهيز والتوصيل";
    }

    if (
      status ===
      "قيد التجهيز"
    ) {
      return "قيد التجهيز";
    }

    if (
      status ===
      "تم الاستلام"
    ) {
      return "تم الاستلام";
    }

    if (
      status ===
      "جاري التوصيل"
    ) {
      return "جاري التوصيل";
    }

    if (
      status ===
      "تم التسليم"
    ) {
      return "تم التسليم";
    }

    if (
      status ===
      "مكتمل"
    ) {
      return "مكتمل";
    }

    return (
      status ||
      "قيد التجهيز والتوصيل"
    );
  };

  /*
   * ============================================================
   * أيقونة الحالة
   * ============================================================
   */

  const getStatusIcon = (
    status: string
  ) => {
    if (
      status ===
      "جاري التوصيل"
    ) {
      return (
        <Truck size={18} />
      );
    }

    if (
      status ===
      "تم الاستلام"
    ) {
      return (
        <CheckCircle
          size={18}
        />
      );
    }

    if (
      FINISHED_STATUSES.includes(
        status
      )
    ) {
      return (
        <CheckCircle
          size={18}
        />
      );
    }

    return (
      <Clock size={18} />
    );
  };

  /*
   * ============================================================
   * ألوان الحالة
   * ============================================================
   */

  const getStatusClasses = (
    status: string
  ) => {
    if (
      status ===
      "جاري التوصيل"
    ) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (
      status ===
      "تم الاستلام"
    ) {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (
      FINISHED_STATUSES.includes(
        status
      )
    ) {
      return "bg-green-50 text-green-700 border-green-200";
    }

    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  /*
   * ============================================================
   * الرسالة الخاصة بالحالة
   * ============================================================
   */

  const getStatusMessage = (
    status: string
  ) => {
    /*
     * الحالة الأولى
     */

    if (
      status ===
        "قيد التجهيز والتوصيل" ||
      status ===
        "قيد التجهيز"
    ) {
      return {
        title:
          "🕐 طلبك قيد التجهيز",

        message:
          "طلبك قيد التجهيز، يرجى الانتظار حتى يتم الاتصال عليك.",
      };
    }

    /*
     * تم الاستلام
     */

    if (
      status ===
      "تم الاستلام"
    ) {
      return {
        title:
          "✅ تم استلام طلبك",

        message:
          "تم استلام طلبك، جاري تحضير طلبك.",
      };
    }

    /*
     * جاري التوصيل
     */

    if (
      status ===
      "جاري التوصيل"
    ) {
      return {
        title:
          "🚚 طلبك في الطريق",

        message:
          "تم استلام طلبك من قبل فريق التوصيل، والطلب الآن في الطريق إليك. يرجى الانتظار حتى يتم توصيل طلبك.",
      };
    }

    /*
     * تم التسليم
     */

    if (
      status ===
      "تم التسليم"
    ) {
      return {
        title:
          "🎉 تم تسليم الطلب",

        message:
          "تم تسليم طلبك بنجاح.",
      };
    }

    /*
     * الحالة الافتراضية
     */

    return {
      title:
        "🕐 حالة الطلب",

      message:
        "طلبك قيد المتابعة.",
    };
  };

  /*
   * ============================================================
   * الطلبات الظاهرة للزبون
   *
   * لا نخفي "تم الاستلام"
   * ولا نخفي "جاري التوصيل"
   *
   * الاختفاء الحقيقي يحصل عندما يحذف الطلب من Supabase
   * ============================================================
   */

  const visibleOrders =
    myOrders.filter(
      (order) =>
        !FINISHED_STATUSES.includes(
          order.status
        )
    );

  /*
   * ============================================================
   * شاشة نجاح الطلب
   * ============================================================
   */

  if (orderSuccess) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white flex items-center justify-center px-4 py-10"
      >
        <div className="w-full max-w-xl">

          <div className="bg-white border border-blue-100 rounded-[32px] shadow-[0_20px_70px_rgba(30,64,175,0.12)] overflow-hidden">

            <div className="bg-gradient-to-br from-blue-700 to-blue-500 px-7 py-10 text-center text-white">

              <div className="mx-auto mb-5 w-24 h-24 rounded-full bg-white/15 border border-white/30 flex items-center justify-center">

                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">

                  <CheckCircle
                    size={42}
                    className="text-blue-600"
                  />

                </div>

              </div>

              <h1 className="text-3xl font-black mb-3">
                تم إرسال طلبك بنجاح 🎉
              </h1>

              <p className="text-blue-50 leading-7">
                وصل طلبك إلى إدارة
                المكتبة بنجاح، وسيتم
                تجهيزه والتواصل معك
                بخصوص التوصيل.
              </p>

            </div>

            <div className="p-6 sm:p-8">

              {lastOrder && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">

                  <div className="flex items-center justify-between gap-3">

                    <div>

                      <p className="text-xs text-blue-600 font-bold mb-1">
                        رقم الطلب
                      </p>

                      <p className="font-black text-gray-900 text-sm break-all">
                        {lastOrder.id}
                      </p>

                    </div>

                    <Package
                      size={25}
                      className="text-blue-600"
                    />

                  </div>

                  <div className="border-t border-blue-100 mt-4 pt-4 flex items-center justify-between">

                    <span className="text-sm text-gray-600">
                      الإجمالي
                    </span>

                    <span className="font-black text-blue-700">
                      {Number(
                        lastOrder.total
                      ).toFixed(2)}{" "}
                      دينار
                    </span>

                  </div>

                </div>
              )}

              <button
                type="button"
                onClick={
                  handleShowOrdersAfterSuccess
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-black text-lg transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Eye size={21} />
                مشاهدة طلبي
              </button>

              <Link
                href="/"
                className="mt-3 w-full border-2 border-blue-100 text-blue-700 rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition"
              >
                <ShoppingCart
                  size={20}
                />
                العودة للمتجر
              </Link>

              <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">

                <p className="text-sm font-bold text-gray-800">
                  إذا أردت إلغاء الطلب،
                  اتصل على الرقم التالي:
                </p>

                <a
                  href="tel:0796465131"
                  className="inline-block mt-2 text-blue-700 font-black text-lg"
                >
                  0796465131
                </a>

              </div>

            </div>

          </div>

        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * الواجهة الرئيسية
   * ============================================================
   */

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-blue-50/60 via-white to-white pb-12"
    >

      {/* الهيدر */}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-blue-100 shadow-sm">

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">

          <Link
            href="/"
            className="flex items-center gap-2 text-gray-900 font-black hover:text-blue-600 transition"
          >

            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">

              <ArrowRight
                size={21}
              />

            </div>

            <span>
              الرجوع للمتجر
            </span>

          </Link>

          <button
            type="button"
            onClick={() =>
              loadMyOrders(true)
            }
            disabled={
              loadingOrders
            }
            className="flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-3 font-black transition shadow-lg shadow-blue-600/20 disabled:opacity-60"
          >

            <Package size={19} />

            {loadingOrders
              ? "جاري التحميل..."
              : "طلباتي"}

          </button>

        </div>

      </header>

      {/* ======================================================
          نافذة طلباتي
      ====================================================== */}

      {showOrders && (
        <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-5 overflow-y-auto">

          <div className="bg-white w-full max-w-3xl rounded-[30px] shadow-2xl mt-3 sm:mt-8 mb-8 overflow-hidden">

            {/* رأس النافذة */}

            <div className="bg-gradient-to-l from-blue-700 to-blue-500 text-white p-5 sm:p-6">

              <div className="flex items-center justify-between gap-3">

                <div>

                  <div className="flex items-center gap-2 mb-1">

                    <Package
                      size={22}
                    />

                    <h2 className="text-2xl font-black">
                      طلباتي
                    </h2>

                  </div>

                  <p className="text-blue-100 text-sm">
                    تابع حالة طلباتك وتفاصيلها
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowOrders(false)
                  }
                  className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center transition"
                >
                  <X size={21} />
                </button>

              </div>

            </div>

            {/* المحتوى */}

            <div className="p-4 sm:p-6">

              {ordersError ? (

                <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-center font-bold">

                  {ordersError}

                  <button
                    type="button"
                    onClick={() =>
                      loadMyOrders(true)
                    }
                    className="block mx-auto mt-3 bg-red-600 text-white px-5 py-2.5 rounded-xl"
                  >
                    إعادة المحاولة
                  </button>

                </div>

              ) : visibleOrders.length ===
                0 ? (

                <div className="text-center py-12">

                  <div className="mx-auto w-20 h-20 rounded-3xl bg-blue-50 text-blue-500 flex items-center justify-center mb-5">

                    <ShoppingCart
                      size={38}
                    />

                  </div>

                  <h3 className="text-xl font-black text-gray-900">
                    لا يوجد طلبات حالياً
                  </h3>

                  <p className="text-gray-500 mt-2">
                    أي طلب جديد تقوم بإرساله
                    سيظهر هنا.
                  </p>

                </div>

              ) : (

                <div className="space-y-4">

                  {visibleOrders.map(
                    (order) => {

                      const statusMessage =
                        getStatusMessage(
                          order.status
                        );

                      return (
                        <div
                          key={order.id}
                          className="border border-blue-100 rounded-2xl p-4 sm:p-5 hover:shadow-md transition bg-white"
                        >

                          <div className="flex items-start justify-between gap-3 mb-4">

                            <div>

                              <p className="text-xs text-blue-600 font-bold">
                                رقم الطلب
                              </p>

                              <p className="font-black text-gray-900 text-sm break-all mt-1">
                                {order.id}
                              </p>

                            </div>

                            <div
                              className={`flex items-center gap-1.5 border px-3 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap ${getStatusClasses(
                                order.status
                              )}`}
                            >

                              {getStatusIcon(
                                order.status
                              )}

                              {getStatusText(
                                order.status
                              )}

                            </div>

                          </div>

                          {/* رسالة حالة الطلب */}

                          <div
                            className={`rounded-2xl border p-4 mb-4 ${
                              order.status ===
                              "جاري التوصيل"
                                ? "bg-blue-50 border-blue-200"
                                : order.status ===
                                  "تم الاستلام"
                                ? "bg-green-50 border-green-200"
                                : "bg-amber-50 border-amber-200"
                            }`}
                          >

                            <div className="flex items-start gap-3">

                              <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                  order.status ===
                                  "جاري التوصيل"
                                    ? "bg-blue-600 text-white"
                                    : order.status ===
                                      "تم الاستلام"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >

                                {order.status ===
                                "جاري التوصيل" ? (
                                  <Truck
                                    size={
                                      22
                                    }
                                  />
                                ) : order.status ===
                                  "تم الاستلام" ? (
                                  <CheckCircle
                                    size={
                                      22
                                    }
                                  />
                                ) : (
                                  <Clock
                                    size={
                                      22
                                    }
                                  />
                                )}

                              </div>

                              <div>

                                <p className="font-black text-gray-950">
                                  {
                                    statusMessage.title
                                  }
                                </p>

                                <p className="text-sm text-gray-700 mt-1 leading-6">
                                  {
                                    statusMessage.message
                                  }
                                </p>

                              </div>

                            </div>

                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">

                            <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-50">

                              <p className="text-xs text-gray-500">
                                الإجمالي
                              </p>

                              <p className="font-black text-blue-700 mt-1">
                                {Number(
                                  order.total
                                ).toFixed(
                                  2
                                )}{" "}
                                دينار
                              </p>

                            </div>

                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">

                              <p className="text-xs text-gray-500">
                                المنتجات
                              </p>

                              <p className="font-black text-gray-900 mt-1">
                                {order.items
                                  ?.length ||
                                  0}
                              </p>

                            </div>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedOrder(
                                order
                              )
                            }
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-black transition"
                          >

                            <Eye
                              size={18}
                            />

                            مشاهدة تفاصيل الطلب

                            <ChevronLeft
                              size={17}
                            />

                          </button>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">

                <p className="text-sm font-bold text-gray-800">
                  إذا أردت إلغاء الطلب،
                  اتصل على الرقم التالي:
                </p>

                <a
                  href="tel:0796465131"
                  className="inline-block mt-1 text-blue-700 font-black"
                >
                  0796465131
                </a>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          تفاصيل الطلب
      ====================================================== */}

      {selectedOrder && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-5 overflow-y-auto">

          <div className="bg-white w-full max-w-2xl rounded-[30px] shadow-2xl mt-3 sm:mt-8 mb-8 overflow-hidden">

            <div className="bg-gradient-to-l from-blue-700 to-blue-500 text-white p-5">

              <div className="flex items-center justify-between gap-3">

                <div>

                  <h2 className="text-xl font-black">
                    تفاصيل الطلب
                  </h2>

                  <p className="text-blue-100 text-xs mt-1 break-all">
                    {selectedOrder.id}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedOrder(null)
                  }
                  className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
                >
                  <X size={20} />
                </button>

              </div>

            </div>

            <div className="p-5 sm:p-6 space-y-6">

              {/* الحالة */}

              <div
                className={`rounded-2xl border p-4 ${getStatusClasses(
                  selectedOrder.status
                )}`}
              >

                <p className="text-xs opacity-70 mb-2">
                  حالة الطلب
                </p>

                <div className="flex items-center gap-2 font-black">

                  {getStatusIcon(
                    selectedOrder.status
                  )}

                  {getStatusText(
                    selectedOrder.status
                  )}

                </div>

              </div>

              {/* رسالة الحالة */}

              <div
                className={`rounded-2xl border p-4 ${
                  selectedOrder.status ===
                  "جاري التوصيل"
                    ? "bg-blue-50 border-blue-200"
                    : selectedOrder.status ===
                      "تم الاستلام"
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >

                <div className="flex items-start gap-3">

                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedOrder.status ===
                      "جاري التوصيل"
                        ? "bg-blue-600 text-white"
                        : selectedOrder.status ===
                          "تم الاستلام"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >

                    {selectedOrder.status ===
                    "جاري التوصيل" ? (
                      <Truck
                        size={22}
                      />
                    ) : selectedOrder.status ===
                      "تم الاستلام" ? (
                      <CheckCircle
                        size={22}
                      />
                    ) : (
                      <Clock
                        size={22}
                      />
                    )}

                  </div>

                  <div>

                    <p className="font-black text-gray-950">
                      {
                        getStatusMessage(
                          selectedOrder.status
                        ).title
                      }
                    </p>

                    <p className="text-sm text-gray-700 mt-1 leading-6">
                      {
                        getStatusMessage(
                          selectedOrder.status
                        ).message
                      }
                    </p>

                  </div>

                </div>

              </div>

              {/* المنتجات */}

              <section>

                <h3 className="font-black text-lg mb-3 text-gray-900">
                  المنتجات
                </h3>

                <div className="space-y-3">

                  {(
                    selectedOrder.items ||
                    []
                  ).map(
                    (
                      item,
                      index
                    ) => (

                      <div
                        key={`${item.id}-${index}`}
                        className="flex items-center justify-between gap-3 border border-gray-100 rounded-2xl p-3"
                      >

                        <div className="flex items-center gap-3 min-w-0">

                          {item.image ? (

                            <img
                              src={
                                item.image
                              }
                              alt={
                                item.name
                              }
                              className="w-16 h-16 rounded-xl object-cover border border-gray-100"
                            />

                          ) : (

                            <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">

                              <Package
                                size={
                                  24
                                }
                              />

                            </div>

                          )}

                          <div className="min-w-0">

                            <p className="font-black text-gray-900 truncate">
                              {item.name}
                            </p>

                            <p className="text-sm text-gray-500 mt-1">
                              الكمية:{" "}
                              {
                                item.quantity
                              }
                            </p>

                          </div>

                        </div>

                        <p className="font-black text-gray-900 whitespace-nowrap">

                          {(
                            Number(
                              item.price ||
                                0
                            ) *
                            Number(
                              item.quantity ||
                                1
                            )
                          ).toFixed(
                            2
                          )}{" "}
                          دينار

                        </p>

                      </div>

                    )
                  )}

                </div>

              </section>

              {/* معلومات التوصيل */}

              <section>

                <h3 className="font-black text-lg mb-3 text-gray-900">
                  معلومات التوصيل
                </h3>

                <div className="space-y-3">

                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">

                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">

                      <User
                        size={18}
                      />

                    </div>

                    <span className="font-bold text-gray-900">
                      {
                        selectedOrder.customer
                      }
                    </span>

                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">

                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">

                      <Phone
                        size={18}
                      />

                    </div>

                    <a
                      href={`tel:${selectedOrder.phone}`}
                      className="font-bold text-blue-700"
                    >
                      {
                        selectedOrder.phone
                      }
                    </a>

                  </div>

                  {selectedOrder.location && (

                    <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">

                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                        <MapPin
                          size={18}
                        />

                      </div>

                      <span className="font-bold text-gray-900 leading-6">
                        {
                          selectedOrder.location
                        }
                      </span>

                    </div>

                  )}

                  {selectedOrder.map_link && (

                    <a
                      href={
                        selectedOrder.map_link
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-black transition"
                    >

                      <Navigation
                        size={18}
                      />

                      فتح الموقع على الخريطة

                    </a>

                  )}

                </div>

              </section>

              {/* الحساب */}

              <section className="border-t border-gray-100 pt-5">

                <div className="space-y-3">

                  <div className="flex justify-between text-gray-600">

                    <span>
                      مجموع المنتجات
                    </span>

                    <span className="font-bold text-gray-900">

                      {Number(
                        selectedOrder.subtotal
                      ).toFixed(
                        2
                      )}{" "}
                      دينار

                    </span>

                  </div>

                  <div className="flex justify-between text-gray-600">

                    <span>
                      التوصيل
                    </span>

                    <span className="font-bold text-gray-900">

                      {Number(
                        selectedOrder.delivery_fee
                      ).toFixed(
                        2
                      )}{" "}
                      دينار

                    </span>

                  </div>

                  <div className="flex justify-between text-xl font-black pt-3 border-t border-gray-100">

                    <span className="text-gray-900">
                      الإجمالي
                    </span>

                    <span className="text-blue-700">

                      {Number(
                        selectedOrder.total
                      ).toFixed(
                        2
                      )}{" "}
                      دينار

                    </span>

                  </div>

                </div>

              </section>

              {/* حالة الطلب */}

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">

                <div className="flex items-start gap-3">

                  <ShieldCheck
                    size={21}
                    className="text-blue-600 mt-0.5 shrink-0"
                  />

                  <div>

                    <p className="font-black text-blue-800">
                      متابعة الطلب
                    </p>

                    <p className="text-sm text-blue-700 mt-1 leading-6">

                      يمكنك متابعة حالة الطلب
                      من خلال صفحة طلباتي حتى
                      يتم حذف الطلب من النظام.

                    </p>

                  </div>

                </div>

              </div>

              {/* الإلغاء */}

              <div className="text-center border-t border-gray-100 pt-5">

                <p className="text-sm font-bold text-gray-800">
                  إذا أردت إلغاء الطلب،
                  اتصل على الرقم التالي:
                </p>

                <a
                  href="tel:0796465131"
                  className="inline-block mt-2 text-blue-700 font-black text-lg"
                >
                  0796465131
                </a>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          محتوى السلة
      ====================================================== */}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        <div className="mb-8">

          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-2 text-sm font-black mb-4">

            <ShoppingCart
              size={17}
            />

            سلة المشتريات

          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-950">
            سلة الطلبات
          </h1>

          <p className="text-gray-700 mt-2 text-base">
            راجع منتجاتك وأكمل بيانات
            التوصيل لإرسال طلبك.
          </p>

        </div>

        {/* السلة فارغة */}

        {!cart ||
        cart.length === 0 ? (

          <div className="bg-white border border-blue-100 rounded-[30px] shadow-[0_15px_50px_rgba(30,64,175,0.08)] p-10 sm:p-14 text-center">

            <div className="mx-auto w-24 h-24 rounded-3xl bg-blue-50 text-blue-500 flex items-center justify-center mb-6">

              <ShoppingCart
                size={48}
              />

            </div>

            <h2 className="text-2xl font-black text-gray-950 mb-2">
              السلة فارغة
            </h2>

            <p className="text-gray-600 mb-7">
              لم تقم بإضافة أي منتجات إلى
              السلة بعد.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">

              <Link
                href="/"
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-2xl font-black transition shadow-lg shadow-blue-600/20"
              >
                العودة للمتجر
              </Link>

              <button
                type="button"
                onClick={() =>
                  loadMyOrders(true)
                }
                className="inline-flex items-center justify-center border-2 border-blue-100 text-blue-700 px-7 py-3.5 rounded-2xl font-black hover:bg-blue-50 transition"
              >

                <Package
                  size={19}
                  className="ml-2"
                />

                طلباتي

              </button>

            </div>

          </div>

        ) : (

          <div className="grid lg:grid-cols-2 gap-6 items-start">

            {/* المنتجات */}

            <section className="bg-white border border-blue-100 rounded-[30px] shadow-[0_15px_50px_rgba(30,64,175,0.08)] p-5 sm:p-6">

              <div className="flex items-center justify-between mb-5">

                <div>

                  <h2 className="text-2xl font-black text-gray-950">
                    المنتجات
                  </h2>

                  <p className="text-sm text-gray-600 mt-1">
                    المنتجات الموجودة في
                    سلتك
                  </p>

                </div>

                <div className="bg-blue-50 text-blue-700 rounded-xl px-3 py-2 text-sm font-black">
                  {cart.length} منتج
                </div>

              </div>

              <div className="space-y-3">

                {cart.map(
                  (item: any) => (

                    <div
                      key={item.id}
                      className="flex items-center gap-3 border border-gray-100 rounded-2xl p-3 hover:border-blue-200 hover:shadow-sm transition"
                    >

                      {item.image ? (

                        <img
                          src={
                            item.image
                          }
                          alt={
                            item.name
                          }
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-gray-100"
                        />

                      ) : (

                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">

                          <Package
                            size={
                              28
                            }
                          />

                        </div>

                      )}

                      <div className="flex-1 min-w-0">

                        <h3 className="font-black text-gray-950 truncate">
                          {item.name}
                        </h3>

                        <p className="text-sm text-gray-600 mt-1">
                          الكمية:{" "}
                          {
                            item.quantity
                          }
                        </p>

                        <p className="font-black text-blue-700 mt-1">

                          {(
                            Number(
                              item.price ||
                                0
                            ) *
                            Number(
                              item.quantity ||
                                1
                            )
                          ).toFixed(
                            2
                          )}{" "}
                          دينار

                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeFromCart(
                            item.id
                          )
                        }
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition shrink-0"
                        title="حذف المنتج من السلة"
                      >

                        <Trash2
                          size={
                            19
                          }
                        />

                      </button>

                    </div>

                  )
                )}

              </div>

              {/* الحساب */}

              <div className="mt-6 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-5">

                <div className="flex justify-between text-gray-700 mb-3">

                  <span>
                    مجموع المنتجات
                  </span>

                  <span className="font-black text-gray-950">

                    {itemsTotal.toFixed(
                      2
                    )}{" "}
                    دينار

                  </span>

                </div>

                <div className="flex justify-between text-gray-700 mb-4">

                  <span>
                    رسوم التوصيل
                  </span>

                  <span className="font-black text-gray-950">

                    {DELIVERY_FEE.toFixed(
                      2
                    )}{" "}
                    دينار

                  </span>

                </div>

                <div className="border-t border-blue-100 pt-4 flex justify-between items-center">

                  <span className="text-xl font-black text-gray-950">
                    الإجمالي
                  </span>

                  <span className="text-2xl font-black text-blue-700">

                    {finalTotal.toFixed(
                      2
                    )}{" "}
                    دينار

                  </span>

                </div>

              </div>

            </section>

            {/* بيانات التوصيل */}

            <section className="bg-white border border-blue-100 rounded-[30px] shadow-[0_15px_50px_rgba(30,64,175,0.08)] p-5 sm:p-6">

              <div className="flex items-center gap-3 mb-6">

                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">

                  <Truck
                    size={24}
                  />

                </div>

                <div>

                  <h2 className="text-2xl font-black text-gray-950">
                    بيانات التوصيل
                  </h2>

                  <p className="text-sm text-gray-600 mt-1">
                    أدخل معلوماتك بدقة
                  </p>

                </div>

              </div>

              <form
                onSubmit={
                  handleCheckout
                }
                className="space-y-5"
              >

                {/* الاسم */}

                <div>

                  <label className="block font-black text-gray-950 mb-2">
                    الاسم
                  </label>

                  <div className="relative">

                    <User
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500"
                    />

                    <input
                      type="text"
                      value={
                        customerName
                      }
                      onChange={(
                        e
                      ) =>
                        setCustomerName(
                          e.target
                            .value
                        )
                      }
                      placeholder="اكتب اسمك الكامل"
                      className="w-full border-2 border-gray-100 focus:border-blue-500 rounded-2xl py-3.5 pr-11 pl-4 outline-none text-gray-950 placeholder:text-gray-400 font-medium transition bg-white"
                    />

                  </div>

                </div>

                {/* الهاتف */}

                <div>

                  <label className="block font-black text-gray-950 mb-2">
                    رقم الهاتف
                  </label>

                  <div className="relative">

                    <Phone
                      size={19}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500"
                    />

                    <input
                      type="tel"
                      value={
                        customerPhone
                      }
                      onChange={(
                        e
                      ) =>
                        setCustomerPhone(
                          e.target
                            .value
                        )
                      }
                      placeholder="07XXXXXXXX"
                      className="w-full border-2 border-gray-100 focus:border-blue-500 rounded-2xl py-3.5 pr-11 pl-4 outline-none text-gray-950 placeholder:text-gray-400 font-medium transition bg-white"
                    />

                  </div>

                </div>

                {/* الموقع */}

                <div>

                  <label className="block font-black text-gray-950 mb-2">
                    موقع التوصيل
                  </label>

                  <div className="relative">

                    <MapPin
                      size={19}
                      className="absolute right-4 top-4 text-blue-500"
                    />

                    <textarea
                      value={
                        customerLocation
                      }
                      onChange={(
                        e
                      ) =>
                        setCustomerLocation(
                          e.target
                            .value
                        )
                      }
                      placeholder="اكتب عنوانك بالتفصيل"
                      rows={4}
                      className="w-full border-2 border-gray-100 focus:border-blue-500 rounded-2xl p-4 pr-11 outline-none text-gray-950 placeholder:text-gray-400 font-medium transition bg-white resize-none"
                    />

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleGetLocation
                    }
                    disabled={
                      isLocating
                    }
                    className="w-full mt-3 flex items-center justify-center gap-2 border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 text-blue-700 rounded-2xl py-3.5 font-black transition disabled:opacity-60"
                  >

                    <Navigation
                      size={
                        19
                      }
                    />

                    {isLocating
                      ? "جاري تحديد موقعك..."
                      : "تحديد موقعي تلقائياً عبر GPS"}

                  </button>

                  {mapLink && (

                    <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 rounded-2xl p-3.5 text-sm font-bold">

                      <CheckCircle
                        size={
                          19
                        }
                      />

                      تم تحديد موقعك بنجاح

                    </div>

                  )}

                </div>

                {/* خدمة التوصيل */}

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">

                  <div className="w-12 h-12 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-sm">

                    <Truck
                      size={
                        23
                      }
                    />

                  </div>

                  <div>

                    <p className="font-black text-gray-950">
                      خدمة التوصيل
                    </p>

                    <p className="text-sm text-gray-700 mt-1">

                      رسوم التوصيل:{" "}

                      <strong className="text-blue-700">
                        2.00 دينار
                      </strong>

                    </p>

                  </div>

                </div>

                {/* زر الطلب */}

                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-black text-lg disabled:opacity-50 flex items-center justify-center gap-2 transition shadow-xl shadow-blue-600/20"
                >

                  {isSubmitting ? (

                    <>

                      <span className="animate-spin">
                        ⏳
                      </span>

                      جاري إرسال الطلب...

                    </>

                  ) : (

                    <>

                      <CheckCircle
                        size={
                          21
                        }
                      />

                      تأكيد وإرسال الطلب

                    </>

                  )}

                </button>

                <div className="text-center space-y-2">

                  <p className="text-xs text-gray-600">
                    بعد إرسال الطلب يمكنك
                    الضغط على «طلباتي» لمتابعة
                    حالته.
                  </p>

                  <p className="text-xs font-bold text-gray-800">
                    إذا أردت إلغاء الطلب،
                    اتصل على الرقم التالي:
                  </p>

                  <a
                    href="tel:0796465131"
                    className="text-blue-700 font-black"
                  >
                    0796465131
                  </a>

                </div>

              </form>

            </section>

          </div>

        )}

      </div>

    </main>
  );
}