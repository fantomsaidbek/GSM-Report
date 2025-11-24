export interface FuelEntry {
  id: string;
  date: string;
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  // URLs stored in Vercel Blob
  odometerUrl?: string;
  receiptUrl?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ADD_ENTRY = 'ADD_ENTRY',
}