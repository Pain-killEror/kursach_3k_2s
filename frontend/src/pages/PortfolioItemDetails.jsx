import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
import './PortfolioItemDetails.css';
import './Home.css';

const PortfolioItemDetails = () => {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const { currency, setCurrency } = useCurrency();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [totalUnread, setTotalUnread] = useState(0);
    const dropdownRef = useRef(null);

    const user = useMemo(() => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
    }, []);

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

    const [transaction, setTransaction] = useState({
        title: '',
        amount: '',
        type: 'EXPENSE',
        category: 'MATERIALS',
        // Дата операции (когда она фактически была, напр. "вчера купил обои"). 
        // А точное время создания БД поставит сама в created_at!
        transactionDate: new Date().toISOString().split('T')[0]
    });

    const [isEditingSettings, setIsEditingSettings] = useState(false);
    // Налог теперь инициализируется как 0, никаких захардкоженных 13
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
                title: transaction.title,
                amount: parseFloat(transaction.amount),
                type: transaction.type,
                category: transaction.category,
                transactionDate: transaction.transactionDate
            };

            await api.post(`/portfolio/transactions?itemId=${itemId}`, dataToSend);

            setTransaction({ ...transaction, title: '', amount: '' });
            loadData();
        } catch (err) {
            console.error("Ошибка при добавлении транзакции!", err.response?.data);
            alert("Не удалось добавить операцию. Проверь консоль бэкенда.");
        }
    };

    const saveSettings = async () => {
        try {
            await api.put(`/portfolio/items/${itemId}/settings`, settings);
            setIsEditingSettings(false);
            loadData();
        } catch (err) { alert("Ошибка при сохранении настроек"); }
    };

    // --- УМНАЯ СОРТИРОВКА И ГРУППИРОВКА ---
    const sortedAndGroupedTransactions = useMemo(() => {
        if (!summary || !summary.transactions) return [];

        // 1. Сортируем от новых к старым, используя точное время создания из БД (createdAt)
        const sorted = [...summary.transactions].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.transactionDate).getTime();
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.transactionDate).getTime();
            return timeB - timeA;
        });

        const grouped = [];
        let lastDate = null;

        // 2. Вставляем разделители дат на основе фактической даты операции (transactionDate)
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

    // Форматирование времени (ЧЧ:ММ) из поля createdAt
    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Вспомогательные расчеты для визуала налогов
    const netDebt = (summary?.totalInvested || 0) - (summary?.totalIncome || 0);
    const taxAmount = ((settings.targetAmount || 0) * (summary?.exitTaxRate || 0)) / 100;

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
                        <span className="category-tag" style={{ background: '#007aff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                            {summary.objectCategory || 'Объект'}
                        </span>
                        <h1 style={{ marginTop: '10px', marginBottom: '5px' }}>{summary.objectTitle || 'Аналитика объекта'}</h1>
                        <p style={{ color: '#8e8e93', margin: 0 }}>{summary.objectAddress || 'Адрес не указан'}</p>
                    </div>
                </div>

                <div className="details-grid">
                    {/* ЛЕВАЯ КОЛОНКА */}
                    <div className="analysis-section">
                        <div className="card-glass summary-card">
                            <h3 className="card-title">Финансовый результат</h3>
                            <div className="big-balance-wrapper" style={{ margin: '20px 0' }}>
                                <span className={`big-balance-value ${summary.currentBalance >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '36px', fontWeight: '800' }}>
                                    {summary.currentBalance?.toLocaleString() || 0} $
                                </span>
                            </div>

                            {/* Куплено за | Вложено (доп) | Доход */}
                            <div className="stats-mini-row" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                <div className="stat-item" style={{ textAlign: 'left' }}>
                                    <span style={{ color: '#8e8e93', fontSize: '14px', display: 'block' }}>Куплено за</span>
                                    <span style={{ fontWeight: 'bold' }}>{(summary.purchasePrice || 0).toLocaleString()} $</span>
                                </div>
                                <div className="stat-item" style={{ textAlign: 'center' }}>
                                    <span style={{ color: '#8e8e93', fontSize: '14px', display: 'block' }}>Вложено (доп.)</span>
                                    <span style={{ fontWeight: 'bold' }}>{(summary.additionalInvestments || 0).toLocaleString()} $</span>
                                </div>
                                <div className="stat-item" style={{ textAlign: 'right' }}>
                                    <span style={{ color: '#8e8e93', fontSize: '14px', display: 'block' }}>Доход</span>
                                    <span style={{ fontWeight: 'bold' }}>{(summary.totalIncome || 0).toLocaleString()} $</span>
                                </div>
                            </div>
                        </div>

                        {/* КРУТОЙ БЛОК: Экономика и Налоги */}
                        <div className="card-glass economy-card" style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 className="card-title" style={{ margin: 0 }}>⚖️ Расчет прибыли и налогов</h3>
                                <div style={{ background: '#2c2c2e', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #444' }}>
                                    <span style={{ color: '#8e8e93' }}>Ставка:</span> <span style={{ color: '#32ade6', fontWeight: 'bold' }}>{summary.exitTaxRate}%</span>
                                </div>
                            </div>

                            <p style={{ color: '#a1a1aa', fontSize: '12px', margin: '0 0 15px 0', lineHeight: '1.4' }}>
                                Налог применяется автоматически на основе вашего статуса (Физлицо, ИП и т.д.), заданного администратором системы. Ниже представлен расчет для вашей Целевой цены.
                            </p>

                            {settings.targetAmount > 0 ? (
                                <div className="calculation-breakdown" style={{ background: '#1c1c1e', padding: '15px', borderRadius: '10px', border: '1px solid #333' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                                        <span style={{ color: '#fff' }}>🎯 Целевая цена продажи</span>
                                        <span style={{ fontWeight: 'bold' }}>{Number(settings.targetAmount).toLocaleString()} $</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#ff453a' }}>
                                        <span>🏛 Налог с продажи ({summary.exitTaxRate}%)</span>
                                        <span>- {taxAmount.toLocaleString()} $</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: '#ff9f0a' }}>
                                        <span>💰 Возврат всех вложений</span>
                                        <span>- {netDebt > 0 ? netDebt.toLocaleString() : 0} $</span>
                                    </div>
                                    <div style={{ borderTop: '1px dashed #444', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                                        <span style={{ color: '#fff' }}>✨ Чистая прибыль</span>
                                        <span className={summary.expectedProfit >= 0 ? 'positive' : 'negative'}>
                                            {summary.expectedProfit >= 0 ? '+' : ''}{summary.expectedProfit?.toLocaleString()} $
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '15px', background: '#2c2c2e', borderRadius: '10px', color: '#8e8e93', fontSize: '13px' }}>
                                    Установите "Целевую цену продажи" в настройках ниже, чтобы увидеть полный расчет экономики и ваших налогов.
                                </div>
                            )}

                            {/* Мини-подсказка: Точка безубыточности */}
                            <div style={{ marginTop: '15px', background: 'rgba(255, 159, 10, 0.1)', borderLeft: '3px solid #ff9f0a', padding: '10px 15px', borderRadius: '0 8px 8px 0' }}>
                                <div style={{ fontSize: '13px', color: '#ff9f0a', fontWeight: '600', marginBottom: '4px' }}>Точка безубыточности: {summary.breakEvenPrice?.toLocaleString() || 0} $</div>
                                <div style={{ fontSize: '11px', color: '#a1a1aa' }}>Минимальная цена продажи, чтобы после уплаты налога ({summary.exitTaxRate}%) выйти ровно в ноль по всем вложениям.</div>
                            </div>
                        </div>

                        {/* НАСТРОЙКИ СТРАТЕГИИ (теперь без поля налога) */}
                        <div className="card-glass settings-card" style={{ marginTop: '20px' }}>
                            <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 className="card-title" style={{ margin: 0 }}>Стратегия и цель</h3>
                                <button className="btn-edit-small" onClick={() => isEditingSettings ? saveSettings() : setIsEditingSettings(true)} style={{ background: '#3a3a3c', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                                    {isEditingSettings ? 'Сохранить' : 'Изменить'}
                                </button>
                            </div>
                            {isEditingSettings ? (
                                <div className="edit-settings-form">
                                    <input className="dark-input" value={settings.strategyName} onChange={e => setSettings({ ...settings, strategyName: e.target.value })} placeholder="Название стратегии (напр. Флиппинг)" style={{ width: '100%', marginBottom: '10px' }} />
                                    <input className="dark-input" type="number" value={settings.targetAmount} onChange={e => setSettings({ ...settings, targetAmount: e.target.value })} placeholder="Целевая цена продажи" style={{ width: '100%' }} />
                                </div>
                            ) : (
                                <div className="view-settings">
                                    <p style={{ margin: '0 0 5px 0', fontSize: '15px' }}><strong>{summary.strategyName || 'Не установлена'}</strong></p>
                                    <p style={{ margin: 0, color: '#8e8e93', fontSize: '14px' }}>План продажи: {summary.targetAmount ? `${summary.targetAmount.toLocaleString()} $` : 'Цена не задана'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ПРАВАЯ КОЛОНКА (ОПЕРАЦИИ) */}
                    <div className="transactions-section">
                        <div className="card-glass add-tx-card">
                            <h3 className="card-title">Добавить операцию</h3>
                            <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <input className="dark-input" value={transaction.title} onChange={e => setTransaction({ ...transaction, title: e.target.value })} placeholder="Наименование (напр. 'Замена окон')" required />
                                <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                                    <input className="dark-input" type="number" value={transaction.amount} onChange={e => setTransaction({ ...transaction, amount: e.target.value })} placeholder="Сумма" required style={{ flex: 1 }} />
                                    <select className="dark-select" value={transaction.type} onChange={e => setTransaction({ ...transaction, type: e.target.value })} style={{ flex: 1 }}>
                                        <option value="EXPENSE">Расход (-)</option>
                                        <option value="INCOME">Доход (+)</option>
                                    </select>
                                </div>
                                <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
                                    <select className="dark-select" value={transaction.category} onChange={e => setTransaction({ ...transaction, category: e.target.value })} style={{ flex: 2 }}>
                                        <option value="PURCHASE">Покупка объекта</option>
                                        <option value="MATERIALS">Материалы</option>
                                        <option value="LABOR">Рабочие / Услуги</option>
                                        <option value="TAX">Налоги / Сборы</option>
                                        <option value="UTILITIES">Коммуналка</option>
                                        <option value="RENT_INCOME">Доход от аренды</option>
                                        <option value="SALE_PROCEEDS">Выручка от продажи</option>
                                        <option value="OTHER">Прочее</option>
                                    </select>
                                    <input className="dark-input" type="date" value={transaction.transactionDate} onChange={e => setTransaction({ ...transaction, transactionDate: e.target.value })} required style={{ flex: 1 }} title="Дата операции" />
                                </div>
                                <button type="submit" className="btn-add-tx" style={{ background: '#007aff', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
                                    Записать операцию
                                </button>
                            </form>
                        </div>

                        {/* ИСТОРИЯ ОПЕРАЦИЙ (ГРУППИРОВКА ПО ДНЯМ + ТОЧНОЕ ВРЕМЯ ИЗ БД) */}
                        <div className="card-glass history-card" style={{ marginTop: '20px' }}>
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

                                        return (
                                            <div key={item.id} className="tx-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px', borderBottom: '1px solid #333', borderRadius: '8px', transition: 'background 0.2s', cursor: 'default' }}>
                                                <div className="tx-main">
                                                    <span className="tx-title" style={{ fontWeight: '500', display: 'block', fontSize: '15px' }}>{item.title}</span>
                                                    {/* ВЫВОДИМ ТОЧНОЕ ВРЕМЯ ИЗ БД (item.createdAt) */}
                                                    <span style={{ fontSize: '12px', color: '#8e8e93', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                                                        <span style={{ background: '#3a3a3c', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>{item.category}</span>
                                                        {item.createdAt ? formatTime(item.createdAt) : ''}
                                                    </span>
                                                </div>
                                                <span className={`tx-amount ${item.type === 'INCOME' ? 'positive' : 'negative'}`} style={{ fontWeight: 'bold', alignSelf: 'center', fontSize: '15px' }}>
                                                    {item.type === 'INCOME' ? '+' : '-'}{item.amount.toLocaleString()} $
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PortfolioItemDetails;