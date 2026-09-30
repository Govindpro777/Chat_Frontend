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
import { useEffect, useRef, useState } from "react";
import { IoMdArrowRoundDown } from "react-icons/io";
import { IoCloseSharp } from "react-icons/io5";
import { MdFolderZip, MdDeleteOutline } from "react-icons/md";
import { toast } from "sonner";
import { Spinner } from "@/components/common/loader";

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
  } = useAppStore();
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

  const lastSentIndex = selectedChatMessages.findLastIndex(
    (m) => (m.sender?._id || m.sender) === userInfo.id
  );

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
  }, [selectedChatData, selectedChatType, setSelectedChatMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChatMessages, typingUsers]);

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

  const renderMessages = () => {
    let lastDate = null;
    return selectedChatMessages.map((message, index) => {
      const messageDate = moment(message.timestamp).format("YYYY-MM-DD");
      const showDate = messageDate !== lastDate;
      lastDate = messageDate;

      return (
        <div key={index} className="">
          {showDate && (
            <div className="text-center text-[10px] sm:text-[11px] uppercase tracking-wider text-white/40 my-3 sm:my-4"><span className="bg-[#2a2b33]/70 rounded-full px-3 py-1">
              {moment(message.timestamp).format("LL")}
            </span></div>
          )}
          {selectedChatType === "contact" && renderPersonalMessages(message, index === lastSentIndex)}
          {selectedChatType === "channel" && renderChannelMessages(message)}
        </div>
      );
    });
  };

  const renderPersonalMessages = (message, isLastSent) => {
    return (
      <div
        className={`message  ${
          message.sender === selectedChatData._id ? "text-left" : "text-right"
        }`}
      >
        {message.messageType === MESSAGE_TYPES.TEXT && (
          <div
            className={`${
              message.sender !== selectedChatData._id
                ? "bg-gradient-to-br from-[#8417ff] to-[#6a11cb] text-white border-transparent rounded-br-md"
                : "bg-[#2a2b33] text-white/90 border-white/10 rounded-bl-md"
            } border inline-block px-3 py-1.5 sm:px-3.5 sm:py-2 text-[13px] sm:text-[15px] leading-snug rounded-2xl my-0.5 shadow-sm max-w-[80%] sm:max-w-[65%] lg:max-w-[50%] break-words text-left`}
          >
            {message.content}
          </div>
        )}
        {message.messageType === MESSAGE_TYPES.FILE && (
          <div
            className={`relative ${
              message.sender !== selectedChatData._id
                ? "bg-gradient-to-br from-[#8417ff] to-[#6a11cb] text-white border-transparent rounded-br-md"
                : "bg-[#2a2b33] text-white/90 border-white/10 rounded-bl-md"
            } border inline-block px-3 py-1.5 sm:px-3.5 sm:py-2 text-[13px] sm:text-[15px] leading-snug rounded-2xl my-0.5 shadow-sm max-w-[80%] sm:max-w-[65%] lg:max-w-[50%] break-words text-left`}
          >
            {message.sender === userInfo.id && renderDeleteButton(message)}
            {checkIfImage(message.fileUrl) ? (
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
                  height={300}
                  width={300}
                  className="max-w-full h-auto"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-5">
                <span className="text-white/80 text-3xl bg-black/20 rounded-full p-3">
                  <MdFolderZip />
                </span>
                <span className="break-all min-w-0">{message.fileUrl.split("/").pop()}</span>
                <span
                  className="bg-black/20 p-3 text-2xl rounded-full hover:bg-black/50 cursor-pointer transition-all duration-300"
                  onClick={() => downloadFile(message.fileUrl)}
                >
                  <IoMdArrowRoundDown />
                </span>
              </div>
            )}
          </div>
        )}

        <div className="text-[10px] sm:text-[11px] text-white/40 mt-0.5 px-1">
          {moment(message.timestamp).format("LT")}
          {isLastSent && message.seen && (
            <span className="ml-1.5 text-[#b47cff]">· Seen</span>
          )}
        </div>
      </div>
    );
  };

  const renderChannelMessages = (message) => {
    const isOwn = message.sender._id === userInfo.id;
    const senderName =
      `${message.sender.firstName || message.sender.email} ${
        message.sender.lastName || ""
      }`.trim();

    return (
      <div
        className={`mt-3 flex items-end gap-2 ${
          isOwn ? "justify-end" : "justify-start"
        }`}
      >
        {!isOwn && (
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 shrink-0">
            {message.sender.image && (
              <AvatarImage
                src={`${HOST}/${message.sender.image}`}
                alt="profile"
                className="rounded-full object-cover"
              />
            )}
            <AvatarFallback
              className={`uppercase text-xs flex ${getColor(
                message.sender.color
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
          {!isOwn && (
            <span className="mb-0.5 max-w-full truncate px-1 text-[11px] sm:text-xs text-white/50">
              {senderName}
            </span>
          )}
          <div
            className={`relative border inline-block px-3 py-1.5 sm:px-3.5 sm:py-2 text-[13px] sm:text-[15px] leading-snug rounded-2xl shadow-sm break-words text-left max-w-full ${
              isOwn
                ? "bg-gradient-to-br from-[#8417ff] to-[#6a11cb] text-white border-transparent rounded-br-md"
                : "bg-[#2a2b33] text-white/90 border-white/10 rounded-bl-md"
            }`}
          >
            {message.messageType === MESSAGE_TYPES.TEXT && message.content}
            {message.messageType === MESSAGE_TYPES.FILE && (
              <>
                {isOwn && renderDeleteButton(message)}
                {checkIfImage(message.fileUrl) ? (
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
                )}
              </>
            )}
          </div>
          <span className="mt-0.5 px-1 text-[10px] sm:text-[11px] text-white/40">
            {moment(message.timestamp).format("LT")}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden p-3 sm:p-4 sm:px-8 w-full min-w-0">
      {loadingMessages && selectedChatMessages.length === 0 && (
        <div className="flex h-full min-h-32 items-center justify-center gap-3 text-sm text-white/40">
          <Spinner className="h-5 w-5" />
          Loading messages...
        </div>
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
