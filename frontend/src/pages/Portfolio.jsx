import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
import './Portfolio.css';
import './Home.css';

const Portfolio = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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

    useEffect(() => {
        fetchPortfolio();
    }, []);

    const fetchPortfolio = async () => {
        try {
            const response = await api.get('/portfolio/my');
            setItems(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке портфеля:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalBalance = items.reduce((sum, item) => sum + (item.currentBalance || 0), 0);

    if (loading) return <div className="loader">Загрузка портфеля...</div>;

    return (
        <div className="portfolio-page">
            <header className="home-header">
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>💎 InvestHub</div>

                <button
                    onClick={() => navigate('/')}
                    style={{
                        marginLeft: 'auto',
                        marginRight: '15px',
                        padding: '8px 18px',
                        backgroundColor: '#34495e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '13px'
                    }}
                >
                    🏠 На главную
                </button>

                <div className="currency-selector" style={{ marginRight: '15px' }}>
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
                            fontSize: '14px'
                        }}
                    >
                        <option value="USD">USD ($)</option>
                        <option value="BYN">BYN (Br)</option>
                    </select>
                </div>

                {/* Кнопка "Продать недвижимость" удалена отсюда */}

                {user?.role === 'ADMIN' && (
                    <button
                        className="admin-panel-btn"
                        onClick={() => navigate('/admin')}
                        style={{
                            marginRight: '15px', padding: '8px 18px', backgroundColor: '#8e44ad',
                            color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600',
                            cursor: 'pointer', fontSize: '13px'
                        }}
                    >
                        ⚙️ Администрирование
                    </button>
                )}

                <div className="user-profile-container" ref={dropdownRef}>
                    <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <span className="user-nickname">{user?.name || 'Гость'}</span>
                        <div className="avatar-circle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                        {totalUnread > 0 && <span className="unread-dot"></span>}
                    </div>
                    {isMenuOpen && (
                        <div className="user-dropdown-menu">
                            <div className="dropdown-header">
                                <p className="d-name">{user?.name}</p>
                                <p className="d-email">{user?.email}</p>
                                <p className="d-role" style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{user?.role}</p>
                            </div>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/portfolio'); }}>
                                Мой портфель
                            </button>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/chats'); }}>
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

            {/* БЛОК ИНВЕСТИЦИЙ С ТЕМНЫМ ФОНОМ */}
            <div className="portfolio-summary-banner">
                <div className="summary-content">
                    <h1>Мои инвестиции</h1>
                    <div className="total-stats">
                        <span className="label">Общий финансовый результат:</span>
                        <span className={`value ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
                            {totalBalance.toLocaleString()} $
                        </span>
                    </div>
                </div>
            </div>

            <div className="portfolio-grid">
                {items.length === 0 ? (
                    <div className="empty-portfolio">
                        <p>У вас пока нет купленных объектов.</p>
                        <button onClick={() => navigate('/')}>Перейти к поиску</button>
                    </div>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.portfolioItemId}
                            className="portfolio-card dark-card"
                            onClick={() => navigate(`/portfolio/${item.portfolioItemId}`)}
                        >
                            <div className="card-info">
                                <h3>Объект #{item.portfolioItemId.substring(0, 8)}</h3>
                                <p className="strategy-tag">{item.strategyName || 'Стратегия не задана'}</p>
                                <div className="card-footer">
                                    <span className="status-badge">{item.status}</span>
                                    <span className={`item-balance ${item.currentBalance >= 0 ? 'plus' : 'minus'}`}>
                                        {item.currentBalance.toLocaleString()} $
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Portfolio;