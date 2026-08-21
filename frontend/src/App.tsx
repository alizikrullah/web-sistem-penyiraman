import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schedules from './pages/Schedules';
import Logs from './pages/Logs';
import Plants from './pages/Plants';
import Notifications from './pages/Notifications';
import Navbar from './components/Navbar';
import ChatBubble from './components/ChatBubble';
import ProtectedRoute from './components/ProtectedRoute';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Navbar />
      {children}
      <ChatBubble />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/schedules" element={<AppLayout><Schedules /></AppLayout>} />
        <Route path="/tanaman" element={<AppLayout><Plants /></AppLayout>} />
        <Route path="/notifications" element={<AppLayout><Notifications /></AppLayout>} />
        <Route path="/logs" element={<AppLayout><Logs /></AppLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}