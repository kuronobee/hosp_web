import React from 'react';

// イベントの型定義
export interface CalendarEvent {
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
  // カレンダーID追加（どのカレンダーのイベントか識別するため）
  calendarId?: string;
}

interface EventCardProps {
  event: CalendarEvent;
  onViewDetails: (event: CalendarEvent) => void;
  // カレンダーの背景色指定用
  calendarStyles: Record<string, string>;
}

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

// イベントをフィルタリングするための関数
export const shouldShowEvent = (event: CalendarEvent): boolean => {
  // タイトルが×, @, #で始まるイベントを除外
  if (event.summary && /^[×@#]/.test(event.summary)) {
    return false;
  }
  
  // 時間範囲指定があるイベントを除外
  if (event.start.dateTime && event.end.dateTime) {
    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);
    
    // 開始時間と終了時間が異なる場合（時間範囲指定あり）は除外
    if (endTime.getTime() - startTime.getTime() > 30 * 60 * 1000) { // 30分以上の場合は範囲指定と見なす
      return false;
    }
  }
  
  return true;
};

const EventCard: React.FC<EventCardProps> = ({ event, onViewDetails, calendarStyles }) => {
  // カレンダーIDに基づいた背景色を取得
  const calendarBgClass = event.calendarId && calendarStyles[event.calendarId] 
    ? calendarStyles[event.calendarId]
    : 'bg-white';
  
  // 終日イベントか時間指定イベントかを判定
  const allDay = isAllDayEvent(event);
  
  // 時間文字列を作成
  const timeString = allDay 
    ? '終日' 
    : `${formatTime(event.start.dateTime)}`;

  return (
    <div 
      className={`rounded-lg shadow-sm p-3 mb-2 border-l-4 border-gray-300 ${calendarBgClass} hover:shadow-md transition-shadow cursor-pointer`}
      onClick={() => onViewDetails(event)}
    >
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
      </div>
    </div>
  );
};

export default EventCard;