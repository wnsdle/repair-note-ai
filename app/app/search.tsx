'use client';

export default function Search() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-bold mb-4">정비 정보 검색</h2>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="증상을 입력하세요 (예: RPM 헌팅)"
            className="w-full p-3 border border-gray-300 rounded-lg"
          />

          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
            🔍 검색하기
          </button>
        </div>

        <div className="mt-8 text-center text-gray-400">
          <p>검색 결과가 여기에 표시됩니다</p>
        </div>
      </div>
    </div>
  );
}
