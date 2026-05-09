import React, { useState, useEffect, createContext } from 'react';

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
        <UserContext.Provider value={{ user, loginContext, logoutContext, updateUserStatus }}>
            {children}
        </UserContext.Provider>
    );
};

export { UserContext, UserProvider };
