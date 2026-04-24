// src/components/admin/AdminButton.tsx
"use client";

import React from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function AdminButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...rest
}: Props) {
  const classes = [
    "admin-btn",
    variant === "primary" && "admin-btn-primary",
    variant === "outline" && "admin-btn-outline",
    variant === "ghost" && "admin-btn-ghost",
    variant === "danger" && "admin-btn-danger",
    size === "sm" ? "admin-btn-sm" : "admin-btn-md",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
