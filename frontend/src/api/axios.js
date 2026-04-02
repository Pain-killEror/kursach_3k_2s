import axios from 'axios';

// 1. Создаем экземпляр axios с базовым URL бэкенда.
// Теперь нам не нужно везде писать http://localhost:8080/api
const api = axios.create({
    baseURL: 'http://localhost:8080/api',
});

// 2. Настраиваем перехватчик (Interceptor) запросов
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        // Если сервер ответил успешно (200), просто пропускаем данные дальше
        return response;
    },
    (error) => {
        // Если сервер ругается, что токен просрочен или неверен (401 или 403)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.error("Токен недействителен, выходим из системы...");
            // 1. Очищаем старые данные
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // 2. Перекидываем человека на страницу входа
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
export default api;