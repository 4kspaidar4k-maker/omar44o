import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// استخدام المتغيرات البيئية بشكل آمن
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  "AQ.Ab8RN6JZ58KXa5jNzL6q2SS7LuQ9Jrm6955zIeDV8W9P63YSDA";

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

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const lowerText = lastUserMessage.toLowerCase();

    // 1. التعامل الفوري مع استفسارات البطاقات
    if (lowerText.includes("بطاقة") || lowerText.includes("بطاقات")) {
      return NextResponse.json({
        reply:
          "لا والله حالياً غير متوفر بالموقع، إذا بدك موجود ممكن تتصل على إحدى الموظفين وممكن هم يساعدوك بالبطاقات.",
      });
    }

    // 2. الاتصال بقاعدة البيانات وجلب المنتجات
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

    // 3. تجهيز قائمة المنتجات
    const products = productsData || [];
    let storeProductsText = "";

    if (products.length === 0) {
      storeProductsText = "لا توجد أي منتجات مضافة في المتجر حالياً.";
    } else {
      storeProductsText = products
        .map((p, i) => {
          const details = [
            `المعرف: ${p.id}`,
            `الاسم: ${p.title || p.name || "بدون اسم"}`,
            `السعر: ${
              p.price !== null && p.price !== undefined
                ? `${p.price} د.أ`
                : "غير محدد"
            }`,
            `القسم: ${p.category || "عام"}`,
            `الصورة: ${p.image || p.image_url || ""}`,
          ];
          if (p.subject) details.push(`المادة: ${p.subject}`);
          if (p.year) details.push(`الجيل: ${p.year}`);
          if (p.semester) details.push(`الفصل: ${p.semester}`);
          if (p.dossier_type) details.push(`النوع: ${p.dossier_type}`);
          return `[${i + 1}] ${details.join(" | ")}`;
        })
        .join("\n");
    }

    // 4. تجهيز المحادثات
    const formattedMessages = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })
    );

    // 5. تعديل اسم النموذج إلى gemini-2.0-flash أو gemini-1.5-flash
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

قواعد التعامل مع طلبات الزبائن:
1. جيل 2010 وجيل 2009 متوفرين تماماً: جميع دوسيات جيل 2010 وجيل 2009 متوفرة في قاعدة البيانات بمختلف الأقسام والمواد. إذا سأل الزبون بشكل عام عن توفر دوسيات 2010 أو 2009 أكد له فوراً أنها متوفرة واسأله عن المادة أو الأستاذ ليجدها له.
2. فهم العامية والبحث المرن: افهم الزبون كيفما كتب ("دوسيه"، "دوسية"، "ابحثلي عن"، "عندكو"، "بدي"). قارن البحث بالأسماء والأقسام والأجيال والمواد في القائمة المرفقة.
3. التوافر: إذا وجد الزبون دوسية أو منتجاً معيناً، جاوبه بلهجة أردنية مهذبة واطلب منه تأكيد الإضافة بالسلة (مثال: "أه والله موجودة [اسم الدوسية] وسعرها [السعر] د.أ، بتحب أضيفلك إياها بالسلة؟").
4. عدم التوافر: إذا لم تجد أي كلمة قريبة أو مطابقة في القائمة، احكيله بوضوح: "لا والله، مش موجودة حالياً بالمكتبة".
5. ممنوع التخمين: لا تخترع أسماء أو أسعار من عندك، واعتمد حصراً على القائمة.
6. لا تفصح عن أي تفاصيل برمجية (Supabase أو API أو قاعدة بيانات) للمستخدم.

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
        { error: data?.error?.message || "خطأ في الاتصال بالنموذج" },
        { status: response.status }
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "أهلاً بك، كيف بقدر أساعدك اليوم؟";

    // 6. المطابقة وإعادة المنتج
    let matchedProduct = undefined;
    if (products.length > 0) {
      const found = products.find((p) => {
        const title = (p.title || p.name || "").toLowerCase();
        const subject = (p.subject || "").toLowerCase();
        return (
          (title && lowerText.includes(title)) ||
          (subject && lowerText.includes(subject)) ||
          (p.year && lowerText.includes(String(p.year)))
        );
      });

      if (found) {
        matchedProduct = {
          id: String(found.id),
          title: found.title || found.name || "دوسية",
          price: Number(found.price || 0),
          image: found.image || found.image_url || undefined,
        };
      }
    }

    return NextResponse.json({
      reply,
      product: matchedProduct,
    });
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
