import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

type LoadingButtonProps = Omit<React.ComponentProps<typeof Button>, "asChild"> & {
  loading?: boolean;
  loadingText?: string;
};

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  size,
  className,
  ...props
}: LoadingButtonProps) {
  const gapClass = size === "xs" ? "gap-1" : size === "sm" ? "gap-1.5" : "gap-2";

  return (
    <Button
      size={size}
      disabled={disabled || loading}
      className={cn("grid grid-cols-1 grid-rows-1 justify-items-center", className)}
      {...props}
    >
      <span
        className={cn(
          "col-start-1 row-start-1 inline-flex items-center",
          gapClass,
          loading && "invisible",
        )}
        aria-hidden={loading}
      >
        {children}
      </span>
      <span
        className={cn(
          "col-start-1 row-start-1 inline-flex items-center",
          gapClass,
          !loading && "invisible",
        )}
        aria-hidden={!loading}
      >
        <Loader2Icon className="animate-spin" />
        {loadingText}
      </span>
    </Button>
  );
}
