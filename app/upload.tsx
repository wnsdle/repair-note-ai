'use client';

export default function Upload() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-bold mb-4">정비 기록 추가</h2>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="차량명 입력 (예: Volvo FM 450)"
            className="w-full p-3 border border-gray-300 rounded-lg"
          />

          <input
            type="text"
            placeholder="증상 입력 (예: RPM 헌팅)"
            className="w-full p-3 border border-gray-300 rounded-lg"
          />

          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
