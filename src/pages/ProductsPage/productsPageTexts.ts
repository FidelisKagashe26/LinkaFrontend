// src/locales/productsPageTexts.ts

export interface ProductsPageTexts {
  hero: {
    title: string;
    subtitle: string;
    activeProductsLabel: string;
  };
  help: {
    showHelp: string;
    hideHelp: string;
    title: string;
    items: string[];
  };
  searchForm: {
    queryLabel: string;
    queryPlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    useMyLocation: string;
    searchButton: string;
  };
  geolocation: {
    browserUnsupported: string;
    detectingLocation: string;
    locationDetectedPrefix: string;
    couldNotGetLocation: string;
    currentLocationLabel: string;
  };
  filters: {
    activeFiltersLabel: string;
    productLabel: string;
    locationLabel: string;
    usingCurrentLocation: string;
    clearLocation: string;
    clearAll: string;
    noFilters: string;
  };
  results: {
    titleNear: string;
    titleAll: string;
    countLabel: (count: number) => string;
    noProductsWithFilters: string;
    noProductsGeneral: string;
  };
  status: {
    loading: string;
    loadError: string;
  };
  card: {
    noImage: string;
    outOfStock: string;
    distanceLabel: (distanceKm: number) => string;
    viewDetails: string;
    chat: string;
    openingChat: string;
    visitShop: string;
  };
  pagination: {
    prev: string;
    next: string;
    pageLabel: (current: number, total: number) => string;
  };
}

const productsPageTexts: Record<"en" | "sw", ProductsPageTexts> = {
  en: {
    hero: {
      title: "Marketplace products",
      subtitle:
        "Browse products from trusted shops, chat with sellers in real time and place your orders with confidence.",
      activeProductsLabel: "Active products",
    },
    help: {
      showHelp: "Help",
      hideHelp: "Hide help",
      title: "How this marketplace works",
      items: [
        'Type the product name you need in the "What are you looking for?" box.',
        'Add your area or city, or tap "Use my location" to see items close to you.',
        'Tap "View details & order" to see full details and how to place your order.',
        'Tap "Chat" to talk instantly with the seller about the item.',
      ],
    },
    searchForm: {
      queryLabel: "What are you looking for?",
      queryPlaceholder: "e.g. HP laptop, smartphone, fridge...",
      locationLabel: "Where are you?",
      locationPlaceholder: "e.g. Dodoma, Sinza, Mlimani City...",
      useMyLocation: "Use my location",
      searchButton: "Search",
    },
    geolocation: {
      browserUnsupported: "Your browser does not support location detection.",
      detectingLocation: "Detecting...",
      locationDetectedPrefix: "Location detected",
      couldNotGetLocation:
        "We could not get your location. Please try again.",
      currentLocationLabel: "Current location",
    },
    filters: {
      activeFiltersLabel: "Active filters:",
      productLabel: "product",
      locationLabel: "location",
      usingCurrentLocation: "using your current location",
      clearLocation: "Clear location",
      clearAll: "Clear all",
      noFilters: "No filters applied. Showing general products.",
    },
    results: {
      titleNear: "Products near you",
      titleAll: "Products on the marketplace",
      countLabel: (count: number) =>
        `${count} product${count === 1 ? "" : "s"} found`,
      noProductsWithFilters: "No products match your current search.",
      noProductsGeneral: "No products are available at the moment.",
    },
    status: {
      loading: "Loading products...",
      loadError:
        "We could not load products right now. Please try again in a few moments.",
    },
    card: {
      noImage: "No image",
      outOfStock: "Out of stock",
      distanceLabel: (distanceKm: number) =>
        `~ ${distanceKm.toFixed(1)} km away`,
      viewDetails: "View details & order",
      chat: "Chat",
      openingChat: "Opening...",
      visitShop: "Visit shop",
    },
    pagination: {
      prev: "Prev",
      next: "Next",
      pageLabel: (current: number, total: number) =>
        `Page ${current} / ${total}`,
    },
  },
  sw: {
    hero: {
      title: "Bidhaa za soko mtandaoni",
      subtitle:
        "Tembea bidhaa kutoka maduka mbalimbali, ongea moja kwa moja na wauzaji na weka oda zako kwa urahisi.",
      activeProductsLabel: "Bidhaa zilizo hewani",
    },
    help: {
      showHelp: "Msaada",
      hideHelp: "Ficha maelezo",
      title: "Jinsi jukwaa hili la biashara linavyofanya kazi",
      items: [
        'Andika jina la bidhaa unayotaka kununua kwenye kisanduku cha "Unatafuta bidhaa gani?".',
        'Ongeza mtaa au jiji ulipo, au bonyeza "Tumia eneo nilipo" kupata bidhaa zilizo karibu na wewe.',
        'Bonyeza "Tazama maelezo & weka oda" ili kuona maelezo kamili na hatua za kufanya oda.',
        'Bonyeza "Chat na muuzaji" kuongea moja kwa moja na muuzaji kuhusu bidhaa.',
      ],
    },
    searchForm: {
      queryLabel: "Unatafuta bidhaa gani?",
      queryPlaceholder: "mf. laptop ya HP, simu, friji...",
      locationLabel: "Upo wapi kwa sasa?",
      locationPlaceholder: "mf. Dodoma, Sinza, Mlimani City...",
      useMyLocation: "Tumia eneo nilipo",
      searchButton: "Tafuta",
    },
    geolocation: {
      browserUnsupported:
        "Kivinjari chako hakiruhusu kupata eneo ulipo kwa sasa.",
      detectingLocation: "Inatafuta eneo...",
      locationDetectedPrefix: "Eneo lako limepatikana",
      couldNotGetLocation:
        "Hatukuweza kupata eneo lako. Tafadhali jaribu tena.",
      currentLocationLabel: "Eneo nilipo sasa",
    },
    filters: {
      activeFiltersLabel: "Vichujio vinavyotumika:",
      productLabel: "bidhaa",
      locationLabel: "eneo",
      usingCurrentLocation: "unatumia eneo ulipo sasa",
      clearLocation: "Futa eneo",
      clearAll: "Futa vichujio vyote",
      noFilters: "Hakuna kichujio. Unaona bidhaa zote kwa ujumla.",
    },
    results: {
      titleNear: "Bidhaa karibu na ulipo",
      titleAll: "Bidhaa zote kwenye soko",
      countLabel: (count: number) =>
        count === 0
          ? "Hakuna bidhaa zimepatikana"
          : `Bidhaa ${count} zimepatikana`,
      noProductsWithFilters:
        "Hakuna bidhaa zilizoendana na utafutaji wako kwa sasa.",
      noProductsGeneral: "Hakuna bidhaa zilizowekwa sokoni kwa sasa.",
    },
    status: {
      loading: "Tunapakia bidhaa...",
      loadError:
        "Hatukuweza kupakia bidhaa kwa sasa. Tafadhali jaribu tena baada ya muda mfupi.",
    },
    card: {
      noImage: "Hakuna picha",
      outOfStock: "Haipo stoo kwa sasa",
      distanceLabel: (distanceKm: number) =>
        `~ ${distanceKm.toFixed(1)} km kutoka ulipo`,
      viewDetails: "Tazama maelezo & weka oda",
      chat: "Chat na muuzaji",
      openingChat: "Inafungua...",
      visitShop: "Tembelea duka",
    },
    pagination: {
      prev: "Nyuma",
      next: "Mbele",
      pageLabel: (current: number, total: number) =>
        `Ukurasa ${current} kati ya ${total}`,
    },
  },
};

export function getProductsPageTexts(
  language: string | null | undefined,
): ProductsPageTexts {
  if (language === "sw") {
    return productsPageTexts.sw;
  }
  return productsPageTexts.en;
}
