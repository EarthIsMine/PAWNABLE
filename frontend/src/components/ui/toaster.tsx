"use client";

import { css } from "@emotion/react";
import { Toaster as SonnerToaster } from "sonner";

type Props = {
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "bottom-center";
  richColors?: boolean;
  closeButton?: boolean;
  duration?: number;
};

const styles = css`
  /* Sonner container */
  [data-sonner-toaster] {
    font-family: var(--font-sans);
  }

  /* Toast card */
  [data-sonner-toast] {
    background: var(--card);
    color: var(--card-foreground);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 3px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
  }

  /* Title / description */
  [data-sonner-toast] [data-title] {
    line-height: 1.2;
    letter-spacing: 0.005em;
    font-weight: 600;
    font-size: 14px;
  }

  [data-sonner-toast] [data-description] {
    line-height: 1.5;
    letter-spacing: -0.015em;
    color: var(--muted-foreground);
    font-size: 13px;
  }

  /* Buttons */
  [data-sonner-toast] [data-button] {
    background: var(--accent);
    color: var(--accent-foreground);
    border-radius: calc(var(--radius) - 6px);
    border: 1px solid transparent;
    font-weight: 600;
  }

  [data-sonner-toast] [data-cancel] {
    background: transparent;
    color: var(--foreground);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 6px);
    font-weight: 600;
  }

  /* Close button */
  [data-sonner-toast] [data-close-button] {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted-foreground);
    border-radius: calc(var(--radius) - 6px);
  }

  [data-sonner-toast] [data-close-button]:hover {
    color: var(--foreground);
  }

  /* Status accents (minimal, not loud) */
  [data-sonner-toast][data-type="success"] {
    border-color: color-mix(in oklab, var(--success) 40%, var(--border));
  }

  [data-sonner-toast][data-type="error"] {
    border-color: color-mix(in oklab, var(--error) 45%, var(--border));
  }

  [data-sonner-toast][data-type="warning"] {
    border-color: color-mix(in oklab, var(--warning) 55%, var(--border));
  }

  [data-sonner-toast][data-type="info"] {
    border-color: color-mix(in oklab, var(--info) 45%, var(--border));
  }

  /* Focus ring */
  [data-sonner-toast] :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
`;

export function Toaster({
  position = "bottom-right",
  richColors = false,
  closeButton = true,
  duration = 3500,
}: Props) {
  return (
    <div css={styles}>
      <SonnerToaster
        position={position}
        richColors={richColors}
        closeButton={closeButton}
        duration={duration}
        theme="dark"
        toastOptions={{
          classNames: {
            toast: "sonner-toast", // (optional) not required
          },
        }}
      />
    </div>
  );
}
