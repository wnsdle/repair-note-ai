# 정비노트 AI

정비 경험과 정비 사진을 Supabase에 저장하고 검색하는 정비 기록 서비스입니다.

## 주요 기능

- 정비노트 입력·수정·삭제
- Supabase 데이터베이스 저장
- 정비 사진 여러 장 업로드
- Supabase Storage의 비공개 버킷에 사진 저장
- 정비 기록 목록 및 검색
- AI 기반 정비 기록 보조

## 사진 저장

정비 사진은 Supabase Storage의 `repair-note-photos` 버킷에 저장됩니다.
버킷은 비공개(private)이며 기록을 조회할 때 서버에서 제한시간이 있는 Signed URL을 생성합니다.
Google Drive는 사용하지 않습니다.

## 환경변수

Vercel 프로젝트의 Settings → Environment Variables에 아래 값을 설정합니다.

```env
NEXT_PUBLIC_APP_NAME=정비노트 AI
NEXT_PUBLIC_SUPABASE_URL=https://huiiznlelguzywinlalx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase의 anon key
SUPABASE_SERVICE_ROLE_KEY=Supabase의 service_role key
```

`SUPABASE_SERVICE_ROLE_KEY`는 브라우저 공개용 변수가 아닙니다. 변수명에 `NEXT_PUBLIC_`를 붙이지 않습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 보안 주의

- `.env.local`을 GitHub에 커밋하지 않습니다.
- Supabase service role key를 채팅이나 클라이언트 코드에 노출하지 않습니다.
- 사진 버킷은 private으로 유지합니다.
- 외부 공개 전에는 Supabase Auth와 사용자별 RLS 정책을 추가하는 것을 권장합니다.
