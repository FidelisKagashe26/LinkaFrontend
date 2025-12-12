// src/pages/NotificationsPage/notificationsPageTexts.ts
export interface NotificationsPageTexts {
  pageTitle: string;
  pageSubtitle: string;

  loading: string;
  errorLoadNotifications: string;
  errorMarkAllRead: string;
  errorMarkSingleRead: string;

  markAllCleaning: string;
  markAllWithCount: (count: number) => string;
  markAllAlready: string;

  emptyAllLabel: string;
  emptySectionLabel: string;

  chatSectionTitle: string;
  chatSectionSubtitle: string;
  ordersSectionTitle: string;
  ordersSectionSubtitle: string;
  otherSectionTitle: string;
  otherSectionSubtitle: string;

  typeChatLabel: string;
  typeOrderNewLabel: string;
  typeOrderStatusLabel: string;
  typeOrderCreatedLabel: string;
  typeOtherLabel: string;

  openChatLabel: string;
  viewOrderLabel: string;
  readMoreLabel: string;

  newChatMessageTitle: string;
  genericNotificationTitle: string;

  tabAllLabel: string;
  tabChatLabel: string;
  tabOrdersLabel: string;
  tabHintAll: string;
  tabHintChat: string;
  tabHintOrders: string;
}

const notificationsPageTexts: Record<"en" | "sw", NotificationsPageTexts> = {
  en: {
    pageTitle: "Notifications",
    pageSubtitle:
      "Alerts for orders, chat messages and other events in LINKA.",

    loading: "Loading notifications...",
    errorLoadNotifications: "Failed to load notifications.",
    errorMarkAllRead: "Failed to mark all as read.",
    errorMarkSingleRead:
      "Failed to mark notification as read (backend).",

    markAllCleaning: "Clearing...",
    markAllWithCount: (count: number) =>
      `Mark all read (${count})`,
    markAllAlready: "All read",

    emptyAllLabel: "No notifications for now.",
    emptySectionLabel: "No notifications in this section yet.",

    chatSectionTitle: "Chat messages",
    chatSectionSubtitle:
      "Notifications for new messages between you and sellers/buyers.",
    ordersSectionTitle: "Orders",
    ordersSectionSubtitle:
      "Notifications about new orders and order status changes.",
    otherSectionTitle: "Other",
    otherSectionSubtitle: "Other notifications that are not chat or orders.",

    typeChatLabel: "Chat",
    typeOrderNewLabel: "New order",
    typeOrderStatusLabel: "Order status",
    typeOrderCreatedLabel: "Order created",
    typeOtherLabel: "Other",

    openChatLabel: "Open chat",
    viewOrderLabel: "View order",
    readMoreLabel: "Read more",

    newChatMessageTitle: "New chat message",
    genericNotificationTitle: "(Notification)",

    tabAllLabel: "All",
    tabChatLabel: "Chat",
    tabOrdersLabel: "Orders",
    tabHintAll: "View all your notifications in one place.",
    tabHintChat: "Focus on chat messages only.",
    tabHintOrders: "See updates related to your orders.",
  },

  sw: {
    pageTitle: "Notifications",
    pageSubtitle:
      "Arifa za orders, mazungumzo (chat) na mengine kwenye LINKA.",

    loading: "Inapakia notifications...",
    errorLoadNotifications: "Imeshindikana kupakia notifications.",
    errorMarkAllRead: "Imeshindikana kutandika zote kama zimesomwa.",
    errorMarkSingleRead:
      "Imeshindikana kuweka notification kama imesomwa (backend).",

    markAllCleaning: "Inasafisha...",
    markAllWithCount: (count: number) =>
      `Tandika zote kama zimesomwa (${count})`,
    markAllAlready: "Zote zimesomwa",

    emptyAllLabel: "Hakuna notification kwa sasa.",
    emptySectionLabel: "Hakuna notification kwenye kundi hili kwa sasa.",

    chatSectionTitle: "Chat messages",
    chatSectionSubtitle:
      "Arifa za ujumbe mpya wa mazungumzo kati ya wewe na wauzaji/wateja.",
    ordersSectionTitle: "Orders",
    ordersSectionSubtitle:
      "Arifa za order mpya na mabadiliko ya status ya order.",
    otherSectionTitle: "Nyingine",
    otherSectionSubtitle:
      "Arifa zingine zisizo za chat wala order.",

    typeChatLabel: "Chat",
    typeOrderNewLabel: "Order mpya",
    typeOrderStatusLabel: "Order status",
    typeOrderCreatedLabel: "Order imeundwa",
    typeOtherLabel: "Nyingine",

    openChatLabel: "Fungua chat",
    viewOrderLabel: "Fungua order",
    readMoreLabel: "Soma zaidi",

    newChatMessageTitle: "Ujumbe mpya wa chat",
    genericNotificationTitle: "(Notification)",

    tabAllLabel: "Zote",
    tabChatLabel: "Chat",
    tabOrdersLabel: "Orders",
    tabHintAll: "Tazama notifications zote kwa pamoja.",
    tabHintChat: "Onyesha notifications za chat pekee.",
    tabHintOrders: "Onyesha notifications za orders pekee.",
  },
};

export function getNotificationsPageTexts(
  language: string | null | undefined,
): NotificationsPageTexts {
  if (language === "sw") {
    return notificationsPageTexts.sw;
  }
  return notificationsPageTexts.en;
}
