"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import styled from "@emotion/styled";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const Content = styled(DropdownMenuPrimitive.Content)`
  min-width: 200px;
  padding: 8px;
  border-radius: calc(var(--radius) - 3px);

  background: var(--popover);
  color: var(--popover-foreground);
  border: 1px solid var(--border);

  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);

  animation: dropdownIn 120ms ease-out;

  @keyframes dropdownIn {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  &:focus {
    outline: none;
  }
`;

const Item = styled(DropdownMenuPrimitive.Item)`
  display: flex;
  align-items: center;
  gap: 10px;

  padding: 10px 10px;
  border-radius: calc(var(--radius) - 6px);

  font-size: 14px;
  line-height: 1.4;
  letter-spacing: -0.005em;

  color: var(--foreground);
  background: transparent;
  user-select: none;
  cursor: default;

  &[data-disabled] {
    opacity: 0.5;
    pointer-events: none;
  }

  &[data-highlighted] {
    background: color-mix(in oklab, var(--card) 70%, transparent);
    color: var(--foreground);
  }

  &:focus {
    outline: none;
  }
`;

const Separator = styled(DropdownMenuPrimitive.Separator)`
  height: 1px;
  background: var(--border);
  margin: 8px 6px;
`;

const Label = styled(DropdownMenuPrimitive.Label)`
  padding: 6px 10px;
  font-size: 12px;
  color: var(--muted-foreground);
  letter-spacing: -0.015em;
`;

const Shortcut = styled.span`
  margin-left: auto;
  font-size: 12px;
  color: var(--muted-foreground);
`;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ sideOffset = 8, align = "end", ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <Content ref={ref} sideOffset={sideOffset} align={align} {...props} />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    shortcut?: string;
  }
>(({ shortcut, children, ...props }, ref) => (
  <Item ref={ref} {...props}>
    {children}
    {shortcut ? <Shortcut>{shortcut}</Shortcut> : null}
  </Item>
));
DropdownMenuItem.displayName = "DropdownMenuItem";

/* 옵션: 필요할 때만 export해서 쓰면 됨 */
export const DropdownMenuSeparator = Separator;
export const DropdownMenuLabel = Label;
