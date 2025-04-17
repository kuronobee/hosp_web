// src/config/doctorColorConfig.ts
// 主治医名と色のマッピングを管理するファイル

/**
 * 主治医名と色のマッピング
 * キー: 主治医名（部分一致で検索）
 * 値: Tailwind CSSのボーダークラス名
 * 
 * 色は画像の主治医リストに合わせて設定
 */
export const DOCTOR_COLORS: Record<string, string> = {
  '有村': 'border-orange-300',     // サーモンピンク（画像の一番上の色）
  '黒木康': 'border-teal-500',      // ティール（画像の2番目）
  '黒木（直）': 'border-teal-700',      // 濃いティール（画像の3番目）
  '児玉': 'border-red-600',        // 赤（画像の4番目）
  '小牧': 'border-yellow-400',     // 黄色（画像の5番目）
  '島津': 'border-purple-600',     // 紫（画像の6番目）
  '水光': 'border-pink-500',       // ピンク（画像の7番目）
  '田中': 'border-blue-300',       // 水色（画像の8番目）
  '棚橋': 'border-blue-200',       // 薄い水色（画像の9番目）
  '冨田': 'border-blue-600',       // 青（画像の10番目）
  '長友': 'border-green-400',      // 黄緑（画像の11番目）
  '松浦': 'border-blue-800',       // 濃い青（画像の12番目）
  '森林': 'border-purple-800',     // 濃い紫（画像の13番目）
  '山口': 'border-orange-500',     // オレンジ（画像の14番目）
  '山本': 'border-green-700',      // 深緑（画像の15番目）
};

/**
 * デフォルトのボーダー色
 * マッピングに一致しない場合に使用
 */
export const DEFAULT_BORDER_COLOR = 'border-gray-300';

/**
 * フォールバック用の色リスト
 * 主治医名からハッシュ値を計算して色を決定する場合に使用
 */
export const FALLBACK_COLORS = [
  'border-red-700',
  'border-blue-700',
  'border-green-700',
  'border-yellow-700',
  'border-purple-700',
  'border-pink-700',
  'border-indigo-700',
  'border-sky-500',    // 空色
  'border-rose-500',   // ローズ
  'border-violet-500', // バイオレット
  'border-slate-500',  // スレート
  'border-stone-500',  // ストーン
  'border-neutral-500' // ニュートラル
];

/**
 * 主治医名から色を取得する関数
 * @param doctorName 主治医名
 * @returns ボーダー色のクラス名
 */
export function getDoctorColor(doctorName: string | null): string {
  if (!doctorName) return DEFAULT_BORDER_COLOR;

  // 登録されている主治医名との部分一致をチェック
  for (const [key, color] of Object.entries(DOCTOR_COLORS)) {
    if (doctorName.includes(key)) {
      // 空の色指定があった場合はデフォルト色を使用
      return color || DEFAULT_BORDER_COLOR;
    }
  }

  // 一致しない場合はハッシュ関数で色を決定
  let hash = 0;
  for (let i = 0; i < doctorName.length; i++) {
    hash = doctorName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash % FALLBACK_COLORS.length);
  return FALLBACK_COLORS[colorIndex];
}