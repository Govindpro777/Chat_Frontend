const STORAGE_KEY = "notification-settings";

const defaults = {
  notificationsEnabled: true,
  notificationSound: true,
  notificationPreview: true,
  mutedChats: [],
};

const load = () => {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return defaults;
  }
};

const save = (state) => {
  try {
    const { notificationsEnabled, notificationSound, notificationPreview, mutedChats } =
      state;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        notificationsEnabled,
        notificationSound,
        notificationPreview,
        mutedChats,
      })
    );
  } catch {
    // storage unavailable, settings just won't persist
  }
};

export const createNotificationSlice = (set, get) => ({
  ...load(),
  updateNotificationSettings: (patch) => {
    set(patch);
    save(get());
  },
  toggleChatMute: (chatId) => {
    const { mutedChats } = get();
    set({
      mutedChats: mutedChats.includes(chatId)
        ? mutedChats.filter((id) => id !== chatId)
        : [...mutedChats, chatId],
    });
    save(get());
  },
  unmuteAllChats: () => {
    set({ mutedChats: [] });
    save(get());
  },
});
