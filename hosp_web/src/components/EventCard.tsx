// EventCard.tsx の更新版

import React from 'react';
import { getDoctorColor } from '../config/doctorColorConfig';

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
  // 確認済みフラグ
  isConfirmed?: boolean;
  // 患者情報
  patientInfo?: {
    id: string | null;
    name: string | null;
    age: string | null;
    gender: string | null;
    diagnosis: string | null;
    doctor: string | null;
  };
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

// イベントの説明から確認=trueかどうかを判定する関数
export const isConfirmedEvent = (event: CalendarEvent): boolean => {
  if (!event.description) return false;
  
  // 確認パラメータを探す
  return decodeEntities(event.description).includes('<確認>true</確認>');
};

export const isScheduleEvent = (event: CalendarEvent): boolean => {
  if (!event.summary) return false;
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

// イベントの説明から患者情報を取得
const getPatientInfo = (event: CalendarEvent): { 
  id: string | null;
  name: string | null;
  age: string | null;
  gender: string | null;
  diagnosis: string | null;
  doctor: string | null;
} => {
  if (!event.description) return { 
    id: null, 
    name: null, 
    age: null, 
    gender: null, 
    diagnosis: null,
    doctor: null 
  };
  
  const decodedDesc = decodeEntities(event.description);
  
  // 患者IDを抽出（正しいタグ名に修正）
  const patientIdMatch = decodedDesc.match(/<ID>([^<]*)<\/ID>/);
  const patientId = patientIdMatch ? patientIdMatch[1].trim() : null;
  
  // 患者名を抽出（正しいタグ名に修正）
  const patientNameMatch = decodedDesc.match(/<氏名>([^<]*)<\/氏名>/);
  const patientName = patientNameMatch ? patientNameMatch[1].trim() : null;
  
  // 年齢を抽出
  const ageMatch = decodedDesc.match(/<年齢>([^<]*)<\/年齢>/);
  const age = ageMatch ? ageMatch[1].trim() : null;
  
  // 性別を抽出
  const genderMatch = decodedDesc.match(/<性別>([^<]*)<\/性別>/);
  const gender = genderMatch ? genderMatch[1].trim() : null;
  
  // 病名を抽出
  const diagnosisMatch = decodedDesc.match(/<病名>([^<]*)<\/病名>/);
  const diagnosis = diagnosisMatch ? diagnosisMatch[1].trim() : null;
  
  // 主治医を抽出
  const doctorMatch = decodedDesc.match(/<主治医>([^<]*)<\/主治医>/);
  const doctor = doctorMatch ? doctorMatch[1].trim() : null;
  
  return { 
    id: patientId, 
    name: patientName, 
    age: age, 
    gender: gender, 
    diagnosis: diagnosis, 
    doctor: doctor 
  };
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
  
  // 確認済みかどうかをチェック
  const isConfirmed = isConfirmedEvent(event);
  
  // 患者情報を取得
  const patientInfo = getPatientInfo(event);
  
  // 主治医名に基づいてボーダー色を決定（別ファイルの関数を使用）
  const doctorBorderColor = getDoctorColor(patientInfo.doctor);
  
  // 時間文字列を作成
  const timeString = allDay 
    ? '' 
    : `${formatTime(event.start.dateTime)}〜${formatTime(event.end.dateTime)}`;

  // 患者情報があるかどうかを確認
  const hasPatientInfo = patientInfo.id || patientInfo.name || patientInfo.age || 
                         patientInfo.gender || patientInfo.diagnosis || patientInfo.doctor;
    
  // 性別に基づいたテキスト色を設定
  const genderTextColor = 
    patientInfo.gender === '男' || patientInfo.gender?.toLowerCase() === 'male' 
      ? 'text-blue-600' 
      : patientInfo.gender === '女' || patientInfo.gender?.toLowerCase() === 'female' 
        ? 'text-pink-600' 
        : 'text-gray-800';

  return (
    <div 
      className={`shadow-sm p-2 mb-1 sm:p-3 sm:mb-2 ${!isPriority && !isSchedule ? 'border-l-4' : ''} ${isPriority ? 'border-red-500' : doctorBorderColor} ${calendarBgClass} hover:shadow-md transition-shadow cursor-pointer ${isPriority ? 'bg-red-50' : ''} ${isConfirmed ? 'bg-green-50' : ''}`}
      onClick={() => onViewDetails(event)}
    >
      <div className="flex flex-col">
        {/* 上部エリア - 患者ID、時間 */}
        <div className="flex items-center justify-between">
          {/* 患者ID (確認済みの場合はチェックマークを追加) */}
          {patientInfo.id && (
            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 flex items-center">
              {isConfirmed && <span className="mr-1">✓</span>}
              ID: {patientInfo.id}
            </span>
          )}
          
          {/* 時間 */}
          {timeString && (
            <span className="text-xs text-gray-600 ml-auto">
              {timeString}
            </span>
          )}
          
          {/* 優先度バッジ */}
          {isPriority && (
            <span className="px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 text-right ml-1">
              重要
            </span>
          )}
        </div>
        
        {/* タイトル - 患者情報がある場合は表示しない */}
        {!hasPatientInfo && (
          <h3 className={`font-medium text-left mt-1 ${isPriority ? 'text-red-800' : isConfirmed ? 'text-green-800' : 'text-gray-800'} text-sm sm:text-base mb-0.5 sm:mb-1 line-clamp-2`}>
            {isConfirmed ? `✓ ${event.summary || '無題の予定'}` : event.summary || '無題の予定'}
          </h3>
        )}
        
        {/* 患者情報エリア */}
        <div className="mt-1">
          {patientInfo.name && (
            <div className={`text-sm ${genderTextColor} font-medium`}>
              {patientInfo.name}
              {patientInfo.age && <span className="ml-2">{patientInfo.age}歳</span>}
              {patientInfo.gender && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  patientInfo.gender === '男' || patientInfo.gender?.toLowerCase() === 'male' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-pink-100 text-pink-800'
                }`}>
                  {patientInfo.gender}
                </span>
              )}
            </div>
          )}
          
          {/* 病名 */}
          {patientInfo.diagnosis && (
            <div className="text-xs text-gray-700 mt-0.5">
              <span className="font-medium">病名:</span> {patientInfo.diagnosis}
            </div>
          )}
          
          {/* 主治医 */}
          {patientInfo.doctor && (
            <div className="text-xs text-gray-600 mt-0.5">
              <span className="font-medium">主治医:</span> {patientInfo.doctor}
            </div>
          )}
        </div>
        
        {/* 場所情報 */}
        {event.location && (
          <div className="text-xs text-gray-600 flex items-start mt-1">
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