import { Spinner } from "@/components/common/loader";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FaPlus } from "react-icons/fa";
import MultipleSelector from "@/components/ui/multipleselect";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { CREATE_CHANNEL, GET_ALL_CONTACTS } from "@/lib/constants";
import { useSocket } from "@/contexts/SocketContext";
import { useAppStore } from "@/store";
import { Input } from "@/components/ui/input";

const CreateChannel = () => {
  const [newChannelModal, setNewChannelModal] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [creating, setCreating] = useState(false);
  const socket = useSocket();
  const { addChannel } = useAppStore();

  useEffect(() => {
    const getData = async () => {
      const response = await apiClient.get(GET_ALL_CONTACTS, {
        withCredentials: true,
      });
      setAllContacts(response.data.contacts);
    };
    getData();
  }, []);

  const createChannel = async () => {
    if (!channelName.trim()) return;
    setCreating(true);
    try {
      const response = await apiClient.post(
        CREATE_CHANNEL,
        {
          name: channelName.trim(),
          members: selectedContacts.map((contact) => contact.value),
        },
        { withCredentials: true }
      );
      if (response.status === 201) {
        setChannelName("");
        setSelectedContacts([]);
        setNewChannelModal(false);
        addChannel(response.data.channel);
        socket.emit("add-channel-notify", response.data.channel);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not create the channel."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <FaPlus
              className=" text-neutral-400 font-light text-opacity-90 text-sm hover:text-neutral-100 cursor-pointer transition-all duration-300"
              onClick={() => setNewChannelModal(true)}
            />
          </TooltipTrigger>
          <TooltipContent className="bg-[#1c1b1e] border-none mb-2 p-3">
            Create New Channel
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={newChannelModal} onOpenChange={setNewChannelModal}>
        <DialogDescription className="hidden">
          Please insert details
        </DialogDescription>
        <DialogContent className="bg-[#181920] border-none text-white w-[92vw] max-w-[400px] h-max max-h-[85dvh] overflow-y-auto flex flex-col gap-3 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Create a new Channel</DialogTitle>
          </DialogHeader>
          <div>
            <Input
              placeholder="Channel Name"
              className="rounded-lg h-11 px-4 bg-[#2c2e3b] border-none"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
            />
          </div>
          <div>
            <MultipleSelector
              className="rounded-lg bg-[#2c2e3b] border-none py-2 text-white"
              defaultOptions={allContacts}
              placeholder="Search Contacts"
              value={selectedContacts}
              onChange={setSelectedContacts}
              emptyIndicator={
                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                  No results found.
                </p>
              }
            />
          </div>
          <div>
            <Button
              onClick={createChannel}
              disabled={creating || !channelName.trim()}
              className=" w-full gap-2 bg-purple-700 hover:bg-purple-900 transition-all duration-300"
            >
              {creating && <Spinner className="h-4 w-4" />}
              {creating ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateChannel;
