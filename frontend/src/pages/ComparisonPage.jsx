import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
import './ComparisonPage.css';


const API_BASE_URL = "http://localhost:8080";

/* ===================================================================================
   1. КОНСТАНТЫ И СЛОВАРИ (ВСТРОЕННАЯ ЛОГИКА ДЛЯ ИСКЛЮЧЕНИЯ ОШИБОК ИМПОРТОВ)
   =================================================================================== */

const STRATEGY_DICTIONARY = [
    { id: 'LONG_RENT', label: '🏠 Долгосрочная аренда', allowed: ['Квартира', 'Дом', 'Коммерция', 'Офис', 'Склад', 'Гараж'] },
    { id: 'SHORT_RENT', label: '🛏️ Посуточная аренда', allowed: ['Квартира', 'Дом'] },
    { id: 'FLIP', label: '🔨 Флиппинг (перепродажа)', allowed: ['Квартира', 'Дом', 'Коммерция', 'Офис', 'Гараж'] },
    { id: 'BUY_HOLD', label: '📈 Buy & Hold (Сбережение)', allowed: ['Квартира', 'Дом', 'Участок', 'Коммерция', 'Офис', 'Склад', 'Гараж'] },
    { id: 'BUILD_SELL', label: '🏗️ Строительство и продажа', allowed: ['Участок'] }
];

const CATEGORY_NORMALIZER = {
    'КВАРТИРА': 'Квартира', 'APARTMENT': 'Квартира', 'FLAT': 'Квартира',
    'ДОМ': 'Дом', 'HOUSE': 'Дом', 'COTTAGE': 'Дом',
    'УЧАСТОК': 'Участок', 'LAND': 'Участок',
    'КОММЕРЦИЯ': 'Коммерция', 'COMMERCIAL': 'Коммерция',
    'ОФИС': 'Офис', 'OFFICE': 'Офис',
    'СКЛАД': 'Склад', 'WAREHOUSE': 'Склад',
    'ГАРАЖ': 'Гараж', 'GARAGE': 'Гараж'
};

/* ===================================================================================
   2. УТИЛИТЫ И ХЕЛПЕРЫ
   =================================================================================== */

const normalizeCategory = (rawCat) => CATEGORY_NORMALIZER[(rawCat || '').toUpperCase()] || rawCat || 'Квартира';

const getStrategiesForCategory = (category) => {
    const normCat = normalizeCategory(category);
    const valid = STRATEGY_DICTIONARY.filter(s => s.allowed.includes(normCat));
    return valid.length > 0 ? valid : STRATEGY_DICTIONARY; // Фолбэк, если категория неизвестна
};

const getFirstImage = (imagesUrls) => {
    if (!imagesUrls) return '/no-photo.png';
    try {
        const parsed = JSON.parse(imagesUrls);
        const rawImages = Array.isArray(parsed) ? parsed : [parsed];
        if (rawImages.length > 0) return rawImages[0].startsWith('/uploads') ? `${API_BASE_URL}${rawImages[0]}` : rawImages[0];
    } catch (e) {
        const rawImages = imagesUrls.replace(/[\[\]'"]/g, '').split(',').map(img => img.trim()).filter(Boolean);
        if (rawImages.length > 0) return rawImages[0].startsWith('/uploads') ? `${API_BASE_URL}${rawImages[0]}` : rawImages[0];
    }
    return '/no-photo.png';
};

const getAttribute = (obj, key) => {
    if (!obj.attributes) return '—';
    try {
        const parsed = JSON.parse(obj.attributes.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false'));
        return parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== "" ? parsed[key] : '—';
    } catch (e) { return '—'; }
};

const getNestedValue = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, obj);
};

// Функция имитирует InvestmentSmartDefaults.java для генерации красивых чисел в UI
const generateSmartDefaults = (object, strategyId, convertPriceFn) => {
    if (!object) return {};

    // Переводим цену в доллары для базовых расчетов (чтобы логика была универсальной)
    const priceUSD = convertPriceFn(object.priceTotal || 50000, object.currency, 'USD');
    const area = object.areaTotal || 50;
    const renovation = String(getAttribute(object, 'renovation_state')).toLowerCase();

    let repairCostUSD = 0;
    if (renovation.includes('чернов') || renovation.includes('без отдел')) {
        repairCostUSD = area * 300; // $300 за квадрат для черновой
    } else if (renovation.includes('требует') || renovation.includes('убитая')) {
        repairCostUSD = area * 200;
    } else if (renovation.includes('хорош') || renovation.includes('евро')) {
        repairCostUSD = area * 20; // Легкая косметика
    } else {
        repairCostUSD = area * 100; // Среднее значение
    }

    let furnitureCostUSD = 0;
    if (strategyId === 'SHORT_RENT') furnitureCostUSD = area * 150;
    else if (strategyId === 'LONG_RENT') furnitureCostUSD = area * 80;
    else if (strategyId === 'FLIP') furnitureCostUSD = area * 120;

    const defaults = {
        repairCost: Math.round(repairCostUSD),
        furnitureCost: Math.round(furnitureCostUSD),
        monthlyRent: Math.round(area * 12),
        dailyRate: Math.round(area * 1.5),
        expectedSalePrice: Math.round(priceUSD * 1.3), // +30% к цене
        constructionCost: Math.round(area * 800), // Для участков
    };

    return defaults;
};

/* ===================================================================================
   3. КАСТОМНЫЕ КОМПОНЕНТЫ (ПУЛЕНЕПРОБИВАЕМЫЕ ИНПУТЫ)
   =================================================================================== */

/**
 * Идеальный числовой инпут. 
 * Полностью блокирует скролл колесиком, предотвращает ввод 'e', '+', '-', 
 * и корректно обновляет state.
 */
const ProNumericInput = ({ label, value, onChange, min = 0, max, step = 1, placeholder, hint }) => {
    const handleWheel = (e) => {
        e.preventDefault();
        e.target.blur(); // Снимаем фокус при попытке крутить колесико
    };

    const handleKeyDown = (e) => {
        // Запрещаем ввод букв 'e', знаков плюса и минуса, если число должно быть положительным
        if (['e', 'E', '+', '-'].includes(e.key) && min >= 0) {
            e.preventDefault();
        }
    };

    return (
        <div className="setting-block">
            <label>{label}</label>
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                placeholder={placeholder}
                value={value === 0 && placeholder ? '' : value} // Если 0 и есть плейсхолдер - делаем пустым
                onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    onChange(val);
                }}
                onWheel={handleWheel}
                onKeyDown={handleKeyDown}
                className="pro-input"
            />
            {hint && <small className="input-hint">{hint}</small>}
        </div>
    );
};

/* ===================================================================================
   4. ГЛАВНЫЙ КОМПОНЕНТ
   =================================================================================== */

const ComparisonPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currency, setCurrency, convertPrice, formatPrice } = useCurrency();

    const ids = useMemo(() => searchParams.get('ids')?.split(',').slice(0, 4) || [], [searchParams]);

    // --- Стейты ---
    const [objects, setObjects] = useState([]);
    const [calculatedResults, setCalculatedResults] = useState({});
    const [loading, setLoading] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState('basic');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);
    const dropdownRef = useRef(null);

    // --- Определение категории и стратегий ---
    const rawCategoryParam = searchParams.get('category');
    const category = useMemo(() => {
        let cat = rawCategoryParam;
        if (objects.length > 0 && objects[0].category) {
            cat = objects[0].category;
        }
        return normalizeCategory(cat);
    }, [objects, rawCategoryParam]);

    const availableStrategies = useMemo(() => getStrategiesForCategory(category), [category]);

    // --- Модель инвестиционных параметров ---
    const [calcParams, setCalcParams] = useState({
        strategyId: '', // Установится динамически

        // Финансирование
        useMortgage: false,
        downPaymentPct: 30,
        mortgageRate: 12.5,
        mortgageTerm: 15,
        legalFeesPct: 2.0,

        // Глобальные суммы (будут заполнены SmartDefaults)
        repairCost: 0,
        furnitureCost: 0,
        monthlyRent: 0,
        dailyRate: 0,
        expectedSalePrice: 0,
        constructionCost: 0,

        // Риски и операционка
        vacancyRate: 5.0,
        occupancyRate: 65.0,
        cleaningCost: 0,
        platformFeePct: 15.0,
        flipDurationMonths: 6,
        agentFeePct: 3.0,
        buildSellDuration: 12,
        appreciationRate: 5.0,
        investmentHorizon: 10,
        maintenancePct: 1.0,
        utilityCost: 0,
        insuranceCost: 65.0,
        managementFeePct: 0.0,
        useLegalUSN: false
    });

    const user = useMemo(() => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
    }, []);

    // --- Эффекты загрузки ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/chats/unread-count')
                .then(res => setTotalUnread(res.data))
                .catch(err => console.error("Ошибка счетчика:", err));
        }
    }, []);

    useEffect(() => {
        const fetchObjects = async () => {
            try {
                const promises = ids.map(id => api.get(`/objects/${id}`));
                const results = await Promise.all(promises);
                setObjects(results.map(res => res.data));
            } catch (err) {
                setError('Не удалось загрузить объекты для сравнения.');
            } finally {
                setLoading(false);
            }
        };
        if (ids.length > 0) fetchObjects();
    }, [ids]);

    // --- SMART DEFAULTS ENGINE ---
    // Срабатывает один раз, когда объекты загружены
    useEffect(() => {
        if (objects.length > 0 && availableStrategies.length > 0 && calcParams.strategyId === '') {
            const initialStrategy = availableStrategies[0].id;

            // Имитируем логику бэкенда для заполнения оптимальных сумм!
            // Используем конвертер цен, чтобы суммы всегда были в базовой валюте для расчетов.
            const convertFn = (val, from, to) => convertPrice(val, from, to);
            const smartValues = generateSmartDefaults(objects[0], initialStrategy, convertFn);

            setCalcParams(prev => ({
                ...prev,
                strategyId: initialStrategy,
                ...smartValues
            }));
        }
    }, [objects, availableStrategies, calcParams.strategyId, convertPrice]);

    // Обработчик смены стратегии (перезапускает SmartDefaults под новую стратегию)
    const handleStrategyChange = (e) => {
        const newStrategy = e.target.value;
        const convertFn = (val, from, to) => convertPrice(val, from, to);
        const smartValues = generateSmartDefaults(objects[0] || null, newStrategy, convertFn);

        setCalcParams(prev => ({
            ...prev,
            strategyId: newStrategy,
            ...smartValues
        }));
    };

    const handleParamChange = (field, value) => {
        setCalcParams(prev => ({ ...prev, [field]: value }));
    };

    // --- РАСЧЕТЫ БЭКЕНДА ---
    const runCalculations = useCallback(async () => {
        if (objects.length === 0 || !calcParams.strategyId) return;
        setIsCalculating(true);
        try {
            const resultsMap = {};
            const promises = objects.map(obj => {
                const requestPayload = {
                    objectId: obj.id,
                    ...calcParams
                };
                return api.post('/investments/calculate', requestPayload);
            });
            const responses = await Promise.all(promises);
            responses.forEach((res, index) => {
                resultsMap[objects[index].id] = res.data;
            });
            setCalculatedResults(resultsMap);
        } catch (err) {
            console.error("Ошибка расчетов:", err);
        } finally {
            setIsCalculating(false);
        }
    }, [objects, calcParams]);

    useEffect(() => {
        const timer = setTimeout(runCalculations, 500); // Debounce
        return () => clearTimeout(timer);
    }, [runCalculations]);

    // --- ХЕЛПЕРЫ ТАБЛИЦЫ ---
    const parseNumericValue = (val) => {
        if (val === undefined || val === null || val === '—') return null;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            if (val.includes('∞')) return Infinity;
            if (val.includes('N/A') || val.trim() === '') return null;
            const cleanStr = val.replace(/[^\d.,-]/g, '').replace(',', '.');
            const num = parseFloat(cleanStr);
            return isNaN(num) ? null : num;
        }
        return null;
    };

    const getMetricClass = (metricPath, rawValue, allIds, isInverse = false) => {
        if (rawValue === undefined || rawValue === null || rawValue === '—') return '';
        const numericValues = allIds.map(id => {
            const val = getNestedValue(calculatedResults[id], metricPath);
            return parseNumericValue(val);
        }).filter(v => v !== null && !isNaN(v));

        if (numericValues.length < 2) return '';

        const max = Math.max(...numericValues);
        const min = Math.min(...numericValues);

        if (max === min) return '';

        const currentNum = parseNumericValue(rawValue);
        if (currentNum === null || isNaN(currentNum)) return '';

        if (isInverse) {
            if (currentNum === min) return 'pro-best-cell';
            if (currentNum === max) return 'pro-worst-cell';
        } else {
            if (currentNum === max) return 'pro-best-cell';
            if (currentNum === min) return 'pro-worst-cell';
        }
        return '';
    };

    const formatMetricValue = (val, type, objCurrency = 'USD') => {
        if (val === undefined || val === null) return '—';
        if (typeof val === 'string' && val.includes('∞')) return '∞ лет';
        if (typeof val === 'string' && isNaN(parseFloat(val))) return val;

        const num = parseNumericValue(val);
        if (num === null) return '—';

        if (!isFinite(num) || num > 9999) {
            if (type === 'years') return '∞ лет';
        }

        switch (type) {
            case 'currency':
                return formatPrice(convertPrice(num, objCurrency));
            case 'percent':
                return `${Number(num).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
            case 'number':
                return Number(num).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
            case 'years':
                return `${Number(num).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} лет`;
            default:
                return val;
        }
    };

    /* ===================================================================================
       5. КОНФИГУРАЦИЯ ТАБЛИЦЫ
       =================================================================================== */
    const tableSections = [
        {
            title: '💵 Капиталовложения (На старте)',
            metrics: [
                { key: 'totalPurchaseCost', label: 'Полная стоимость (с комиссиями)', type: 'currency', inverse: true },
                { key: 'legalFees', label: 'Оформление и комиссии', type: 'currency', inverse: true },
                { key: 'totalRenovation', label: 'Ремонт и меблировка', type: 'currency', inverse: true },
                { key: 'totalOwnFunds', label: 'Вложено своих средств (Кеш)', type: 'currency', inverse: true },
            ]
        },
        {
            title: '🏦 Ипотека и Финансирование',
            condition: () => calcParams.useMortgage,
            metrics: [
                { key: 'mortgageInfo.loanAmount', label: 'Сумма кредита (Тело)', type: 'currency', inverse: true },
                { key: 'mortgageInfo.downPayment', label: 'Первоначальный взнос', type: 'currency', inverse: true },
                { key: 'mortgageInfo.monthlyPayment', label: 'Ежемесячный платеж', type: 'currency', inverse: true },
                { key: 'mortgageInfo.totalInterest', label: 'Переплата по процентам (за весь срок)', type: 'currency', inverse: true },
            ]
        },
        {
            title: '📈 Денежный поток (Доходы)',
            condition: () => ['LONG_RENT', 'SHORT_RENT', 'BUY_HOLD'].includes(calcParams.strategyId),
            metrics: [
                { key: 'grossAnnualIncome', label: 'Валовый доход (в год)', type: 'currency', inverse: false },
                { key: 'effectiveGrossIncome', label: 'Эффективный доход (с учетом простоя)', type: 'currency', inverse: false },
                { key: 'noi', label: 'NOI (Чистый операционный доход)', type: 'currency', inverse: false },
                { key: 'monthlyCashFlow', label: 'Cash Flow (Чистыми в месяц)', type: 'currency', inverse: false },
                { key: 'annualCashFlow', label: 'Cash Flow (Чистыми в год)', type: 'currency', inverse: false },
            ]
        },
        {
            title: '🎯 Ключевые показатели доходности',
            metrics: [
                { key: 'capRate', label: 'Cap Rate (Ставка капитализации)', type: 'percent', inverse: false },
                { key: 'cashOnCash', label: 'Cash-on-Cash Return (CoC)', type: 'percent', inverse: false },
                { key: 'annualizedROI', label: 'Среднегодовая доходность (ROI)', type: 'percent', inverse: false },
                { key: 'roi', label: 'Общий ROI', type: 'percent', inverse: false },
            ]
        },
        {
            title: '⚖️ Оценка рисков и Стабильность',
            metrics: [
                { key: 'paybackYears', label: 'Срок окупаемости (лет)', type: 'years', inverse: true },
                { key: 'breakEvenOccupancy', label: 'Точка безубыточности (Загрузка)', type: 'percent', inverse: true, condition: () => ['LONG_RENT', 'SHORT_RENT'].includes(calcParams.strategyId) },
                { key: 'grm', label: 'GRM (Вал. рентный мультипликатор)', type: 'number', inverse: true, condition: () => ['LONG_RENT', 'SHORT_RENT'].includes(calcParams.strategyId) },
                { key: 'dscr', label: 'DSCR (Коэфф. покрытия долга)', type: 'number', inverse: false, condition: () => calcParams.useMortgage },
            ]
        },
        {
            title: '📉 Операционные расходы и Налоги (в год)',
            metrics: [
                { key: 'totalOperatingExpenses', label: 'Операционные расходы (Всего)', type: 'currency', inverse: true },
                { key: 'annualMaintenance', label: 'Амортизация и Обслуживание', type: 'currency', inverse: true },
                { key: 'annualManagement', label: 'Управляющая компания (УК)', type: 'currency', inverse: true },
                { key: 'totalAnnualTax', label: 'Налоги', type: 'currency', inverse: true },
                { key: 'annualDebtService', label: 'Обслуживание долга (Ипотека/год)', type: 'currency', inverse: true, condition: () => calcParams.useMortgage },
            ]
        },
        {
            title: `🚀 Прогноз на горизонт (${calcParams.investmentHorizon || calcParams.flipDurationMonths} мес/лет)`,
            metrics: [
                { key: 'futurePropertyValue', label: 'Ожидаемая стоимость при продаже', type: 'currency', inverse: false },
                { key: 'capitalGain', label: 'Прирост капитала (Capital Gain)', type: 'currency', inverse: false },
                { key: 'totalCashFlowOverHorizon', label: 'Суммарный Cash Flow за период', type: 'currency', inverse: false, condition: () => !['FLIP', 'BUILD_SELL'].includes(calcParams.strategyId) },
                { key: 'totalProfit', label: 'Полная чистая прибыль (Net Profit)', type: 'currency', inverse: false },
            ]
        }
    ];

    if (loading) return <div className="compare-loader"><div className="spinner"></div>Загрузка аналитики...</div>;
    if (error) return <div className="error-message">{error}</div>;

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };
    /* ===================================================================================
       6. РЕНДЕР
       =================================================================================== */
    return (
        <div className="compare-page-wrapper">
            {/* --- ХЕДЕР --- */}
            <header className="home-header">
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    💎 InvestHub
                </div>

                <div className="header-actions">
                    {/* Этот блок .currency-selector теперь будет выглядеть как на главной */}
                    <div className="currency-selector">
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                            <option value="USD">USD ($)</option>
                            <option value="BYN">BYN (Br)</option>
                        </select>
                    </div>

                    <div className="user-profile-container" ref={dropdownRef}>
                        {user ? (
                            <>
                                <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                                    <div className="user-nickname">{user.name}</div>
                                    <div className="avatar-circle">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    </div>
                                    {totalUnread > 0 && <span className="unread-dot"></span>}
                                </div>

                                {isMenuOpen && (
                                    <div className="user-dropdown-menu">
                                        <div className="dropdown-header">
                                            <p className="d-name">{user.name}</p>
                                            <p className="d-email">{user.email}</p>
                                            <p className="d-role">{user.role}</p>
                                        </div>
                                        <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/portfolio'); }}>
                                            Мой портфель
                                        </button>
                                        <button className="dropdown-item chats-item" onClick={() => { setIsMenuOpen(false); navigate('/chats'); }}>
                                            <span>Чаты</span>
                                            {totalUnread > 0 && <span className="menu-badge">{totalUnread}</span>}
                                        </button>
                                        <button className="dropdown-item logout" onClick={handleLogout}>
                                            Выйти
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <button className="login-btn" onClick={() => navigate('/login')}>Войти</button>
                        )}
                    </div>
                </div>
            </header>

            <div className="compare-page-content">
                {/* --- НАВИГАЦИЯ И ЗАГОЛОВОК --- */}
                <div className="compare-title-row">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        Назад
                    </button>
                    <h1>Сравнение: <span className="category-highlight">{category}</span></h1>
                </div>

                {/* --- ПРО-ПАНЕЛЬ НАСТРОЕК --- */}
                <div className="pro-panel">
                    <div className="panel-header">
                        <h2>⚙️ Параметры инвестиционной модели</h2>
                        {isCalculating && <span className="calculating-badge">🔄 Идет пересчет...</span>}
                    </div>

                    <div className="pro-panel-tabs">
                        <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')}>Базовые</button>
                        <button className={activeTab === 'financing' ? 'active' : ''} onClick={() => setActiveTab('financing')}>Финансирование</button>
                        <button className={activeTab === 'strategy' ? 'active' : ''} onClick={() => setActiveTab('strategy')}>Специфика стратегии</button>
                        <button className={activeTab === 'taxes' ? 'active' : ''} onClick={() => setActiveTab('taxes')}>Риски и Налоги</button>
                    </div>

                    <div className="pro-panel-content">
                        {activeTab === 'basic' && (
                            <div className="settings-grid">
                                <div className="setting-block">
                                    <label>Стратегия инвестирования</label>
                                    <select value={calcParams.strategyId} onChange={handleStrategyChange} className="pro-input">
                                        {availableStrategies.map(str => (
                                            <option key={str.id} value={str.id}>{str.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <ProNumericInput
                                    label="Горизонт инвестирования (лет)"
                                    value={calcParams.investmentHorizon}
                                    onChange={v => handleParamChange('investmentHorizon', v)}
                                    min={1} max={50}
                                />
                                <ProNumericInput
                                    label="Ремонт (USD)"
                                    value={calcParams.repairCost}
                                    onChange={v => handleParamChange('repairCost', v)}
                                    hint="Оптимальная сумма рассчитана автоматически"
                                />
                                <ProNumericInput
                                    label="Мебель (USD)"
                                    value={calcParams.furnitureCost}
                                    onChange={v => handleParamChange('furnitureCost', v)}
                                    hint="Оптимальная сумма рассчитана автоматически"
                                />
                            </div>
                        )}

                        {activeTab === 'financing' && (
                            <div className="settings-grid mortgage-grid">
                                <div className="setting-block full-width-toggle">
                                    <label className="mortgage-toggle-label">
                                        <input type="checkbox" checked={calcParams.useMortgage} onChange={e => handleParamChange('useMortgage', e.target.checked)} />
                                        <span className="toggle-slider"></span>
                                        Использовать кредитное плечо (Ипотека)
                                    </label>
                                </div>
                                {calcParams.useMortgage && (
                                    <>
                                        <ProNumericInput label="Первоначальный взнос (%)" value={calcParams.downPaymentPct} onChange={v => handleParamChange('downPaymentPct', v)} min={0} max={100} />
                                        <ProNumericInput label="Ставка по кредиту (% годовых)" value={calcParams.mortgageRate} onChange={v => handleParamChange('mortgageRate', v)} step={0.1} />
                                        <ProNumericInput label="Срок кредита (лет)" value={calcParams.mortgageTerm} onChange={v => handleParamChange('mortgageTerm', v)} min={1} max={50} />
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'strategy' && (
                            <div className="settings-grid advanced-grid">
                                {calcParams.strategyId === 'FLIP' && (
                                    <>
                                        <ProNumericInput label="Ожидаемая цена продажи (USD)" value={calcParams.expectedSalePrice} onChange={v => handleParamChange('expectedSalePrice', v)} step={1000} hint="Оптимальная сумма рассчитана автоматически" />
                                        <ProNumericInput label="Срок реализации проекта (мес)" value={calcParams.flipDurationMonths} onChange={v => handleParamChange('flipDurationMonths', v)} min={1} max={36} />
                                        <ProNumericInput label="Комиссия агента при продаже (%)" value={calcParams.agentFeePct} onChange={v => handleParamChange('agentFeePct', v)} step={0.5} />
                                    </>
                                )}
                                {calcParams.strategyId === 'SHORT_RENT' && (
                                    <>
                                        <ProNumericInput label="Ставка за сутки (USD)" value={calcParams.dailyRate} onChange={v => handleParamChange('dailyRate', v)} step={5} hint="Оптимальная сумма рассчитана автоматически" />
                                        <ProNumericInput label="Ожидаемая загрузка в месяц (%)" value={calcParams.occupancyRate} onChange={v => handleParamChange('occupancyRate', v)} min={10} max={100} />
                                        <ProNumericInput label="Комиссия платформ (%)" value={calcParams.platformFeePct} onChange={v => handleParamChange('platformFeePct', v)} />
                                    </>
                                )}
                                {calcParams.strategyId === 'LONG_RENT' && (
                                    <>
                                        <ProNumericInput label="Ставка аренды в мес. (USD)" value={calcParams.monthlyRent} onChange={v => handleParamChange('monthlyRent', v)} step={10} hint="Оптимальная сумма рассчитана автоматически" />
                                        <ProNumericInput label="Простой объекта (Vacancy) %" value={calcParams.vacancyRate} onChange={v => handleParamChange('vacancyRate', v)} step={0.5} />
                                    </>
                                )}
                                {calcParams.strategyId === 'BUY_HOLD' && (
                                    <ProNumericInput label="Рост стоимости объекта в год (%)" value={calcParams.appreciationRate} onChange={v => handleParamChange('appreciationRate', v)} step={0.5} />
                                )}
                            </div>
                        )}

                        {activeTab === 'taxes' && (
                            <div className="settings-grid taxes-grid">
                                <ProNumericInput label="Оформление сделки (%)" value={calcParams.legalFeesPct} onChange={v => handleParamChange('legalFeesPct', v)} step={0.1} />
                                <ProNumericInput label="Комиссия УК от дохода (%)" value={calcParams.managementFeePct} onChange={v => handleParamChange('managementFeePct', v)} />
                                <ProNumericInput label="Амортизация (% от стоимости/год)" value={calcParams.maintenancePct} onChange={v => handleParamChange('maintenancePct', v)} step={0.1} />

                                <div className="setting-block full-width-toggle" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                                    <label className="mortgage-toggle-label">
                                        <input type="checkbox" checked={calcParams.useLegalUSN} onChange={e => handleParamChange('useLegalUSN', e.target.checked)} />
                                        <span className="toggle-slider"></span>
                                        Налогообложение Юр. Лица (УСН) вместо Физ. Лица (НДФЛ)
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- ТАБЛИЦА РЕЗУЛЬТАТОВ --- */}
                <div className="pro-table-container">
                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th className="sticky-col sticky-header feature-header">
                                    <div className="header-label">Сравниваемые объекты</div>
                                    <div className="header-sublabel">Зеленый - лучший показатель<br />Красный - худший</div>
                                </th>
                                {objects.map(obj => (
                                    <th key={obj.id} className="sticky-header obj-header">
                                        <div className="compare-obj-card" onClick={() => navigate(`/object/${obj.id}`)}>
                                            <div className="img-wrapper">
                                                <img src={getFirstImage(obj.imagesUrls)} alt={obj.title} onError={(e) => { e.target.src = '/no-photo.png'; }} />
                                                <span className="price-tag">{formatPrice(convertPrice(obj.priceTotal, obj.currency))}</span>
                                            </div>
                                            <span className="obj-title" title={obj.title}>{obj.title}</span>
                                            <span className="obj-subtitle">{obj.address || obj.category}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="section-header"><td colSpan={objects.length + 1}>🏠 Базовые характеристики</td></tr>
                            <tr>
                                <td className="sticky-col row-label">Площадь</td>
                                {objects.map(obj => <td key={obj.id} className="basic-val">{obj.areaTotal ? `${obj.areaTotal} м²` : '—'}</td>)}
                            </tr>
                            <tr>
                                <td className="sticky-col row-label">Цена за м²</td>
                                {objects.map(obj => <td key={obj.id} className="basic-val">{obj.areaTotal ? `${formatPrice(convertPrice(obj.priceTotal / obj.areaTotal, obj.currency))} / м²` : '—'}</td>)}
                            </tr>
                            <tr>
                                <td className="sticky-col row-label">Этаж</td>
                                {objects.map(obj => <td key={obj.id} className="basic-val">{obj.floor || '-'} / {obj.floorsTotal || '-'}</td>)}
                            </tr>
                            <tr>
                                <td className="sticky-col row-label">Состояние ремонта</td>
                                {objects.map(obj => <td key={obj.id} className="basic-val">{getAttribute(obj, 'renovation_state')}</td>)}
                            </tr>

                            {tableSections.map((section, sIdx) => {
                                if (section.condition && !section.condition()) return null;
                                return (
                                    <React.Fragment key={`section-${sIdx}`}>
                                        <tr className="section-header"><td colSpan={objects.length + 1}>{section.title}</td></tr>
                                        {section.metrics.map(metric => {
                                            if (metric.condition && !metric.condition()) return null;
                                            return (
                                                <tr key={metric.key} className="data-row">
                                                    <td className="sticky-col row-label">{metric.label}</td>
                                                    {objects.map(obj => {
                                                        const resultObj = calculatedResults[obj.id];
                                                        const rawValue = getNestedValue(resultObj, metric.key);
                                                        const cellClass = getMetricClass(metric.key, rawValue, ids, metric.inverse);
                                                        return (
                                                            <td key={`${obj.id}-${metric.key}`} className={`metric-cell ${cellClass}`}>
                                                                <span className="metric-content">
                                                                    {formatMetricValue(rawValue, metric.type, obj.currency)}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ComparisonPage;