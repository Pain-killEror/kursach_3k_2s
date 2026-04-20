import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
import './PortfolioItemDetails.css';
import './Home.css';

const categoryMap = {
    PURCHASE: 'Покупка объекта',
    MATERIALS: 'Материалы',
    LABOR: 'Рабочие / Услуги',
    TAX: 'Налоги / Сборы',
    UTILITIES: 'Коммуналка',
    RENT_INCOME: 'Доход от аренды',
    SALE_PROCEEDS: 'Выручка от продажи',
    OTHER: 'Прочее'
};

const MonthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Склонение слова "операция" (1 операция, 2 операции, 5 операций)
const declOfNum = (number, titles) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
};

const PortfolioItemDetails = () => {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const { currency, setCurrency, convertPrice } = useCurrency();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);
    const dropdownRef = useRef(null);

    const user = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('user')) || null; }
        catch (e) { return null; }
    }, []);

    const currentRealDate = new Date();
    const currentYearStr = currentRealDate.getFullYear().toString();
    const currentMonthStr = (currentRealDate.getMonth() + 1).toString();

    const [expandedYears, setExpandedYears] = useState({ [currentYearStr]: true });
    const [expandedMonths, setExpandedMonths] = useState({ [`${currentYearStr}-${currentMonthStr}`]: true });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/chats/unread-count')
                .then(res => setTotalUnread(res.data))
                .catch(err => console.error("Ошибка загрузки счетчика:", err));
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const todayDateString = currentRealDate.toISOString().split('T')[0];

    const [transaction, setTransaction] = useState({
        title: '', amount: '', currency: currency || 'USD', type: 'EXPENSE', category: 'MATERIALS', transactionDate: todayDateString
    });

    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [settings, setSettings] = useState({ strategyName: '', targetAmount: '', exitTaxRate: 0 });

    useEffect(() => { loadData(); }, [itemId]);

    const loadData = async () => {
        try {
            const res = await api.get(`/portfolio/items/${itemId}/summary`);
            setSummary(res.data);
            setSettings({
                strategyName: res.data.strategyName || '',
                targetAmount: res.data.targetAmount || '',
                exitTaxRate: res.data.exitTaxRate || 0
            });
        } catch (err) { console.error("Ошибка загрузки данных", err); }
        finally { setLoading(false); }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            if (!itemId) return;
            const dataToSend = {
                title: transaction.title, amount: parseFloat(transaction.amount), currency: transaction.currency,
                type: transaction.type, category: transaction.category, transactionDate: transaction.transactionDate
            };
            await api.post(`/portfolio/transactions?itemId=${itemId}`, dataToSend);
            setTransaction({ ...transaction, title: '', amount: '' });
            loadData();
        } catch (err) { alert("Не удалось добавить операцию."); }
    };

    const saveSettings = async () => {
        try {
            await api.put(`/portfolio/items/${itemId}/settings`, settings);
            setIsEditingSettings(false);
            loadData();
        } catch (err) { alert("Ошибка при сохранении настроек"); }
    };

    // ==========================================
    // ЛОГИКА И СТАТИСТИКА РОЛЕЙ
    // ==========================================
    const stats = useMemo(() => {
        if (!summary) return { balance: 0, income: 0, expense: 0, isTenant: false, isSold: false, isRentStrategy: false };

        const strategyLower = (summary.strategyName || '').toLowerCase();
        const isRentStrategy = strategyLower.includes('аренд');
        const isTenant = isRentStrategy && summary.role === 'TENANT';

        let income = 0;
        let expense = 0;
        let hasSaleMarker = false;
        let hasPurchaseTransaction = false;

        (summary.transactions || []).forEach(tx => {
            const txText = tx.description || tx.title || '';
            const isRentMarker = txText.startsWith('🔵');

            // Если есть факт продажи в истории, фиксируем
            if (txText.startsWith('🟢') || tx.category === 'SALE_PROCEEDS') {
                hasSaleMarker = true;
            }
            if (tx.category === 'PURCHASE') {
                hasPurchaseTransaction = true;
            }

            // В баланс идут реальные деньги (и Покупки, и Продажи, и ручные траты)
            if (!isRentMarker) {
                if (tx.type === 'INCOME') income += Number(tx.amount || 0);
                if (tx.type === 'EXPENSE') expense += Number(tx.amount || 0);
            }
        });

        // Усиленная проверка: если статус 'SOLD' в любом из полей бэка, либо есть транзакция продажи
        const isSold = summary.status === 'SOLD' || summary.objectStatus === 'SOLD' || hasSaleMarker;

        // ВАЖНО: Дублируем цену покупки в Расходы (если человек купил, и бэкенд не прислал это как транзакцию)
        if (!isTenant && !isSold && summary.purchasePrice && Number(summary.purchasePrice) > 0 && !hasPurchaseTransaction) {
            expense += Number(summary.purchasePrice);
        }

        return {
            balance: income - expense,
            income,
            expense,
            isTenant,
            isSold,
            isRentStrategy
        };
    }, [summary]);

    // Сортировка транзакций для Истории
    const sortedAndGroupedTransactions = useMemo(() => {
        if (!summary || !summary.transactions) return [];
        const sorted = [...summary.transactions].sort((a, b) => {
            const dateA = new Date(a.transactionDate).getTime();
            const dateB = new Date(b.transactionDate).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        });

        const grouped = [];
        let lastDate = null;
        sorted.forEach(t => {
            const datePart = t.transactionDate ? t.transactionDate.split('T')[0] : '';
            if (datePart !== lastDate) {
                grouped.push({ type: 'date_separator', date: datePart, id: `sep-${datePart}` });
                lastDate = datePart;
            }
            grouped.push({ type: 'transaction', ...t });
        });
        return grouped;
    }, [summary]);

    // ==========================================
    // СВОДКА ПО ПЕРИОДАМ (Таблица)
    // ==========================================
    const hierarchicalData = useMemo(() => {
        if (!summary) return [];
        const tree = {};

        const addRecord = (dateStr, amount, currencyParam, type, category, txText) => {
            if (!dateStr) return;
            const parts = dateStr.split('-');
            if (parts.length !== 3) return;

            const y = parts[0];
            const m = parseInt(parts[1], 10).toString();
            const d = parseInt(parts[2], 10).toString();

            const isRentMarker = txText.startsWith('🔵');
            const isSaleMarker = txText.startsWith('🟢');

            const val = (isRentMarker || isSaleMarker) ? 0 : (convertPrice ? convertPrice(Number(amount), currencyParam || 'USD') : Number(amount));
            const isIncome = type === 'INCOME';

            if (!tree[y]) tree[y] = { year: y, income: 0, expense: 0, net: 0, months: {} };
            if (!tree[y].months[m]) tree[y].months[m] = { month: m, income: 0, expense: 0, net: 0, days: {} };
            if (!tree[y].months[m].days[d]) {
                tree[y].months[m].days[d] = {
                    day: d, income: 0, expense: 0, net: 0, count: 0,
                    hasPurchase: false, hasSale: false, hasRentStart: false
                };
            }

            tree[y].income += isIncome ? val : 0;
            tree[y].expense += isIncome ? 0 : val;
            tree[y].months[m].income += isIncome ? val : 0;
            tree[y].months[m].expense += isIncome ? 0 : val;
            tree[y].months[m].days[d].income += isIncome ? val : 0;
            tree[y].months[m].days[d].expense += isIncome ? 0 : val;

            if (!isRentMarker && !isSaleMarker) tree[y].months[m].days[d].count += 1;

            if (category === 'PURCHASE') tree[y].months[m].days[d].hasPurchase = true;
            if (isSaleMarker || category === 'SALE_PROCEEDS') tree[y].months[m].days[d].hasSale = true;
            if (isRentMarker) tree[y].months[m].days[d].hasRentStart = true;
        };

        // ВАЖНО: Добавляем виртуальную запись о покупке, чтобы таблица отображалась сразу со старта
        const hasPurchaseTransaction = (summary.transactions || []).some(tx => tx.category === 'PURCHASE');
        if (!stats.isTenant && !stats.isSold && summary.purchasePrice && Number(summary.purchasePrice) > 0 && !hasPurchaseTransaction) {
            const pDate = (summary.purchaseDate || summary.createdAt || new Date().toISOString()).split('T')[0];
            addRecord(pDate, summary.purchasePrice, 'USD', 'EXPENSE', 'PURCHASE', 'Покупка объекта');
        }

        if (summary.transactions) {
            summary.transactions.forEach(tx => {
                const txText = tx.description || tx.title || '';
                const dateStr = tx.transactionDate ? tx.transactionDate.split('T')[0] : '';
                addRecord(dateStr, tx.amount, tx.currency || 'USD', tx.type, tx.category, txText);
            });
        }

        return Object.values(tree).map(yData => {
            yData.net = yData.income - yData.expense;
            yData.months = Object.values(yData.months).map(mData => {
                mData.net = mData.income - mData.expense;
                mData.days = Object.values(mData.days).map(dData => {
                    dData.net = dData.income - dData.expense;
                    return dData;
                }).sort((a, b) => Number(b.day) - Number(a.day));
                return mData;
            }).sort((a, b) => Number(b.month) - Number(a.month));
            return yData;
        }).sort((a, b) => Number(b.year) - Number(a.year));
    }, [summary, convertPrice, currency, stats]);

    const toggleYear = (y) => setExpandedYears(prev => ({ ...prev, [y]: !prev[y] }));
    const toggleMonth = (y, m) => setExpandedMonths(prev => ({ ...prev, [`${y}-${m}`]: !prev[`${y}-${m}`] }));

    const formatDateSeparator = (dateString) => {
        const todayDate = new Date();
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const today = todayDate.toISOString().split('T')[0];
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        if (dateString === today) return 'Сегодня';
        if (dateString === yesterday) return 'Вчера';
        const parts = dateString.split('-');
        if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
        return dateString;
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatPrice = (amount) => {
        const val = Number(amount) || 0;
        const converted = convertPrice ? convertPrice(val, 'USD') : val;
        const symbol = currency === 'BYN' ? 'Br' : '$';
        return `${converted.toLocaleString()} ${symbol}`;
    };

    // ==========================================
    // МАТЕМАТИКА ЭКОНОМИКИ
    // ==========================================
    // Так как stats.expense теперь включает в себя цену покупки (для покупателя), 
    // используем её напрямую или добавляем базу только если продан
    const basePrice = Number(summary?.purchasePrice || 0);
    const totalInvestedForCalc = stats.isSold ? (basePrice + stats.expense) : stats.expense;

    const taxAmount = ((settings.targetAmount || 0) * (summary?.exitTaxRate || 0)) / 100;
    const netDebtSale = totalInvestedForCalc - stats.income;
    const expectedProfitSale = (settings.targetAmount || 0) - taxAmount - totalInvestedForCalc + stats.income;
    const taxRateMult = 1 - ((summary?.exitTaxRate || 0) / 100);
    const breakEvenPriceSale = taxRateMult > 0 ? (netDebtSale > 0 ? (netDebtSale / taxRateMult) : 0) : 0;

    const targetMonthlyRent = Number(settings.targetAmount || 0);
    const monthsToBreakEven = targetMonthlyRent > 0 ? (netDebtSale > 0 ? (netDebtSale / targetMonthlyRent) : 0) : 0;

    const getCostLabel = () => {
        if (stats.isSold) return 'Продано за';
        if (stats.isTenant) return 'Оценка объекта';
        return 'Куплено за';
    };

    const displayCostValue = stats.isSold && stats.income > 0 ? stats.income : summary?.purchasePrice;

    if (loading) return <div className="p-loader">Загрузка аналитики...</div>;
    if (!summary) return <div>Объект не найден</div>;

    return (
        <div className="portfolio-page">
            <header className="home-header">
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>💎 InvestHub</div>
                <div className="currency-selector" style={{ marginLeft: 'auto', marginRight: '15px' }}>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #444', background: '#1a1a1a', color: 'white', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                        <option value="USD">USD ($)</option>
                        <option value="BYN">BYN (Br)</option>
                    </select>
                </div>
                <div className="user-profile-container" ref={dropdownRef}>
                    <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <span className="user-nickname">{user?.name || 'Гость'}</span>
                        <div className="avatar-circle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        {totalUnread > 0 && <span className="unread-dot"></span>}
                    </div>
                    {isMenuOpen && (
                        <div className="user-dropdown-menu">
                            <div className="dropdown-header">
                                <p className="d-name">{user?.name}</p>
                                <p className="d-email">{user?.email}</p>
                            </div>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/portfolio'); }}>Мой портфель</button>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/chats'); }}>Чаты {totalUnread > 0 && <span className="menu-badge">{totalUnread}</span>}</button>
                            <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="dropdown-item logout">Выйти</button>
                        </div>
                    )}
                </div>
            </header>

            <main className="portfolio-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '5px 20px' }}>
                <div className="portfolio-navigation" style={{ marginBottom: '15px', marginTop: '0' }}>
                    <button className="btn-back" onClick={() => navigate('/portfolio')} style={{ background: '#2c2c2e', padding: '8px 16px', borderRadius: '10px', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        ← К списку объектов
                    </button>
                </div>

                <div className="portfolio-summary-banner details-banner" style={{ marginBottom: '25px' }}>
                    <div className="summary-content">
                        <span className="category-tag" style={{ background: stats.isSold ? '#30d158' : '#007aff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                            {stats.isSold ? 'Продано' : (summary.objectCategory || 'Объект')}
                        </span>
                        <h1 style={{ marginTop: '10px', marginBottom: '5px' }}>{summary.objectTitle || 'Аналитика объекта'}</h1>
                        <p style={{ color: '#8e8e93', margin: 0 }}>{summary.objectAddress || 'Адрес не указан'}</p>
                    </div>
                </div>

                <div className="details-grid">
                    <div className="analysis-section">
                        <div className="card-glass summary-card">
                            <h3 className="card-title">Финансовый результат</h3>
                            <div className="big-balance-wrapper" style={{ margin: '20px 0' }}>
                                <span className={`big-balance-value ${stats.balance >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '36px', fontWeight: '800' }}>
                                    {stats.balance > 0 ? '+' : ''}{formatPrice(stats.balance)}
                                </span>
                            </div>

                            <div className="stats-mini-row" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                <div className="stat-item" style={{ textAlign: 'left' }}>
                                    <span style={{ color: '#8e8e93', fontSize: '14px', display: 'block' }}>
                                        {getCostLabel()}
                                    </span>
                                    <span style={{ fontWeight: 'bold' }}>{formatPrice(displayCostValue)}</span>
                                </div>
                                <div className="stat-item" style={{ textAlign: 'center' }}>
                                    <span style={{ color: '#8e8e93', fontSize: '14px', display: 'block' }}>
                                        {stats.isTenant ? 'Мои траты (аренда)' : 'Расходы'}
                                    </span>
                                    <span style={{ fontWeight: 'bold', color: '#ff453a' }}>{formatPrice(stats.expense)}</span>
                                </div>
                                <div className="stat-item" style={{ textAlign: 'right' }}>
                                    <span style={{ color: '#8e8e93', fontSize: '14px', display: 'block' }}>Доход</span>
                                    <span style={{ fontWeight: 'bold', color: '#32d74b' }}>{formatPrice(stats.income)}</span>
                                </div>
                            </div>
                        </div>

                        {/* СКРЫВАЕМ БЛОКИ СТРАТЕГИИ И ЭКОНОМИКИ ЕСЛИ ОБЪЕКТ ПРОДАН ИЛИ ПОЛЬЗОВАТЕЛЬ АРЕНДАТОР */}
                        {(!stats.isSold && !stats.isTenant) && (
                            <>
                                <div className="card-glass economy-card" style={{ marginTop: '20px' }}>
                                    {stats.isRentStrategy ? (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                <h3 className="card-title" style={{ margin: 0 }}>📈 Расчет окупаемости аренды</h3>
                                            </div>
                                            <p style={{ color: '#a1a1aa', fontSize: '12px', margin: '0 0 15px 0', lineHeight: '1.4' }}>
                                                Расчет срока окупаемости вложенных в объект средств (включая покупку и ремонт) при указанной целевой ставке за месяц.
                                            </p>

                                            {targetMonthlyRent > 0 ? (
                                                <div className="calculation-breakdown" style={{ background: '#1c1c1e', padding: '15px', borderRadius: '10px', border: '1px solid #333' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                                                        <span style={{ color: '#fff' }}>🎯 Целевая цена за месяц</span>
                                                        <span style={{ fontWeight: 'bold', color: '#32d74b' }}>{formatPrice(targetMonthlyRent)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: '#ff453a' }}>
                                                        <span>💰 Суммарные вложения (минус доходы)</span>
                                                        <span>{formatPrice(netDebtSale > 0 ? netDebtSale : 0)}</span>
                                                    </div>
                                                    <div style={{ borderTop: '1px dashed #444', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                                                        <span style={{ color: '#fff' }}>⏳ Срок окупаемости</span>
                                                        <span style={{ color: '#32ade6' }}>
                                                            {monthsToBreakEven > 0 ? `${Math.ceil(monthsToBreakEven)} мес.` : 'Уже окупилось!'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '15px', background: '#2c2c2e', borderRadius: '10px', color: '#8e8e93', fontSize: '13px' }}>
                                                    Установите "Целевую цену за месяц" ниже, чтобы увидеть расчет окупаемости.
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                <h3 className="card-title" style={{ margin: 0 }}>⚖️ Расчет прибыли и налогов</h3>
                                                <div style={{ background: '#2c2c2e', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #444' }}>
                                                    <span style={{ color: '#8e8e93' }}>Ставка:</span> <span style={{ color: '#32ade6', fontWeight: 'bold' }}>{summary.exitTaxRate}%</span>
                                                </div>
                                            </div>

                                            <p style={{ color: '#a1a1aa', fontSize: '12px', margin: '0 0 15px 0', lineHeight: '1.4' }}>
                                                Расчет для вашей Целевой цены продажи с учетом стоимости объекта и всех расходов.
                                            </p>

                                            {settings.targetAmount > 0 ? (
                                                <div className="calculation-breakdown" style={{ background: '#1c1c1e', padding: '15px', borderRadius: '10px', border: '1px solid #333' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                                                        <span style={{ color: '#fff' }}>🎯 Целевая цена продажи</span>
                                                        <span style={{ fontWeight: 'bold' }}>{formatPrice(settings.targetAmount)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#ff453a' }}>
                                                        <span>🏛 Налог с продажи ({summary.exitTaxRate}%)</span>
                                                        <span>- {formatPrice(taxAmount)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: '#ff9f0a' }}>
                                                        <span>💰 Возврат вложений (цена + расходы)</span>
                                                        <span>- {formatPrice(netDebtSale > 0 ? netDebtSale : 0)}</span>
                                                    </div>
                                                    <div style={{ borderTop: '1px dashed #444', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                                                        <span style={{ color: '#fff' }}>✨ Чистая прибыль</span>
                                                        <span className={expectedProfitSale >= 0 ? 'positive' : 'negative'}>
                                                            {expectedProfitSale >= 0 ? '+' : ''}{formatPrice(expectedProfitSale)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center', padding: '15px', background: '#2c2c2e', borderRadius: '10px', color: '#8e8e93', fontSize: '13px' }}>
                                                    Установите "Целевую цену продажи" ниже, чтобы увидеть полный расчет экономики.
                                                </div>
                                            )}

                                            <div style={{ marginTop: '15px', background: 'rgba(255, 159, 10, 0.1)', borderLeft: '3px solid #ff9f0a', padding: '10px 15px', borderRadius: '0 8px 8px 0' }}>
                                                <div style={{ fontSize: '13px', color: '#ff9f0a', fontWeight: '600', marginBottom: '4px' }}>Точка безубыточности: {formatPrice(breakEvenPriceSale)}</div>
                                                <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Минимальная цена продажи, чтобы после уплаты налога ({summary.exitTaxRate}%) отбить стоимость объекта и все расходов.</div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="card-glass settings-card" style={{ marginTop: '20px' }}>
                                    <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 className="card-title" style={{ margin: 0 }}>Стратегия и цель</h3>
                                        <button className="btn-edit-small" onClick={() => isEditingSettings ? saveSettings() : setIsEditingSettings(true)} style={{ background: '#3a3a3c', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                                            {isEditingSettings ? 'Сохранить' : 'Изменить'}
                                        </button>
                                    </div>
                                    {isEditingSettings ? (
                                        <div className="edit-settings-form">
                                            <input className="dark-input" value={settings.strategyName} onChange={e => setSettings({ ...settings, strategyName: e.target.value })} placeholder="Название стратегии" style={{ width: '100%', marginBottom: '10px' }} />
                                            <input className="dark-input" type="number" value={settings.targetAmount} onChange={e => setSettings({ ...settings, targetAmount: e.target.value })} placeholder={stats.isRentStrategy ? "Целевая цена за месяц" : "Целевая цена продажи"} style={{ width: '100%' }} />
                                        </div>
                                    ) : (
                                        <div className="view-settings">
                                            <p style={{ margin: '0 0 5px 0', fontSize: '15px' }}><strong>{summary.strategyName || 'Не установлена'}</strong></p>
                                            <p style={{ margin: 0, color: '#8e8e93', fontSize: '14px' }}>
                                                {stats.isRentStrategy ? 'План за месяц: ' : 'План продажи: '}
                                                {summary.targetAmount ? formatPrice(summary.targetAmount) : 'Цена не задана'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="transactions-section">
                        {!stats.isSold && (
                            <div className="card-glass add-tx-card">
                                <h3 className="card-title">Добавить операцию</h3>
                                <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <input className="dark-input" value={transaction.title} onChange={e => setTransaction({ ...transaction, title: e.target.value })} placeholder="Наименование (напр. 'Оплата аренды')" required />
                                    <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ display: 'flex', flex: 1, gap: '5px' }}>
                                            <input className="dark-input" type="number" value={transaction.amount} onChange={e => setTransaction({ ...transaction, amount: e.target.value })} placeholder="Сумма" required style={{ flex: 1, minWidth: '0' }} />
                                            <select className="dark-select" value={transaction.currency} onChange={e => setTransaction({ ...transaction, currency: e.target.value })} style={{ flex: '0 0 85px', padding: '12px 8px' }}>
                                                <option value="USD">USD</option>
                                                <option value="BYN">BYN</option>
                                            </select>
                                        </div>
                                        <select className="dark-select" value={transaction.type} onChange={e => setTransaction({ ...transaction, type: e.target.value })} style={{ flex: 1 }}>
                                            <option value="EXPENSE">Расход (-)</option>
                                            <option value="INCOME">Доход (+)</option>
                                        </select>
                                    </div>
                                    <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                                        <select className="dark-select" value={transaction.category} onChange={e => setTransaction({ ...transaction, category: e.target.value })} style={{ flex: 2 }}>
                                            {!stats.isTenant && <option value="PURCHASE">Покупка объекта</option>}
                                            <option value="MATERIALS">Материалы</option>
                                            <option value="LABOR">Рабочие / Услуги</option>
                                            <option value="TAX">Налоги / Сборы</option>
                                            <option value="UTILITIES">Коммуналка</option>
                                            <option value="RENT_INCOME">Доход от аренды</option>
                                            <option value="SALE_PROCEEDS">Выручка от продажи</option>
                                            <option value="OTHER">Прочее</option>
                                        </select>
                                        <input className="dark-input" type="date" max={todayDateString} value={transaction.transactionDate} onChange={e => setTransaction({ ...transaction, transactionDate: e.target.value })} required style={{ flex: 1 }} title="Дата операции" />
                                    </div>
                                    <button type="submit" className="btn-add-tx" style={{ background: '#007aff', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
                                        Записать операцию
                                    </button>
                                </form>
                            </div>
                        )}

                        <div className="card-glass history-card" style={{ marginTop: stats.isSold ? '0' : '20px' }}>
                            <h3 className="card-title">История операций</h3>
                            <div className="tx-list" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                                {sortedAndGroupedTransactions.length === 0 ? (
                                    <p style={{ color: '#8e8e93', textAlign: 'center', marginTop: '20px' }}>Операций пока нет</p>
                                ) : (
                                    sortedAndGroupedTransactions.map(item => {
                                        if (item.type === 'date_separator') {
                                            return (
                                                <div key={item.id} className="tx-date-separator" style={{ textAlign: 'center', margin: '20px 0 10px 0' }}>
                                                    <span style={{ background: '#2c2c2e', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', color: '#8e8e93', fontWeight: '500', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                                        {formatDateSeparator(item.date)}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        const txText = item.description || item.title || '';
                                        const isSaleMarker = txText.startsWith('🟢');
                                        const isRentMarker = txText.startsWith('🔵');

                                        if (isSaleMarker) {
                                            return (
                                                <div key={item.id} style={{ margin: '10px 0', padding: '12px 15px', background: 'rgba(48, 209, 88, 0.1)', borderLeft: '4px solid #30d158', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ color: '#30d158', fontWeight: 'bold', fontSize: '15px' }}>{txText}</span>
                                                        <span style={{ fontSize: '12px', color: '#8e8e93', display: 'block', marginTop: '4px' }}>Сделка завершена • {item.createdAt ? formatTime(item.createdAt) : ''}</span>
                                                    </div>
                                                    <span style={{ color: '#32d74b', fontWeight: 'bold', fontSize: '16px' }}>+{formatPrice(item.amount)}</span>
                                                </div>
                                            );
                                        }

                                        if (isRentMarker) {
                                            return (
                                                <div key={item.id} style={{ margin: '10px 0', padding: '12px 15px', background: 'rgba(10, 132, 255, 0.1)', borderLeft: '4px solid #0a84ff', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ color: '#0a84ff', fontWeight: 'bold', fontSize: '15px' }}>{txText}</span>
                                                        <span style={{ fontSize: '12px', color: '#8e8e93', display: 'block', marginTop: '4px' }}>Фиксация договора • {item.createdAt ? formatTime(item.createdAt) : ''}</span>
                                                    </div>
                                                    <span style={{ fontSize: '20px' }}>🔑</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={item.id} className="tx-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px', borderBottom: '1px solid #333', borderRadius: '8px', transition: 'background 0.2s', cursor: 'default' }}>
                                                <div className="tx-main">
                                                    <span className="tx-title" style={{ fontWeight: '500', display: 'block', fontSize: '15px' }}>{txText}</span>
                                                    <span style={{ fontSize: '12px', color: '#8e8e93', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                                                        <span style={{ background: '#3a3a3c', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                                                            {categoryMap[item.category] || item.category}
                                                        </span>
                                                        {item.createdAt ? formatTime(item.createdAt) : ''}
                                                    </span>
                                                </div>
                                                <span className={`tx-amount ${item.type === 'INCOME' ? 'positive' : 'negative'}`} style={{ fontWeight: 'bold', alignSelf: 'center', fontSize: '15px' }}>
                                                    {item.type === 'INCOME' ? '+' : '-'}
                                                    {item.currency
                                                        ? `${Number(item.amount).toLocaleString()} ${item.currency === 'BYN' ? 'Br' : '$'}`
                                                        : formatPrice(item.amount)}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {hierarchicalData.length > 0 && (
                    <div className="card-glass" style={{ marginTop: '20px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>📊 Сводка по периодам</h3>
                            <span style={{ fontSize: '12px', color: '#8e8e93' }}>Суммы в {currency === 'BYN' ? 'BYN' : 'USD'}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', padding: '10px 15px', color: '#8e8e93', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #333', fontWeight: 'bold' }}>
                            <div>Период</div>
                            <div style={{ textAlign: 'right' }}>Получено</div>
                            <div style={{ textAlign: 'right' }}>Потрачено</div>
                            <div style={{ textAlign: 'right' }}>Итого</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {hierarchicalData.map(yData => (
                                <div key={yData.year} style={{ borderBottom: '1px solid #2c2c2e' }}>
                                    <div
                                        onClick={() => toggleYear(yData.year)}
                                        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', padding: '14px 15px', background: expandedYears[yData.year] ? '#1c1c1e' : 'transparent', cursor: 'pointer', transition: '0.2s', alignItems: 'center' }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#2c2c2e'}
                                        onMouseOut={(e) => e.currentTarget.style.background = expandedYears[yData.year] ? '#1c1c1e' : 'transparent'}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '12px', opacity: 0.5 }}>{expandedYears[yData.year] ? '▼' : '▶'}</span>
                                            {yData.year} год
                                        </div>
                                        <div style={{ color: '#32d74b', textAlign: 'right', fontWeight: '600' }}>{yData.income > 0 ? `+${formatPrice(yData.income)}` : '-'}</div>
                                        <div style={{ color: '#ff453a', textAlign: 'right', fontWeight: '600' }}>{yData.expense > 0 ? `-${formatPrice(yData.expense)}` : '-'}</div>
                                        <div className={yData.net >= 0 ? 'positive' : 'negative'} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            {yData.net > 0 ? '+' : ''}{formatPrice(yData.net)}
                                        </div>
                                    </div>

                                    {expandedYears[yData.year] && yData.months.map(mData => (
                                        <div key={mData.month}>
                                            <div
                                                onClick={() => toggleMonth(yData.year, mData.month)}
                                                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', padding: '12px 15px 12px 35px', background: expandedMonths[`${yData.year}-${mData.month}`] ? '#1a1a1c' : 'transparent', cursor: 'pointer', borderTop: '1px dashed #333' }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#2c2c2e'}
                                                onMouseOut={(e) => e.currentTarget.style.background = expandedMonths[`${yData.year}-${mData.month}`] ? '#1a1a1c' : 'transparent'}
                                            >
                                                <div style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '10px', opacity: 0.5 }}>{expandedMonths[`${yData.year}-${mData.month}`] ? '▼' : '▶'}</span>
                                                    {MonthNames[mData.month - 1]}
                                                </div>
                                                <div style={{ color: '#32d74b', textAlign: 'right', fontSize: '14px' }}>{mData.income > 0 ? `+${formatPrice(mData.income)}` : ''}</div>
                                                <div style={{ color: '#ff453a', textAlign: 'right', fontSize: '14px' }}>{mData.expense > 0 ? `-${formatPrice(mData.expense)}` : ''}</div>
                                                <div className={mData.net >= 0 ? 'positive' : 'negative'} style={{ textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                                                    {mData.net > 0 ? '+' : ''}{formatPrice(mData.net)}
                                                </div>
                                            </div>

                                            {expandedMonths[`${yData.year}-${mData.month}`] && mData.days.map(dData => (
                                                <div key={dData.day} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', padding: '10px 15px 10px 55px', borderTop: '1px solid #222', fontSize: '13px', background: 'rgba(0,0,0,0.2)' }}>
                                                    <div style={{ color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#666' }}></span>
                                                        {dData.day} числа

                                                        {dData.count > 0 && <span style={{ fontSize: '11px', opacity: 0.5 }}>({dData.count} {declOfNum(dData.count, ['операция', 'операции', 'операций'])})</span>}

                                                        {dData.hasSale && <span style={{ background: '#30d158', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '5px', fontWeight: 'bold' }}>Продажа объекта</span>}
                                                        {dData.hasPurchase && <span style={{ background: '#007aff', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '5px' }}>Покупка объекта</span>}
                                                        {dData.hasRentStart && <span style={{ background: '#0a84ff', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '5px' }}>{stats.isTenant ? 'Заезд' : 'Начало сдачи'}</span>}
                                                    </div>
                                                    <div style={{ color: '#32d74b', textAlign: 'right', opacity: 0.8 }}>{dData.income > 0 ? `+${formatPrice(dData.income)}` : ''}</div>
                                                    <div style={{ color: '#ff453a', textAlign: 'right', opacity: 0.8 }}>{dData.expense > 0 ? `-${formatPrice(dData.expense)}` : ''}</div>
                                                    <div style={{ color: dData.net >= 0 ? '#32d74b' : '#ff453a', textAlign: 'right', opacity: 0.9 }}>
                                                        {dData.net === 0 && dData.count === 0 ? '-' : (dData.net > 0 ? '+' : '')}{dData.net !== 0 ? formatPrice(dData.net) : (dData.count > 0 ? formatPrice(0) : '')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PortfolioItemDetails;