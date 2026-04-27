import axios from 'axios';
import toast from 'react-hot-toast';

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

// Перехватчик ОТВЕТОВ
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;

        if (!response) {
            toast.error("Сетевая ошибка или проблема с CORS", { id: 'api-error' });
        } else {
            const status = response.status;
            const message = response.data?.message || "Произошла ошибка";

            switch (status) {
                case 401:
                    // Только один тост
                    toast.error("Сессия истекла. Пожалуйста, войдите снова", { id: 'api-error' });
                    // Токен протух или невалиден — чистим и редиректим
                    localStorage.clear();
                    sessionStorage.clear();
                    if (window.location.pathname !== '/login') {
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 1000); // Даем время увидеть сообщение
                    }
                    break;
                case 403:
                    // Нет прав доступа — просто уведомляем
                    toast.error("У вас нет прав для этого действия", { id: 'api-error' });
                    break;
                case 404:
                    toast.error(message || "Ресурс не найден", { id: 'api-error' });
                    break;
                default:
                    toast.error(message || "Ошибка сервера", { id: 'api-error' });
                    break;
            }
        }

        return Promise.reject(error);
    }
);

export default api;