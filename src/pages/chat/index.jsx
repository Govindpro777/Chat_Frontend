// import React from "react";

import { useEffect } from "react";
import ChatContainer from "./components/chat-container";
import ContactsContainer from "./components/contacts-container";
import { useAppStore } from "@/store";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import EmptyChatContainer from "./components/empty-chat-container";

const Chat = () => {
  const {
    userInfo,
    selectedChatType,
    isUploading,
    fileUploadProgress,
    isDownloading,
    downloadProgress,
    selectedChatData,
    directMessagesContacts,
    channels,
    setSelectedChatType,
    setSelectedChatData,
    setSelectedChatMessages,
    closeChat,
  } = useAppStore();
  const navigate = useNavigate();
  const { chatType, chatId } = useParams();

  // Keep the open chat in sync with the URL so browser/mobile back works
  useEffect(() => {
    if (!chatType || !chatId) {
      if (selectedChatType !== undefined) closeChat();
      return;
    }
    if (chatType !== "contact" && chatType !== "channel") {
      navigate("/chat", { replace: true });
      return;
    }
    if (selectedChatData?._id === chatId && selectedChatType === chatType) {
      return;
    }
    const list = chatType === "channel" ? channels : directMessagesContacts;
    const found = list.find((item) => item._id === chatId);
    if (found) {
      setSelectedChatMessages([]);
      setSelectedChatType(chatType);
      setSelectedChatData(found);
    }
  }, [
    chatType,
    chatId,
    selectedChatData,
    selectedChatType,
    directMessagesContacts,
    channels,
  ]);
  useEffect(() => {
    if (!userInfo.profileSetup) {
      toast("Please setup profile to continue.");
      navigate("/profile");
    }
  }, [userInfo, navigate]);

  return (
    <div className="flex h-[100dvh] w-full text-white overflow-hidden">
      {isUploading && (
        <div className="h-[100dvh] w-full fixed top-0 z-10 left-0 bg-black/80 flex items-center justify-center flex-col gap-5">
          <h5 className="text-3xl sm:text-5xl animate-pulse">Uploading File</h5>
          {fileUploadProgress}%
        </div>
      )}
      {isDownloading && (
        <div className="h-[100dvh] w-full fixed top-0 z-10 left-0 bg-black/80 flex items-center justify-center flex-col gap-5">
          <h5 className="text-3xl sm:text-5xl animate-pulse">Downloading File</h5>
          {downloadProgress}%
        </div>
      )}
      <ContactsContainer />
      {selectedChatType === undefined ? (
        <EmptyChatContainer />
      ) : (
        <ChatContainer />
      )}
    </div>
  );
};

export default Chat;
