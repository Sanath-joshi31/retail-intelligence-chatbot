import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Chatbot from './pages/Chatbot';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Sidebar from './components/Sidebar';
import './styles/index.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main style={{
          flex: 1,
          marginLeft: sidebarOpen ? '280px' : '80px',
          transition: 'margin-left 0.3s ease',
          padding: '20px',
        }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
