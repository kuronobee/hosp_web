import { useState, useEffect } from 'react';

const islocal = false;

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

interface GoogleLoginProps {
  onLoginSuccess: (user: GoogleUser, token: string) => void;
  onLogout: () => void;
}

// バックエンドAPIのベースURL
const API_BASE_URL = islocal
  ? 'http://localhost:3000'
  : 'https://hosp-api-ken-go-cf8ea894c5d3.herokuapp.com';

const GoogleLogin = ({ onLoginSuccess, onLogout }: GoogleLoginProps) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Googleクライアント
  const CLIENT_ID =
    '647090775844-eiqmcdrfokfc8jnpfdhbvbr8g7sa4ncs.apps.googleusercontent.com';
  const REDIRECT_URI = islocal
    ? 'http://localhost:5173/hospitalization/web'
    : 'https://krkkng.com/hospitalization/web';

  // ログインボタン用の Google Code Client
  let codeClient: any;

  // ボタンをレンダリング
  const renderGoogleButton = () => {
    if (!window.google?.accounts?.oauth2) {
      setError('Google認証APIを読み込めませんでした');
      setIsLoading(false);
      return;
    }

    const buttonElement = document.getElementById('googleLoginButton');
    if (!buttonElement) return;

    codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: CLIENT_ID,
      scope: 'email profile https://www.googleapis.com/auth/calendar.readonly',
      ux_mode: 'popup',
      redirect_uri: REDIRECT_URI,
      callback: async (response: { code?: string; error?: string }) => {
        if (response.error || !response.code) {
          setError(response.error || '認証コードの取得に失敗しました');
          setIsLoading(false);
          return;
        }
        try {
          const tokenRes = await fetch(
            `${API_BASE_URL}/api/auth/google/callback`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: response.code }), credentials: 'include' }
          );
          if (!tokenRes.ok) throw new Error('サーバーエラー');
          const { user: userData, access_token, refresh_token } = await tokenRes.json();
          setUser(userData);
          localStorage.setItem('google_calendar_token', access_token);
          if (refresh_token) localStorage.setItem('google_refresh_token', refresh_token);
          onLoginSuccess(userData, access_token);
        } catch (err: any) {
          setError(err.message || '認証処理中にエラーが発生しました');
        } finally {
          setIsLoading(false);
        }
      }
    });

    // 既存の子要素をクリアしてから描画
    buttonElement.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center text-sm';
    btn.innerHTML = '<svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>ログイン';
    btn.onclick = () => {
      setIsLoading(true);
      setError(null);
      codeClient.requestCode();
    };
    buttonElement.appendChild(btn);
  };

  // トークンリフレッシュ
  const refreshToken = async (refreshToken: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/google/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }), credentials: 'include'
    });
    if (!res.ok) throw new Error('トークンのリフレッシュに失敗しました');
    return (await res.json()).access_token;
  };

  // 初回マウント: トークン確認 + スクリプト読み込み
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('google_calendar_token');
      const rToken = localStorage.getItem('google_refresh_token');
      if (token) {
        try {
          const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
          if (info.ok) {
            const u = await info.json();
            setUser({ email: u.email, name: u.name, picture: u.picture });
            onLoginSuccess({ email: u.email, name: u.name, picture: u.picture }, token);
          } else if (rToken) {
            const newToken = await refreshToken(rToken);
            localStorage.setItem('google_calendar_token', newToken);
            const refreshed = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${newToken}` } });
            if (refreshed.ok) {
              const u2 = await refreshed.json();
              setUser({ email: u2.email, name: u2.name, picture: u2.picture });
              onLoginSuccess({ email: u2.email, name: u2.name, picture: u2.picture }, newToken);
            }
          }
        } catch { localStorage.removeItem('google_calendar_token'); localStorage.removeItem('google_refresh_token'); }
      }

      setIsLoading(false);
    };

    const loadScript = () => {
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        setTimeout(renderGoogleButton, 500);
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setTimeout(renderGoogleButton, 500);
        script.onerror = () => { setError('Google認証スクリプトの読み込みに失敗しました'); setIsLoading(false); };
        document.body.appendChild(script);
      }
    };

    checkToken();
    loadScript();
  }, []);

  // user変更時にログインボタンを隠す or 再描画
  useEffect(() => {
    const container = document.getElementById('googleLoginButton');
    if (!container) return;

    if (user) {
      // ログイン済みならボタンを隠す
      container.style.display = 'none';
    } else {
      // ログアウト後ならボタンを再表示＆再描画
      container.style.display = ''; // class 由来の flex が復活します
      renderGoogleButton();
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('google_calendar_token');
    localStorage.removeItem('google_refresh_token');
    window.google?.accounts.id.disableAutoSelect();
    onLogout();
    setShowDropdown(false);
    // （オプション）ここでも再描画する場合
    const container = document.getElementById('googleLoginButton');
    if (container) {
      container.style.display = '';
      renderGoogleButton();
    }
  };

  return (
    <div className="relative user-dropdown">
      {error && (
        <div className="absolute top-12 right-0 z-10 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 w-64 rounded shadow-lg">
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-700 underline mt-2">閉じる</button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-10 w-10">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">...
          </svg>
        </div>
      )}

      {!isLoading && user && (
        <div className="relative">
          <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center justify-center rounded-full overflow-hidden border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-transform hover:scale-105">
            <img src={user.picture} alt={user.name} className="h-10 w-10 object-cover rounded-full" title={`${user.name} (${user.email})`} />
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1 animate-fadeIn">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center">
                <img src={user.picture} alt={user.name} className="h-10 w-10 mr-3 rounded-full" />
                <div className="truncate">
                  <p className="font-semibold text-gray-800 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="border-b border-gray-100 py-2 px-4">
                <p className="text-xs text-blue-600">✓ カレンダー連携済み</p>
              </div>
              <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">ログアウト</button>
            </div>
          )}
        </div>
      )}

      {!isLoading && !user && <div id="googleLoginButton" className="flex items-center"></div>}
    </div>
  );
};

declare global {
  interface Window {
    google?: any;
  }
}

export default GoogleLogin;
