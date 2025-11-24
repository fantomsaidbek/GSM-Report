// Add declaration for google global variable
declare const google: any;

const LS_KEY_CLIENT_ID = 'gsm_google_client_id';

// Helper to get the Client ID from LocalStorage or Env
export const getClientId = (): string | null => {
  // 1. Check LocalStorage (User entered value)
  const stored = localStorage.getItem(LS_KEY_CLIENT_ID);
  if (stored) return stored;

  // 2. Check Environment Variable (Vite Build time)
  // @ts-ignore
  if (import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }

  // 3. Check Legacy Environment Variable (if any)
  if (typeof process !== 'undefined' && process.env && process.env.GOOGLE_CLIENT_ID) {
    return process.env.GOOGLE_CLIENT_ID;
  }

  // 4. Return null if not configured
  return null;
};

export const setClientId = (id: string) => {
  localStorage.setItem(LS_KEY_CLIENT_ID, id.trim());
};

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let accessToken: string | null = null;

export const initGoogleAuth = (callback: (token: string) => void) => {
  const clientId = getClientId();
  
  if (!clientId) {
    console.warn("Google Client ID is missing. Auth cannot be initialized.");
    return;
  }

  // Wait for Google Script to load
  const checkInterval = setInterval(() => {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      clearInterval(checkInterval);
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              accessToken = tokenResponse.access_token;
              callback(accessToken!);
            }
          },
        });
        console.log("Google Auth Initialized with ID:", clientId.substring(0, 10) + "...");
      } catch (e) {
        console.error("Failed to initialize Google Auth Client", e);
      }
    }
  }, 100);
  
  // Timeout after 10 seconds to stop checking
  setTimeout(() => clearInterval(checkInterval), 10000);
};

export const requestAccessToken = () => {
  if (tokenClient) {
    tokenClient.requestAccessToken();
  } else {
    const clientId = getClientId();
    if (!clientId) {
      alert("Ошибка: Не настроен Google Client ID. Перейдите в настройки.");
      return;
    }
    console.error("Google Token Client not initialized. Waiting for script...");
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2 && !tokenClient) {
       // Try re-init immediately if script is there but init failed previously
       initGoogleAuth(() => {}); 
       alert("Инициализация... Нажмите кнопку еще раз через секунду.");
    } else {
       alert("Загрузка сервисов Google... Проверьте интернет.");
    }
  }
};

const base64ToBlob = (base64: string, type = 'image/jpeg') => {
  const binStr = atob(base64.split(',')[1]);
  const len = binStr.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = binStr.charCodeAt(i);
  }
  return new Blob([arr], { type });
};

export const uploadFileToDrive = async (base64Image: string, filename: string): Promise<string> => {
  if (!accessToken) {
    throw new Error("No access token. Please sign in.");
  }

  const file = base64ToBlob(base64Image);
  const metadata = {
    name: filename,
    mimeType: 'image/jpeg',
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }

  const data = await response.json();
  return data.webViewLink; // Returns the URL to view the file
};