import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout'; // Giữ lại Layout cũ của bạn
import Products from './pages/Products';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Stock from './pages/Stock';
import Reports from './pages/Reports';
import Login from './pages/Login'; // Nhớ tạo file Login.js như hướng dẫn trước

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Thêm state loading để tránh flash màn hình Login

  // Kiểm tra đăng nhập khi vào app
  useEffect(() => {
    const checkLogin = () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    };
    checkLogin();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return null; // Hoặc hiện <div className="spinner"></div>

  // Nếu CHƯA đăng nhập -> Hiện màn hình Login
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Nếu ĐÃ đăng nhập -> Hiện giao diện chính có Layout
  return (
    <Router>
      {/* Truyền hàm logout và user vào Layout để bạn có thể tạo nút Đăng xuất trong đó */}
      <Layout onLogout={handleLogout} user={user}>
        <Routes>
          <Route path="/" element={<Navigate to="/products" />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;