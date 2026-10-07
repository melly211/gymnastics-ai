import { Route, Routes } from 'react-router-dom'

import Navbar from './components/Navbar'
import Analyze from './pages/Analyze'
import Home from './pages/Home'
import Results from './pages/Results'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
