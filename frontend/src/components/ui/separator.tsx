"use client";

import styled from "@emotion/styled";
import type { HTMLAttributes } from "react";

type Orientation = "horizontal" | "vertical";

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: Orientation;
  decorative?: boolean;
}

export function Separator({
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <Root
      role={decorative ? "presentation" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      data-orientation={orientation}
      {...props}
    />
  );
}

/* styles */

const Root = styled.div`
  flex-shrink: 0;
  background-color: var(--border);

  &[data-orientation="horizontal"] {
    width: 100%;
    height: 1px;
  }

  &[data-orientation="vertical"] {
    width: 1px;
    height: 100%;
  }
`;
