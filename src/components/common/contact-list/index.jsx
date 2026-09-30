import { HOST } from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ContactList = ({ contacts, isChannel = false }) => {
  const {
    selectedChatData,
    setSelectedChatType,
    setSelectedChatData,
    setSelectedChatMessages,
    onlineUsers,
  } = useAppStore();
  const navigate = useNavigate();
  const { chatId } = useParams();

  const handleClick = (contact) => {
    const type = isChannel ? "channel" : "contact";
    setSelectedChatType(type);
    setSelectedChatData(contact);
    if (selectedChatData && selectedChatData._id !== contact._id) {
      setSelectedChatMessages([]);
    }
    navigate(`/chat/${type}/${contact._id}`, { replace: !!chatId });
  };

  return (
    <div className="mt-5">
      {contacts.map((contact) => (
        <div
          key={contact._id}
          className={`pl-5 sm:pl-10 py-2  transition-all duration-300 cursor-pointer ${
            selectedChatData && selectedChatData._id === contact._id
              ? "bg-[#8417ff] hover:bg-[#8417ff]"
              : "hover:bg-[#f1f1f111] "
          }`}
          onClick={() => handleClick(contact)}
        >
          <div className="flex gap-3 sm:gap-5 items-center justify-start text-neutral-300 pr-3">
            {!isChannel && (
              <div className="relative shrink-0">
              <Avatar className="h-10 w-10 shrink-0">
                {contact.image && (
                  <AvatarImage
                    src={`${HOST}/${contact.image}`}
                    alt="profile"
                    className="rounded-full object-cover h-full w-full"
                  />
                )}

                <AvatarFallback
                  className={`uppercase ${
                    selectedChatData && selectedChatData._id === contact._id
                      ? "bg-[#ffffff22] border border-white/50"
                      : getColor(contact.color)
                  } h-10 w-10 flex items-center justify-center rounded-full`}
                >
                  {contact.firstName.split("").shift()}
                </AvatarFallback>
              </Avatar>
              {onlineUsers.includes(contact._id) && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-[#1b1c24]" />
              )}
              </div>
            )}
            {isChannel && (
              <div
                className={` bg-[#ffffff22] h-10 w-10 flex items-center justify-center rounded-full`}
              >
                #
              </div>
            )}
            {isChannel ? (
              <span className="truncate min-w-0">{contact.name}</span>
            ) : (
              <span className="truncate min-w-0 text-sm sm:text-base">{`${contact.firstName} ${contact.lastName}`}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactList;
