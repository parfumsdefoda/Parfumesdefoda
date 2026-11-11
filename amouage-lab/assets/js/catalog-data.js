/* ==========================================================================
   DEMO CATALOGUE
   --------------------------------------------------------------------------
   Twelve entries in the house register, using the real bottle photography that
   already lives in the shop (public/products/derived/<slug>/{card-800,pdp-1200}).
   Swap this file for your own CMS/PIM payload — the shape below is the whole
   contract the lab needs:

     slug, name, collection, family, gender, price, currency
     sizes:    [{ label, price, soldOut }]
     notes:    { top[], heart[], base[] }
     image:    { base }   → base + "-800.avif|webp" and "-1200.avif|webp"
     isNew, soldOut, description, ingredients

   `image.base` is a path without extension/size so the markup can build a
   <picture> with two formats and two widths.
   ========================================================================== */
window.LAB_CATALOG = [
  {
    slug: "pf020",
    name: "Nocturne Leather",
    collection: "Cuir",
    family: "Leather",
    gender: "For All",
    price: 180,
    currency: "USD",
    sizes: [
      { label: "10 ml", price: 62, soldOut: false },
      { label: "50 ml", price: 180, soldOut: false },
      { label: "100 ml", price: 285, soldOut: false }
    ],
    notes: {
      top: ["Clary Sage", "Pink Pepper", "Elemi"],
      heart: ["Patchouli", "Cinnamon", "Rose"],
      base: ["Suede", "Oud", "Amber"]
    },
    image: { base: "/public/products/derived/pf020" },
    isNew: true,
    soldOut: false,
    description:
      "A suede so dark it reads as shadow. Sage and pink pepper open sharp, then patchouli and rose fold into a leather accord that lingers like a coat kept from another evening.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Linalool, Coumarin, Limonene, Benzyl Salicylate, Eugenol.",
    tags: ["leather", "oud", "evening"]
  },
  {
    slug: "pf040",
    name: "Marine Absolu",
    collection: "Odyssey",
    family: "Aquatic",
    gender: "Him",
    price: 165,
    currency: "USD",
    sizes: [
      { label: "50 ml", price: 165, soldOut: false },
      { label: "100 ml", price: 245, soldOut: false }
    ],
    notes: {
      top: ["Sea Salt", "Bergamot", "Green Mandarin"],
      heart: ["Neroli", "Cypress", "Juniper"],
      base: ["Ambergris", "Cedar", "Musk"]
    },
    image: { base: "/public/products/derived/pf040" },
    isNew: false,
    soldOut: false,
    description:
      "The cold hour of a crossing. Salt and bergamot lift, cypress holds the vertical, and ambergris keeps the air warm long after the deck empties.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool, Citral, Coumarin, Geraniol.",
    tags: ["aquatic", "fresh", "summer"]
  },
  {
    slug: "pf070",
    name: "L'Insigne",
    collection: "Main Collection",
    family: "Oriental",
    gender: "For All",
    price: 210,
    currency: "USD",
    sizes: [
      { label: "50 ml", price: 210, soldOut: false },
      { label: "100 ml", price: 320, soldOut: false }
    ],
    notes: {
      top: ["Saffron", "Davana", "Black Pepper"],
      heart: ["Turkish Rose", "Immortelle", "Labdanum"],
      base: ["Oud", "Tonka", "Vanilla"]
    },
    image: { base: "/public/products/derived/pf070" },
    isNew: false,
    soldOut: false,
    description:
      "A seal in scent form: saffron and davana pressed into rose, then held together by a smoky oud that refuses to close politely.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Coumarin, Linalool, Benzyl Benzoate, Citronellol, Geraniol.",
    tags: ["oriental", "rose", "oud"]
  },
  {
    slug: "pf080",
    name: "Imperial Valley",
    collection: "Main Collection",
    family: "Floral",
    gender: "Her",
    price: 195,
    currency: "USD",
    sizes: [
      { label: "50 ml", price: 195, soldOut: false },
      { label: "100 ml", price: 298, soldOut: true }
    ],
    notes: {
      top: ["Bitter Orange", "Pear", "Violet Leaf"],
      heart: ["Jasmine Absolute", "Peony", "Iris"],
      base: ["Sandalwood", "White Musk", "Cashmere Wood"]
    },
    image: { base: "/public/products/derived/pf080" },
    isNew: false,
    soldOut: false,
    description:
      "Violet leaf over jasmine, kept weightless by iris. The kind of bouquet that reads as light until the sandalwood arrives and changes the temperature of the room.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Linalool, Limonene, Benzyl Acetate, Geraniol, Farnesol.",
    tags: ["floral", "iris", "daylight"]
  },
  {
    // pf090 ships only "framed-*" renditions (its photo carries a printed
    // watermark), so the demo uses pf310's plain cut-out for this entry.
    slug: "pf310",
    name: "Oud Souverain",
    collection: "Library",
    family: "Woody",
    gender: "For All",
    price: 240,
    currency: "USD",
    sizes: [
      { label: "50 ml", price: 240, soldOut: false },
      { label: "100 ml", price: 365, soldOut: false }
    ],
    notes: {
      top: ["Cardamom", "Nutmeg", "Bitter Almond"],
      heart: ["Oud Assam", "Cedar", "Guaiac"],
      base: ["Leather", "Vetiver", "Frankincense"]
    },
    image: { base: "/public/products/derived/pf310" },
    isNew: true,
    soldOut: false,
    description:
      "Resin on old paper. Cardamom and bitter almond give way to a dry Assam oud, guaiac smoke and a vetiver that stays close to the skin.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Linalool, Coumarin, Eugenol, Benzyl Benzoate, Limonene.",
    tags: ["oud", "woody", "winter"]
  },
  {
    slug: "pf100",
    name: "Amber Nomade",
    collection: "Library",
    family: "Amber",
    gender: "For All",
    price: 225,
    currency: "USD",
    sizes: [
      { label: "50 ml", price: 225, soldOut: false },
      { label: "100 ml", price: 340, soldOut: false }
    ],
    notes: {
      top: ["Cinnamon Bark", "Bitter Cocoa", "Bay Leaf"],
      heart: ["Labdanum", "Benzoin", "Immortelle"],
      base: ["Tolu Balsam", "Vanilla", "Myrrh"]
    },
    image: { base: "/public/products/derived/pf100" },
    isNew: false,
    soldOut: false,
    description:
      "Warm resin and cocoa, closer to a room than a perfume. It opens like a market at dusk and settles into balsam, vanilla and myrrh.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Coumarin, Benzyl Benzoate, Cinnamal, Eugenol, Vanillin.",
    tags: ["amber", "warm", "evening"]
  },
  {
    slug: "pf110",
    name: "Iris Papier",
    collection: "Attars",
    family: "Floral",
    gender: "For All",
    price: 175,
    currency: "USD",
    sizes: [
      { label: "6 ml", price: 48, soldOut: false },
      { label: "12 ml", price: 92, soldOut: false }
    ],
    notes: {
      top: ["Orris Root", "Violet", "Aldehydes"],
      heart: ["Powder Iris", "Heliotrope", "Rice Steam"],
      base: ["Musk", "Sandalwood", "Ambrette"]
    },
    image: { base: "/public/products/derived/pf110" },
    isNew: false,
    soldOut: false,
    description:
      "A sheet of laid paper, scented. Orris and aldehydes lift first, then heliotrope softens the whole thing into skin.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Linalool, Geraniol, Citronellol, Hydroxycitronellal.",
    tags: ["iris", "powdery", "attar"]
  },
  {
    slug: "pf130",
    name: "Pacific Hour",
    collection: "Odyssey",
    family: "Aquatic",
    gender: "For All",
    price: 170,
    currency: "USD",
    sizes: [
      { label: "50 ml", price: 170, soldOut: false },
      { label: "100 ml", price: 252, soldOut: false }
    ],
    notes: {
      top: ["Yuzu", "Green Tea", "Mint"],
      heart: ["Fig", "Bamboo", "Lotus"],
      base: ["Blond Woods", "Ambrette", "Salt"]
    },
    image: { base: "/public/products/derived/pf130" },
    isNew: false,
    soldOut: false,
    description:
      "Late afternoon on the coast. Yuzu and green tea are cut through with fig and a hint of salt — restrained, never sugary.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool, Citral, Geraniol, Hexyl Cinnamal.",
    tags: ["fresh", "aquatic", "summer"]
  },
  {
    slug: "pf150",
    name: "Rouge Atelier",
    collection: "Guidance",
    family: "Amber Floral",
    gender: "Her",
    price: 235,
    currency: "USD",
    sizes: [
      { label: "10 ml", price: 74, soldOut: false },
      { label: "50 ml", price: 235, soldOut: false },
      { label: "100 ml", price: 358, soldOut: false }
    ],
    notes: {
      top: ["Saffron", "Jasmine", "Amaranth"],
      heart: ["Amberwood", "Fir Resin", "Cedar"],
      base: ["Musk", "Oakmoss", "Ambroxan"]
    },
    image: { base: "/public/products/derived/pf150" },
    isNew: true,
    soldOut: false,
    description:
      "The atelier at night: saffron over jasmine, a dry amberwood spine, and an oakmoss finish that keeps it from turning sweet.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Linalool, Limonene, Coumarin, Benzyl Salicylate, Evernia Prunastri.",
    tags: ["amber", "jasmine", "signature"]
  },
  {
    slug: "pf170",
    name: "Orchidée Noire",
    collection: "Main Collection",
    family: "Chypre",
    gender: "For All",
    price: 205,
    currency: "USD",
    sizes: [
      { label: "50 ml", price: 205, soldOut: false },
      { label: "100 ml", price: 312, soldOut: true }
    ],
    notes: {
      top: ["Black Truffle", "Bergamot", "Ylang-Ylang"],
      heart: ["Black Orchid", "Lotus", "Orris"],
      base: ["Patchouli", "Incense", "Vanilla"]
    },
    image: { base: "/public/products/derived/pf170" },
    isNew: false,
    soldOut: false,
    description:
      "Truffle and ylang open in contrast, then the orchid turns dark and powdery. Incense carries the last hour.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Linalool, Benzyl Salicylate, Limonene, Coumarin, Eugenol.",
    tags: ["chypre", "orchid", "evening"]
  },
  {
    slug: "pf230",
    name: "Tabac Vanille",
    collection: "Main Collection",
    family: "Oriental",
    gender: "For All",
    price: 215,
    currency: "USD",
    sizes: [
      { label: "50 ml", price: 215, soldOut: false },
      { label: "100 ml", price: 330, soldOut: false }
    ],
    notes: {
      top: ["Tobacco Leaf", "Spice", "Cacao"],
      heart: ["Vanilla Absolute", "Tonka", "Dried Fruit"],
      base: ["Benzoin", "Wood", "Amber"]
    },
    image: { base: "/public/products/derived/pf230" },
    isNew: false,
    soldOut: false,
    description:
      "Tobacco leaf laid over vanilla absolute — smoky, resinous, and warm enough that one spray carries a whole winter evening.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Coumarin, Benzyl Benzoate, Limonene, Linalool, Vanillin.",
    tags: ["tobacco", "vanilla", "winter"]
  },
  {
    slug: "pf260",
    name: "Bleu Déluge",
    collection: "Odyssey",
    family: "Woody",
    gender: "Him",
    price: 158,
    currency: "USD",
    sizes: [
      { label: "50 ml", price: 158, soldOut: true },
      { label: "100 ml", price: 238, soldOut: true }
    ],
    notes: {
      top: ["Grapefruit", "Bergamot", "Fig Leaf"],
      heart: ["Papyrus", "Mineral Accord", "Sage"],
      base: ["Ambroxan", "Patchouli", "Vetiver"]
    },
    image: { base: "/public/products/derived/pf260" },
    isNew: false,
    soldOut: true,
    description:
      "Rain on cut stone. Grapefruit and fig leaf flash bright, then papyrus and a mineral accord take over — cold, clean, and gone by morning.",
    ingredients:
      "Alcohol Denat., Parfum (Fragrance), Aqua (Water), Limonene, Linalool, Citral, Coumarin, Geraniol.",
    tags: ["woody", "fresh", "mineral"]
  }
];

/* --------------------------------------------------------------------------
   Derived helpers — used by catalog.js and product.js
   -------------------------------------------------------------------------- */
window.LAB = {
  catalog: window.LAB_CATALOG,
  currency: (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value),
  bySlug: (slug) =>
    window.LAB_CATALOG.find((p) => p.slug === slug) || window.LAB_CATALOG[0],
  imageSet: (product, size) => {
    const path = `${product.image.base}/${size}`;
    return {
      avif: `${path}.avif`,
      webp: `${path}.webp`,
      /** `card-800` for grid use, `pdp-1200` for the gallery. */
      path
    };
  }
};
