import { useState } from 'react';
import './App.css';
import GoogleLogin from './components/GoogleLogin';
import MultiCalendarView from './components/MultiCalendarView';

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">入院予定管理システム</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-2 sm:px-0">
          {/* Googleログインコンポーネント */}
          <div className="mb-8">
            <GoogleLogin 
              onLoginSuccess={handleLoginSuccess} 
              onLogout={handleLogout} 
            />
          </div>
          
          {/* 複数カレンダー表示コンポーネント */}
          <MultiCalendarView 
            user={user} 
            token={token}
          />
        </div>
      </main>
      
      <footer className="bg-white shadow mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © 2025 病院カレンダーアプリ - 医局予定表
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;