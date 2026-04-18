import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import './Portfolio.css';

const Portfolio = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchPortfolio();
    }, []);

    const fetchPortfolio = async () => {
        try {
            const response = await axios.get('/portfolio/my');
            setItems(response.data);
        } catch (error) {
            console.error("Ошибка при загрузке портфеля:", error);
        } finally {
            setLoading(false);
        }
    };

    // Считаем общий баланс по всем объектам
    const totalBalance = items.reduce((sum, item) => sum + (item.currentBalance || 0), 0);

    if (loading) return <div className="loader">Загрузка портфеля...</div>;

    return (
        <div className="portfolio-page">
            <header className="portfolio-header">
                <div className="header-content">
                    <h1>Мои инвестиции</h1>
                    <div className="total-stats">
                        <span className="label">Общий баланс:</span>
                        <span className={`value ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
                            {totalBalance.toLocaleString()} $
                        </span>
                    </div>
                </div>
            </header>

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
                            className="portfolio-card"
                            onClick={() => navigate(`/portfolio/${item.portfolioItemId}`)}
                        >
                            <div className="card-info">
                                <h3>Объект #{item.portfolioItemId.substring(0, 8)}</h3>
                                <p className="strategy-tag">{item.strategyName || 'Без стратегии'}</p>
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