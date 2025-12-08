import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <div className="layout">
      <nav className="navbar">
        {/* 1. Logo/Tên thương hiệu */}
        <div className="nav-brand">
          <h1>Quản Lý Cửa Hàng</h1>
        </div>
        
        {/* 2. Menu chính (Canh trái) */}
        <ul className="nav-menu">
          <li><Link to="/" className={isActive('/') || isActive('/products') ? 'active' : ''}>Sản Phẩm</Link></li>
          <li><Link to="/customers" className={isActive('/customers') ? 'active' : ''}>Khách Hàng</Link></li>
          <li><Link to="/orders" className={isActive('/orders') ? 'active' : ''}>Đơn Hàng</Link></li>
          <li><Link to="/stock" className={isActive('/stock') ? 'active' : ''}>Nhập Kho</Link></li>
          <li><Link to="/reports" className={isActive('/reports') ? 'active' : ''}>Thống Kê</Link></li>
        </ul>

        {/* 3. Phần User & Đăng xuất (Sẽ được đẩy sang phải bằng CSS) */}
        {user && (
          <div className="nav-user">
            <span className="user-greeting">
              Xin chào, <strong>{user.full_name || user.username}</strong>
            </span>
            <button onClick={onLogout} className="btn-logout">
              Đăng Xuất
            </button>
          </div>
        )}
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;