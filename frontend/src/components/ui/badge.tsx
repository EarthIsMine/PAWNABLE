"use client";

import * as React from "react";
import styled from "@emotion/styled";

export type BadgeVariant = "default" | "secondary" | "accent" | "destructive" | "outline";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return <BadgeRoot data-variant={variant} className={className} {...props} />;
}

/* styles */

const BadgeRoot = styled.span`
  display: inline-flex;
  align-items: center;

  border-radius: calc(var(--radius) - 6px);
  border: 1px solid var(--border);

  padding: 2px 8px;

  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.015em;

  white-space: nowrap;

  transition:
    background 140ms ease,
    border-color 140ms ease,
    color 140ms ease;

  /* Default */
  background: var(--card);
  color: var(--card-foreground);

  &[data-variant="secondary"] {
    background: var(--secondary);
    color: var(--secondary-foreground);
  }

  &[data-variant="accent"] {
    background: color-mix(in oklab, var(--accent) 18%, var(--card));
    border-color: color-mix(in oklab, var(--accent) 35%, var(--border));
    color: var(--foreground);
  }

  &[data-variant="destructive"] {
    background: color-mix(in oklab, var(--destructive) 16%, var(--card));
    border-color: color-mix(in oklab, var(--destructive) 45%, var(--border));
    color: var(--foreground);
  }

  &[data-variant="outline"] {
    background: transparent;
    color: var(--foreground);
  }
`;
