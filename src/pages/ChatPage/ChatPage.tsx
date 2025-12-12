// src/pages/ChatPage.tsx (au src/pages/ChatPage/ChatPage.tsx)
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import apiClient from "../../lib/apiClient";
import { getAccessToken } from "../../lib/authStorage";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { getChatPageTexts } from "./chatPageTexts";
import MainHeader from "../../components/MainHeader";
import MainFooter from "../../components/MainFooter";

interface UserMini {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
  is_seller?: boolean;
}

type MessageStatus = "sent" | "delivered" | "read";

interface Message {
  id: number;
  conversation: number;
  sender: UserMini;
  text: string;
  status: MessageStatus;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

interface SellerMini {
  id: number;
  business_name: string;
  is_verified?: boolean;
  rating?: string;
  rating_count?: number;
  total_sales?: number;
  items_sold?: number;
  logo_url?: string | null;
  user: UserMini;
}

interface ProductMini {
  id: number;
  name: string;
  price: string;
  currency: string;
  image_url?: string | null;
  likes_count?: number;
  sales_count?: number;
  units_sold?: number;
}

interface ConversationParticipantStateBase {
  id?: number;
  conversation: number;
  is_typing: boolean;
  last_typing_at: string | null;
  last_seen_at: string | null;
  last_read_at: string | null;
}

interface ConversationParticipantStateWithUser
  extends ConversationParticipantStateBase {
  user: UserMini;
}

interface ConversationParticipantStateWithUserId
  extends ConversationParticipantStateBase {
  user_id: number;
}

type ConversationParticipantState =
  | ConversationParticipantStateWithUser
  | ConversationParticipantStateWithUserId;

interface Conversation {
  id: number;
  buyer: UserMini;
  seller: SellerMini;
  product: ProductMini | null;
  created_at: string;
  last_message_at: string;
  last_message: Message;
  unread_count: number;
  is_typing_other_side: boolean;
}

interface ConversationDetail extends Conversation {
  messages: Message[];
  participant_states: ConversationParticipantState[];
}

interface ConversationCreatePayload {
  seller_id: number;
  product_id?: number;
}

interface MessageCreatePayload {
  conversation: number;
  text: string;
}

type DRFErrorResponse =
  | {
      error?: string;
      detail?: string;
      non_field_errors?: string[];
    }
  | Record<string, unknown>;

const extractErrorMessage = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;
  const typed = data as DRFErrorResponse;

  if (typeof typed.error === "string") return typed.error;
  if (typeof typed.detail === "string") return typed.detail;

  if (
    Array.isArray(typed.non_field_errors) &&
    typed.non_field_errors.length > 0 &&
    typeof typed.non_field_errors[0] === "string"
  ) {
    return typed.non_field_errors[0];
  }

  return null;
};

const getProductMainImage = (product: ProductMini | null): string | null => {
  if (!product) return null;
  if (product.image_url) return product.image_url;
  return null;
};

const getParticipantUserId = (
  ps: ConversationParticipantState,
): number | null => {
  if ("user" in ps && ps.user) {
    return ps.user.id;
  }
  if ("user_id" in ps && typeof ps.user_id === "number") {
    return ps.user_id;
  }
  return null;
};

// ------------------ WS EVENT TYPES ------------------

type WsEventBase = {
  type?: string;
};

interface WsMessageEnvelope extends WsEventBase {
  message: Message;
}

interface WsTypingEnvelope extends WsEventBase {
  state: ConversationParticipantState;
}

interface WsBulkEnvelope extends WsEventBase {
  type: "conversation.bulk_state";
  messages?: Message[];
  participant_states?: ConversationParticipantState[];
}

type WsEventPayload =
  | WsMessageEnvelope
  | WsTypingEnvelope
  | WsBulkEnvelope;

// ------------------ BUILD WEBSOCKET URL ------------------

const buildWebSocketUrl = (conversationPk: number): string => {
  const base =
    (apiClient.defaults.baseURL as string | undefined) ||
    window.location.origin;

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL(window.location.origin);
  }

  const isSecure = url.protocol === "https:";
  url.protocol = isSecure ? "wss:" : "ws:";

  url.pathname = `/ws/chat/${conversationPk}/`;

  let token: string | null = null;

  const maybeHeaders = apiClient.defaults.headers?.common;
  if (maybeHeaders) {
    const headersRecord = maybeHeaders as Record<string, unknown>;
    const authHeader =
      (headersRecord.Authorization as string | undefined) ??
      (headersRecord.authorization as string | undefined);

    if (authHeader && typeof authHeader === "string") {
      const lower = authHeader.toLowerCase();
      if (lower.startsWith("bearer ")) {
        token = authHeader.slice(7).trim();
      }
    }
  }

  if (!token) {
    token = getAccessToken();
  }

  if (token) {
    url.searchParams.set("token", token);
  } else {
    console.warn(
      "[Chat WS] Hakuna JWT token iliyopatikana kwa WebSocket (Authorization/header/storage).",
    );
  }

  console.log("[Chat WS] Final URL:", url.toString());

  return url.toString();
};

// ========================================================

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = getChatPageTexts(language);

  const [searchParams] = useSearchParams();

  const productIdParam = searchParams.get("product");
  const sellerIdParam = searchParams.get("seller");
  const conversationParam = searchParams.get("conversation");
  const orderIdParam = searchParams.get("order");

  const conversationFromUrl =
    conversationParam !== null && !Number.isNaN(Number(conversationParam))
      ? Number(conversationParam)
      : null;

  const [conversationId, setConversationId] =
    useState<number | null>(conversationFromUrl);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  const [conversationDetail, setConversationDetail] =
    useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participantStates, setParticipantStates] = useState<
    ConversationParticipantState[]
  >([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");

  const [fallbackProduct, setFallbackProduct] = useState<ProductMini | null>(
    null,
  );
  const [fallbackSeller, setFallbackSeller] = useState<SellerMini | null>(null);

  const [productModalOpen, setProductModalOpen] = useState(false);

  const effectiveProduct =
    conversationDetail?.product || fallbackProduct || null;
  const effectiveSeller =
    conversationDetail?.seller || fallbackSeller || null;

  // Product context kutoka product list (attachment ya ujumbe wa kwanza)
  const [productContext, setProductContext] = useState<ProductMini | null>(
    null,
  );
  const [showProductPinned, setShowProductPinned] = useState(false);
  const [productContextMessageId, setProductContextMessageId] = useState<
    number | null
  >(null);

  const pinnedProduct =
    (showProductPinned && productContext) ||
    (!productContext && effectiveProduct) ||
    null;

  const pinnedProductImage = getProductMainImage(pinnedProduct);

  const modalProduct = productContext || effectiveProduct;
  const modalProductImage = getProductMainImage(modalProduct);

  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const [wsConnected, setWsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, []);

  const shopName = effectiveSeller?.business_name ?? t.defaultShopName;

  // --------- Tambua kama current user ni buyer au seller kwenye hii conversation ---------

  const conversationRole: "buyer" | "seller" | "unknown" = (() => {
    if (!user) return "unknown";
    if (conversationDetail) {
      const currentId = user.id;
      if (conversationDetail.seller?.user?.id === currentId) {
        return "seller";
      }
      if (conversationDetail.buyer?.id === currentId) {
        return "buyer";
      }
    }

    // fallback → tumia flag yoyote iliyopo kwenye user wa AuthContext
    const asAny = user as unknown as { is_seller?: boolean };
    if (typeof asAny.is_seller === "boolean") {
      return asAny.is_seller ? "seller" : "buyer";
    }

    return "unknown";
  })();

  const isSellerView = conversationRole === "seller";

  // Header avatar information (mtu wa pili wa mazungumzo)
  const {
    headerAvatarUrl,
    headerLetter,
    headerTitle,
    headerSubtitle,
  } = (() => {
    // default: tuna assume user ni buyer, anaongea na duka
    let avatarUrl: string | null =
      (effectiveSeller && effectiveSeller.logo_url) || null;
    let title = shopName;
    let letter = (shopName.charAt(0) || "S").toUpperCase();
    let subtitle =
      !isSellerView && effectiveSeller?.is_verified
        ? t.sellerVerifiedLabel
        : "";

    // kama user ni seller → aone sura ya buyer
    if (conversationDetail && isSellerView) {
      const buyer = conversationDetail.buyer;
      const fullName =
        `${buyer.first_name || ""} ${buyer.last_name || ""}`.trim() ||
        buyer.username ||
        buyer.email ||
        t.otherUserLabel;

      title = fullName;
      letter = (fullName.charAt(0) || letter).toUpperCase();
      avatarUrl = buyer.avatar_url ?? null;
      subtitle = "";
    }

    return {
      headerAvatarUrl: avatarUrl,
      headerLetter: letter,
      headerTitle: title,
      headerSubtitle: subtitle,
    };
  })();

  const otherTyping = participantStates.some((ps) => {
    const participantId = getParticipantUserId(ps);
    if (!user || participantId === null) return false;
    return participantId !== user.id && ps.is_typing;
  });

  const formatDateTimeShort = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSenderLabel = (sender: UserMini): string => {
    if (!user) return sender.username || sender.email || t.otherUserLabel;
    if (sender.id === user.id) return t.youLabel;
    if (sender.username) return sender.username;
    const full = `${sender.first_name || ""} ${sender.last_name || ""}`.trim();
    if (full) return full;
    if (sender.email) return sender.email;
    return t.otherUserLabel;
  };

  const renderStatusTick = (status: MessageStatus, mine: boolean) => {
    if (!mine) return null;
    if (status === "sent") {
      return <span className="ml-1 text-[9px] opacity-80">✓</span>;
    }
    if (status === "delivered") {
      return <span className="ml-1 text-[9px] opacity-80">✓✓</span>;
    }
    if (status === "read") {
      return (
        <span className="ml-1 text-[9px] opacity-80 text-emerald-300">
          ✓✓
        </span>
      );
    }
    return null;
  };

  const [initialDetailLoaded, setInitialDetailLoaded] = useState(false);

  const loadConversationDetail = useCallback(
    async (conversationPk: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<ConversationDetail>(
          `/api/conversations/${conversationPk}/`,
        );
        const data = res.data;
        setConversationDetail(data);
        setMessages(data.messages || []);
        setParticipantStates(data.participant_states || []);

        void apiClient
          .post(`/api/conversations/${conversationPk}/mark_seen/`, {})
          .catch((markError) => {
            console.error("Failed to mark messages as seen", markError);
          });

        setInitialDetailLoaded(true);
      } catch (err) {
        console.error(err);
        setError(t.errorLoadMessages);
      } finally {
        setLoading(false);
      }
    },
    [t.errorLoadMessages],
  );

  const handleIncomingEvent = useCallback(
    (event: MessageEvent<string>) => {
      try {
        console.log("[WS raw event]", event.data);
        const parsed = JSON.parse(event.data) as WsEventPayload | null;
        if (!parsed || typeof parsed !== "object") return;

        const type = parsed.type;

        if ("message" in parsed && parsed.message) {
          const incoming = parsed.message;

          setMessages((prev) => {
            const exists = prev.some((m) => m.id === incoming.id);
            if (exists) {
              return prev.map((m) => (m.id === incoming.id ? incoming : m));
            }
            return [...prev, incoming];
          });

          setConversationDetail((prev) =>
            prev
              ? {
                  ...prev,
                  last_message: incoming,
                  last_message_at: incoming.created_at,
                }
              : prev,
          );

          if (user && incoming.sender.id !== user.id && conversationId) {
            void apiClient
              .post(`/api/conversations/${conversationId}/mark_seen/`, {})
              .catch((errMark) => {
                console.error(
                  "Failed to mark seen via websocket event",
                  errMark,
                );
              });
          }

          scrollToBottom();
          return;
        }

        const looksLikeTypingEvent =
          typeof type === "string" &&
          type.toLowerCase().includes("typing") &&
          "state" in parsed;

        if (looksLikeTypingEvent && "state" in parsed && parsed.state) {
          const state = parsed.state;

          setParticipantStates((prev) => {
            const existingIndex = prev.findIndex(
              (ps) =>
                ps.id !== undefined &&
                state.id !== undefined &&
                ps.id === state.id,
            );

            if (existingIndex !== -1) {
              const clone = [...prev];
              clone[existingIndex] = state;
              return clone;
            }

            const incomingUserId = getParticipantUserId(state);
            const idxByUser = prev.findIndex((ps) => {
              const uid = getParticipantUserId(ps);
              return (
                uid !== null &&
                incomingUserId !== null &&
                uid === incomingUserId &&
                ps.conversation === state.conversation
              );
            });

            if (idxByUser !== -1) {
              const clone = [...prev];
              clone[idxByUser] = state;
              return clone;
            }

            return [...prev, state];
          });

          return;
        }

        if (type === "conversation.bulk_state") {
          const bulk = parsed as WsBulkEnvelope;
          if (bulk.messages) {
            setMessages(bulk.messages);
          }
          if (bulk.participant_states) {
            setParticipantStates(bulk.participant_states);
          }
          scrollToBottom();
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    },
    [conversationId, scrollToBottom, user],
  );

  // ================== BOOTSTRAP ==================
  useEffect(() => {
    if (!user) return;
    if (hasBootstrapped) return;

    const bootstrap = async () => {
      try {
        setError(null);
        setLoading(true);

        if (conversationFromUrl) {
          setConversationId(conversationFromUrl);
          setHasBootstrapped(true);
          return;
        }

        if (conversationId) {
          setHasBootstrapped(true);
          return;
        }

        if (!sellerIdParam) {
          setError(t.errorOpenChatNoSeller);
          setLoading(false);
          setHasBootstrapped(true);
          return;
        }

        const payload: ConversationCreatePayload = {
          seller_id: Number(sellerIdParam),
        };

        if (productIdParam) {
          const productPk = Number(productIdParam);
          if (!Number.isNaN(productPk)) {
            payload.product_id = productPk;
          }
        }

        // Ili tusipate warning ya "orderIdParam is declared but never used"
        void orderIdParam;

        const res = await apiClient.post<Conversation>(
          "/api/conversations/",
          payload,
        );
        setConversationId(res.data.id);
      } catch (errorInit: unknown) {
        console.error(errorInit);

        let message = t.errorOpenChatGeneric;

        if (axios.isAxiosError(errorInit)) {
          const specific = extractErrorMessage(errorInit.response?.data);
          if (specific) {
            if (
              specific
                .toLowerCase()
                .includes("you cannot start a conversation with yourself")
            ) {
              message = t.errorCannotChatWithSelf;
            } else {
              message = specific;
            }
          }
        }

        setError(message);
      } finally {
        setLoading(false);
        setHasBootstrapped(true);
      }
    };

    void bootstrap();
  }, [
    user,
    hasBootstrapped,
    conversationFromUrl,
    conversationId,
    productIdParam,
    sellerIdParam,
    orderIdParam,
    t.errorOpenChatGeneric,
    t.errorOpenChatNoSeller,
    t.errorCannotChatWithSelf,
  ]);

  // ================== LOAD DETAIL ==================
  useEffect(() => {
    if (!user) return;
    if (!conversationId) return;
    if (initialDetailLoaded) return;

    void loadConversationDetail(conversationId);
  }, [user, conversationId, initialDetailLoaded, loadConversationDetail]);

  // ================== FALLBACK CONTEXT ==================
  useEffect(() => {
    const loadFallbackContext = async () => {
      try {
        if (conversationId) return;

        if (productIdParam) {
          const productPk = Number(productIdParam);
          if (!Number.isNaN(productPk)) {
            const prodRes = await apiClient.get<ProductMini>(
              `/api/products/${productPk}/`,
            );
            setFallbackProduct(prodRes.data);
          }
        }

        if (sellerIdParam) {
          const sellerPk = Number(sellerIdParam);
          if (!Number.isNaN(sellerPk)) {
            const sellerRes = await apiClient.get<SellerMini>(
              `/api/sellers/${sellerPk}/`,
            );
            setFallbackSeller(sellerRes.data);
          }
        }
      } catch (err) {
        console.error("Failed to load fallback chat context", err);
      }
    };

    void loadFallbackContext();
  }, [conversationId, productIdParam, sellerIdParam]);

  // Product context kutoka product param (ili iwe attachment ya message ya kwanza)
  useEffect(() => {
    if (!productIdParam) return;
    if (!fallbackProduct) return;
    if (productContext) return;

    setProductContext(fallbackProduct);
    setShowProductPinned(true);
  }, [productIdParam, fallbackProduct, productContext]);

  // ================== WEBSOCKET ==================
  useEffect(() => {
    if (!user) return;
    if (!conversationId) return;

    const url = buildWebSocketUrl(conversationId);
    console.log("[WS] connecting to", url);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] connected]");
      setWsConnected(true);
      try {
        ws.send(
          JSON.stringify({
            action: "join",
            conversation: conversationId,
          }),
        );
      } catch (err) {
        console.error("Failed to send join event", err);
      }
    };

    ws.onmessage = (ev) => {
      handleIncomingEvent(ev);
    };

    ws.onerror = (ev) => {
      console.error("WebSocket error", ev);
    };

    ws.onclose = () => {
      console.log("[WS] closed");
      setWsConnected(false);
      wsRef.current = null;
    };

    return () => {
      console.log("[WS] cleanup - closing");
      ws.close();
      wsRef.current = null;
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
      setWsConnected(false);
    };
  }, [conversationId, handleIncomingEvent, user]);

  // ================== AUTO SCROLL ==================
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // ================== TYPING ==================
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId) return;

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(
            JSON.stringify({
              type: "typing",
              is_typing: typing,
            }),
          );
          return;
        } catch (err) {
          console.error("Failed to send typing over WS", err);
        }
      }

      void apiClient
        .post(`/api/conversations/${conversationId}/typing/`, {
          is_typing: typing,
        })
        .catch((err) => {
          console.error("Failed to send typing state (HTTP fallback)", err);
        });
    },
    [conversationId],
  );

  const handleChangeMessage = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!conversationId) return;

    if (value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        sendTyping(true);
      }

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = window.setTimeout(() => {
        setIsTyping(false);
        sendTyping(false);
        typingTimeoutRef.current = undefined;
      }, 2500);
    } else {
      setIsTyping(false);
      sendTyping(false);
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = undefined;
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = newMessage.trim();
    if (!textToSend) return;

    if (!conversationId) {
      setError(t.errorNoConversationForSend);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const payload: MessageCreatePayload = {
        conversation: conversationId,
        text: textToSend,
      };

      const res = await apiClient.post<Message>("/api/messages/", payload);
      setNewMessage("");

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === res.data.id);
        if (exists) return prev;
        return [...prev, res.data];
      });

      // Message ya kwanza kubeba product attachment
      if (
        productContext &&
        showProductPinned &&
        productContextMessageId === null
      ) {
        setProductContextMessageId(res.data.id);
        setShowProductPinned(false);
      }
    } catch (errorSend) {
      console.error(errorSend);
      setError(t.errorSendMessage);
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <MainHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300 max-w-sm text-center">
            {t.mustBeLoggedIn}
          </div>
        </main>
        <MainFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <MainHeader />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-5 flex flex-col gap-3">
        <header className="mb-1 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t.pageTitle}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t.pageSubtitle}
            </p>
          </div>

          <div className="text-[10px] px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70">
            {t.wsLabel}{" "}
            <span
              className={
                wsConnected
                  ? "text-emerald-600 dark:text-emerald-300 font-semibold"
                  : "text-red-500 font-semibold"
              }
            >
              {wsConnected ? t.wsConnected : t.wsDisconnected}
            </span>
          </div>
        </header>

        <section className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* CHAT HEADER (inaonyesha mtu wa pili) */}
          {effectiveSeller && (
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2">
                {headerAvatarUrl ? (
                  <img
                    src={headerAvatarUrl}
                    alt={headerTitle}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-[11px] font-semibold flex items-center justify-center text-slate-700">
                    {headerLetter}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {headerTitle}
                  </span>
                  {headerSubtitle && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-300">
                      {headerSubtitle}
                    </span>
                  )}
                </div>
              </div>
              {conversationDetail && (
                <div className="text-[10px] text-slate-400">
                  {otherTyping
                    ? t.statusTyping
                    : wsConnected
                    ? t.statusOnline
                    : t.statusRecentlyOnline}
                </div>
              )}
            </div>
          )}

          {/* MESSAGES LIST */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {loading ? (
              <div className="text-sm text-slate-500">
                {t.loadingMessages}
              </div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-slate-500">
                {t.noMessagesYet}
              </div>
            ) : (
              messages.map((msg) => {
                const mine = msg.sender.id === user.id;
                const senderLabel = getSenderLabel(msg.sender);
                const createdLabel = formatDateTimeShort(msg.created_at);

                const showProductAttachment =
                  mine &&
                  productContext &&
                  productContextMessageId !== null &&
                  msg.id === productContextMessageId;

                const messageProductImage = productContext
                  ? getProductMainImage(productContext)
                  : null;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-1 ${
                      mine ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Avatar ya upande wa pili, ina-follow picha ya header */}
                    {!mine && (
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 dark:text-slate-100">
                        {headerAvatarUrl ? (
                          <img
                            src={headerAvatarUrl}
                            alt={headerTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{headerLetter}</span>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-[11px] ${
                        mine
                          ? "bg-orange-500 text-white rounded-br-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm"
                      }`}
                    >
                      {showProductAttachment && productContext && (
                        <div className="mb-1 rounded-xl border border-orange-100 dark:border-slate-700 bg-white/90 dark:bg-slate-900/60 p-2 flex items-center gap-2 text-[10px]">
                          {messageProductImage ? (
                            <img
                              src={messageProductImage}
                              alt={productContext.name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] text-slate-500">
                              {t.noImageLabel}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold line-clamp-1 text-slate-900 dark:text-slate-100">
                              {productContext.name}
                            </div>
                            <div className="text-[10px] text-orange-600 dark:text-orange-300 font-semibold">
                              {productContext.price}{" "}
                              {productContext.currency}
                            </div>
                            <div className="text-[9px] text-slate-500 dark:text-slate-400">
                              {t.productAttachmentHint}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] opacity-80 mb-0.5 flex items-center justify-between gap-2">
                        <span>{senderLabel}</span>
                        <span className="font-mono flex items-center">
                          {createdLabel}
                          {renderStatusTick(msg.status, mine)}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap wrap-break-words">
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {otherTyping && (
              <div className="px-1 pt-1 text-[11px] text-slate-500 italic">
                {t.typingIndicator}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* PINNED PRODUCT (kutoka conversation au product list) */}
          {pinnedProduct && (
            <div className="border-t border-slate-200 dark:border-slate-800 px-3 py-2 bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
              {pinnedProductImage ? (
                <img
                  src={pinnedProductImage}
                  alt={pinnedProduct.name}
                  className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] text-slate-400">
                  {t.noImageLabel}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                  {pinnedProduct.name}
                </div>
                <div className="text-[10px] text-orange-600 font-semibold">
                  {pinnedProduct.price} {pinnedProduct.currency}
                </div>
                <button
                  type="button"
                  onClick={() => setProductModalOpen(true)}
                  className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-300 underline underline-offset-2 hover:text-slate-900"
                >
                  {t.readProductDetails}
                </button>
                {showProductPinned && productContext && (
                  <p className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-500">
                    {t.productPinnedHint}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* INPUT */}
          <form
            onSubmit={handleSend}
            className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2 bg-slate-50/60 dark:bg-slate-900/80"
          >
            <textarea
              value={newMessage}
              onChange={handleChangeMessage}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white resize-none h-10"
              placeholder={t.inputPlaceholder}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={
                sending || !newMessage.trim() || conversationId === null
              }
              className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 disabled:opacity-60"
            >
              {sending ? t.sendButtonSending : t.sendButtonIdle}
            </button>
          </form>
        </section>
      </main>

      <MainFooter />

      {/* PRODUCT MODAL */}
      {productModalOpen && modalProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-sm w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4 relative">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="absolute top-2 right-2 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              ✕
            </button>

            <div className="flex gap-3 mb-3">
              {modalProductImage ? (
                <img
                  src={modalProductImage}
                  alt={modalProduct.name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                  {t.noImageLabel}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                  {modalProduct.name}
                </div>
                <div className="mt-1 text-[12px] text-orange-600 font-bold">
                  {modalProduct.price} {modalProduct.currency}
                </div>
                {modalProduct.likes_count !== undefined && (
                  <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    ❤️ {modalProduct.likes_count} {t.likesLabel}
                  </div>
                )}
                {modalProduct.sales_count !== undefined && (
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    🛒 {modalProduct.sales_count} {t.salesLabel}
                  </div>
                )}
              </div>
            </div>

            {effectiveSeller && (
              <div className="mb-3 border border-slate-100 dark:border-slate-800 rounded-xl p-2 flex items-center gap-2">
                {effectiveSeller.logo_url ? (
                  <img
                    src={effectiveSeller.logo_url}
                    alt={shopName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-[11px] font-semibold flex items-center justify-center text-slate-700">
                    {shopName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[12px] font-semibold text-slate-900 dark:text-white">
                    {shopName}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {t.modalSellerLabel}
                  </span>
                </div>
              </div>
            )}

            {conversationDetail && (
              <div className="mb-3 border border-slate-100 dark:border-slate-800 rounded-xl p-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="font-semibold mb-1 text-[11px] text-slate-800 dark:text-slate-200">
                  {t.modalParticipantsTitle}
                </div>
                <div>
                  👤 <span className="font-medium">{t.modalParticipantYou}</span>{" "}
                  ({t.modalParticipantBuyerRole})
                </div>
                <div>
                  🏪{" "}
                  <span className="font-medium">
                    {t.modalParticipantSeller(shopName)}
                  </span>{" "}
                  ({t.modalParticipantSellerRole})
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-1">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex-1"
              >
                {t.modalCloseAndContinue}
              </button>
              <Link
                to={`/products/${modalProduct.id}`}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-medium hover:bg-black"
              >
                {t.modalOpenProductPage}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
