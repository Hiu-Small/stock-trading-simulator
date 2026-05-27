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
