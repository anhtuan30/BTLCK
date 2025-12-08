// utils/generateNextId.js

/**
 * Hàm tạo ID tự tăng (Ví dụ: SP001, SP002...)
 * @param {Object} pool - Kết nối db
 * @param {string} tableName - Tên bảng (vd: 'san_pham')
 * @param {string} idColumn - Tên cột ID (vd: 'ma_sp')
 * @param {string} prefix - Tiền tố (vd: 'SP')
 * @param {number} padLength - Độ dài số (mặc định 3 -> 001)
 */
const generateNextId = async (pool, tableName, idColumn, prefix, padLength = 3) => {
  try {
    // Lấy ID cuối cùng hiện có trong bảng
    // Sắp xếp theo độ dài chuỗi giảm dần, sau đó đến giá trị chuỗi giảm dần
    // Để tránh trường hợp SP10 bị xếp dưới SP9
    const query = `
      SELECT ${idColumn} 
      FROM ${tableName} 
      WHERE ${idColumn} LIKE ? 
      ORDER BY LENGTH(${idColumn}) DESC, ${idColumn} DESC 
      LIMIT 1
    `;
    
    const [rows] = await pool.execute(query, [`${prefix}%`]);

    let nextNumber = 1;

    if (rows.length > 0) {
      const lastId = rows[0][idColumn];
      // Cắt bỏ phần prefix, lấy phần số
      const numberPart = lastId.replace(prefix, '');
      const currentNumber = parseInt(numberPart, 10);
      
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }

    // Tạo ID mới với số 0 ở đầu (padding)
    // Ví dụ: 1 -> "001", 12 -> "012"
    return `${prefix}${nextNumber.toString().padStart(padLength, '0')}`;
    
  } catch (error) {
    console.error('Lỗi tạo ID:', error);
    // Fallback: Nếu lỗi DB thì quay về random để không chết app
    return `${prefix}${Date.now()}`;
  }
};

module.exports = generateNextId;