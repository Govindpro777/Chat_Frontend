import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { IoClose } from "react-icons/io5";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MultipleSelector from "@/components/ui/multipleselect";
import apiClient from "@/lib/api-client";
import {
  CHANNEL_DELETE,
  CHANNEL_DETAILS,
  CHANNEL_LEAVE,
  CHANNEL_UPDATE,
  GET_ALL_CONTACTS,
  HOST,
} from "@/lib/constants";
import { getColor } from "@/lib/utils";
import { useAppStore } from "@/store";
import { Skeleton, Spinner } from "@/components/common/loader";

const displayName = (user) =>
  `${user.firstName || user.email} ${user.lastName || ""}`.trim();

const MemberAvatar = ({ user }) => (
  <Avatar className="h-9 w-9 shrink-0">
    {user.image && (
      <AvatarImage
        src={`${HOST}/${user.image}`}
        alt="profile"
        className="object-cover"
      />
    )}
    <AvatarFallback
      className={`uppercase text-sm ${getColor(user.color)} flex items-center justify-center`}
    >
      {displayName(user).charAt(0)}
    </AvatarFallback>
  </Avatar>
);

const ChannelInfo = ({ open, onOpenChange }) => {
  const { selectedChatData, userInfo, updateChannelInList, removeChannel } =
    useAppStore();
  const channelId = selectedChatData._id;
  const isOwner = selectedChatData.admin === userInfo.id;

  const [details, setDetails] = useState(null);
  const [name, setName] = useState(selectedChatData.name);
  const [allContacts, setAllContacts] = useState([]);
  const [newMembers, setNewMembers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`${CHANNEL_DETAILS}/${channelId}`, {
        withCredentials: true,
      });
      setDetails(data.channel);
      setName(data.channel.name);
    } catch (error) {
      console.log(error);
    }
  }, [channelId]);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    setNewMembers([]);
    loadDetails();
    if (isOwner) {
      apiClient
        .get(GET_ALL_CONTACTS, { withCredentials: true })
        .then(({ data }) => setAllContacts(data.contacts))
        .catch((error) => console.log(error));
    }
  }, [open, isOwner, loadDetails, selectedChatData.members?.length]);

  const update = async (body, successMessage) => {
    setBusy(true);
    try {
      const { data } = await apiClient.put(
        `${CHANNEL_UPDATE}/${channelId}`,
        body,
        { withCredentials: true }
      );
      updateChannelInList(data.channel);
      toast.success(successMessage);
      await loadDetails();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveName = () => update({ name }, "Channel renamed.");

  const addMembers = async () => {
    const ok = await update(
      { addMembers: newMembers.map((m) => m.value) },
      "Members added."
    );
    if (ok) setNewMembers([]);
  };

  const removeMember = (member) =>
    update({ removeMembers: [member._id] }, `${displayName(member)} removed.`);

  const leaveOrDelete = async () => {
    if (isOwner && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      if (isOwner) {
        await apiClient.delete(`${CHANNEL_DELETE}/${channelId}`, {
          withCredentials: true,
        });
      } else {
        await apiClient.post(
          `${CHANNEL_LEAVE}/${channelId}`,
          {},
          { withCredentials: true }
        );
      }
      onOpenChange(false);
      removeChannel(channelId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong.");
      setBusy(false);
    }
  };

  const memberIds = new Set((details?.members || []).map((m) => m._id));
  const selectableContacts = allContacts.filter((c) => !memberIds.has(c.value));
  const members = details ? [details.admin, ...details.members] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#181920] border-none text-white w-[92vw] max-w-[440px] max-h-[85dvh] overflow-y-auto flex flex-col gap-4 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Channel info</DialogTitle>
        </DialogHeader>
        <DialogDescription className="hidden">
          View members and manage this channel
        </DialogDescription>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-white/50">
            Name
          </label>
          {isOwner ? (
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-lg bg-[#2c2e3b] border-none px-3"
              />
              <Button
                onClick={saveName}
                disabled={busy || !name.trim() || name.trim() === details?.name}
                className="h-10 gap-2 bg-purple-700 hover:bg-purple-900"
              >
                {busy && <Spinner className="h-4 w-4" />}
                Save
              </Button>
            </div>
          ) : (
            <p className="text-sm sm:text-base">#{selectedChatData.name}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-widest text-white/50">
            Members ({members.length})
          </label>
          <div className="max-h-[30dvh] overflow-y-auto pr-1 scrollbar-hidden">
            {members.map((member, index) => (
              <div
                key={member._id}
                className="flex items-center gap-3 py-2 border-b border-white/5 last:border-none"
              >
                <MemberAvatar user={member} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {displayName(member)}
                    {member._id === userInfo.id && (
                      <span className="text-white/40"> (you)</span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-white/40">
                    {member.email}
                  </p>
                </div>
                {index === 0 ? (
                  <span className="shrink-0 rounded-full bg-[#8417ff]/20 px-2 py-0.5 text-[11px] text-[#b47cff]">
                    Owner
                  </span>
                ) : (
                  isOwner && (
                    <button
                      title="Remove member"
                      disabled={busy}
                      onClick={() => removeMember(member)}
                      className="shrink-0 rounded-full p-1.5 text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      <IoClose className="text-lg" />
                    </button>
                  )
                )}
              </div>
            ))}
            {!details && (
              <div className="flex flex-col gap-3 py-2" aria-hidden>
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-white/50">
              Add members
            </label>
            <MultipleSelector
              className="rounded-lg bg-[#2c2e3b] border-none py-1 text-white"
              options={selectableContacts}
              defaultOptions={selectableContacts}
              placeholder="Search contacts"
              value={newMembers}
              onChange={setNewMembers}
              emptyIndicator={
                <p className="text-center text-sm leading-8 text-gray-500">
                  No contacts to add.
                </p>
              }
            />
            <Button
              onClick={addMembers}
              disabled={busy || !newMembers.length}
              className="w-full h-10 gap-2 bg-purple-700 hover:bg-purple-900"
            >
              {busy && <Spinner className="h-4 w-4" />}
              Add to channel
            </Button>
          </div>
        )}

        <Button
          onClick={leaveOrDelete}
          disabled={busy}
          variant="outline"
          className={`w-full h-10 gap-2 bg-transparent border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 ${
            confirmDelete ? "bg-red-500/10" : ""
          }`}
        >
          {busy && <Spinner className="h-4 w-4" />}
          {isOwner
            ? confirmDelete
              ? "Tap again to delete for everyone"
              : "Delete channel"
            : "Leave channel"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelInfo;
