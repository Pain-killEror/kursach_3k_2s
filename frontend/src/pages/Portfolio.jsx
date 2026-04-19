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

    // Добавляем convertPrice, чтобы менять цифры при переключении валюты
    const { currency, setCurrency, convertPrice } = useCurrency();
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

    const cleanCategoryName = (item) => {
        if (item.customName) return item.customName;
        // Берем категорию полностью, как ты и просил
        return item.objectTitle || "Объект";
    };

    const getStreetOnly = (item) => {
        const fullAddress = item.objectAddress || "";
        if (!fullAddress) return "Адрес не указан";
        return fullAddress.trim();
    };

    // Считаем общий баланс с учетом конвертации валюты
    const totalBalance = items.reduce((sum, item) => sum + (item.currentBalance || 0), 0);

    if (loading) return <div className="loader">Загрузка портфеля...</div>;

    return (
        <div className="portfolio-page">
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
                            cursor: 'pointer',
                            outline: 'none'
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
                            </div>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/portfolio'); }}>
                                Мой портфель
                            </button>
                            <button className="dropdown-item" onClick={() => { setIsMenuOpen(false); navigate('/chats'); }}>
                                Чаты {totalUnread > 0 && <span className="menu-badge">{totalUnread}</span>}
                            </button>
                            <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="dropdown-item logout">
                                Выйти
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="portfolio-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '5px' }}>
                <div className="portfolio-navigation" style={{ marginBottom: '5px', marginTop: '0' }}>
                    <button className="btn-back" onClick={() => navigate('/')} style={{ background: '#2c2c2e', padding: '8px 16px', borderRadius: '10px', color: '#fff', border: 'none', cursor: 'pointer' }}>← На главную</button>
                </div>

                <div className="portfolio-summary-banner" style={{ background: '#1c1c1e', padding: '20px', borderRadius: '20px', marginBottom: '20px', border: '1px solid #2c2c2e' }}>
                    <div className="summary-content">
                        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>Мои инвестиции</h1>
                        <div className="total-stats">
                            <span className="label" style={{ color: '#8e8e93' }}>Общий финансовый результат: </span>
                            <span className={`value ${totalBalance >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '24px', fontWeight: 'bold', color: totalBalance >= 0 ? '#30d158' : '#ff453a' }}>
                                {convertPrice(totalBalance, 'USD').toLocaleString()} {currency === 'BYN' ? 'Br' : '$'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="portfolio-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
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
                                style={{
                                    background: '#1c1c1e',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    border: '1px solid #2c2c2e',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s'
                                }}
                            >
                                {/* Уменьшаем padding здесь, чтобы карточка стала ниже (было 20px, стало 15px) */}
                                <div className="card-info" style={{ padding: '15px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <h3 className="item-display-name" style={{ fontSize: '1.1rem', margin: '0 0 4px 0', color: '#fff' }}>
                                        {cleanCategoryName(item)}
                                    </h3>

                                    <p className="item-street" style={{ color: '#8e8e93', fontSize: '13px', margin: '0 0 10px 0' }}>
                                        {getStreetOnly(item)}
                                    </p>

                                    <div className="card-footer" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="status-badge" style={{ background: '#2c2c2e', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '600' }}>
                                            {item.status}
                                        </span>
                                        <span className={`item-balance ${item.currentBalance >= 0 ? 'plus' : 'minus'}`} style={{ fontWeight: 'bold', color: item.currentBalance >= 0 ? '#30d158' : '#ff453a' }}>
                                            {/* Конвертируем сумму для каждой карточки */}
                                            {convertPrice(item.currentBalance, 'USD').toLocaleString()} {currency === 'BYN' ? 'Br' : '$'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default Portfolio;