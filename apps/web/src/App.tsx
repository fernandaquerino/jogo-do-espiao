import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RoomClientProvider } from './online/RoomClientContext'
import { Home } from './pages/Home'
import { LocalGame } from './pages/LocalGame'
import { OnlineEntry } from './pages/OnlineEntry'
import { RoomPage } from './pages/RoomPage'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <BrowserRouter>
        <RoomClientProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/local" element={<LocalGame />} />
            <Route path="/online" element={<OnlineEntry />} />
            <Route path="/room/:code" element={<RoomPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RoomClientProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
