"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type Note = {
  id: string;
  vehicle_type: string;
  model_year: string;
  mileage_or_hours: string;
  order_id: string;
  plate_number: string;
  symptom: string;
  dtc_codes: string[];
  inspection: string;
  cause: string;
  created_at: string;
};

const initialForm = {
  vehicleType: "",
  modelYear: "",
  mileage: "",
  orderId: "",
  plateNumber: "",
  symptom: "",
  errorCodes: "",
  inspection: "",
  rootCause: ""
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
  const [orderLookupLoading, setOrderLookupLoading] = useState(false);

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
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  /** 엔터키로 다음 입력칸으로 넘어가지 않고, 그 칸 안에서 줄바꿈만 되도록 처리 (여러 줄 입력용) */
  function allowNewline(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      event.stopPropagation();
    }
  }

  async function lookupOrder() {
    const orderId = form.orderId.trim();
    if (!orderId) {
      setStatus("오더번호를 먼저 입력해주세요.");
      return;
    }
    setOrderLookupLoading(true);
    setStatus("오더 정보를 불러오는 중입니다...");
    try {
      const response = await fetch(`/api/order-lookup?orderId=${encodeURIComponent(orderId)}`);
      const json = await response.json();
      if (!response.ok) {
        setStatus(json.error || "오더 정보를 찾지 못했습니다.");
        return;
      }
      setForm((current) => ({
        ...current,
        plateNumber: json.data.plateNumber || current.plateNumber,
        vehicleType: json.data.vehicleType || current.vehicleType
      }));
      setStatus(`오더 정보를 불러왔습니다. (차량번호: ${json.data.plateNumber || "-"})`);
    } catch {
      setStatus("오더 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setOrderLookupLoading(false);
    }
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
        : "저장되었습니다."
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
        {status && <div className={`status ${status.includes("못") || status.includes("오류") ? "error" : ""}`}>{status}</div>}

        {tab === "record" && (
          <form className="card" onSubmit={saveNote}>
            <h2 className="section-title">정비 경험 기록</h2>

            <div className="field full order-lookup-row">
              <label htmlFor="orderId">오더번호 (선택)</label>
              <div className="order-lookup-inline">
                <input
                  id="orderId"
                  name="orderId"
                  value={form.orderId}
                  onChange={updateForm}
                  placeholder="예: ORD-20260902-001"
                />
                <button type="button" className="secondary" onClick={lookupOrder} disabled={orderLookupLoading}>
                  {orderLookupLoading ? "불러오는 중..." : "불러오기"}
                </button>
              </div>
              <p className="hint">정비소 관리 웹 오더번호를 입력하면 차량번호·차종이 자동으로 채워집니다.</p>
            </div>

            <div className="form-grid">
              <Field label="차량번호" name="plateNumber" value={form.plateNumber} onChange={updateForm} placeholder="예: 12가3456" />
              <Field label="차량형식" name="vehicleType" value={form.vehicleType} onChange={updateForm} placeholder="예: FM 460" />
              <Field label="연식" name="modelYear" value={form.modelYear} onChange={updateForm} placeholder="예: 2021" />
              <Field label="주행거리 / 사용시간" name="mileage" value={form.mileage} onChange={updateForm} placeholder="예: 384,000 km" />
              <Field
                full
                label="증상 *"
                name="symptom"
                value={form.symptom}
                onChange={updateForm}
                onKeyDown={allowNewline}
                multiline
                placeholder="예: 공회전에서 RPM 헌팅이 발생함"
              />
              <Field
                full
                label="경고등 / 진단코드"
                name="errorCodes"
                value={form.errorCodes}
                onChange={updateForm}
                onKeyDown={allowNewline}
                multiline
                placeholder={"엔터로 줄바꿈해서 여러 개 입력 가능합니다.\n예: P008700 연료 레일 압력 낮음\nB00011B 스티어링 진단 오류"}
              />
              <Field
                full
                label="점검내용"
                name="inspection"
                value={form.inspection}
                onChange={updateForm}
                onKeyDown={allowNewline}
                multiline
                placeholder="어떤 부위를 어떤 방법으로 점검했는지 적어주세요."
              />
              <Field
                full
                label="원인"
                name="rootCause"
                value={form.rootCause}
                onChange={updateForm}
                onKeyDown={allowNewline}
                multiline
                placeholder="확인한 원인 또는 조치 내용을 적어주세요."
              />
              <div className="field full">
                <label htmlFor="photos">정비 사진</label>
                <input id="photos" type="file" accept="image/*" multiple onChange={(event) => setPhotos(Array.from(event.target.files || []))} />
                <p className="hint">사진은 Google Drive 전용 폴더에 저장됩니다. 사진 1장당 10MB 이하입니다.</p>
              </div>
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
                <label htmlFor="query">증상, 경고등, 차량번호, 오더번호로 검색</label>
                <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: RPM 헌팅 또는 P0087 또는 12가3456" />
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
  onKeyDown,
  placeholder,
  multiline = false,
  full = false
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  multiline?: boolean;
  full?: boolean;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      {multiline ? (
        <textarea id={name} name={name} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} rows={4} />
      ) : (
        <input id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} />
      )}
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <article className="record">
      <div className="record-head">
        <div>
          <h3>{note.vehicle_type || "차량형식 미입력"}{note.plate_number ? ` · ${note.plate_number}` : ""}</h3>
          <p className="muted">
            {note.model_year ? `${note.model_year}년식 · ` : ""}
            {note.mileage_or_hours ? `${note.mileage_or_hours} · ` : ""}
            {new Date(note.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
      </div>
      <p><strong>증상:</strong> {note.symptom}</p>
      {note.dtc_codes && note.dtc_codes.length > 0 && (
        <div className="dtc-list">
          <strong>경고등/진단코드:</strong>
          <ul>
            {note.dtc_codes.map((code, idx) => (
              <li key={idx}>{code}</li>
            ))}
          </ul>
        </div>
      )}
      {note.inspection && <p><strong>점검내용:</strong> {note.inspection}</p>}
      {note.cause && <p><strong>원인:</strong> {note.cause}</p>}
      {note.order_id && <p className="muted">오더번호: {note.order_id}</p>}
    </article>
  );
}
