// Live check: replies must be unwrapped (no raw JSON) and ideally carry codes.
const URL = process.env.CHAT_URL ?? "https://www.parfumsdefoda.com/api/chat";

const payload = {
  messages: [{ role: "user", content: "ما أفضل عطر رجالي شتوي" }],
};

let unwrapped = 0;
let withCodes = 0;
let hardFailures = 0;
const results = [];

for (let i = 0; i < 8; i++) {
  const started = Date.now();
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  const isNested =
    typeof body.reply === "string" && body.reply.trimStart().startsWith("{");
  const hasCodes =
    Array.isArray(body.recommended_product_codes) &&
    body.recommended_product_codes.length > 0;
  const fallback = body.reply === "عذراً، حصل مشكلة تقنية. جرب تاني شوية!";
  if (fallback) hardFailures++;
  if (!isNested) unwrapped++;
  if (hasCodes) withCodes++;
  results.push({
    i,
    ms: Date.now() - started,
    nested: isNested,
    fallback,
    codes: body.recommended_product_codes ?? [],
    replyHead: (body.reply ?? "").slice(0, 55).replace(/\n/g, " "),
  });
}

for (const r of results) {
  console.log(
    `call ${r.i}: ${r.ms}ms nested=${r.nested} fallback=${r.fallback} codes=${JSON.stringify(r.codes)} | ${r.replyHead}`,
  );
}
console.log(
  `\nSummary: ${unwrapped}/8 unwrapped, ${withCodes}/8 with codes, ${hardFailures}/8 hard failures`,
);