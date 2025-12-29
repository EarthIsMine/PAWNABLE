"use client";

import { toast as sonnerToast } from "sonner";
import type React from "react";

/**
 * 프로젝트 내 기존 호출부 호환을 위한 타입
 * - title/description/action/variant 패턴을 유지
 * - 내부는 sonner로 렌더링 (Toaster는 이미 layout에 있음)
 */

type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

export type ToastActionElement = React.ReactNode;

export type ToastInput = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  /**
   * 기존 shadcn 패턴 호환 (destructive 등)
   * sonner의 type으로 매핑됨
   */
  variant?: ToastVariant;
  /**
   * 옵션: 화면에 오래 띄우고 싶을 때
   */
  duration?: number;
};

function mapVariantToType(variant?: ToastVariant): "success" | "error" | "warning" | "info" | undefined {
  switch (variant) {
    case "destructive":
      return "error";
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return undefined;
  }
}

export function toast(input: ToastInput) {
  const { title, description, action, variant, duration } = input;

  const type = mapVariantToType(variant);

  // Sonner는 title을 첫 번째 인자(문자열/노드)로 받고,
  // description은 옵션으로 받음.
  if (type === "success") {
    return sonnerToast.success(title ?? "", { description, action, duration });
  }
  if (type === "error") {
    return sonnerToast.error(title ?? "", { description, action, duration });
  }
  if (type === "warning") {
    return sonnerToast.warning(title ?? "", { description, action, duration });
  }
  if (type === "info") {
    return sonnerToast.info(title ?? "", { description, action, duration });
  }

  return sonnerToast(title ?? "", { description, action, duration });
}

export function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => {
      // sonner는 id 기반 dismiss 지원
      if (toastId === undefined) sonnerToast.dismiss();
      else sonnerToast.dismiss(toastId);
    },
  };
}
