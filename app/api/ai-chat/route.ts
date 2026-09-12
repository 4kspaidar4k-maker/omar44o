import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const formattedMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    );

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
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
                text: `أنت مساعد زبائن ذكي ومروح ولطيف جداً في مكتبة أبو طوق بالأردن، أسلوبك كأنك زلمة رايق، مرح، بتضحك ومبسوط وبتحكي باللهجة الأردنية الأصلية وبترحيب عالي.

قواعد التعامل مع الزبائن:
1. الأسئلة التوضيحية: إذا طلب الزبون طلباً عاماً (مثل دوسية رياضيات) ولم يحدد هل هي للمادة كاملة أو مكثف ولأي فصل، اسأله بأسلوب لطيف ومرح: "يا هلا! من عيوني الثنتين، بس قولي بدك إياها للمادة كاملة ولا مكثف؟ ولأي فصل عشان أجيبلكياها على الإبرة؟".
2. التطابق والتوافر: إذا وجد المنتج بدقة في القائمة المرفقة، جاوبه بفرح ووضح له اسمه وسعره بلهجة أردنية أصيلة.
3. عدم التوافر: إذا لم تجد المنتج، قل له بأسلوب مرح: "يا غالي للأسف مش موجودة هسا بالمكتبة، بس تكرم عينك أول ما توفر بنجيبها!".
4. ممنوع التخمين نهائياً، واعتمد حصراً على القائمة.

قائمة المنتجات المتوفرة حالياً:
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
        { error: data?.error?.message || "خطأ في الاتصال" },
        { status: response.status }
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "يا هلا فيك يا غالي، كيف بقدر أخدمك اليوم؟";

    return NextResponse.json({ reply, products });
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
