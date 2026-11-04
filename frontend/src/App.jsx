import { Route, Routes } from 'react-router-dom'

import Navbar from './components/Navbar'
import Analyze from './pages/Analyze'
import Goals from './pages/Goals'
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
          <Route path="/goals" element={<Goals />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
