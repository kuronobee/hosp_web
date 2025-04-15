import { useState, useEffect } from 'react';

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
}

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

interface CalendarViewProps {
  user: GoogleUser | null;
  token: string;
}

const CalendarView = ({ user, token }: CalendarViewProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<any[]>([]);
  
  // 指定されたカレンダーID
  const defaultCalendarId = 'med.miyazaki-u.ac.jp_lfki2pa7phl59ikva7ue5bkfnc@group.calendar.google.com';
  const [calendarId, setCalendarId] = useState<string>(defaultCalendarId);

  useEffect(() => {
    // ユーザーとトークンがある場合のみカレンダーリストを取得
    if (user && token) {
      fetchCalendarList();
      // 指定されたカレンダーIDの予定を取得
      fetchCalendarEvents(defaultCalendarId);
    } else {
      // ユーザーがログアウトした場合、状態をリセット
      setEvents([]);
      setCalendars([]);
    }
  }, [user, token]);

  // カレンダーIDが変更されたらイベントを取得
  useEffect(() => {
    if (calendarId && token && user) {
      fetchCalendarEvents(calendarId);
    }
  }, [calendarId, token]);

  // カレンダーリストを取得
  const fetchCalendarList = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`カレンダーリスト取得エラー: ${response.status}`);
      }

      const data = await response.json();
      console.log('利用可能なカレンダー:', data);
      
      // 指定されたカレンダーIDがリストに含まれているか確認
      const targetCalendarExists = data.items.some(
        (calendar: any) => calendar.id === defaultCalendarId
      );
      
      if (!targetCalendarExists) {
        console.warn('指定されたカレンダーIDはカレンダーリストに含まれていません。アクセス権限の問題かもしれません。');
      }
      
      setCalendars(data.items || []);
      setIsLoading(false);
    } catch (err) {
      console.error('カレンダーリスト取得エラー:', err);
      setError(err instanceof Error ? err.message : 'カレンダーリストの取得中にエラーが発生しました');
      setIsLoading(false);
    }
  };

  // カレンダーイベントを取得
  const fetchCalendarEvents = async (calId: string) => {
    if (!calId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 現在の日付から1か月の期間を設定
      const now = new Date();
      const timeMin = now.toISOString();
      
      const oneMonthLater = new Date(now);
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      const timeMax = oneMonthLater.toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calId
        )}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(
          timeMax
        )}&maxResults=50&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('指定されたカレンダーが見つかりません。カレンダーIDが正しいか、アクセス権限があるか確認してください。');
        } else if (response.status === 403) {
          throw new Error('このカレンダーにアクセスする権限がありません。権限の設定を確認してください。');
        } else {
          throw new Error(`イベント取得エラー: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('取得したイベント:', data);

      setEvents(data.items || []);
      setIsLoading(false);
    } catch (err) {
      console.error('カレンダーイベント取得エラー:', err);
      setError(err instanceof Error ? err.message : '予定の取得中にエラーが発生しました');
      setIsLoading(false);
    }
  };

  // カレンダー選択時の処理
  const handleCalendarChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCalendarId(e.target.value);
  };

  // 日付フォーマット関数
  const formatDateTime = (dateTimeStr: string | undefined, dateStr: string | undefined) => {
    if (!dateTimeStr && !dateStr) return '日時不明';

    const date = dateTimeStr ? new Date(dateTimeStr) : new Date(dateStr as string);
    
    // 日本語の日付フォーマット
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: dateTimeStr ? '2-digit' : undefined,
      minute: dateTimeStr ? '2-digit' : undefined,
      weekday: 'short',
    }).format(date);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-xl font-bold">循環器内科カレンダー</h3>
        
        {calendars.length > 0 && (
          <div className="w-full sm:w-auto">
            <select
              value={calendarId || ''}
              onChange={handleCalendarChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {/* 指定されたカレンダーIDを最初のオプションとして追加 */}
              <option value={defaultCalendarId}>循環器内科カレンダー</option>
              
              {/* その他のカレンダーを追加（重複を避ける） */}
              {calendars
                .filter(calendar => calendar.id !== defaultCalendarId)
                .map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))
              }
            </select>
          </div>
        )}
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
            これから1ヶ月間の予定はありません。Googleカレンダーで予定を追加できます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <h4 className="font-bold text-lg">{event.summary || '無題の予定'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div>
                  <p className="text-gray-700">
                    <span className="font-medium">開始:</span> {formatDateTime(event.start.dateTime, event.start.date)}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">終了:</span> {formatDateTime(event.end.dateTime, event.end.date)}
                  </p>
                </div>
                <div>
                  {event.location && (
                    <p className="text-gray-700">
                      <span className="font-medium">場所:</span> {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-gray-700 text-sm mt-2 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarView;