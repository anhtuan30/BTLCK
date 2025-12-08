// controllers/report.controller.js
const pool = require('../config/db');

exports.getCurrentStock = async (req, res) => {
  try {
    // Thay vì CALL sp_ton_kho(), ta query trực tiếp bảng san_pham
    const [products] = await pool.execute(`
      SELECT ma_sp, ten_sp, so_luong_ton, gia_ban, 
             (so_luong_ton * gia_ban) as gia_tri_ton 
      FROM san_pham 
      ORDER BY so_luong_ton ASC
    `);
    
    const summary = {
      total_products: products.length,
      total_stock_value: products.reduce((sum, p) => sum + (Number(p.gia_tri_ton) || 0), 0),
      low_stock: products.filter(p => p.so_luong_ton < 10 && p.so_luong_ton > 0),
      out_of_stock: products.filter(p => p.so_luong_ton <= 0)
    };
    
    res.json({ success: true, data: { products, summary } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getRevenueByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Ngày không hợp lệ (YYYY-MM-DD)' });
    }
    
    const [result] = await pool.execute('CALL sp_doanh_thu_ngay(?)', [date]);
    res.json({ success: true, data: { date, doanh_thu: result[0][0]?.doanh_thu || 0 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getRevenueByMonth = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year || isNaN(month) || isNaN(year)) {
      return res.status(400).json({ success: false, error: 'Tháng/Năm không hợp lệ' });
    }
    
    const [result] = await pool.execute('CALL sp_doanh_thu_thang(?, ?)', [month, year]);
    res.json({ success: true, data: { month, year, doanh_thu: result[0][0]?.doanh_thu || 0 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};



// TỐI ƯU HIỆU NĂNG QUERY
exports.getCustomerHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Chạy song song query lấy thông tin khách và đơn hàng
    const [customerRows, ordersRows] = await Promise.all([
        pool.execute('SELECT * FROM khach_hang WHERE ma_kh = ?', [customerId]),
        pool.execute(
            `SELECT dh.*, (SELECT COUNT(*) FROM ct_don_hang WHERE ma_dh = dh.ma_dh) as item_count 
             FROM don_hang dh WHERE dh.ma_kh = ? ORDER BY dh.ngay_mua DESC`,
            [customerId]
        )
    ]);

    if (customerRows[0].length === 0) {
      return res.status(404).json({ success: false, error: 'Khách hàng không tồn tại' });
    }
    
    const orders = ordersRows[0];

    // TỐI ƯU: Sử dụng Promise.all để lấy chi tiết song song thay vì tuần tự (N+1 problem)
    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        const [details] = await pool.execute(
            `SELECT ct.*, sp.ten_sp 
             FROM ct_don_hang ct 
             JOIN san_pham sp ON ct.ma_sp = sp.ma_sp 
             WHERE ct.ma_dh = ?`,
            [order.ma_dh]
        );
        return { ...order, items: details };
    }));
    
    const stats = {
      total_orders: orders.length,
      total_spent: orders.reduce((sum, o) => sum + Number(o.tong_tien || 0), 0)
    };
    
    res.json({ success: true, data: { customer: customerRows[0][0], orders: ordersWithDetails, stats } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// THÊM MỚI: Thống kê doanh thu theo khoảng thời gian
exports.getRevenueStats = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query; // type: 'day', 'month'
    
    let dateFormat;
    if (type === 'month') {
        dateFormat = '%Y-%m'; // Gom nhóm theo tháng
    } else {
        dateFormat = '%Y-%m-%d'; // Gom nhóm theo ngày
    }

    // Chỉ tính doanh thu của những đơn "Đã thanh toán"
    const query = `
      SELECT 
        DATE_FORMAT(ngay_mua, ?) as thoi_gian,
        SUM(tong_tien) as doanh_thu,
        COUNT(*) as so_don_hang
      FROM don_hang
      WHERE trang_thai_thanh_toan = 'Đã thanh toán'
      ${startDate ? `AND DATE(ngay_mua) >= '${startDate}'` : ''}
      ${endDate ? `AND DATE(ngay_mua) <= '${endDate}'` : ''}
      GROUP BY thoi_gian
      ORDER BY thoi_gian DESC
    `;

    const [rows] = await pool.execute(query, [dateFormat]);
    
    // Tính tổng cộng
    const totalRevenue = rows.reduce((sum, item) => sum + Number(item.doanh_thu), 0);

    res.json({ success: true, data: { stats: rows, totalRevenue } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.getStockByDate = async (req, res) => {
  try {
    const { date } = req.query; // Ngày muốn xem (VD: 2025-12-06)
    
    if (!date) return res.status(400).json({ error: 'Cần chọn ngày' });

    // Logic: Lấy tồn kho hiện tại + (Tổng bán sau ngày đó) - (Tổng nhập sau ngày đó)
    const query = `
      SELECT 
        p.ma_sp, 
        p.ten_sp, 
        p.gia_ban,
        p.so_luong_ton as hien_tai,
        
        -- Tính tổng đã bán SAU ngày được chọn
        COALESCE((
          SELECT SUM(ct.so_luong) 
          FROM ct_don_hang ct 
          JOIN don_hang dh ON ct.ma_dh = dh.ma_dh 
          WHERE ct.ma_sp = p.ma_sp AND DATE(dh.ngay_mua) > ?
        ), 0) as da_ban_sau_nay,

        -- Tính tổng đã nhập SAU ngày được chọn
        COALESCE((
          SELECT SUM(ct.so_luong) 
          FROM ct_phieu_nhap ct 
          JOIN phieu_nhap pn ON ct.ma_pn = pn.ma_pn 
          WHERE ct.ma_sp = p.ma_sp AND DATE(pn.ngay_nhap) > ?
        ), 0) as da_nhap_sau_nay

      FROM san_pham p
      ORDER BY p.ten_sp ASC
    `;

    const [rows] = await pool.execute(query, [date, date]);

    // Tính toán lại con số tồn kho lịch sử
    const result = rows.map(item => {
      const tonKhoLichSu = Number(item.hien_tai) + Number(item.da_ban_sau_nay) - Number(item.da_nhap_sau_nay);
      return {
        ma_sp: item.ma_sp,
        ten_sp: item.ten_sp,
        gia_ban: item.gia_ban,
        so_luong_ton: tonKhoLichSu, // Trả về số đã tính toán
        gia_tri_ton: tonKhoLichSu * item.gia_ban
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

