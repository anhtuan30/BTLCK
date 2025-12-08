import React, { useState, useEffect } from 'react';
import { orderAPI, customerAPI, productAPI } from '../services/api';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [formData, setFormData] = useState({
    ma_kh: '',
    items: [{ ma_sp: '', so_luong: 1 }],
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    loadOrders();
    loadCustomers(); // Load các dữ liệu phụ trợ
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getAll(search);
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      showAlert('error', 'Lỗi khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
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
      ma_kh: '',
      items: [{ ma_sp: '', so_luong: 1 }],
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setOrderDetails(null);
    setFormData({
      ma_kh: '',
      items: [{ ma_sp: '', so_luong: 1 }],
    });
  };

  const handleViewDetails = async (order) => {
    try {
      const response = await orderAPI.getById(order.ma_dh);
      if (response.data.success) {
        setOrderDetails(response.data.data);
        setShowModal(true);
      }
    } catch (error) {
      showAlert('error', 'Lỗi khi tải chi tiết đơn hàng');
    }
  };

  const addProductItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { ma_sp: '', so_luong: 1 }],
    });
  };

  const removeProductItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateProductItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!formData.ma_kh) {
      showAlert('error', 'Vui lòng chọn khách hàng');
      return;
    }

    if (formData.items.length === 0 || formData.items.some(item => !item.ma_sp || item.so_luong <= 0)) {
      showAlert('error', 'Vui lòng thêm ít nhất một sản phẩm hợp lệ');
      return;
    }

    try {
      await orderAPI.create(formData);
      showAlert('success', 'Tạo đơn hàng thành công');
      handleCloseModal();
      loadOrders();
    } catch (error) {
      showAlert('error', error.response?.data?.error || 'Có lỗi xảy ra. Vui lòng kiểm tra tồn kho.');
    }
  };

  const handleDelete = async (order) => {
    if (window.confirm(`Bạn có chắc muốn xóa đơn hàng ${order.ma_dh}?`)) {
      try {
        await orderAPI.delete(order.ma_dh);
        showAlert('success', 'Xóa đơn hàng thành công');
        loadOrders();
      } catch (error) {
        showAlert('error', 'Có lỗi xảy ra');
      }
    }
  };

  const getProductName = (ma_sp) => {
    const product = products.find(p => p.ma_sp === ma_sp);
    return product ? product.ten_sp : ma_sp;
  };



  const getCustomerName = (ma_kh) => {
    const customer = customers.find(c => c.ma_kh === ma_kh);
    return customer ? customer.ho_ten : ma_kh;
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  const handleTogglePayment = async (order) => {
  const newStatus = order.trang_thai_thanh_toan === 'Đã thanh toán' ? 'Chưa thanh toán' : 'Đã thanh toán';
  if (window.confirm(`Đổi trạng thái đơn ${order.ma_dh} sang "${newStatus}"?`)) {
    try {
      await orderAPI.updatePayment(order.ma_dh, newStatus);
      loadOrders(); // Tải lại danh sách
      showAlert('success', 'Cập nhật thanh toán thành công');
    } catch (error) {
      showAlert('error', 'Lỗi cập nhật');
    }
  }
};
  return (
    <div className="orders-page">
      <div className="card">
        <div className="card-header">
          <h2>Quản Lý Đơn Hàng</h2>
          <button className="btn btn-primary" onClick={handleOpenModal}>
            + Tạo Đơn Hàng
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
            placeholder="Tìm kiếm đơn hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // Thêm sự kiện Enter
            onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
          />
          {/* Thêm nút Tìm */}
          <button 
            className="btn btn-secondary" 
            onClick={loadOrders}
            style={{ marginLeft: '10px' }}
          >
            Tìm kiếm
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã ĐH</th>
                <th>Khách Hàng</th>
                <th>Thời Gian</th>
                <th>Số Lượng SP</th>
                <th>Tổng tiền</th>
                <th>Trạng Thái Thanh Toán</th>
                
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    Không có đơn hàng nào
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.ma_dh}>
                    <td>{order.ma_dh}</td>
                    <td>{order.ten_khach_hang || getCustomerName(order.ma_kh)}</td>
                    <td>{new Date(order.ngay_mua).toLocaleString('vi-VN')}</td>
                    <td>{order.tong_so_luong || order.item_count || 0}</td>
                    {/* CỘT THANH TOÁN MỚI */}
                    <td>{parseInt(order.tong_tien || 0).toLocaleString('vi-VN')} đ</td>
    <td>
      <span 
        className={`badge ${order.trang_thai_thanh_toan === 'Đã thanh toán' ? 'badge-success' : 'badge-warning'}`}
        style={{ cursor: 'pointer' }}
        onClick={() => handleTogglePayment(order)}
        title="Bấm để đổi trạng thái"
      >
        {order.trang_thai_thanh_toan || 'Chưa thanh toán'}
      </span>
    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-primary"
                          onClick={() => handleViewDetails(order)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Chi Tiết
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(order)}
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
              <h3>{orderDetails ? 'Chi Tiết Đơn Hàng' : 'Tạo Đơn Hàng'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            {orderDetails ? (
              <div className="order-details">
                <div className="detail-row">
                  <strong>Mã Đơn Hàng:</strong> {orderDetails.ma_dh}
                </div>
                <div className="detail-row">
                  <strong>Khách Hàng:</strong> {getCustomerName(orderDetails.ma_kh)}
                </div>
                <div className="detail-row">
                  <strong>Thời Gian:</strong> {new Date(orderDetails.ngay_mua).toLocaleString('vi-VN')}
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
                      {orderDetails.items?.map((item, index) => (
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
                          {parseInt(orderDetails.tong_tien).toLocaleString('vi-VN')} đ
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
                  <label>Khách Hàng *</label>
                  <select
                    required
                    value={formData.ma_kh}
                    onChange={(e) => setFormData({ ...formData, ma_kh: e.target.value })}
                  >
                    <option value="">Chọn khách hàng</option>
                    {customers.map((customer) => (
                      <option key={customer.ma_kh} value={customer.ma_kh}>
                        {customer.ho_ten} ({customer.ma_kh})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Sản Phẩm *</label>
                  {formData.items.map((item, index) => {
                    const selectedProduct = products.find(p => p.ma_sp === item.ma_sp);
                    return (
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
                              {product.ten_sp} - Tồn: {product.so_luong_ton} - Giá: {parseInt(product.gia_ban).toLocaleString('vi-VN')} đ
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          required
                          min="1"
                          max={selectedProduct?.so_luong_ton || 0}
                          value={item.so_luong}
                          onChange={(e) => updateProductItem(index, 'so_luong', parseInt(e.target.value))}
                          placeholder="Số lượng"
                          style={{ flex: 1, marginRight: '0.5rem' }}
                        />
                        {selectedProduct && (
                          <span style={{ flex: 1, color: '#666', fontSize: '0.9rem' }}>
                            Tồn: {selectedProduct.so_luong_ton}
                          </span>
                        )}
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
                    );
                  })}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addProductItem}
                    style={{ marginTop: '0.5rem' }}
                  >
                    + Thêm Sản Phẩm
                  </button>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Tạo Đơn Hàng
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

export default Orders;
