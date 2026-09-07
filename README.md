This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AI Chat Assistant

An AI-powered fragrance recommendation widget, powered by OpenAI by default
(`gpt-4o-mini`), with Google Gemini (`gemini-3.6-flash`) as an alternative
provider. The provider is selected at runtime via the `AI_PROVIDER` env var —
no code changes needed to switch.

### Environment Variables

Add these to your `.env.local` (see `.env.example`):

```
# AI Provider: "openai" (default) or "gemini"
AI_PROVIDER=openai

# OpenAI API key (used when AI_PROVIDER=openai — the default)
OPENAI_API_KEY=your_api_key_here

# Google Gemini API key (only needed when AI_PROVIDER=gemini)
GEMINI_API_KEY=your_api_key_here
```

### Switching Providers

- **OpenAI (default):** set `AI_PROVIDER=openai` and provide `OPENAI_API_KEY`.
  If `AI_PROVIDER` is unset or contains an unknown value, the assistant falls
  back to OpenAI automatically.
- **Gemini:** set `AI_PROVIDER=gemini` and provide `GEMINI_API_KEY` instead.

### Getting an OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a key and paste it as `OPENAI_API_KEY` in `.env.local`
3. `gpt-4o-mini` is a lightweight, low-cost model suitable for short assistant
   replies. If OpenAI ever deprecates it (404 / "model no longer available"
   errors), update the single `OPENAI_MODEL` constant in
   `src/lib/ai-provider.ts` with the replacement name suggested in the error.

### Getting a Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key and paste it as `GEMINI_API_KEY` in `.env.local`
5. The free tier includes 15 RPM / 1M tokens per day — more than enough for a shopping assistant

### How It Works

- **Floating widget** appears on every page (bottom-right corner)
- **Pulse hint** shows after 5 seconds on first visit
- **Product grounding**: The AI only recommends products from `data/products.json` — hallucinated codes are rejected server-side before reaching the frontend
- **Rate limiting**: 20 requests per minute per IP
- **Conversation history**: Last 10 messages sent to the AI to control token cost
