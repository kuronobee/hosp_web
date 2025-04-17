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
  // 優先度フラグ（ATの値でソートするため）
  isPriority?: boolean;
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
// HTMLエンティティをデコード
const decodeEntities = (text: string): string => {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ');
};

// 日付だけのイベントかどうかを判定
const isAllDayEvent = (event: CalendarEvent): boolean => {
  return !event.start.dateTime && !!event.start.date;
};

// イベントの説明からAT=trueかどうかを判定する関数
export const isAnnotationEvent = (event: CalendarEvent): boolean => {
  if (!event.description) return false;
  
  // ATパラメータを探す（XML形式や他の形式も考慮）
  return decodeEntities(event.description).includes('<AT>true</AT>');
};

export const isScheduleEvent = (event: CalendarEvent): boolean => {
  if (!event.summary) return false;
  console.log("@で始まる?", event.summary.startsWith('@'));
  // @で始まるイベントを優先
  return event.summary.startsWith('@') || !isAllDayEvent(event);
}

// イベントをフィルタリングするための関数
export const shouldShowEvent = (event: CalendarEvent): boolean => {
  // タイトルが×, @, #で始まるイベントを除外
  if (event.summary && /^[×#]/.test(event.summary)) {
    return false;
  }
  return true;
};

const EventCard: React.FC<EventCardProps> = ({ event, onViewDetails, calendarStyles }) => {
  // カレンダーIDに基づいた背景色を取得
  const calendarBgClass = event.calendarId && calendarStyles[event.calendarId] 
    ? calendarStyles[event.calendarId]
    : 'bg-white';
  
  // 優先イベントかどうかを確認
  const isPriority = isAnnotationEvent(event);
  const isSchedule = isScheduleEvent(event);
  // 終日イベントか時間指定イベントかを判定
  const allDay = isAllDayEvent(event);
  
  // 時間文字列を作成
  const timeString = allDay 
    ? '' 
    : `${formatTime(event.start.dateTime)}〜${formatTime(event.end.dateTime)}`;

  return (
    <div 
      className={`shadow-sm p-2 mb-1 sm:p-3 sm:mb-2 ${!isPriority && !isSchedule ? 'border-l-4' : ''} ${isPriority ? 'border-red-500' : 'border-gray-300'} ${calendarBgClass} hover:shadow-md transition-shadow cursor-pointer ${isPriority ? 'bg-red-50' : ''}`}
      onClick={() => onViewDetails(event)}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          {timeString && (
            <span className="text-xs text-gray-600">
              {timeString}
            </span>
          )}
          
          {isPriority && (
            <span className="px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 text-right">
              重要
            </span>
          )}
        </div>
        
        <h3 className={`font-medium text-left ${isPriority ? 'text-red-800' : 'text-gray-800'} text-sm sm:text-base mb-0.5 sm:mb-1 line-clamp-2`}>
          {event.summary || '無題の予定'}
        </h3>
        
        {event.location && (
          <div className="text-xs text-gray-600 flex items-start">
            <svg className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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