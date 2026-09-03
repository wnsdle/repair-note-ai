'use client';

export default function History() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-bold mb-4">저장된 정비 기록</h2>

        <div className="text-center text-gray-400 py-8">
          <p className="text-4xl mb-2">📋</p>
          <p>저장된 기록이 없습니다</p>
          <p className="text-sm mt-2">
            "기록하기" 탭에서 정비 내용을 추가하세요
          </p>
        </div>
      </div>
    </div>
  );
}
