export const createChatSlice = (set, get) => ({
  selectedChatType: undefined,
  selectedChatData: undefined,
  selectedChatMessages: [],
  directMessagesContacts: [],
  channels: [],
  // Messages waiting to be delivered (offline queue / failed sends)
  outbox: [],
  addToOutbox: (item) => set({ outbox: [...get().outbox, item] }),
  updateOutbox: (clientId, patch) =>
    set({
      outbox: get().outbox.map((i) =>
        i.clientId === clientId ? { ...i, ...patch } : i
      ),
    }),
  removeFromOutbox: (clientId) =>
    set({ outbox: get().outbox.filter((i) => i.clientId !== clientId) }),
  setMessageReactions: (messageId, reactions) =>
    set({
      selectedChatMessages: get().selectedChatMessages.map((m) =>
        m._id === messageId ? { ...m, reactions } : m
      ),
    }),
  // In-chat search; chatId ties the search to the chat it was opened in
  chatSearch: { open: false, query: "", index: 0, total: 0, targetId: null, chatId: null },
  setChatSearch: (patch) => set({ chatSearch: { ...get().chatSearch, ...patch } }),
  resetChatSearch: () =>
    set({
      chatSearch: { open: false, query: "", index: 0, total: 0, targetId: null, chatId: null },
    }),
  typingUsers: {},
  setTyping: (userId, isTyping) => {
    const typingUsers = { ...get().typingUsers };
    if (isTyping) typingUsers[userId] = true;
    else delete typingUsers[userId];
    set({ typingUsers });
  },
  onlineUsers: [],
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
  isUploading: false,
  fileUploadProgress: 0,
  isDownloading: false,
  downloadProgress: 0,
  setIsUploading: (isUploading) => set({ isUploading }),
  setFileUploadProgress: (fileUploadProgress) => set({ fileUploadProgress }),
  setIsDownloading: (isDownloading) => set({ isDownloading }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setSelectedChatType: (selectedChatType) => set({ selectedChatType }),
  setSelectedChatData: (selectedChatData) => set({ selectedChatData }),
  channelsLoaded: false,
  setChannels: (channels) => set({ channels, channelsLoaded: true }),
  updateChannelInList: (channel) => {
    const { channels, selectedChatType, selectedChatData } = get();
    set({
      channels: channels.map((c) => (c._id === channel._id ? channel : c)),
      ...(selectedChatType === "channel" && selectedChatData?._id === channel._id
        ? { selectedChatData: channel }
        : {}),
    });
  },
  removeChannel: (channelId) => {
    const { channels, selectedChatType, selectedChatData } = get();
    set({
      channels: channels.filter((c) => c._id !== channelId),
      ...(selectedChatType === "channel" && selectedChatData?._id === channelId
        ? {
            selectedChatData: undefined,
            selectedChatType: undefined,
            selectedChatMessages: [],
          }
        : {}),
    });
  },
  setSelectedChatMessages: (selectedChatMessages) =>
    set({ selectedChatMessages }),
  setDirectMessagesContacts: (directMessagesContacts) =>
    set({ directMessagesContacts }),
  removeMessage: (messageId) =>
    set({
      selectedChatMessages: get().selectedChatMessages.filter(
        (m) => m._id !== messageId
      ),
    }),
  markMessagesSeen: (viewerId, seenAt) => {
    const { userInfo, selectedChatMessages } = get();
    set({
      selectedChatMessages: selectedChatMessages.map((m) => {
        const senderId = m.sender?._id || m.sender;
        const recipientId = m.recipient?._id || m.recipient;
        return senderId === userInfo.id && recipientId === viewerId && !m.seen
          ? { ...m, seen: true, seenAt }
          : m;
      }),
    });
  },
  closeChat: () =>
    set({
      selectedChatData: undefined,
      selectedChatType: undefined,
      selectedChatMessages: [],
    }),
  addMessage: (message) => {
    const selectedChatMessages = get().selectedChatMessages;
    if (message._id && selectedChatMessages.some((m) => m._id === message._id)) {
      return;
    }
    const selectedChatType = get().selectedChatType;
    set({
      selectedChatMessages: [
        ...selectedChatMessages,
        {
          ...message,
          recipient:
            selectedChatType === "channel"
              ? message.recipent
              : message.recipient._id,
          sender:
            selectedChatType === "channel"
              ? message.sender
              : message.sender._id,
        },
      ],
    });
  },
  addChannel: (channel) => {
    const channels = get().channels.filter((c) => c._id !== channel._id);
    set({ channels: [channel, ...channels] });
  },
  addContactInDMContacts: (message) => {
    console.log({ message });
    const userId = get().userInfo.id;
    const fromId =
      message.sender._id === userId
        ? message.recipient._id
        : message.sender._id;
    const fromData =
      message.sender._id === userId ? message.recipient : message.sender;
    const dmContacts = get().directMessagesContacts;
    const data = dmContacts.find((contact) => contact._id === fromId);
    const index = dmContacts.findIndex((contact) => contact._id === fromId);
    console.log({ data, index, dmContacts, userId, message, fromData });
    if (index !== -1 && index !== undefined) {
      console.log("in if condition");
      dmContacts.splice(index, 1);
      dmContacts.unshift(data);
    } else {
      console.log("in else condition");
      dmContacts.unshift(fromData);
    }
    set({ directMessagesContacts: dmContacts });
  },
  addChannelInChannelLists: (message) => {
    const channels = get().channels;
    const data = channels.find((channel) => channel._id === message.channelId);
    const index = channels.findIndex(
      (channel) => channel._id === message.channelId
    );
    if (index !== -1 && index !== undefined) {
      channels.splice(index, 1);
      channels.unshift(data);
    }
  },
});
