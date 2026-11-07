// Demonstration data. Every record created from this file is flagged isDemo = true.

export const DEMO_PASSWORD = "Borrowly@Demo2026";

export const categories = [
  { slug: "cameras-photography", name: "Cameras & Photography", description: "Mirrorless bodies, lenses, tripods and studio lighting for shoots and weddings.", image: "cameras" },
  { slug: "electronics", name: "Electronics", description: "Laptops, tablets, monitors, speakers, projectors and consoles.", image: "electronics" },
  { slug: "sports-outdoors", name: "Sports & Outdoors", description: "Bikes, tents and trekking gear for weekends in the Western Ghats.", image: "sports-outdoors" },
  { slug: "tools-diy", name: "Tools & DIY", description: "Drills, drivers, measuring kits and washers for home projects.", image: "tools-diy" },
  { slug: "events-entertainment", name: "Events & Entertainment", description: "PA systems, stage lights, screens and décor for functions.", image: "events" },
  { slug: "home-appliances", name: "Home Appliances", description: "Vacuum cleaners, sewing machines and kitchen appliances.", image: "home-appliances" },
  { slug: "furniture", name: "Furniture", description: "Desks and seating for hostels, rentals and short stays.", image: "furniture" },
  { slug: "travel-luggage", name: "Travel & Luggage", description: "Suitcases and duffels for trips, without buying a new set.", image: "travel-luggage" },
  { slug: "education", name: "Education & Study", description: "Calculators, microscopes, telescopes, kits and reference books.", image: "education" },
] as const;

export type DemoUserKey =
  | "admin" | "arjun" | "karthik" | "divya" | "senthil" | "rahul" | "farhan" | "ananya" | "vikram"
  | "sneha" | "irfan" | "kavya" | "deepak" | "nithya" | "gokul" | "lakshmi";

export const users: { key: DemoUserKey; email: string; name: string; role?: "ADMIN"; area: string; phone: string }[] = [
  { key: "admin", email: "admin@borrowly.demo", name: "Meera Iyer", role: "ADMIN", area: "Race Course", phone: "9840000001" },
  { key: "arjun", email: "customer@borrowly.demo", name: "Arjun Krishnan", area: "Peelamedu", phone: "9840000002" },
  { key: "karthik", email: "seller@borrowly.demo", name: "Karthik Raman", area: "RS Puram", phone: "9840000003" },
  { key: "divya", email: "divya@borrowly.demo", name: "Divya Natarajan", area: "Saibaba Colony", phone: "9840000004" },
  { key: "senthil", email: "senthil@borrowly.demo", name: "Senthil Kumar", area: "Gandhipuram", phone: "9840000005" },
  { key: "rahul", email: "rahul@borrowly.demo", name: "Rahul Menon", area: "Saravanampatti", phone: "9840000006" },
  { key: "farhan", email: "farhan@borrowly.demo", name: "Farhan Ali", area: "Singanallur", phone: "9840000007" },
  { key: "ananya", email: "ananya@borrowly.demo", name: "Ananya Prakash", area: "Vadavalli", phone: "9840000008" },
  { key: "vikram", email: "vikram@borrowly.demo", name: "Vikram Subramanian", area: "Peelamedu", phone: "9840000009" },
  { key: "sneha", email: "sneha@borrowly.demo", name: "Sneha Raghavan", area: "Race Course", phone: "9840000010" },
  { key: "irfan", email: "irfan@borrowly.demo", name: "Mohammed Irfan", area: "Gandhipuram", phone: "9840000011" },
  { key: "kavya", email: "kavya@borrowly.demo", name: "Kavya Srinivasan", area: "Saravanampatti", phone: "9840000012" },
  { key: "deepak", email: "deepak@borrowly.demo", name: "Deepak Chandran", area: "Singanallur", phone: "9840000013" },
  { key: "nithya", email: "nithya@borrowly.demo", name: "Nithya Balaji", area: "Vadavalli", phone: "9840000014" },
  { key: "gokul", email: "gokul@borrowly.demo", name: "Gokul Murugan", area: "Saibaba Colony", phone: "9840000015" },
  { key: "lakshmi", email: "lakshmi@borrowly.demo", name: "Lakshmi Venkatesh", area: "Peelamedu", phone: "9840000016" },
];

export type SellerKey = "karthik" | "divya" | "senthil" | "rahul" | "farhan" | "ananya" | "vikram" | "lakshmi";

export const sellers: Record<SellerKey, { displayName: string; type: "INDIVIDUAL" | "BUSINESS"; area: string; pincode: string; bio: string; pickupAddress: string; status: "VERIFIED" | "PENDING" | "NOT_SUBMITTED" | "REJECTED"; reviewNote?: string }> = {
  karthik: { displayName: "Raman Gear Hub", type: "BUSINESS", area: "RS Puram", pincode: "641002", status: "VERIFIED", bio: "Camera and creator-gear rentals run by a working wedding photographer. Every kit is cleaned, tested and batteries charged before pickup.", pickupAddress: "12, DB Road, RS Puram (demo address)" },
  divya: { displayName: "Divya's Home Studio", type: "INDIVIDUAL", area: "Saibaba Colony", pincode: "641011", status: "VERIFIED", bio: "Home appliances and furniture I no longer use daily — rent them for a few weeks or buy them outright.", pickupAddress: "7, Bharathi Park Road, Saibaba Colony (demo address)" },
  senthil: { displayName: "Coimbatore Tool Library", type: "BUSINESS", area: "Gandhipuram", pincode: "641012", status: "VERIFIED", bio: "A neighbourhood tool library. Professional-grade power tools for the price of a tea, by the day.", pickupAddress: "45, Cross Cut Road, Gandhipuram (demo address)" },
  rahul: { displayName: "Rahul's Outdoor Kit", type: "INDIVIDUAL", area: "Saravanampatti", pincode: "641035", status: "PENDING", bio: "Weekend trekker sharing my bikes, tents and packs between trips to Velliangiri and Valparai.", pickupAddress: "Keeranatham Road, Saravanampatti (demo address)" },
  farhan: { displayName: "EventKart Coimbatore", type: "BUSINESS", area: "Singanallur", pincode: "641005", status: "VERIFIED", bio: "Sound, light and décor for house functions, college fests and small corporate events.", pickupAddress: "Trichy Road, Singanallur (demo address)" },
  ananya: { displayName: "Ananya's Study Shelf", type: "INDIVIDUAL", area: "Vadavalli", pincode: "641041", status: "NOT_SUBMITTED", bio: "Engineering graduate passing on study gear to the next batch — calculators, kits and lab equipment.", pickupAddress: "Maruthamalai Road, Vadavalli (demo address)" },
  lakshmi: { displayName: "Peelamedu Campus Rentals", type: "BUSINESS", area: "Peelamedu", pincode: "641004", status: "VERIFIED", bio: "Furniture and room essentials for hostel students and short-stay renters near the Avinashi Road colleges. Weekly and semester rentals.", pickupAddress: "Nava India Road, Peelamedu (demo address)" },
  vikram: { displayName: "Vikram Travels Gear", type: "INDIVIDUAL", area: "Peelamedu", pincode: "641004", status: "REJECTED", reviewNote: "Profile details did not match the phone number provided. Please update and resubmit.", bio: "Luggage and travel accessories.", pickupAddress: "Avinashi Road, Peelamedu (demo address)" },
};

type L = {
  key: string;
  seller: SellerKey;
  category: (typeof categories)[number]["slug"];
  title: string;
  brand?: string;
  model?: string;
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
  rent?: number; // ₹ per day
  deposit?: number; // ₹
  sale?: number; // ₹
  stock?: number;
  minDays?: number;
  description: string;
};

export const listings: L[] = [
  // Cameras & Photography — Raman Gear Hub (the demo seller)
  { key: "sony-a7iii", seller: "karthik", category: "cameras-photography", title: "Sony Alpha 7 III Mirrorless Camera (Body)", brand: "Sony", model: "ILCE-7M3", condition: "LIKE_NEW", rent: 1400, deposit: 15000, stock: 2, description: "Full-frame 24MP mirrorless body with 2 batteries, charger and a 128 GB SD card. Shutter count under 18k. Ideal for weddings, events and travel. Cleaned and sensor-checked before every rental." },
  { key: "canon-80d", seller: "karthik", category: "cameras-photography", title: "Canon EOS 80D DSLR with 18-135mm Lens", brand: "Canon", model: "EOS 80D", condition: "GOOD", rent: 900, deposit: 10000, sale: 42000, description: "Reliable APS-C DSLR kit with the versatile 18-135mm IS USM lens. Includes strap, battery, charger and padded bag. Minor cosmetic marks on the grip, fully functional." },
  { key: "canon-50mm", seller: "karthik", category: "cameras-photography", title: "Canon EF 50mm f/1.8 Prime Lens", brand: "Canon", model: "EF 50mm f/1.8", condition: "GOOD", rent: 250, deposit: 2500, sale: 6500, description: "The classic 'nifty fifty' for portraits with creamy background blur. Front and rear caps included. Works on all Canon EF/EF-S bodies." },
  { key: "tripod", seller: "karthik", category: "cameras-photography", title: "Manfrotto Aluminium Tripod with 3-Way Head", brand: "Manfrotto", model: "804RC2", condition: "GOOD", rent: 200, deposit: 2000, stock: 2, description: "Sturdy tripod with quick-release plate and three-way pan/tilt head. Extends to 165 cm. Suitable for DSLRs, mirrorless cameras and spotting scopes." },
  { key: "softbox-kit", seller: "karthik", category: "cameras-photography", title: "Softbox Studio Lighting Kit (2 lights)", brand: "PhotoSEL", condition: "LIKE_NEW", rent: 600, deposit: 4000, sale: 7500, description: "Two 50×70 cm softboxes with stands and daylight bulbs. Perfect for product shoots, YouTube setups and portraits. Packs into a carry bag." },
  { key: "gopro", seller: "karthik", category: "cameras-photography", title: "GoPro HERO Action Camera with Waterproof Case", brand: "GoPro", model: "HERO", condition: "GOOD", rent: 450, deposit: 5000, description: "Compact action camera for treks, rides and underwater shots. Comes with dive housing, head strap and two mounts." },

  // Electronics
  { key: "macbook-air", seller: "karthik", category: "electronics", title: "Apple MacBook Air M1 (8 GB / 256 GB)", brand: "Apple", model: "MacBook Air M1 2020", condition: "LIKE_NEW", rent: 800, deposit: 20000, sale: 52000, description: "Silent, fanless M1 laptop with excellent battery life — great for exams, internships and travel. Freshly reset macOS, charger included. Battery health 91%." },
  { key: "thinkpad", seller: "karthik", category: "electronics", title: "Lenovo ThinkPad T430 Laptop", brand: "Lenovo", model: "ThinkPad T430", condition: "FAIR", sale: 14500, stock: 1, description: "Workhorse business laptop with the legendary keyboard. Core i5, 8 GB RAM, 240 GB SSD, Windows 10. Visible wear on the lid; runs smoothly." },
  { key: "monitor", seller: "divya", category: "electronics", title: "ASUS 27\" QHD Monitor (PB278Q)", brand: "ASUS", model: "PB278Q", condition: "GOOD", rent: 300, deposit: 4000, sale: 11000, description: "27-inch 2560×1440 IPS display with height-adjustable stand. HDMI and DisplayPort cables included. Ideal for work-from-home setups." },
  { key: "jbl-speaker", seller: "farhan", category: "electronics", title: "JBL Flip Portable Bluetooth Speaker", brand: "JBL", model: "Flip 3", condition: "GOOD", rent: 200, deposit: 1500, sale: 3800, stock: 3, description: "Splash-proof speaker with punchy bass and ~10 hours of playtime. Great for terrace parties and picnics. USB charging cable included." },
  { key: "ipad", seller: "divya", category: "electronics", title: "Apple iPad Air 11\" (M2) with Pencil", brand: "Apple", model: "iPad Air M2", condition: "LIKE_NEW", rent: 700, deposit: 15000, description: "Perfect for note-taking, digital art and presentations. Includes Apple Pencil (USB-C) and a folio case. Screen protector applied." },
  { key: "projector", seller: "karthik", category: "electronics", title: "InFocus HD Projector for Home & Office", brand: "InFocus", model: "IN34", condition: "GOOD", rent: 650, deposit: 6000, stock: 2, description: "Bright 3000-lumen projector with HDMI and VGA. Great for movie nights, cricket screenings and presentations. Comes with remote and carry case." },
  { key: "ps5", seller: "farhan", category: "electronics", title: "Sony PlayStation 5 with DualSense Controller", brand: "Sony", model: "PS5 Disc Edition", condition: "LIKE_NEW", rent: 900, deposit: 15000, description: "Disc edition console with one DualSense controller, HDMI 2.1 cable and stand. Bring your own games or ask about our disc library." },

  // Sports & Outdoors — Rahul (pending verification)
  { key: "mountain-bike", seller: "rahul", category: "sports-outdoors", title: "Hardtail Mountain Bike (21-speed, M frame)", brand: "Btwin", condition: "GOOD", rent: 350, deposit: 4000, sale: 15000, description: "Front-suspension MTB with disc brakes, serviced last month. Fits riders 5'6\"–6'0\". Helmet and lock included for rentals." },
  { key: "camping-tent", seller: "rahul", category: "sports-outdoors", title: "4-Person Dome Camping Tent", brand: "Quechua", model: "Arpenaz 4.1", condition: "GOOD", rent: 300, deposit: 2500, stock: 2, description: "Waterproof dome tent with separate bedroom and porch. Pitches in 10 minutes. Pegs, poles and storage bag included." },
  { key: "trekking-backpack", seller: "rahul", category: "sports-outdoors", title: "50 L Trekking Backpack with Rain Cover", brand: "HiMountain", model: "Hiker 50", condition: "LIKE_NEW", rent: 150, deposit: 1500, sale: 3200, description: "Ventilated back panel, hip-belt pockets and integrated rain cover. Ideal for 2–4 day treks." },
  { key: "dumbbells", seller: "lakshmi", category: "sports-outdoors", title: "Dumbbell Set (2–8 kg, 5 pairs) with Rack", condition: "GOOD", rent: 120, deposit: 1500, sale: 4500, description: "Vinyl-coated dumbbells in five weights with a compact A-frame rack. Rent for a month before committing to a home gym." },

  // Tools & DIY — Coimbatore Tool Library
  { key: "cordless-drill", seller: "senthil", category: "tools-diy", title: "Bosch Cordless Drill Driver (12V)", brand: "Bosch", model: "PSR 1200", condition: "GOOD", rent: 180, deposit: 1500, stock: 3, description: "Lightweight drill driver with two batteries, charger and a 20-piece bit set. Perfect for curtain rods, shelves and furniture assembly." },
  { key: "power-toolkit", seller: "senthil", category: "tools-diy", title: "Makita 18V Combi Drill Kit", brand: "Makita", model: "DHP453", condition: "GOOD", rent: 300, deposit: 3000, sale: 9500, stock: 2, description: "Hammer-drill capable of masonry work. Kit includes 2 × 18V batteries, fast charger and hard case." },
  { key: "electric-screwdriver", seller: "senthil", category: "tools-diy", title: "Xiaomi Electric Precision Screwdriver", brand: "Xiaomi", condition: "LIKE_NEW", rent: 80, deposit: 800, sale: 2400, stock: 2, description: "24 precision bits in a magnetic case. Ideal for phone, laptop and gadget repairs. USB-C rechargeable." },
  { key: "laser-measure", seller: "senthil", category: "tools-diy", title: "Bosch GLM 30 Laser Distance Meter", brand: "Bosch", model: "GLM 30", condition: "LIKE_NEW", rent: 120, deposit: 1500, description: "Measures up to 30 m with ±2 mm accuracy. Great for interior planning, carpentry and real-estate visits." },
  { key: "pressure-washer", seller: "senthil", category: "tools-diy", title: "Kärcher Pressure Washer (K5)", brand: "Kärcher", model: "K5", condition: "GOOD", rent: 450, deposit: 4000, description: "Clean cars, bikes, terraces and sump walls before Pongal. Includes 8 m hose, vario and dirt-blaster lances." },

  // Events & Entertainment — EventKart
  { key: "pa-speaker", seller: "farhan", category: "events-entertainment", title: "PA Speaker Pair with Stands & Mixer", brand: "Electro-Voice", condition: "GOOD", rent: 1800, deposit: 10000, stock: 2, description: "Two 12\" active speakers, tripod stands and a 4-channel mixer with two wired mics. Covers functions up to 150 guests." },
  { key: "stage-lights", seller: "farhan", category: "events-entertainment", title: "LED Stage Light Bar Set (4 PAR + stand)", condition: "GOOD", rent: 900, deposit: 5000, stock: 2, description: "Four RGB LED PAR lights on a T-bar stand with DMX and sound-active modes. Lights up a mandapam stage or college fest." },
  { key: "projector-screen", seller: "farhan", category: "events-entertainment", title: "120\" Tripod Projection Screen", condition: "GOOD", rent: 400, deposit: 3000, sale: 6500, description: "Matte white 16:9 screen on a portable tripod. Sets up in five minutes; pairs with any projector." },
  { key: "string-lights", seller: "farhan", category: "events-entertainment", title: "Warm White Fairy Light Set (20 strands)", condition: "LIKE_NEW", rent: 500, deposit: 2000, sale: 4000, description: "Twenty 10 m warm-white strings for weddings, Diwali and Karthigai Deepam décor. Extension boards included." },

  // Home Appliances — Divya
  { key: "vacuum", seller: "divya", category: "home-appliances", title: "Dyson Cordless Vacuum Cleaner with Attachments", brand: "Dyson", model: "V8", condition: "GOOD", rent: 400, deposit: 5000, sale: 16000, description: "Cordless stick vacuum with crevice, brush and mini-motorised tools. Perfect for move-in/move-out deep cleans." },
  { key: "sewing-machine", seller: "divya", category: "home-appliances", title: "Singer Electric Sewing Machine", brand: "Singer", condition: "GOOD", rent: 250, deposit: 2500, sale: 7000, description: "Easy-to-use machine with 20 stitch patterns, foot pedal and accessory kit. Great for alterations and festival tailoring." },
  { key: "microwave", seller: "lakshmi", category: "home-appliances", title: "Stainless Steel Microwave Oven (25 L)", condition: "GOOD", rent: 150, deposit: 2000, sale: 5500, description: "Solo microwave with grill function. Ideal for PG rooms and short-stay apartments." },

  // Furniture
  { key: "study-desk", seller: "lakshmi", category: "furniture", title: "Engineered Wood Computer Desk", condition: "GOOD", rent: 120, deposit: 1500, sale: 4500, minDays: 7, description: "120 × 60 cm desk with keyboard tray and CPU shelf. Minimum 7-day rental — popular with students during semester." },
  { key: "armchair", seller: "lakshmi", category: "furniture", title: "XL Bean Bag Lounger (Red)", condition: "LIKE_NEW", rent: 90, deposit: 1000, sale: 3500, minDays: 7, description: "Oversized bean bag with removable, washable cover. Refilled with fresh beads. Minimum 7-day rental." },

  // Travel & Luggage
  { key: "suitcase", seller: "divya", category: "travel-luggage", title: "Hard-Shell Trolley Suitcase Set (2 pcs)", condition: "LIKE_NEW", rent: 200, deposit: 2500, sale: 6500, description: "Cabin + medium spinner suitcases with TSA locks and 360° wheels." },
  { key: "duffel", seller: "rahul", category: "travel-luggage", title: "Heavy-Duty Canvas Duffel Bags (pair)", condition: "GOOD", rent: 100, deposit: 800, sale: 2200, description: "Two large 90 L canvas sea bags. Ideal for hostel moves and bulky trekking gear." },

  // Education — Ananya
  { key: "calculator", seller: "ananya", category: "education", title: "Casio fx-991EX ClassWiz Scientific Calculator", brand: "Casio", model: "fx-991EX", condition: "LIKE_NEW", rent: 40, deposit: 800, sale: 1100, stock: 2, description: "Exam-approved scientific calculator with spreadsheet and matrix modes. Rent it for semester exams or buy it outright." },
  { key: "microscope", seller: "ananya", category: "education", title: "Student Compound Microscope (40×–1000×)", condition: "GOOD", rent: 150, deposit: 2500, sale: 5500, description: "LED-illuminated monocular microscope with slides kit. Great for biology projects and school science fairs." },
  { key: "telescope", seller: "ananya", category: "education", title: "Celestron Computerised Telescope", brand: "Celestron", model: "NexStar 114SLT", condition: "GOOD", rent: 500, deposit: 8000, description: "114 mm reflector with GoTo mount. Catch Saturn's rings from your terrace. Includes two eyepieces and a red-dot finder." },
  { key: "raspberry-pi", seller: "karthik", category: "education", title: "Raspberry Pi 4 Model B (4 GB) Starter Kit", brand: "Raspberry Pi", model: "4B 4GB", condition: "LIKE_NEW", rent: 120, deposit: 2000, sale: 5200, stock: 2, description: "Pi 4 with case, official power supply, 32 GB microSD (Raspberry Pi OS) and micro-HDMI cable. Ideal for final-year projects." },
  { key: "encyclopedia", seller: "ananya", category: "education", title: "Encyclopaedia Reference Set (hardbound)", condition: "GOOD", sale: 3500, description: "Complete hardbound reference set in good condition. Collect from Vadavalli." },
];
