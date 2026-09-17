import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// مفتاح الذكاء الاصطناعي
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  "AQ.Ab8RN6JZ58KXa5jNzL6q2SS7LuQ9Jrm6955zIeDV8W9P63YSDA";

// بيانات قاعدة بيانات Supabase
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bkfcqlnyzpehhrwsnanm.supabase.co";

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AIwLFIIjhcUAU30U9A-Zqg_rgSLzjLU";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "الرسائل غير صحيحة أو غير متوفرة." },
        { status: 400 }
      );
    }

    // 1. الاتصال بقاعدة البيانات وجلب كافة المنتجات
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

    // 2. تجهيز وتنسيق قائمة المنتجات ليفهمها الذكاء الاصطناعي
    const products = productsData || [];
    let storeProductsText = "";

    if (products.length === 0) {
      storeProductsText = "لا توجد أي منتجات مضافة في المتجر حالياً.";
    } else {
      storeProductsText = products
        .map((p, i) => {
          const details = [
            `الاسم: ${p.title || p.name || "بدون اسم"}`,
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

    // 3. تجهيز سجل الرسائل
    const formattedMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    );

    // 4. إرسال الطلب مع التعليمات المحدثة للذكاء الاصطناعي
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `أنت المساعد الذكي الرسمي لمكتبة أبو طوق.

وظيفتك الأساسية الإجابة عن توفر الدوسيات والمنتجات بناءً على قائمة المنتجات المرفقة فقط:

قواعد الرد على الزبون:
1. السؤال عن أجيال معينة (مثل جيل 2010 أو 2009): 
   - افحص القائمة، إذا كان هناك أي منتج يخص هذا الجيل، أجب فوراً بـ: "نعم متوفرة دوسيات جيل [الجيل]!" ثم اسأله عن المادة أو الأستاذ الذي يبحث عنه لتبحث له بالتحديد.
   - إذا لم تجد هذا الجيل في القائمة إطلاقاً، قل له بوضوح: "لا والله، دوسيات جيل [الجيل] مش متوفرة حالياً بالمكتبة".

2. البحث عن دوسية أو أستاذ أو مادة معينة:
   - افهم طريقة كتابة الزبون حتى بالعامية ("دوسيه"، "عندكو"، "ابحثلي").
   - انظر في القائمة: إذا وجدتها أجب بأسلوب أردني مهذب ولطيف واذكر اسمها وسعرها ورغبته في تجهيزها (مثال: "أه والله موجودة [اسم الدوسية] وسعرها [السعر] د.أ، بتحب نجهزلك إياها؟").
   - إذا لم تجد الدوسية أو الأستاذ مطابقتين في القائمة، أجب بوضوح: "لا والله، مش موجودة حالياً بالمكتبة".

3. شروط صارمة:
   - اعتمد 100% على القائمة المرفقة بالأسفل ولاتخترع أية أسماء أو أسعار من عندك.
   - لا تذكر أي تفاصيل برمجية أو تقنية للمستخدم.

قائمة المنتجات الحالية من قاعدة البيانات:
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
        { error: data?.error?.message || "خطأ في الاتصال بالنموذج" },
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
