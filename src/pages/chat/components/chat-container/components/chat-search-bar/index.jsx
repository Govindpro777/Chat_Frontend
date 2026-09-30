import { IoChevronDown, IoChevronUp, IoClose, IoSearch } from "react-icons/io5";
import { useAppStore } from "@/store";

const ChatSearchBar = () => {
  const { chatSearch, setChatSearch, resetChatSearch, selectedChatData } =
    useAppStore();
  if (!chatSearch.open || chatSearch.chatId !== selectedChatData._id) {
    return null;
  }

  const { query, index, total } = chatSearch;
  const go = (direction) => {
    if (total) setChatSearch({ index: (index + direction + total) % total });
  };

  return (
    <div className="shrink-0 flex items-center gap-2 border-b border-[#2f303b] bg-[#1c1d25] px-3 sm:px-8 py-2">
      <IoSearch className="shrink-0 text-lg text-white/40" />
      <input
        autoFocus
        value={query}
        // A large index is clamped to the latest match, so a new search starts there
        onChange={(e) =>
          setChatSearch({ query: e.target.value, index: 999999, targetId: null })
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") go(e.shiftKey ? -1 : 1);
          if (e.key === "Escape") resetChatSearch();
        }}
        placeholder="Search in this chat"
        className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-white/30 focus:outline-none"
      />
      {query.trim() && (
        <span className="shrink-0 text-xs tabular-nums text-white/50">
          {total ? `${index + 1}/${total}` : "No results"}
        </span>
      )}
      <button
        type="button"
        title="Previous match"
        disabled={!total}
        onClick={() => go(-1)}
        className="shrink-0 rounded-full p-1 text-white/60 hover:bg-white/10 disabled:opacity-30"
      >
        <IoChevronUp className="text-lg" />
      </button>
      <button
        type="button"
        title="Next match"
        disabled={!total}
        onClick={() => go(1)}
        className="shrink-0 rounded-full p-1 text-white/60 hover:bg-white/10 disabled:opacity-30"
      >
        <IoChevronDown className="text-lg" />
      </button>
      <button
        type="button"
        title="Close search"
        onClick={resetChatSearch}
        className="shrink-0 rounded-full p-1 text-white/60 hover:bg-white/10"
      >
        <IoClose className="text-lg" />
      </button>
    </div>
  );
};

export default ChatSearchBar;
