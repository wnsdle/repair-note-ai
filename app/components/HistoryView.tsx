import NoteCard from "./NoteCard";
import { Note } from "../types";

export default function HistoryView({ notes, loading, onEdit, onDelete }: { notes: Note[]; loading: boolean; onEdit: (note: Note) => void; onDelete: (id: string) => void }) {
  return <section className="card">
    <h2 className="section-title">저장된 정비 기록</h2>
    {loading ? <div className="empty">불러오는 중입니다...</div> : notes.length === 0 ? <div className="empty">저장된 기록이 없습니다.<br/>기록하기 탭에서 첫 정비 경험을 추가해보세요.</div> : notes.map((note) => <NoteCard key={note.id} note={note} onEdit={onEdit} onDelete={onDelete}/>) }
  </section>;
}
