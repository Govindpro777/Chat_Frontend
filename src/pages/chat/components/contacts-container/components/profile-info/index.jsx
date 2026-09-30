import { useState } from "react";
import { useAppStore } from "@/store";
import apiClient from "@/lib/api-client";
import { removePushSubscription } from "@/lib/push";
import { Spinner } from "@/components/common/loader";
import { HOST, LOGOUT_ROUTE } from "@/lib/constants";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { FiEdit2 } from "react-icons/fi";
import { IoPowerSharp } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { getColor } from "@/lib/utils";

const ProfileInfo = () => {
  const { userInfo, setUserInfo } = useAppStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // Must run while the token is still valid
      await removePushSubscription();
      const response = await apiClient.post(
        LOGOUT_ROUTE,
        {},
        { withCredentials: true }
      );
      if (response.status === 200) {
        localStorage.removeItem("access-token");
        navigate("/auth", { replace: true });
        setUserInfo(undefined);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="absolute bottom-0 h-16 flex items-center justify-between px-4 sm:px-10 w-full bg-[#2a2b33]">
      <div className="flex gap-3 items-center min-w-0">
        <div className="w-12 h-12 relative shrink-0">
          <Avatar className="w-12 h-12 rounded-full overflow-hidden">
            {userInfo.image ? (
              <AvatarImage
                src={`${HOST}/${userInfo.image}`}
                alt="profile"
                className="object-cover w-full h-full bg-black rounded-full"
              />
            ) : (
              <div
                className={`uppercase w-12 h-12 text-lg   border-[1px] ${getColor(
                  userInfo.color
                )} flex items-center justify-center rounded-full`}
              >
                {userInfo.firstName
                  ? userInfo.firstName.split("").shift()
                  : userInfo.email.split("").shift()}
              </div>
            )}
          </Avatar>
        </div>
        <div className="truncate">
          {userInfo.firstName && userInfo.lastName
            ? `${userInfo.firstName} ${userInfo.lastName}`
            : ""}
        </div>
      </div>
      <div className="flex gap-5 shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <FiEdit2
                className="text-purple-500 text-xl font-medium"
                onClick={() => navigate("/profile")}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-[#1c1b1e] border-none mb-2 p-3">
              <p className="text-white">Edit Profile</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              {loggingOut ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <IoPowerSharp
                  className="text-red-500 text-xl font-medium"
                  onClick={logout}
                />
              )}
            </TooltipTrigger>
            <TooltipContent className="bg-[#1c1b1e] border-none mb-2 p-3">
              <p className="text-white">Logout</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default ProfileInfo;
