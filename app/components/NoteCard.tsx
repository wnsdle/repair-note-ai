import { Note } from "../types";

export default function NoteCard({ note, onEdit, onDelete }: { note: Note; onEdit?: (note: Note) => void; onDelete?: (id: string) => void }) {
  const folderUrl = note.drive_folder_url || (note.photos && note.photos.length > 0 ? note.photos[0].webViewLink : null);
  return (
    <article className="record">
      <div className="record-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>{note.vehicle_type || "차량형식 미입력"}{note.plate_number ? ` · ${note.plate_number}` : ""}</h3>
            {note.matchType === "semantic" && <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">🔍 비슷한 기록</span>}
          </div>
          <p className="muted">{note.model_year ? `${note.model_year}년식 · ` : ""}{note.mileage_or_hours ? `${note.mileage_or_hours} · ` : ""}{new Date(note.created_at).toLocaleString("ko-KR")}</p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          {onEdit && <button type="button" onClick={() => onEdit(note)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold transition" style={{ whiteSpace: "nowrap" }}>✏️ 수정</button>}
          {onDelete && <button type="button" onClick={() => onDelete(note.id)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition border border-red-200" style={{ whiteSpace: "nowrap" }}>🗑 삭제</button>}
        </div>
      </div>
      <p><strong>증상:</strong> {note.symptom}</p>
      {note.dtc_codes && note.dtc_codes.length > 0 && <div className="dtc-list"><strong>경고등/진단코드:</strong><ul>{note.dtc_codes.map((code, idx) => <li key={idx}>{code}</li>)}</ul></div>}
      {note.inspection && <p><strong>점검내용:</strong> {note.inspection}</p>}
      {note.cause && <p><strong>원인:</strong> {note.cause}</p>}
      {note.order_id && <p className="muted">오더번호: {note.order_id}</p>}
      {folderUrl && <div className="mt-3 pt-2 border-t border-gray-100"><a href={folderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition"><span>📁</span><span>정비 사진 드라이브 폴더 열기</span><span className="text-xs text-blue-500">↗</span></a></div>}
    </article>
  );
}
