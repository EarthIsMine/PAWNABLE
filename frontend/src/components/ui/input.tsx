"use client";

import * as React from "react";
import styled from "@emotion/styled";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  sizeVariant?: "md" | "lg";
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ sizeVariant = "md", ...props }, ref) => {
    return <StyledInput ref={ref} data-size={sizeVariant} {...props} />;
  },
);

Input.displayName = "Input";

const StyledInput = styled.input`
  width: 100%;
  border-radius: calc(var(--radius) - 3px);
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--card) 55%, transparent);
  color: var(--foreground);

  font-size: 14px;
  line-height: 1.5;
  letter-spacing: -0.015em;

  padding: 0 12px;
  height: 40px;

  transition:
    border-color 140ms ease,
    background 140ms ease,
    box-shadow 140ms ease;

  &::placeholder {
    color: var(--muted-foreground);
  }

  &:hover {
    background: color-mix(in oklab, var(--card) 68%, transparent);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    border-color: color-mix(in oklab, var(--ring) 65%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 30%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &[data-size="lg"] {
    height: 44px;
    padding: 0 14px;
  }
`;
