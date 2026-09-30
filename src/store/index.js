import { create } from "zustand";
import { createAuthSlice } from "./slices/auth-slice";
import { createChatSlice } from "./slices/chat-slice";
import { createNotificationSlice } from "./slices/notification-slice";
import { createUiSlice } from "./slices/ui-slice";
import { createCallSlice } from "./slices/call-slice";

export const useAppStore = create()((...a) => ({
  ...createAuthSlice(...a),
  ...createChatSlice(...a),
  ...createNotificationSlice(...a),
  ...createUiSlice(...a),
  ...createCallSlice(...a),
}));
