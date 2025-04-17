// src/components/EventDetailsModal.tsx
import React, { useState, useEffect, ReactElement } from "react";
import { CalendarEvent } from "./EventCard";

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

/*--------------------------------------------------
  共通ユーティリティ
--------------------------------------------------*/
const formatDateTime = (
  dateTimeStr: string | undefined,
  dateStr: string | undefined
): string => {
  if (!dateTimeStr && !dateStr) return "日時不明";

  const date = dateTimeStr ? new Date(dateTimeStr) : new Date(dateStr as string);
  const dateFormat = date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  if (dateTimeStr) {
    const timeFormat = date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${dateFormat} ${timeFormat}`;
  }

  return dateFormat;
};

const formatEventTime = (event: CalendarEvent): string => {
  /* …（元のロジックをそのまま）… */
  /* ここは質問に貼られているコードと同じなので省略しています */
  /* ------------------------------------------------------------- */
  if (!event.start.dateTime && event.start.date) {
    const startDate = formatDateTime(undefined, event.start.date);

    if (event.end.date && event.start.date !== event.end.date) {
      const endDateObj = new Date(event.end.date);
      endDateObj.setDate(endDateObj.getDate() - 1); // Google Calendar 仕様
      const endDateStr = endDateObj.toISOString().split("T")[0];
      const endDate = formatDateTime(undefined, endDateStr);
      return `${startDate} 〜 ${endDate} (終日)`;
    }
    return startDate;
  }

  if (event.start.dateTime && event.end.dateTime) {
    const startDateTime = formatDateTime(event.start.dateTime, undefined);
    const startDate = new Date(event.start.dateTime).toDateString();
    const endDate = new Date(event.end.dateTime).toDateString();

    if (startDate === endDate) {
      const endTime = new Date(event.end.dateTime).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `${startDateTime} 〜 ${endTime}`;
    }

    const endDateTime = formatDateTime(event.end.dateTime, undefined);
    return `${startDateTime} 〜 ${endDateTime}`;
  }

  return "日時情報なし";
};

const CALENDAR_NAMES: Record<string, string> = {
  "med.miyazaki-u.ac.jp_lfki2pa7phl59ikva7ue5bkfnc@group.calendar.google.com":
    "循環器内科",
  "med.miyazaki-u.ac.jp_g082esl03g5ei2facghfkt96r4@group.calendar.google.com":
    "腎臓内科",
  "med.miyazaki-u.ac.jp_n0nmh5i6ioqcol3m3m2nclvv5k@group.calendar.google.com":
    "アブレーション",
};

const decodeEntities = (text: string): string =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

const HIDDEN_FIELDS = ["CID", "EID", "Date", "確認"];

const parseXmlContent = (
  xmlContent: string
): { title: string; items: { name: string; value: string; type: string }[] } | null => {
  /* …（元のロジックをそのまま）… */
  const items: { name: string; value: string; type: string }[] = [];
  const tagPattern = /<([^>\s]+)>(.*?)<\/\1>/g;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(xmlContent)) !== null) {
    if (tagMatch[1] !== "PatientInfo") {
      const tagName = tagMatch[1].trim();
      if (HIDDEN_FIELDS.includes(tagName)) continue;
      const tagValue = tagMatch[2].trim();

      let fieldType = "text";
      if (tagName === "ID" || tagName === "Age") fieldType = "number";
      else if (tagName === "Gender") fieldType = "gender";
      else if (tagName === "AT") fieldType = "boolean";
      else if (tagName === "Comment" || tagName === "Description")
        fieldType = "textarea";

      items.push({ name: tagName, value: tagValue, type: fieldType });
    }
  }
  return { title: "患者情報", items };
};

const FIELD_NAME_MAP: Record<string, string> = {
  ID: "患者ID",
  Name: "氏名",
  Age: "年齢",
  Gender: "性別",
  Address: "住所",
  Phone: "電話番号",
  Comment: "コメント",
  Description: "詳細",
  AT: "アノテーションフラグ",
  主治医: "主治医",
};

const getConfirmationStatus = (event: CalendarEvent | null): boolean =>
  !!event?.description &&
  decodeEntities(event.description).includes("<確認>true</確認>");

/*--------------------------------------------------
  モーダル本体
--------------------------------------------------*/
const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTab, setCurrentTab] = useState<"details" | "xml">("details");

  useEffect(() => {
    if (event) setIsVisible(true);
  }, [event]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // アニメーション後に unmount
  };

  if (!event) return null;

  const displayTitle = getConfirmationStatus(event)
    ? `✓ ${event.summary || "無題の予定"}`
    : event.summary || "無題の予定";

  const calendarName =
    (event.calendarId && CALENDAR_NAMES[event.calendarId]) || "カレンダー";

  const replacedDescription = event.description
    ? decodeEntities(event.description)
    : "";

  const xmlData = replacedDescription
    ? parseXmlContent(replacedDescription)
    : null;

  const regularDescription = replacedDescription
    .replace(/<!--患者管理用-->[\s\S]*?<!--ここまで-->/g, "")
    .trim();

  const hasXmlData = !!xmlData && xmlData.items.length > 0;

  /*------------------------------------------------
    JSX
  ------------------------------------------------*/
  return (
    <>
      {/* 半透明オーバーレイ (背景クリックで閉じる) */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* モーダル本体 */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`bg-white rounded-lg shadow-xl w-full mx-2 sm:mx-4 sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col transform transition-transform duration-300 custom-scrollbar ${
            isVisible ? "scale-100" : "scale-95"
          }`}
          onClick={(e) => e.stopPropagation()} // 本体クリックで閉じさせない
        >
          {/* ヘッダー */}
          <div className="flex justify-between items-center p-3 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <h2 className="text-lg sm:text-xl font-semibold truncate">
              {displayTitle}
            </h2>
            <button
              onClick={handleClose}
              className="p-1 hover:text-gray-200 focus:outline-none"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* タブ切替 (XML がある場合) */}
          {hasXmlData && (
            <div className="flex border-b text-sm sm:text-base">
              <button
                className={`px-4 py-2 font-medium transition-colors ${
                  currentTab === "details"
                    ? "text-blue-600 border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setCurrentTab("details")}
              >
                基本情報
              </button>
              <button
                className={`px-4 py-2 font-medium transition-colors ${
                  currentTab === "xml"
                    ? "text-blue-600 border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setCurrentTab("xml")}
              >
                患者情報
              </button>
            </div>
          )}

          {/* コンテンツ */}
          <div className="p-4 overflow-y-auto flex-grow custom-scrollbar">
            {currentTab === "details" ? (
              /*-------------------------------------*
               * 基本情報タブ
               *-------------------------------------*/
              <div className="space-y-4 text-sm sm:text-base">
                {/* 日時 */}
                <InfoRow icon="calendar" color="text-blue-500">
                  {formatEventTime(event)}
                </InfoRow>

                {/* カレンダー名 */}
                <InfoRow icon="clipboard" color="text-green-500">
                  {calendarName}
                </InfoRow>

                {/* 場所 */}
                {event.location && (
                  <InfoRow icon="location" color="text-red-500">
                    {event.location}
                  </InfoRow>
                )}

                {/* 確認済み */}
                {getConfirmationStatus(event) && (
                  <InfoRow icon="check" color="text-green-500" badge>
                    確認済み
                  </InfoRow>
                )}

                {/* 通常説明 */}
                {regularDescription && (
                  <InfoRow icon="doc" color="text-purple-500" multiline>
                    {regularDescription}
                  </InfoRow>
                )}
              </div>
            ) : (
              /*-------------------------------------*
               * XMLデータタブ
               *-------------------------------------*/
              xmlData && (
                <div>
                  <h3 className="font-medium text-gray-700 border-l-4 border-blue-500 pl-2 mb-3">
                    {xmlData.title}
                  </h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
                    {xmlData.items.map((item, idx) => {
                      const name = FIELD_NAME_MAP[item.name] || item.name;
                      const even = idx % 2 === 0;
                      return (
                        <div
                          key={idx}
                          className={`p-3 flex items-start transition-colors ${
                            even ? "bg-white" : "bg-blue-50"
                          } hover:bg-blue-100`}
                        >
                          <div className="w-1/3 pr-4 font-medium text-gray-600">
                            {name}
                          </div>
                          <div className="flex-1">
                            <FieldValue item={item} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>

          {/* フッター */}
          <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

/*--------------------------------------------------
  サブコンポーネント
--------------------------------------------------*/
const InfoRow: React.FC<{
  icon: "calendar" | "clipboard" | "location" | "check" | "doc";
  color: string;
  badge?: boolean;
  multiline?: boolean;
  children: React.ReactNode;
}> = ({ icon, color, badge, multiline, children }) => {
  const icons: Record<string, ReactElement> = {
    calendar: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
    clipboard: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    ),
    location: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </>
    ),
    check: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    ),
    doc: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  };

  return (
    <div className="flex rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`w-6 sm:w-8 flex-shrink-0 ${color}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icons[icon]}
        </svg>
      </div>
      <div className="ml-2">
        {badge ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {children}
          </span>
        ) : multiline ? (
          <p className="whitespace-pre-line text-gray-700">{children}</p>
        ) : (
          <p className="text-gray-700">{children}</p>
        )}
      </div>
    </div>
  );
};

const FieldValue: React.FC<{
  item: { name: string; value: string; type: string };
}> = ({ item }) => {
  if (item.type === "boolean") {
    const active = item.value.toLowerCase() === "true";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        }`}
      >
        {active ? "オン" : "オフ"}
      </span>
    );
  }
  if (item.type === "number") {
    return <span className="font-mono text-blue-600">{item.value}</span>;
  }
  if (item.type === "gender") {
    const male = item.value === "男" || item.value.toLowerCase() === "male";
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          male ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"
        }`}
      >
        {item.value}
      </span>
    );
  }
  if (item.type === "textarea") {
    return (
      <div className="bg-white p-2 rounded-md border border-gray-200 whitespace-pre-line">
        {item.value}
      </div>
    );
  }
  return <span className="text-gray-700">{item.value}</span>;
};

export default EventDetailsModal;
