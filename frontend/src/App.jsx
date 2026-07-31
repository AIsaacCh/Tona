import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Colaborar from './pages/Colaborar'
import Bienvenida from './pages/Bienvenida'
import EsferaFlotante from './components/EsferaFlotante'

function App() {
  return (
    <BrowserRouter>
      <EsferaFlotante />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/colaborar/:codigo" element={<Colaborar />} />
        <Route path="/bienvenida" element={<Bienvenida />} />
      </Routes>
    </BrowserRouter>
  )
}
export default App