// controllers/stock.controller.js
const pool = require('../config/db');
const generateNextId = require('../utils/generateNextId');

exports.createStockImport = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { don_vi_nhap, items } = req.body;
    if (!don_vi_nhap?.trim()) throw new Error('Đơn vị nhập bắt buộc');
    if (!items?.length) throw new Error('Danh sách sản phẩm trống');

    // TỐI ƯU: Sắp xếp items theo mã SP để tránh DEADLOCK khi nhiều người nhập cùng lúc
    items.sort((a, b) => a.ma_sp.localeCompare(b.ma_sp));

    const ma_pn = await generateNextId(pool, 'phieu_nhap', 'ma_pn', 'NK', 4); // Cho 4 số vì phiếu nhập nhiều (NK0001)
    let tong_tien = 0;

    await conn.execute('INSERT INTO phieu_nhap (ma_pn, ngay_nhap, don_vi_nhap) VALUES (?, NOW(), ?)', [ma_pn, don_vi_nhap.trim()]);

    for (const item of items) {
      if (!item.so_luong || item.so_luong <= 0) throw new Error(`SP ${item.ma_sp}: Số lượng phải > 0`);
      
      // Lock row để update an toàn
      const [product] = await conn.execute('SELECT so_luong_ton FROM san_pham WHERE ma_sp = ? FOR UPDATE', [item.ma_sp]);
      if (product.length === 0) throw new Error(`SP ${item.ma_sp} không tồn tại`);

      const thanh_tien = item.don_gia * item.so_luong;
      tong_tien += thanh_tien;

      await conn.execute(
        'INSERT INTO ct_phieu_nhap (ma_pn, ma_sp, so_luong, don_gia, thanh_tien) VALUES (?, ?, ?, ?, ?)',
        [ma_pn, item.ma_sp, item.so_luong, item.don_gia, thanh_tien]
      );

      await conn.execute('UPDATE san_pham SET so_luong_ton = so_luong_ton + ? WHERE ma_sp = ?', [item.so_luong, item.ma_sp]);
    }

    await conn.execute('UPDATE phieu_nhap SET tong_tien = ? WHERE ma_pn = ?', [tong_tien, ma_pn]);
    await conn.commit();
    
    res.status(201).json({ success: true, data: { ma_pn, don_vi_nhap, tong_tien, items } });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

exports.getStockImports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = 'SELECT * FROM phieu_nhap WHERE 1=1';
    const params = [];

    if (startDate) { query += ' AND DATE(ngay_nhap) >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND DATE(ngay_nhap) <= ?'; params.push(endDate); }
    
    query += ' ORDER BY ngay_nhap DESC';
    const [imports] = await pool.execute(query, params);

    // TỐI ƯU: Fetch chi tiết song song
    const importsWithDetails = await Promise.all(imports.map(async (imp) => {
        const [details] = await pool.execute(
            `SELECT ct.*, sp.ten_sp FROM ct_phieu_nhap ct JOIN san_pham sp ON ct.ma_sp = sp.ma_sp WHERE ct.ma_pn = ?`,
            [imp.ma_pn]
        );
        return { ...imp, items: details };
    }));

    res.json({ success: true, data: importsWithDetails });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getStockImportById = async (req, res) => {
  try {
    const { id } = req.params;
    const [imports] = await pool.execute('SELECT * FROM phieu_nhap WHERE ma_pn = ?', [id]);
    if (imports.length === 0) return res.status(404).json({ success: false, error: 'Phiếu nhập không tồn tại' });

    const [details] = await pool.execute(
      `SELECT ct.*, sp.ten_sp FROM ct_phieu_nhap ct JOIN san_pham sp ON ct.ma_sp = sp.ma_sp WHERE ct.ma_pn = ?`,
      [id]
    );

    res.json({ success: true, data: { ...imports[0], items: details } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateStockImport = async (req, res) => {
  try {
    const { id } = req.params;
    const { don_vi_nhap } = req.body;
    
    if (!don_vi_nhap?.trim()) return res.status(400).json({ success: false, error: 'Đơn vị nhập bắt buộc' });

    const [result] = await pool.execute('UPDATE phieu_nhap SET don_vi_nhap = ? WHERE ma_pn = ?', [don_vi_nhap.trim(), id]);
    
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Phiếu nhập không tồn tại' });
    
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteStockImport = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    
    // Sử dụng FOR UPDATE để khóa phiếu nhập, tránh ai đó sửa trong lúc đang xóa
    const [imports] = await conn.execute('SELECT * FROM phieu_nhap WHERE ma_pn = ? FOR UPDATE', [id]);
    if (imports.length === 0) throw new Error('Phiếu nhập không tồn tại');
    
    const diff = (new Date() - new Date(imports[0].ngay_nhap)) / 36e5; // 36e5 = 1000*60*60
    if (diff > 24) throw new Error('Chỉ được xóa trong 24h');

    const [details] = await conn.execute('SELECT * FROM ct_phieu_nhap WHERE ma_pn = ?', [id]);
    
    // Trừ tồn kho - Cần sort lại chi tiết theo ma_sp nếu cần thiết, ở đây logic đơn giản loop cũng được
    for (const detail of details) {
      const [product] = await conn.execute('SELECT so_luong_ton FROM san_pham WHERE ma_sp = ? FOR UPDATE', [detail.ma_sp]);
      if (product.length === 0 || product[0].so_luong_ton < detail.so_luong) {
        throw new Error(`Không thể hoàn tác SP ${detail.ma_sp}: Tồn kho không đủ`);
      }
      await conn.execute('UPDATE san_pham SET so_luong_ton = so_luong_ton - ? WHERE ma_sp = ?', [detail.so_luong, detail.ma_sp]);
    }
    
    await conn.execute('DELETE FROM ct_phieu_nhap WHERE ma_pn = ?', [id]);
    await conn.execute('DELETE FROM phieu_nhap WHERE ma_pn = ?', [id]);
    
    await conn.commit();
    res.json({ success: true, message: 'Xóa phiếu nhập thành công' });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};