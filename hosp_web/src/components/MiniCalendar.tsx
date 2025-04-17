// src/components/MiniCalendar.tsx
import React, { useState, useEffect } from 'react';
import { isNationalHoliday } from '../modules/holidayChecker';

interface MiniCalendarProps {
  currentMonth: Date;
  onMonthChange: (newMonth: Date) => void;
  onDateClick: (date: Date) => void;
  selectedDate?: Date;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ 
  currentMonth, 
  onMonthChange, 
  onDateClick,
  selectedDate
}) => {
  const [calendarDays, setCalendarDays] = useState<Date[][]>([]);
  
  // 月の初日と最終日を取得
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  // 曜日の配列
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  
  // 月名の配列
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];
  
  // カレンダーデータの生成
  useEffect(() => {
    const days: Date[][] = [];
    let currentWeek: Date[] = [];
    
    // 先月の日を追加
    const firstDayWeekday = firstDayOfMonth.getDay();
    const prevMonthLastDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
    
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const prevMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthLastDate - i);
      currentWeek.push(prevMonthDate);
    }
    
    // 今月の日を追加
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      
      currentWeek.push(date);
      
      if (currentWeek.length === 7) {
        days.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // 次月の日を追加
    if (currentWeek.length > 0) {
      let nextMonthDay = 1;
      while (currentWeek.length < 7) {
        const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, nextMonthDay);
        currentWeek.push(nextMonthDate);
        nextMonthDay++;
      }
      days.push(currentWeek);
    }
    
    setCalendarDays(days);
  }, [currentMonth]);
  
  // 前月へ
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };
  
  // 次月へ
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };
  
  // 今日の日付
  const today = new Date();
  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };
  
  // 選択された日付と同じかどうか
  const isSameDate = (date1: Date, date2?: Date) => {
    if (!date2) return false;
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
  };
  
  // 現在の月かどうか
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };
  
  // 日付のスタイルを取得
  const getDateClasses = (date: Date) => {
    let classes = 'flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full mx-auto cursor-pointer transition-colors text-xs sm:text-sm font-medium ';
    
    // 現在の月以外は薄い色
    if (!isCurrentMonth(date)) {
      classes += 'text-gray-400 hover:bg-gray-200 ';
      return classes;
    }
    
    // 今日の日付
    if (isToday(date)) {
      classes += 'bg-blue-500 text-white hover:bg-blue-600 ';
      return classes;
    }
    
    // 選択された日付
    if (selectedDate && isSameDate(date, selectedDate)) {
      classes += 'bg-blue-100 text-blue-800 hover:bg-blue-200 ';
      return classes;
    }
    
    // 日曜日または祝日
    if (date.getDay() === 0 || isNationalHoliday(date)) {
      classes += 'text-red-600 hover:bg-red-100 ';
      return classes;
    }
    
    // 土曜日
    if (date.getDay() === 6) {
      classes += 'text-amber-600 hover:bg-amber-100 ';
      return classes;
    }
    
    // その他の平日
    classes += 'text-gray-700 hover:bg-gray-200 ';
    return classes;
  };
  
  // 日付クリック時のハンドラ
  const handleDateClick = (date: Date) => {
    onDateClick(date);
  };
  
  return (
    <div className="bg-white border rounded-lg shadow-sm p-2 sm:p-3">
      {/* カレンダーヘッダー */}
      <div className="flex justify-between items-center mb-2">
        <button 
          onClick={goToPreviousMonth}
          className="p-1 rounded text-gray-600 hover:bg-gray-200 transition-colors"
          aria-label="前月"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="text-sm sm:text-base font-medium">
          {`${currentMonth.getFullYear()}年 ${monthNames[currentMonth.getMonth()]}`}
        </div>
        
        <button 
          onClick={goToNextMonth}
          className="p-1 rounded text-gray-600 hover:bg-gray-200 transition-colors"
          aria-label="次月"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-center">
        {weekDays.map((day, index) => (
          <div 
            key={day} 
            className={`text-xs ${
              index === 0 ? 'text-red-600' : 
              index === 6 ? 'text-amber-600' : 
              'text-gray-700'
            } font-medium`}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* カレンダー本体 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.flat().map((date, index) => (
          <div 
            key={index} 
            className="text-center py-1"
            onClick={() => handleDateClick(date)}
          >
            <div className={getDateClasses(date)}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniCalendar;