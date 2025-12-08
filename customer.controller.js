// controllers/customer.controller.js
const pool = require('../config/db');
const generateNextId = require('../utils/generateNextId');

exports.getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM khach_hang WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (ho_ten LIKE ? OR ma_kh LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY ma_kh DESC';
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const [customer] = await pool.execute('SELECT * FROM khach_hang WHERE ma_kh = ?', [req.params.id]);
    if (customer.length === 0) return res.status(404).json({ success: false, error: 'Khách hàng không tồn tại' });
    res.json({ success: true, data: customer[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { ho_ten, nam_sinh, dia_chi } = req.body;
    
    if (!ho_ten?.trim()) return res.status(400).json({ success: false, error: 'Họ tên bắt buộc' });
    if (nam_sinh && (isNaN(nam_sinh) || nam_sinh < 1900 || nam_sinh > new Date().getFullYear())) {
      return res.status(400).json({ success: false, error: 'Năm sinh không hợp lệ' });
    }
    
    const ma_kh = await generateNextId(pool, 'khach_hang', 'ma_kh', 'KH', 3);
    await pool.execute(
      'INSERT INTO khach_hang (ma_kh, ho_ten, nam_sinh, dia_chi) VALUES (?, ?, ?, ?)',
      [ma_kh, ho_ten.trim(), nam_sinh || null, dia_chi?.trim() || null]
    );
    
    res.status(201).json({ success: true, data: { ma_kh, ho_ten, nam_sinh, dia_chi } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const [existing] = await pool.execute('SELECT * FROM khach_hang WHERE ma_kh = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, error: 'Khách hàng không tồn tại' });

    const current = existing[0];
    const ho_ten = body.ho_ten !== undefined ? body.ho_ten.trim() : current.ho_ten;
    const nam_sinh = body.nam_sinh !== undefined ? body.nam_sinh : current.nam_sinh;
    const dia_chi = body.dia_chi !== undefined ? body.dia_chi?.trim() : current.dia_chi;

    if (!ho_ten) return res.status(400).json({ success: false, error: 'Họ tên bắt buộc' });

    await pool.execute(
      'UPDATE khach_hang SET ho_ten = ?, nam_sinh = ?, dia_chi = ? WHERE ma_kh = ?',
      [ho_ten, nam_sinh, dia_chi, id]
    );
    
    res.json({ success: true, message: 'Cập nhật thành công', data: { ma_kh: id, ho_ten, nam_sinh, dia_chi } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [check] = await pool.execute('SELECT COUNT(*) as count FROM don_hang WHERE ma_kh = ?', [id]);
    if (check[0].count > 0) return res.status(400).json({ success: false, error: 'Khách hàng đã có đơn hàng, không thể xóa' });

    const [result] = await pool.execute('DELETE FROM khach_hang WHERE ma_kh = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Khách hàng không tồn tại' });
    
    res.json({ success: true, message: 'Xóa khách hàng thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};