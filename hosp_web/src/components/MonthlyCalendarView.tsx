import React, { useState, useEffect } from 'react';
import EventCard from './EventCard';

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

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

interface MonthlyCalendarViewProps {
  user: GoogleUser | null;
  token: string;
  calendarId?: string;
}

// 日付をYYYY-MM-DD形式に変換する関数
const formatDateToYYYYMMDD = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// 日付を日本語表示用にフォーマットする関数
const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
};

// イベントの開始日を取得する関数（日付または日時から）
const getEventStartDate = (event: CalendarEvent): Date => {
  if (event.start.dateTime) {
    return new Date(event.start.dateTime);
  }
  return new Date(event.start.date as string);
};

// イベントを日付ごとにグループ化する関数
const groupEventsByDate = (events: CalendarEvent[]): Record<string, CalendarEvent[]> => {
  const grouped: Record<string, CalendarEvent[]> = {};
  
  events.forEach(event => {
    const startDate = getEventStartDate(event);
    const dateKey = formatDateToYYYYMMDD(startDate);
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push(event);
  });
  
  return grouped;
};

// 日付の配列を生成する関数（1ヶ月分）
const generateMonthDates = (month: Date): Date[] => {
  const dates: Date[] = [];
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  
  // 月の初日
  const startDate = new Date(year, monthIndex, 1);
  
  // 月の最終日
  const endDate = new Date(year, monthIndex + 1, 0);
  
  // 日付を1日ずつ追加
  for (let day = 1; day <= endDate.getDate(); day++) {
    dates.push(new Date(year, monthIndex, day));
  }
  
  return dates;
};

const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({ 
  user, 
  token,
  calendarId = 'med.miyazaki-u.ac.jp_lfki2pa7phl59ikva7ue5bkfnc@group.calendar.google.com'
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [groupedEvents, setGroupedEvents] = useState<Record<string, CalendarEvent[]>>({});

  // 月を変更する関数
  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  // イベントを取得する関数
  const fetchEvents = async () => {
    if (!user || !token) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 月の初日と最終日を取得
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      // API用に日付をフォーマット
      const timeMin = startOfMonth.toISOString();
      const timeMax = endOfMonth.toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(
          timeMax
        )}&maxResults=100&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`イベント取得エラー: ${response.status}`);
      }

      const data = await response.json();
      console.log('取得したイベント:', data);
      
      setEvents(data.items || []);
      
      // イベントを日付ごとにグループ化
      const grouped = groupEventsByDate(data.items || []);
      setGroupedEvents(grouped);
      
      setIsLoading(false);
    } catch (err) {
      console.error('カレンダーイベント取得エラー:', err);
      setError(err instanceof Error ? err.message : '予定の取得中にエラーが発生しました');
      setIsLoading(false);
    }
  };

  // 月が変わったときに再取得
  useEffect(() => {
    fetchEvents();
  }, [user, token, currentMonth, calendarId]);

  // 月の日付配列を生成
  const monthDates = generateMonthDates(currentMonth);

  if (!user || !token) {
    return (
      <div className="mt-6 p-4 border border-gray-300 rounded bg-gray-50 text-center">
        <p>Googleアカウントにログインするとカレンダーの予定が表示されます</p>
      </div>
    );
  }

  return (
    <div className="mt-6 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      {/* カレンダーヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {currentMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
        </h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => changeMonth(-1)}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
          >
            前月
          </button>
          <button 
            onClick={() => changeMonth(1)}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
          >
            次月
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4">
          <p className="font-bold">エラー</p>
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-sm underline mt-2"
          >
            閉じる
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <svg className="animate-spin h-8 w-8 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>予定を読み込み中...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
          <p className="font-medium">予定はありません</p>
          <p className="text-sm mt-2">
            この月の予定はありません。Googleカレンダーで予定を追加できます。
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* 日付ごとのカード */}
          {monthDates.map(date => {
            const dateKey = formatDateToYYYYMMDD(date);
            const dayEvents = groupedEvents[dateKey] || [];
            const today = new Date();
            const isToday = date.getDate() === today.getDate() && 
                           date.getMonth() === today.getMonth() && 
                           date.getFullYear() === today.getFullYear();
            
            return (
              <div key={dateKey} className={`border rounded-lg overflow-hidden ${isToday ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
                {/* 日付ヘッダー */}
                <div className={`p-3 ${isToday ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-700'}`}>
                  <h3 className="font-medium">
                    {formatDateForDisplay(date)}
                  </h3>
                </div>
                
                {/* イベントリスト */}
                <div className="p-3">
                  {dayEvents.length > 0 ? (
                    dayEvents.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic p-2">予定なし</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MonthlyCalendarView;