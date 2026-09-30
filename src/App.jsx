import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerServiceWorker } from "@/lib/notifications";
import { removePushSubscription, syncPushSubscription } from "@/lib/push";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Profile from "@/pages/profile";
import Chat from "@/pages/chat";
import Auth from "@/pages/auth";
import apiClient from "@/lib/api-client";
import { GET_USERINFO_ROUTE } from "@/lib/constants";
import { useAppStore } from "@/store";

const PrivateRoute = ({ children }) => {
  const { userInfo } = useAppStore();
  const isAuthenticated = !!userInfo;
  return isAuthenticated ? children : <Navigate to="/auth" />;
};

const AuthRoute = ({ children }) => {
  const { userInfo } = useAppStore();
  const isAuthenticated = !!userInfo;
  return isAuthenticated ? <Navigate to="/chat" /> : children;
};

// Registers the service worker and opens the right chat when a notification is clicked
const NotificationBridge = () => {
  const navigate = useNavigate();
  const userId = useAppStore((s) => s.userInfo?.id);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const notificationPreview = useAppStore((s) => s.notificationPreview);
  const mutedChats = useAppStore((s) => s.mutedChats);

  // Keep the server's copy of this device's notification settings up to date
  useEffect(() => {
    if (!userId) return;
    if (notificationsEnabled) {
      syncPushSubscription({
        enabled: true,
        preview: notificationPreview,
        mutedChats,
      });
    } else {
      removePushSubscription();
    }
  }, [userId, notificationsEnabled, notificationPreview, mutedChats]);

  useEffect(() => {
    registerServiceWorker();
    const onMessage = (event) => {
      if (event.data?.type === "open-chat") navigate(event.data.url);
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [navigate]);
  return null;
};

function App() {
  const { userInfo, setUserInfo } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const response = await apiClient.get(GET_USERINFO_ROUTE, {
          withCredentials: true,
        });
        if (response.status === 200 && response.data.id) {
          setUserInfo(response.data);
        } else {
          setUserInfo(undefined);
        }
      } catch (error) {
        setUserInfo(undefined);
      } finally {
        setLoading(false);
      }
    };

    if (!userInfo) {
      getUserData();
    } else {
      setLoading(false);
    }
  }, [userInfo, setUserInfo]);

  if (loading) {
    return <div>Loading...</div>; // Show a loading indicator while fetching user data
  }

  return (
    <Router>
      <NotificationBridge />
      <Routes>
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <Auth />
            </AuthRoute>
          }
        />
        <Route
          path="/chat/:chatType?/:chatId?"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/auth" />} />
      </Routes>
    </Router>
  );
}

export default App;
