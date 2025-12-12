// src/locales/chatPageTexts.ts
export interface ChatPageTexts {
  pageTitle: string;
  pageSubtitle: string;

  wsLabel: string;
  wsConnected: string;
  wsDisconnected: string;

  defaultShopName: string;
  sellerVerifiedLabel: string;

  statusTyping: string;
  statusOnline: string;
  statusRecentlyOnline: string;

  loadingMessages: string;
  noMessagesYet: string;
  typingIndicator: string;

  mustBeLoggedIn: string;

  errorLoadMessages: string;
  errorOpenChatNoSeller: string;
  errorOpenChatGeneric: string;
  errorCannotChatWithSelf: string;
  errorSendMessage: string;
  errorNoConversationForSend: string;

  inputPlaceholder: string;
  sendButtonIdle: string;
  sendButtonSending: string;

  noImageLabel: string;
  readProductDetails: string;
  productPinnedHint: string;
  productAttachmentHint: string;

  likesLabel: string;
  salesLabel: string;

  modalSellerLabel: string;
  modalParticipantsTitle: string;
  modalParticipantYou: string;
  modalParticipantBuyerRole: string;
  modalParticipantSeller: (shopName: string) => string;
  modalParticipantSellerRole: string;
  modalCloseAndContinue: string;
  modalOpenProductPage: string;

  youLabel: string;
  otherUserLabel: string;
}

const chatPageTexts: Record<"en" | "sw", ChatPageTexts> = {
  en: {
    pageTitle: "Chat with seller",
    pageSubtitle:
      "Send messages to the seller to discuss the product and transaction details in real-time.",

    wsLabel: "WS:",
    wsConnected: "connected",
    wsDisconnected: "disconnected",

    defaultShopName: "Seller shop",
    sellerVerifiedLabel: "✔ Verified seller",

    statusTyping: "Typing...",
    statusOnline: "Online",
    statusRecentlyOnline: "Recently online",

    loadingMessages: "Loading messages...",
    noMessagesYet:
      "No messages yet. Send the first message to start the conversation.",
    typingIndicator: "Typing....",

    mustBeLoggedIn: "Please log in first to use chat.",

    errorLoadMessages:
      "Failed to load messages. Please try again later.",
    errorOpenChatNoSeller:
      "Seller for this chat could not be determined. Please open chat from a product page.",
    errorOpenChatGeneric:
      "Failed to open conversation with seller. Please try again later.",
    errorCannotChatWithSelf:
      "You cannot start a conversation with your own account. Use a different buyer account.",
    errorSendMessage:
      "Failed to send message. Make sure you are online and try again.",
    errorNoConversationForSend:
      "Could not determine conversation. Please open the chat again from the product page.",

    inputPlaceholder: "Write your message here...",
    sendButtonIdle: "Send",
    sendButtonSending: "Sending...",

    noImageLabel: "No image",
    readProductDetails: "Read product details",
    productPinnedHint:
      "Your first message will be sent attached to this product.",
    productAttachmentHint: "Product you are talking about in this message.",

    likesLabel: "likes",
    salesLabel: "sales",

    modalSellerLabel: "Seller of this product",
    modalParticipantsTitle: "Conversation participants",
    modalParticipantYou: "You",
    modalParticipantBuyerRole: "buyer",
    modalParticipantSeller: (shopName: string) => shopName,
    modalParticipantSellerRole: "seller",
    modalCloseAndContinue: "Close and continue chatting",
    modalOpenProductPage: "Open product page",

    youLabel: "You",
    otherUserLabel: "Other",
  },

  sw: {
    pageTitle: "Ongea na muuzaji",
    pageSubtitle:
      "Tuma ujumbe kwa muuzaji kujadiliana kuhusu bidhaa na maelezo ya muamala kwa muda halisi (real-time).",

    wsLabel: "WS:",
    wsConnected: "connected",
    wsDisconnected: "disconnected",

    defaultShopName: "Duka la muuzaji",
    sellerVerifiedLabel: "✔ Muuzaji aliyethibitishwa",

    statusTyping: "Anaandika...",
    statusOnline: "Online",
    statusRecentlyOnline: "Alikuwa mtandaoni muda mfupi uliopita",

    loadingMessages: "Inapakia messages...",
    noMessagesYet:
      "Hakuna messages bado. Tuma ujumbe wa kwanza kuanza mazungumzo.",
    typingIndicator: "Anaandika....",

    mustBeLoggedIn: "Tafadhali login kwanza ili kutumia chat.",

    errorLoadMessages:
      "Imeshindikana kupakia messages. Jaribu tena baadaye.",
    errorOpenChatNoSeller:
      "Haijabainika muuzaji wa hii chat. Tafadhali fungua chat kupitia ukurasa wa bidhaa.",
    errorOpenChatGeneric:
      "Imeshindikana kufungua mazungumzo na muuzaji. Jaribu tena baadaye.",
    errorCannotChatWithSelf:
      "Huwezi kuanza mazungumzo na akaunti yako mwenyewe. Jaribu kutumia akaunti ya mnunuaji tofauti.",
    errorSendMessage:
      "Imeshindikana kutuma ujumbe. Hakikisha uko online na jaribu tena.",
    errorNoConversationForSend:
      "Hatukuweza kutambua mazungumzo. Tafadhali fungua chat tena kupitia bidhaa.",

    inputPlaceholder: "Andika ujumbe wako hapa...",
    sendButtonIdle: "Tuma",
    sendButtonSending: "Inatuma...",

    noImageLabel: "Hakuna picha",
    readProductDetails: "Soma maelezo ya bidhaa",
    productPinnedHint:
      "Ujumbe wako wa kwanza utatumwa ukiwa umeambatanishwa na bidhaa hii.",
    productAttachmentHint: "Bidhaa unayoijadili kwenye huu ujumbe.",

    likesLabel: "likes",
    salesLabel: "mauzo",

    modalSellerLabel: "Muuzaji wa hii bidhaa",
    modalParticipantsTitle: "Washiriki wa mazungumzo",
    modalParticipantYou: "Wewe",
    modalParticipantBuyerRole: "buyer",
    modalParticipantSeller: (shopName: string) => shopName,
    modalParticipantSellerRole: "seller",
    modalCloseAndContinue: "Funga na endelea kuchat",
    modalOpenProductPage: "Fungua product page",

    youLabel: "Wewe",
    otherUserLabel: "Mwingine",
  },
};

export function getChatPageTexts(
  language: string | null | undefined,
): ChatPageTexts {
  if (language === "sw") {
    return chatPageTexts.sw;
  }
  return chatPageTexts.en;
}
