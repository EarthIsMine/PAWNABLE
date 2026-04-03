# PAWNABLE Frontend

PAWNABLE P2P 담보 대출 마켓플레이스의 Next.js 프론트엔드입니다.

> 이 패키지는 pnpm 모노레포의 일부입니다. 의존성 설치는 저장소 루트에서 실행하는 것을 권장합니다.

## 기술 스택

- **Framework**: Next.js 16
- **UI**: React 19
- **Styling**: Tailwind CSS + Emotion
- **State/Data Fetching**: TanStack Query
- **Blockchain**: ethers.js
- **i18n**: next-intl

---

## 개발 환경 실행

### 1. 의존성 설치

저장소 루트에서 실행:

```bash
pnpm install
```

### 2. 환경 변수 설정

`frontend/.env.local` 또는 `frontend/.env` 파일을 생성하고 필요한 값을 채웁니다.

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_LOAN_CONTRACT_ADDRESS=0x...
```

### 3. 개발 서버 실행

저장소 루트에서 실행:

```bash
pnpm --filter @pawnable/frontend dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속하면 됩니다.

---

## 빌드 및 프로덕션 실행

저장소 루트에서 실행:

```bash
pnpm --filter @pawnable/frontend build
pnpm --filter @pawnable/frontend start
```

---

## 프로젝트 구조

```text
frontend/
├── src/
│   ├── app/          # Next.js App Router 페이지
│   ├── components/   # 공용 UI 컴포넌트
│   ├── contexts/     # 인증/지갑 상태 컨텍스트
│   ├── hooks/        # 커스텀 훅
│   ├── i18n/         # 다국어 메시지
│   └── lib/          # API/컨트랙트 클라이언트
├── Dockerfile        # 프론트엔드 이미지 빌드 설정
└── README.md
```

---

## 배포

프론트엔드 운영 배포는 루트의 GitHub Actions 워크플로우에서 처리합니다.

- 워크플로우: `.github/workflows/deploy-macmini.yml`
- 프로덕션 Compose: `docker-compose.prod.yml`
- 프론트엔드 이미지: `ghcr.io/earthismine/pawnable-frontend`

배포 시에는 `frontend/Dockerfile`로 이미지를 빌드하고, Mac mini 서버에서 `docker-compose`로 최신 이미지를 pull/up 합니다.

---

## 참고 사항

- `NEXT_PUBLIC_*` 환경 변수는 브라우저 번들에 포함되므로, 비밀값을 넣지 마세요.
- 컨트랙트 주소나 API URL을 변경하면 배포 환경의 compose/workflow 값도 함께 확인해야 합니다.
- 프론트엔드는 온체인 트랜잭션 실행을 위해 브라우저 지갑(MetaMask 등)이 필요합니다.
