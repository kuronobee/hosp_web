import { useState } from 'react';

// シンプルなログイン状態管理コンポーネント
const SimpleLocalLogin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const handleLogin = () => {
    // ダミーログイン処理
    setIsLoggedIn(true);
    setUserName('テストユーザー');
    setUserEmail('test@example.com');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserName('');
    setUserEmail('');
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <h2 className="text-2xl font-bold">カレンダー連携</h2>
      
      {isLoggedIn ? (
        <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg shadow">
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
            {userName.charAt(0)}
          </div>
          <div className="text-center">
            <p className="font-bold text-xl text-green-600">ログインしました</p>
            <p className="text-gray-700">{userName}</p>
            <p className="text-gray-500 text-sm">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <p className="text-gray-600">開発中のため、一時的に簡易ログインを使用します</p>
          <button
            onClick={handleLogin}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            テストユーザーでログイン
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleLocalLogin;