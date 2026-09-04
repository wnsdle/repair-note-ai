import { createClient } from "@supabase/supabase-js";

/**
 * 정비소 관리 웹(별도 프로젝트)의 Supabase를 "읽기 전용"으로 연결합니다.
 * 이 클라이언트로는 절대 insert/update/delete를 호출하지 않습니다 (조회 전용 API에서만 사용).
 */
const MANAGEMENT_SUPABASE_URL = "https://axnvdxynwetvruukfwmb.supabase.co";
const MANAGEMENT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bnZkeHlud2V0dnJ1dWtmd21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNzU4NzQsImV4cCI6MjEwMjc1MTg3NH0.YpWNAfyAz1EVwRxRdH5vrDlRkQJL3PICpI9kGRs4DmQ";

export function getManagementSupabase() {
  return createClient(MANAGEMENT_SUPABASE_URL, MANAGEMENT_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
