// Add declaration for google global variable
declare const google: any;

// CONFIGURATION
// You must create a project in Google Cloud Console, enable Drive API,
// and create an OAuth 2.0 Client ID for Web Application.
// Add your domain (or localhost) to "Authorized JavaScript origins".

// Safely access process.env or fallback
const getEnv = (key: string, defaultVal: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return defaultVal;
};

const CLIENT_ID = getEnv('GOOGLE_CLIENT_ID', 'YOUR_CLIENT_ID_HERE');
// API Key is actually not strictly needed for the Implicit Flow (Token Client) if just uploading, 
// but often used for Discovery. Identity Services mainly needs Client ID.
const API_KEY = getEnv('GOOGLE_API_KEY', 'YOUR_API_KEY_HERE'); 

const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let accessToken: string | null = null;

export const initGoogleAuth = (callback: (token: string) => void) => {
  // Wait for Google Script to load
  const checkInterval = setInterval(() => {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      clearInterval(checkInterval);
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              accessToken = tokenResponse.access_token;
              callback(accessToken!);
            }
          },
        });
        console.log("Google Auth Initialized");
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
    console.error("Google Token Client not initialized. Waiting for script...");
    // Attempt to init if script just loaded
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2 && !tokenClient) {
       // Re-trigger init if needed, though initGoogleAuth should handle it.
       // Just alert user to wait a moment.
       alert("Инициализация Google сервисов... Попробуйте через секунду.");
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