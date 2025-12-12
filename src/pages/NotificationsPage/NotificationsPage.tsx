// src/pages/NotificationsPage/NotificationsPage.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../lib/apiClient";
import MainHeader from "../../components/MainHeader";
import MainFooter from "../../components/MainFooter";
import { useLanguage } from "../../contexts/LanguageContext";
import { getNotificationsPageTexts } from "./notificationsPageTexts";

// ================== TYPES ==================

type NotifType = "order_new" | "order_status" | "chat_message" | "order_created";

interface NotificationData {
  order_id?: number;
  conversation_id?: number;
  product_id?: number;
  seller_id?: number;
  buyer_id?: number;
}

interface Notification {
  id: number;
  title: string;
  body: string;
  notif_type: NotifType;
  is_read: boolean;
  created_at: string;
  data?: NotificationData | null;
}

interface PaginatedNotificationResponse {
  count: number;
  results: Notification[];
}

type NotificationTab = "all" | "chat" | "orders";

interface NotificationMeta {
  avatarImageUrl: string | null;
  avatarLetter: string;
  avatarAlt: string;
}

interface AvatarInfo {
  imageUrl: string | null;
  letter: string;
  alt: string;
}

// ==== backend mini types (kulingana na schemas zako) ====

interface UserMini {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url: string | null;
  is_seller: boolean;
}

interface UserFull {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url: string | null;
}

interface SellerMini {
  id: number;
  business_name: string;
  is_verified: boolean;
  rating?: string;
  rating_count?: number;
  total_sales?: number;
  items_sold?: number;
  logo_url: string | null;
  user: UserMini;
}

interface ProductMini {
  id: number;
  name: string;
  image_url: string | null;
}

interface ConversationSummary {
  id: number;
  buyer: UserMini;
  seller: SellerMini;
  product: ProductMini | null;
}

interface OrderProductSummary {
  id: number;
  name: string;
  image_url: string | null;
  shop_name: string;
}

interface SellerProfileSummary {
  id: number;
  business_name: string;
  logo_url: string | null;
  // kwa Order.seller tunaweza pia kurudishiwa user kamili
  user?: UserFull;
}

interface OrderSummary {
  id: number;
  product: OrderProductSummary;
  buyer: UserFull;
  seller: SellerProfileSummary;
}

interface ProductSummary {
  id: number;
  name: string;
  image_url: string | null;
  shop_name: string;
  seller?: SellerProfileSummary;
}

interface AuthMeResponse {
  id: number;
  username: string;
  is_seller: boolean;
  avatar_url: string | null;
}

// ================== HELPERS ==================

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const isOrderType = (t: NotifType) =>
  t === "order_new" || t === "order_status" || t === "order_created";

const isChatType = (t: NotifType) => t === "chat_message";

// ========== META BUILDER (ipo nje ya component) ==========

const buildNotificationMeta = (
  n: Notification,
  convMap: Map<number, ConversationSummary>,
  orderMap: Map<number, OrderSummary>,
  productMap: Map<number, ProductSummary>,
  currentUserId: number | null,
  globalIsSeller: boolean,
  newChatMessageTitle: string,
  genericNotificationTitle: string,
): NotificationMeta => {
  const data = (n.data || {}) as NotificationData;

  const defaultName =
    n.title ||
    (isChatType(n.notif_type) ? newChatMessageTitle : genericNotificationTitle);

  const defaultLetter = (defaultName.trim().charAt(0) || "N").toUpperCase();

  const base: NotificationMeta = {
    avatarImageUrl: null,
    avatarLetter: defaultLetter,
    avatarAlt: defaultName,
  };

  // tambua kama current user ni seller au buyer kwenye hii notification
  const resolveIsSellerView = (): boolean => {
    if (currentUserId == null) {
      return globalIsSeller;
    }

    // 1) tumia seller_id / buyer_id kama vipo kwenye data
    if (typeof data.seller_id === "number" && data.seller_id === currentUserId) {
      return true;
    }
    if (typeof data.buyer_id === "number" && data.buyer_id === currentUserId) {
      return false;
    }

    // 2) jaribu kupitia conversation
    if (data.conversation_id) {
      const conv = convMap.get(data.conversation_id);
      if (conv) {
        if (conv.seller?.user?.id === currentUserId) return true;
        if (conv.buyer?.id === currentUserId) return false;
      }
    }

    // 3) jaribu kupitia order
    if (data.order_id) {
      const order = orderMap.get(data.order_id);
      if (order) {
        if (order.seller?.user && order.seller.user.id === currentUserId) {
          return true;
        }
        if (order.buyer?.id === currentUserId) return false;
      }
    }

    // fallback → tumia flag ya global user
    return globalIsSeller;
  };

  const isSellerView = resolveIsSellerView();

  // ========== CHAT NOTIFICATION ==========

  if (isChatType(n.notif_type)) {
    if (data.conversation_id) {
      const conv = convMap.get(data.conversation_id);
      if (conv) {
        if (isSellerView) {
          // SELLER → aone sura ya BUYER
          const buyer = conv.buyer;
          const fullName =
            (buyer.first_name && buyer.first_name.trim()) ||
            (buyer.last_name && buyer.last_name.trim()) ||
            buyer.username;
          const letter =
            (fullName.trim().charAt(0) || defaultLetter).toUpperCase();
          return {
            avatarImageUrl: buyer.avatar_url ?? null,
            avatarLetter: letter,
            avatarAlt: `Buyer ${fullName}`,
          };
        }

        // BUYER → aone LOGO ya duka
        const seller = conv.seller;
        const name = seller.business_name || "Shop";
        const letter =
          (name.trim().charAt(0) || defaultLetter).toUpperCase();
        return {
          avatarImageUrl: seller.logo_url ?? null,
          avatarLetter: letter,
          avatarAlt: `Shop ${name}`,
        };
      }
    }

    // fallback: kama tuna product_id, tumia product image
    if (data.product_id) {
      const p = productMap.get(data.product_id);
      if (p) {
        const name = p.name || defaultName;
        const letter = (name.trim().charAt(0) || defaultLetter).toUpperCase();
        return {
          avatarImageUrl: p.image_url ?? null,
          avatarLetter: letter,
          avatarAlt: `Product ${name}`,
        };
      }
    }

    return base;
  }

  // ========== ORDER NOTIFICATION ==========

  if (isOrderType(n.notif_type)) {
    if (data.order_id) {
      const order = orderMap.get(data.order_id);
      if (order) {
        const productName = order.product?.name || "Order";
        const productLetter =
          (productName.trim().charAt(0) || defaultLetter).toUpperCase();

        if (!isSellerView) {
          // BUYER VIEW → product image au logo ya duka
          if (order.product?.image_url) {
            return {
              avatarImageUrl: order.product.image_url,
              avatarLetter: productLetter,
              avatarAlt: `Product ${productName}`,
            };
          }

          const shopName =
            order.seller?.business_name ||
            order.product?.shop_name ||
            "Shop";
          const shopLetter =
            (shopName.trim().charAt(0) || defaultLetter).toUpperCase();

          return {
            avatarImageUrl: order.seller?.logo_url ?? null,
            avatarLetter: shopLetter,
            avatarAlt: `Shop ${shopName}`,
          };
        }

        // SELLER VIEW → aone sura ya BUYER
        const buyer = order.buyer;
        const fullName =
          (buyer.first_name && buyer.first_name.trim()) ||
          (buyer.last_name && buyer.last_name.trim()) ||
          buyer.username;
        const buyerLetter =
          (fullName.trim().charAt(0) || defaultLetter).toUpperCase();

        return {
          avatarImageUrl: buyer.avatar_url ?? null,
          avatarLetter: buyerLetter,
          avatarAlt: `Buyer ${fullName}`,
        };
      }
    }

    // fallback: product_id tu → tumia product image
    if (data.product_id) {
      const p = productMap.get(data.product_id);
      if (p) {
        const name = p.name || defaultName;
        const letter = (name.trim().charAt(0) || defaultLetter).toUpperCase();
        return {
          avatarImageUrl: p.image_url ?? null,
          avatarLetter: letter,
          avatarAlt: `Product ${name}`,
        };
      }
    }

    return base;
  }

  // OTHER
  return base;
};

// ================== COMPONENT ==================

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = getNotificationsPageTexts(language);

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const [metaMap, setMetaMap] = useState<Record<number, NotificationMeta>>({});
  const [metaLoading, setMetaLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<AuthMeResponse | null>(null);

  // ========== GET CURRENT USER (kujua id + is_seller) ==========

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await apiClient.get<AuthMeResponse>("/api/auth/me/");
        setCurrentUser(res.data);
      } catch (err) {
        console.error("Failed to load /auth/me/", err);
        // fallback: treat kama buyer bila avatar
        setCurrentUser({
          id: -1,
          username: "",
          is_seller: false,
          avatar_url: null,
        });
      }
    };

    void fetchMe();
  }, []);

  // ========== LOAD NOTIFICATIONS ==========

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PaginatedNotificationResponse>(
        "/api/notifications/",
      );
      setItems(res.data.results || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t.errorLoadNotifications);
    } finally {
      setLoading(false);
    }
  }, [t.errorLoadNotifications]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const chatNotifications = items.filter((n) => isChatType(n.notif_type));
  const orderNotifications = items.filter((n) => isOrderType(n.notif_type));
  const otherNotifications = items.filter(
    (n) => !isChatType(n.notif_type) && !isOrderType(n.notif_type),
  );

  const markAllRead = async () => {
    try {
      setMarking(true);
      await apiClient.post("/api/notifications/mark_all_read/", {});
      await load();
    } catch (err) {
      console.error(err);
      setError(t.errorMarkAllRead);
    } finally {
      setMarking(false);
    }
  };

  const canOpenNotification = (n: Notification) =>
    isChatType(n.notif_type) || isOrderType(n.notif_type);

  const handleOpenNotification = (notif: Notification) => {
    if (!canOpenNotification(notif)) return;

    const data = (notif.data || {}) as NotificationData;

    setItems((prev) =>
      prev.map((n) =>
        n.id === notif.id
          ? {
              ...n,
              is_read: true,
            }
          : n,
      ),
    );

    void apiClient
      .patch(`/api/notifications/${notif.id}/`, {
        is_read: true,
      })
      .catch((err) => {
        console.error(err);
        setError(t.errorMarkSingleRead);
      });

    if (isChatType(notif.notif_type)) {
      if (data.conversation_id) {
        navigate(`/chat?conversation=${data.conversation_id}`);
      } else if (data.product_id && data.seller_id) {
        navigate(`/chat?product=${data.product_id}&seller=${data.seller_id}`);
      } else {
        navigate("/chat");
      }
      return;
    }

    if (isOrderType(notif.notif_type)) {
      if (data.order_id) {
        navigate(`/orders/${data.order_id}`);
      } else {
        console.warn("Order notification haina order_id kwenye data:", notif);
      }
    }
  };

  const renderTypeBadge = (n: Notification) => {
    const base =
      "inline-flex items-center px-2 py-[3px] rounded-full text-[10px] font-medium";

    if (isChatType(n.notif_type)) {
      return (
        <span
          className={`${base} bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300`}
        >
          {t.typeChatLabel}
        </span>
      );
    }

    if (isOrderType(n.notif_type)) {
      const label =
        n.notif_type === "order_new"
          ? t.typeOrderNewLabel
          : n.notif_type === "order_status"
          ? t.typeOrderStatusLabel
          : t.typeOrderCreatedLabel;
      return (
        <span
          className={`${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300`}
        >
          {label}
        </span>
      );
    }

    return (
      <span
        className={`${base} bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400`}
      >
        {t.typeOtherLabel}
      </span>
    );
  };

  const getOpenLabel = (n: Notification) => {
    if (isChatType(n.notif_type)) return t.openChatLabel;
    if (isOrderType(n.notif_type)) return t.viewOrderLabel;
    return t.readMoreLabel;
  };

  // ================== META LOADER (logos & avatars) ==================

  useEffect(() => {
    if (!items.length) {
      setMetaMap({});
      return;
    }

    if (!currentUser) {
      // bado hatujaijua id ya user
      return;
    }

    const chatConvIds = new Set<number>();
    const orderIds = new Set<number>();
    const productIds = new Set<number>();

    items.forEach((n) => {
      const data = (n.data || {}) as NotificationData;
      if (isChatType(n.notif_type) && data.conversation_id) {
        chatConvIds.add(data.conversation_id);
      }
      if (isOrderType(n.notif_type) && data.order_id) {
        orderIds.add(data.order_id);
      }
      if (data.product_id) {
        productIds.add(data.product_id);
      }
    });

    if (chatConvIds.size === 0 && orderIds.size === 0 && productIds.size === 0) {
      setMetaMap({});
      return;
    }

    const fetchMeta = async () => {
      try {
        setMetaLoading(true);

        const [convDetails, orderDetails, productDetails] = await Promise.all([
          Promise.all(
            Array.from(chatConvIds).map(async (id) => {
              try {
                const res = await apiClient.get<ConversationSummary>(
                  `/api/conversations/${id}/`,
                );
                return res.data;
              } catch (e) {
                console.error("Failed to fetch conversation", id, e);
                return null;
              }
            }),
          ),
          Promise.all(
            Array.from(orderIds).map(async (id) => {
              try {
                const res = await apiClient.get<OrderSummary>(
                  `/api/orders/${id}/`,
                );
                return res.data;
              } catch (e) {
                console.error("Failed to fetch order", id, e);
                return null;
              }
            }),
          ),
          Promise.all(
            Array.from(productIds).map(async (id) => {
              try {
                const res = await apiClient.get<ProductSummary>(
                  `/api/products/${id}/`,
                );
                return res.data;
              } catch (e) {
                console.error("Failed to fetch product", id, e);
                return null;
              }
            }),
          ),
        ]);

        const convMap = new Map<number, ConversationSummary>();
        convDetails.forEach((c) => {
          if (c) convMap.set(c.id, c);
        });

        const orderMap = new Map<number, OrderSummary>();
        orderDetails.forEach((o) => {
          if (o) orderMap.set(o.id, o);
        });

        const productMap = new Map<number, ProductSummary>();
        productDetails.forEach((p) => {
          if (p) productMap.set(p.id, p);
        });

        const newMeta: Record<number, NotificationMeta> = {};
        const userId = currentUser.id ?? null;
        const userIsSeller = !!currentUser.is_seller;

        items.forEach((n) => {
          newMeta[n.id] = buildNotificationMeta(
            n,
            convMap,
            orderMap,
            productMap,
            userId,
            userIsSeller,
            t.newChatMessageTitle,
            t.genericNotificationTitle,
          );
        });

        setMetaMap(newMeta);
      } catch (err) {
        console.error("Failed to build notification meta", err);
      } finally {
        setMetaLoading(false);
      }
    };

    void fetchMeta();
  }, [items, currentUser, t.newChatMessageTitle, t.genericNotificationTitle]);

  const getAvatarForNotification = (n: Notification): AvatarInfo => {
    const meta = metaMap[n.id];

    const fallbackName =
      n.title ||
      (isChatType(n.notif_type)
        ? t.newChatMessageTitle
        : t.genericNotificationTitle);
    const fallbackLetter = (fallbackName.charAt(0) || "N").toUpperCase();

    if (meta) {
      return {
        imageUrl: meta.avatarImageUrl,
        letter: meta.avatarLetter || fallbackLetter,
        alt: meta.avatarAlt || fallbackName,
      };
    }

    return {
      imageUrl: null,
      letter: fallbackLetter,
      alt: fallbackName,
    };
  };

  // ================== RENDER LIST ==================

  const renderNotificationList = (list: Notification[]) => {
    if (list.length === 0) {
      return (
        <div className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400">
          {t.emptySectionLabel}
        </div>
      );
    }

    return (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {list.map((n) => {
          const isUnread = !n.is_read;
          const canOpen = canOpenNotification(n);
          const avatar = getAvatarForNotification(n);

          return (
            <li
              key={n.id}
              onClick={() => canOpen && handleOpenNotification(n)}
              className={`px-4 py-3 flex gap-3 transition-colors ${
                isUnread
                  ? "bg-orange-50/60 dark:bg-orange-500/5 hover:bg-orange-100/70 dark:hover:bg-orange-500/10"
                  : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
              } ${canOpen ? "cursor-pointer" : "cursor-default"}`}
            >
              {/* AVATAR */}
              <div className="mt-0.5">
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-semibold text-slate-700 dark:text-slate-100">
                  {avatar.imageUrl ? (
                    <img
                      src={avatar.imageUrl}
                      alt={avatar.alt}
                      className={`w-full h-full object-cover ${
                        metaLoading ? "opacity-70" : ""
                      }`}
                    />
                  ) : (
                    <span>{avatar.letter}</span>
                  )}

                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                      isUnread ? "bg-orange-500" : "bg-slate-300"
                    }`}
                  />
                </div>
              </div>

              {/* CONTENT */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {n.title ||
                      (isChatType(n.notif_type)
                        ? t.newChatMessageTitle
                        : t.genericNotificationTitle)}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {n.created_at ? formatDate(n.created_at) : ""}
                  </div>
                </div>

                {n.body && (
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                    {n.body}
                  </p>
                )}

                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {renderTypeBadge(n)}
                    {metaLoading && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        ...
                      </span>
                    )}
                  </div>

                  {canOpen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNotification(n);
                      }}
                      className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-medium hover:bg-black"
                    >
                      {getOpenLabel(n)}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const showChatSection = activeTab === "all" || activeTab === "chat";
  const showOrdersSection = activeTab === "all" || activeTab === "orders";
  const showOtherSection =
    activeTab === "all" && otherNotifications.length > 0;

  // ================== RENDER PAGE ==================

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* HEADER + MARK ALL */}
          <div className="flex items-center justify-between mb-3 gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t.pageTitle}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t.pageSubtitle}
              </p>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking || unreadCount === 0}
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {marking
                  ? t.markAllCleaning
                  : unreadCount > 0
                  ? t.markAllWithCount(unreadCount)
                  : t.markAllAlready}
              </button>
            )}
          </div>

          {/* TOP TABS */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-900/70 p-1 shadow-inner border border-slate-200/60 dark:border-slate-700/70">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition ${
                  activeTab === "all"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t.tabAllLabel}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition ${
                  activeTab === "chat"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t.tabChatLabel}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition ${
                  activeTab === "orders"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t.tabOrdersLabel}
              </button>
            </div>

            <div className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500">
              {activeTab === "all"
                ? t.tabHintAll
                : activeTab === "chat"
                ? t.tabHintChat
                : t.tabHintOrders}
            </div>
          </div>

          {/* CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                {t.loading}
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-xs text-red-600 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/40">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                {t.emptyAllLabel}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* CHAT SECTION */}
                {showChatSection && (
                  <section className="px-0 py-0">
                    <div className="px-4 pt-3 pb-2">
                      <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {t.chatSectionTitle}
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.chatSectionSubtitle}
                      </p>
                    </div>
                    {renderNotificationList(chatNotifications)}
                  </section>
                )}

                {/* ORDER SECTION */}
                {showOrdersSection && (
                  <section className="px-0 py-0">
                    <div className="px-4 pt-3 pb-2">
                      <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {t.ordersSectionTitle}
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.ordersSectionSubtitle}
                      </p>
                    </div>
                    {renderNotificationList(orderNotifications)}
                  </section>
                )}

                {/* OTHER SECTION */}
                {showOtherSection && (
                  <section className="px-0 py-0">
                    <div className="px-4 pt-3 pb-2">
                      <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {t.otherSectionTitle}
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.otherSectionSubtitle}
                      </p>
                    </div>
                    {renderNotificationList(otherNotifications)}
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <MainFooter />
    </div>
  );
};

export default NotificationsPage;
