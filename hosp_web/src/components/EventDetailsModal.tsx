import React, { useState, useEffect } from 'react';
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

        return `${startDate}`;
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

// 非表示にするフィールド名のリスト
const HIDDEN_FIELDS = ['CID', 'EID', 'Date'];

// XMLの内容を解析してリスト形式に変換する関数
const parseXmlContent = (xmlContent: string): { title: string; items: { name: string; value: string; type: string }[] } | null => {
    try {
        // 患者情報を抽出
        const items: { name: string; value: string; type: string }[] = [];

        // PatientInfo内のタグを抽出
        const tagPattern = /<([^>\s]+)>(.*?)<\/\1>/g;
        let tagMatch;

        while ((tagMatch = tagPattern.exec(xmlContent)) !== null) {
            if (tagMatch[1] !== 'PatientInfo') {  // PatientInfoタグは除外
                const tagName = tagMatch[1].trim();
                
                // 非表示フィールドはスキップ
                if (HIDDEN_FIELDS.includes(tagName)) {
                    continue;
                }
                
                const tagValue = tagMatch[2].trim();
                
                // タグの種類に応じたタイプを設定（表示スタイルに影響）
                let fieldType = 'text';
                
                if (tagName === 'ID' || tagName === 'Age') {
                    fieldType = 'number';
                } else if (tagName === 'Gender') {
                    fieldType = 'gender';
                } else if (tagName === 'AT') {
                    fieldType = 'boolean';
                } else if (tagName === 'Comment' || tagName === 'Description') {
                    fieldType = 'textarea';
                }

                items.push({
                    name: tagName,
                    value: tagValue,
                    type: fieldType
                });
            }
        }

        return {
            title: '患者情報',
            items: items
        };
    } catch (error) {
        console.error('XML解析エラー:', error);
        return null;
    }
};

// 日本語のフィールド名マッピング
const FIELD_NAME_MAP: Record<string, string> = {
    'ID': '患者ID',
    'Name': '氏名',
    'Age': '年齢',
    'Gender': '性別',
    'Address': '住所',
    'Phone': '電話番号',
    'Comment': 'コメント',
    'Description': '詳細',
    'AT': 'アノテーションフラグ'
};

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentTab, setCurrentTab] = useState('details'); // 'details' or 'xml'

    useEffect(() => {
        if (event) {
            setIsVisible(true);
        }
    }, [event]);

    const handleClose = () => {
        setIsVisible(false);
        // アニメーション完了後にモーダルを閉じる
        setTimeout(() => {
            onClose();
        }, 300);
    };

    if (!event) return null;

    // イベントのカレンダー名を取得
    const calendarName = event.calendarId && CALENDAR_NAMES[event.calendarId]
        ? CALENDAR_NAMES[event.calendarId]
        : 'カレンダー';
    
    const replacedDescription = event?.description ? decodeEntities(event.description) : '';
    
    // 説明文からXMLコンテンツを解析
    const xmlData = replacedDescription ? parseXmlContent(replacedDescription) : null;
    
    // 通常の説明文（XML以外の部分）
    const regularDescription = replacedDescription.replace(/<!--患者管理用-->[\s\S]*?<!--ここまで-->/g, '').trim();

    // XMLデータがあるかどうかでタブ表示を決定
    const hasXmlData = xmlData && xmlData.items.length > 0;

    return (
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 modal-overlay ${isVisible ? 'opacity-100 modal-enter' : 'opacity-0 modal-exit'}`}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={(e) => {
                // モーダルの背景をクリックしたときに閉じる（タッチデバイス向け）
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div 
                className={`bg-white rounded-lg shadow-xl w-full mx-2 sm:mx-4 sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col transform transition-transform duration-300 custom-scrollbar ${isVisible ? 'scale-100 modal-enter-content' : 'scale-95 modal-exit-content'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ヘッダー - よりコンパクトに */}
                <div className="flex justify-between items-center p-3 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                    <h2 className="text-lg sm:text-xl font-semibold truncate">
                        {event.summary || '無題の予定'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-white hover:text-gray-200 focus:outline-none transition-colors p-1"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {/* タブ（XMLデータがある場合のみ表示） */}
                {hasXmlData && (
                    <div className="flex border-b">
                        <button 
                            className={`px-3 py-1 sm:px-4 sm:py-2 font-medium text-sm sm:text-base tab-transition ${currentTab === 'details' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setCurrentTab('details')}
                        >
                            基本情報
                        </button>
                        <button 
                            className={`px-3 py-1 sm:px-4 sm:py-2 font-medium text-sm sm:text-base tab-transition ${currentTab === 'xml' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setCurrentTab('xml')}
                        >
                            患者情報
                        </button>
                    </div>
                )}

                {/* 内容 - スクロール可能 */}
                <div className="p-3 sm:p-4 overflow-y-auto flex-grow custom-scrollbar">
                    {currentTab === 'details' ? (
                        <div className="space-y-3 sm:space-y-4">
                            {/* 日時 */}
                            <div className="flex p-1 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="w-6 sm:w-8 flex-shrink-0 text-blue-500">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <div className="ml-2 text-sm sm:text-base">
                                    <p className="text-gray-700">{formatEventTime(event)}</p>
                                </div>
                            </div>

                            {/* カレンダー */}
                            <div className="flex p-1 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="w-6 sm:w-8 flex-shrink-0 text-green-500">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                    </svg>
                                </div>
                                <div className="ml-2 text-sm sm:text-base">
                                    <p className="text-gray-700">{calendarName}</p>
                                </div>
                            </div>

                            {/* 場所 */}
                            {event.location && (
                                <div className="flex p-1 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-6 sm:w-8 flex-shrink-0 text-red-500">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                    </div>
                                    <div className="ml-2 text-sm sm:text-base">
                                        <p className="text-gray-700">{event.location}</p>
                                    </div>
                                </div>
                            )}

                            {/* 通常の説明文（XML以外） */}
                            {regularDescription && (
                                <div className="flex p-1 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="w-6 sm:w-8 flex-shrink-0 text-purple-500">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </div>
                                    <div className="ml-2 text-sm sm:text-base">
                                        <p className="text-gray-700 whitespace-pre-line">{regularDescription}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // XMLデータ表示タブ - 交互に色の変わるリスト表示
                        <div className="bg-white rounded-lg">
                            {xmlData && (
                                <div className="space-y-3 sm:space-y-4">
                                    <h3 className="font-medium text-gray-700 border-l-4 border-blue-500 pl-2 text-sm sm:text-base">
                                        {xmlData.title}
                                    </h3>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
                                        {xmlData.items.map((item, index) => {
                                            // 日本語のフィールド名を取得（なければ元の名前）
                                            const displayName = FIELD_NAME_MAP[item.name] || item.name;
                                            
                                            // タイプに応じて表示を変更
                                            let valueElement;
                                            
                                            if (item.type === 'boolean') {
                                                // 真偽値（アノテーションフラグなど）
                                                const isFlagActive = item.value.toLowerCase() === 'true';
                                                valueElement = (
                                                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isFlagActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {isFlagActive ? 'オン' : 'オフ'}
                                                    </div>
                                                );
                                            } else if (item.type === 'number') {
                                                // 数値
                                                valueElement = <span className="font-mono text-blue-600">{item.value}</span>;
                                            } else if (item.type === 'gender') {
                                                // 性別
                                                valueElement = (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        item.value === '男' || item.value.toLowerCase() === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                                                    }`}>
                                                        {item.value}
                                                    </span>
                                                );
                                            } else if (item.type === 'textarea') {
                                                // 複数行テキスト
                                                valueElement = (
                                                    <div className="bg-white p-2 rounded-md text-gray-700 whitespace-pre-line text-xs sm:text-sm mt-1 border border-gray-200">
                                                        {item.value}
                                                    </div>
                                                );
                                            } else {
                                                // 通常のテキスト
                                                valueElement = <span className="text-gray-700">{item.value}</span>;
                                            }
                                            
                                            return (
                                                <div 
                                                    key={index} 
                                                    className={`p-2 sm:p-3 transition-colors flex items-start ${
                                                        index % 2 === 0 ? 'bg-white' : 'bg-blue-50'
                                                    } hover:bg-blue-100`}
                                                >
                                                    <div className="font-medium text-gray-600 w-1/3 pr-2 sm:pr-4 text-xs sm:text-sm">{displayName}</div>
                                                    <div className="flex-1 text-xs sm:text-sm">{valueElement}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* フッター - 小さな画面向けに最適化 */}
                <div className="p-3 sm:p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                    <button
                        onClick={handleClose}
                        className="px-3 py-1 sm:px-4 sm:py-2 bg-blue-500 text-white rounded text-sm sm:text-base hover:bg-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventDetailsModal;