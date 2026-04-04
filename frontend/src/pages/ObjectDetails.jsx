import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './ObjectDetails.css';

const ObjectDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [object, setObject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Для шапки
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('user'));

    // Стейты для карусели и модального окна
    const [currentImageIndex, setCurrentImageIndex] = useState(0); // НОВОЕ: индекс текущей картинки
    const [isModalOpen, setIsModalOpen] = useState(false); // НОВОЕ: состояние модалки

    // Стейты для мастера моделирования
    const [strategy, setStrategy] = useState('RENT');
    const [loanAmount, setLoanAmount] = useState(0);
    const [repairCost, setRepairCost] = useState(0);
    const [monthlyRent, setMonthlyRent] = useState(0);
    const [vacancyRate, setVacancyRate] = useState(5);

    useEffect(() => {
        const fetchObject = async () => {
            try {
                const response = await api.get(`/objects/${id}`);
                setObject(response.data);
            } catch (err) {
                console.error(err);
                setError('Не удалось загрузить данные объекта');
            } finally {
                setLoading(false);
            }
        };
        fetchObject();
    }, [id]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    // НОВОЕ: Функции навигации в карусели
    const handlePrevImage = () => {
        setCurrentImageIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
    };

    const handleNextImage = () => {
        setCurrentImageIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
    };

    const openModal = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    if (loading) return <div className="loader">Загрузка объекта...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!object) return null;

    // Парсинг картинок для детальной страницы
    let images = ['https://via.placeholder.com/600x400?text=Нет+фото'];
    if (object.imagesUrls) {
        try {
            const parsed = JSON.parse(object.imagesUrls);
            if (Array.isArray(parsed) && parsed.length > 0) images = parsed;
        } catch (e) {
            const cleanString = object.imagesUrls.replace(/[\[\]'"]/g, '');
            const splitImages = cleanString.split(',').map(img => img.trim()).filter(img => img !== '');
            if (splitImages.length > 0) images = splitImages;
        }
    }

    // Бизнес-логика расчета ROI
    const basePrice = object.priceTotal || 0;
    const totalInvestment = basePrice + Number(repairCost) - Number(loanAmount);
    const annualIncome = (Number(monthlyRent) * 12) * ((100 - vacancyRate) / 100);
    const roi = totalInvestment > 0 ? ((annualIncome / totalInvestment) * 100).toFixed(2) : 0;
    const payback = annualIncome > 0 ? (totalInvestment / annualIncome).toFixed(1) : '∞';

    return (
        <div className="object-details-layout">
            {/* Идентичная темная шапка как в Home.jsx */}
            <header className="home-header" style={{ padding: '30px 60px', margin: '0 auto', maxWidth: '1440px' }}>
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    💎 InvestHub
                </div>

                <div className="user-profile-container" ref={dropdownRef}>
                    <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <div className="user-nickname">{user?.name || 'Инвестор'}</div>
                        <div className="avatar-circle">
                            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                    </div>

                    {isMenuOpen && (
                        <div className="user-dropdown-menu">
                            <div className="dropdown-header">
                                <p className="d-name">{user?.name || 'Пользователь'}</p>
                                <p className="d-email">{user?.email || 'email@example.com'}</p>
                            </div>
                            <button className="dropdown-item">Профиль</button>
                            <button className="dropdown-item">Мой портфель</button>
                            <button className="dropdown-item logout" onClick={handleLogout}>Выйти</button>
                        </div>
                    )}
                </div>
            </header>

            <main className="details-container">
                {/* ЛЕВАЯ ЧАСТЬ: Информация об объекте */}
                <section className="info-section">
                    {/* ОБНОВЛЕНО: Карусель картинок */}
                    <div className="main-image-container carousel">
                        {images.length > 1 && (
                            <>
                                <button className="carousel-btn prev" onClick={handlePrevImage}>&lt;</button>
                                <button className="carousel-btn next" onClick={handleNextImage}>&gt;</button>
                            </>
                        )}
                        <img
                            src={images[currentImageIndex]}
                            alt={`Фото ${currentImageIndex + 1}`}
                            className="main-image"
                            onClick={openModal} // НОВОЕ: Открытие модалки по клику
                            style={{ cursor: 'pointer' }} // НОВОЕ: Курсор-рука
                        />
                        {images.length > 1 && (
                            <div className="carousel-dots">
                                {images.map((_, index) => (
                                    <span
                                        key={index}
                                        className={`carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                                        onClick={() => setCurrentImageIndex(index)}
                                    ></span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="info-header">
                        <h1>{object.title}</h1>
                        <div className="tags">
                            <span className="tag category">{object.category}</span>
                            <span className="tag type">{object.type}</span>
                        </div>
                    </div>

                    <p className="address">📍 {object.city}, {object.address}</p>
                    <h2 className="price">{object.priceTotal?.toLocaleString()} {object.currency || 'USD'}</h2>

                    <div className="specs-grid">
                        <div className="spec-item">
                            <span className="spec-label">Общая площадь:</span>
                            <span className="spec-value">{object.areaTotal} м²</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Этаж:</span>
                            <span className="spec-value">{object.floor} / {object.floorsTotal}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Год постройки:</span>
                            <span className="spec-value">{object.yearBuilt || 'Не указан'}</span>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Цена за м²:</span>
                            <span className="spec-value">{object.pricePerM2?.toLocaleString()} {object.currency}</span>
                        </div>
                    </div>

                    <div className="description-block">
                        <h3>Описание</h3>
                        <p>{object.description}</p>
                    </div>
                </section>

                {/* ПРАВАЯ ЧАСТЬ: Мастер моделирования (Wizard) */}
                <section className="wizard-section">
                    <div className="wizard-card">
                        <h3>Мастер моделирования 📈</h3>

                        <div className="wizard-step">
                            <label>Шаг 1: Стратегия</label>
                            <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                                <option value="RENT">Долгосрочная аренда</option>
                                <option value="FLIP">Флиппинг (Ремонт и перепродажа)</option>
                                <option value="SUBRENT">Субаренда (Посуточная)</option>
                            </select>
                        </div>

                        <div className="wizard-step">
                            <label>Шаг 2: Вложения</label>
                            <div className="input-group">
                                <span>Кредитное плечо ({object.currency})</span>
                                <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <span>Ремонт и мебель ({object.currency})</span>
                                <input type="number" value={repairCost} onChange={(e) => setRepairCost(e.target.value)} />
                            </div>
                        </div>

                        {strategy !== 'FLIP' && (
                            <div className="wizard-step">
                                <label>Шаг 3: Потоки</label>
                                <div className="input-group">
                                    <span>Ожидаемая аренда/мес ({object.currency})</span>
                                    <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} />
                                </div>
                                <div className="input-group">
                                    <span>Риск простоя (% в год) <span title="Vacancy rate">❓</span></span>
                                    <input type="number" value={vacancyRate} onChange={(e) => setVacancyRate(e.target.value)} max="100" />
                                </div>
                            </div>
                        )}

                        <div className="wizard-results">
                            <h4>Прогноз рентабельности</h4>
                            <div className="result-row">
                                <span>Итого инвестиций:</span>
                                <strong>{totalInvestment.toLocaleString()} {object.currency}</strong>
                            </div>
                            {strategy !== 'FLIP' && (
                                <>
                                    <div className="result-row">
                                        <span>Чистый опер. доход (NOI):</span>
                                        <strong>{annualIncome.toLocaleString()} {object.currency}/год</strong>
                                    </div>
                                    <div className="result-row highlight">
                                        <span>ROI (Рентабельность):</span>
                                        <strong>{roi}%</strong>
                                    </div>
                                    <div className="result-row">
                                        <span>Окупаемость:</span>
                                        <strong>{payback} лет</strong>
                                    </div>
                                </>
                            )}
                        </div>

                        <button className="btn-save-portfolio">Сохранить в Мой Портфель</button>
                    </div>
                </section>
            </main>

            {/* НОВОЕ: Модальное окно для картинок */}
            {isModalOpen && (
                <div className="image-modal-overlay" onClick={closeModal}>
                    <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={closeModal}>&times;</button>
                        <img src={images[currentImageIndex]} alt="Фото во весь экран" className="modal-image" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ObjectDetails;