import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { TokenResponse } from '@react-oauth/google';

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

interface GoogleLoginProps {
  onLoginSuccess: (user: GoogleUser, token: string) => void;
  onLogout: () => void;
}

const GoogleLogin = ({ onLoginSuccess, onLogout }: GoogleLoginProps) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCalendarAccess, setHasCalendarAccess] = useState(false);

  // Googleクライアント
  const CLIENT_ID = '647090775844-hlv5firan96f9augrh35mtheoboa786l.apps.googleusercontent.com';

  // Googleボタンのレンダリング関数
  const renderGoogleButton = () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      console.error('Google認証APIが利用できません');
      return;
    }

    const buttonElement = document.getElementById('googleLoginButton');
    if (buttonElement) {
      console.log('Googleボタンをレンダリングします...');
      window.google.accounts.id.renderButton(
        buttonElement,
        { 
          theme: 'outline', 
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 250
        }
      );
    } else {
      console.error('googleLoginButton要素が見つかりません');
    }
  };

  // OAuth 2.0を使用してカレンダー権限を要求する関数
  const requestCalendarAccess = () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      console.error('Google OAuth2 APIが利用できません');
      setError('Google OAuth2 APIが利用できません');
      return;
    }

    setIsLoading(true);

    try {
      // OAuth 2.0クライアントを初期化
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: (tokenResponse: TokenResponse) => {
          if (tokenResponse.error) {
            console.error('カレンダー権限の取得に失敗しました:', tokenResponse.error);
            setError('カレンダー権限の取得に失敗しました: ' + tokenResponse.error);
            setIsLoading(false);
            return;
          }
          
          // アクセストークンを取得成功
          console.log('カレンダー用アクセストークンを取得しました');
          localStorage.setItem('google_calendar_token', tokenResponse.access_token);
          setHasCalendarAccess(true);
          
          // 親コンポーネントにトークンを通知
          if (user) {
            onLoginSuccess(user, tokenResponse.access_token);
          }
          
          setIsLoading(false);
        },
      });

      // アクセストークンをリクエスト
      client.requestAccessToken();
    } catch (err) {
      console.error('カレンダー権限のリクエスト中にエラーが発生しました:', err);
      setError('カレンダー権限のリクエスト中にエラーが発生しました');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Google OAuth 2.0 クライアントをロードする
    const loadGoogleScript = () => {
      setIsLoading(true);
      
      // すでにスクリプトが読み込まれている場合は処理をスキップ
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        console.log('Google認証スクリプトはすでに読み込まれています');
        initializeGoogleLogin();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google認証スクリプトが読み込まれました');
        initializeGoogleLogin();
      };
      script.onerror = () => {
        console.error('Google認証スクリプトの読み込みに失敗しました');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeGoogleLogin = () => {
      // スクリプトがロードされるまで少し待つ
      setTimeout(() => {
        if (window.google && window.google.accounts) {
          try {
            window.google.accounts.id.initialize({
              client_id: CLIENT_ID,
              callback: handleCredentialResponse,
              scope: 'email profile',
            });
            
            // ユーザーが未ログインの場合のみボタンをレンダリング
            if (!user) {
              renderGoogleButton();
            }
            
            // ローカルストレージからカレンダートークンをチェック
            const calendarToken = localStorage.getItem('google_calendar_token');
            if (calendarToken) {
              setHasCalendarAccess(true);
            }
            
            setIsLoading(false);
          } catch (error) {
            console.error('Google認証の初期化中にエラーが発生しました:', error);
            setIsLoading(false);
          }
        } else {
          console.error('window.google.accounts オブジェクトが利用できません');
          setIsLoading(false);
        }
      }, 300);
    };

    // ローカルストレージからトークンを確認
    const checkExistingToken = () => {
      const token = localStorage.getItem('google_token');
      const calendarToken = localStorage.getItem('google_calendar_token');
      
      if (token) {
        try {
          const decodedToken: any = jwtDecode(token);
          
          const userData: GoogleUser = {
            email: decodedToken.email || '',
            name: decodedToken.name || '',
            picture: decodedToken.picture || ''
          };
          
          setUser(userData);
          
          // カレンダートークンがある場合
          if (calendarToken) {
            setHasCalendarAccess(true);
            // 親コンポーネントにカレンダートークンを通知
            onLoginSuccess(userData, calendarToken);
          } else {
            // カレンダートークンがない場合は通常のトークンを通知
            onLoginSuccess(userData, token);
          }
        } catch (error) {
          console.error('トークンのデコードに失敗しました:', error);
          localStorage.removeItem('google_token');
        }
      }
    };

    checkExistingToken();
    loadGoogleScript();
  }, []); // 初回マウント時のみ実行

  // ログアウト後にボタンを再レンダリングするための効果
  useEffect(() => {
    if (!user && window.google && window.google.accounts) {
      // ユーザーがログアウトした後で、GoogleAPIが利用可能な場合
      console.log('ユーザーがログアウトしました。ボタンを再レンダリングします');
      
      // 少し遅延を入れて、DOM更新後に実行
      setTimeout(() => {
        renderGoogleButton();
      }, 100);
    }
  }, [user]); // user状態が変化したときに実行

  const handleCredentialResponse = (response: any) => {
    console.log('Google認証レスポンス受信:', response);
    
    if (!response || !response.credential) {
      console.error('認証レスポンスが無効です');
      return;
    }
    
    const idToken = response.credential;
    try {
      // JWTをデコードしてユーザー情報を取得
      const decodedToken: any = jwtDecode(idToken);
      
      const userData: GoogleUser = {
        email: decodedToken.email || '',
        name: decodedToken.name || '',
        picture: decodedToken.picture || ''
      };
      
      setUser(userData);
      
      // アクセストークンをローカルストレージに保存
      localStorage.setItem('google_token', idToken);
      
      // 親コンポーネントにログイン成功を通知
      onLoginSuccess(userData, idToken);
      
      console.log('認証成功:', userData);
      
      // カレンダートークンがあるか確認
      const calendarToken = localStorage.getItem('google_calendar_token');
      if (calendarToken) {
        setHasCalendarAccess(true);
        onLoginSuccess(userData, calendarToken);
      }
    } catch (error) {
      console.error('トークンのデコードに失敗:', error);
    }
  };

  const handleLogout = () => {
    // ユーザー情報をクリア
    setUser(null);
    setHasCalendarAccess(false);
    
    // ローカルストレージからトークンを削除
    localStorage.removeItem('google_token');
    localStorage.removeItem('google_calendar_token');
    
    // Google認証をリセット
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    
    // 親コンポーネントにログアウトを通知
    onLogout();
    
    console.log('ログアウトしました');
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <h2 className="text-2xl font-bold">Google アカウント連携</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 w-full">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="text-sm text-red-700 underline mt-2"
          >
            閉じる
          </button>
        </div>
      )}
      
      {/* ユーザーがログインしていない場合のみ表示 */}
      {user === null && <div id="googleLoginButton" style={{ minHeight: '50px', minWidth: '250px' }}></div>}

      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>読み込み中...</p>
        </div>
      ) : user ? (
        <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg shadow mb-6 bg-white">
          <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full" />
          <div className="text-center">
            <p className="font-bold text-xl text-green-600">ログインしました</p>
            <p className="text-gray-700">{user.name}</p>
            <p className="text-gray-500 text-sm">{user.email}</p>
            
            {/* カレンダーアクセス状態表示 */}
            {hasCalendarAccess ? (
              <p className="text-green-600 mt-2">✓ カレンダーへのアクセス権限あり</p>
            ) : (
              <p className="text-orange-500 mt-2">カレンダーへのアクセス権限が必要です</p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
            {/* カレンダー権限取得ボタン - 権限がない場合のみ表示 */}
            {!hasCalendarAccess && (
              <button
                onClick={requestCalendarAccess}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                カレンダーへのアクセスを許可
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* バックアップボタン - Google認証が読み込めないとき用 */}
          <button
            onClick={() => alert('Google認証サービスが利用できないため、先に進めません。')}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
          >
            Google認証読み込み中...
          </button>
        </>
      )}
    </div>
  );
};

// TypeScriptのwindowオブジェクト拡張
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export default GoogleLogin;