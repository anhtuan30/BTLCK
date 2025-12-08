import React, { useState, useEffect } from 'react';
import { productAPI } from '../services/api';
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    ten_sp: '',
    gia_ban: '',
    so_luong_ton: '',
    mo_ta: '',
    anh: '',
  });
  const [alert, setAlert] = useState({ type: '', message: '' });



useEffect(() => {
    loadProducts();
    // Bỏ [search, showHidden] ra khỏi dependency để không tự động chạy khi gõ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHidden]); 

  // Hàm load dữ liệu (Vẫn giữ nguyên logic gọi API)
  const loadProducts = async () => {
    try {
      setLoading(true);
      // Gọi API với từ khóa hiện tại trong ô input
      const response = await productAPI.getAll(search, showHidden);
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      // showAlert...
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: '', message: '' }), 3000);
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        ten_sp: product.ten_sp || '',
        gia_ban: product.gia_ban || '',
        so_luong_ton: product.so_luong_ton || '',
        mo_ta: product.mo_ta || '',
        anh: product.anh || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        ten_sp: '',
        gia_ban: '',
        so_luong_ton: '0',
        mo_ta: '',
        anh: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      ten_sp: '',
      gia_ban: '',
      so_luong_ton: '',
      mo_ta: '',
      anh: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation bổ sung
    if (parseFloat(formData.gia_ban) <= 0) {
      showAlert('error', 'Giá bán phải lớn hơn 0');
      return;
    }
    
    if (parseFloat(formData.so_luong_ton || 0) < 0) {
      showAlert('error', 'Số lượng tồn không được âm');
      return;
    }
    
    try {
      if (editingProduct) {
        await productAPI.update(editingProduct.ma_sp, formData);
        showAlert('success', 'Cập nhật sản phẩm thành công');
      } else {
        await productAPI.create(formData);
        showAlert('success', 'Thêm sản phẩm thành công');
      }
      handleCloseModal();
      loadProducts();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleToggleVisibility = async (product) => {
    try {
      const newStatus = product.trang_thai === 1 ? 0 : 1;
      await productAPI.toggleVisibility(product.ma_sp, { trang_thai: newStatus });
      showAlert('success', `Đã ${newStatus === 0 ? 'ẩn' : 'hiện'} sản phẩm`);
      loadProducts();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (product) => {
    if (window.confirm(`Bạn có chắc muốn xóa sản phẩm ${product.ten_sp}?\n\nLưu ý: Chỉ có thể xóa sản phẩm chưa có trong đơn hàng hoặc phiếu nhập.`)) {
      try {
        await productAPI.delete(product.ma_sp);
        showAlert('success', 'Xóa sản phẩm thành công');
        loadProducts();
      } catch (error) {
        showAlert('error', error.response?.data?.error || 'Có lỗi xảy ra');
      }
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="products-page">
      <div className="card">
        <div className="card-header">
          <h2>Quản Lý Sản Phẩm</h2>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Thêm Sản Phẩm
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
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            // Chỉ cập nhật text khi gõ, KHÔNG gọi API
            onChange={(e) => setSearch(e.target.value)}
            // Thêm sự kiện: Nhấn Enter thì mới tìm
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                loadProducts();
              }
            }}
          />
          
          {/* Nút Tìm kiếm mới */}
          <button 
            className="btn btn-secondary" 
            onClick={loadProducts} // Bấm nút thì gọi API
            style={{ marginLeft: '10px' }}
          >
            Tìm kiếm
          </button>

          <label style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => {
                setShowHidden(e.target.checked); 
              }}
            />
            Hiển thị sản phẩm đã ẩn
          </label>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã SP</th>
                <th>Tên Sản Phẩm</th>
                <th>Giá Bán</th>
                <th>Tồn Kho</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    Không có sản phẩm nào
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.ma_sp} style={{ opacity: product.trang_thai === 0 ? 0.6 : 1 }}>
                    <td>{product.ma_sp}</td>
                    <td>{product.ten_sp}</td>
                    <td>{parseInt(product.gia_ban).toLocaleString('vi-VN')} đ</td>
                    <td>
                      <span style={{ 
                        color: product.so_luong_ton < 10 ? '#e74c3c' : product.so_luong_ton < 50 ? '#f39c12' : '#27ae60',
                        fontWeight: 'bold'
                      }}>
                        {product.so_luong_ton}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${product.trang_thai === 1 ? 'badge-success' : 'badge-danger'}`}>
                        {product.trang_thai === 1 ? 'Hiển thị' : 'Ẩn'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-warning"
                          onClick={() => handleOpenModal(product)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Sửa
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleToggleVisibility(product)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          {product.trang_thai === 1 ? 'Ẩn' : 'Hiện'}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(product)}
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
              <h3>{editingProduct ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên Sản Phẩm *</label>
                <input
                  type="text"
                  required
                  value={formData.ten_sp}
                  onChange={(e) => setFormData({ ...formData, ten_sp: e.target.value })}
                  placeholder="Nhập tên sản phẩm"
                />
              </div>
              <div className="form-group">
                <label>Giá Bán (đ) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={formData.gia_ban}
                  onChange={(e) => setFormData({ ...formData, gia_ban: e.target.value })}
                  placeholder="Nhập giá bán"
                />
              </div>
              <div className="form-group">
                <label>Số Lượng Tồn Kho</label>
                <input
                  type="number"
                  min="0"
                  value={formData.so_luong_ton}
                  onChange={(e) => setFormData({ ...formData, so_luong_ton: e.target.value })}
                  placeholder="Nhập số lượng tồn kho (mặc định: 0)"
                />
                <small style={{ color: '#666', fontSize: '0.85rem' }}>
                  Để trống hoặc 0 nếu chưa nhập kho
                </small>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Cập Nhật' : 'Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;