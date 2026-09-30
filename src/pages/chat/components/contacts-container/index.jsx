import { Spinner } from "@/components/common/loader";
import ContactList from "@/components/common/contact-list";
import Logo from "@/components/common/logo";
import ProfileInfo from "./components/profile-info";
import apiClient from "@/lib/api-client";
import {
  GET_CONTACTS_WITH_MESSAGES_ROUTE,
  GET_USER_CHANNELS,
} from "@/lib/constants";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import NewDM from "./components/new-dm/new-dm";
import CreateChannel from "./components/create-channel/create-channel";

const ContactsContainer = () => {
  const {
    setDirectMessagesContacts,
    directMessagesContacts,
    channels,
    setChannels,
  } = useAppStore();
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(true);

  useEffect(() => {
    const getContactsWithMessages = async () => {
      try {
        const response = await apiClient.get(GET_CONTACTS_WITH_MESSAGES_ROUTE, {
          withCredentials: true,
        });
        if (response.data.contacts) {
          setDirectMessagesContacts(response.data.contacts);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingContacts(false);
      }
    };
    getContactsWithMessages();
  }, [setDirectMessagesContacts]);

  useEffect(() => {
    const getChannels = async () => {
      try {
        const response = await apiClient.get(GET_USER_CHANNELS, {
          withCredentials: true,
        });
        if (response.data.channels) {
          setChannels(response.data.channels);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingChannels(false);
      }
    };
    getChannels();
  }, [setChannels]);

  return (
    <div className="relative w-full md:w-[35vw] md:shrink-0 lg:w-[30vw] xl:w-[22vw] xl:min-w-[280px] bg-[#1b1c24] border-r-2 border-[#2f303b] pb-16 overflow-hidden">
      <div className=" pt-3">
        <Logo />
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-5 sm:pr-10">
          <Title text="Direct Messages" />
          <NewDM />
        </div>
        <div className="max-h-[calc((100dvh-15rem)/2)] overflow-y-auto scrollbar-hidden">
          {loadingContacts ? (
            <ListLoader />
          ) : directMessagesContacts.length === 0 ? (
            <EmptyHint text="No conversations yet. Tap + to start one." />
          ) : (
            <ContactList contacts={directMessagesContacts} />
          )}
        </div>
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-5 sm:pr-10">
          <Title text="Channels" />
          <CreateChannel />
        </div>
        <div className="max-h-[calc((100dvh-15rem)/2)] overflow-y-auto scrollbar-hidden pb-5">
          {loadingChannels ? (
            <ListLoader />
          ) : channels.length === 0 ? (
            <EmptyHint text="No channels yet. Tap + to create one." />
          ) : (
            <ContactList contacts={channels} isChannel />
          )}
        </div>
      </div>
      <ProfileInfo />
    </div>
  );
};

export default ContactsContainer;

const Title = ({ text }) => {
  return (
    <h6 className="uppercase tracking-widest text-neutral-400 pl-5 sm:pl-10 font-light text-opacity-90 text-sm">
      {text}
    </h6>
  );
};

const ListLoader = () => (
  <div className="flex items-center gap-3 pl-5 sm:pl-10 py-4 text-sm text-white/40">
    <Spinner className="h-4 w-4" />
    Loading...
  </div>
);

const EmptyHint = ({ text }) => (
  <p className="pl-5 pr-4 sm:pl-10 py-3 text-xs text-white/30">{text}</p>
);
