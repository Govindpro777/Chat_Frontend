import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import apiClient from "@/lib/api-client";
import {
  FETCH_ALL_MESSAGES_ROUTE,
  DELETE_FILE_MESSAGE,
  GET_CHANNEL_MESSAGES,
  HOST,
  MESSAGE_TYPES,
} from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { useSocket } from "@/contexts/SocketContext";
import moment from "moment";
import { useEffect, useMemo, useRef, useState } from "react";
import { IoMdArrowRoundDown } from "react-icons/io";
import { IoCloseSharp } from "react-icons/io5";
import {
  MdFolderZip,
  MdDeleteOutline,
  MdOutlineEmojiEmotions,
} from "react-icons/md";
import { toast } from "sonner";
import { MessagesSkeleton, Spinner } from "@/components/common/loader";
import { dispatchOutboxItem } from "@/lib/outbox";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const getSenderId = (message) => message.sender?._id || message.sender;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MessageContainer = () => {
  const [showImage, setShowImage] = useState(false);
  const [imageURL, setImageURL] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const {
    selectedChatData,
    setSelectedChatMessages,
    selectedChatMessages,
    selectedChatType,
    userInfo,
    setDownloadProgress,
    setIsDownloading,
    typingUsers,
    removeMessage,
    outbox,
    removeFromOutbox,
    chatSearch,
    socketStatus,
    reconnectCount,
  } = useAppStore();
  const [pickerFor, setPickerFor] = useState(null);
  const pressTimer = useRef();
  const messageEndRef = useRef(null);
  const socket = useSocket();

  // Tell the sender their messages were seen while this chat is open and visible
  useEffect(() => {
    if (selectedChatType !== "contact" || !socket) return;
    const markSeen = () => {
      if (document.hidden) return;
      const hasUnseen = selectedChatMessages.some(
        (m) => (m.sender?._id || m.sender) === selectedChatData._id && !m.seen
      );
      if (hasUnseen) {
        socket.emit("mark-seen", { chatUserId: selectedChatData._id });
      }
    };
    markSeen();
    document.addEventListener("visibilitychange", markSeen);
    return () => document.removeEventListener("visibilitychange", markSeen);
  }, [selectedChatMessages, selectedChatData, selectedChatType, socket]);

  // Real messages plus anything still waiting in the offline queue for this chat
  const allMessages = useMemo(() => {
    const pending = outbox
      .filter(
        (item) =>
          item.chatType === selectedChatType &&
          item.chatId === selectedChatData._id
      )
      .map((item) => ({
        _id: item.clientId,
        clientId: item.clientId,
        pending: true,
        status: item.status,
        sender:
          selectedChatType === "channel"
            ? {
                _id: userInfo.id,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
              }
            : userInfo.id,
        content: item.payload.content,
        messageType: item.payload.messageType,
        fileUrl: item.payload.fileUrl,
        timestamp: item.timestamp,
      }));
    return [...selectedChatMessages, ...pending];
  }, [outbox, selectedChatMessages, selectedChatType, selectedChatData._id, userInfo]);

  const lastSentId =
    selectedChatType === "contact"
      ? [...allMessages]
          .reverse()
          .find((m) => !m.pending && getSenderId(m) === userInfo.id)?._id
      : null;

  // ---- in-chat search
  const searchActive = chatSearch.chatId === selectedChatData._id;
  const query = searchActive ? chatSearch.query.trim() : "";
  const matchIds = useMemo(() => {
    if (!query) return [];
    const needle = query.toLowerCase();
    return selectedChatMessages
      .filter(
        (m) =>
          m.messageType === MESSAGE_TYPES.TEXT &&
          m.content?.toLowerCase().includes(needle)
      )
      .map((m) => m._id);
  }, [query, selectedChatMessages]);
  const activeId = query ? matchIds[chatSearch.index] : null;

  useEffect(() => {
    const { chatSearch: current, setChatSearch } = useAppStore.getState();
    if (current.chatId !== selectedChatData._id) return;
    if (current.targetId) {
      // Opened from global search: jump to that exact message once it has loaded
      if (matchIds.includes(current.targetId)) {
        setChatSearch({
          total: matchIds.length,
          index: matchIds.indexOf(current.targetId),
          targetId: null,
        });
      }
    } else {
      setChatSearch({
        total: matchIds.length,
        index: Math.min(current.index, Math.max(0, matchIds.length - 1)),
      });
    }
  }, [matchIds, selectedChatData._id]);

  useEffect(() => {
    if (activeId) {
      document
        .getElementById(`msg-${activeId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeId]);

  // A search belongs to the chat it was opened in
  useEffect(() => {
    const { chatSearch: current, resetChatSearch } = useAppStore.getState();
    if (current.chatId && current.chatId !== selectedChatData._id) {
      resetChatSearch();
    }
  }, [selectedChatData._id]);

  // Close the reaction picker when tapping anywhere else
  useEffect(() => {
    if (!pickerFor) return;
    const close = (event) => {
      if (!event.target.closest?.("[data-reaction-ui]")) setPickerFor(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [pickerFor]);

  useEffect(() => {
    const getMessages = async () => {
      const response = await apiClient.post(
        FETCH_ALL_MESSAGES_ROUTE,
        {
          id: selectedChatData._id,
        },
        { withCredentials: true }
      );

      if (response.data.messages) {
        setSelectedChatMessages(response.data.messages);
      }
    };
    const getChannelMessages = async () => {
      const response = await apiClient.get(
        `${GET_CHANNEL_MESSAGES}/${selectedChatData._id}`,
        { withCredentials: true }
      );
      if (response.data.messages) {
        setSelectedChatMessages(response.data.messages);
      }
    };
    const load = async (fetcher) => {
      setLoadingMessages(true);
      try {
        await fetcher();
      } catch (error) {
        console.log(error);
        toast.error("Could not load messages.");
      } finally {
        setLoadingMessages(false);
      }
    };
    if (selectedChatData._id) {
      if (selectedChatType === "contact") load(getMessages);
      else if (selectedChatType === "channel") load(getChannelMessages);
    }
  }, [selectedChatData, selectedChatType, setSelectedChatMessages, reconnectCount]);

  useEffect(() => {
    if (messageEndRef.current && !query) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages, typingUsers, query]);

  const deleteAttachment = async (message) => {
    setDeletingId(message._id);
    try {
      await apiClient.delete(`${DELETE_FILE_MESSAGE}/${message._id}`, {
        withCredentials: true,
      });
      removeMessage(message._id);
    } catch (error) {
      console.log(error);
      toast.error("Could not delete the attachment.");
    } finally {
      setDeletingId(null);
    }
  };

  const renderDeleteButton = (message) => (
    <button
      type="button"
      title="Delete attachment"
      onClick={() => deleteAttachment(message)}
      disabled={deletingId === message._id}
      className="absolute -top-2 -right-2 z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/80 shadow hover:bg-red-600 hover:text-white transition-colors"
    >
      {deletingId === message._id ? (
        <Spinner className="h-3.5 w-3.5" />
      ) : (
        <MdDeleteOutline className="text-base" />
      )}
    </button>
  );

  const checkIfImage = (filePath) => {
    const imageRegex =
      /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|ico|heic|heif)$/i;
    return imageRegex.test(filePath);
  };

  const downloadFile = async (url) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    const response = await apiClient.get(`${HOST}/${url}`, {
      responseType: "blob",
      onDownloadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percentCompleted = Math.round((loaded * 100) / total);
        setDownloadProgress(percentCompleted);
      },
    });
    const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = urlBlob;
    link.setAttribute("download", url.split("/").pop()); // Optional: Specify a file name for the download
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(urlBlob); // Clean up the URL object
    setIsDownloading(false);
    setDownloadProgress(0);
  };

  const react = (message, emoji) => {
    socket?.emit("react-message", { messageId: message._id, emoji });
    setPickerFor(null);
  };

  const groupReactions = (reactions = []) => {
    const groups = new Map();
    reactions.forEach((r) => {
      const group = groups.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
      group.count += 1;
      if (r.user === userInfo.id) group.mine = true;
      groups.set(r.emoji, group);
    });
    return [...groups.values()];
  };

  // Long-press opens the reaction picker on touch screens
  const pressHandlers = (message) =>
    message.pending
      ? {}
      : {
          onTouchStart: () => {
            pressTimer.current = setTimeout(() => setPickerFor(message._id), 450);
          },
          onTouchEnd: () => clearTimeout(pressTimer.current),
          onTouchMove: () => clearTimeout(pressTimer.current),
          onContextMenu: (event) => {
            if (window.matchMedia("(pointer: coarse)").matches) {
              event.preventDefault();
            }
          },
        };

  const highlight = (text) => {
    if (!query || !text) return text;
    return text
      .split(new RegExp(`(${escapeRegExp(query)})`, "gi"))
      .map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-yellow-400/80 px-0.5 text-black">
            {part}
          </mark>
        ) : (
          part
        )
      );
  };

  const renderReactionControls = (message, isOwn) => (
    <>
      <button
        type="button"
        data-reaction-ui
        title="React"
        onClick={() => setPickerFor(pickerFor === message._id ? null : message._id)}
        className={`absolute top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#2a2b33] text-white/70 shadow hover:text-white sm:group-hover:flex ${
          isOwn ? "-left-9" : "-right-9"
        }`}
      >
        <MdOutlineEmojiEmotions className="text-lg" />
      </button>
      {pickerFor === message._id && (
        <div
          data-reaction-ui
          className={`absolute bottom-full z-30 mb-1 flex gap-1 rounded-full border border-white/10 bg-[#2a2b33] px-2 py-1 shadow-lg ${
            isOwn ? "right-0" : "left-0"
          }`}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => react(message, emoji)}
              className="text-xl leading-none transition-transform hover:scale-125 active:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );

  const renderAttachment = (message) =>
    checkIfImage(message.fileUrl) ? (
      <div
        className="cursor-pointer"
        onClick={() => {
          setShowImage(true);
          setImageURL(message.fileUrl);
        }}
      >
        <img
          src={`${HOST}/${message.fileUrl}`}
          alt=""
          className="max-w-full h-auto rounded-lg"
        />
      </div>
    ) : (
      <div className="flex items-center gap-3">
        <span className="text-white/80 text-2xl bg-black/20 rounded-full p-2.5">
          <MdFolderZip />
        </span>
        <span className="break-all min-w-0 text-xs sm:text-sm">
          {message.fileUrl.split("/").pop()}
        </span>
        <span
          className="bg-black/20 p-2.5 text-xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
          onClick={() => downloadFile(message.fileUrl)}
        >
          <IoMdArrowRoundDown />
        </span>
      </div>
    );

  const renderMeta = (message) => {
    if (message.pending) {
      if (message.status === "failed") {
        return (
          <span className="text-red-400">
            Failed to send ·{" "}
            <button
              type="button"
              className="underline"
              onClick={() => dispatchOutboxItem(socket, message.clientId)}
            >
              Retry
            </button>{" "}
            ·{" "}
            <button
              type="button"
              className="underline"
              onClick={() => removeFromOutbox(message.clientId)}
            >
              Delete
            </button>
          </span>
        );
      }
      return socketStatus !== "connected"
        ? "Waiting for connection..."
        : "Sending...";
    }
    return (
      <>
        {moment(message.timestamp).format("LT")}
        {message._id === lastSentId && message.seen && (
          <span className="ml-1.5 text-[#b47cff]">· Seen</span>
        )}
      </>
    );
  };

  const renderMessage = (message) => {
    const isOwn = getSenderId(message) === userInfo.id;
    const isChannel = selectedChatType === "channel";
    const sender = isChannel ? message.sender : null;
    const senderName = sender
      ? `${sender.firstName || sender.email || ""} ${sender.lastName || ""}`.trim()
      : "";
    const groups = groupReactions(message.reactions);

    return (
      <div
        id={`msg-${message._id}`}
        className={`mt-3 flex items-end gap-2 ${
          isOwn ? "justify-end" : "justify-start"
        }`}
      >
        {isChannel && !isOwn && (
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
            {sender.image && (
              <AvatarImage
                src={`${HOST}/${sender.image}`}
                alt="profile"
                className="rounded-full object-cover"
              />
            )}
            <AvatarFallback
              className={`uppercase text-xs flex ${getColor(
                sender.color
              )} items-center justify-center rounded-full`}
            >
              {senderName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={`flex min-w-0 max-w-[80%] sm:max-w-[65%] lg:max-w-[50%] flex-col ${
            isOwn ? "items-end" : "items-start"
          }`}
        >
          {isChannel && !isOwn && (
            <span className="mb-0.5 max-w-full truncate px-1 text-[11px] sm:text-xs text-white/50">
              {senderName}
            </span>
          )}
          <div
            {...pressHandlers(message)}
            style={{ WebkitTouchCallout: "none" }}
            className={`group relative border inline-block px-3 py-1.5 sm:px-3.5 sm:py-2 text-[13px] sm:text-[15px] leading-snug rounded-2xl shadow-sm break-words text-left max-w-full ${
              isOwn
                ? "bg-gradient-to-br from-[#8417ff] to-[#6a11cb] text-white border-transparent rounded-br-md"
                : "bg-[#2a2b33] text-white/90 border-white/10 rounded-bl-md"
            } ${message.pending ? "opacity-70" : ""} ${
              message._id === activeId ? "ring-2 ring-yellow-400/80" : ""
            }`}
          >
            {!message.pending && renderReactionControls(message, isOwn)}
            {message.messageType === MESSAGE_TYPES.FILE &&
              isOwn &&
              !message.pending &&
              renderDeleteButton(message)}
            {message.messageType === MESSAGE_TYPES.TEXT &&
              highlight(message.content)}
            {message.messageType === MESSAGE_TYPES.FILE &&
              renderAttachment(message)}
          </div>
          {groups.length > 0 && (
            <div
              className={`-mt-1 flex flex-wrap gap-1 px-1 ${
                isOwn ? "justify-end" : "justify-start"
              }`}
            >
              {groups.map((group) => (
                <button
                  key={group.emoji}
                  type="button"
                  onClick={() => react(message, group.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
                    group.mine
                      ? "border-[#8417ff] bg-[#8417ff]/25"
                      : "border-white/10 bg-[#2a2b33]"
                  }`}
                >
                  <span>{group.emoji}</span>
                  {group.count > 1 && (
                    <span className="text-white/70">{group.count}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <span className="mt-0.5 px-1 text-[10px] sm:text-[11px] text-white/40">
            {renderMeta(message)}
          </span>
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    let lastDate = null;
    return allMessages.map((message) => {
      const messageDate = moment(message.timestamp).format("YYYY-MM-DD");
      const showDate = messageDate !== lastDate;
      lastDate = messageDate;

      return (
        <div key={message._id}>
          {showDate && (
            <div className="text-center text-[10px] sm:text-[11px] uppercase tracking-wider text-white/40 my-3 sm:my-4">
              <span className="bg-[#2a2b33]/70 rounded-full px-3 py-1">
                {moment(message.timestamp).format("LL")}
              </span>
            </div>
          )}
          {renderMessage(message)}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden p-3 sm:p-4 sm:px-8 w-full min-w-0">
      {loadingMessages && selectedChatMessages.length === 0 && (
        <MessagesSkeleton />
      )}
      {renderMessages()}
      {selectedChatType === "contact" && typingUsers[selectedChatData._id] && (
        <div className="mt-1 inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-[#2a2b33] px-3 py-2.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      )}
      <div ref={messageEndRef} />
      {showImage && (
        <div className="fixed z-[1000] top-0 left-0 h-[100dvh] w-full flex items-center justify-center backdrop-blur-lg flex-col">
          <div>
            <img
              src={`${HOST}/${imageURL}`}
              className="max-h-[80dvh] max-w-[95vw] object-contain"
              alt=""
            />
          </div>
          <div className="flex gap-5 fixed top-0 mt-5">
            <button
              className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
              onClick={() => downloadFile(imageURL)}
            >
              <IoMdArrowRoundDown />
            </button>
            <button
              className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
              onClick={() => {
                setShowImage(false);
                setImageURL(null);
              }}
            >
              <IoCloseSharp />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;
