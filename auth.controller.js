// controllers/auth.controller.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'mat_khau_bi_mat_cua_ban'; // Nên đưa vào file .env

exports.register = async (req, res) => {
  try {
    const { username, password, full_name } = req.body;

    // Kiểm tra user tồn tại
    const [existing] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Tên đăng nhập đã tồn tại' });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.execute(
      'INSERT INTO users (username, password, full_name) VALUES (?, ?, ?)',
      [username, hashedPassword, full_name]
    );

    res.status(201).json({ success: true, message: 'Đăng ký thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Tìm user
    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(400).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    const user = users[0];

    // Kiểm tra mật khẩu
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    // Tạo Token
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1d' });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, full_name: user.full_name }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};