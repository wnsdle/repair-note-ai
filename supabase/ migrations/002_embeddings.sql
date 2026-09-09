-- 임베딩 기반 유사도 검색을 위한 pgvector 확장 활성화
create extension if not exists vector;

-- 정비 기록에 임베딩 벡터 칼럼 추가
-- Gemini gemini-embedding-001 모델을 768차원으로 사용합니다.
alter table public.repair_notes
  add column if not exists embedding vector(768);

-- 임베딩 유사도로 정비 기록을 찾는 함수
-- query_embedding: 검색어를 임베딩한 벡터
-- match_count: 반환할 최대 개수
-- match_threshold: 최소 유사도 (0~1, 1에 가까울수록 의미가 유사함)
create or replace function public.match_repair_notes(
  query_embedding vector(768),
  match_count int default 20,
  match_threshold float default 0.45
)
returns table (
  id uuid,
  similarity float
)
language sql stable
as $$
  select
    repair_notes.id,
    1 - (repair_notes.embedding <=> query_embedding) as similarity
  from public.repair_notes
  where repair_notes.embedding is not null
    and 1 - (repair_notes.embedding <=> query_embedding) > match_threshold
  order by repair_notes.embedding <=> query_embedding
  limit match_count;
$$;

-- 참고: 개인/소규모 정비소 사용 규모(기록 수천 건 이하)에서는
-- 별도 인덱스 없이도 위 함수만으로 충분히 빠릅니다.
-- 나중에 기록이 아주 많아지면(수만 건 이상) 아래와 같은 인덱스를 추가로 고려하세요.
-- create index repair_notes_embedding_idx on public.repair_notes
--   using ivfflat (embedding vector_cosine_ops) with (lists = 100);
