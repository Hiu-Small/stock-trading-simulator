import { Server } from 'socket.io';

let ioInstance = null;
const userSockets = new Map(); // key: userId, value: socket.id

export const initSocket = (httpServer, allowedOrigins = []) => {
    ioInstance = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    ioInstance.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        socket.on('register_user', (userId) => {
            const numericUserId = parseInt(userId);
            if (!isNaN(numericUserId)) {
                socket.userId = numericUserId;
                userSockets.set(numericUserId, socket.id);
                console.log(`👤 User #${numericUserId} registered socket: ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            if (socket.userId) {
                userSockets.delete(socket.userId);
                console.log(`❌ User #${socket.userId} disconnected`);
            }
        });
    });

    return ioInstance;
};

export const getIO = () => ioInstance;

export const sendBalanceUpdate = (userId, newBalance) => {
    if (!ioInstance) return;
    const numericUserId = parseInt(userId);
    const socketId = userSockets.get(numericUserId);
    if (socketId) {
        ioInstance.to(socketId).emit('balance_update', {
            newBalance: parseFloat(newBalance)
        });
        console.log(`📡 Sent real-time balance update to User #${numericUserId}: ${newBalance} VNĐ`);
    }
};

export const sendNotification = (userId, message) => {
    if (!ioInstance) return;
    const numericUserId = parseInt(userId);
    const socketId = userSockets.get(numericUserId);
    if (socketId) {
        ioInstance.to(socketId).emit('new_notification', {
            message: message
        });
        console.log(`📡 Sent real-time notification to User #${numericUserId}: ${message}`);
    }
};

// Tự động gửi dữ liệu bảng giá VN30 mỗi 3 giây đến toàn bộ Client đang online
setInterval(async () => {
    if (!ioInstance) return;
    
    // Chỉ chạy nếu có ít nhất 1 client đang kết nối để tối ưu tài nguyên
    const connectedSocketsCount = ioInstance.sockets.sockets.size;
    if (connectedSocketsCount === 0) return;

    try {
        const marketService = require('../service/marketService.js').default;
        const db = require('../models/index.js');

        const boardData = await marketService.getBoardByGroup("VN30");
        if (boardData && boardData.success && boardData.data) {
            const dbStocks = await db.Stock.findAll({ attributes: ['symbol', 'is_active'] });
            const statusMap = {};
            dbStocks.forEach(s => statusMap[s.symbol] = s.is_active);

            const mergedData = boardData.data.map(s => ({
                ...s,
                is_active: statusMap[s.symbol] !== undefined ? statusMap[s.symbol] : true
            }));

            ioInstance.emit('board_update', {
                group: "VN30",
                data: mergedData
            });
        }
    } catch (err) {
        console.error('[Socket Board Broadcast] Lỗi:', err.message);
    }
}, 3000);
