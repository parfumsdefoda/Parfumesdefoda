import { NextResponse } from "next/server";
import { getChatCompletion, type ChatMessage } from "@/lib/ai-provider";
import {
  buildProductContext,
  validateProductCodes,
  prioritySortCodes,
  loadCatalog,
} from "@/lib/product-grounding";
import { checkRateLimit } from "@/lib/rate-limiter";
import type { ChatProduct } from "@/features/chat-assistant/types";

// ─── Config ─────────────────────────────────────────────────────────────────

/** Maximum messages to send to the AI (controls token cost) */
const MAX_HISTORY = 10;

/** Rate limit: 20 requests per minute per IP */
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

// ─── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في اختيار العطور لموقع Parfums De Foda.
مهمتك تفهم ذوق العميل من كلامه الطبيعي (المناسبة، الجو، هل يحب عطور قوية أو خفيفة، شرقي أو غربي، رجالي أو نسائي، الميزانية) وترشح له من قائمة المنتجات المتاحة تحت فقط — ممنوع تمامًا اختراع منتجات مش موجودة في القائمة أو ترشيح عطور من خارج الكتالوج.
اسأل سؤال أو اتنين توضيحيين لو محتاج تفهم الذوق أكتر قبل ما ترشح، بأسلوب ودود وقصير باللهجة المصرية العامية البسيطة.
لما ترشح منتج، اذكر كوده بالظبط زي ما هو مكتوب في القائمة عشان الواجهة تقدر تربطه بكارت المنتج.
始终保持 ردودك قصيرة (٢-٤ جمل كحد أقصى) — أنت مساعد تسوقي للعطور، مش محادثة طويلة.
إذا العميل سأل عن حاجة مش متعلقة بالعطور بأي شكل، رد بلطف: "أنا هنا بس عشان أساعدك تختار العطر المناسب 😊 تحب أرشحلك حاجة؟"
لما تقترح أكتر من عطر مناسب لنفس الطلب، رتب الاقتراحات بحيث العطور المصنّفة "فاخر: نعم" تظهر أولاً في الترتيب، طالما هي فعلاً مناسبة لذوق العميل ومعناها الموصوف — متقترحش عطر فاخر مش مناسب فعلاً بس عشان يبقى الأول.

IMPORTANT: Always respond in valid JSON with exactly this structure:
{
  "reply": "نص الرد الطبيعي بالعربي",
  "recommended_product_codes": ["PFXXX", "PFYYY"]
}
كود كل عطر بترشحه لازم يتحط في الحقل recommended_product_codes في الـ JSON — مش بس في نص الرد. If you are still asking questions (no recommendations yet), return an empty array for recommended_product_codes.
Never include product codes that are not in the catalog provided below.
ممنوع نهائيًا تكتب JSON جوه نص الرد نفسه أو تحط نص الرد جوه علامات تنصيص متداخلة — الرد دا كله JSON واحد سليم من غير طبقات زيادة.`;

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Rate limiting by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  const rateLimit = checkRateLimit(`chat:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "تم تجاوز الحد المسموح. ا	try تاني بعد شوية." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  try {
    // Parse request body
    const body = await request.json() as { messages?: Array<{ role: string; content: string }> };

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "محتاجين رسالة على الأقل" },
        { status: 400 },
      );
    }

    // Cap conversation history
    const recentMessages = body.messages.slice(-MAX_HISTORY);

    // Convert to our ChatMessage format
    const messages: ChatMessage[] = recentMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      content: String(m.content),
    }));

    // Ensure last message is from user
    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return NextResponse.json(
        { error: "الرسالة الأخيرة لازم تكون من العميل" },
        { status: 400 },
      );
    }

    // Load catalog
    const { products, validIds } = await loadCatalog();
    if (products.length === 0) {
      return NextResponse.json(
        {
          reply: "عذراً، فيه مشكلة في تحميل المنتجات دلوقتي. جرب تاني شوية.",
          recommended_product_codes: [],
          products: [],
        },
        { status: 200 },
      );
    }

    // Build product context
    const productContext = buildProductContext(products);

    // Add product context as system message prefix
    const systemWithContext = `${SYSTEM_PROMPT}\n\n--- قائمة المنتجات المتاحة ---\n${productContext}\n--- نهاية القائمة ---`;

    // Call AI
    const result = await getChatCompletion(messages, systemWithContext);

    // Ground: validate product codes against real catalog
    const groundedCodes = validateProductCodes(
      result.recommended_product_codes,
      validIds,
    );

    // Deterministic backstop: luxury (فاخر) products move first, preserving
    // the model's relative ordering within each group. Runs AFTER validation
    // so hallucinated codes are never sorted into the response.
    const featuredIds = new Set(
      products.filter((p) => p.featured).map((p) => p.id),
    );
    const sortedCodes = prioritySortCodes(groundedCodes, featuredIds);

    // Resolve grounded codes to product details for the chat cards
    // (the client widget is self-contained and does no catalog loading)
    const chatProducts: ChatProduct[] = products
      .filter((p) => p.status === "active" && sortedCodes.includes(p.id))
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        image: p.image,
        type: p.type,
        gender: p.gender,
        house: p.house,
        season: p.season,
        performance: p.performance,
        sizes: p.sizes,
      }));

    return NextResponse.json(
      {
        reply: result.reply,
        recommended_product_codes: sortedCodes,
        products: chatProducts,
      },
      {
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      },
    );
  } catch (error) {
    console.error("[chat] API error:", error);
    return NextResponse.json(
      {
        reply: "عذراً، حصل مشكلة تقنية. جرب تاني شوية!",
        recommended_product_codes: [],
        products: [],
      },
      { status: 200 }, // Return 200 so frontend can display the error message
    );
  }
}
