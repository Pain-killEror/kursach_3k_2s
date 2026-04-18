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
        <div className="details-page">
            {/* ГЛАВНЫЙ ХЕДЕР */}
            <header className="home-header">
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>💎 InvestHub</div>

                <button
                    onClick={() => navigate('/')}
                    style={{
                        marginLeft: 'auto', marginRight: '15px', padding: '8px 18px', backgroundColor: '#34495e',
                        color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600',
                        cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease'
                    }}
                >
                    🏠 На главную
                </button>

                <div className="currency-selector" style={{ marginRight: '15px' }}>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        style={{
                            padding: '8px 14px', borderRadius: '8px', border: '1px solid #444',
                            cursor: 'pointer', outline: 'none', background: '#1a1a1a',
                            color: 'white', fontWeight: '600', fontSize: '14px'
                        }}
                    >
                        <option value="USD">USD ($)</option>
                        <option value="BYN">BYN (Br)</option>
                    </select>
                </div>

                {user?.role === 'USER' && (
                    <button className="sell-property-btn" onClick={() => navigate('/add-object')} style={{ marginRight: '15px', padding: '8px 18px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                        + Продать недвижимость
                    </button>
                )}

                {user?.role === 'ADMIN' && (
                    <button className="admin-panel-btn" onClick={() => navigate('/admin')} style={{ marginRight: '15px', padding: '8px 18px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                        ⚙️ Администрирование
                    </button>
                )}

                <div className="user-profile-container" ref={dropdownRef}>
                    <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ position: 'relative' }}>
                        <span className="user-nickname">{user?.name || 'Гость'}</span>
                        <div className="avatar-circle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        {totalUnread > 0 && <span className="unread-dot"></span>}
                    </div>
                    {isMenuOpen && (
                        <div className="user-dropdown-menu">
                            <div className="dropdown-header">
                                <p className="d-name">{user?.name}</p><p className="d-email">{user?.email}</p><p className="d-role" style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{user?.role}</p>
                            </div>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/portfolio'); }}>Мой портфель</button>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/chats'); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                Чаты {totalUnread > 0 && <span className="menu-badge">{totalUnread}</span>}
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    // Вместо reload используем href, чтобы принудительно уйти со страницы портфеля
                                    window.location.href = '/login';
                                }}
                                className="dropdown-item logout"
                            >
                                Выйти
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <button className="back-btn" onClick={() => navigate('/portfolio')} style={{ marginTop: '20px' }}>← К списку портфеля</button>

            <div className="details-grid">
                {/* ЛЕВАЯ КОЛОНКА: Аналитика */}
                <div className="analysis-section">
                    <div className="card summary-card">
                        <h2>Финансовый результат</h2>
                        <div className="big-balance">
                            <span className={summary.currentBalance >= 0 ? 'pos' : 'neg'}>
                                {summary.currentBalance.toLocaleString()} $
                            </span>
                        </div>
                        <div className="mini-stats">
                            <div className="stat-item">
                                <span>Вложено:</span>
                                <strong>{summary.totalInvested.toLocaleString()} $</strong>
                            </div>
                            <div className="stat-item">
                                <span>Доход:</span>
                                <strong>{summary.totalIncome.toLocaleString()} $</strong>
                            </div>
                        </div>
                    </div>

                    <div className="card tips-card">
                        <h3>Умные подсказки</h3>
                        <div className="tip-item">
                            <p>Чтобы выйти в ноль (с учетом налога):</p>
                            <span className="tip-value">{summary.breakEvenPrice.toLocaleString()} $</span>
                        </div>
                        <div className="tip-item">
                            <p>Ожидаемая чистая прибыль:</p>
                            <span className={`tip-value ${summary.expectedProfit >= 0 ? 'pos' : 'neg'}`}>
                                {summary.expectedProfit.toLocaleString()} $
                            </span>
                        </div>
                    </div>

                    <div className="card settings-card">
                        <div className="card-header">
                            <h3>Стратегия и цель</h3>
                            <button onClick={() => isEditingSettings ? saveSettings() : setIsEditingSettings(true)}>
                                {isEditingSettings ? 'Сохранить' : 'Изменить'}
                            </button>
                        </div>
                        {isEditingSettings ? (
                            <div className="edit-settings">
                                <input value={settings.strategyName} onChange={e => setSettings({ ...settings, strategyName: e.target.value })} placeholder="Название стратегии" />
                                <input type="number" value={settings.targetAmount} onChange={e => setSettings({ ...settings, targetAmount: e.target.value })} placeholder="Целевая цена продажи" />
                                <label>Налог на продажу (%)</label>
                                <input type="number" value={settings.exitTaxRate} onChange={e => setSettings({ ...settings, exitTaxRate: e.target.value })} />
                            </div>
                        ) : (
                            <div className="view-settings">
                                <p><strong>{summary.strategyName || 'Не установлена'}</strong></p>
                                <p>Цель: {summary.targetAmount ? `${summary.targetAmount.toLocaleString()} $` : 'Не задана'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ПРАВАЯ КОЛОНКА: Транзакции */}
                <div className="transactions-section">
                    <div className="card add-tx-card">
                        <h3>Добавить операцию</h3>
                        <form onSubmit={handleAddTransaction}>
                            <input value={transaction.title} onChange={e => setTransaction({ ...transaction, title: e.target.value })} placeholder="Наименование (напр. 'Замена окон')" required />
                            <div className="form-row">
                                <input type="number" value={transaction.amount} onChange={e => setTransaction({ ...transaction, amount: e.target.value })} placeholder="Сумма" required />
                                <select value={transaction.type} onChange={e => setTransaction({ ...transaction, type: e.target.value })}>
                                    <option value="EXPENSE">Расход (-)</option>
                                    <option value="INCOME">Доход (+)</option>
                                </select>
                            </div>
                            <select value={transaction.category} onChange={e => setTransaction({ ...transaction, category: e.target.value })}>
                                <option value="MATERIALS">Материалы</option>
                                <option value="LABOR">Рабочие / Услуги</option>
                                <option value="TAX">Налоги</option>
                                <option value="UTILITIES">Коммуналка</option>
                                <option value="RENT_INCOME">Аренда</option>
                                <option value="OTHER">Прочее</option>
                            </select>
                            <button type="submit" className="submit-tx">Записать</button>
                        </form>
                    </div>

                    <div className="card history-card">
                        <h3>История операций</h3>
                        <div className="tx-list">
                            {summary.transactions.map(t => (
                                <div key={t.id} className="tx-item">
                                    <div className="tx-main">
                                        <span className="tx-date">{t.transactionDate}</span>
                                        <span className="tx-title">{t.title}</span>
                                    </div>
                                    <span className={`tx-amount ${t.type === 'INCOME' ? 'pos' : 'neg'}`}>
                                        {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()} $
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortfolioItemDetails;