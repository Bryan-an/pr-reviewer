"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  confirmText: string;
  children: ReactNode;
};

export function ConfirmSubmitButton({
  confirmText,
  children,
  onClick,
  ...rest
}: ConfirmSubmitButtonProps) {
  return (
    <Button
      {...rest}
      type="submit"
      onClick={(e) => {
        if (!globalThis.confirm(confirmText)) {
          e.preventDefault();
          return;
        }

        onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
}
