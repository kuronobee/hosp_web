import React from 'react';
import { CalendarEvent } from './EventCard';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

// 日時を日本語表示形式にフォーマットする関数
const formatDateTime = (dateTimeStr: string | undefined, dateStr: string | undefined): string => {
  if (!dateTimeStr && !dateStr) return '日時不明';

  const date = dateTimeStr ? new Date(dateTimeStr) : new Date(dateStr as string);
  
  // 日本語の日付フォーマット
  const dateFormat = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
  
  // 時間の表示（dateTimeの場合のみ）
  if (dateTimeStr) {
    const timeFormat = date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${dateFormat} ${timeFormat}`;
  }
  
  return dateFormat;
};

// 開始時間と終了時間の表示用フォーマット
const formatEventTime = (event: CalendarEvent): string => {
  if (!event.start.dateTime && event.start.date) {
    // 終日イベントの場合
    const startDate = formatDateTime(undefined, event.start.date);
    
    // 終了日が開始日と異なる場合のみ表示
    if (event.end.date && event.start.date !== event.end.date) {
      const endDateObj = new Date(event.end.date);
      // 終了日は1日前（Google Calendarの仕様）
      endDateObj.setDate(endDateObj.getDate() - 1);
      const endDateStr = endDateObj.toISOString().split('T')[0];
      const endDate = formatDateTime(undefined, endDateStr);
      return `${startDate} 〜 ${endDate} (終日)`;
    }
    
    return `${startDate} (終日)`;
  }
  
  // 時間指定イベントの場合
  if (event.start.dateTime && event.end.dateTime) {
    const startDateTime = formatDateTime(event.start.dateTime, undefined);
    
    // 同じ日の場合は終了時刻のみ表示
    const startDate = new Date(event.start.dateTime).toDateString();
    const endDate = new Date(event.end.dateTime).toDateString();
    
    if (startDate === endDate) {
      const endTime = new Date(event.end.dateTime).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return `${startDateTime} 〜 ${endTime}`;
    }
    
    // 日をまたぐ場合は完全な日時を表示
    const endDateTime = formatDateTime(event.end.dateTime, undefined);
    return `${startDateTime} 〜 ${endDateTime}`;
  }
  
  return '日時情報なし';
};

// カレンダー名の定義
const CALENDAR_NAMES: Record<string, string> = {
  'med.miyazaki-u.ac.jp_lfki2pa7phl59ikva7ue5bkfnc@group.calendar.google.com': '循環器内科',
  'med.miyazaki-u.ac.jp_g082esl03g5ei2facghfkt96r4@group.calendar.google.com': '腎臓内科',
  'med.miyazaki-u.ac.jp_n0nmh5i6ioqcol3m3m2nclvv5k@group.calendar.google.com': 'アブレーション'
};

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, onClose }) => {
  if (!event) return null;
  
  // イベントのカレンダー名を取得
  const calendarName = event.calendarId && CALENDAR_NAMES[event.calendarId] 
    ? CALENDAR_NAMES[event.calendarId]
    : 'カレンダー';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800 truncate">
            {event.summary || '無題の予定'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {/* 内容 */}
        <div className="p-4 overflow-y-auto flex-grow">
          <div className="space-y-4">
            {/* 日時 */}
            <div className="flex">
              <div className="w-8 flex-shrink-0 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-gray-700">{formatEventTime(event)}</p>
              </div>
            </div>
            
            {/* カレンダー */}
            <div className="flex">
              <div className="w-8 flex-shrink-0 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-gray-700">{calendarName}</p>
              </div>
            </div>
            
            {/* 場所 */}
            {event.location && (
              <div className="flex">
                <div className="w-8 flex-shrink-0 text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <div className="ml-2">
                  <p className="text-gray-700">{event.location}</p>
                </div>
              </div>
            )}
            
            {/* 説明 */}
            {event.description && (
              <div className="flex">
                <div className="w-8 flex-shrink-0 text-gray-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <div className="ml-2">
                  <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* フッター */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;