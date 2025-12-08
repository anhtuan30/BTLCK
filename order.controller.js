// controllers/order.controller.js
const pool = require('../config/db');
const generateNextId = require('../utils/generateNextId');

const getAllOrders = async (req, res) => {
  try {
    const { keyword, startDate, endDate } = req.query;
    
    // SỬA: Thêm dòng đếm tổng số lượng (alias là 'tong_so_luong')
    let query = `
      SELECT dh.*, kh.ho_ten as ten_khach_hang,
      COALESCE((SELECT SUM(so_luong) FROM ct_don_hang WHERE ma_dh = dh.ma_dh), 0) as tong_so_luong
      FROM don_hang dh 
      JOIN khach_hang kh ON dh.ma_kh = kh.ma_kh 
      WHERE 1=1
    `;
    
    const params = [];

    if (keyword) {
      query += ' AND (dh.ma_dh LIKE ? OR kh.ho_ten LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (startDate) { query += ' AND DATE(dh.ngay_mua) >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND DATE(dh.ngay_mua) <= ?'; params.push(endDate); }

    query += ' ORDER BY dh.ngay_mua DESC';
    const [orders] = await pool.execute(query, params);
    
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const [orders] = await pool.execute(
      `SELECT dh.*, kh.ho_ten as ten_khach_hang FROM don_hang dh JOIN khach_hang kh ON dh.ma_kh = kh.ma_kh WHERE dh.ma_dh = ?`,
      [id]
    );

    if (orders.length === 0) return res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại' });

    const [details] = await pool.execute(
      `SELECT ct.*, sp.ten_sp FROM ct_don_hang ct JOIN san_pham sp ON ct.ma_sp = sp.ma_sp WHERE ct.ma_dh = ?`,
      [id]
    );

    res.json({ success: true, data: { ...orders[0], items: details } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getOrdersByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const [orders] = await pool.execute(
      `SELECT dh.*, kh.ho_ten as ten_khach_hang FROM don_hang dh JOIN khach_hang kh ON dh.ma_kh = kh.ma_kh WHERE dh.ma_kh = ? ORDER BY dh.ngay_mua DESC`,
      [customerId]
    );

    // TỐI ƯU: Fetch parallel
    const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        const [details] = await pool.execute(
            `SELECT ct.*, sp.ten_sp FROM ct_don_hang ct JOIN san_pham sp ON ct.ma_sp = sp.ma_sp WHERE ct.ma_dh = ?`,
            [order.ma_dh]
        );
        return { ...order, items: details };
    }));

    res.json({ success: true, data: ordersWithDetails });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


const createOrder = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { ma_kh, items, trang_thai_thanh_toan } = req.body;
    

    if (!ma_kh || !items?.length) throw new Error('Dữ liệu không hợp lệ');


    const productDetails = [];
    let tong_tien = 0;

    // Kiểm tra tồn kho và tính tiền
    for (const item of items) {
      // Khóa dòng sản phẩm để tránh người khác mua cùng lúc
      const [product] = await conn.execute(
        'SELECT ten_sp, gia_ban, so_luong_ton FROM san_pham WHERE ma_sp = ? FOR UPDATE', 
        [item.ma_sp]
      );

      if (product.length === 0) throw new Error(`SP ${item.ma_sp} không tồn tại`);
      if (product[0].so_luong_ton < item.so_luong) {
        throw new Error(`SP ${product[0].ten_sp} không đủ hàng (chỉ còn ${product[0].so_luong_ton})`);
      }

      // Thêm vào mảng productDetails (Giờ biến này đã được khai báo nên sẽ không lỗi nữa)
      productDetails.push({ 
          ma_sp: item.ma_sp, 
          so_luong: item.so_luong, 
          gia_ban: product[0].gia_ban,
          ten_sp: product[0].ten_sp
      });
    }

    // Tạo mã đơn hàng mới
    const ma_dh = await generateNextId(pool, 'don_hang', 'ma_dh', 'DH', 4);

    // Tạo đơn hàng (Header)
    await conn.execute(
      'INSERT INTO don_hang (ma_dh, ma_kh, ngay_mua, tong_tien, trang_thai_thanh_toan) VALUES (?, ?, NOW(), 0, ?)',
      [ma_dh, ma_kh, trang_thai_thanh_toan || 'Chưa thanh toán']
    );

    // Tạo chi tiết đơn hàng (Details) và trừ tồn kho
    for (const p of productDetails) {
      const thanh_tien = p.gia_ban * p.so_luong;
      tong_tien += thanh_tien;

      await conn.execute(
        'INSERT INTO ct_don_hang (ma_dh, ma_sp, so_luong, don_gia, thanh_tien) VALUES (?, ?, ?, ?, ?)',
        [ma_dh, p.ma_sp, p.so_luong, p.gia_ban, thanh_tien]
      );

      await conn.execute(
        'UPDATE san_pham SET so_luong_ton = so_luong_ton - ? WHERE ma_sp = ?', 
        [p.so_luong, p.ma_sp]
      );
    }

    // Cập nhật tổng tiền cuối cùng
    await conn.execute('UPDATE don_hang SET tong_tien = ? WHERE ma_dh = ?', [tong_tien, ma_dh]);

    await conn.commit();
    res.status(201).json({ success: true, message: 'Tạo đơn hàng thành công' });

  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

// THÊM MỚI: Hàm cập nhật trạng thái thanh toán
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Đã thanh toán' hoặc 'Chưa thanh toán'
    
    await pool.execute('UPDATE don_hang SET trang_thai_thanh_toan = ? WHERE ma_dh = ?', [status, id]);
    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  // Placeholder logic
  res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
};

const deleteOrder = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;

    const [details] = await conn.execute('SELECT * FROM ct_don_hang WHERE ma_dh = ? FOR UPDATE', [id]); // Lock chi tiết
    
    // Hoàn trả tồn kho
    for (const detail of details) {
      await conn.execute('UPDATE san_pham SET so_luong_ton = so_luong_ton + ? WHERE ma_sp = ?', [detail.so_luong, detail.ma_sp]);
    }

    await conn.execute('DELETE FROM ct_don_hang WHERE ma_dh = ?', [id]);
    await conn.execute('DELETE FROM don_hang WHERE ma_dh = ?', [id]);

    await conn.commit();
    res.json({ success: true, message: 'Xóa đơn hàng thành công' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getOrdersByCustomer,
  createOrder,
  updatePaymentStatus,
  updateOrderStatus,
  deleteOrder
};