// src/components/MultiCalendarView.tsx
import React, { useState, useEffect, useRef } from "react";
import EventCard, {
  CalendarEvent,
  shouldShowEvent,
  isAnnotationEvent,
} from "./EventCard";
import EventDetailsModal from "./EventDetailsModal";
import MiniCalendar from "./MiniCalendar";
import {
  isHoliday,
  isNationalHoliday,
  getHolidayName,
} from "../modules/holidayChecker";

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
    defaultSelected: true,
  },
  {
    id: "med.miyazaki-u.ac.jp_g082esl03g5ei2facghfkt96r4@group.calendar.google.com",
    name: "腎臓内科",
    bgClass: "bg-green-50",
    defaultSelected: false,
  },
  {
    id: "med.miyazaki-u.ac.jp_n0nmh5i6ioqcol3m3m2nclvv5k@group.calendar.google.com",
    name: "アブレーション",
    bgClass: "bg-yellow-50",
    defaultSelected: false,
  },
];

// カレンダーID→背景色のマッピング
const CALENDAR_STYLES: Record<string, string> = {
  "med.miyazaki-u.ac.jp_lfki2pa7phl59ikva7ue5bkfnc@group.calendar.google.com":
    "bg-pink-200",
  "med.miyazaki-u.ac.jp_g082esl03g5ei2facghfkt96r4@group.calendar.google.com":
    "bg-green-200",
  "med.miyazaki-u.ac.jp_n0nmh5i6ioqcol3m3m2nclvv5k@group.calendar.google.com":
    "bg-yellow-200",
};

// 日付をYYYY-MM-DD形式に変換する関数
const formatDateToYYYYMMDD = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// 日付を日本語表示用にフォーマットする関数
const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
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
  return new Date(date.setDate(date.getDate() - 1)); // Google Calendar APIの仕様により、1日前に設定
};

// イベントを日付ごとにグループ化する関数
const groupEventsByDate = (
  events: CalendarEvent[]
): Record<string, CalendarEvent[]> => {
  const grouped: Record<string, CalendarEvent[]> = {};

  events.forEach((event) => {
    const startDate = getEventStartDate(event);
    const dateKey = formatDateToYYYYMMDD(startDate);

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    // イベントがAT=trueかどうかを確認し、isPriorityプロパティを設定
    const priority = isAnnotationEvent(event);
    const eventWithPriority = {
      ...event,
      isPriority: priority,
    };

    grouped[dateKey].push(eventWithPriority);
  });

  // 各日付内でイベントをソート（優先度が高いものを先頭に）
  Object.keys(grouped).forEach((date) => {
    grouped[date].sort((a, b) => {
      // まず優先度でソート
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;

      // 優先度が同じ場合は、時間でソート
      if (a.start.dateTime && b.start.dateTime) {
        return (
          new Date(a.start.dateTime).getTime() -
          new Date(b.start.dateTime).getTime()
        );
      }

      // 終日イベントは時間指定イベントの後に配置
      if (a.start.dateTime && !b.start.dateTime) return -1;
      if (!a.start.dateTime && b.start.dateTime) return 1;

      // どちらも終日イベントの場合はタイトルでソート
      return (a.summary || "").localeCompare(b.summary || "");
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
  void startDate;
  // 月の最終日
  const endDate = new Date(year, monthIndex + 1, 0);

  // 日付を1日ずつ追加
  for (let day = 1; day <= endDate.getDate(); day++) {
    dates.push(new Date(year, monthIndex, day));
  }

  return dates;
};

const MultiCalendarView: React.FC<MultiCalendarViewProps> = ({
  user,
  token,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [groupedEvents, setGroupedEvents] = useState<
    Record<string, CalendarEvent[]>
  >({});
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(
    CALENDARS.filter((cal) => cal.defaultSelected).map((cal) => cal.id)
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  // モバイル向けに追加: カレンダー選択パネルの表示/非表示状態
  const [showCalendarPanel, setShowCalendarPanel] = useState(false);

  // 選択されている日付
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // 各日付カードへのref
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 月を変更する関数
  const changeMonth = (newMonth: Date) => {
    setCurrentMonth(newMonth);
    setSelectedDate(undefined); // 月を変更したら日付選択をリセット
  };

  // カレンダー選択状態の切り替え
  const toggleCalendar = (calendarId: string) => {
    setSelectedCalendars((prev) => {
      if (prev.includes(calendarId)) {
        return prev.filter((id) => id !== calendarId);
      } else {
        return [...prev, calendarId];
      }
    });
  };

  // イベントを取得する関数
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
      const startOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        6
      );

      // API用に日付をフォーマット
      const timeMin = startOfMonth.toISOString();
      const timeMax = endOfMonth.toISOString();

      // カレンダーIDごとにページングを考慮して全イベントを取得
      const fetchAllPages = async (
        calendarId: string
      ): Promise<CalendarEvent[]> => {
        let allItems: CalendarEvent[] = [];
        let pageToken: string | undefined = undefined;

        do {
          const params = new URLSearchParams({
            timeMin,
            timeMax,
            maxResults: "100",
            singleEvents: "true",
            orderBy: "startTime",
          });
          if (pageToken) {
            params.set("pageToken", pageToken);
          }

          const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            calendarId
          )}/events?${params.toString()}`;

          const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            throw new Error(
              `カレンダー ${calendarId} のイベント取得エラー: ${response.status}`
            );
          }

          const data = await response.json();
          const items: CalendarEvent[] = (data.items || []).map(
            (item: CalendarEvent) => ({
              ...item,
              calendarId,
            })
          );

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
      console.log("取得したすべてのイベント:", allEvents);

      // フィルタリングとグルーピング
      const filteredEvents = allEvents.filter(shouldShowEvent);
      setEvents(filteredEvents);

      const grouped = groupEventsByDate(filteredEvents);
      setGroupedEvents(grouped);

      setIsLoading(false);
    } catch (err) {
      console.error("カレンダーイベント取得エラー:", err);
      setError(
        err instanceof Error
          ? err.message
          : "予定の取得中にエラーが発生しました"
      );
      setIsLoading(false);
    }
  };

  // ミニカレンダーで日付がクリックされたときのハンドラ
  const handleDateClick = (date: Date) => {
    const dateKey = formatDateToYYYYMMDD(date);

    // 選択された日付を更新
    setSelectedDate(date);

    // その日付のカードへスクロール
    if (dateRefs.current[dateKey]) {
      dateRefs.current[dateKey]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

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

  // カレンダー選択パネルの表示/非表示を切り替え
  const toggleCalendarPanel = () => {
    setShowCalendarPanel(!showCalendarPanel);
  };

  if (!user || !token) {
    return (
      <div className="mt-4 p-3 border border-gray-300 rounded bg-gray-50 text-center">
        <p>Googleアカウントにログインするとカレンダーの予定が表示されます</p>
      </div>
    );
  }

  return (
    <div className="mt-2 border border-gray-200 rounded-lg p-3 sm:p-4 md:p-6 bg-white shadow-sm">
      {/* カレンダーヘッダー - スマートフォンではコンパクトに */}
      <div className="mb-3 sm:mb-6">
        {/* 月表示と操作ボタン */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            {currentMonth.toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
            })}
          </h2>

          {/* モバイル向けカレンダー選択ボタン */}
          <button
            onClick={toggleCalendarPanel}
            className="px-2 py-1 bg-blue-500 text-white rounded-md text-sm flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            カレンダー選択
          </button>
        </div>

        {/* モバイル向けカレンダー選択パネル (スライドダウン) */}
        {showCalendarPanel && (
          <div className="md:hidden mt-2 p-2 border rounded-md bg-gray-50">
            <div className="font-medium mb-1 text-sm">表示するカレンダー：</div>
            <div className="flex flex-wrap gap-2">
              {CALENDARS.map((calendar) => (
                <label
                  key={calendar.id}
                  className={`flex items-center cursor-pointer p-1 rounded text-sm ${
                    CALENDAR_STYLES[calendar.id]
                  } border`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCalendars.includes(calendar.id)}
                    onChange={() => toggleCalendar(calendar.id)}
                    className="mr-1"
                  />
                  <span>{calendar.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* デスクトップ向けカレンダー選択チェックボックス */}
        <div className="hidden md:flex flex-wrap gap-3 mt-3">
          {CALENDARS.map((calendar) => (
            <label
              key={calendar.id}
              className={`flex items-center cursor-pointer p-2 rounded ${
                CALENDAR_STYLES[calendar.id]
              } border`}
            >
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
      </div>

      {/* 2カラムレイアウト: ミニカレンダーと予定リスト */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ミニカレンダー（左カラム） */}
        <div className="lg:col-span-1">
          <MiniCalendar
            currentMonth={currentMonth}
            onMonthChange={changeMonth}
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
          />

          {/* 凡例 - モバイルではよりコンパクトに */}
          <div className="flex flex-wrap gap-2 sm:gap-4 mt-3 mb-3 sm:mb-4 text-xs sm:text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-50 border border-blue-300 mr-1 sm:mr-2"></div>
              <span>平日</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 border border-red-300 mr-1 sm:mr-2"></div>
              <span>日曜・祝日</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-amber-100 border border-amber-300 mr-1 sm:mr-2"></div>
              <span>土曜日</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-blue-500 bg-white mr-1 sm:mr-2"></div>
              <span>今日</span>
            </div>
          </div>
        </div>

        {/* イベントリスト（右カラム） */}
        <div className="lg:col-span-3">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-2 sm:p-4 my-2 sm:my-4 text-sm">
              <p className="font-bold">エラー</p>
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs underline mt-1"
              >
                閉じる
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center p-4 sm:p-8">
              <svg
                className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mr-2 sm:mr-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>予定を読み込み中...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-4 my-2 sm:my-4 text-sm">
              <p className="font-medium">予定はありません</p>
              <p className="text-xs sm:text-sm mt-1 sm:mt-2">
                {selectedCalendars.length === 0
                  ? "カレンダーが選択されていません。上のチェックボックスから表示するカレンダーを選択してください。"
                  : "この月の予定はありません。Googleカレンダーで予定を追加できます。"}
              </p>
            </div>
          ) : (
            // 日付カードのグリッド - 余白を小さく
            <div className="space-y-4">
              {/* 日付ごとのカード */}
              {monthDates.map((date) => {
                const dateKey = formatDateToYYYYMMDD(date);
                const dayEvents = groupedEvents[dateKey] || [];
                const today = new Date();
                const isToday =
                  date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear();

                // この日付に優先イベントがあるかチェック
                const hasPriorityEvent = dayEvents.some(
                  (event) => event.isPriority
                );

                // 土日または祝日かどうかをチェック
                const isHolidayDate = isHoliday(date);
                void isHolidayDate;
                const isSundayOrHoliday =
                  date.getDay() === 0 || isNationalHoliday(date);
                const isSaturday = date.getDay() === 6;

                // 日付パネルの背景色を決定
                let dateBgClass = "bg-blue-50"; // 平日の背景色

                if (isSundayOrHoliday) {
                  // 日曜または祝日
                  dateBgClass = "bg-red-100";
                } else if (isSaturday) {
                  // 土曜日
                  dateBgClass = "bg-amber-100";
                }

                // 祝日名を取得
                const holidayName = getHolidayName(date);

                // 選択された日付かどうか
                const isSelected =
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();

                return (
                  <div
                    key={dateKey}
                    className={`border rounded-lg overflow-hidden ${
                      isToday
                        ? "border-blue-500 ring-1 ring-blue-200"
                        : isSelected
                        ? "border-blue-400 ring-1 ring-blue-300"
                        : hasPriorityEvent
                        ? "border-red-300 ring-1 ring-red-100"
                        : "border-gray-200"
                    }`}
                    ref={(el) => (dateRefs.current[dateKey] = el)}
                    id={`date-${dateKey}`}
                  >
                    {/* 日付ヘッダー - よりコンパクトに */}
                    <div
                      className={`p-2 ${
                        isToday
                          ? "bg-blue-500 text-white"
                          : isSelected
                          ? "bg-blue-400 text-white"
                          : dateBgClass
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-sm sm:text-base">
                          {formatDateForDisplay(date)}
                        </h3>
                        {holidayName && (
                          <span className="text-xs font-medium text-red-700">
                            {holidayName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* イベントリスト - パディングを小さく */}
                    <div className="p-1 sm:p-2">
                      {dayEvents.length > 0 ? (
                        dayEvents.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onViewDetails={handleViewEventDetails}
                            calendarStyles={CALENDAR_STYLES}
                          />
                        ))
                      ) : (
                        <p className="text-xs sm:text-sm text-gray-500 italic p-1 sm:p-2">
                          予定なし
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
