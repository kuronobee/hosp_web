// App.tsxの更新部分

import { useState } from 'react';
import './App.css';
import GoogleLogin from './components/GoogleLogin';
import MultiCalendarView from './components/MultiCalendarView';
import logoImage from './assets/logo.gif'; // ロゴをインポート

// GoogleUserの型定義
interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

function App() {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [token, setToken] = useState<string>('');

  // ログイン成功時の処理
  const handleLoginSuccess = (userData: GoogleUser, accessToken: string) => {
    setUser(userData);
    setToken(accessToken);
    console.log('App: ログイン成功', userData);
  };

  // ログアウト時の処理
  const handleLogout = () => {
    setUser(null);
    setToken('');
    console.log('App: ログアウト');
  };

  return (
    <div className="min-h-screen bg-gray-50 m-0">
      <header className="bg-white shadow relative">
        {/* ヘッダーの余白を削減、特に小さい画面では左右の余白を小さく */}
        <div className="w-full mx-auto py-3 px-2 sm:px-4 md:px-6 flex justify-between items-center">
          {/* タイトルとロゴ */}
          <div className="flex items-center">
            {/* ロゴ画像 */}
            <img 
              src={logoImage} 
              alt="入院管理システムロゴ" 
              className="h-8 sm:h-10 md:h-12 mr-2 sm:mr-3"
            />
            {/* アプリ名 */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
              入院管理2025 web版
            </h1>
          </div>
          
          {/* 右上にコンパクトなGoogle連携コンポーネント配置 */}
          <div className="z-10">
            <GoogleLogin 
              onLoginSuccess={handleLoginSuccess} 
              onLogout={handleLogout} 
            />
          </div>
        </div>
      </header>
      
      {/* コンテンツエリアの余白を削減 */}
      <main className="w-full mx-auto py-2 px-1 sm:px-3 md:px-4">
        <div className="py-2">
          {/* 複数カレンダー表示コンポーネント */}
          <MultiCalendarView 
            user={user} 
            token={token}
          />
        </div>
      </main>
      
      <footer className="bg-white shadow mt-4 py-2">
        <div className="w-full mx-auto px-2 sm:px-4">
          <p className="text-center text-gray-500 text-xs">
            © 2025 入院管理2025 web版 - 医局予定表
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;