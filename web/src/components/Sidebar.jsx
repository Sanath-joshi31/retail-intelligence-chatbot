import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Bot,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/chatbot', label: 'AI Chatbot', icon: MessageSquare },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/sales', label: 'Sales Analytics', icon: BarChart3 },
];

export default function Sidebar({ open, onToggle }) {
  return (
    <aside style={{
      position: 'fixed',
      left: 0,
      top: 0,
      height: '100vh',
      width: open ? '280px' : '80px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      transition: 'width 0.3s ease',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <Bot size={32} color="var(--primary)" />
        {open && (
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Retail AI</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Intelligence Hub</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 8px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '4px',
              textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              transition: 'all 0.2s ease',
            })}
          >
            <item.icon size={20} />
            {open && <span style={{ fontWeight: 500 }}>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle Button */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '8px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {open ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </aside>
  );
}
