import './index.css'
import { Routes, Route } from 'react-router-dom'
import ZcashProfile from './ZcashProfile'
import Directory from './Directory'
import { FeedbackProvider } from './store'

function App() {
  return (
    <FeedbackProvider>
      <Routes>
        {/* 👇 Root route now shows Directory */}
        <Route path="/" element={<Directory />} />
        <Route path="/:slug" element={<ZcashProfile />} />
      </Routes>
    </FeedbackProvider>
  )
}

export default App
