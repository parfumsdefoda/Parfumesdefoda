# Future Roadmap — Parfums De Foda

## v1.1 (Short-term)

- Product search
- Wishlist/favorites
- Product reviews

## v1.2 (Medium-term)

- Discount codes
- Admin dashboard (JSON editor UI)
- Inventory management

## v2.0 (Long-term)

- Online payment integration (Fawry, Paymob, Vodafone Cash)
- Multi-language support (English, French)
- Dark mode
- CMS integration
- Analytics dashboard

## Architecture Compatibility

The current architecture supports all of the above without requiring a rebuild:

- **Payment:** Add payment step in checkout feature + `data/payment.json`
- **Multi-language:** Add locale files to `locales/` folder
- **Dark mode:** Add dark theme block in `theme.json`
- **CMS:** Swap service layer (JSON fetch → API fetch)
