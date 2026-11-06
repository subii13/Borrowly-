// Vocabulary for understanding Tamil, Tanglish (romanised Tamil + English) and English speech.
// Tamil-script entries are stems so that case suffixes still match (பீளமேடு → பீளமேட்டில்).

export type ItemTerm = { query: string; label: string; category: string; aliases: string[] };

export const ITEMS: ItemTerm[] = [
  { query: "camera", label: "camera", category: "cameras-photography", aliases: ["camera", "dslr", "mirrorless", "கேமரா", "காமிரா", "டிஎஸ்எல்ஆர்"] },
  { query: "lens", label: "lens", category: "cameras-photography", aliases: ["lens", "லென்ஸ்"] },
  { query: "tripod", label: "tripod", category: "cameras-photography", aliases: ["tripod", "ட்ரைபாட்", "டிரைபாட்"] },
  { query: "softbox", label: "studio lights", category: "cameras-photography", aliases: ["softbox", "studio light", "ஸ்டுடியோ லைட்"] },
  { query: "gopro", label: "GoPro", category: "cameras-photography", aliases: ["gopro", "go pro", "action camera", "கோப்ரோ"] },
  { query: "laptop", label: "laptop", category: "electronics", aliases: ["laptop", "macbook", "thinkpad", "லேப்டாப்", "லாப்டாப்", "மேக்புக்"] },
  { query: "monitor", label: "monitor", category: "electronics", aliases: ["monitor", "மானிட்டர்"] },
  { query: "projector", label: "projector", category: "electronics", aliases: ["projector", "projecter", "ப்ரொஜெக்டர்", "புரொஜெக்டர்", "ப்ரொஜக்டர்", "புராஜெக்டர்"] },
  { query: "speaker", label: "speaker", category: "electronics", aliases: ["speaker", "jbl", "sound system", "ஸ்பீக்கர்", "சவுண்ட்"] },
  { query: "ipad", label: "tablet", category: "electronics", aliases: ["ipad", "tablet", "ஐபேட்", "டேப்லெட்"] },
  { query: "playstation", label: "PlayStation", category: "electronics", aliases: ["playstation", "ps5", "ps 5", "game console", "ப்ளேஸ்டேஷன்", "பிளேஸ்டேஷன்"] },
  { query: "bike", label: "bicycle", category: "sports-outdoors", aliases: ["cycle", "bicycle", "bike", "சைக்கி", "சைக்கிள்"] },
  { query: "tent", label: "tent", category: "sports-outdoors", aliases: ["tent", "camping", "டென்ட்", "கூடார"] },
  { query: "backpack", label: "backpack", category: "sports-outdoors", aliases: ["backpack", "trekking bag", "rucksack", "பேக்பேக்"] },
  { query: "dumbbell", label: "dumbbells", category: "sports-outdoors", aliases: ["dumbbell", "dumbell", "gym", "டம்பெல்", "டம்பல்"] },
  { query: "drill", label: "drill", category: "tools-diy", aliases: ["drill", "drilling", "ட்ரில்", "டிரில்"] },
  { query: "screwdriver", label: "screwdriver", category: "tools-diy", aliases: ["screwdriver", "screw driver", "ஸ்க்ரூ"] },
  { query: "laser", label: "laser measure", category: "tools-diy", aliases: ["laser", "measuring", "measure tape", "லேசர்"] },
  { query: "washer", label: "pressure washer", category: "tools-diy", aliases: ["pressure washer", "car wash", "washer", "கார் வாஷ்", "வாஷர்"] },
  { query: "lights", label: "lights", category: "events-entertainment", aliases: ["serial light", "fairy light", "string light", "decoration", "stage light", "lights", "சீரியல் லைட்", "அலங்கார", "லைட்"] },
  { query: "screen", label: "projector screen", category: "events-entertainment", aliases: ["projector screen", "screen", "ஸ்க்ரீன்", "திரை"] },
  { query: "vacuum", label: "vacuum cleaner", category: "home-appliances", aliases: ["vacuum", "cleaner", "வேக்யூம்", "வாக்யூம்"] },
  { query: "sewing", label: "sewing machine", category: "home-appliances", aliases: ["sewing", "tailoring", "தையல்"] },
  { query: "microwave", label: "microwave", category: "home-appliances", aliases: ["microwave", "oven", "மைக்ரோவேவ்", "ஓவன்"] },
  { query: "desk", label: "desk", category: "furniture", aliases: ["desk", "table", "மேசை", "டேபிள்"] },
  { query: "bean bag", label: "bean bag", category: "furniture", aliases: ["bean bag", "beanbag", "chair", "நாற்காலி", "சேர்"] },
  { query: "suitcase", label: "suitcase", category: "travel-luggage", aliases: ["suitcase", "luggage", "trolley", "சூட்கேஸ்", "பெட்டி"] },
  { query: "duffel", label: "travel bag", category: "travel-luggage", aliases: ["duffel", "travel bag", "டஃபல்"] },
  { query: "calculator", label: "calculator", category: "education", aliases: ["calculator", "கால்குலேட்டர்", "கால்குலேட்டர"] },
  { query: "microscope", label: "microscope", category: "education", aliases: ["microscope", "மைக்ரோஸ்கோப்"] },
  { query: "telescope", label: "telescope", category: "education", aliases: ["telescope", "டெலஸ்கோப்", "தொலைநோக்கி"] },
  { query: "raspberry", label: "Raspberry Pi kit", category: "education", aliases: ["raspberry", "arduino", "project kit", "ராஸ்பெர்ரி"] },
  { query: "encyclopaedia", label: "books", category: "education", aliases: ["encyclopedia", "encyclopaedia", "books", "புத்தக"] },
];

export const AREA_ALIASES: { area: string; ta: string; aliases: string[] }[] = [
  { area: "Peelamedu", ta: "பீளமேடு", aliases: ["peelamed", "pilamed", "பீளமேட", "பீளமேடு"] },
  { area: "RS Puram", ta: "ஆர்.எஸ்.புரம்", aliases: ["rs puram", "r s puram", "rspuram", "r.s. puram", "ஆர்.எஸ்.புர", "ஆர் எஸ் புர", "ஆர்எஸ்புர"] },
  { area: "Gandhipuram", ta: "காந்திபுரம்", aliases: ["gandhipur", "gandipur", "காந்திபுர"] },
  { area: "Saibaba Colony", ta: "சாய்பாபா காலனி", aliases: ["saibaba", "sai baba", "சாய்பாபா", "சாய் பாபா"] },
  { area: "Race Course", ta: "ரேஸ் கோர்ஸ்", aliases: ["race course", "racecourse", "ரேஸ் கோர்ஸ", "ரேஸ்கோர்ஸ"] },
  { area: "Singanallur", ta: "சிங்காநல்லூர்", aliases: ["singanallur", "singanalur", "சிங்காநல்லூ", "சிங்காநல்லு"] },
  { area: "Saravanampatti", ta: "சரவணம்பட்டி", aliases: ["saravanampat", "saravanampatt", "சரவணம்பட்", "சரவணம்பட்டி"] },
  { area: "Vadavalli", ta: "வடவள்ளி", aliases: ["vadavall", "vadavalli", "வடவள்ள"] },
];

export const BRANDS = ["Canon", "Sony", "Nikon", "Fujifilm", "GoPro", "Manfrotto", "Apple", "Lenovo", "Dell", "HP", "Asus", "Samsung", "JBL", "Boat", "Bose", "Epson", "InFocus", "Bosch", "Makita", "Stanley", "Black+Decker", "Xiaomi", "Karcher", "Dyson", "Philips", "Singer", "Usha", "LG", "IFB", "Casio", "Celestron", "Decathlon", "Btwin", "Quechua", "Raspberry Pi", "Wildcraft", "American Tourister", "Safari"];

// Cue words (lower-case Latin + Tamil script stems).
export const CUES = {
  rent: ["rent", "rental", "hire", "vaadagai", "vadagai", "vaadakai", "வாடகை"],
  buy: ["buy", "purchase", "vaanganum", "vanganum", "vaangu", "vilaikku", "second hand", "secondhand", "வாங்க", "விலைக்கு", "செகண்ட் ஹேண்ட்"],
  sell: ["sell", "sale", "vikk", "virk", "vithu", "vitharen", "விற்க", "விற்பனை", "விக்க"],
  today: ["today", "innaiku", "inniku", "innikku", "indru", "இன்னைக்கு", "இன்னிக்கு", "இன்று"],
  tomorrow: ["tomorrow", "naalaiku", "naalaikku", "nalaiku", "nalaikku", "naalaikki", "naalai", "நாளைக்கு", "நாளை"],
  dayAfter: ["day after tomorrow", "naalanniku", "nalanniku", "naalaanniku", "நாளை மறுநாள்", "நாளன்னைக்கு"],
  weekend: ["weekend", "week end", "வீக்கெண்ட்", "வார இறுதி"],
  saturday: ["saturday", "sanikizhamai", "sani kizhamai", "சனிக்கிழமை", "சனி"],
  sunday: ["sunday", "nyayiru", "gnayiru", "ஞாயிறு", "ஞாயிற்று"],
  week: ["week", "vaaram", "varam", "வாரம்", "வாரத்து"],
  day: ["day", "days", "naal", "naalukku", "naalku", "dhinam", "naatkal", "நாள்", "நாளுக்கு", "நாட்கள்", "நாள்கள்", "per day", "daily"],
  deposit: ["deposit", "advance", "டெபாசிட்", "டிபாசிட்", "டெப்பாசிட்", "அட்வான்ஸ்", "முன்பணம்"],
  under: ["under", "below", "within", "less than", "max", "budget", "kulla", "kullae", "keezha", "kizha", "குள்", "கீழ"],
  money: ["rupees", "rupee", "rs", "rs.", "₹", "ரூபாய்", "ரூ", "roobai", "rubai"],
  condNew: ["brand new", "new", "puthusu", "pudhusu", "puthu", "புதுசு", "புதிய", "புது"],
  condLikeNew: ["like new", "almost new", "konjam use", "barely used", "kammi use", "கொஞ்சம் யூஸ்"],
  condFair: ["old", "fair", "pazhaya", "palaya", "பழைய"],
  condGood: ["good condition", "nalla", "நல்ல", "working"],
};
