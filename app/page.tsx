"use client";

import { ChangeEvent, FormEvent, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Photo = {
  id: string;
  thumbnailLink: string;
  webViewLink: string;
  fileName: string;
};

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
  photos?: Photo[];
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

function HomeContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"record" | "search" | "history">("record");
  const [form, setForm] = useState(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [results, setResults] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderLookupLoading, setOrderLookupLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ symptoms: string[]; dtcCodes: string[] }>({ symptoms: [], dtcCodes: [] });
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);

  // 1. URL Query Parameter 파싱 및 자동 탭/폼 채우기 로직
  useEffect(() => {
    if (!searchParams) return;

    const orderNo = searchParams.get("orderNo") || searchParams.get("orderId") || "";
    const carNo = searchParams.get("carNo") || searchParams.get("plateNumber") || "";
    const model = searchParams.get("model") || searchParams.get("vehicleType") || "";
    const mileage = searchParams.get("mileage") || "";
    const request = searchParams.get("request") || searchParams.get("symptom") || "";
    const details = searchParams.get("details") || searchParams.get("inspection") || "";
    const searchQuery = searchParams.get("search") || "";

    // 검색 모드로 연결된 경우
    if (searchQuery || (orderNo && searchParams.get("mode") === "search")) {
      const q = searchQuery || orderNo;
      setQuery(q);
      setTab("search");
      executeSearch(q);
      return;
    }

    // 작성/기록 모드로 파라미터가 전달된 경우
    if (orderNo || carNo || model || request || details) {
      setTab("record");
      setForm((prev) => ({
        ...prev,
        orderId: orderNo || prev.orderId,
        plateNumber: carNo || prev.plateNumber,
        vehicleType: model || prev.vehicleType,
        mileage: mileage || prev.mileage,
        symptom: request || prev.symptom,
        inspection: details || prev.inspection
      }));

      // 오더번호만 오고 차량정보가 미비한 경우 자동으로 백엔드 조회 실행
      if (orderNo && (!carNo || !model)) {
        fetchOrderInfo(orderNo);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/suggestions")
      .then((res) => res.json())
      .then((json) => setSuggestions({ symptoms: json.symptoms || [], dtcCodes: json.dtcCodes || [] }))
      .catch(() => {});
  }, []);

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

  // 오더 조회를 공통 함수로 분리
  async function fetchOrderInfo(targetOrderId: string) {
    setOrderLookupLoading(true);
    setStatus("오더 정보를 불러오는 중입니다...");
    try {
      const response = await fetch(`/api/order-lookup?orderId=${encodeURIComponent(targetOrderId)}`);
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

  async function lookupOrder() {
    const orderId = form.orderId.trim();
    if (!orderId) {
      setStatus("오더번호를 먼저 입력해주세요.");
      return;
    }
    fetchOrderInfo(orderId);
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("정비 기록을 저장하는 중입니다...");
    setFailedPhotos([]);

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
    const failed: string[] = [];
    for (const file of photos) {
      try {
        const photoData = new FormData();
        photoData.append("noteId", json.data.id);
        photoData.append("file", file);
        const photoResponse = await fetch("/api/photos/upload", {
          method: "POST",
          body: photoData
        });
        if (photoResponse.ok) {
          uploaded += 1;
        } else {
          let reason = `HTTP ${photoResponse.status}`;
          try {
            const errJson = await photoResponse.json();
            if (errJson?.error) reason = errJson.error;
          } catch {
            // 응답이 JSON이 아니면 상태 코드만 사용
          }
          failed.push(`${file.name} (${reason})`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failed.push(`${file.name} (브라우저 오류: ${message})`);
      }
    }

    setForm(initialForm);
    setPhotos([]);
    setLoading(false);
    setFailedPhotos(failed);

    if (failed.length > 0) {
      setStatus(
        `정비 기록은 저장되었지만, 사진 ${failed.length}장 업로드에 실패했습니다. 아래 사진은 휴대폰에서 삭제하지 마세요.`
      );
    } else {
      setStatus(
        uploaded
          ? `저장되었습니다. 사진 ${uploaded}장도 Google Drive에 올렸습니다.`
          : "저장되었습니다."
      );
    }

    fetch("/api/suggestions")
      .then((res) => res.json())
      .then((j) => setSuggestions({ symptoms: j.symptoms || [], dtcCodes: j.dtcCodes || [] }))
      .catch(() => {});
  }

  // 검색 로직 함수로 분리
  async function executeSearch(searchText: string) {
    if (!searchText.trim()) return;
    setLoading(true);
    setStatus("내 정비 기록을 검색하는 중입니다...");
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchText })
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

  async function searchNotes(event: FormEvent) {
    event.preventDefault();
    executeSearch(query);
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

        {failedPhotos.length > 0 && (
          <div className="status error photo-fail-warning">
            ⚠️ 업로드 실패한 사진: {failedPhotos.join(", ")}
            <br />
            이 사진들은 Google Drive에 저장되지 않았습니다. <strong>휴대폰에서 원본을 삭제하지 마시고</strong>, 잠시 후 정비 기록 수정 화면에서 다시 업로드해주세요.
          </div>
        )}

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
              <SuggestField
                full
                label="증상 *"
                name="symptom"
                value={form.symptom}
                onChange={updateForm}
                onKeyDown={allowNewline}
                placeholder="예: 공회전에서 RPM 헌팅이 발생함"
                suggestions={suggestions.symptoms}
                mode="replace"
              />
              <SuggestField
                full
                label="경고등 / 진단코드"
                name="errorCodes"
                value={form.errorCodes}
                onChange={updateForm}
                onKeyDown={allowNewline}
                placeholder={"엔터로 줄바꿈해서 여러 개 입력 가능합니다.\n예: P008700 연료 레일 압력 낮음\nB00011B 스티어링 진단 오류"}
                suggestions={suggestions.dtcCodes}
                mode="append-line"
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
                <input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    const tooLarge = files.filter((f) => f.size > 4 * 1024 * 1024);
                    const ok = files.filter((f) => f.size <= 4 * 1024 * 1024);
                    setPhotos(ok);
                    if (tooLarge.length > 0) {
                      setStatus(
                        `${tooLarge.map((f) => f.name).join(", ")} 파일은 4MB를 초과해서 제외되었습니다. 사진 앱에서 용량을 줄여 다시 선택해주세요.`
                      );
                    }
                  }}
                />
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

export default function Home() {
  return (
    <Suspense fallback={<div className="shell p-6 text-center">불러오는 중...</div>}>
      <HomeContent />
    </Suspense>
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

function SuggestField({
  label,
  name,
  value,
  onChange,
  onKeyDown,
  placeholder,
  suggestions,
  mode,
  full = false
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  suggestions: string[];
  mode: "replace" | "append-line";
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const lastLine = value.split("\n").pop() || "";
  const queryText = (mode === "append-line" ? lastLine : value).trim().toLowerCase();

  const matches =
    queryText.length > 0
      ? suggestions.filter((s) => s.toLowerCase().includes(queryText) && s.toLowerCase() !== queryText).slice(0, 6)
      : [];

  function select(s: string) {
    if (mode === "replace") {
      onChange({ target: { name, value: s, type: "text" } } as unknown as ChangeEvent<HTMLTextAreaElement>);
    } else {
      const lines = value.split("\n");
      lines[lines.length - 1] = s;
      const next = lines.join("\n") + "\n";
      onChange({ target: { name, value: next, type: "text" } } as unknown as ChangeEvent<HTMLTextAreaElement>);
    }
    setOpen(false);
  }

  return (
    <div className={`field suggest-field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        rows={4}
      />
      {open && matches.length > 0 && (
        <div className="suggest-dropdown">
          {matches.map((s, idx) => (
            <button key={idx} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => select(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function NoteCard({ note }: { note: Note }) {
  // 서버 프록시를 통한 구글 드라이브 이미지 URL 생성 (엑박 완벽 방지)
  const getImageUrl = (photo: Photo) => {
    if (photo.id) {
      return `/api/photos/proxy?fileId=${photo.id}`;
    }
    return photo.thumbnailLink || photo.webViewLink;
  };

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
      {note.photos && note.photos.length > 0 && (
        <div className="photo-thumbs flex gap-2 mt-3 flex-wrap">
          {note.photos.map((photo) => (
            <a
              key={photo.id}
              href={photo.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              title={photo.fileName}
              className="inline-block border rounded overflow-hidden shadow-sm hover:opacity-90 transition"
            >
              <img
                src={getImageUrl(photo)}
                alt={photo.fileName}
                loading="lazy"
                className="w-20 h-20 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (photo.thumbnailLink && target.src !== photo.thumbnailLink) {
                    target.src = photo.thumbnailLink;
                  }
                }}
              />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
