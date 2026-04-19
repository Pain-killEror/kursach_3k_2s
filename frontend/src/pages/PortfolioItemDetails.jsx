import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
import './PortfolioItemDetails.css';
import './Home.css'; // Импортируем стили хедера

const PortfolioItemDetails = () => {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- Состояния для хедера ---
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
    // ----------------------------

    const [transaction, setTransaction] = useState({
        title: '',
        amount: '',
        type: 'EXPENSE',
        category: 'MATERIALS',
        transactionDate: new Date().toISOString().split('T')[0]
    });

    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [settings, setSettings] = useState({ strategyName: '', targetAmount: '', exitTaxRate: 13 });

    useEffect(() => { loadData(); }, [itemId]);

    const loadData = async () => {
        try {
            const res = await api.get(`/portfolio/items/${itemId}/summary`);
            setSummary(res.data);
            setSettings({
                strategyName: res.data.strategyName || '',
                targetAmount: res.data.targetAmount || '',
                exitTaxRate: res.data.exitTaxRate || 13
            });
        } catch (err) { console.error("Ошибка загрузки данных", err); }
        finally { setLoading(false); }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            await api.post('/portfolio/transactions', { ...transaction, portfolioItemId: itemId });
            setTransaction({ ...transaction, title: '', amount: '' });
            loadData();
        } catch (err) { alert("Ошибка при добавлении записи"); }
    };

    const saveSettings = async () => {
        try {
            await api.put(`/portfolio/items/${itemId}/settings`, settings);
            setIsEditingSettings(false);
            loadData();
        } catch (err) { alert("Ошибка при сохранении настроек"); }
    };

    if (loading) return <div className="p-loader">Загрузка аналитики...</div>;
    if (!summary) return <div>Объект не найден</div>;

    return (
        <div className="portfolio-page">
            {/* ГЛАВНЫЙ ХЕДЕР (синхронизирован с Home и Portfolio) */}
            <header className="home-header">
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>💎 InvestHub</div>

                <div className="currency-selector" style={{ marginLeft: 'auto', marginRight: '15px' }}>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid #444',
                            background: '#1a1a1a',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="USD">USD ($)</option>
                        <option value="BYN">BYN (Br)</option>
                    </select>
                </div>

                <div className="user-profile-container" ref={dropdownRef}>
                    <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <span className="user-nickname">{user?.name || 'Гость'}</span>
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
                                <p className="d-name">{user?.name}</p>
                                <p className="d-email">{user?.email}</p>
                            </div>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/portfolio'); }}>Мой портфель</button>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/chats'); }}>
                                Чаты {totalUnread > 0 && <span className="menu-badge">{totalUnread}</span>}
                            </button>
                            <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="dropdown-item logout">Выйти</button>
                        </div>
                    )}
                </div>
            </header>

            <main className="portfolio-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '5px 20px' }}>

                {/* 1. КНОПКА НАЗАД (в стиле Portfolio.jsx) */}
                <div className="portfolio-navigation" style={{ marginBottom: '15px', marginTop: '0' }}>
                    <button
                        className="btn-back"
                        onClick={() => navigate('/portfolio')}
                        style={{
                            background: '#2c2c2e',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        ← К списку объектов
                    </button>
                </div>

                {/* 2. БАННЕР С ДАННЫМИ ОБЪЕКТА */}
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
                    {/* ЛЕВАЯ КОЛОНКА: Аналитика */}
                    <div className="analysis-section">
                        <div className="card-glass summary-card">
                            <h3 className="card-title">Финансовый результат</h3>
                            <div className="big-balance-wrapper" style={{ margin: '20px 0' }}>
                                <span className={`big-balance-value ${summary.currentBalance >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '36px', fontWeight: '800' }}>
                                    {summary.currentBalance.toLocaleString()} $
                                </span>
                            </div>
                            <div className="stats-mini-row" style={{ display: 'flex', gap: '30px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                                <div className="stat-item">
                                    <span style={{ color: '#8e8e93', fontSize: '14px', display: 'block' }}>Вложено</span>
                                    <span style={{ fontWeight: 'bold' }}>{summary.totalInvested.toLocaleString()} $</span>
                                </div>
                                <div className="stat-item">
                                    <span style={{ color: '#8e8e93', fontSize: '14px', display: 'block' }}>Доход</span>
                                    <span style={{ fontWeight: 'bold' }}>{summary.totalIncome.toLocaleString()} $</span>
                                </div>
                            </div>
                        </div>

                        <div className="card-glass insights-card" style={{ marginTop: '20px' }}>
                            <h3 className="card-title">💡 Умные подсказки</h3>
                            <div className="insight-item" style={{ marginBottom: '15px' }}>
                                <p style={{ color: '#8e8e93', fontSize: '14px', marginBottom: '5px' }}>Чтобы выйти в ноль (с учетом налога):</p>
                                <span style={{ fontSize: '18px', fontWeight: '600' }}>{summary.breakEvenPrice.toLocaleString()} $</span>
                            </div>
                            <div className="insight-item">
                                <p style={{ color: '#8e8e93', fontSize: '14px', marginBottom: '5px' }}>Ожидаемая чистая прибыль:</p>
                                <span className={summary.expectedProfit >= 0 ? 'positive' : 'negative'} style={{ fontSize: '18px', fontWeight: '600' }}>
                                    {summary.expectedProfit.toLocaleString()} $
                                </span>
                            </div>
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
                                    <input className="dark-input" type="number" value={settings.targetAmount} onChange={e => setSettings({ ...settings, targetAmount: e.target.value })} placeholder="Целевая цена продажи" style={{ width: '100%', marginBottom: '10px' }} />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <label style={{ fontSize: '13px', color: '#8e8e93' }}>Налог (%):</label>
                                        <input
                                            className="dark-input"
                                            type="number"
                                            value={settings.exitTaxRate}
                                            onChange={e => setSettings({ ...settings, exitTaxRate: e.target.value })}
                                            style={{ width: '100px' }} // Увеличил с 60px до 100px
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="view-settings">
                                    <p style={{ margin: '0 0 5px 0' }}><strong>{summary.strategyName || 'Не установлена'}</strong></p>
                                    <p style={{ margin: 0, color: '#8e8e93' }}>Цель: {summary.targetAmount ? `${summary.targetAmount.toLocaleString()} $` : 'Не задана'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ПРАВАЯ КОЛОНКА: Транзакции */}
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
                                <select className="dark-select" value={transaction.category} onChange={e => setTransaction({ ...transaction, category: e.target.value })}>
                                    <option value="MATERIALS">Материалы</option>
                                    <option value="LABOR">Рабочие / Услуги</option>
                                    <option value="TAX">Налоги</option>
                                    <option value="UTILITIES">Коммуналка</option>
                                    <option value="RENT_INCOME">Аренда</option>
                                    <option value="OTHER">Прочее</option>
                                </select>
                                <button type="submit" className="btn-add-tx" style={{ background: '#007aff', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>
                                    Записать операцию
                                </button>
                            </form>
                        </div>

                        <div className="card-glass history-card" style={{ marginTop: '20px' }}>
                            <h3 className="card-title">История операций</h3>
                            <div className="tx-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {summary.transactions.length === 0 ? (
                                    <p style={{ color: '#8e8e93', textAlign: 'center' }}>Операций пока нет</p>
                                ) : (
                                    summary.transactions.map(t => (
                                        <div key={t.id} className="tx-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #333' }}>
                                            <div className="tx-main">
                                                <span className="tx-date" style={{ fontSize: '12px', color: '#8e8e93', display: 'block' }}>{t.transactionDate}</span>
                                                <span className="tx-title" style={{ fontWeight: '500' }}>{t.title}</span>
                                            </div>
                                            <span className={`tx-amount ${t.type === 'INCOME' ? 'positive' : 'negative'}`} style={{ fontWeight: 'bold', alignSelf: 'center' }}>
                                                {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()} $
                                            </span>
                                        </div>
                                    ))
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