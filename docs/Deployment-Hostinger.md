# Deployment Guide — Hostinger

## Prerequisites

- Hostinger hosting plan with Node.js support
- Custom domain: parfumsdefoda.com
- FTP or Hostinger File Manager access

## Steps

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Upload files:**
   Upload the following to your Hostinger public_html directory:
   - `.next/` folder
   - `public/` folder
   - `package.json`
   - `next.config.ts`
   - `node_modules/` (or run `npm install` on the server)

3. **Configure Node.js on Hostinger:**
   - Set entry point: `node_modules/.bin/next start`
   - Set Node.js version: 20+

4. **Set environment variables:**
   - `NEXT_PUBLIC_SITE_URL`: https://parfumsdefoda.com
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`: Your WhatsApp number
   - `NEXT_PUBLIC_EMAIL`: Your email address

5. **Test:**
   Visit your domain and verify all pages load correctly.
