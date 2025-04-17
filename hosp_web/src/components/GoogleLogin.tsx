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
const API_BASE_URL = islocal ? 'http://localhost:3000' : 'https://hosp-api-ken-go-cf8ea894c5d3.herokuapp.com';

const GoogleLogin = ({ onLoginSuccess, onLogout }: GoogleLoginProps) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Googleクライアント
  const CLIENT_ID = '647090775844-eiqmcdrfokfc8jnpfdhbvbr8g7sa4ncs.apps.googleusercontent.com';
  // 正確なリダイレクトURI（vite.config.tsのbaseパスを含む）
  // GoogleLogin.tsx
  const REDIRECT_URI = islocal ? 'http://localhost:5173/hospitalization/web' : 'https://krkkng.com/hospitalization/web';//'http://localhost:5173/hospitalization/web';
   
  console.log('REDIRECT_URI:', REDIRECT_URI);
  // Googleボタンのレンダリング関数
  const renderGoogleButton = () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      console.error('Google認証APIが利用できません');
      setError('Google認証APIを読み込めませんでした。ブラウザの設定やネットワーク接続を確認してください。');
      setIsLoading(false);
      return;
    }

    const buttonElement = document.getElementById('googleLoginButton');
    if (!buttonElement) {
      console.error('googleLoginButton要素が見つかりません');
      return;
    }

    // OAuth 2.0トークンクライアントを初期化（カレンダー権限を含む）
    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: CLIENT_ID,
      scope: 'email profile https://www.googleapis.com/auth/calendar.readonly',
      ux_mode: 'popup',
      redirect_uri: REDIRECT_URI, // 正確なリダイレクトURI
      callback: async (response: { code?: string; error?: string }) => {
        if (response.error) {
          console.error('OAuth認証エラー:', response.error);
          setError('ログイン中にエラーが発生しました: ' + response.error);
          setIsLoading(false);
          return;
        }

        if (!response.code) {
          console.error('認証コードが取得できませんでした');
          setError('認証コードの取得に失敗しました');
          setIsLoading(false);
          return;
        }

        try {
          // 認証コードをバックエンドに送信してトークンを取得
          console.log('認証コードをバックエンドに送信:', response.code);
          const tokenResponse = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: response.code }),
            credentials: 'include'
          });
          console.log("tokenResponse:", tokenResponse);
          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('トークン取得エラー:', errorData);
            throw new Error(errorData.error || `サーバーエラー: ${tokenResponse.status}`);
          }

          const authData = await tokenResponse.json();

          // ユーザー情報とトークンを保存
          const userData = authData.user;
          const accessToken = authData.access_token;

          setUser(userData);
          localStorage.setItem('google_calendar_token', accessToken);

          // リフレッシュトークンがあれば保存
          if (authData.refresh_token) {
            localStorage.setItem('google_refresh_token', authData.refresh_token);
          }

          // 親コンポーネントに通知
          onLoginSuccess(userData, accessToken);

          console.log('認証成功:', userData);
          setIsLoading(false);
        } catch (err) {
          console.error('認証処理中にエラーが発生しました:', err);
          setError(err instanceof Error ? err.message : '認証処理中にエラーが発生しました');
          setIsLoading(false);
        }
      },
    });

    // ログインボタンをカスタム作成
    buttonElement.innerHTML = '';
    const loginButton = document.createElement('button');
    loginButton.className = 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition flex items-center';
    loginButton.innerHTML = `
      <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="currentColor"/>
      </svg>
      Googleでログイン（カレンダー連携）
    `;

    loginButton.onclick = () => {
      setIsLoading(true);
      setError(null);
      client.requestCode();
    };

    buttonElement.appendChild(loginButton);
  };

  // トークンをリフレッシュする関数
  const refreshToken = async (refreshToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('トークンのリフレッシュに失敗しました');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('トークンリフレッシュエラー:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Google OAuth 2.0 クライアントをロードする
    const loadGoogleScript = () => {
      setIsLoading(true);

      // すでにスクリプトが読み込まれている場合は処理をスキップ
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        console.log('Google認証スクリプトはすでに読み込まれています');
        setTimeout(() => {
          initializeGoogleLogin();
        }, 1000); // より長めの遅延を設定
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google認証スクリプトが読み込まれました');
        setTimeout(() => {
          initializeGoogleLogin();
        }, 1000); // より長めの遅延を設定
      };
      script.onerror = () => {
        console.error('Google認証スクリプトの読み込みに失敗しました');
        setError('Google認証スクリプトの読み込みに失敗しました。ネットワーク接続を確認してください。');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeGoogleLogin = () => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        try {
          // ユーザーが未ログインの場合のみボタンをレンダリング
          if (!user) {
            renderGoogleButton();
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Google認証の初期化中にエラーが発生しました:', error);
          setError('Google認証の初期化中にエラーが発生しました');
          setIsLoading(false);
        }
      } else {
        console.error('window.google.accounts.oauth2 オブジェクトが利用できません');
        setError('Google認証APIを読み込めませんでした');
        setIsLoading(false);
      }
    };

    // ローカルストレージからトークンを確認
    const checkExistingToken = async () => {
      const calendarToken = localStorage.getItem('google_calendar_token');
      const refreshTokenValue = localStorage.getItem('google_refresh_token');

      if (calendarToken) {
        try {
          // トークンの有効性を確認（ユーザー情報を取得できるか）
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${calendarToken}`,
            },
          });

          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            const userData: GoogleUser = {
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
            };

            setUser(userData);
            onLoginSuccess(userData, calendarToken);
            console.log('既存のトークンで認証成功:', userData);
          } else if (refreshTokenValue) {
            // トークンが無効でリフレッシュトークンがある場合は、トークンをリフレッシュ
            try {
              const newToken = await refreshToken(refreshTokenValue);

              // 新しいトークンでユーザー情報を取得
              const refreshedUserInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${newToken}`,
                },
              });

              if (refreshedUserInfoResponse.ok) {
                const userInfo = await refreshedUserInfoResponse.json();
                const userData: GoogleUser = {
                  email: userInfo.email,
                  name: userInfo.name,
                  picture: userInfo.picture,
                };

                setUser(userData);
                localStorage.setItem('google_calendar_token', newToken);
                onLoginSuccess(userData, newToken);
                console.log('リフレッシュトークンで認証成功:', userData);
              } else {
                // リフレッシュしたがユーザー情報を取得できない場合
                throw new Error('リフレッシュしたトークンが無効です');
              }
            } catch (refreshError) {
              // リフレッシュに失敗した場合は全てのトークンをクリア
              localStorage.removeItem('google_calendar_token');
              localStorage.removeItem('google_refresh_token');
              console.error('トークンのリフレッシュに失敗しました:', refreshError);
            }
          } else {
            // トークンが無効でリフレッシュトークンもない場合はトークンをクリア
            localStorage.removeItem('google_calendar_token');
            console.log('保存されたトークンが無効です。再ログインが必要です。');
          }
        } catch (error) {
          console.error('保存されたトークンの検証中にエラーが発生しました:', error);
          localStorage.removeItem('google_calendar_token');
          localStorage.removeItem('google_refresh_token');
        }
      }
    };

    checkExistingToken();
    loadGoogleScript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回マウント時のみ実行

  // ログアウト後にボタンを再レンダリングするための効果
  useEffect(() => {
    if (!user && window.google && window.google.accounts) {
      // ユーザーがログアウトした後で、GoogleAPIが利用可能な場合
      console.log('ユーザーがログアウトしました。ボタンを再レンダリングします');

      // 少し遅延を入れて、DOM更新後に実行
      setTimeout(() => {
        renderGoogleButton();
      }, 500);
    }
  }, [user]); // user状態が変化したときに実行

  const handleLogout = () => {
    // ユーザー情報をクリア
    setUser(null);

    // ローカルストレージからトークンを削除
    localStorage.removeItem('google_calendar_token');
    localStorage.removeItem('google_refresh_token');

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
            <p className="text-green-600 mt-2">✓ カレンダーへのアクセス権限あり</p>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <>
          {/* バックアップボタン - Google認証が読み込めないとき用 */}
          <button
            onClick={() => alert('Google認証サービスが利用できないため、先に進めません。ブラウザを更新して再試行してください。')}
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
          initCodeClient: (config: any) => {
            requestCode: () => void;
          };
          initTokenClient: (config: any) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export default GoogleLogin;