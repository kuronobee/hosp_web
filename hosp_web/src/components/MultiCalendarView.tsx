import React, { useState, useEffect } from 'react';
import EventCard, { CalendarEvent, shouldShowEvent, isAnnotationEvent } from './EventCard';
import EventDetailsModal from './EventDetailsModal';

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

interface MultiCalendarViewProps {
  user: GoogleUser | null;
  token: string;
}

// カレンダー情報を定義
const CALENDARS = [
  {
    id: "med.miyazaki-u.ac.jp_lfki2pa7phl59ikva7ue5bkfnc@group.calendar.google.com",
    name: "循環器内科",
    bgClass: "bg-pink-50",
    defaultSelected: true
  },
  {
    id: "med.miyazaki-u.ac.jp_g082esl03g5ei2facghfkt96r4@group.calendar.google.com",
    name: "腎臓内科",
    bgClass: "bg-green-50",
    defaultSelected: false
  },
  {
    id: "med.miyazaki-u.ac.jp_n0nmh5i6ioqcol3m3m2nclvv5k@group.calendar.google.com",
    name: "アブレーション",
    bgClass: "bg-yellow-50",
    defaultSelected: false
  }
];

// カレンダーID→背景色のマッピング
const CALENDAR_STYLES: Record<string, string> = {
  "med.miyazaki-u.ac.jp_lfki2pa7phl59ikva7ue5bkfnc@group.calendar.google.com": "bg-pink-200",
  "med.miyazaki-u.ac.jp_g082esl03g5ei2facghfkt96r4@group.calendar.google.com": "bg-green-200",
  "med.miyazaki-u.ac.jp_n0nmh5i6ioqcol3m3m2nclvv5k@group.calendar.google.com": "bg-yellow-200"
};

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
    const datewith = new Date(event.start.dateTime);
    return new Date(datewith.setDate(datewith.getDate() - 1)); // Google Calendar APIの仕様により、1日前に設定    
  }
  // 日付のみの場合（終日イベント）
  const date = new Date(event.start.date as string);
  // タイムゾーンの問題を修正するために、時間を12:00に設定
  date.setHours(12, 0, 0, 0);
  return new Date(date.setDate(date.getDate() - 1)); // Google Calendar APIの仕様により、1日前に設定;
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
    
    // イベントがAT=trueかどうかを確認し、isPriorityプロパティを設定
    const priority = isAnnotationEvent(event);
    const eventWithPriority = {
      ...event,
      isPriority: priority
    };
    
    grouped[dateKey].push(eventWithPriority);
  });
  
  // 各日付内でイベントをソート（優先度が高いものを先頭に）
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => {
      // まず優先度でソート
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      
      // 優先度が同じ場合は、時間でソート
      if (a.start.dateTime && b.start.dateTime) {
        return new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime();
      }
      
      // 終日イベントは時間指定イベントの後に配置
      if (a.start.dateTime && !b.start.dateTime) return -1;
      if (!a.start.dateTime && b.start.dateTime) return 1;
      
      // どちらも終日イベントの場合はタイトルでソート
      return (a.summary || '').localeCompare(b.summary || '');
    });
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
  void startDate; // 今は使わない
  
  // 月の最終日
  const endDate = new Date(year, monthIndex + 1, 0);
  
  // 日付を1日ずつ追加
  for (let day = 1; day <= endDate.getDate(); day++) {
    dates.push(new Date(year, monthIndex, day));
  }
  
  return dates;
};

const MultiCalendarView: React.FC<MultiCalendarViewProps> = ({ user, token }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [groupedEvents, setGroupedEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(
    CALENDARS.filter(cal => cal.defaultSelected).map(cal => cal.id)
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // 月を変更する関数
  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  // カレンダー選択状態の切り替え
  const toggleCalendar = (calendarId: string) => {
    setSelectedCalendars(prev => {
      if (prev.includes(calendarId)) {
        return prev.filter(id => id !== calendarId);
      } else {
        return [...prev, calendarId];
      }
    });
  };

  
  /// イベントを取得する関数
const fetchEvents = async () => {
    if (!user || !token || selectedCalendars.length === 0) {
      setEvents([]);
      setGroupedEvents({});
      return;
    }
  
    setIsLoading(true);
    setError(null);
  
    try {
      // 月の初日と最終日を取得
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 6);
  
      // API用に日付をフォーマット
      const timeMin = startOfMonth.toISOString();
      const timeMax = endOfMonth.toISOString();
  
      // カレンダーIDごとにページングを考慮して全イベントを取得
      const fetchAllPages = async (calendarId: string): Promise<CalendarEvent[]> => {
        let allItems: CalendarEvent[] = [];
        let pageToken: string | undefined = undefined;
  
        do {
          const params = new URLSearchParams({
            timeMin,
            timeMax,
            maxResults: '100',
            singleEvents: 'true',
            orderBy: 'startTime',
          });
          if (pageToken) {
            params.set('pageToken', pageToken);
          }
  
          const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            calendarId
          )}/events?${params.toString()}`;
  
          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
  
          if (!response.ok) {
            throw new Error(`カレンダー ${calendarId} のイベント取得エラー: ${response.status}`);
          }
  
          const data = await response.json();
          const items: CalendarEvent[] = (data.items || []).map((item: CalendarEvent) => ({
            ...item,
            calendarId,
          }));
  
          allItems = allItems.concat(items);
          pageToken = data.nextPageToken;
        } while (pageToken);
  
        return allItems;
      };
  
      // 選択されたすべてのカレンダーからイベントを取得
      const allPromises = selectedCalendars.map(fetchAllPages);
      const results = await Promise.all(allPromises);
  
      // すべてのイベントを結合
      const allEvents = results.flat();
      console.log('取得したすべてのイベント:', allEvents);
  
      // フィルタリングとグルーピング
      const filteredEvents = allEvents.filter(shouldShowEvent);
      setEvents(filteredEvents);
  
      const grouped = groupEventsByDate(filteredEvents);
      setGroupedEvents(grouped);
  
      setIsLoading(false);
    } catch (err) {
      console.error('カレンダーイベント取得エラー:', err);
      setError(err instanceof Error ? err.message : '予定の取得中にエラーが発生しました');
      setIsLoading(false);
    }
  };

// カレンダーの全イベントを取得する関数（ページネーション対応）
  // 月が変わったときやカレンダー選択状態が変わったときに再取得
  useEffect(() => {
    fetchEvents();
  }, [user, currentMonth, selectedCalendars, token]);

  // 月の日付配列を生成
  const monthDates = generateMonthDates(currentMonth);

  // イベント詳細を表示
  const handleViewEventDetails = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  // イベント詳細モーダルを閉じる
  const handleCloseEventDetails = () => {
    setSelectedEvent(null);
  };

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800">
          {currentMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* カレンダー選択チェックボックス */}
          <div className="flex flex-wrap gap-3">
            {CALENDARS.map(calendar => (
              <label key={calendar.id} className={`flex items-center cursor-pointer p-2 rounded ${CALENDAR_STYLES[calendar.id]} border`}>
                <input
                  type="checkbox"
                  checked={selectedCalendars.includes(calendar.id)}
                  onChange={() => toggleCalendar(calendar.id)}
                  className="mr-2"
                />
                <span>{calendar.name}</span>
              </label>
            ))}
          </div>
          
          {/* 月ナビゲーション */}
          <div className="flex space-x-2">
            <button 
              onClick={() => changeMonth(-1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
            >
              前月
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
            >
              今月
            </button>
            <button 
              onClick={() => changeMonth(1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
            >
              次月
            </button>
          </div>
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
            {selectedCalendars.length === 0 
              ? 'カレンダーが選択されていません。上のチェックボックスから表示するカレンダーを選択してください。' 
              : 'この月の予定はありません。Googleカレンダーで予定を追加できます。'}
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
            
            // この日付に優先イベントがあるかチェック
            const hasPriorityEvent = dayEvents.some(event => event.isPriority);
            
            return (
              <div 
                key={dateKey} 
                className={`border rounded-lg overflow-hidden ${isToday ? 'border-blue-500 ring-2 ring-blue-200' : hasPriorityEvent ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'}`}
              >
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
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        onViewDetails={handleViewEventDetails}
                        calendarStyles={CALENDAR_STYLES}
                      />
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
      
      {/* イベント詳細モーダル */}
      {selectedEvent && (
        <EventDetailsModal 
          event={selectedEvent}
          onClose={handleCloseEventDetails}
        />
      )}
    </div>
  );
};

export default MultiCalendarView;