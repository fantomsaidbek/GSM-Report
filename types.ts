export interface FuelEntry {
  id: string;
  date: string;
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  // Base64 strings stored in LocalStorage
  odometerBase64?: string;
  receiptBase64?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ADD_ENTRY = 'ADD_ENTRY',
}