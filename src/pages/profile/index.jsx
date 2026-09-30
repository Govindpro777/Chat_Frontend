import { useAppStore } from "@/store";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/api-client";
import {
  ADD_PROFILE_IMAGE_ROUTE,
  HOST,
  REMOVE_PROFILE_IMAGE_ROUTE,
  UPDATE_PROFLE_ROUTE,
} from "@/lib/constants";
import { useState, useRef, useEffect } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { IoArrowBack } from "react-icons/io5";
import { colors } from "@/lib/utils";
import NotificationSettings from "@/components/common/notification-settings";

const Profile = () => {
  const { userInfo, setUserInfo } = useAppStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [image, setImage] = useState(null);
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [selectedColor, setSelectedColor] = useState(0);

  useEffect(() => {
    if (userInfo.profileSetup) {
      setFirstName(userInfo.firstName);
      setLastName(userInfo.lastName);
      setSelectedColor(userInfo.color);
    }
    if (userInfo.image) {
      setImage(`${HOST}/${userInfo.image}`);
    }
  }, [userInfo]);

  const validateProfile = () => {
    if (!firstName) {
      toast.error("First Name is Required.");
      return false;
    }
    if (!lastName) {
      toast.error("Last Name is Required.");
      return false;
    }
    return true;
  };

  const saveChanges = async () => {
    if (validateProfile()) {
      try {
        const response = await apiClient.post(
          UPDATE_PROFLE_ROUTE,
          {
            firstName,
            lastName,
            color: selectedColor,
          },
          { withCredentials: true }
        );
        if (response.status === 200 && response.data) {
          setUserInfo({ ...response.data });
          toast.success("Profile Updated Successfully.");
          navigate("/chat", { replace: true });
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("profile-image", file);
      const response = await apiClient.post(ADD_PROFILE_IMAGE_ROUTE, formData, {
        withCredentials: true,
      });
      if (response.status === 200 && response.data.image) {
        setUserInfo({ ...userInfo, image: response.data.image });
        toast.success("Image updated successfully.");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = "";
  };

  const handleDeleteImage = async () => {
    try {
      const response = await apiClient.delete(REMOVE_PROFILE_IMAGE_ROUTE, {
        withCredentials: true,
      });
      if (response.status === 200) {
        setUserInfo({ ...userInfo, image: null });
        toast.success("Image Removed Successfully.");
        setImage(undefined);
      }
    } catch (error) {
      console.log({ error });
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current.click();
  };

  const handleNavigate = () => {
    if (userInfo.profileSetup) {
      // Go back in history so the swipe-back gesture doesn't bounce to this page again
      if (window.history.state?.idx > 0) navigate(-1);
      else navigate("/chat", { replace: true });
    } else {
      toast.error("Please setup profile.");
    }
  };

  return (
    <div className="bg-[#1b1c24] min-h-[100dvh] py-4 sm:py-8 px-4 flex items-start sm:items-center justify-center">
      <div className="w-full max-w-2xl flex flex-col gap-5 sm:gap-6">
        <div className="flex items-center gap-3">
          <IoArrowBack
            className="text-2xl sm:text-3xl text-white text-opacity-90 cursor-pointer"
            onClick={handleNavigate}
          />
          <h1 className="text-lg sm:text-xl font-semibold text-white">
            Profile
          </h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 sm:gap-8 items-center justify-items-center sm:justify-items-stretch">
          <div className="flex flex-col items-center gap-4">
          <div
            className="h-24 w-24 sm:h-32 sm:w-32 relative flex items-center justify-center"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 rounded-full overflow-hidden">
              {image ? (
                <AvatarImage
                  src={image}
                  alt="profile"
                  className="object-cover w-full h-full bg-black"
                />
              ) : (
                <div
                  className={`uppercase h-24 w-24 sm:h-32 sm:w-32 text-4xl bg-[#712c4a57] text-[#ff006e] border-[1px] border-[#ff006faa] flex items-center justify-center rounded-full`}
                >
                  {firstName
                    ? firstName.split("").shift()
                    : userInfo.email.split("").shift()}
                </div>
              )}
            </Avatar>
            {hovered && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer"
                onClick={image ? handleDeleteImage : handleFileInputClick}
              >
                {image ? (
                  <FaTrash className="text-white text-3xl cursor-pointer" />
                ) : (
                  <FaPlus className="text-white text-3xl cursor-pointer" />
                )}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageChange}
              accept=".png, .jpg, .jpeg, .svg, .webp"
              name="profile-image"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              className="h-9 px-4 text-sm bg-purple-700 hover:bg-purple-900 transition-all duration-300"
              onClick={handleFileInputClick}
            >
              {image ? "Change photo" : "Upload photo"}
            </Button>
            {image && (
              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 text-sm bg-transparent text-white border-white/20 hover:bg-white/10 hover:text-white"
                onClick={handleDeleteImage}
              >
                Remove
              </Button>
            )}
          </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:gap-4 text-white items-center justify-center">
            <div className="w-full">
              <Input
                placeholder="Email"
                type="email"
                className="rounded-lg h-11 px-4 bg-[#2c2e3b] border-none"
                disabled
                value={userInfo.email}
              />
            </div>
            <div className="w-full">
              <Input
                placeholder="First Name"
                type="text"
                className="rounded-lg h-11 px-4 bg-[#2c2e3b] border-none"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="w-full">
              <Input
                placeholder="Last Name"
                type="text"
                className="rounded-lg h-11 px-4 bg-[#2c2e3b] border-none"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="w-full flex flex-wrap gap-3 sm:gap-4">
              {colors.map((color, index) => (
                <div
                  className={`${color} h-7 w-7 rounded-full cursor-pointer transition-all duration-100 ${
                    selectedColor === index
                      ? " outline outline-white outlin4"
                      : ""
                  }`}
                  key={index}
                  onClick={() => setSelectedColor(index)}
                ></div>
              ))}
            </div>
          </div>
        </div>
        <NotificationSettings />
        <div className="w-full">
          <Button
            className="h-11 sm:h-12 w-full bg-purple-700 hover:bg-purple-900 transition-all duration-300"
            onClick={saveChanges}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
