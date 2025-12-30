"use client";

import * as React from "react";
import styled from "@emotion/styled";
import { ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
};

export function Select({ id, value, onValueChange, placeholder, options, disabled }: SelectProps) {
  // placeholder 제공 시, value="" 옵션을 맨 앞에 둔다.
  const hasPlaceholder = Boolean(placeholder);

  return (
    <SelectWrap>
      <NativeSelect
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        aria-invalid={false}
      >
        {hasPlaceholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}

        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>

      <Icon aria-hidden="true">
        <ChevronDown width={16} height={16} />
      </Icon>
    </SelectWrap>
  );
}

const SelectWrap = styled.div`
  position: relative;
  width: 100%;
`;

const NativeSelect = styled.select`
  width: 100%;
  appearance: none;

  height: 40px;
  padding: 0 36px 0 12px;

  border-radius: calc(var(--radius) - 3px);
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--card) 55%, transparent);
  color: var(--foreground);

  font-size: 14px;
  line-height: 1.5;
  letter-spacing: -0.015em;

  transition:
    border-color 140ms ease,
    background 140ms ease,
    box-shadow 140ms ease;

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
`;

const Icon = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  color: var(--muted-foreground);
  pointer-events: none;
`;
