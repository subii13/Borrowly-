// Image slots for the demo catalogue. Each slot is resolved against Wikimedia Commons
// (freely licensed media) by scripts/fetch-images.ts. `pick` selects which acceptable
// search result to use; `file` pins an exact Commons file title when known.

export type ImageSlot = {
  key: string;
  dir: "products" | "categories" | "branding";
  query: string;
  pick?: number;
  file?: string;
  fit?: "cover" | "contain";
  width?: number;
  height?: number;
};

export const imageSlots: ImageSlot[] = [
  // Categories
  { key: "cameras", dir: "categories", query: "camera lenses photography equipment" },
  { key: "electronics", dir: "categories", query: "laptop desk workspace" },
  { key: "sports-outdoors", dir: "categories", query: "mountain biking trail" },
  { key: "tools-diy", dir: "categories", query: "hand tools workbench" },
  { key: "events", dir: "categories", query: "DJ party lights crowd" },
  { key: "home-appliances", dir: "categories", query: "modern kitchen appliances" },
  { key: "furniture", dir: "categories", query: "sofa living room" },
  { key: "travel-luggage", dir: "categories", query: "trolley suitcases", file: "File:Trolley suitcases 02.jpg" },
  { key: "education", dir: "categories", query: "student studying desk books" },

  // Cameras & Photography
  { key: "sony-a7iii", dir: "products", query: "Sony Alpha 7 III" },
  { key: "canon-80d", dir: "products", query: "Canon EOS 80D" },
  { key: "canon-50mm", dir: "products", query: "Canon EF 50mm f/1.8 lens" },
  { key: "tripod", dir: "products", query: "Manfrotto tripod" },
  { key: "softbox-kit", dir: "products", query: "softbox studio lighting" },
  { key: "gopro", dir: "products", query: "GoPro HERO camera" },

  // Electronics
  { key: "macbook-air", dir: "products", query: "MacBook Air M1" },
  { key: "thinkpad", dir: "products", query: "Lenovo ThinkPad laptop" },
  { key: "monitor", dir: "products", query: "computer monitor display desk" },
  { key: "jbl-speaker", dir: "products", query: "JBL Flip bluetooth speaker" },
  { key: "ipad", dir: "products", query: "iPad Air tablet" },
  { key: "projector", dir: "products", query: "video projector" },
  { key: "ps5", dir: "products", query: "PlayStation 5", fit: "contain" },

  // Sports & Outdoors
  { key: "mountain-bike", dir: "products", query: "mountain bike hardtail" },
  { key: "camping-tent", dir: "products", query: "dome tent camping" },
  { key: "trekking-backpack", dir: "products", query: "backpack rucksack" },
  { key: "dumbbells", dir: "products", query: "dumbbells" },

  // Tools & DIY
  { key: "cordless-drill", dir: "products", query: "Bosch cordless drill" },
  { key: "power-toolkit", dir: "products", query: "Makita cordless" },
  { key: "electric-screwdriver", dir: "products", query: "cordless electric screwdriver" },
  { key: "laser-measure", dir: "products", query: "laser distance meter" },
  { key: "pressure-washer", dir: "products", query: "Kärcher K" },

  // Events & Entertainment
  { key: "pa-speaker", dir: "products", query: "DJ speakers mixer" },
  { key: "stage-lights", dir: "products", query: "LED stage lights" },
  { key: "projector-screen", dir: "products", query: "projection screen" },
  { key: "string-lights", dir: "products", query: "string lights decoration" },

  // Home Appliances
  { key: "vacuum", dir: "products", query: "Dyson vacuum cleaner" },
  { key: "sewing-machine", dir: "products", query: "Singer sewing machine" },
  { key: "microwave", dir: "products", query: "microwave oven white" },

  // Furniture
  { key: "encyclopedia", dir: "products", query: "wooden bookshelf" },
  { key: "armchair", dir: "products", query: "bean bag chair" },
  { key: "study-desk", dir: "products", query: "computer desk" },

  // Travel & Luggage
  { key: "suitcase", dir: "products", query: "suitcases", file: "File:Small Seafoam and Medium White Luna-Air suitcases.jpg" },
  { key: "duffel", dir: "products", query: "duffel bag" },

  // Education & Study Equipment
  { key: "calculator", dir: "products", query: "Casio scientific calculator" },
  { key: "microscope", dir: "products", query: "student microscope" },
  { key: "telescope", dir: "products", query: "Celestron telescope" },
  { key: "raspberry-pi", dir: "products", query: "Raspberry Pi 4" },
];
