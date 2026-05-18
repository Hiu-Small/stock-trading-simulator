import axios from '../setup/axios';

/**
 * Đặt lệnh mua/bán
 */
const placeOrder = (symbol, quantity, price, side, type = 'LO') => {
    return axios.post('/api/order/place-order', { symbol, quantity, price, side, type });
};

/**
 * Lấy danh sách lệnh của user
 * @param {object} params - { page, limit, status }
 */
const getMyOrders = (params = {}) => {
    return axios.get('/api/order/my-orders', { params });
};

/**
 * Hủy lệnh
 */
const cancelOrder = (orderId) => {
    return axios.delete(`/api/order/${orderId}/cancel`);
};

/**
 * Lấy danh mục cổ phiếu
 */
const getMyHoldings = () => {
    return axios.get('/api/order/my-holdings');
};

export { placeOrder, getMyOrders, cancelOrder, getMyHoldings };
