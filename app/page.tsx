'use client';

import { useState } from 'react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'search' | 'history'>('upload');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-600 rounded-lg p-2">
              <span className="text-white text-xl">🔧</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">정비 노트 AI</h1>
              <p className="text-xs text-gray-500">Volvo 트럭 정비 기록 시스템</p>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-1 font-semibold text-sm transition relative ${
                activeTab === 'upload'
                  ? 'text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              <span className="flex items-center gap-1">
                📝 기록하기
              </span>
              {activeTab === 'upload' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`pb-3 px-1 font-semibold text-sm transition relative ${
                activeTab === 'search'
                  ? 'text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              <span className="flex items-center gap-1">
                🔍 검색
              </span>
              {activeTab === 'search' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 px-1 font-semibold text-sm transition relative ${
                activeTab === 'history'
                  ? 'text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              <span className="flex items-center gap-1">
                📋 기록보기
              </span>
              {activeTab === 'history' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600"></div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-4 pb-24">
        {/* 탭 1: 기록하기 */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            {/* 차량 정보 카드 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-6">정비 정보 입력</h2>

              <div className="space-y-4">
                {/* 차량명 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    차량명 *
                  </label>
                  <input
                    type="text"
                    placeholder="예: Volvo FM 450"
                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* 증상 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    증상 / 이상 징후
                  </label>
                  <input
                    type="text"
                    placeholder="예: RPM 헌팅, 캠축 회전 이상음"
                    className="w-full p-3 border border-gray-300 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* 음성 녹음 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    음성 기록
                  </label>
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center bg-blue-50">
                    <div className="text-4xl mb-2">🎤</div>
                    <p className="text-sm text-gray-600 font-semibold">음성 녹음 (준비 중)</p>
                    <p className="text-xs text-gray-500 mt-1">30초 이상 가능</p>
                  </div>
                </div>

                {/* 사진 업로드 */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    정비 사진
                  </label>
                  <div className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center bg-green-50">
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-sm text-gray-600 font-semibold">사진 업로드 (준비 중)</p>
                    <p className="text-xs text-gray-500 mt-1">최대 5장</p>
                  </div>
                </div>

                {/* 저장 버튼 */}
                <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition mt-6 flex items-center justify-center gap-2">
                  <span>💾</span>
                  정비 기록 저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 탭 2: 검색 */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            {/* 검색 카드 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-6">정비 정보 검색</h2>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="증상을 입력하세요 (예: RPM 헌팅)"
                  className="w-full p-4 border border-gray-300 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-600"
                />

                <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2">
                  <span>🔍</span>
                  검색하기
                </button>
              </div>

              {/* 검색 결과 영역 */}
              <div className="mt-8 text-center">
                <div className="text-gray-400 text-lg mb-2">🔍</div>
                <p className="text-gray-500 text-sm">검색 결과가 여기에 표시됩니다</p>
              </div>
            </div>
          </div>
        )}

        {/* 탭 3: 기록보기 */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* 기록 카드 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-6">저장된 정비 기록</h2>

              <div className="text-center py-12">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500">저장된 정비 기록이 없습니다</p>
                <p className="text-gray-400 text-sm mt-2">
                  "기록하기" 탭에서 정비 내용을 추가하세요
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
