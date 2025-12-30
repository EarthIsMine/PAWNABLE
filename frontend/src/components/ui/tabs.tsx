"use client";

import * as React from "react";
import styled from "@emotion/styled";

type TabsContextValue = {
  value: string;
  setValue: (next: string) => void;
  baseId: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs />");
  return ctx;
}

export type TabsProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * Tabs Root
 * - controlled: value + onValueChange
 * - uncontrolled: defaultValue
 */
export function Tabs({ value, defaultValue, onValueChange, children, ...props }: TabsProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const current = isControlled ? (value as string) : internal;

  const baseId = React.useId();

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  React.useEffect(() => {
    if (current) return;
    // defaultValue가 없고, 사용자가 Trigger를 통해서만 설정하는 케이스 대비:
    // 아무것도 선택되지 않은 상태를 허용하되, 필요하면 상위에서 defaultValue 제공 권장.
  }, [current]);

  return (
    <TabsContext.Provider value={{ value: current, setValue, baseId }}>
      <Root {...props}>{children}</Root>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;
export function TabsList({ children, ...props }: TabsListProps) {
  return (
    <List role="tablist" aria-orientation="horizontal" {...props}>
      {children}
    </List>
  );
}

export type TabsTriggerProps = {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function TabsTrigger({ value, disabled, children, ...props }: TabsTriggerProps) {
  const ctx = useTabsContext();
  const selected = ctx.value === value;

  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    props.onKeyDown?.(e);
    if (e.defaultPrevented) return;

    // roving focus
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;

    const currentTarget = e.currentTarget;
    const list = currentTarget.closest('[role="tablist"]') as HTMLElement | null;
    if (!list) return;

    const tabs = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([aria-disabled="true"])'),
    );

    const idx = tabs.indexOf(currentTarget);
    if (idx < 0) return;

    let nextIdx = idx;

    if (e.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
    if (e.key === "Home") nextIdx = 0;
    if (e.key === "End") nextIdx = tabs.length - 1;

    e.preventDefault();
    tabs[nextIdx]?.focus();
  };

  return (
    <Trigger
      type="button"
      role="tab"
      id={tabId}
      aria-selected={selected}
      aria-controls={panelId}
      aria-disabled={disabled ? "true" : "false"}
      tabIndex={selected ? 0 : -1}
      data-state={selected ? "active" : "inactive"}
      disabled={disabled}
      onClick={(e) => {
        props.onClick?.(e);
        if (disabled) return;
        ctx.setValue(value);
      }}
      onKeyDown={onKeyDown}
      {...props}
    >
      {children}
    </Trigger>
  );
}

export type TabsContentProps = {
  value: string;
  forceMount?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function TabsContent({ value, forceMount = false, children, ...props }: TabsContentProps) {
  const ctx = useTabsContext();
  const selected = ctx.value === value;

  const tabId = `${ctx.baseId}-tab-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;

  if (!forceMount && !selected) return null;

  return (
    <Content
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      hidden={!selected}
      data-state={selected ? "active" : "inactive"}
      tabIndex={0}
      {...props}
    >
      {children}
    </Content>
  );
}

/* styles */

const Root = styled.div`
  width: 100%;
`;

const List = styled.div`
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 3px);
  background: color-mix(in oklab, var(--card) 55%, transparent);
`;

const Trigger = styled.button`
  height: 36px;
  padding: 0 12px;
  border-radius: calc(var(--radius) - 6px);

  border: 1px solid transparent;
  background: transparent;
  color: var(--muted-foreground);

  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.005em;

  cursor: pointer;
  transition:
    background 140ms ease,
    color 140ms ease,
    border-color 140ms ease;

  &[data-state="active"] {
    background: color-mix(in oklab, var(--background) 70%, transparent);
    color: var(--foreground);
    border-color: color-mix(in oklab, var(--border) 85%, transparent);
  }

  &:hover:not(:disabled) {
    background: color-mix(in oklab, var(--card) 70%, transparent);
    color: var(--foreground);
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 30%, transparent);
  }

  &:disabled,
  &[aria-disabled="true"] {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const Content = styled.div`
  margin-top: 12px;
`;
