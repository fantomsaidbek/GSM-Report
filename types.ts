export interface FuelEntry {
  id: string;
  date: string;
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  // URLs to Google Drive files
  odometerImageLink?: string;
  receiptImageLink?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ADD_ENTRY = 'ADD_ENTRY',
}
