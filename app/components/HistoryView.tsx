import { useCallback, useEffect, useRef, useState } from "react";
import NoteCard from "./NoteCard";
import { Note } from "../types";

const PAGE_SIZE = 20;

type Props = {
  notes: Note[];
  loading: boolean;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
};

export default function HistoryView({ notes: initialNotes, loading: initialLoading, onEdit, onDelete }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [loading, setLoading] = useState(initialLoading);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (offset: number, replace = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError("");
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const response = await fetch(`/api/repair-notes?limit=${PAGE_SIZE}&offset=${offset}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "정비 기록을 불러오지 못했습니다.");
      const incoming: Note[] = json.data || [];
      setNotes((current) => replace ? incoming : [...current, ...incoming]);
      offsetRef.current = offset + incoming.length;
      setHasMore(Boolean(json.pagination?.hasMore));
    } catch (e) {
      setError(e instanceof Error ? e.message : "정비 기록을 불러오지 못했습니다.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPage(0, true);
  }, [loadPage]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingRef.current) loadPage(offsetRef.current);
      },
      { rootMargin: "500px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadPage, notes.length]);

  useEffect(() => {
    if (initialNotes.length > 0) setNotes(initialNotes);
  }, [initialNotes]);

  const handleDelete = async (id: string) => {
    await onDelete(id);
    setNotes((current) => current.filter((note) => note.id !== id));
  };

  return <section className="card">
    <h2 className="section-title">저장된 정비 기록</h2>
    {error && <div className="status error">{error}</div>}
    {loading && notes.length === 0 ? <div className="empty">불러오는 중입니다...</div> : notes.length === 0 ? <div className="empty">저장된 기록이 없습니다.<br/>기록하기 탭에서 첫 정비 경험을 추가해보세요.</div> : <>
      {notes.map((note) => <NoteCard key={note.id} note={note} onEdit={onEdit} onDelete={handleDelete}/>) }
      <div ref={sentinelRef} style={{ minHeight: "1px" }} aria-hidden="true" />
      {loadingMore && <div className="empty" style={{ padding: "12px" }}>더 불러오는 중...</div>}
      {!hasMore && notes.length > 0 && <div className="muted" style={{ textAlign: "center", padding: "12px", fontSize: "12px" }}>모든 기록을 불러왔습니다.</div>}
    </>}
  </section>;
}
