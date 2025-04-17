// src/components/ScrollToTopButton.tsx
import { useState, useEffect } from 'react';

interface ScrollToTopButtonProps {
  // モーダルが開いているかどうかのプロパティを追加
  isModalOpen: boolean;
}

/**
 * スクロールトップボタンコンポーネント
 * スマートフォン表示時に画面右下に固定表示され、クリックするとページ上部に戻るボタン
 * モーダルが表示されている時は非表示になる
 */
const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ isModalOpen }) => {
  // ボタンの表示・非表示を管理するstate
  const [isVisible, setIsVisible] = useState(false);
  // モバイル表示かどうかを管理するstate
  const [isMobile, setIsMobile] = useState(false);

  // 画面幅の変更を検知してモバイル表示かどうかを判定
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 初期チェック
    checkIsMobile();
    
    // リサイズイベントにハンドラーを登録
    window.addEventListener('resize', checkIsMobile);
    
    // コンポーネントのアンマウント時にイベントリスナーを削除
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // スクロール位置に応じてボタンの表示・非表示を切り替える
  useEffect(() => {
    // スクロールイベントのハンドラー
    const toggleVisibility = () => {
      // ページを200px以上スクロールしたらボタンを表示
      if (window.scrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // 初期チェック
    toggleVisibility();
    
    // スクロールイベントにハンドラーを登録
    window.addEventListener('scroll', toggleVisibility);

    // コンポーネントのアンマウント時にイベントリスナーを削除
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // ページトップにスクロールする関数
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // スムーズスクロール
    });
  };

  // 以下の条件のいずれかに該当する場合は何も表示しない
  // 1. モバイル表示でない場合
  // 2. スクロール位置が浅い場合
  // 3. モーダルが表示されている場合
  if (!isMobile || !isVisible || isModalOpen) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="scroll-to-top-button fixed bottom-4 right-4 z-50 p-3 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-300 flex items-center justify-center opacity-80 hover:opacity-100"
      aria-label="ページの先頭へ戻る"
      style={{
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    </button>
  );
};

export default ScrollToTopButton;