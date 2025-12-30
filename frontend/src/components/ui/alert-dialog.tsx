"use client";

import * as React from "react";
import styled from "@emotion/styled";

/**
 * shadcn 스타일 API 호환:
 * AlertDialog, AlertDialogTrigger, AlertDialogContent,
 * AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
 * AlertDialogFooter, AlertDialogCancel, AlertDialogAction
 *
 * - 외부 Radix 없이 "클라이언트 전용 최소 구현"
 * - 접근성(ESC 닫기, backdrop 클릭 닫기, 포커스 기본 처리) 포함
 */

type CtxValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const AlertDialogCtx = React.createContext<CtxValue | null>(null);

function useAlertDialogCtx() {
  const ctx = React.useContext(AlertDialogCtx);
  if (!ctx) throw new Error("AlertDialog components must be used within <AlertDialog>.");
  return ctx;
}

export type AlertDialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function AlertDialog({ open, defaultOpen, onOpenChange, children }: AlertDialogProps) {
  const [uncontrolled, setUncontrolled] = React.useState(!!defaultOpen);
  const isControlled = typeof open === "boolean";
  const value = isControlled ? (open as boolean) : uncontrolled;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  return (
    <AlertDialogCtx.Provider value={{ open: value, setOpen }}>{children}</AlertDialogCtx.Provider>
  );
}

export type AlertDialogTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  children: React.ReactNode;
};

export function AlertDialogTrigger({ asChild, children, ...props }: AlertDialogTriggerProps) {
  const { setOpen } = useAlertDialogCtx();

  if (asChild && React.isValidElement(children)) {
    // child에 onClick 합성
    const child = children as React.ReactElement<any>;
    const childOnClick = child.props.onClick as ((e: any) => void) | undefined;

    return React.cloneElement(child, {
      ...props,
      onClick: (e: any) => {
        childOnClick?.(e);
        if (!e?.defaultPrevented) setOpen(true);
      },
    });
  }

  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) setOpen(true);
      }}
    >
      {children}
    </button>
  );
}

export type AlertDialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function AlertDialogContent({ children, ...props }: AlertDialogContentProps) {
  const { open, setOpen } = useAlertDialogCtx();

  // ESC 닫기
  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  // 스크롤 락(최소)
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <Overlay
      role="presentation"
      onMouseDown={(e) => {
        // backdrop 클릭 닫기 (content 내부 클릭은 무시)
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <Content role="alertdialog" aria-modal="true" {...props}>
        {children}
      </Content>
    </Overlay>
  );
}

export function AlertDialogHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <Header {...props} />;
}

export function AlertDialogFooter(props: React.HTMLAttributes<HTMLDivElement>) {
  return <Footer {...props} />;
}

export function AlertDialogTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <Title {...props} />;
}

export function AlertDialogDescription(props: React.HTMLAttributes<HTMLParagraphElement>) {
  return <Description {...props} />;
}

export type AlertDialogCancelProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  children?: React.ReactNode; // ✅ string 허용
};

export function AlertDialogCancel({ asChild, children, ...props }: AlertDialogCancelProps) {
  const { setOpen } = useAlertDialogCtx();

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(e);
    if (!e.defaultPrevented) setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    const childOnClick = child.props.onClick as ((e: any) => void) | undefined;

    return React.cloneElement(child, {
      ...props,
      onClick: (e: any) => {
        childOnClick?.(e);
        if (!e?.defaultPrevented) setOpen(false);
      },
    });
  }

  return (
    <CancelButton type="button" {...props} onClick={onClick}>
      {children}
    </CancelButton>
  );
}

export type AlertDialogActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  children?: React.ReactNode; // ✅ string 허용
};

export function AlertDialogAction({ asChild, children, ...props }: AlertDialogActionProps) {
  // Action은 자동으로 닫지 않게 두는 게 일반적(요청 완료 후 닫기)
  // 필요하면 호출부에서 setOpen(false) 하거나, 여기서 닫게 바꿔도 됨.
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { ...props });
  }

  return (
    <ActionButton type="button" {...props}>
      {children}
    </ActionButton>
  );
}

/* styles */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 24px;
  background: rgba(0, 0, 0, 0.55);
`;

const Content = styled.div`
  width: 100%;
  max-width: 520px;

  border-radius: calc(var(--radius) - 2px);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--card-foreground);

  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  padding: 18px;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
`;

const Header = styled.div`
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  letter-spacing: 0.005em;
  font-weight: 700;
`;

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  letter-spacing: -0.015em;
  color: var(--muted-foreground);
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
`;

const BaseButton = styled.button`
  height: 40px;
  padding: 0 12px;
  border-radius: calc(var(--radius) - 6px);
  font-size: 14px;
  font-weight: 600;
  border: 1px solid transparent;
  transition:
    background 140ms ease,
    color 140ms ease,
    border-color 140ms ease;

  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled(BaseButton)`
  background: transparent;
  color: var(--foreground);
  border-color: var(--border);

  &:hover:not(:disabled) {
    background: color-mix(in oklab, var(--card) 60%, transparent);
  }
`;

const ActionButton = styled(BaseButton)`
  background: var(--accent);
  color: var(--accent-foreground);

  &:hover:not(:disabled) {
    background: color-mix(in oklab, var(--accent) 90%, black);
  }
`;
