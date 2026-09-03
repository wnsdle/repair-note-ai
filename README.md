# 정비노트 AI MVP

정비 경험을 Supabase에 저장하고, 사진은 Google Drive 전용 폴더에 저장하는 첫 번째 작동 버전입니다.

## 포함된 기능

- 정비노트 입력
- Supabase 저장
- 기록 목록 조회
- 내 정비 기록 키워드 검색
- 사진 여러 장 업로드
- Google Drive 폴더 저장

아직 포함하지 않은 기능:

- 사용자 로그인
- 임베딩 기반 유사도 검색
- 인터넷 자료 검색
- AI 판독

이 기능들은 기록 저장과 사진 업로드가 확인된 다음 단계에 붙입니다.

## 1. Supabase 테이블 만들기

1. Supabase 대시보드에서 SQL Editor를 엽니다.
2. `supabase/migrations/001_repair_notes.sql` 파일의 전체 내용을 붙여넣습니다.
3. Run을 누릅니다.

### `column "search_text" does not exist` 오류가 나온 경우

기존에 `repair_notes` 테이블이 다른 구조로 먼저 만들어진 경우입니다.
SQL Editor에서 아래 문장만 먼저 실행한 뒤, migration SQL을 다시 실행합니다.

```sql
alter table public.repair_notes
  add column if not exists search_text text not null default '';
```

## 2. Vercel 환경변수 입력

Vercel 프로젝트의 Settings → Environment Variables에 아래 값을 넣습니다.

```env
NEXT_PUBLIC_APP_NAME=정비노트 AI
NEXT_PUBLIC_SUPABASE_URL=https://huiiznlelguzywinlalx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=Supabase의 anon key
SUPABASE_SERVICE_ROLE_KEY=Supabase의 service_role key
GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMn
GOOGLE_SERVICE_ACCOUNT_JSON=다운로드한 JSON 전체 내용
```

`service_role key`와 Google JSON은 브라우저 공개용 변수가 아닙니다.
변수명에 `NEXT_PUBLIC_`를 붙이지 마세요.

## 3. Google Drive 폴더 권한

사진을 저장할 Drive 폴더를 다음 서비스 계정 이메일과 공유합니다.

```text
repair-note-drive@repair-note-ai.iam.gserviceaccount.com
```

권한은 `편집자`로 설정합니다.

## 4. 로컬 실행

```bash
npm install
npm run dev
```

## 보안 주의

- `.env.local`을 GitHub에 커밋하지 않습니다.
- Google 서비스 계정 JSON을 압축파일에 넣지 않습니다.
- Supabase service role key를 채팅으로 보내지 않습니다.
- 이 MVP는 서버 API에서 service role로 DB에 접근합니다. 외부 공개 전에 Supabase Auth와 사용자별 RLS를 추가해야 합니다.