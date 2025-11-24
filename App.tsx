import React, { useState, useEffect, useCallback } from 'react';
import { FuelEntry, AppView } from './types';
import { CameraInput } from './components/CameraInput';
import { StatCard } from './components/StatCard';
import { getEntries, saveEntries, uploadImage } from './services/storage';

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

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [history, setHistory] = useState<FuelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [total, setTotal] = useState<string>('');
  const [odometerImg, setOdometerImg] = useState<string | null>(null);
  const [receiptImg, setReceiptImg] = useState<string | null>(null);

  // Initialize - Load from Vercel Blob
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getEntries();
        setHistory(data);
      } catch (e) {
        console.error("Failed to load history:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-calculate total
  useEffect(() => {
    const l = parseFloat(liters);
    const p = parseFloat(price);
    if (!isNaN(l) && !isNaN(p)) {
      setTotal((l * p).toFixed(2));
    }
  }, [liters, price]);

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту запись?")) {
      setIsLoading(true);
      try {
        const updated = history.filter(h => h.id !== id);
        await saveEntries(updated);
        setHistory(updated);
      } catch (error) {
        alert("Ошибка при удалении");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!odometer || !liters || !price) {
      alert("Пожалуйста, заполните все поля");
      return;
    }

    setIsSaving(true);
    
    try {
      const timestamp = new Date().getTime();
      let odoUrl: string | undefined = undefined;
      let receiptUrl: string | undefined = undefined;

      // Upload Images if they exist
      if (odometerImg) {
        odoUrl = await uploadImage(odometerImg, `odo_${timestamp}.jpg`);
      }
      if (receiptImg) {
        receiptUrl = await uploadImage(receiptImg, `receipt_${timestamp}.jpg`);
      }

      const newEntry: FuelEntry = {
        id: timestamp.toString(),
        date,
        odometer: parseFloat(odometer),
        liters: parseFloat(liters),
        pricePerLiter: parseFloat(price),
        totalCost: parseFloat(total),
        odometerUrl: odoUrl,
        receiptUrl: receiptUrl
      };

      const updated = [newEntry, ...history];
      
      // Save updated database
      await saveEntries(updated);
      setHistory(updated);
      
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
      setIsSaving(false);
    }
  };

  const calculateStats = useCallback(() => {
    if (history.length < 2) return { avgConsumption: 0, totalCost: history.reduce((acc, curr) => acc + curr.totalCost, 0) };
    const sorted = [...history].sort((a, b) => a.odometer - b.odometer);
    const dist = sorted[sorted.length - 1].odometer - sorted[0].odometer;
    const totalLiters = sorted.reduce((acc, curr) => acc + curr.liters, 0);
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
          <p className="text-tg-hint text-sm">Vercel Blob Storage</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Расход (л/100)" value={stats.avgConsumption.toString()} icon={<FuelIcon />} />
        <StatCard title="Всего (₽)" value={stats.totalCost.toString()} icon={<ChartIcon />} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-white">История</h2>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-10 text-tg-hint border-2 border-dashed border-tg-secondaryBg rounded-xl">
                Нет записей.
              </div>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="bg-tg-secondaryBg p-4 rounded-xl relative group">
                  <button 
                    onClick={() => handleDelete(entry.id)} 
                    className="absolute top-2 right-2 text-tg-hint opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 p-1"
                  >
                    <TrashIcon />
                  </button>
                  <div className="flex justify-between items-center mb-2 pr-6">
                    <div>
                      <p className="font-bold text-white">{entry.date}</p>
                      <p className="text-sm text-tg-hint">{entry.odometer} км</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-tg-link">{entry.totalCost} ₽</p>
                      <p className="text-sm text-tg-hint">{entry.liters} л</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3">
                    {entry.odometerUrl && (
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-tg-hint mb-1">Пробег</span>
                        <a href={entry.odometerUrl} target="_blank" rel="noopener noreferrer">
                          <img src={entry.odometerUrl} alt="Odo" className="w-16 h-16 object-cover rounded border border-white/10" />
                        </a>
                      </div>
                    )}
                    {entry.receiptUrl && (
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-tg-hint mb-1">Чек</span>
                         <a href={entry.receiptUrl} target="_blank" rel="noopener noreferrer">
                          <img src={entry.receiptUrl} alt="Check" className="w-16 h-16 object-cover rounded border border-white/10" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setView(AppView.ADD_ENTRY)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-tg-button rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white active:scale-95 transition-transform z-10"
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
          <h3 className="text-sm font-bold text-tg-hint uppercase">Фотографии</h3>
          <div className="grid grid-cols-2 gap-4">
            <CameraInput label="Пробег" onImageSelected={setOdometerImg} isLoading={isSaving} />
            <CameraInput label="Чек" onImageSelected={setReceiptImg} isLoading={isSaving} />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-tg-button text-white font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Загрузка...</span>
            </>
          ) : 'Сохранить'}
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