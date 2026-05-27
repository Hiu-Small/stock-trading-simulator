import React, { useState, useEffect, createContext, useRef } from 'react';
import { io } from 'socket.io-client';
import { getUserProfile, markAllNotificationsRead, markNotificationRead } from '../services/userService';
import { toast } from 'react-toastify';
import { useTranslation } from './LanguageContext';
import { translateNotificationText } from '../components/Layout/Nav';

const UserContext = createContext({ name: '', auth: false });

const UserProvider = ({ children }) => {
    const { lang, t } = useTranslation();
    // Default user object
    const defaultUser = {
        isLoading: true,
        isAuthenticated: false,
        token: "",
        account: {}
    };

    const [user, setUser] = useState(defaultUser);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [balance, setBalance] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const socketRef = useRef(null);

    // Login updates the state and session storage
    const loginContext = (userData) => {
        setUser({
            ...userData,
            isLoading: false
        });
    };

    // Logout clears the state and session storage
    const logoutContext = () => {
        setUser({
            isAuthenticated: false,
            token: "",
            account: {},
            isLoading: false
        });
        setBalance(0);
        setNotifications([]);
    };

    const updateUserStatus = (newStatus) => {
        setUser(prev => ({
            ...prev,
            account: {
                ...prev.account,
                status: newStatus
            }
        }));
        
        // Cập nhật lại sessionStorage
        let session = sessionStorage.getItem("account");
        if (session) {
            let data = JSON.parse(session);
            data.status = newStatus;
            sessionStorage.setItem("account", JSON.stringify(data));
        }
    };

    const refreshBalance = async () => {
        if (sessionStorage.getItem("account") || user.isAuthenticated) {
            try {
                const res = await getUserProfile();
                if (res && res.EC === 0 && res.DT) {
                    if (res.DT.wallet) {
                        const totalBalance = parseFloat(res.DT.wallet.balance || 0);
                        const frozenBalance = parseFloat(res.DT.wallet.frozen_balance || 0);
                        setBalance(totalBalance - frozenBalance);
                    }
                    if (res.DT.histories) {
                        setNotifications(prevNotifications => {
                            // Only trigger toast if the previous state has been populated (i.e. not the initial page load/mount)
                            if (prevNotifications && prevNotifications.length > 0) {
                                const prevIds = new Set(prevNotifications.map(n => n.id));
                                res.DT.histories.forEach(notif => {
                                    if (!notif.is_read && !prevIds.has(notif.id)) {
                                        toast.info(translateNotificationText(notif.new_value, lang, t) || "Bạn có thông báo mới", {
                                            position: "top-right",
                                            autoClose: 6000,
                                            hideProgressBar: false,
                                            closeOnClick: true,
                                            pauseOnHover: true,
                                            draggable: true,
                                            theme: "colored"
                                        });
                                    }
                                });
                            }
                            return res.DT.histories;
                        });
                    }
                }
            } catch (error) {
                console.error("Error refreshing balance:", error);
            }
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await markAllNotificationsRead();
            if (res && res.EC === 0) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const toggleReadStatus = async (id) => {
        try {
            const res = await markNotificationRead(id);
            if (res && res.EC === 0 && res.DT) {
                const isReadNew = res.DT.is_read;
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: isReadNew } : n));
            }
        } catch (error) {
            console.error("Error toggling notification read status:", error);
        }
    };

    // Tự động kết nối WebSocket khi người dùng đăng nhập thành công
    useEffect(() => {
        if (user.isAuthenticated && user.account?.id) {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
            socketRef.current = io(backendUrl, {
                withCredentials: true
            });

            socketRef.current.on('connect', () => {
                console.log("🔌 Connected to WebSocket Server!");
                socketRef.current.emit('register_user', user.account.id);
            });

            socketRef.current.on('balance_update', (data) => {
                console.log("💰 Real-time balance update received:", data);
                if (data && data.newBalance !== undefined) {
                    setBalance(parseFloat(data.newBalance));
                }
            });

            socketRef.current.on('new_notification', (data) => {
                console.log("🔔 Real-time notification received:", data);
                toast.info(translateNotificationText(data.message, lang, t) || "Bạn có thông báo mới", {
                    position: "top-right",
                    autoClose: 6000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: "colored"
                });
                refreshBalance();
            });

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
            };
        }
    }, [user.isAuthenticated, user.account?.id, lang]);

    // Tự động tải số dư và danh mục ban đầu khi đăng nhập thành công
    useEffect(() => {
        if (user.isAuthenticated) {
            refreshBalance();
        }
    }, [user.isAuthenticated]);

    // Recover state from sessionStorage on mount
    useEffect(() => {
        try {
            let session = sessionStorage.getItem("account");
            if (session) {
                let data = JSON.parse(session);
                setUser({
                    isAuthenticated: true,
                    token: data.token,
                    account: {
                        id: data.id,
                        role: data.role,
                        username: data.username,
                        account_number: data.account_number || data.username,
                        status: data.status
                    },
                    isLoading: false
                });
            } else {
                setUser({
                    isAuthenticated: false,
                    token: "",
                    account: {},
                    isLoading: false
                });
            }
        } catch (error) {
            console.error("Error recovering session:", error);
            setUser({
                isAuthenticated: false,
                token: "",
                account: {},
                isLoading: false
            });
        }
    }, []);

    return (
        <UserContext.Provider value={{ 
            user, 
            loginContext, 
            logoutContext, 
            updateUserStatus, 
            showLoginModal, 
            setShowLoginModal,
            balance,
            refreshBalance,
            notifications,
            setNotifications,
            markAllAsRead,
            toggleReadStatus
        }}>
            {children}
        </UserContext.Provider>
    );
};

export { UserContext, UserProvider };
