import { FormEvent } from "react";
import NoteCard from "./NoteCard";
import { Note } from "../types";

export default function SearchView({ query, setQuery, loading, onSearch, results, diagnosisLoading, diagnosis, diagnosisError, onEdit }: {
  query: string; setQuery: (value: string) => void; loading: boolean; onSearch: (event: FormEvent) => void;
  results: Note[]; diagnosisLoading: boolean; diagnosis: { text: string } | null; diagnosisError: string; onEdit: (note: Note) => void;
}) {
  return <section className="card">
    <h2 className="section-title">내 정비 경험 검색</h2>
    <form onSubmit={onSearch}>
      <div className="field"><label htmlFor="query">증상을 자세히 적어주세요</label><textarea id="query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예: 시동이 걸릴듯 안걸릴듯 하다가 안걸림. 스타트모터는 정상 작동함" rows={4}/><p className="hint">자세히 적을수록 정확해요. 내 기록 중 비슷한 경험을 찾고, AI가 그 기록과 자체 지식을 참고해서 원인/점검순서를 함께 제안해드려요.</p></div>
      <div className="actions"><button className="primary" type="submit" disabled={loading}>🔍 검색하기</button></div>
    </form>
    {(diagnosisLoading || diagnosis || diagnosisError) && <div className="ai-diagnosis-box" style={{ marginTop: "16px", padding: "14px", background: "#f5f3ff", borderRadius: "10px", border: "1px solid #ddd6fe" }}>
      <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>🤖 AI 진단 결과 (내 정비 기록 + AI 지식 기반, 인터넷 검색 없음)</h3>
      {diagnosisLoading && <p className="muted">AI가 비슷한 내 정비 기록을 참고해서 원인을 분석하는 중입니다...</p>}
      {diagnosisError && <p className="status error">{diagnosisError}</p>}
      {diagnosis && <><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{diagnosis.text}</div><p className="muted" style={{ marginTop: "8px", fontSize: "12px" }}>⚠️ 인터넷 검색 없이, 내 정비 기록과 AI의 일반 지식만으로 만든 참고용 진단입니다. 실제 점검/조치는 정비사의 판단으로 최종 확인해주세요.</p></>}
    </div>}
    <div><h3 className="section-title" style={{ marginTop: "18px", fontSize: "15px" }}>내 정비 기록</h3>{results.length === 0 ? <div className="empty">검색 결과가 여기에 표시됩니다.</div> : results.map((note) => <NoteCard key={note.id} note={note} onEdit={onEdit}/>)}</div>
  </section>;
}
