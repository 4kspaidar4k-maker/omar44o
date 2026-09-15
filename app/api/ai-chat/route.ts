import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// مفتاح الذكاء الاصطناعي
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// بيانات قاعدة بيانات Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "الرسائل غير صحيحة أو غير متوفرة." },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "مفتاح GEMINI_API_KEY غير معرف في متغيرات البيئة." },
        { status: 500 }
      );
    }

    // 1. الاتصال بقاعدة البيانات وجلب المنتجات المتوفرة حالياً
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

    // 2. تجهيز قائمة المنتجات للذكاء الاصطناعي
    const products = productsData || [];
    let storeProductsText = "";

    if (products.length === 0) {
      storeProductsText = "لا توجد أي منتجات مضافة في المتجر حالياً.";
    } else {
      storeProductsText = products
        .map((p) => {
          const details = [
            `ID: ${p.id}`,
            `الاسم: ${p.title || "بدون اسم"}`,
            `السعر: ${
              p.price !== null && p.price !== undefined
                ? `${p.price} د.أ`
                : "غير محدد"
            }`,
            `الصورة: ${p.image || ""}`,
            `القسم: ${p.category || "عام"}`,
          ];
          if (p.subject) details.push(`المادة: ${p.subject}`);
          if (p.year) details.push(`الجيل: ${p.year}`);
          if (p.semester) details.push(`الفصل: ${p.semester}`);
          if (p.dossier_type) details.push(`النوع: ${p.dossier_type}`);
          return details.join(" | ");
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

    // 4. إرسال الطلب لـ Gemini مع التعليمات الأردنية والمختصرة
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
                text: `أنت موظف في مكتبة "أبو طوق"، تحكي بلهجة أردنية عامية، مرتبة، ومختصرة جداً بدون كثرة حكي ولت وعجن.

قواعد شخصيتك وردك على الزبائن:
1. الشخصية: احكي زي كأنك موظف أردني حقيقي بمكتبة (مثال: "أهلاً وسهلاً"، "هلا بيك"، "هلا معلم"، "أه والله موجودة"، "تفضل هيها"، "مش متوفرة حالياً والله").
2. اختصار الحكي: ممنوع تكثر كلام! جاوب السطر المفيد مباشرة وبشكل مختصر جداً.
3. المطابقة والبحث: افهم شو ما كتب الزبون ("دوسيه"، "بطاقة"، "عمر"، "مكثف") وقارن الاسم بالقائمة.
4. إرفاق كرت المنتج: إذا لقيت المنتج المطلوب، جاوبه بسطرين قصار وأرفق كائن الـ JSON الخاص بالمنتج بآخر كلامك بالضبط بهاي الصيغة:
   <<<PRODUCT_DATA>>>{"id": "...", "title": "...", "price": 0, "image": "..."}<<<END_PRODUCT_DATA>>>
5. غير متوفر: إذا طلب شيء مش موجود أبداً، احكيله بوضوح وبدون زيادة حكي: "لا والله يا غالي مش متوفرة حالياً بالمكتبة."
6. ممنوع تأليف أسعار أو دوسيات من عندك، اعتمد فقط على قائمة المكتبة المرفقة أدناه.

قائمة متجر مكتبة أبو طوق الحالية:
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

    const fullReply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "أهلاً وسهلاً بيك، كيف بقدر أساعدك؟";

    // استخراج بيانات المنتج للبطاقة إن وُجدت (متوافق مع كل إصدارات TypeScript)
    let productData = null;
    let cleanReply = fullReply;

    const regexPattern = /<<<PRODUCT_DATA>>>([\s\S]*?)<<<END_PRODUCT_DATA>>>/;
    const match = fullReply.match(regexPattern);

    if (match && match[1]) {
      try {
        productData = JSON.parse(match[1].trim());
        cleanReply = fullReply.replace(regexPattern, "").trim();
      } catch (e) {
        console.error("خطأ في قراءة JSON المنتج:", e);
      }
    }

    return NextResponse.json({ reply: cleanReply, product: productData });
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
