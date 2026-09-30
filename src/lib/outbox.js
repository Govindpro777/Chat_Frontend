import { useAppStore } from "@/store";

const ACK_TIMEOUT = 10000;

const newClientId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Sends one queued message. The server treats repeats of the same clientId as
// the same message, so retrying is always safe.
export const dispatchOutboxItem = (socket, clientId) => {
  const { outbox, updateOutbox, removeFromOutbox } = useAppStore.getState();
  const item = outbox.find((i) => i.clientId === clientId);
  if (!item) return;

  updateOutbox(clientId, { status: "sending" });
  if (!socket || !socket.connected) return; // stays queued until we reconnect

  const event =
    item.chatType === "channel" ? "send-channel-message" : "sendMessage";
  socket.timeout(ACK_TIMEOUT).emit(event, item.payload, (err, res) => {
    if (err || !res?.ok) {
      useAppStore.getState().updateOutbox(clientId, { status: "failed" });
    } else {
      removeFromOutbox(clientId);
    }
  });
};

export const queueMessage = (
  socket,
  { chatType, chatId, content, messageType, fileUrl }
) => {
  const { userInfo, addToOutbox } = useAppStore.getState();
  const clientId = newClientId();
  const base = { sender: userInfo.id, content, messageType, fileUrl, clientId };
  addToOutbox({
    clientId,
    chatType,
    chatId,
    status: "sending",
    timestamp: new Date().toISOString(),
    payload:
      chatType === "channel"
        ? { ...base, channelId: chatId }
        : { ...base, recipient: chatId },
  });
  dispatchOutboxItem(socket, clientId);
};

export const flushOutbox = (socket) => {
  useAppStore
    .getState()
    .outbox.forEach((item) => dispatchOutboxItem(socket, item.clientId));
};
