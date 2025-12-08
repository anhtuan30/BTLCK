import React, { useState, useEffect } from 'react';
import { customerAPI } from '../services/api';
import './Customers.css';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    ho_ten: '',
    nam_sinh: '',
    dia_chi: '',
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerAPI.getAll(search);
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      showAlert('error', 'Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: '', message: '' }), 3000);
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        ho_ten: customer.ho_ten || '',
        nam_sinh: customer.nam_sinh || '',
        dia_chi: customer.dia_chi || '',
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        ho_ten: '',
        nam_sinh: '',
        dia_chi: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({
      ho_ten: '',
      nam_sinh: '',
      dia_chi: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customerAPI.update(editingCustomer.ma_kh, formData);
        showAlert('success', 'Cập nhật khách hàng thành công');
      } else {
        await customerAPI.create(formData);
        showAlert('success', 'Thêm khách hàng thành công');
      }
      handleCloseModal();
      loadCustomers();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (customer) => {
    if (window.confirm(`Bạn có chắc muốn xóa khách hàng ${customer.ho_ten}?`)) {
      try {
        await customerAPI.delete(customer.ma_kh);
        showAlert('success', 'Xóa khách hàng thành công');
        loadCustomers();
      } catch (error) {
        showAlert('error', 'Có lỗi xảy ra');
      }
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="customers-page">
      <div className="card">
        <div className="card-header">
          <h2>Quản Lý Khách Hàng</h2>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Thêm Khách Hàng
          </button>
        </div>

        {alert.message && (
          <div className={`alert alert-${alert.type}`}>
            {alert.message}
          </div>
        )}

        <div className="search-bar">
          <input
            type="text"
            placeholder="Tìm kiếm khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // Thêm sự kiện Enter
            onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
          />
          {/* Thêm nút Tìm */}
          <button 
            className="btn btn-secondary" 
            onClick={loadCustomers}
            style={{ marginLeft: '10px' }}
          >
            Tìm kiếm
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã KH</th>
                <th>Họ Tên</th>
                <th>Năm Sinh</th>
                <th>Địa Chỉ</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    Không có khách hàng nào
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.ma_kh}>
                    <td>{customer.ma_kh}</td>
                    <td>{customer.ho_ten}</td>
                    <td>{customer.nam_sinh}</td>
                    <td>{customer.dia_chi}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-warning"
                          onClick={() => handleOpenModal(customer)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(customer)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCustomer ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Họ Tên *</label>
                <input
                  type="text"
                  required
                  value={formData.ho_ten}
                  onChange={(e) => setFormData({ ...formData, ho_ten: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Năm Sinh *</label>
                <input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.nam_sinh}
                  onChange={(e) => setFormData({ ...formData, nam_sinh: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Địa Chỉ *</label>
                <textarea
                  required
                  value={formData.dia_chi}
                  onChange={(e) => setFormData({ ...formData, dia_chi: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCustomer ? 'Cập Nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

