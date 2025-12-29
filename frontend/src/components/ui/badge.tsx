import styled from "@emotion/styled";

type Variant =
  | "default"
  | "accent"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "error"
  | "info";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
};

const stylesByVariant: Record<Variant, string> = {
  default: `
    background: color-mix(in oklab, var(--card) 70%, transparent);
    color: var(--foreground);
    border: 1px solid var(--border);
  `,
  accent: `
    background: color-mix(in oklab, var(--accent) 16%, transparent);
    color: var(--accent);
    border: 1px solid color-mix(in oklab, var(--accent) 40%, var(--border));
  `,
  secondary: `
    background: color-mix(in oklab, var(--secondary) 16%, transparent);
    color: var(--foreground);
    border: 1px solid color-mix(in oklab, var(--secondary) 40%, var(--border));
  `,
  outline: `
    background: transparent;
    color: var(--muted-foreground);
    border: 1px solid var(--border);
  `,
  success: `
    background: color-mix(in oklab, var(--success) 16%, transparent);
    color: var(--foreground);
    border: 1px solid color-mix(in oklab, var(--success) 45%, var(--border));
  `,
  warning: `
    background: color-mix(in oklab, var(--warning) 18%, transparent);
    color: var(--foreground);
    border: 1px solid color-mix(in oklab, var(--warning) 55%, var(--border));
  `,
  error: `
    background: color-mix(in oklab, var(--error) 16%, transparent);
    color: var(--foreground);
    border: 1px solid color-mix(in oklab, var(--error) 50%, var(--border));
  `,
  info: `
    background: color-mix(in oklab, var(--info) 16%, transparent);
    color: var(--foreground);
    border: 1px solid color-mix(in oklab, var(--info) 45%, var(--border));
  `,
};

export const Badge = styled.span<Required<Pick<BadgeProps, "variant">>>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  padding: 6px 10px;
  border-radius: 999px;

  font-size: 12px;
  line-height: 1;
  letter-spacing: -0.015em;
  font-weight: 600;

  white-space: nowrap;
  user-select: none;

  ${({ variant }) => stylesByVariant[variant]}
`;

Badge.defaultProps = {
  variant: "default",
};
