import { useNavigate } from "react-router-dom";
import { RiCloseFill } from "react-icons/ri";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store";
import { HOST } from "@/lib/constants";
import { getColor } from "@/lib/utils";

const ChatHeader = () => {
  const { selectedChatData, selectedChatType, onlineUsers } = useAppStore();
  const navigate = useNavigate();
  const closeChat = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/chat", { replace: true });
  };
  const isOnline =
    selectedChatType === "contact" && onlineUsers.includes(selectedChatData._id);
  return (
    <div className="h-16 md:h-[10vh] md:min-h-16 shrink-0 border-b-2 border-[#2f303b] flex items-center justify-between px-4 sm:px-8 lg:px-20">
      <div className="flex gap-5 items-center min-w-0">
        <div className="flex gap-3 items-center justify-center min-w-0">
          <div className="w-12 h-12 shrink-0 relative flex items-center justify-center">
            {selectedChatType === "contact" ? (
              <Avatar className="w-12 h-12 rounded-full overflow-hidden">
                {selectedChatData.image ? (
                  <AvatarImage
                    src={`${HOST}/${selectedChatData.image}`}
                    alt="profile"
                    className="object-cover w-full h-full bg-black rounded-full"
                  />
                ) : (
                  <div
                    className={`uppercase w-12 h-12 text-lg   border-[1px] ${getColor(
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
                className={` bg-[#ffffff22] py-3 px-5 flex items-center justify-center rounded-full`}
              >
                #
              </div>
            )}
          </div>
          <div className="truncate">
            <div className="truncate">
              {selectedChatType === "channel" && selectedChatData.name}
              {selectedChatType === "contact" &&
              selectedChatData.firstName &&
              selectedChatData.lastName
                ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
                : ""}
            </div>
            {selectedChatType === "contact" && (
              <div
                className={`text-xs flex items-center gap-1 ${
                  isOnline ? "text-green-400" : "text-neutral-500"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-neutral-500"
                  }`}
                />
                {isOnline ? "Active now" : "Offline"}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-5">
        <button
          className="text-neutral-300 focus:border-none focus:outline-none focus:text-white transition-all duration-300"
          onClick={closeChat}
        >
          <RiCloseFill className="text-3xl" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
