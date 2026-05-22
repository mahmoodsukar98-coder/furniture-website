import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Admin from './pages/Admin';

export default function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
      {isOffline && (
        <div className="fixed bottom-0 left-0 right-0 bg-red-600/90 text-white text-center py-2 text-xs font-bold z-[9999] backdrop-blur-sm animate-fade-up flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a18.16 18.16 0 0 1-3.67 4.81m-6.05-6.05A2 2 0 0 0 12 11m-1.92 1.91A2 2 0 0 0 12 13"/><path d="M22 22 2 2"/><path d="M9.1 9.1A10.45 10.45 0 0 0 2 12s3 7 10 7a9.76 9.76 0 0 0 4.14-1.12"/></svg>
          أنت الآن تتصفح في وضع عدم الاتصال (Offline)
        </div>
      )}
    </>
  );
}
