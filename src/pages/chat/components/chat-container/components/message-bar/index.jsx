import { IoSend } from "react-icons/io5";
import { GrAttachment } from "react-icons/gr";
import { RiEmojiStickerLine } from "react-icons/ri";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { useSocket } from "@/contexts/SocketContext";
import { MESSAGE_TYPES, UPLOAD_FILE } from "@/lib/constants";
import apiClient from "@/lib/api-client";

const MessageBar = () => {
  const emojiRef = useRef();
  const fileInputRef = useRef();
  const {
    selectedChatData,
    userInfo,
    selectedChatType,
    setIsUploading,
    setFileUploadProgress,
  } = useAppStore();
  const [message, setMessage] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiRef]);

  const handleAddEmoji = (emoji) => {
    setMessage((msg) => msg + emoji.emoji);
  };

  const typingTimeout = useRef();
  const isTypingRef = useRef(false);

  const emitTyping = (isTyping) => {
    if (selectedChatType !== "contact" || !socket) return;
    if (isTypingRef.current === isTyping) return;
    isTypingRef.current = isTyping;
    socket.emit("typing", { to: selectedChatData._id, isTyping });
  };

  // Stop the typing indicator when leaving the chat
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeout.current);
      emitTyping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatData?._id, socket]);

  const handleMessageChange = (event) => {
    const value = event.target.value;
    setMessage(value);
    clearTimeout(typingTimeout.current);
    if (value.trim()) {
      emitTyping(true);
      typingTimeout.current = setTimeout(() => emitTyping(false), 2000);
    } else {
      emitTyping(false);
    }
  };

  const handleSendMessage = async () => {
    clearTimeout(typingTimeout.current);
    emitTyping(false);
    if (selectedChatType === "contact") {
      socket.emit("sendMessage", {
        sender: userInfo.id,
        content: message,
        recipient: selectedChatData._id,
        messageType: MESSAGE_TYPES.TEXT,
        audioUrl: undefined,
        fileUrl: undefined,
      });
    } else if (selectedChatType === "channel") {
      socket.emit("send-channel-message", {
        sender: userInfo.id,
        content: message,
        messageType: MESSAGE_TYPES.TEXT,
        audioUrl: undefined,
        fileUrl: undefined,
        channelId: selectedChatData._id,
      });
    }
    setMessage("");
  };

  const handleAttachmentChange = async (event) => {
    try {
      const file = event.target.files[0];

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        setIsUploading(true);
        const response = await apiClient.post(UPLOAD_FILE, formData, {
          withCredentials: true,
          onUploadProgress: (data) => {
            setFileUploadProgress(Math.round((100 * data.loaded) / data.total));
          },
        });

        if (response.status === 200 && response.data) {
          setIsUploading(false);
          if (selectedChatType === "contact") {
            socket.emit("sendMessage", {
              sender: userInfo.id,
              content: undefined,
              recipient: selectedChatData._id,
              messageType: MESSAGE_TYPES.FILE,
              audioUrl: undefined,
              fileUrl: response.data.filePath,
            });
          } else if (selectedChatType === "channel") {
            socket.emit("send-channel-message", {
              sender: userInfo.id,
              content: undefined,
              messageType: MESSAGE_TYPES.FILE,
              audioUrl: undefined,
              fileUrl: response.data.filePath,
              channelId: selectedChatData._id,
            });
          }
        }
      }
    } catch (error) {
      setIsUploading(false);
      console.log({ error });
    }
  };

  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="shrink-0 bg-[#1c1d25] flex justify-center items-center px-3 sm:px-8 gap-2 sm:gap-3 py-2 mb-1 sm:mb-3">
      <div className="flex-1 min-w-0 flex bg-[#2a2b33] border border-white/5 rounded-full items-center gap-2 sm:gap-3 pr-3 sm:pr-4 focus-within:border-[#8417ff]/60 transition-colors">
        <input
          type="text"
          className="flex-1 min-w-0 px-3.5 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-[15px] bg-transparent rounded-full focus:border-none focus:outline-none placeholder:text-white/30"
          placeholder="Enter message"
          value={message}
          onChange={handleMessageChange}
        />
        <button
          className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
          onClick={handleAttachmentClick} // Trigger the file input click
        >
          <GrAttachment className="text-lg sm:text-xl" />
        </button>
        <input
          type="file"
          className="hidden" // Hide the file input element
          ref={fileInputRef}
          onChange={handleAttachmentChange} // Handle file selection
        />
        <div className="relative">
          <button
            className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
            onClick={() => setEmojiPickerOpen(true)}
          >
            <RiEmojiStickerLine className="text-lg sm:text-xl" />
          </button>
          <div className="fixed left-3 right-3 bottom-20 sm:absolute sm:left-auto sm:right-0 sm:bottom-16 sm:w-[350px]" ref={emojiRef}>
            <EmojiPicker
              theme="dark"
              open={emojiPickerOpen}
              onEmojiClick={handleAddEmoji}
              autoFocusSearch={false}
              width="100%"
            />
          </div>
        </div>
      </div>
      <button
        className="bg-[#8417ff] rounded-full h-9 w-9 sm:h-11 sm:w-11 flex items-center justify-center shrink-0 focus:border-none focus:outline-none hover:bg-[#741bda] focus:bg-[#741bda] transition-all duration-300 "
        onClick={handleSendMessage}
      >
        <IoSend className="text-base sm:text-xl" />
      </button>
    </div>
  );
};

export default MessageBar;
