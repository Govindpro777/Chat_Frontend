import { HOST, MESSAGE_TYPES, SOCKET_HOST } from "@/lib/constants";
import { playNotificationSound, showNotification } from "@/lib/notifications";
import { useAppStore } from "@/store";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

// Notify for a message unless it is muted or the user is already looking at that chat
const notifyIncoming = ({ chatId, type, senderId, title, body, image }) => {
  const state = useAppStore.getState();
  if (senderId === state.userInfo?.id) return;
  if (!state.notificationsEnabled || state.mutedChats.includes(chatId)) return;

  const viewingChat =
    state.selectedChatData?._id === chatId && !document.hidden;
  if (viewingChat) return;

  if (state.notificationSound) playNotificationSound();
  showNotification({
    title,
    body: state.notificationPreview ? body : "New message",
    tag: chatId,
    url: `/chat/${type}/${chatId}`,
    icon: image ? `${HOST}/${image}` : undefined,
  });
};

const messageBody = (message) =>
  message.messageType === MESSAGE_TYPES.FILE ? "Sent a file" : message.content;

export const SocketProvider = ({ children }) => {
  const socket = useRef();
  const { userInfo } = useAppStore();

  useEffect(() => {
    if (userInfo) {
      socket.current = io(SOCKET_HOST, {
        withCredentials: true,
        query: { userId: userInfo.id },
      });
      socket.current.on("connect", () => {
        console.log("Connected to socket server");
      });

      const handleReceiveMessage = (message) => {
        // Access the latest state values
        const {
          selectedChatData: currentChatData,
          selectedChatType: currentChatType,
          addMessage,
          addContactInDMContacts,
        } = useAppStore.getState();

        if (
          currentChatType !== undefined &&
          (currentChatData._id === message.sender._id ||
            currentChatData._id === message.recipient._id)
        ) {
          addMessage(message);
        }
        addContactInDMContacts(message);

        const sender = message.sender;
        notifyIncoming({
          chatId: sender._id,
          type: "contact",
          senderId: sender._id,
          title: `${sender.firstName || sender.email} ${sender.lastName || ""}`.trim(),
          body: messageBody(message),
          image: sender.image,
        });
      };

      const handleReceiveChannelMessage = (message) => {
        const {
          selectedChatData,
          selectedChatType,
          addMessage,
          addChannelInChannelLists,
        } = useAppStore.getState();

        if (
          selectedChatType !== undefined &&
          selectedChatData._id === message.channelId
        ) {
          addMessage(message);
        }
        addChannelInChannelLists(message);

        const channel = useAppStore
          .getState()
          .channels.find((c) => c._id === message.channelId);
        const sender = message.sender;
        notifyIncoming({
          chatId: message.channelId,
          type: "channel",
          senderId: sender._id,
          title: channel?.name ? `#${channel.name}` : "New channel message",
          body: `${sender.firstName || sender.email}: ${messageBody(message)}`,
          image: sender.image,
        });
      };

      const addNewChannel = (channel) => {
        const { addChannel } = useAppStore.getState();
        addChannel(channel);
      };

      const handleOnlineUsers = (userIds) => {
        useAppStore.getState().setOnlineUsers(userIds);
      };

      const handleMessagesSeen = ({ by, seenAt }) => {
        const { selectedChatData, selectedChatType, markMessagesSeen } =
          useAppStore.getState();
        if (selectedChatType === "contact" && selectedChatData?._id === by) {
          markMessagesSeen(by, seenAt);
        }
      };

      // Typing state expires on its own in case the "stopped typing" event is lost
      const typingTimers = {};
      const handleTyping = ({ from, isTyping }) => {
        const { setTyping } = useAppStore.getState();
        clearTimeout(typingTimers[from]);
        setTyping(from, isTyping);
        if (isTyping) {
          typingTimers[from] = setTimeout(() => setTyping(from, false), 5000);
        }
      };

      const handleMessageDeleted = ({ messageId }) => {
        useAppStore.getState().removeMessage(messageId);
      };

      socket.current.on("message-deleted", handleMessageDeleted);
      socket.current.on("typing", handleTyping);
      socket.current.on("online-users", handleOnlineUsers);
      socket.current.on("messages-seen", handleMessagesSeen);
      socket.current.on("receiveMessage", handleReceiveMessage);
      socket.current.on("recieve-channel-message", handleReceiveChannelMessage);
      socket.current.on("new-channel-added", addNewChannel);

      return () => {
        Object.values(typingTimers).forEach(clearTimeout);
        socket.current.disconnect();
      };
    }
  }, [userInfo]);

  return (
    <SocketContext.Provider value={socket.current}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
