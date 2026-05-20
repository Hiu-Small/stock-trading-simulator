import React, { useState, useEffect, createContext } from 'react';
import { getUserProfile, markAllNotificationsRead, markNotificationRead } from '../services/userService';

const UserContext = createContext({ name: '', auth: false });

const UserProvider = ({ children }) => {
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
                        setNotifications(res.DT.histories);
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

    // Tự động tải và đồng bộ định kỳ (mỗi 5 giây) số dư & thông báo khi đăng nhập thành công
    useEffect(() => {
        if (user.isAuthenticated) {
            refreshBalance();

            const interval = setInterval(() => {
                refreshBalance();
            }, 5000);

            return () => clearInterval(interval);
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
