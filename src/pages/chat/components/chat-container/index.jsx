// import React from "react";

import ChatHeader from "./components/chat-header";
import MessageBar from "./components/message-bar";
import MessageContainer from "./components/message-container";

const ChatContainer = () => {
  return (
    <div className="fixed inset-0 z-20 h-[100dvh] w-full bg-[#1c1d25] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:static md:z-auto md:flex-1 md:min-w-0">
      <ChatHeader />
      <MessageContainer />
      <MessageBar />
    </div>
  );
};

export default ChatContainer;
