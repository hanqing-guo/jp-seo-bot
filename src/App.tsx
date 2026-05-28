import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import KeywordList from './pages/KeywordList'
import KeywordInput from './pages/KeywordInput'
import KeywordDetail from './pages/KeywordDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<KeywordList />} />
        <Route path="new" element={<KeywordInput />} />
        <Route path="kw/:id" element={<KeywordDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
