import React, { useState, useEffect, useCallback } from 'react';
import { FuelEntry, AppView } from './types';
import { CameraInput } from './components/CameraInput';
import { StatCard } from './components/StatCard';
import { initGoogleAuth, requestAccessToken, uploadFileToDrive } from './services/googleDrive';

// Icons
const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
  </svg>
);

const FuelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003.361 2.48z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.85 13.65a2.25 2.25 0 015.1 2.25h.008v.008h-.008a2.25 2.25 0 01-2.25 2.25h-5.96a2.25 2.25 0 01-2.25-2.25v-.008a2.25 2.25 0 01.024-3.262" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const CloudIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [history, setHistory] = useState<FuelEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [total, setTotal] = useState<string>('');
  const [odometerImg, setOdometerImg] = useState<string | null>(null);
  const [receiptImg, setReceiptImg] = useState<string | null>(null);

  // Initialize Google Auth
  useEffect(() => {
    initGoogleAuth((token) => {
      if (token) setIsAuthenticated(true);
    });
    
    // Load history
    const saved = localStorage.getItem('gsm_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  // Auto-calculate total
  useEffect(() => {
    const l = parseFloat(liters);
    const p = parseFloat(price);
    if (!isNaN(l) && !isNaN(p)) {
      setTotal((l * p).toFixed(2));
    }
  }, [liters, price]);

  const handleSave = async () => {
    if (!isAuthenticated) {
      requestAccessToken();
      return;
    }

    if (!odometer || !liters || !price) {
      alert("Пожалуйста, заполните все поля");
      return;
    }

    setIsUploading(true);
    try {
      let odoLink = undefined;
      let receiptLink = undefined;

      const timestamp = new Date().getTime();

      if (odometerImg) {
        odoLink = await uploadFileToDrive(odometerImg, `odometer_${odometer}_${timestamp}.jpg`);
      }
      if (receiptImg) {
        receiptLink = await uploadFileToDrive(receiptImg, `receipt_${timestamp}.jpg`);
      }

      const newEntry: FuelEntry = {
        id: timestamp.toString(),
        date,
        odometer: parseFloat(odometer),
        liters: parseFloat(liters),
        pricePerLiter: parseFloat(price),
        totalCost: parseFloat(total),
        odometerImageLink: odoLink,
        receiptImageLink: receiptLink
      };

      const updated = [newEntry, ...history];
      setHistory(updated);
      localStorage.setItem('gsm_history', JSON.stringify(updated));
      
      // Reset form
      setOdometer('');
      setLiters('');
      setPrice('');
      setTotal('');
      setOdometerImg(null);
      setReceiptImg(null);
      setView(AppView.DASHBOARD);

    } catch (error: any) {
      alert(`Ошибка: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const calculateStats = useCallback(() => {
    if (history.length < 2) return { avgConsumption: 0, totalCost: history.reduce((acc, curr) => acc + curr.totalCost, 0) };
    const sorted = [...history].sort((a, b) => a.odometer - b.odometer);
    const dist = sorted[sorted.length - 1].odometer - sorted[0].odometer;
    const totalLiters = sorted.reduce((acc, curr) => acc + curr.liters, 0); // Simplified logic
    const totalCost = sorted.reduce((acc, curr) => acc + curr.totalCost, 0);
    const avg = dist > 0 ? (totalLiters / dist) * 100 : 0;
    return { avgConsumption: avg.toFixed(1), totalCost: totalCost.toFixed(0) };
  }, [history]);

  const stats = calculateStats();

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in pb-24">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">GSM Расход</h1>
          <p className="text-tg-hint text-sm">Статистика</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Расход (л/100)" value={stats.avgConsumption.toString()} icon={<FuelIcon />} />
        <StatCard title="Всего (₽)" value={stats.totalCost.toString()} icon={<ChartIcon />} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-white">История</h2>
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-10 text-tg-hint border-2 border-dashed border-tg-secondaryBg rounded-xl">
              Нет записей.
            </div>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="bg-tg-secondaryBg p-4 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-bold text-white">{entry.date}</p>
                    <p className="text-sm text-tg-hint">{entry.odometer} км</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-tg-link">{entry.totalCost} ₽</p>
                    <p className="text-sm text-tg-hint">{entry.liters} л</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {entry.odometerImageLink && (
                    <a href={entry.odometerImageLink} target="_blank" rel="noreferrer" className="text-xs text-tg-link underline">Фото пробега</a>
                  )}
                  {entry.receiptImageLink && (
                    <a href={entry.receiptImageLink} target="_blank" rel="noreferrer" className="text-xs text-tg-link underline">Фото чека</a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => setView(AppView.ADD_ENTRY)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-tg-button rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white active:scale-95 transition-transform"
      >
        <PlusIcon />
      </button>
    </div>
  );

  const renderAddEntry = () => (
    <div className="h-full flex flex-col animate-fade-in pb-8">
      <h2 className="text-xl font-bold mb-6">Новая запись</h2>
      
      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Manual Inputs */}
        <div className="bg-tg-secondaryBg p-4 rounded-xl space-y-4">
          <div>
            <label className="text-xs text-tg-hint block mb-1">Дата</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} 
              className="w-full bg-tg-bg border border-white/10 rounded p-3 text-white outline-none focus:border-tg-link" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-tg-hint block mb-1">Пробег (км)</label>
              <input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="0"
                className="w-full bg-tg-bg border border-white/10 rounded p-3 text-white outline-none focus:border-tg-link" />
            </div>
            <div>
              <label className="text-xs text-tg-hint block mb-1">Литры</label>
              <input type="number" value={liters} onChange={e => setLiters(e.target.value)} placeholder="0"
                className="w-full bg-tg-bg border border-white/10 rounded p-3 text-white outline-none focus:border-tg-link" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="text-xs text-tg-hint block mb-1">Цена/Л (₽)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
                className="w-full bg-tg-bg border border-white/10 rounded p-3 text-white outline-none focus:border-tg-link" />
            </div>
             <div>
              <label className="text-xs text-tg-hint block mb-1">Итого (₽)</label>
              <input type="number" value={total} readOnly
                className="w-full bg-tg-bg/50 border border-white/10 rounded p-3 text-tg-hint outline-none" />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-tg-hint uppercase">Фотографии (для Google Drive)</h3>
          <div className="grid grid-cols-2 gap-4">
            <CameraInput label="Пробег" onImageSelected={setOdometerImg} isLoading={isUploading} />
            <CameraInput label="Чек" onImageSelected={setReceiptImg} isLoading={isUploading} />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {!isAuthenticated && (
          <div className="text-xs text-yellow-500 text-center mb-2">
            Необходим вход в Google для загрузки фото
          </div>
        )}
        
        <button 
          onClick={handleSave}
          disabled={isUploading}
          className="w-full py-4 bg-tg-button text-white font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {isUploading ? 'Загрузка...' : isAuthenticated ? 'Сохранить и Загрузить' : 'Войти в Google и Сохранить'}
          {isAuthenticated && <CloudIcon />}
        </button>
        
        <button 
          onClick={() => setView(AppView.DASHBOARD)}
          className="w-full py-3 text-tg-hint hover:text-white transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 font-sans max-w-md mx-auto relative overflow-hidden">
      {view === AppView.DASHBOARD ? renderDashboard() : renderAddEntry()}
    </div>
  );
};

export default App;
