"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ConfirmSubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
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
    <button
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
    </button>
  );
}
