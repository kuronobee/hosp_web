/**
 * 日本の祝日判定ライブラリ
 * C#コードからTypeScriptに移植したバージョン
 */

// 祝日情報の型定義
export enum HolidayType {
    WEEKDAY = 0,   // 平日
    HOLIDAY = 1,   // 休日
    C_HOLIDAY = 2, // 振替休日
    SYUKUJITSU = 3 // 祝日
  }
  
  export interface HolidayInfo {
    holiday: HolidayType;   // その日の種類
    week: number;           // その日の曜日 (0: 日曜, 1: 月曜, ..., 6: 土曜)
    name: string | null;    // その日の名称（祝日名など）
  }
  
  // 祝日法施行日: 1948年7月20日
  const SYUKUJITSU_DATE = new Date(1948, 6, 20);
  
  // 振替休日制度の開始日: 1973年4月12日
  const FURIKAE_DATE = new Date(1973, 3, 12);
  
  /**
   * 春分の日を計算するメソッド
   * @param year 計算する年
   * @returns 春分の日の日付（日）
   */
  export function calculateSpringEquinox(year: number): number {
    let day: number;
    
    if (year <= 1947) {
      day = 99; // 祝日法施行前
    } else if (year <= 1979) {
      day = Math.floor(20.8357 + (0.242194 * (year - 1980)) - Math.floor((year - 1983) / 4));
    } else if (year <= 2099) {
      day = Math.floor(20.8431 + (0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4));
    } else if (year <= 2150) {
      day = Math.floor(21.851 + (0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4));
    } else {
      day = 99; // 2151年以降は略算式が無いので不明
    }
    
    return day;
  }
  
  /**
   * 秋分の日を計算するメソッド
   * @param year 計算する年
   * @returns 秋分の日の日付（日）
   */
  export function calculateAutumnEquinox(year: number): number {
    let day: number;
    
    if (year <= 1947) {
      day = 99; // 祝日法施行前
    } else if (year <= 1979) {
      day = Math.floor(23.2588 + (0.242194 * (year - 1980)) - Math.floor((year - 1983) / 4));
    } else if (year <= 2099) {
      day = Math.floor(23.2488 + (0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4));
    } else if (year <= 2150) {
      day = Math.floor(24.2488 + (0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4));
    } else {
      day = 99; // 2151年以降は略算式が無いので不明
    }
    
    return day;
  }
  
  /**
   * 指定された日付の祝日情報を取得するメソッド
   * @param date 判定する日付
   * @returns 祝日情報
   */
  export function getHolidayInfo(date: Date): HolidayInfo {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScriptの月は0始まりなので+1
    const day = date.getDate();
    const dayOfWeek = date.getDay(); // 0: 日曜, 1: 月曜, ... 6: 土曜
    
    // 結果オブジェクトの初期化
    const result: HolidayInfo = {
      week: dayOfWeek,
      holiday: HolidayType.WEEKDAY,
      name: null
    };
    
    // 祝日法施行以前
    if (date < SYUKUJITSU_DATE) {
      return result;
    }
    
    // 月別の祝日判定
    switch (month) {
      // 1月
      case 1:
        if (day === 1) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "元日";
        } else {
          if (year >= 2000) {
            // 第2月曜日: 成人の日（2000年以降）
            if (Math.floor((day - 1) / 7) === 1 && dayOfWeek === 1) {
              result.holiday = HolidayType.SYUKUJITSU;
              result.name = "成人の日";
            }
          } else {
            // 1月15日: 成人の日（2000年未満）
            if (day === 15) {
              result.holiday = HolidayType.SYUKUJITSU;
              result.name = "成人の日";
            }
          }
        }
        break;
        
      // 2月
      case 2:
        if (day === 11) {
          // 建国記念の日（1967年以降）
          if (year >= 1967) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "建国記念の日";
          }
        } else if (day === 23) {
          // 天皇誕生日（2020年以降）
          if (year >= 2020) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "天皇誕生日";
          }
        } else if (year === 1989 && day === 24) {
          // 昭和天皇の大喪の礼
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "昭和天皇の大喪の礼";
        }
        break;
        
      // 3月
      case 3:
        // 春分の日
        if (day === calculateSpringEquinox(year)) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "春分の日";
        }
        break;
        
      // 4月
      case 4:
        if (day === 29) {
          if (year >= 2007) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "昭和の日";
          } else if (year >= 1989) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "みどりの日";
          } else {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "天皇誕生日"; // 昭和天皇
          }
        } else if (year === 2019 && day === 30) {
          // 平成天皇の退位日
          result.holiday = HolidayType.HOLIDAY;
          result.name = "国民の休日";
        } else if (year === 1959 && day === 10) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "皇太子明仁親王の結婚の儀";
        }
        break;
        
      // 5月
      case 5:
        if (day === 3) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "憲法記念日";
        } else if (day === 4) {
          if (year >= 2007) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "みどりの日";
          } else if (year >= 1986) {
            // 5/4が日曜日は『只の日曜』、月曜日は『憲法記念日の振替休日』(～2006年)
            if (dayOfWeek > 1) { // 火曜日以降(火～土)
              result.holiday = HolidayType.HOLIDAY;
              result.name = "国民の休日";
            }
          }
        } else if (day === 5) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "こどもの日";
        } else if (day === 6) {
          // [5/3,5/4が日曜]ケースのみ、ここで判定
          if (year >= 2007 && (dayOfWeek === 2 || dayOfWeek === 3)) {
            result.holiday = HolidayType.C_HOLIDAY;
            result.name = "振替休日";
          }
        } else {
          if (year === 2019 && day === 1) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "即位の日"; // 徳仁親王
          } else if (year === 2019 && day === 2) {
            result.holiday = HolidayType.HOLIDAY;
            result.name = "国民の休日";
          }
        }
        break;
        
      // 6月
      case 6:
        if (year === 1993 && day === 9) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "皇太子徳仁親王の結婚の儀";
        }
        break;
        
      // 7月
      case 7:
        if (year >= 2003 && year !== 2020 && year !== 2021) {
          // 第3月曜日: 海の日（2003年以降、2020-2021年を除く）
          if (Math.floor((day - 1) / 7) === 2 && dayOfWeek === 1) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "海の日";
          }
        } else if (year >= 1996 && year !== 2020 && year !== 2021) {
          // 7月20日: 海の日（1996年以降、2020-2021年を除く）
          if (day === 20) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "海の日";
          }
        } else if ((year === 2020 && day === 23) || (year === 2021 && day === 22)) {
          // オリンピック特別対応（2020-2021年）
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "海の日";
        }
        
        if ((year === 2020 && day === 24) || (year === 2021 && day === 23)) {
          // オリンピック特別対応（2020-2021年）
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "スポーツの日";
        }
        break;
        
      // 8月
      case 8:
        if (day === 11 && year !== 2020 && year !== 2021) {
          // 山の日（2016年以降、2020-2021年を除く）
          if (year >= 2016) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "山の日";
          }
        }
        if ((day === 10 && year === 2020) || (day === 8 && year === 2021)) {
          // オリンピック特別対応（2020-2021年）
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "山の日";
        }
        break;
        
      // 9月
      case 9:
        // 秋分の日
        if (day === calculateAutumnEquinox(year)) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "秋分の日";
        } else {
          if (year >= 2003) {
            // 第3月曜日: 敬老の日（2003年以降）
            if (Math.floor((day - 1) / 7) === 2 && dayOfWeek === 1) {
              result.holiday = HolidayType.SYUKUJITSU;
              result.name = "敬老の日";
            } else if (dayOfWeek === 2) {
              // 火曜日＆[秋分の日の前日]
              if (day === calculateAutumnEquinox(year) - 1) {
                result.holiday = HolidayType.HOLIDAY;
                result.name = "国民の休日";
              }
            }
          } else if (year >= 1966) {
            // 9月15日: 敬老の日（1966年以降2003年未満）
            if (day === 15) {
              result.holiday = HolidayType.SYUKUJITSU;
              result.name = "敬老の日";
            }
          }
        }
        break;
        
      // 10月
      case 10:
        if (year !== 2020 && year !== 2021) {
          if (year >= 2000) {
            // 第2月曜日: 体育の日/スポーツの日（2000年以降、2020-2021年を除く）
            if (Math.floor((day - 1) / 7) === 1 && dayOfWeek === 1) {
              result.holiday = HolidayType.SYUKUJITSU;
              if (year >= 2021) {
                result.name = "スポーツの日";
              } else {
                result.name = "体育の日";
              }
            }
          } else if (year >= 1966) {
            // 10月10日: 体育の日（1966年以降2000年未満）
            if (day === 10) {
              result.holiday = HolidayType.SYUKUJITSU;
              result.name = "体育の日";
            }
          }
        }
        if (year === 2019 && day === 22) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "即位礼正殿の儀";
        }
        break;
        
      // 11月
      case 11:
        if (day === 3) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "文化の日";
        } else if (day === 23) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "勤労感謝の日";
        } else if (year === 1990 && day === 12) {
          result.holiday = HolidayType.SYUKUJITSU;
          result.name = "即位礼正殿の儀"; // 平成天皇
        }
        break;
        
      // 12月
      case 12:
        if (day === 23) {
          // 天皇誕生日（1989年以降2018年以前）
          if (year >= 1989 && year <= 2018) {
            result.holiday = HolidayType.SYUKUJITSU;
            result.name = "天皇誕生日"; // 平成天皇
          }
        }
        break;
    }
    
    // 振替休日の判定（振替休日施行日:1973/4/12以降）
    // [ 対象日≠祝日/休日 ＆ 対象日＝月曜日 ]のみ、前日(＝日曜日)を祝日判定する。
    // 前日(＝日曜日)が祝日の場合は"振替休日"となる。
    if (!result.name && dayOfWeek === 1) {
      if (date >= FURIKAE_DATE) {
        // 振替休日施行以降
        const previousDay = new Date(date);
        previousDay.setDate(previousDay.getDate() - 1);
        
        const prevHoliday = getHolidayInfo(previousDay);
        if (prevHoliday.holiday === HolidayType.SYUKUJITSU) {
          result.holiday = HolidayType.C_HOLIDAY;
          result.name = "振替休日";
        }
      }
    }
    
    return result;
  }
  
  /**
   * 指定された日付が休日（土日祝）かどうかを判定
   * @param date 判定する日付
   * @returns 休日の場合はtrue、それ以外はfalse
   */
  export function isHoliday(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || // 日曜
           dayOfWeek === 6 || // 土曜
           getHolidayInfo(date).holiday !== HolidayType.WEEKDAY; // 祝日・振替休日・国民の休日
  }
  
/**
 * 指定された日付が祝日かどうかを判定
 * @param date 判定する日付
 * @returns 祝日の場合はtrue、それ以外はfalse
 */
export function isNationalHoliday(date: Date): boolean {
    const info = getHolidayInfo(date);
    // 祝日、振替休日、国民の休日すべてを含める
    return info.holiday === HolidayType.SYUKUJITSU || 
           info.holiday === HolidayType.C_HOLIDAY || 
           info.holiday === HolidayType.HOLIDAY ||
           isYearEndHoliday(date); // 年末年始休日も含める
  }
  
  /**
   * 指定された日付が土曜日を除く休日（日曜・祝日）かどうかを判定
   * @param date 判定する日付
   * @returns 日曜または祝日の場合はtrue、それ以外はfalse
   */
  export function isHolidayWithoutSaturday(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || // 日曜
           getHolidayInfo(date).holiday !== HolidayType.WEEKDAY; // 祝日・振替休日・国民の休日
  }
  
  /**
   * 指定された日付が週末（土日）かどうかを判定
   * @param date 判定する日付
   * @returns 土曜または日曜の場合はtrue、それ以外はfalse
   */
  export function isWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }
  
  /**
   * 祝日名を取得
   * @param date 判定する日付
   * @returns 祝日名（祝日でない場合はnull）
   */
  export function getHolidayName(date: Date): string | null {
    return getHolidayInfo(date).name;
  }

  /**
 * 指定された日付が年末年始休日（12月28日〜1月3日）かどうかを判定
 * @param date 判定する日付
 * @returns 年末年始休日の場合はtrue、それ以外はfalse
 */
function isYearEndHoliday(date: Date): boolean {
    const month = date.getMonth() + 1; // JavaScriptの月は0始まり
    const day = date.getDate();
    
    // 12月28日〜12月31日
    if (month === 12 && day >= 28 && day <= 31) {
      return true;
    }
    
    // 1月1日〜1月3日
    if (month === 1 && day >= 1 && day <= 3) {
      return true;
    }
    
    return false;
  }