import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// استدعاء المفاتيح بأمان من متغيرات البيئة لمنع حظر GitHub
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "مفتاح GEMINI_API_KEY غير متوفر في متغيرات البيئة." },
        { status: 500 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json(
        { error: "بيانات الاتصال بـ Supabase غير متوفرة في متغيرات البيئة." },
        { status: 500 }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "الرسائل غير صحيحة أو غير متوفرة." },
        { status: 400 }
      );
    }

    // 1. استدعاء المنتجات الحية من قاعدة بيانات Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: productsData, error: dbError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      console.error("Supabase Error:", dbError);
      return NextResponse.json(
        { error: `خطأ في استرجاع المنتجات: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 2. تجهيز وتنسيق قائمة المنتجات كمرجع للذكاء الاصطناعي
    const products = productsData || [];
    let storeProductsText = "";

    if (products.length === 0) {
      storeProductsText = "لا توجد أي منتجات مضافة في المتجر حالياً.";
    } else {
      storeProductsText = products
        .map((p, i) => {
          const details = [
            `الاسم: ${p.title || "بدون اسم"}`,
            `السعر: ${
              p.price !== null && p.price !== undefined
                ? `${p.price} د.أ`
                : "غير محدد"
            }`,
            `القسم: ${p.category || "عام"}`,
          ];
          if (p.subject) details.push(`المادة: ${p.subject}`);
          if (p.year) details.push(`الجيل: ${p.year}`);
          if (p.semester) details.push(`الفصل: ${p.semester}`);
          if (p.dossier_type) details.push(`النوع: ${p.dossier_type}`);
          return `[${i + 1}] ${details.join(" | ")}`;
        })
        .join("\n");
    }

    // 3. تحويل الرسائل لتنسيق Gemini API
    const formattedMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    );

    // 4. إرسال الطلب مع الترويسة الصحيحة للمصادقة
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `أنت المساعد الذكي الرسمي لمكتبة أبو طوق في الأردن.

قواعد التعامل مع طلبات الزبائن:
1. فهم العامية والبحث المرن: افهم الزبون كيفما كتب ("دوسيه"، "دوسية"، "ابحثلي عن"، "عندكو"، "بدي"). استخرج الكلمة المفتاحية (اسم المادة، اسم الأستاذ، أو اسم المنتج) وقارنها بالقائمة المرفقة.
2. التطابق التقريبي والجزئي: إذا كتب الزبون اسماً مثل "عمر" وكان جزءاً من اسم منتج عندك أو قريباً منه جداً، اعتبره موجوداً فوراً.
3. التوافر: إذا كان المنتج موجوداً، جاوبه بلهجة أردنية لطيفة ومختصرة واذكر اسم المنتج وسعره المكتوب (مثال: "أه والله موجودة [اسم الدوسية] وسعرها [السعر] د.أ، بتحب نجهزلك إياها؟").
4. عدم التوافر: إذا لم تجد أي كلمة قريبة أو مطابقة في القائمة، احكيله بوضوح: "لا والله، مش موجودة حالياً بالمكتبة".
5. ممنوع التخمين: لا تخترع أسماء أو أسعار من عندك، واعتمد حصراً على القائمة.
6. لا تفصح عن أي تفاصيل برمجية (مثل Supabase، API، أو قواعد البيانات) للمستخدم.

قائمة المتجر المتوفرة حالياً من قاعدة البيانات:
${storeProductsText}`,
              },
            ],
          },
          contents: formattedMessages,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "خطأ في الاتصال بنموذج الذكاء الاصطناعي" },
        { status: response.status }
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "أهلاً بك، كيف بقدر أساعدك اليوم؟";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
