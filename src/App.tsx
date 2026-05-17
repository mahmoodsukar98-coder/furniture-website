import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Admin from './pages/Admin';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </HashRouter>
  );
}
