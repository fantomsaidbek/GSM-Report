// Add declaration for google global variable
declare const google: any;

// CONFIGURATION
// You must create a project in Google Cloud Console, enable Drive API,
// and create an OAuth 2.0 Client ID for Web Application.
// Add your domain (or localhost) to "Authorized JavaScript origins".
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let accessToken: string | null = null;

export const initGoogleAuth = (callback: (token: string) => void) => {
  if (typeof google === 'undefined') return;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse: any) => {
      accessToken = tokenResponse.access_token;
      callback(accessToken!);
    },
  });
};

export const requestAccessToken = () => {
  if (tokenClient) {
    tokenClient.requestAccessToken();
  } else {
    console.error("Google Token Client not initialized");
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
    // parents: ['folder_id'] // Optional: Specify folder ID
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