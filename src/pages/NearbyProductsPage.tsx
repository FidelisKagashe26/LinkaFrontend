// src/pages/NearbyProductsPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import axios from "axios";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

interface SellerLite {
  id?: number;
  business_name: string;
  location?: {
    city: string;
    country: string;
  } | null;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  image_url: string | null;
  image?: string | null;

  // distance kutoka backend (inaweza kuwa string au number au null)
  distance?: string | number | null;
  distance_km?: string | number | null;

  // optional location extra (kama serializer anarudisha)
  city?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;

  seller?: SellerLite;
}

interface PaginatedProductList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

type NearbyResponse = Product[] | PaginatedProductList;

interface NearbyQueryParams {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
}

// helper: geuza distance kuwa number salama
const getNumericDistanceKm = (product: Product): number | null => {
  const raw = product.distance_km ?? product.distance ?? null;
  if (raw === null || raw === undefined) return null;

  let n: number;
  if (typeof raw === "number") {
    n = raw;
  } else {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return null;
    n = parsed;
  }
  return n;
};

// helper: score ya ukaribu 1–10 (1 = karibu sana)
const getProximityScore = (
  distance: number | null,
  min: number | null,
  max: number | null
): number | null => {
  if (distance === null || min === null || max === null) return null;
  if (max <= min) {
    return 1;
  }
  const normalized = (distance - min) / (max - min); // 0..1
  const score = Math.round(normalized * 9) + 1; // 1..10
  return Math.min(10, Math.max(1, score));
};

const NearbyProductsPage: React.FC = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [radius, setRadius] = useState<number>(10); // km
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ====== GET BROWSER LOCATION ======
  const askLocation = () => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Browser wako hauna support ya geolocation.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
      },
      (err) => {
        console.error("Geolocation error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Umezima ruhusa ya location. Fungua settings za browser kuruhusu location kwa LINKA."
          );
        } else {
          setLocationError("Imeshindikana kupata location ya kifaa.");
        }
      }
    );
  };

  // mara ya kwanza kabisa, jaribu kuchukua location
  useEffect(() => {
    askLocation();
  }, []);

  // ====== FETCH NEARBY PRODUCTS ======
  const fetchNearby = async (params: NearbyQueryParams) => {
    setLoading(true);
    setError(null);
    setProducts([]);

    try {
      const res = await apiClient.get<NearbyResponse>("/api/products/nearby/", {
        params: {
          lat: params.lat,
          lng: params.lng,
          radius: params.radius ?? radius,
          limit: params.limit ?? 30,
        },
      });

      let dataProducts: Product[] = [];

      if (Array.isArray(res.data)) {
        dataProducts = res.data;
      } else if ("results" in res.data) {
        dataProducts = res.data.results;
      }

      setProducts(dataProducts);
    } catch (err: unknown) {
      console.error(err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        if (data && typeof data === "object") {
          setError(JSON.stringify(data));
        } else {
          setError("Imeshindikana kutafuta bidhaa karibu.");
        }
      } else {
        setError("Imeshindikana kutafuta bidhaa karibu.");
      }
    } finally {
      setLoading(false);
    }
  };

  // kila tukipata coords mpya au radius ibadilike → tafuta karibu
  useEffect(() => {
    if (coords) {
      void fetchNearby({ lat: coords.lat, lng: coords.lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, radius]);

  // filter ndogo ya client-side kwa search box
  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      (p.seller?.business_name || "").toLowerCase().includes(term)
    );
  });

  // distance stats kwa scale 1–10
  const numericDistances = filteredProducts
    .map((p) => getNumericDistanceKm(p))
    .filter((d): d is number => d !== null);

  let minDistance: number | null = null;
  let maxDistance: number | null = null;

  if (numericDistances.length > 0) {
    minDistance = Math.min(...numericDistances);
    maxDistance = Math.max(...numericDistances);
  }

  // pangilia bidhaa kwa ukaribu (karibu → mbali)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const da = getNumericDistanceKm(a);
    const db = getNumericDistanceKm(b);

    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  const hasAnyCoords = sortedProducts.some(
    (p) => p.latitude != null && p.longitude != null
  );

  const handleOpenMapAll = () => {
    if (!coords) {
      setLocationError(
        "Hatukupata location ya kifaa chako bado. Bonyeza 'Tumia location yangu' kwanza."
      );
      return;
    }

    const points = sortedProducts
      .map((p) => {
        const lat = p.latitude;
        const lng = p.longitude;
        if (lat == null || lng == null) return null;
        return `${lat},${lng}`;
      })
      .filter((val): val is string => val !== null);

    if (points.length === 0) {
      setLocationError(
        "Hatuna coordinates za maduka haya kwa sasa kuonyesha kwenye ramani."
      );
      return;
    }

    // Google Maps: origin = user, destination = duka la kwanza, waypoints = mengine
    const base = "https://www.google.com/maps/dir/?api=1";
    const origin = `origin=${coords.lat},${coords.lng}`;
    const destination = `destination=${points[0]}`;
    const waypointsParam =
      points.length > 1
        ? `&waypoints=${encodeURIComponent(points.slice(1).join("|"))}`
        : "";

    const url = `${base}&${origin}&${destination}${waypointsParam}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      {/* MAIN */}
      <main className="flex-1 max-w-5xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold mb-1 text-slate-900 dark:text-slate-100">
              Bidhaa karibu na ulipo
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tunatumia location ya kifaa chako (GPS / browser) kuonyesha bidhaa
              za karibu. Hatuhifadhi point zako za ramani, tunatumia kwa
              uonyeshaji tu.
            </p>
          </div>
          <Link
            to="/products"
            className="text-[11px] text-orange-600 hover:underline"
          >
            ← Rudi kwenye bidhaa zote
          </Link>
        </div>

        {/* LOCATION & FILTER BAR */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow border border-slate-200 dark:border-slate-800 p-4 mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={askLocation}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-black dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Tumia location yangu
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <label htmlFor="radius" className="whitespace-nowrap">
                  Radius:
                </label>
                <select
                  id="radius"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                  className="border rounded px-2 py-1 text-[11px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>

              {coords && (
                <div className="text-[11px] text-slate-400 dark:text-slate-500">
                  Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)}
                </div>
              )}

              <button
                type="button"
                onClick={handleOpenMapAll}
                disabled={!coords || !hasAnyCoords}
                className="px-3 py-1.5 rounded-full border text-[11px] font-medium border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fungua ramani (maduka yote)
              </button>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tafuta ndani ya matokeo (jina la bidhaa / duka)..."
                className="w-full border rounded-full px-3 py-1.5 text-[11px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/70"
              />
            </div>
          </div>

          {locationError && (
            <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-300 border border-red-100 dark:border-red-800 px-3 py-2 rounded">
              {locationError}
            </div>
          )}

          {error && (
            <div className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-300 border border-red-100 dark:border-red-800 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* RESULTS */}
        <div>
          {loading && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Inatafuta bidhaa karibu na ulipo...
            </div>
          )}

          {!loading && sortedProducts.length === 0 && !error && (
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
              Hakuna matokeo bado. Hakikisha location imewashwa kisha jaribu
              tena au panua radius.
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sortedProducts.map((product) => {
              const numericDistance = getNumericDistanceKm(product);
              const proximityScore = getProximityScore(
                numericDistance,
                minDistance,
                maxDistance
              );

              const sellerId = product.seller?.id;
              const shopName = product.seller?.business_name;
              const mainImage = product.image_url || product.image || null;
              const city =
                product.seller?.location?.city || product.city || null;

              return (
                <div
                  key={product.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 flex flex-col"
                >
                  {mainImage && (
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-xl mb-3"
                    />
                  )}
                  <h3 className="font-semibold mb-1 text-sm line-clamp-2 text-slate-900 dark:text-slate-100">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 space-y-1">
                    {shopName && <div>Seller: {shopName}</div>}
                    {city && <div>Mji: {city}</div>}
                    {proximityScore !== null && (
                      <div>
                        Ukaribu:{" "}
                        <span className="font-semibold">
                          {proximityScore}/10
                        </span>{" "}
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          (1 = karibu sana)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between text-[11px]">
                    <span className="font-bold text-sm text-orange-600 dark:text-orange-400">
                      {product.price} {product.currency}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                    <Link
                      to={`/products/${product.id}`}
                      className="px-3 py-1.5 rounded-full bg-slate-900 text-white font-medium hover:bg-black dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      View details
                    </Link>
                    {sellerId && (
                      <Link
                        to={`/shops/${sellerId}`}
                        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Visit shop
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default NearbyProductsPage;
