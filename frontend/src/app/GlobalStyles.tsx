"use client";

import { Global, css } from "@emotion/react";

export default function GlobalStyles() {
  return (
    <Global
      styles={css`
        :root {
          /* Neutral palette */
          --neutral-100: #f5f7fa;
          --neutral-200: #e6edf3;
          --neutral-300: #cfd8e3;
          --neutral-400: #9aa7b2;
          --neutral-500: #6b7785;
          --neutral-600: #4b5663;
          --neutral-700: #333d48;
          --neutral-800: #232b33;
          --neutral-900: #1a2128;
          --neutral-1000: #12181d;
          --neutral-1100: #0f151a;
          --neutral-1200: #0b0f12;
          --neutral-1300: #070a0c;

          /* Brand palette (teal) */
          --brand-100: #d7f7f4;
          --brand-200: #b7f0eb;
          --brand-300: #8ae6df;
          --brand-400: #4dd8cf;
          --brand-500: #1fbfb8;
          --brand-600: #18a8a2;
          --brand-700: #12817d;
          --brand-800: #0e5b59;
          --brand-900: #0e3b3b;
          --brand-1000: #0a2c2c;

          /* Secondary palette */
          --secondary-100: #e8f0ff;
          --secondary-200: #d2e2ff;
          --secondary-300: #aecaff;
          --secondary-400: #7aa6ff;
          --secondary-500: #4f86ff;
          --secondary-600: #3868e6;
          --secondary-700: #2b4db3;
          --secondary-800: #213a80;
          --secondary-900: #182a52;
          --secondary-1000: #121c33;

          /* Status */
          --success: #6fbf73;
          --warning: #f2b705;
          --warning-strong: #e09600;
          --error: #c65d5d;
          --info: #4f86ff;

          /* Semantic tokens */
          --background: var(--neutral-1200);
          --foreground: var(--neutral-200);

          --card: var(--neutral-1000);
          --card-foreground: var(--neutral-200);

          --popover: var(--neutral-1000);
          --popover-foreground: var(--neutral-200);

          /* Keep brand usage minimal: accent only */
          --primary: var(--neutral-200);
          --primary-foreground: var(--neutral-1200);

          --secondary: var(--neutral-1100);
          --secondary-foreground: var(--neutral-200);

          --muted: var(--neutral-1100);
          --muted-foreground: var(--neutral-400);

          --accent: var(--brand-500);
          --accent-foreground: var(--neutral-1300);

          --destructive: var(--error);
          --destructive-foreground: #ffffff;

          --border: var(--neutral-800);
          --input: var(--neutral-800);
          --ring: var(--brand-500);

          --chart-1: var(--brand-500);
          --chart-2: var(--secondary-500);
          --chart-3: var(--success);
          --chart-4: var(--warning);
          --chart-5: var(--error);

          --radius: 0.75rem;

          /* Sidebar (optional) */
          --sidebar: var(--neutral-1100);
          --sidebar-foreground: var(--neutral-200);
          --sidebar-primary: var(--brand-500);
          --sidebar-primary-foreground: var(--neutral-1300);
          --sidebar-accent: var(--neutral-1000);
          --sidebar-accent-foreground: var(--neutral-200);
          --sidebar-border: var(--neutral-800);
          --sidebar-ring: var(--brand-500);
        }

        /* Base typography + rendering */
        html {
          font-size: 14px;
          font-stretch: 100%;
        }

        body {
          background: var(--background);
          color: var(--foreground);
          font-family: var(--font-sans);
          line-height: 1.5; /* body */
          letter-spacing: -0.015em; /* -1.5% */
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        h1,
        h2,
        h3 {
          line-height: 1.2;
          letter-spacing: 0.005em; /* +0.5% */
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
          border-color: var(--border);
        }

        :focus-visible {
          outline: 2px solid var(--ring);
          outline-offset: 2px;
        }

        /* Type scale utilities */
        .typo-body {
          font-size: 14px;
          line-height: 1.5;
          letter-spacing: -0.015em;
        }

        .typo-caption {
          font-size: 12px;
          line-height: 1.5;
          letter-spacing: -0.015em;
        }

        .typo-subtitle {
          font-size: 16px;
          line-height: 1.4;
          letter-spacing: -0.005em;
        }

        .typo-h1 {
          font-size: 22px;
          line-height: 1.2;
          letter-spacing: 0.005em;
        }

        .typo-h2 {
          font-size: 20px;
          line-height: 1.2;
          letter-spacing: 0.005em;
        }

        .typo-h3 {
          font-size: 18px;
          line-height: 1.2;
          letter-spacing: 0.005em;
        }
      `}
    />
  );
}
