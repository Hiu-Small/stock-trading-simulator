import orderService from "../service/orderService.js";

const handlePlaceOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol, quantity, price, side, type } = req.body;
        if (!symbol || !quantity || !price || !side) {
            return res.status(400).json({ EM: 'Thiếu thông tin đặt lệnh', EC: -1, DT: '' });
        }
        const data = await orderService.placeOrder({ userId, symbol, quantity, price, side, type: type || 'LO' });
        return res.status(200).json({ EM: data.EM, EC: data.EC, DT: data.DT });
    } catch (e) {
        console.error('[handlePlaceOrder]', e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

const handleGetMyOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit, status, startDate, endDate } = req.query;
        const data = await orderService.getUserOrders(userId, { page, limit, status, startDate, endDate });
        return res.status(200).json({ EM: data.EM, EC: data.EC, DT: data.DT });
    } catch (e) {
        console.error('[handleGetMyOrders]', e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

const handleCancelOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = req.params.id;
        const data = await orderService.cancelOrder(orderId, userId);
        return res.status(200).json({ EM: data.EM, EC: data.EC, DT: data.DT });
    } catch (e) {
        console.error('[handleCancelOrder]', e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

const handleGetMyHoldings = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await orderService.getUserHoldings(userId);
        return res.status(200).json({ EM: data.EM, EC: data.EC, DT: data.DT });
    } catch (e) {
        console.error('[handleGetMyHoldings]', e);
        return res.status(500).json({ EM: 'Lỗi server', EC: -1, DT: '' });
    }
};

export default { handlePlaceOrder, handleGetMyOrders, handleCancelOrder, handleGetMyHoldings };
