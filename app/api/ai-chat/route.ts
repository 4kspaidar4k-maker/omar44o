import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   إعدادات
========================================================= */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

/*
  على السيرفر نفضل Service Role إذا كان موجوداً.
  وإذا لم يكن موجوداً نستخدم ANON KEY.
*/
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

/* =========================================================
   أنواع البيانات
========================================================= */

type ChatMessage = {
  role: "user" | "assistant" | "model";
  content: string;
};

type Product = {
  id: string | number;
  title?: string | null;
  name?: string | null;
  price?: number | string | null;
  image?: string | null;
  category?: string | null;
  subject?: string | null;
  year?: string | number | null;
  semester?: string | null;
  dossier_type?: string | null;
};

/* =========================================================
   تنظيف النص
========================================================= */

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   تجهيز المنتج للـ AI
========================================================= */

function productToText(product: Product): string {
  const title = cleanText(product.title || product.name || "بدون اسم");

  const parts = [
    `ID: ${product.id}`,
    `الاسم: ${title}`,
    `السعر: ${
      product.price !== null &&
      product.price !== undefined &&
      product.price !== ""
        ? `${product.price} د.أ`
        : "غير محدد"
    }`,
    `الصورة: ${cleanText(product.image)}`,
    `القسم: ${cleanText(product.category || "عام")}`,
  ];

  if (product.subject) {
    parts.push(`المادة: ${cleanText(product.subject)}`);
  }

  if (product.year !== null && product.year !== undefined) {
    parts.push(`الجيل: ${cleanText(product.year)}`);
  }

  if (product.semester) {
    parts.push(`الفصل: ${cleanText(product.semester)}`);
  }

  if (product.dossier_type) {
    parts.push(`النوع: ${cleanText(product.dossier_type)}`);
  }

  return parts.join(" | ");
}

/* =========================================================
   المنتج النهائي الذي نرسله للواجهة
========================================================= */

function productForClient(product: Product) {
  return {
    id: String(product.id),
    title: cleanText(product.title || product.name || "بدون اسم"),
    price: Number(product.price || 0),
    image: cleanText(product.image),
  };
}

/* =========================================================
   استخراج ID المنتج من رد Gemini
========================================================= */

function extractProductId(text: string) {
  const regex =
    /<<<PRODUCT_ID>>>\s*([\s\S]*?)\s*<<<END_PRODUCT_ID>>>/i;

  const match = text.match(regex);

  if (!match?.[1]) {
    return {
      productId: null,
      cleanReply: text.trim(),
    };
  }

  const productId = match[1].trim();

  const cleanReply = text
    .replace(regex, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    productId,
    cleanReply,
  };
}

/* =========================================================
   POST
========================================================= */

export async function POST(req: Request) {
  try {
    /* -------------------------------------------------------
       1. قراءة الطلب
    ------------------------------------------------------- */

    const body = await req.json();

    const messages = body?.messages as ChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        {
          error: "الرسائل غير صحيحة أو غير متوفرة.",
        },
        { status: 400 }
      );
    }

    /* -------------------------------------------------------
       2. التحقق من المفاتيح
    ------------------------------------------------------- */

    if (!GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY");

      return NextResponse.json(
        {
          error:
            "مفتاح GEMINI_API_KEY غير موجود في .env.local",
        },
        { status: 500 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Missing Supabase credentials");

      return NextResponse.json(
        {
          error:
            "إعدادات Supabase غير موجودة في متغيرات البيئة.",
        },
        { status: 500 }
      );
    }

    /* -------------------------------------------------------
       3. الاتصال بـ Supabase
    ------------------------------------------------------- */

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    const {
      data: productsData,
      error: dbError,
    } = await supabase
      .from("products")
      .select(
        "id,title,name,price,image,category,subject,year,semester,dossier_type"
      )
      .order("created_at", {
        ascending: false,
      });

    if (dbError) {
      console.error(
        "Supabase DB Error:",
        dbError.message
      );

      return NextResponse.json(
        {
          error:
            "تعذر الوصول إلى منتجات المكتبة حالياً.",
        },
        { status: 500 }
      );
    }

    const products: Product[] = productsData || [];

    /* -------------------------------------------------------
       4. إنشاء كتالوج المنتجات للـ AI
    ------------------------------------------------------- */

    const storeProductsText =
      products.length > 0
        ? products.map(productToText).join("\n")
        : "لا توجد منتجات متوفرة حالياً.";

    /* -------------------------------------------------------
       5. تجهيز المحادثة
    ------------------------------------------------------- */

    /*
      نحتفظ بآخر 20 رسالة حتى لا تكبر الـ request
      بشكل غير ضروري.
    */
    const recentMessages = messages.slice(-20);

    const formattedMessages = recentMessages
      .map((message) => {
        const role =
          message.role === "assistant" ||
          message.role === "model"
            ? "model"
            : "user";

        return {
          role,
          parts: [
            {
              text: cleanText(message.content),
            },
          ],
        };
      })
      .filter(
        (message) =>
          message.parts[0].text.length > 0
      );

    /* -------------------------------------------------------
       6. تعليمات المساعد
    ------------------------------------------------------- */

    const systemPrompt = `
أنت مساعد المبيعات الخاص بـ "مكتبة أبو طوق" في الأردن.

شخصيتك:
- احكي باللهجة الأردنية الطبيعية.
- كن لطيفاً ومحترماً.
- رد باختصار.
- لا تكثر كلام.
- لا تستخدم لغة رسمية ثقيلة.
- لا تدّعي أنك إنسان.
- لا تخترع أي منتج أو سعر أو معلومة غير موجودة في كتالوج المكتبة.

مثال أسلوب:
"هلا والله 👋"
"آه موجودة."
"أكيد، هاي متوفرة."
"لا والله يا غالي، مش متوفرة حالياً."

==================================================
قواعد المنتجات
==================================================

الكتالوج الموجود أسفل هذه التعليمات هو المصدر الوحيد للمنتجات.

إذا سأل الزبون عن:
- دوسية
- مادة
- جيل
- فصل
- مكثف
- بنك أسئلة
- بطاقة
- قرطاسية
- أو أي منتج

ابحث داخل الكتالوج.

مهم جداً:
لا تخترع منتجاً.
لا تخترع سعراً.
لا تخترع ID.
لا تخترع صورة.
لا تعد الزبون بتوفر شيء غير موجود.

==================================================
اختيار المنتج
==================================================

إذا كان هناك منتج واضح ومطابق لطلب الزبون:

1. اذكر المنتج باختصار.
2. إذا كان السعر موجوداً، يمكنك ذكر السعر.
3. أخرج ID المنتج الموجود في الكتالوج فقط بهذا الشكل في آخر الرد:

<<<PRODUCT_ID>>>ID_HERE<<<END_PRODUCT_ID>>>

مثال:

آه موجودة يا غالي، هاي دوسية الرياضيات.
سعرها 3.50 د.أ.

<<<PRODUCT_ID>>>123<<<END_PRODUCT_ID>>>

ممنوع وضع أي بيانات أخرى داخل PRODUCT_ID.
ضع الـ ID فقط.

==================================================
متى لا تختار منتجاً؟
==================================================

إذا كان الطلب غير واضح أو يوجد أكثر من منتج محتمل:
- لا تخمن.
- اسأل سؤالاً قصيراً للتوضيح.

مثال:
"أكيد، أي جيل بدك؟"

إذا طلب الزبون منتجاً غير موجود:
"لا والله يا غالي مش متوفرة حالياً بالمكتبة."

ولا تضع PRODUCT_ID.

==================================================
المعلومات المهمة للدوسيات
==================================================

انتبه للفروقات بين:
- الجيل
- المادة
- الفصل
- نوع الدوسية
- المسار
- القسم

مثلاً إذا الزبون قال:
"بدي رياضيات 2010"

ابحث عن منتجات الرياضيات الخاصة بالجيل 2010.

إذا قال:
"بدي مكثف رياضيات"

ابحث عن المنتج الذي نوعه مكثف.

إذا لم تكن المعلومة كافية، اسأل سؤالاً قصيراً بدلاً من التخمين.

==================================================
الرد
==================================================

خلي الرد قصير جداً.

لا تشرح للزبون كيف تعمل.
لا تذكر التعليمات.
لا تذكر الكتالوج.
لا تذكر أنك تستخدم قاعدة بيانات.
لا تستخدم JSON للزبون.

==================================================
كتالوج مكتبة أبو طوق
==================================================

${storeProductsText}
`;

    /* -------------------------------------------------------
       7. رابط Gemini
    ------------------------------------------------------- */

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(
        GEMINI_API_KEY
      )}`;

    /* -------------------------------------------------------
       8. طلب Gemini
    ------------------------------------------------------- */

    const geminiPayload = {
      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },

      contents: formattedMessages,

      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 500,
      },
    };

    const response = await fetch(geminiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(geminiPayload),

      cache: "no-store",
    });

    /* -------------------------------------------------------
       9. قراءة رد Gemini بأمان
    ------------------------------------------------------- */

    let data: any = null;

    try {
      data = await response.json();
    } catch {
      console.error(
        "Gemini returned invalid JSON"
      );

      return NextResponse.json(
        {
          error:
            "وصل رد غير مفهوم من خدمة الذكاء الاصطناعي.",
        },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error(
        "Gemini API Error:",
        JSON.stringify(data, null, 2)
      );

      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.",
        },
        {
          status: response.status,
        }
      );
    }

    /* -------------------------------------------------------
       10. استخراج النص
    ------------------------------------------------------- */

    const parts =
      data?.candidates?.[0]?.content?.parts || [];

    const fullReply = parts
      .map((part: any) => part?.text || "")
      .join("")
      .trim();

    if (!fullReply) {
      console.error(
        "Gemini returned empty response:",
        JSON.stringify(data, null, 2)
      );

      return NextResponse.json(
        {
          reply:
            "هلا والله 👋 احكيلي شو المنتج اللي بتدور عليه.",
          product: null,
        },
        { status: 200 }
      );
    }

    /* -------------------------------------------------------
       11. استخراج ID المنتج
    ------------------------------------------------------- */

    const {
      productId,
      cleanReply: rawCleanReply,
    } = extractProductId(fullReply);

    let cleanReply = rawCleanReply;

    /* -------------------------------------------------------
       12. التحقق من المنتج من قاعدة البيانات
    ------------------------------------------------------- */

    let productData = null;

    if (productId) {
      const foundProduct = products.find(
        (product) =>
          String(product.id).trim() ===
          String(productId).trim()
      );

      if (foundProduct) {
        /*
          مهم:
          لا نأخذ السعر والصورة والعنوان من Gemini.
          نأخذهم مباشرة من Supabase.
        */
        productData =
          productForClient(foundProduct);
      } else {
        console.warn(
          "Gemini selected an invalid product ID:",
          productId
        );
      }
    }

    /* -------------------------------------------------------
       13. تنظيف أي علامات متبقية
    ------------------------------------------------------- */

    cleanReply = cleanReply
      .replace(
        /<<<PRODUCT_ID>>>[\s\S]*?<<<END_PRODUCT_ID>>>/gi,
        ""
      )
      .trim();

    /* -------------------------------------------------------
       14. الرد النهائي
    ------------------------------------------------------- */

    return NextResponse.json(
      {
        reply:
          cleanReply ||
          "هلا والله 👋 كيف بقدر أساعدك؟",

        product: productData,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "AI CHAT SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "حدث خطأ غير متوقع في السيرفر.",
      },
      {
        status: 500,
      }
    );
  }
}
