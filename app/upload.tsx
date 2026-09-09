'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UploadContent() {
  const searchParams = useSearchParams();

  // 폼 상태 정의
  const [orderNo, setOrderNo] = useState('');
  const [carNo, setCarNo] = useState('');
  const [model, setModel] = useState('');
  const [mileage, setMileage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [repairDate, setRepairDate] = useState('');
  const [request, setRequest] = useState('');
  const [details, setDetails] = useState('');

  // 💡 사진 업로드 및 메세지 상태 추가
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // URL Query Parameter에서 전달된 값 자동 세팅
  useEffect(() => {
    if (!searchParams) return;

    setOrderNo(searchParams.get('orderNo') || '');
    setCarNo(searchParams.get('carNo') || '');
    setModel(searchParams.get('model') || '');
    setMileage(searchParams.get('mileage') || '');
    setCustomerName(searchParams.get('customerName') || '');
    setPhone(searchParams.get('phone') || '');
    setRepairDate(searchParams.get('repairDate') || '');
    setRequest(searchParams.get('request') || '');
    setDetails(searchParams.get('details') || '');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setStatusMessage('정비 노트 및 사진을 업로드하는 중입니다...');
    setErrorMessage(null);

    try {
      // TODO: 1. Supabase에 정비 기록(Note) 먼저 생성/저장 후 noteId 받아오기
      // 예시 ID (실제 Supabase 저장 후 넘어온 note.id를 사용해야 합니다)
      const noteId = 'sample-note-id';

      // 2. 사진 파일이 선택되어 있다면 구글 드라이브 업로드 API 호출
      if (selectedFile) {
        const formData = new FormData();
        formData.append('noteId', noteId);
        formData.append('file', selectedFile);

        const uploadRes = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || '구글 드라이브 업로드 실패');
        }
      }

      setStatusMessage('✅ 정비 노트 및 사진 업로드가 성공적으로 완료되었습니다!');
      setErrorMessage(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`❌ 오류 발생: ${err.message}`);
      setStatusMessage(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-lg p-6 shadow">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <h2 className="text-xl font-bold text-gray-800">정비 노트 신규 작성</h2>
          {orderNo && (
            <span className="text-xs bg-blue-100 text-blue-800 font-mono px-2.5 py-1 rounded-full">
              오더번호: {orderNo}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 차량 정보 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">차량번호</label>
              <input
                type="text"
                value={carNo}
                onChange={(e) => setCarNo(e.target.value)}
                placeholder="예: 12가 3456"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">차종/모델</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="예: Volvo FH 540"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">고객명</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="고객 이름"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">연락처</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">주행거리 (km)</label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="예: 150000"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">정비 일자</label>
            <input
              type="date"
              value={repairDate}
              onChange={(e) => setRepairDate(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* 증상 및 요청사항 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">고객 요청사항 / 증상</label>
            <textarea
              rows={2}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="예: RPM 헌팅 현상 및 정비 경고등 점등"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* 작업 내용 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">작업 상세 내용</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="예: 인젝터 점검 및 교환 완료"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* 💡 정비 사진 첨부 입력칸 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">정비 사진 첨부 (구글 드라이브 자동 저장)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* 💡 [저장] 버튼 바로 위: 성공 / 에러 메시지 표시 영역 */}
          <div className="space-y-2 pt-2">
            {statusMessage && (
              <div className="p-3 text-sm rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                {statusMessage}
              </div>
            )}
            {errorMessage && (
              <div className="p-3 text-sm rounded-lg bg-red-50 text-red-800 border border-red-200 font-medium whitespace-pre-line">
                {errorMessage}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {isUploading ? '저장 및 업로드 중...' : '정비 노트 저장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Upload() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500">불러오는 중...</div>}>
      <UploadContent />
    </Suspense>
  );
}
