import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Keywords from './pages/Keywords'
import ContentStudio from './pages/ContentStudio'
import RankTracker from './pages/RankTracker'
import SiteAudit from './pages/SiteAudit'
import Competitors from './pages/Competitors'
import Reports from './pages/Reports'
import SettingsPage from './pages/Settings'
import Backlinks from './pages/Backlinks'
import Meo from './pages/Meo'
import WordPress from './pages/WordPress'
import ContentCalendar from './pages/ContentCalendar'
import SchemaGenerator from './pages/SchemaGenerator'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="keywords" element={<Keywords />} />
        <Route path="content" element={<ContentStudio />} />
        <Route path="rank" element={<RankTracker />} />
        <Route path="audit" element={<SiteAudit />} />
        <Route path="competitor" element={<Competitors />} />
        <Route path="report" element={<Reports />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="backlinks" element={<Backlinks />} />
        <Route path="meo" element={<Meo />} />
        <Route path="wordpress" element={<WordPress />} />
        <Route path="calendar" element={<ContentCalendar />} />
        <Route path="schema" element={<SchemaGenerator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
