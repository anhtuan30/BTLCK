import React, { useState, useEffect } from 'react';
import { stockAPI, productAPI } from '../services/api';
import './Stock.css';

const Stock = () => {
  const [imports, setImports] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewDetailsModal, setViewDetailsModal] = useState(null);
  const [formData, setFormData] = useState({
    don_vi_nhap: '',
    items: [{ ma_sp: '', so_luong: 1, don_gia: 0 }],
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    loadImports();
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadImports = async () => {
    try {
      setLoading(true);
      const params = {};
      
      const response = await stockAPI.getImports(params);
      if (response.data.success) {
        setImports(response.data.data);
      }
    } catch (error) {
      showAlert('error', 'Lỗi khi tải danh sách nhập kho');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll('', false);
      if (response.data.success) {
        setProducts(response.data.data.filter(p => p.trang_thai === 1));
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: '', message: '' }), 3000);
  };

  const handleOpenModal = () => {
    setFormData({
      don_vi_nhap: '',
      items: [{ ma_sp: '', so_luong: 1, don_gia: 0 }],
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setViewDetailsModal(null);
    setFormData({
      don_vi_nhap: '',
      items: [{ ma_sp: '', so_luong: 1, don_gia: 0 }],
    });
  };

  const handleViewDetails = (importItem) => {
    setViewDetailsModal(importItem);
    setShowModal(true);
  };

  const addProductItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ma_sp: '', so_luong: 1, don_gia: 0 }],
    });
  };

  const removeProductItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateProductItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    // Nếu chọn sản phẩm, tự động điền giá
    if (field === 'ma_sp' && value) {
      const product = products.find(p => p.ma_sp === value);
      if (product) {
        newItems[index].don_gia = product.gia_ban;
      }
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.don_vi_nhap || formData.don_vi_nhap.trim() === '') {
      showAlert('error', 'Vui lòng nhập đơn vị nhập');
      return;
    }

    if (formData.items.length === 0) {
      showAlert('error', 'Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    // Validate items
    for (const item of formData.items) {
      if (!item.ma_sp) {
        showAlert('error', 'Vui lòng chọn sản phẩm cho tất cả các dòng');
        return;
      }
      if (!item.so_luong || item.so_luong <= 0) {
        showAlert('error', 'Số lượng phải lớn hơn 0');
        return;
      }
      if (!item.don_gia || item.don_gia <= 0) {
        showAlert('error', 'Đơn giá phải lớn hơn 0');
        return;
      }
    }

    try {
      await stockAPI.createImport(formData);
      showAlert('success', 'Nhập kho thành công');
      handleCloseModal();
      loadImports();
      loadProducts(); // Reload để cập nhật tồn kho
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (importItem) => {
    if (window.confirm(`Bạn có chắc muốn xóa phiếu nhập ${importItem.ma_pn}?\n\nLưu ý: Chỉ có thể xóa phiếu nhập trong vòng 24 giờ.`)) {
      try {
        await stockAPI.deleteImport(importItem.ma_pn);
        showAlert('success', 'Xóa phiếu nhập thành công');
        loadImports();
        loadProducts(); // Reload để cập nhật tồn kho
      } catch (error) {
        showAlert('error', error.response?.data?.error || 'Có lỗi xảy ra');
      }
    }
  };

  const getProductName = (ma_sp) => {
    const product = products.find(p => p.ma_sp === ma_sp);
    return product ? product.ten_sp : ma_sp;
  };

  const calculateTotalValue = (items) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (item.so_luong * item.don_gia), 0);
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="stock-page">
      <div className="card">
        <div className="card-header">
          <h2>Quản Lý Nhập Kho</h2>
          <button className="btn btn-primary" onClick={handleOpenModal}>
            + Nhập Kho
          </button>
        </div>

        {alert.message && (
          <div className={`alert alert-${alert.type}`}>
            {alert.message}
          </div>
        )}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã Nhập</th>
                <th>Thời Gian</th>
                <th>Đơn Vị Nhập</th>
                <th>Số Lượng SP</th>
                <th>Tổng Tiền</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {imports.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    Không có phiếu nhập kho nào
                  </td>
                </tr>
              ) : (
                imports.map((importItem) => (
                  <tr key={importItem.ma_pn}>
                    <td>{importItem.ma_pn}</td>
                    <td>{new Date(importItem.ngay_nhap).toLocaleString('vi-VN')}</td>
                    <td>{importItem.don_vi_nhap}</td>
                    <td>{importItem.items?.reduce((total, item) => total + (parseInt(item.so_luong) || 0), 0)}</td>
                    <td>{parseInt(importItem.tong_tien || 0).toLocaleString('vi-VN')} đ</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleViewDetails(importItem)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Chi Tiết
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(importItem)}
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
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{viewDetailsModal ? 'Chi Tiết Phiếu Nhập' : 'Nhập Kho'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            {viewDetailsModal ? (
              <div className="order-details">
                <div className="detail-row">
                  <strong>Mã Phiếu Nhập:</strong> {viewDetailsModal.ma_pn}
                </div>
                <div className="detail-row">
                  <strong>Đơn Vị Nhập:</strong> {viewDetailsModal.don_vi_nhap}
                </div>
                <div className="detail-row">
                  <strong>Thời Gian:</strong> {new Date(viewDetailsModal.ngay_nhap).toLocaleString('vi-VN')}
                </div>
                <div className="detail-section">
                  <strong>Danh Sách Sản Phẩm:</strong>
                  <table style={{ marginTop: '1rem' }}>
                    <thead>
                      <tr>
                        <th>Sản Phẩm</th>
                        <th>Số Lượng</th>
                        <th>Đơn Giá</th>
                        <th>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewDetailsModal.items?.map((item, index) => (
                        <tr key={index}>
                          <td>{item.ten_sp || getProductName(item.ma_sp)}</td>
                          <td>{item.so_luong}</td>
                          <td>{parseInt(item.don_gia).toLocaleString('vi-VN')} đ</td>
                          <td>{parseInt(item.thanh_tien).toLocaleString('vi-VN')} đ</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Tổng Tiền:</td>
                        <td style={{ fontWeight: 'bold' }}>
                          {parseInt(viewDetailsModal.tong_tien || calculateTotalValue(viewDetailsModal.items)).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Đơn Vị Nhập *</label>
                  <input
                    type="text"
                    required
                    value={formData.don_vi_nhap}
                    onChange={(e) => setFormData({ ...formData, don_vi_nhap: e.target.value })}
                    placeholder="Nhập tên đơn vị nhập kho (VD: Công ty ABC, Nhà cung cấp XYZ)"
                  />
                </div>

                <div className="form-group">
                  <label>Sản Phẩm *</label>
                  {formData.items.map((item, index) => (
                    <div key={index} className="product-item-row">
                      <select
                        required
                        value={item.ma_sp}
                        onChange={(e) => updateProductItem(index, 'ma_sp', e.target.value)}
                        style={{ flex: 2, marginRight: '0.5rem' }}
                      >
                        <option value="">Chọn sản phẩm</option>
                        {products.map((product) => (
                          <option key={product.ma_sp} value={product.ma_sp}>
                            {product.ten_sp} - Tồn: {product.so_luong_ton}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.so_luong}
                        onChange={(e) => updateProductItem(index, 'so_luong', parseInt(e.target.value))}
                        placeholder="Số lượng"
                        style={{ flex: 1, marginRight: '0.5rem' }}
                      />
                      <input
                        type="number"
                        required
                        min="0"
                        step="1"
                        value={item.don_gia}
                        onChange={(e) => updateProductItem(index, 'don_gia', parseFloat(e.target.value))}
                        placeholder="Đơn giá"
                        style={{ flex: 1, marginRight: '0.5rem' }}
                      />
                      <span style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>
                        {(item.so_luong * item.don_gia).toLocaleString('vi-VN')} đ
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => removeProductItem(index)}
                          style={{ marginLeft: '0.5rem' }}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addProductItem}
                    style={{ marginTop: '0.5rem' }}
                  >
                    + Thêm Sản Phẩm
                  </button>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  background: '#f8f9fa', 
                  borderRadius: '5px',
                  marginTop: '1rem',
                  textAlign: 'right'
                }}>
                  <strong>Tổng Tiền: </strong>
                  <span style={{ fontSize: '1.2rem', color: '#667eea' }}>
                    {calculateTotalValue(formData.items).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Nhập Kho
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
