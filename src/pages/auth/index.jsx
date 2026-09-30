import { Spinner } from "@/components/common/loader";
import Background from "../../assets/login2.png";
import Victory from "../../assets/victory.svg";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";
import { LOGIN_ROUTE, SIGNUP_ROUTE } from "@/lib/constants";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";

const Auth = () => {
  const navigate = useNavigate();
  const { setUserInfo } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const validateLogin = () => {
    if (!email.length) {
      toast.error("Email is required.");
      return false;
    }
    if (!password.length) {
      toast.error("Password is required.");
      return false;
    }
    return true;
  };
  const validateSignup = () => {
    if (!email.length) {
      toast.error("Email is required.");
      return false;
    }
    if (!password.length) {
      toast.error("Password is required.");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Password and Confirm Password should be same.");
      return false;
    }
    return true;
  };
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    try {
      if (validateLogin()) {
        setSubmitting(true);
        const response = await apiClient.post(
          LOGIN_ROUTE,
          { email, password },
          { withCredentials: true }
        );
        if (response.data.user.id) {
          localStorage.setItem("access-token", response.data.token);
          setUserInfo(response.data.user);
          if (response.data.user.profileSetup) navigate("/chat", { replace: true });
          else navigate("/profile", { replace: true });
        } else {
          console.log("error");
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async () => {
    try {
      if (validateSignup()) {
        setSubmitting(true);
        const response = await apiClient.post(
          SIGNUP_ROUTE,
          {
            email,
            password,
          },
          { withCredentials: true }
        );
        if (response.status === 201) {
          localStorage.setItem("access-token", response.data.token);
          setUserInfo(response.data.user);
          navigate("/profile", { replace: true });
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border-2 border-white text-opacity-90 shadow-2xl w-full max-w-[520px] xl:max-w-[1100px] py-8 sm:py-10 rounded-3xl grid xl:grid-cols-2">
        <div className="flex flex-col gap-8 sm:gap-10 items-center justify-center">
          <div className="flex  items-center justify-center flex-col">
            <div className="flex  items-center justify-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold">Welcome</h1>
              <img src={Victory} className="h-[70px] sm:h-[100px]" />
            </div>
            <p className="font-medium text-center px-4">
              Fill in the details to get started with the best chat app!
            </p>
          </div>
          <div className="flex items-center justify-center w-full ">
            <Tabs defaultValue="login" className="w-[88%] sm:w-3/4">
              <TabsList className="bg-transparent rounded-none w-full ">
                <TabsTrigger
                  className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2    rounded-none w-full data-[state=active]:text-black  data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 p-3 transition-all duration-300"
                  value="login"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2   rounded-none w-full data-[state=active]:text-black  data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 p-3 transition-all duration-300 "
                  value="signup"
                >
                  Signup
                </TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="flex flex-col gap-5 mt-10">
                <Input
                  placeholder="Email"
                  type="email"
                  className="rounded-full p-6"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <PasswordInput
                  placeholder="Password"
                  className="rounded-full p-6"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  className="rounded-full p-6 gap-2"
                  onClick={handleLogin}
                  disabled={submitting}
                >
                  {submitting && <Spinner className="h-4 w-4" />}
                  {submitting ? "Logging in..." : "Login"}
                </Button>
              </TabsContent>
              <TabsContent value="signup" className="flex flex-col gap-5 ">
                <Input
                  placeholder="Email"
                  type="email"
                  className="rounded-full p-6"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <PasswordInput
                  placeholder="Password"
                  className="rounded-full p-6"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <PasswordInput
                  placeholder="Confirm Password"
                  className="rounded-full p-6"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button
                  className="rounded-full p-6 gap-2"
                  onClick={handleSignup}
                  disabled={submitting}
                >
                  {submitting && <Spinner className="h-4 w-4" />}
                  {submitting ? "Creating account..." : "Signup"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div className="hidden xl:flex justify-center items-center ">
          <img src={Background} className="max-h-[700px] w-auto object-contain" />
        </div>

        {/* Login Signup COmponent */}
        {/* Branding */}
      </div>
    </div>
  );
};

export default Auth;
