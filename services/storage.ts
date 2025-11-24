import { put, list } from '@vercel/blob';
import { FuelEntry } from '../types';

// WARNING: Storing the write token in the client is not secure for production apps.
// Ideally, this should be proxied through a backend (like /api/db). 
// For this preview/prototype, we use it directly.
const TOKEN = "vercel_blob_rw_2057uBJQXVkDAc76_PY1FpJkACKSdtaf2Q9AK3sWN0hXCsN";
const DB_FILENAME = 'database.json';

export const getEntries = async (): Promise<FuelEntry[]> => {
  try {
    // List blobs to find our database file
    const { blobs } = await list({ 
      token: TOKEN, 
      prefix: DB_FILENAME 
    });
    
    // Find the specific file (list returns partial matches)
    const dbBlob = blobs.find(b => b.pathname === DB_FILENAME);
    
    if (dbBlob) {
      // Fetch the JSON content from the public URL
      const response = await fetch(dbBlob.url);
      if (!response.ok) {
        throw new Error('Failed to fetch DB file content');
      }
      return await response.json();
    }
    
    // If no database file exists yet, return empty array
    return [];
  } catch (e) {
    console.warn("Could not load history (might be first run):", e);
    return [];
  }
};

export const saveEntries = async (entries: FuelEntry[]) => {
  try {
    await put(DB_FILENAME, JSON.stringify(entries), {
      access: 'public',
      addRandomSuffix: false, // Overwrite the existing file
      contentType: 'application/json',
      token: TOKEN
    });
  } catch (e) {
    console.error("Failed to save entries:", e);
    throw new Error('Failed to save to cloud storage');
  }
};

export const uploadImage = async (base64: string, filename: string): Promise<string> => {
  try {
    // Convert base64 string to a Blob for upload
    const res = await fetch(base64);
    const blob = await res.blob();
    
    const { url } = await put(filename, blob, {
      access: 'public',
      token: TOKEN
    });
    
    return url;
  } catch (e) {
    console.error("Failed to upload image:", e);
    throw new Error('Image upload failed');
  }
};