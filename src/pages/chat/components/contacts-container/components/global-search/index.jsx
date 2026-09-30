import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import { IoClose, IoSearch } from "react-icons/io5";
import apiClient from "@/lib/api-client";
import { SEARCH_MESSAGES } from "@/lib/constants";
import { useAppStore } from "@/store";
import { Skeleton } from "@/components/common/loader";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Shows a snippet of the message around the first match, with the match highlighted
const Snippet = ({ text, query }) => {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(0, at - 20);
  const snippet = (start > 0 ? "…" : "") + text.slice(start, start + 80);
  return snippet
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

const GlobalSearch = ({ onActiveChange }) => {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const {
    channels,
    setSelectedChatType,
    setSelectedChatData,
    setSelectedChatMessages,
    setChatSearch,
  } = useAppStore();
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const query = input.trim();
  const active = query.length >= 2;

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // Debounced search; a newer query cancels the older one
  useEffect(() => {
    if (!active) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await apiClient.post(
          SEARCH_MESSAGES,
          { query },
          { withCredentials: true }
        );
        if (!cancelled) setResults(data.results);
      } catch (error) {
        console.log(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, active]);

  const openResult = (result) => {
    const chatData =
      result.type === "channel"
        ? channels.find((c) => c._id === result.chat._id)
        : result.chat;
    if (!chatData) return;
    setSelectedChatMessages([]);
    setSelectedChatType(result.type);
    setSelectedChatData(chatData);
    setChatSearch({
      open: true,
      query,
      index: 0,
      total: 0,
      targetId: result._id,
      chatId: chatData._id,
    });
    navigate(`/chat/${result.type}/${chatData._id}`, { replace: !!chatId });
    setInput("");
  };

  const title = (result) =>
    result.type === "channel"
      ? `#${result.chat.name}`
      : `${result.chat.firstName || result.chat.email} ${
          result.chat.lastName || ""
        }`.trim();

  return (
    <div className="px-4 sm:px-6">
      <div className="flex items-center gap-2 rounded-full border border-white/5 bg-[#2a2b33] px-3 focus-within:border-[#8417ff]/60 transition-colors">
        <IoSearch className="shrink-0 text-white/40" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search messages"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm placeholder:text-white/30 focus:outline-none"
        />
        {input && (
          <button
            type="button"
            title="Clear search"
            onClick={() => setInput("")}
            className="shrink-0 text-white/50 hover:text-white"
          >
            <IoClose />
          </button>
        )}
      </div>

      {active && (
        <div className="mt-3 max-h-[calc(100dvh-14rem)] overflow-y-auto scrollbar-hidden">
          {loading ? (
            <div className="flex flex-col gap-3 py-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">
              No messages found for “{query}”.
            </p>
          ) : (
            results.map((result) => (
              <button
                key={result._id}
                type="button"
                onClick={() => openResult(result)}
                className="block w-full rounded-lg px-2 py-2 text-left hover:bg-white/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-white/90">
                    {title(result)}
                  </span>
                  <span className="shrink-0 text-[11px] text-white/40">
                    {moment(result.timestamp).calendar(null, {
                      sameDay: "LT",
                      lastDay: "[Yesterday]",
                      lastWeek: "dddd",
                      sameElse: "DD/MM/YY",
                    })}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  <Snippet text={result.content} query={query} />
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
