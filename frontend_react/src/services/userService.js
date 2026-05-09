import axios from '../setup/axios';

const loginUser = (username, password) => {
    return axios.post('/api/login', {
        username,
        password
    });
};

const registerUser = (email, username, password) => {
    return axios.post('/api/register', {
        email,
        username,
        password
    });
};

const getUserAccount = () => {
    return axios.get('/api/me');
};

export {
    loginUser,
    registerUser,
    getUserAccount
};
