import React from 'react';

// イベントの型定義
interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    date?: string;
  };
  end: {
    dateTime: string;
    date?: string;
  };
  location?: string;
  description?: string;
  colorId?: string;
}

interface EventCardProps {
  event: CalendarEvent;
}

// イベントカラーマップ
const EVENT_COLORS: Record<string, string> = {
  '1': 'border-blue-500 bg-blue-50',  // 青
  '2': 'border-green-500 bg-green-50', // 緑
  '3': 'border-purple-500 bg-purple-50', // 紫
  '4': 'border-red-500 bg-red-50',   // 赤
  '5': 'border-yellow-500 bg-yellow-50', // 黄
  '6': 'border-orange-500 bg-orange-50', // オレンジ
  '7': 'border-cyan-500 bg-cyan-50', // シアン
  '8': 'border-pink-500 bg-pink-50', // ピンク
  '9': 'border-teal-500 bg-teal-50', // ティール
  '10': 'border-indigo-500 bg-indigo-50', // インディゴ
  'default': 'border-gray-500 bg-white' // デフォルト
};

// 時間のフォーマット関数
const formatTime = (dateTimeStr: string | undefined): string => {
  if (!dateTimeStr) return '';
  
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// 日付だけのイベントかどうかを判定
const isAllDayEvent = (event: CalendarEvent): boolean => {
  return !event.start.dateTime && !!event.start.date;
};

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  // イベントの色を取得
  const colorClass = event.colorId 
    ? EVENT_COLORS[event.colorId] || EVENT_COLORS.default
    : EVENT_COLORS.default;
  
  // 終日イベントか時間指定イベントかを判定
  const allDay = isAllDayEvent(event);
  
  // 時間文字列を作成
  const timeString = allDay 
    ? '終日' 
    : `${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime)}`;

  return (
    <div className={`rounded-lg shadow-sm p-3 mb-2 border-l-4 ${colorClass} hover:shadow-md transition-shadow`}>
      <div className="flex flex-col">
        <div className="text-xs text-gray-600 mb-1">
          {timeString}
        </div>
        
        <h3 className="font-medium text-gray-800 mb-1 line-clamp-2">
          {event.summary || '無題の予定'}
        </h3>
        
        {event.location && (
          <div className="text-xs text-gray-600 flex items-start">
            <svg className="w-3 h-3 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span className="truncate">{event.location}</span>
          </div>
        )}
        
        {event.description && (
          <div className="text-xs text-gray-600 mt-1 line-clamp-1">
            {event.description}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;