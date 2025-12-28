# PAWNABLE Frontend Style Guide

_(Emotion + Tailwind Hybrid / Low Technical Debt Policy)_

## 1. 목적 (Why this guide exists)

이 스타일 가이드는 다음 목표를 위해 존재한다.

- v0 / shadcn 기반 자동 생성 코드의 흔적 제거
- **의도가 드러나는 코드** 유지
- Emotion 중심의 디자인 시스템 확립
- Tailwind는 **보조 도구**로만 사용
- 장기 유지보수 시 기술 부채 최소화

---

## 2. 기술 스택 기준

### Styling

- **Primary**: `@emotion/styled`
- **Global styles**: `@emotion/react` (`Global`)
- **Utility (보조)**: Tailwind CSS (최소 사용)

### UI / Interaction

- Radix UI: **접근성·행동이 복잡한 컴포넌트만 사용**
- shadcn/ui: ❌ 사용하지 않음

---

## 3. 파일 역할 분리 원칙

### 3.1 globals.css

**역할: Tailwind 빌드 타임 지시문 전용**

허용되는 내용:

- `@import "tailwindcss"`
- `@import "tw-animate-css"`
- Pretendard font import
- `@custom-variant dark`
- `@theme inline` (breakpoints, semantic color mapping)

❌ 금지:

- 레이아웃 스타일
- 타이포그래피 규칙
- 컴포넌트 스타일
- 제품 정책 스타일

---

### 3.2 GlobalStyles.tsx (Emotion)

**역할: 제품 전역 스타일 정책**

포함 항목:

- 색상 팔레트 (`--neutral-*`, `--brand-*`, etc.)
- Semantic tokens (`--background`, `--accent`, etc.)
- typography 규칙 (html, body, heading)
- focus ring
- reset / box-sizing
- `.typo-*` 유틸 클래스

---

## 4. JSX ↔ Emotion 스타일 배치 규칙 (핵심)

### 4.1 페이지 / 화면 컴포넌트 (`app/*/page.tsx` 등)

✅ **JSX를 위에, styled-components를 아래에 둔다**

```tsx
export default function HomePage() {
  return (
    <Page>
      <Hero>...</Hero>
    </Page>
  );
}

/* styles */
const Page = styled.div`...`;
const Hero = styled.section`...`;
```

**이유**

- “무엇을 보여주는지”가 먼저 보이도록
- 기획/의도 중심의 코드 가독성 확보
- 유지보수 시 구조 파악이 쉬움

---

### 4.2 UI Primitive / Design System (`components/ui/*`)

✅ **styled-components를 위에, JSX를 아래에 둔다**

```tsx
const ButtonRoot = styled.button`...`;

export function Button(props) {
  return <ButtonRoot {...props} />;
}
```

**이유**

- 스타일이 곧 API의 일부
- 재사용성과 일관성 우선
- 라이브러리 코드에 가까운 성격

---

## 5. Tailwind 사용 규칙

### 허용되는 경우

- 매우 단순한 spacing (`mt-2`, `gap-4`)
- 빠른 실험용 레이아웃
- Emotion으로 옮기기 전의 임시 코드

### 권장되지 않는 경우

- 핵심 레이아웃 구조
- 컴포넌트의 시각적 정체성
- 반복되는 패턴

👉 **“한 파일 안에서 Tailwind와 Emotion이 섞여도 되지만,
의존성의 중심은 항상 Emotion”**

---

## 6. Design System 원칙

### 6.1 브랜드 컬러 사용

- `--brand-*` / `--accent`는 **포인트에만 사용**
- 기본 UI는 중립(`neutral`) 중심

### 6.2 컴포넌트 책임

- Button / Card / Badge / Input 등은 **Emotion DS로만 구현**
- 페이지에서는 DS 컴포넌트를 조합만 한다

---

## 7. Radix UI 사용 기준

### 유지 (권장)

- Dialog
- DropdownMenu
- Popover
- Select
- Tabs
- Tooltip
- Toast

👉 단, **직접 import 금지**
👉 반드시 `components/ui/*`에서 Emotion으로 감싼 래퍼만 사용

### 제거 / 직접 구현

- Avatar
- Separator
- AspectRatio
- Progress
- Layout 관련 컴포넌트

---

## 8. Import 규칙

### ❌ 금지

```ts
import { Button } from "@radix-ui/react-button";
import { Something } from "@/components/ui/shadcn-*";
```

### ✅ 허용

```ts
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
```

---

## 9. 코드 냄새 기준 (이러면 리팩터링 대상)

- `className`에 Tailwind가 과도하게 길어짐
- Emotion 컴포넌트 위에 JSX가 없음
- 페이지 상단에 styled 정의가 먼저 등장
- shadcn 기반 API 흔적 (`variant="default"`, `size="sm"` 등)

---

## 10. 한 문장 원칙 (팀 합의용)

> **페이지는 읽히는 코드가 우선이고,
> 컴포넌트는 재사용되는 코드가 우선이다.**
