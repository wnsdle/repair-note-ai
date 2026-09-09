"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Photo = {
  id: string;
  fileName: string;
  webViewLink: string;
  thumbnailLink?: string;
};

// 통합된 단일 Note 타입 선언 (중복 완전 제거)
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
  drive_folder_url?: string;
  photos?: Photo[];
  // 💡 검색 결과에서만 쓰임: "keyword"(정확히 일치) / "semantic"(의미가 비슷함)
  matchType?: "keyword" | "semantic";
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

// 💡 기존 기록(Note)을 수정 폼 값으로 변환
function noteToForm(note: Note) {
  return {
    vehicleType: note.vehicle_type || "",
    modelYear: note.model_year || "",
    mileage: note.mileage_or_hours || "",
    orderId: note.order_id || "",
    plateNumber: note.plate_number || "",
    symptom: note.symptom || "",
    errorCodes: (note.dtc_codes || []).join("\n"),
    inspection: note.inspection || "",
    rootCause: note.cause || ""
  };
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"record" | "search" | "history">("record");
  const [form, setForm] = useState(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [results, setResults] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  // 💡 저장/수정 버튼 바로 위에만 뜨는 전용 상태 메시지
  const [saveStatus, setSaveStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderLookupLoading, setOrderLookupLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ symptoms: string[]; dtcCodes: string[] }>({ symptoms: [], dtcCodes: [] });
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);
  // 💡 현재 수정 중인 기록의 id (없으면 신규 작성 모드)
  const [editingId, setEditingId] = useState<string | null>(null);
  // 💡 음성메모 녹음/분석 관련 상태
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voicePreview, setVoicePreview] = useState<{
    transcript: string;
    symptom: string;
    errorCodes: string;
    inspection: string;
    cause: string;
  } | null>(null);
  // 💡 작업지시서 사진 분석 관련 상태
  const [workOrderLoading, setWorkOrderLoading] = useState(false);
  const [workOrderError, setWorkOrderError] = useState("");
  const [workOrderPreview, setWorkOrderPreview] = useState<{
    orderId: string;
    plateNumber: string;
    vehicleType: string;
    modelYear: string;
    mileage: string;
    symptom: string;
  } | null>(null);
  // 💡 AI 진단(내 경험 + 인터넷 검색 + AI 판단) 관련 상태
  const [diagnosis, setDiagnosis] = useState<{ text: string } | null>(null);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);


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

  // 💡 음성메모 녹음 시작
  async function startVoiceRecording() {
    setVoiceError("");
    setVoicePreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        uploadVoiceNote(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      setVoiceError("마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.");
    }
  }

  // 💡 음성메모 녹음 중지 → 녹음이 끝나면 자동으로 서버에 업로드/분석 요청
  function stopVoiceRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function uploadVoiceNote(blob: Blob) {
    setVoiceLoading(true);
    setVoiceError("");
    try {
      const formData = new FormData();
      formData.append("file", blob, "voice-note.webm");
      const response = await fetch("/api/voice-note", { method: "POST", body: formData });
      const json = await response.json();
      if (!response.ok) {
        setVoiceError(json.error || "음성메모를 분석하지 못했습니다.");
        return;
      }
      setVoicePreview(json);
    } catch {
      setVoiceError("음성메모 처리 중 오류가 발생했습니다.");
    } finally {
      setVoiceLoading(false);
    }
  }

  // 💡 미리보기에서 "폼에 적용" 눌렀을 때: 빈 값이 아닌 항목만 기존 내용 뒤에 이어붙임
  function applyVoicePreview() {
    if (!voicePreview) return;
    setForm((current) => ({
      ...current,
      symptom: voicePreview.symptom ? [current.symptom, voicePreview.symptom].filter(Boolean).join("\n") : current.symptom,
      errorCodes: voicePreview.errorCodes
        ? [current.errorCodes, voicePreview.errorCodes].filter(Boolean).join("\n")
        : current.errorCodes,
      inspection: voicePreview.inspection
        ? [current.inspection, voicePreview.inspection].filter(Boolean).join("\n")
        : current.inspection,
      cause: voicePreview.cause ? [current.cause, voicePreview.cause].filter(Boolean).join("\n") : current.cause
    }));
    setVoicePreview(null);
  }

  // 💡 작업지시서 사진 업로드 → 분석
  async function handleWorkOrderPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // 같은 파일 다시 선택 가능하도록 초기화
    if (!file) return;

    setWorkOrderLoading(true);
    setWorkOrderError("");
    setWorkOrderPreview(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse-work-order", { method: "POST", body: formData });
      const json = await response.json();
      if (!response.ok) {
        setWorkOrderError(json.error || "작업지시서를 분석하지 못했습니다.");
        return;
      }
      setWorkOrderPreview(json);
    } catch {
      setWorkOrderError("작업지시서 처리 중 오류가 발생했습니다.");
    } finally {
      setWorkOrderLoading(false);
    }
  }

  // 💡 작업지시서 미리보기에서 "폼에 적용": 빈 값이 아닌 항목만 기존 값을 덮어씀
  function applyWorkOrderPreview() {
    if (!workOrderPreview) return;
    setForm((current) => ({
      ...current,
      orderId: workOrderPreview.orderId || current.orderId,
      plateNumber: workOrderPreview.plateNumber || current.plateNumber,
      vehicleType: workOrderPreview.vehicleType || current.vehicleType,
      modelYear: workOrderPreview.modelYear || current.modelYear,
      mileage: workOrderPreview.mileage || current.mileage,
      symptom: workOrderPreview.symptom ? [current.symptom, workOrderPreview.symptom].filter(Boolean).join("\n") : current.symptom
    }));
    setWorkOrderPreview(null);
  }

  // 💡 기록보기/검색 결과의 "수정" 버튼을 누르면 실행됨
  function startEdit(note: Note) {
    setEditingId(note.id);
    setForm(noteToForm(note));
    setPhotos([]);
    setSaveStatus("");
    setFailedPhotos([]);
    setTab("record");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // 💡 수정 모드를 취소하고 새 기록 작성 상태로 되돌림
  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setPhotos([]);
    setSaveStatus("");
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault();
    const isEditing = Boolean(editingId);
    setLoading(true);
    setSaveStatus(isEditing ? "정비 기록을 수정하는 중입니다..." : "정비 기록을 저장하는 중입니다...");
    setFailedPhotos([]);

    const response = await fetch("/api/repair-notes", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEditing ? { ...form, id: editingId } : form)
    });

    const json = await response.json();

    if (!response.ok) {
      setLoading(false);
      setSaveStatus(json.error || (isEditing ? "수정하지 못했습니다." : "저장하지 못했습니다."));
      return;
    }

    const noteId = isEditing ? (editingId as string) : json.data.id;

    let uploaded = 0;
    const failed: string[] = [];
    for (const file of photos) {
      try {
        const photoData = new FormData();
        photoData.append("noteId", noteId);
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
    setEditingId(null);
    setLoading(false);
    setFailedPhotos(failed);

    if (failed.length > 0) {
      setSaveStatus(
        `정비 기록은 ${isEditing ? "수정" : "저장"}되었지만, 사진 ${failed.length}장 업로드에 실패했습니다. 아래 사진은 휴대폰에서 삭제하지 마세요.`
      );
    } else {
      setSaveStatus(
        uploaded
          ? `${isEditing ? "수정" : "저장"}되었습니다. 사진 ${uploaded}장도 Google Drive에 올렸습니다.`
          : isEditing
          ? "수정되었습니다."
          : "저장되었습니다."
      );
    }

    // 방금 수정한 내용이 기록보기 목록에도 바로 반영되도록 갱신
    if (isEditing) {
      loadNotes();
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
    setDiagnosis(null);
    setDiagnosisError("");

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

    // 💡 내 기록 검색과 별개로, 인터넷 검색 + AI 판단은 시간이 더 걸리므로 백그라운드로 이어서 요청합니다.
    setDiagnosisLoading(true);
    fetch("/api/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchText })
    })
      .then(async (res) => {
        const j = await res.json();
        if (!res.ok) {
          setDiagnosisError(j.error || "AI 진단을 가져오지 못했습니다.");
          return;
        }
        setDiagnosis({ text: j.text });
      })
      .catch(() => setDiagnosisError("AI 진단 중 오류가 발생했습니다."))
      .finally(() => setDiagnosisLoading(false));
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
            <div className="flex items-center justify-between">
              <h2 className="section-title">{editingId ? "정비 기록 수정" : "정비 경험 기록"}</h2>
              {editingId && (
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full">
                  ✏️ 수정 중
                </span>
              )}
            </div>

            {/* 💡 음성메모 / 작업지시서 사진으로 빠르게 채우기 */}
            <div
              className="field full"
              style={{ display: "flex", gap: "8px", flexWrap: "wrap", padding: "10px", background: "#f8fafc", borderRadius: "10px" }}
            >
              <button
                type="button"
                className={isRecording ? "primary" : "secondary"}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={voiceLoading}
              >
                {voiceLoading
                  ? "🎤 분석 중..."
                  : isRecording
                  ? `⏹ 녹음 중지 (${recordSeconds}초)`
                  : "🎤 음성메모로 기록"}
              </button>

              <label className="secondary" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", padding: "8px 14px" }}>
                {workOrderLoading ? "📷 분석 중..." : "📷 작업지시서 사진으로 채우기"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleWorkOrderPhoto}
                  disabled={workOrderLoading}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {voiceError && <p className="status error">{voiceError}</p>}
            {voicePreview && (
              <div className="field full" style={{ padding: "10px", background: "#f5f3ff", borderRadius: "10px", border: "1px solid #ddd6fe" }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "13px" }}>🎤 음성 인식 결과 (확인 후 적용하세요)</p>
                <p className="muted" style={{ fontSize: "12px", marginBottom: "6px" }}>"{voicePreview.transcript}"</p>
                {voicePreview.symptom && <p style={{ fontSize: "13px" }}><strong>증상:</strong> {voicePreview.symptom}</p>}
                {voicePreview.errorCodes && <p style={{ fontSize: "13px" }}><strong>진단코드:</strong> {voicePreview.errorCodes}</p>}
                {voicePreview.inspection && <p style={{ fontSize: "13px" }}><strong>점검내용:</strong> {voicePreview.inspection}</p>}
                {voicePreview.cause && <p style={{ fontSize: "13px" }}><strong>원인:</strong> {voicePreview.cause}</p>}
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button type="button" className="primary" onClick={applyVoicePreview}>✅ 폼에 적용</button>
                  <button type="button" className="secondary" onClick={() => setVoicePreview(null)}>취소</button>
                </div>
              </div>
            )}

            {workOrderError && <p className="status error">{workOrderError}</p>}
            {workOrderPreview && (
              <div className="field full" style={{ padding: "10px", background: "#eff6ff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "13px" }}>📷 작업지시서 인식 결과 (확인 후 적용하세요)</p>
                {workOrderPreview.orderId && <p style={{ fontSize: "13px" }}><strong>오더번호:</strong> {workOrderPreview.orderId}</p>}
                {workOrderPreview.plateNumber && <p style={{ fontSize: "13px" }}><strong>차량번호:</strong> {workOrderPreview.plateNumber}</p>}
                {workOrderPreview.vehicleType && <p style={{ fontSize: "13px" }}><strong>차종:</strong> {workOrderPreview.vehicleType}</p>}
                {workOrderPreview.modelYear && <p style={{ fontSize: "13px" }}><strong>연식:</strong> {workOrderPreview.modelYear}</p>}
                {workOrderPreview.mileage && <p style={{ fontSize: "13px" }}><strong>주행거리:</strong> {workOrderPreview.mileage}</p>}
                {workOrderPreview.symptom && <p style={{ fontSize: "13px" }}><strong>요청사항:</strong> {workOrderPreview.symptom}</p>}
                {!workOrderPreview.orderId &&
                  !workOrderPreview.plateNumber &&
                  !workOrderPreview.vehicleType &&
                  !workOrderPreview.modelYear &&
                  !workOrderPreview.mileage &&
                  !workOrderPreview.symptom && <p className="muted" style={{ fontSize: "13px" }}>인식된 정보가 없습니다. 사진을 더 선명하게 다시 찍어주세요.</p>}
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button type="button" className="primary" onClick={applyWorkOrderPreview}>✅ 폼에 적용</button>
                  <button type="button" className="secondary" onClick={() => setWorkOrderPreview(null)}>취소</button>
                </div>
              </div>
            )}

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
                      setSaveStatus(
                        `${tooLarge.map((f) => f.name).join(", ")} 파일은 4MB를 초과해서 제외되었습니다. 사진 앱에서 용량을 줄여 다시 선택해주세요.`
                      );
                    }
                  }}
                />
                <p className="hint">사진은 Google Drive 전용 폴더에 저장됩니다. 사진 1장당 10MB 이하입니다.</p>
                {editingId && (
                  <p className="hint">
                    ※ 수정 화면에서 사진을 새로 첨부하면 기존 폴더에 추가로 업로드됩니다. 기존 사진은 그대로 유지돼요.
                  </p>
                )}
              </div>
            </div>

            {/* 💡 저장/수정 버튼 바로 위: 성공/실패 메시지 표시 영역 */}
            {saveStatus && (
              <div className={`status ${saveStatus.includes("못") || saveStatus.includes("오류") || saveStatus.includes("초과") ? "error" : ""}`}>
                {saveStatus}
              </div>
            )}

            <div className="actions">
              <button className="primary" type="submit" disabled={loading}>
                {loading ? (editingId ? "수정 중..." : "저장 중...") : editingId ? "수정 완료" : "저장하기"}
              </button>
              <button
                className="secondary"
                type="button"
                onClick={
                  editingId
                    ? cancelEdit
                    : () => {
                        setForm(initialForm);
                        setPhotos([]);
                        setSaveStatus("");
                      }
                }
              >
                {editingId ? "수정 취소" : "초기화"}
              </button>
            </div>
          </form>
        )}

        {tab === "search" && (
          <section className="card">
            <h2 className="section-title">내 정비 경험 검색</h2>
            <form onSubmit={searchNotes}>
              <div className="field">
                <label htmlFor="query">증상을 자세히 적어주세요</label>
                <textarea
                  id="query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="예: 시동이 걸릴듯 안걸릴듯 하다가 안걸림. 스타트모터는 정상 작동함"
                  rows={4}
                />
                <p className="hint">
                  자세히 적을수록 정확해요. 내 기록 중 비슷한 경험을 찾고, AI가 그 기록과 자체 지식을 참고해서 원인/점검순서를 함께 제안해드려요.
                </p>
              </div>
              <div className="actions">
                <button className="primary" type="submit" disabled={loading}>🔍 검색하기</button>
              </div>
            </form>

            {/* 💡 AI 진단 결과: 내 기록 + 인터넷 검색을 참고한 AI의 원인/점검순서 제안 */}
            {(diagnosisLoading || diagnosis || diagnosisError) && (
              <div className="ai-diagnosis-box" style={{ marginTop: "16px", padding: "14px", background: "#f5f3ff", borderRadius: "10px", border: "1px solid #ddd6fe" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>🤖 AI 진단 결과 (내 정비 기록 + AI 지식 기반, 인터넷 검색 없음)</h3>
                {diagnosisLoading && <p className="muted">AI가 비슷한 내 정비 기록을 참고해서 원인을 분석하는 중입니다...</p>}
                {diagnosisError && <p className="status error">{diagnosisError}</p>}
                {diagnosis && (
                  <>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{diagnosis.text}</div>
                    <p className="muted" style={{ marginTop: "8px", fontSize: "12px" }}>
                      ⚠️ 인터넷 검색 없이, 내 정비 기록과 AI의 일반 지식만으로 만든 참고용 진단입니다. 실제 점검/조치는 정비사의 판단으로 최종 확인해주세요.
                    </p>
                  </>
                )}
              </div>
            )}

            <div>
              <h3 className="section-title" style={{ marginTop: "18px", fontSize: "15px" }}>내 정비 기록</h3>
              {results.length === 0 ? (
                <div className="empty">검색 결과가 여기에 표시됩니다.</div>
              ) : (
                results.map((note) => <NoteCard key={note.id} note={note} onEdit={startEdit} />)
              )}
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="card">
            <h2 className="section-title">저장된 정비 기록</h2>
            {loading ? (
              <div className="empty">불러오는 중입니다...</div>
            ) : notes.length === 0 ? (
              <div className="empty">
                저장된 기록이 없습니다.
                <br />
                기록하기 탭에서 첫 정비 경험을 추가해보세요.
              </div>
            ) : (
              notes.map((note) => <NoteCard key={note.id} note={note} onEdit={startEdit} />)
            )}
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

// 💡 onEdit prop 추가: 전달되면 카드 우측 상단에 "수정" 버튼이 표시됨
function NoteCard({ note, onEdit }: { note: Note; onEdit?: (note: Note) => void }) {
  // 웹에서 1장 이상 올렸거나, DB에 폴더 링크가 존재할 경우
  const folderUrl =
    note.drive_folder_url ||
    (note.photos && note.photos.length > 0 ? note.photos[0].webViewLink : null);

  return (
    <article className="record">
      <div className="record-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>
              {note.vehicle_type || "차량형식 미입력"}
              {note.plate_number ? ` · ${note.plate_number}` : ""}
            </h3>
            {note.matchType === "semantic" && (
              <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                🔍 비슷한 기록
              </span>
            )}
          </div>
          <p className="muted">
            {note.model_year ? `${note.model_year}년식 · ` : ""}
            {note.mileage_or_hours ? `${note.mileage_or_hours} · ` : ""}
            {new Date(note.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold transition"
            style={{ whiteSpace: "nowrap" }}
          >
            ✏️ 수정
          </button>
        )}
      </div>

      <p>
        <strong>증상:</strong> {note.symptom}
      </p>

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

      {note.inspection && (
        <p>
          <strong>점검내용:</strong> {note.inspection}
        </p>
      )}

      {note.cause && (
        <p>
          <strong>원인:</strong> {note.cause}
        </p>
      )}

      {note.order_id && <p className="muted">오더번호: {note.order_id}</p>}

      {/* 폴더가 생성되어 링크가 있는 경우에만 표시 */}
      {folderUrl && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <a
            href={folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition"
          >
            <span>📁</span>
            <span>정비 사진 드라이브 폴더 열기</span>
            <span className="text-xs text-blue-500">↗</span>
          </a>
        </div>
      )}
    </article>
  );
}
