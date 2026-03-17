import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import NewInspection from '@/pages/NewInspection';
import Observations from '@/pages/Observations';
import Library from '@/pages/Library';
import Settings from '@/pages/Settings';
import Form483View from '@/pages/Form483View';
import References from '@/pages/References';
import AuditTrail from '@/pages/AuditTrail';

export default function App() {
  return (
    <Routes>
      <Route path="/document/483/:id" element={<Form483View />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-inspection" element={<NewInspection />} />
        <Route path="/observations" element={<Observations />} />
        <Route path="/library" element={<Library />} />
        <Route path="/references" element={<References />} />
        <Route path="/audit-trail" element={<AuditTrail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
