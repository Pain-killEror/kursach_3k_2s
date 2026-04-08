import React, { createContext, useState, useEffect, useContext } from 'react';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    // 1. Достаем сохраненную валюту из localStorage (или ставим USD по умолчанию)
    const [currency, setCurrency] = useState(() => localStorage.getItem('app_currency') || 'USD');

    // 2. Дефолтный курс (на случай если API Нацбанка недоступно)
    const [rateBYN, setRateBYN] = useState(3.2);

    // 3. При каждом изменении валюты пользователем - сохраняем ее в браузер
    useEffect(() => {
        localStorage.setItem('app_currency', currency);
    }, [currency]);

    // 4. Единожды при загрузке стягиваем актуальный курс Нацбанка (USD -> BYN)
    useEffect(() => {
        fetch('https://api.nbrb.by/exrates/rates/431')
            .then(res => res.json())
            .then(data => {
                if (data && data.Cur_OfficialRate) {
                    setRateBYN(data.Cur_OfficialRate);
                }
            })
            .catch(err => console.error("Ошибка загрузки курса НБРБ:", err));
    }, []);

    // 5. Главная функция: переводит цену из валюты базы данных в валюту пользователя
    const convertPrice = (amount, fromCurrency) => {
        if (!amount) return 0;

        // Предполагаем, что если валюта не указана в БД, то это доллары
        const from = fromCurrency?.toUpperCase() || 'USD';

        if (from === currency) return amount;

        if (from === 'USD' && currency === 'BYN') return amount * rateBYN;
        if (from === 'BYN' && currency === 'USD') return amount / rateBYN;

        return amount;
    };

    // 6. Функция для красивой отрисовки (100 000 $ или 320 000 BYN)
    const formatPrice = (amount) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0 // Убираем копейки/центы для визуальной чистоты
        }).format(amount);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, convertPrice, formatPrice, rateBYN }}>
            {children}
        </CurrencyContext.Provider>
    );
};

// Хук для удобного использования в других компонентах
export const useCurrency = () => useContext(CurrencyContext);