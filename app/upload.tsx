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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Supabase 또는 백엔드 API 호출을 통한 저장 로직 구현
    console.log({
      orderNo,
      carNo,
      model,
      mileage,
      customerName,
      phone,
      repairDate,
      request,
      details,
    });
    alert('정비 기록 저장 로직을 연결해 주세요.');
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

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            정비 노트 저장하기
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
