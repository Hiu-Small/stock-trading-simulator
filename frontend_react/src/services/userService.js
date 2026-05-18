import axios from '../setup/axios';

const loginUser = (username, password) => {
    return axios.post('/api/login', { username, password });
};

const registerUser = (email, username, password) => {
    return axios.post('/api/register', { email, username, password });
};

const getUserAccount = () => {
    return axios.get('/api/me');
};

const getUserProfile = () => {
    return axios.get('/api/profile');
};

const verifyPin = (pin) => {
    return axios.post('/api/verify-pin', { pin });
};

const markAllNotificationsRead = () => {
    return axios.post('/api/notifications/read-all');
};

const markNotificationRead = (id) => {
    return axios.post(`/api/notifications/${id}/read`);
};

export {
    loginUser,
    registerUser,
    getUserAccount,
    getUserProfile,
    verifyPin,
    markAllNotificationsRead,
    markNotificationRead
};

