import * as React from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PasswordInput = React.forwardRef(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative w-full">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-14", className)}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-800 focus:outline-none"
      >
        {visible ? <FiEyeOff className="text-xl" /> : <FiEye className="text-xl" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
