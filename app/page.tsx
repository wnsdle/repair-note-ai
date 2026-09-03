'use client';

import { useState } from 'react';
import Upload from './upload';
import Search from './search';
import History from './history';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'search' | 'history'>('upload');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white p-4 border-b border-gray-300 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">🔧 정비 노트 AI</h1>
        <p className="text-sm text-gray-500">정비 기록 시스템</p>

        {/* 탭 */}
        <div className="flex gap-6 mt-4 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-bold transition ${
              activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            📝 기록하기
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`pb-3 text-sm font-bold transition ${
              activeTab === 'search'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            🔍 검색
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-bold transition ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            📋 기록보기
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="p-4 pb-20">
        {activeTab === 'upload' && <Upload />}
        {activeTab === 'search' && <Search />}
        {activeTab === 'history' && <History />}
      </div>
    </div>
  );
}
