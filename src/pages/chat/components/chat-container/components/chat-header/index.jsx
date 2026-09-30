import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RiCloseFill } from "react-icons/ri";
import {
  IoInformationCircleOutline,
  IoSearch,
  IoCallOutline,
  IoVideocamOutline,
  IoNotifications,
  IoNotificationsOff,
} from "react-icons/io5";
import ChannelInfo from "../channel-info";
import { startCall } from "@/lib/call";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store";
import { HOST } from "@/lib/constants";
import { getColor } from "@/lib/utils";

const ChatHeader = () => {
  const {
    selectedChatData,
    selectedChatType,
    onlineUsers,
    typingUsers,
    mutedChats,
    toggleChatMute,
    chatSearch,
    setChatSearch,
    resetChatSearch,
  } = useAppStore();
  const callStatus = useAppStore((s) => s.call.status);
  const searchOpen =
    chatSearch.open && chatSearch.chatId === selectedChatData._id;
  const toggleSearch = () =>
    searchOpen
      ? resetChatSearch()
      : setChatSearch({
          open: true,
          query: "",
          index: 0,
          total: 0,
          targetId: null,
          chatId: selectedChatData._id,
        });
  const isMuted = mutedChats.includes(selectedChatData._id);
  const navigate = useNavigate();
  const [infoOpen, setInfoOpen] = useState(false);
  const closeChat = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/chat", { replace: true });
  };
  const isOnline =
    selectedChatType === "contact" && onlineUsers.includes(selectedChatData._id);
  return (
    <div className="h-12 sm:h-16 md:h-[10vh] md:min-h-16 shrink-0 border-b sm:border-b-2 border-[#2f303b] flex items-center justify-between px-3 sm:px-8 lg:px-20">
      <div className="flex gap-3 sm:gap-5 items-center min-w-0">
        <div className="flex gap-3 items-center justify-center min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 shrink-0 relative flex items-center justify-center">
            {selectedChatType === "contact" ? (
              <Avatar className="w-9 h-9 sm:w-12 sm:h-12 rounded-full overflow-hidden">
                {selectedChatData.image ? (
                  <AvatarImage
                    src={`${HOST}/${selectedChatData.image}`}
                    alt="profile"
                    className="object-cover w-full h-full bg-black rounded-full"
                  />
                ) : (
                  <div
                    className={`uppercase w-9 h-9 sm:w-12 sm:h-12 text-sm sm:text-lg border-[1px] ${getColor(
                      selectedChatData.color
                    )} flex items-center justify-center rounded-full`}
                  >
                    {selectedChatData.firstName
                      ? selectedChatData.firstName.split("").shift()
                      : selectedChatData.email.split("").shift()}
                  </div>
                )}
              </Avatar>
            ) : (
              <div
                className={` bg-[#ffffff22] py-1.5 px-3.5 sm:py-3 sm:px-5 flex items-center justify-center rounded-full`}
              >
                #
              </div>
            )}
          </div>
          <div className="truncate">
            <div className="truncate text-sm sm:text-base">
              {selectedChatType === "channel" && selectedChatData.name}
              {selectedChatType === "contact" &&
              selectedChatData.firstName &&
              selectedChatData.lastName
                ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
                : ""}
            </div>
            {selectedChatType === "channel" && (
              <div className="text-[11px] sm:text-xs text-neutral-500">
                {(selectedChatData.members?.length || 0) + 1} members
              </div>
            )}
            {selectedChatType === "contact" && (
              <div
                className={`text-[11px] sm:text-xs flex items-center gap-1 ${
                  isOnline ? "text-green-400" : "text-neutral-500"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-neutral-500"
                  }`}
                />
                {typingUsers[selectedChatData._id]
                  ? "typing..."
                  : isOnline
                  ? "Active now"
                  : "Offline"}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        {selectedChatType === "contact" && (
          <>
            <button
              title="Voice call"
              disabled={callStatus !== "idle"}
              className="text-neutral-300 hover:text-white focus:outline-none transition-all duration-300 disabled:opacity-40"
              onClick={() => startCall(selectedChatData, "audio")}
            >
              <IoCallOutline className="text-xl sm:text-2xl" />
            </button>
            <button
              title="Video call"
              disabled={callStatus !== "idle"}
              className="text-neutral-300 hover:text-white focus:outline-none transition-all duration-300 disabled:opacity-40"
              onClick={() => startCall(selectedChatData, "video")}
            >
              <IoVideocamOutline className="text-xl sm:text-2xl" />
            </button>
          </>
        )}
        <button
          title="Search in chat"
          className={`focus:outline-none transition-all duration-300 ${
            searchOpen ? "text-[#b47cff]" : "text-neutral-300 hover:text-white"
          }`}
          onClick={toggleSearch}
        >
          <IoSearch className="text-xl sm:text-2xl" />
        </button>
        {selectedChatType === "channel" && (
          <button
            title="Channel info"
            className="text-neutral-300 hover:text-white focus:outline-none transition-all duration-300"
            onClick={() => setInfoOpen(true)}
          >
            <IoInformationCircleOutline className="text-xl sm:text-2xl" />
          </button>
        )}
        <button
          title={isMuted ? "Unmute notifications" : "Mute notifications"}
          className={`focus:outline-none transition-all duration-300 ${
            isMuted ? "text-neutral-500" : "text-neutral-300 hover:text-white"
          }`}
          onClick={() => toggleChatMute(selectedChatData._id)}
        >
          {isMuted ? (
            <IoNotificationsOff className="text-xl sm:text-2xl" />
          ) : (
            <IoNotifications className="text-xl sm:text-2xl" />
          )}
        </button>
        <button
          className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
          onClick={closeChat}
        >
          <RiCloseFill className="text-2xl sm:text-3xl" />
        </button>
      </div>
      {selectedChatType === "channel" && (
        <ChannelInfo open={infoOpen} onOpenChange={setInfoOpen} />
      )}
    </div>
  );
};

export default ChatHeader;
