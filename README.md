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

An AI-powered fragrance recommendation widget, powered by OpenAI
(`gpt-4o-mini`).

### Environment Variables

Add this to your `.env.local` (see `.env.example`):

```
OPENAI_API_KEY=your_api_key_here
```

### Getting an OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a key and paste it as `OPENAI_API_KEY` in `.env.local`
3. `gpt-4o-mini` is a lightweight, low-cost model suitable for short assistant
   replies. If OpenAI ever deprecates it (404 / "model no longer available"
   errors), update the single `OPENAI_MODEL` constant in
   `src/lib/ai-provider.ts` with the replacement name suggested in the error.

### How It Works

- **Floating widget** appears on every page (bottom-right corner)
- **Pulse hint** shows after 5 seconds on first visit
- **Product grounding**: The AI only recommends products from `data/products.json` — hallucinated codes are rejected server-side before reaching the frontend
- **Rate limiting**: 20 requests per minute per IP
- **Conversation history**: Last 10 messages sent to the AI to control token cost
