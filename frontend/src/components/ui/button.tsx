"use client";

import * as React from "react";
import styled from "@emotion/styled";

type Variant = "solid" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";
type Tone = "neutral" | "accent";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  tone?: Tone; // solid일 때 accent/neutral 선택
  fullWidth?: boolean;
};

const heightBySize: Record<Size, number> = { sm: 36, md: 40, lg: 44 };
const paddingXBySize: Record<Size, number> = { sm: 12, md: 16, lg: 18 };
const fontSizeBySize: Record<Size, number> = { sm: 13, md: 14, lg: 15 };

const StyledButton = styled.button<
  Required<Pick<ButtonProps, "variant" | "size" | "tone" | "fullWidth">>
>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
  user-select: none;

  border-radius: calc(var(--radius) - 3px);
  font-weight: 600;

  height: ${({ size }) => heightBySize[size]}px;
  padding: 0 ${({ size }) => paddingXBySize[size]}px;
  font-size: ${({ size }) => fontSizeBySize[size]}px;

  ${({ fullWidth }) => (fullWidth ? "width: 100%;" : "")}

  transition: background 140ms ease, color 140ms ease, border-color 140ms ease, opacity 140ms ease;

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  /* Variant styles */
  ${({ variant, tone }) => {
    if (variant === "solid") {
      if (tone === "accent") {
        return `
          background: var(--accent);
          color: var(--accent-foreground);
          border: 1px solid transparent;
          &:hover { opacity: 0.92; }
        `;
      }
      return `
        background: var(--primary);
        color: var(--primary-foreground);
        border: 1px solid transparent;
        &:hover { opacity: 0.92; }
      `;
    }

    if (variant === "outline") {
      return `
        background: transparent;
        color: var(--foreground);
        border: 1px solid var(--border);
        &:hover { background: color-mix(in oklab, var(--card) 70%, transparent); }
      `;
    }

    if (variant === "ghost") {
      return `
        background: transparent;
        color: var(--foreground);
        border: 1px solid transparent;
        &:hover { background: color-mix(in oklab, var(--card) 70%, transparent); }
      `;
    }

    // destructive
    return `
      background: var(--destructive);
      color: var(--destructive-foreground);
      border: 1px solid transparent;
      &:hover { opacity: 0.92; }
    `;
  }}
`;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "solid",
      size = "md",
      tone = "neutral",
      fullWidth = false,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <StyledButton
        ref={ref}
        type={type}
        variant={variant}
        size={size}
        tone={tone}
        fullWidth={fullWidth}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
