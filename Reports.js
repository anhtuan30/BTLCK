import React, { useState, useEffect } from 'react';
import { reportAPI, customerAPI, productAPI } from '../services/api';
import './Reports.css';

const Reports = () => {
  const [currentStock, setCurrentStock] = useState([]);
  const [stockByDate, setStockByDate] = useState([]);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');
  const [revenueData, setRevenueData] = useState([]);
const [totalRevenue, setTotalRevenue] = useState(0);
const [revenueType, setRevenueType] = useState('day'); // 'day' hoặc 'month'

// Thêm useEffect load doanh thu
  useEffect(() => {
    if (activeTab === 'revenue') {
      loadRevenue();
    }
    // THÊM DÒNG DƯỚI ĐÂY ĐỂ TẮT LỖI:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedDate, revenueType]);

const loadRevenue = async () => {
  try {
    setLoading(true);
    // Lấy doanh thu từ đầu tháng đến nay (hoặc tùy chỉnh)
    const response = await reportAPI.getRevenue({ 
        type: revenueType,
        // Có thể thêm startDate, endDate vào đây nếu muốn lọc kỹ hơn
    });
    if (response.data.success) {
      setRevenueData(response.data.data.stats);
      setTotalRevenue(response.data.data.totalRevenue);
    }
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0 || activeTab === 'stock') {
      loadCurrentStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, activeTab]);

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll('', true);
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'stock-date' && selectedDate) {
      loadStockByDate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, activeTab]);

  useEffect(() => {
    if (activeTab === 'customer-history' && selectedCustomer) {
      loadCustomerHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer, activeTab]);

  const loadCurrentStock = async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getCurrentStock();
      if (response.data.success) {
        let stockData = response.data.data.products || [];
        // Nếu stored procedure không trả về gia_ban, lấy từ danh sách sản phẩm
        if (products.length > 0) {
          stockData = stockData.map(item => {
            const product = products.find(p => p.ma_sp === item.ma_sp);
            return {
              ...item,
              gia_ban: item.gia_ban || product?.gia_ban || 0
            };
          });
        }
        setCurrentStock(stockData);
      }
    } catch (error) {
      console.error('Error loading current stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStockByDate = async () => {
    try {
      setLoading(true);
      // Gọi đúng API tính toán lịch sử
      const response = await reportAPI.getStockByDate(selectedDate);
      
      if (response.data.success) {
        setStockByDate(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi tải báo cáo theo ngày:', error);
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

  const loadCustomerHistory = async () => {
    try {
      setLoading(true);
      const response = await reportAPI.getCustomerHistory(selectedCustomer);
      if (response.data.success) {
        setCustomerHistory({
          ...response.data.data.customer,
          don_hang: response.data.data.orders || []
        });
      }
    } catch (error) {
      console.error('Error loading customer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalValue = (stockList) => {
    return stockList.reduce((total, item) => {
      const soLuong = parseInt(item.so_luong_ton) || 0;
      const giaBan = parseFloat(item.gia_ban) || 0;
      return total + (soLuong * giaBan);
    }, 0);
  };

  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice === null || numPrice === undefined) {
      return '0';
    }
    return numPrice.toLocaleString('vi-VN');
  };

  if (loading && activeTab === 'stock') {
    return <div className="spinner"></div>;
  }

  return (
    <div className="reports-page">
      <div className="card">
        <div className="card-header">
          <h2>Thống Kê</h2>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            Tồn Kho Hiện Tại
          </button>
          <button
            className={`tab ${activeTab === 'stock-date' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock-date')}
          >
            Tồn Kho Theo Ngày
          </button>
          <button className={`tab ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>
    Báo Cáo Doanh Thu
  </button>
          <button
            className={`tab ${activeTab === 'customer-history' ? 'active' : ''}`}
            onClick={() => setActiveTab('customer-history')}
          >
            Lịch Sử Mua Hàng
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'stock' && (
            <div className="stock-report">
              <h3>Tình Trạng Tồn Kho Hiện Tại</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Mã SP</th>
                      <th>Tên Sản Phẩm</th>
                      <th>Số Lượng Tồn</th>
                      <th>Giá Bán</th>
                      <th>Giá Trị Tồn Kho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentStock.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      currentStock.map((item) => {
                        const soLuong = parseInt(item.so_luong_ton) || 0;
                        const giaBan = parseFloat(item.gia_ban) || 0;
                        const giaTriTonKho = soLuong * giaBan;
                        return (
                          <tr key={item.ma_sp}>
                            <td>{item.ma_sp}</td>
                            <td>{item.ten_sp}</td>
                            <td>{soLuong}</td>
                            <td>{formatPrice(giaBan)} đ</td>
                            <td>{formatPrice(giaTriTonKho)} đ</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        Tổng Giá Trị Tồn Kho:
                      </td>
                      <td style={{ fontWeight: 'bold' }}>
                        {formatPrice(calculateTotalValue(currentStock))} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'stock-date' && (
            <div className="stock-date-report">
              <div className="form-group">
                <label>Chọn Ngày:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ maxWidth: '300px' }}
                />
              </div>
              <h3>Tồn Kho Tính Đến Ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Mã SP</th>
                      <th>Tên Sản Phẩm</th>
                      <th>Số Lượng Tồn</th>
                      <th>Giá Bán</th>
                      <th>Giá Trị Tồn Kho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockByDate.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                          Không có dữ liệu cho ngày này
                        </td>
                      </tr>
                    ) : (
                      stockByDate.map((item) => {
                        const soLuong = parseInt(item.so_luong_ton) || 0;
                        const giaBan = parseFloat(item.gia_ban) || 0;
                        const giaTriTonKho = soLuong * giaBan;
                        return (
                          <tr key={item.ma_sp}>
                            <td>{item.ma_sp}</td>
                            <td>{item.ten_sp}</td>
                            <td>{soLuong}</td>
                            <td>{formatPrice(giaBan)} đ</td>
                            <td>{formatPrice(giaTriTonKho)} đ</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        Tổng Giá Trị Tồn Kho:
                      </td>
                      <td style={{ fontWeight: 'bold' }}>
                        {formatPrice(calculateTotalValue(stockByDate))} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customer-history' && (
            <div className="customer-history-report">
              <div className="form-group">
                <label>Chọn Khách Hàng:</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  style={{ maxWidth: '400px' }}
                >
                  <option value="">Chọn khách hàng</option>
                  {customers.map((customer) => (
                    <option key={customer.ma_kh} value={customer.ma_kh}>
                      {customer.ho_ten} ({customer.ma_kh})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && customerHistory && (
                <>
                  <div className="customer-info">
                    <h3>Thông Tin Khách Hàng</h3>
                    <div className="info-grid">
                      <div>
                        <strong>Mã KH:</strong> {customerHistory.ma_kh}
                      </div>
                      <div>
                        <strong>Họ Tên:</strong> {customerHistory.ho_ten}
                      </div>
                      <div>
                        <strong>Năm Sinh:</strong> {customerHistory.nam_sinh}
                      </div>
                      <div>
                        <strong>Địa Chỉ:</strong> {customerHistory.dia_chi}
                      </div>
                    </div>
                  </div>

                 

                  <div className="order-history">
                    <h3>Lịch Sử Mua Hàng</h3>
                    {customerHistory.don_hang && customerHistory.don_hang.length > 0 ? (
                      <div className="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Mã ĐH</th>
                              <th>Thời Gian</th>
                              <th>Số Lượng SP</th>
                              <th>Tổng Tiền</th>
                              <th>Chi Tiết</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerHistory.don_hang.map((order) => (
                              <tr key={order.ma_dh}>
                                <td>{order.ma_dh}</td>
                                <td>{new Date(order.ngay_mua).toLocaleString('vi-VN')}</td>
                                <td>{order.items?.length || 0}</td>
                                <td>{parseInt(order.tong_tien || 0).toLocaleString('vi-VN')} đ</td>
                                <td>
                                  <details>
                                    <summary style={{ cursor: 'pointer', color: '#667eea' }}>
                                      Xem chi tiết
                                    </summary>
                                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '5px' }}>
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Sản Phẩm</th>
                                            <th>Số Lượng</th>
                                            <th>Đơn Giá</th>
                                            <th>Thành Tiền</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {order.items?.map((item, index) => (
                                            <tr key={index}>
                                              <td>{item.ten_sp || item.ma_sp}</td>
                                              <td>{item.so_luong}</td>
                                              <td>{parseInt(item.don_gia).toLocaleString('vi-VN')} đ</td>
                                              <td>{parseInt(item.thanh_tien).toLocaleString('vi-VN')} đ</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </details>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                Tổng Chi Tiêu:
                              </td>
                              <td style={{ fontWeight: 'bold' }}>
                                {customerHistory.don_hang.reduce((sum, order) => 
                                  sum + parseFloat(order.tong_tien || 0), 0
                                ).toLocaleString('vi-VN')} đ
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                        Khách hàng chưa có đơn hàng nào
                      </p>
                    )}
                  </div>
                </>
              )}

              {selectedCustomer && loading && (
                <div className="spinner"></div>
              )}
            </div>
          )}
        </div>
        {activeTab === 'revenue' && (
    <div className="revenue-report">
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label>Xem theo:</label>
            <select value={revenueType} onChange={(e) => setRevenueType(e.target.value)} style={{ padding: '5px' }}>
                <option value="day">Ngày</option>
                <option value="month">Tháng</option>
            </select>
            <div style={{ marginLeft: 'auto', fontSize: '1.2rem', fontWeight: 'bold', color: '#27ae60' }}>
                Tổng Doanh Thu: {totalRevenue.toLocaleString('vi-VN')} đ
            </div>
        </div>

        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Thời Gian</th>
                        <th>Số Đơn Hàng</th>
                        <th>Doanh Thu</th>
                    </tr>
                </thead>
                <tbody>
                    {revenueData.length === 0 ? (
                        <tr><td colSpan="3" style={{textAlign:'center'}}>Chưa có dữ liệu doanh thu</td></tr>
                    ) : (
                        revenueData.map((item, index) => (
                            <tr key={index}>
                                <td>{item.thoi_gian}</td>
                                <td>{item.so_don_hang}</td>
                                <td style={{ fontWeight: 'bold', color: '#2980b9' }}>
                                    {parseInt(item.doanh_thu).toLocaleString('vi-VN')} đ
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  )}

      </div>
    </div>
  );
};

export default Reports;

