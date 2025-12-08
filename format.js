// Hàm format tiền tệ tái sử dụng
export const formatCurrency = (amount) => {
  const num = Number(amount); // Dùng Number an toàn hơn parseInt với số lớn
  if (isNaN(num)) return '0 đ';
  return num.toLocaleString('vi-VN') + ' đ';
};