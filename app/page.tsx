"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type Note = {
  id: string;
  vehicle_name: string;
  manufacturer: string;
  model: string;
  mileage_or_hours: string;
  symptom: string;
  error_codes: string;
  inspection: string;
  root_cause: string;
  repair_action: string;
  parts_used: string;
  result: string;
  is_resolved: boolean;
  tags: string;
  created_at: string;
};

const initialForm = {
  vehicleName: "",
  manufacturer: "",
  model: "",
  mileage: "",
  symptom: "",
  errorCodes: "",
  inspection: "",
  rootCause: "",
  repairAction: "",
  partsUsed: "",
  result: "",
  isResolved: false,
  tags: ""
};

export default function Home() {
  const [tab, setTab] = useState<"record" | "search" | "history">("record");
  const [form, setForm] = useState(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [results, setResults] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === "history") loadNotes();
  }, [tab]);

  async function loadNotes() {
    setLoading(true);
    const response = await fetch("/api/repair-notes");
    const json = await response.json();
    setLoading(false);
    if (!response.ok) {
      setStatus(json.error || "기록을 불러오지 못했습니다.");
      return;
    }
    setNotes(json.data || []);
  }

  function updateForm(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? (event.target as HTMLInputElement).checked : value
    }));
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("정비 기록을 저장하는 중입니다...");

    const response = await fetch("/api/repair-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await response.json();

    if (!response.ok) {
      setLoading(false);
      setStatus(json.error || "저장하지 못했습니다.");
      return;
    }

    let uploaded = 0;
    for (const file of photos) {
      const photoData = new FormData();
      photoData.append("noteId", json.data.id);
      photoData.append("file", file);
      const photoResponse = await fetch("/api/photos/upload", {
        method: "POST",
        body: photoData
      });
      if (photoResponse.ok) uploaded += 1;
    }

    setForm(initialForm);
    setPhotos([]);
    setLoading(false);
    setStatus(
      uploaded
        ? `저장되었습니다. 사진 ${uploaded}장도 Google Drive에 올렸습니다.`
        : "저장되었습니다. 사진을 올리지 않았다면 정상입니다."
    );
  }

  async function searchNotes(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setStatus("내 정비 기록을 검색하는 중입니다...");
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const json = await response.json();
    setLoading(false);
    if (!response.ok) {
      setStatus(json.error || "검색하지 못했습니다.");
      return;
    }
    setResults(json.data || []);
    setStatus(`내 기록에서 ${json.data?.length || 0}건을 찾았습니다.`);
  }

  return (
    <main className="shell">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark">🔧</div>
            <div>
              <h1>정비노트 AI</h1>
              <p className="subtitle">나의 경험을 저장하고 다시 찾는 정비 기록</p>
            </div>
          </div>
          <nav className="tabs" aria-label="주 메뉴">
            <button className={`tab ${tab === "record" ? "active" : ""}`} onClick={() => setTab("record")}>
              📝 기록하기
            </button>
            <button className={`tab ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}>
              🔍 검색
            </button>
            <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
              📋 기록보기
            </button>
          </nav>
        </div>
      </header>

      <section className="content">
        {status && <div className={`status ${status.includes("못") ? "error" : ""}`}>{status}</div>}

        {tab === "record" && (
          <form className="card" onSubmit={saveNote}>
            <h2 className="section-title">정비 경험 기록</h2>
            <div className="form-grid">
              <Field label="차량명 *" name="vehicleName" value={form.vehicleName} onChange={updateForm} placeholder="예: Volvo FM 450" />
              <Field label="제조사" name="manufacturer" value={form.manufacturer} onChange={updateForm} placeholder="예: Volvo" />
              <Field label="모델" name="model" value={form.model} onChange={updateForm} placeholder="예: FM 450" />
              <Field label="주행거리 / 사용시간" name="mileage" value={form.mileage} onChange={updateForm} placeholder="예: 384,000 km" />
              <Field full label="증상 *" name="symptom" value={form.symptom} onChange={updateForm} placeholder="예: 공회전에서 RPM 헌팅이 발생함" />
              <Field full label="고장코드 / 진단기 결과" name="errorCodes" value={form.errorCodes} onChange={updateForm} placeholder="예: P0087" />
              <Field full label="점검한 항목" name="inspection" value={form.inspection} onChange={updateForm} multiline placeholder="어떤 부위를 어떤 방법으로 점검했는지 적어주세요." />
              <Field full label="실제 원인" name="rootCause" value={form.rootCause} onChange={updateForm} multiline placeholder="최종적으로 확인한 원인" />
              <Field full label="조치 내용" name="repairAction" value={form.repairAction} onChange={updateForm} multiline placeholder="수리하거나 교환한 내용을 적어주세요." />
              <Field full label="사용 부품" name="partsUsed" value={form.partsUsed} onChange={updateForm} placeholder="부품명, 품번 등" />
              <Field full label="조치 후 결과" name="result" value={form.result} onChange={updateForm} multiline placeholder="증상이 해결되었는지, 재발했는지" />
              <Field full label="검색 태그" name="tags" value={form.tags} onChange={updateForm} placeholder="예: RPM헌팅, 연료압력, 인젝터" />
              <div className="field full">
                <label htmlFor="photos">정비 사진</label>
                <input id="photos" type="file" accept="image/*" multiple onChange={(event) => setPhotos(Array.from(event.target.files || []))} />
                <p className="hint">사진은 Google Drive 전용 폴더에 저장됩니다. 사진 1장당 10MB 이하입니다.</p>
              </div>
              <label className="field full">
                <span>
                  <input name="isResolved" type="checkbox" checked={form.isResolved} onChange={updateForm} /> 해결된 정비 사례입니다
                </span>
              </label>
            </div>
            <div className="actions">
              <button className="primary" type="submit" disabled={loading}>저장하기</button>
              <button className="secondary" type="button" onClick={() => { setForm(initialForm); setPhotos([]); setStatus(""); }}>초기화</button>
            </div>
          </form>
        )}

        {tab === "search" && (
          <section className="card">
            <h2 className="section-title">내 정비 경험 검색</h2>
            <form onSubmit={searchNotes}>
              <div className="field">
                <label htmlFor="query">증상, 차량, 고장코드를 입력하세요</label>
                <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: Volvo FM 450 RPM 헌팅" />
              </div>
              <div className="actions">
                <button className="primary" type="submit" disabled={loading}>🔍 검색하기</button>
              </div>
            </form>
            <div>
              {results.length === 0 ? <div className="empty">검색 결과가 여기에 표시됩니다.</div> : results.map((note) => <NoteCard key={note.id} note={note} />)}
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="card">
            <h2 className="section-title">저장된 정비 기록</h2>
            {loading ? <div className="empty">불러오는 중입니다...</div> : notes.length === 0 ? <div className="empty">저장된 기록이 없습니다.<br />기록하기 탭에서 첫 정비 경험을 추가해보세요.</div> : notes.map((note) => <NoteCard key={note.id} note={note} />)}
          </section>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  multiline = false,
  full = false
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  multiline?: boolean;
  full?: boolean;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      {multiline ? <textarea id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} /> : <input id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} />}
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const vehicle = [note.manufacturer, note.model].filter(Boolean).join(" ");
  return (
    <article className="record">
      <div className="record-head">
        <div>
          <h3>{note.vehicle_name || vehicle || "차량 정보 없음"}</h3>
          <p className="muted">{new Date(note.created_at).toLocaleString("ko-KR")}</p>
        </div>
        {note.is_resolved && <span className="badge">해결됨</span>}
      </div>
      <p><strong>증상:</strong> {note.symptom}</p>
      {note.root_cause && <p><strong>원인:</strong> {note.root_cause}</p>}
      {note.repair_action && <p><strong>조치:</strong> {note.repair_action}</p>}
      {note.result && <p><strong>결과:</strong> {note.result}</p>}
      {note.tags && <p className="muted">#{note.tags.split(",").join(" #")}</p>}
    </article>
  );
}