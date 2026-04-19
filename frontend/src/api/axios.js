import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Перехватчик ЗАПРОСОВ (добавляет токен)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Перехватчик ОТВЕТОВ (Наш МОЩНЫЙ радар проблем)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 1. Выводим полную инфу в консоль браузера для тебя
        console.group('🛑 AXIOS ПЕРЕХВАТЧИК ОШИБОК');
        console.error('URL:', error.config?.url);
        console.error('Метод:', error.config?.method?.toUpperCase());
        console.error('Статус:', error.response?.status || 'Network Error (СЕТЬ/CORS)');
        console.error('Ответ сервера:', error.response?.data);
        console.groupEnd();

        // 2. Анализируем и показываем понятное окно
        if (!error.response) {
            alert(`СЕТЕВАЯ ОШИБКА (CORS) 🚫\n\nЗапрос к ${error.config?.url} был заблокирован.\nСкорее всего бэкенд отбил предварительный OPTIONS запрос. Смотри консоль F12.`);
        } else if (error.response.status === 403) {
            alert(`ОШИБКА 403: ДОСТУП ЗАПРЕЩЕН 👮‍♂️\n\nСервер тебя узнал, но у твоего токена нет роли ADMIN.\nВозможно, ты забыл выйти из аккаунта и зайти заново после изменения БД.`);
        } else if (error.response.status === 401) {
            alert(`ОШИБКА 401: НЕ АВТОРИЗОВАН 🔐\n\nТокен истек, поврежден или отсутствует.`);
        }

        // 3. Старая логика: если нет прав — стираем сессию и на логин
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            //window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;