"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import styled from "@emotion/styled";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const Content = styled(DropdownMenuPrimitive.Content)`
  z-index: 60;
  min-width: 180px;
  padding: 6px;

  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 3px);
  background: var(--popover);
  color: var(--popover-foreground);

  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);

  /* hover 배경이 잘리지 않게 */
  overflow: visible;
`;

const Item = styled(DropdownMenuPrimitive.Item)`
  display: flex;
  align-items: center;
  gap: 10px;

  width: 100%;
  padding: 10px 10px;
  border-radius: calc(var(--radius) - 6px);

  font-size: 14px;
  line-height: 1.4;
  letter-spacing: -0.005em;

  color: var(--foreground);
  background: transparent;

  user-select: none;
  cursor: default;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 70%, transparent);
  }

  /* ✅ 마우스 hover에서도 보이게 */
  &:hover {
    background: color-mix(in oklab, var(--card) 70%, transparent);
  }

  /* ✅ 키보드/포인터 이동 시 Radix가 주는 상태 */
  &[data-highlighted] {
    background: color-mix(in oklab, var(--card) 70%, transparent);
  }

  &[data-disabled] {
    opacity: 0.5;
    pointer-events: none;
  }

  /* ✅ 현재 선택된 값 */
  &[data-active="true"] {
    background: color-mix(in oklab, var(--accent) 18%, transparent);
    border: 1px solid color-mix(in oklab, var(--accent) 35%, var(--border));
  }

  &[data-active="true"]:hover,
  &[data-active="true"][data-highlighted] {
    background: color-mix(in oklab, var(--accent) 22%, transparent);
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
