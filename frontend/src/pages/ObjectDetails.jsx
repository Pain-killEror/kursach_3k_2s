import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './ObjectDetails.css';
import { YMaps, Map, Placemark, useYMaps } from '@pbe/react-yandex-maps';
import { useCurrency } from '../context/CurrencyContext';
import InvestmentAnalyzer from '../components/InvestmentAnalyzer';

// Константа для доступа к серверу бэкенда (для загруженных фото)
const API_BASE_URL = "http://localhost:8080";

const MapWithMarker = ({ address }) => {
    const ymaps = useYMaps(['geocode']);
    const [coords, setCoords] = useState(null);

    useEffect(() => {
        if (!ymaps || !address) return;
        ymaps.geocode(address).then((result) => {
            const firstGeoObject = result.geoObjects.get(0);
            if (firstGeoObject) {
                setCoords(firstGeoObject.geometry.getCoordinates());
            }
        });
    }, [ymaps, address]);

    if (!coords) {
        return (
            <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                Ищем объект на карте...
            </div>
        );
    }

    return (
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <Map defaultState={{ center: coords, zoom: 16 }} width="100%" height="400px">
                <Placemark geometry={coords} />
            </Map>
        </div>
    );
};

const ObjectDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currency, setCurrency, convertPrice, formatPrice } = useCurrency();
    const [object, setObject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Получаем текущего пользователя
    const user = useMemo(() => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
    }, []);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Состояние для налоговых ставок (инвестиционный анализатор)
    const [taxRates, setTaxRates] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    // Загрузка налоговых ставок для текущего пользователя
    useEffect(() => {
        const fetchTaxRates = async () => {
            try {
                const response = await api.get('/settings/tax');
                setTaxRates(response.data);
            } catch (err) {
                console.error('Ошибка загрузки налоговых ставок:', err);
                // Дефолтные значения физлица при ошибке
                setTaxRates({ entityType: 'INDIVIDUAL', incomeTaxRate: 13, propertyTaxRate: 0.1 });
            }
        };
        fetchTaxRates();
    }, []);

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
        localStorage.clear();
        navigate('/login');
    };

    // --- Обработка изображений ---
    const images = useMemo(() => {
        let res = ['/no-photo.png'];
        if (object?.imagesUrls) {
            let rawList = [];
            try {
                const parsed = JSON.parse(object.imagesUrls);
                rawList = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
                const cleanString = object.imagesUrls.replace(/[\[\]'"]/g, '');
                rawList = cleanString.split(',').map(img => img.trim()).filter(img => img !== '');
            }

            if (rawList.length > 0) {
                res = rawList.map(img =>
                    img.startsWith('/uploads') ? `${API_BASE_URL}${img}` : img
                );
            }
        }
        return res;
    }, [object]);

    const handlePrevImage = (e) => {
        if (e) e.stopPropagation();
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNextImage = (e) => {
        if (e) e.stopPropagation();
        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') closeModal();
                if (e.key === 'ArrowRight') handleNextImage();
                if (e.key === 'ArrowLeft') handlePrevImage();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                document.body.style.overflow = '';
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isModalOpen, images.length]);

    if (loading) return <div className="loader">Загрузка объекта...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!object) return null;

    // Расчеты цен
    const displayBasePrice = convertPrice(object.priceTotal || 0, object.currency);
    const displayPriceM2 = convertPrice(object.pricePerM2 || 0, object.currency);

    const fullAddress = object.city && object.address ? `${object.city}, ${object.address}` : object.address || object.city || 'Минск';

    return (
        <div className="object-details-layout">
            <header className="home-header" style={{ padding: '20px 60px', margin: '0 auto', maxWidth: '1440px' }}>
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    💎 InvestHub
                </div>

                <div className="currency-selector" style={{ marginLeft: 'auto', marginRight: '15px' }}>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        style={{
                            padding: '8px 14px', borderRadius: '8px', border: '1px solid #444',
                            background: '#1a1a1a', color: 'white', fontWeight: '600', cursor: 'pointer'
                        }}
                    >
                        <option value="USD">USD ($)</option>
                        <option value="BYN">BYN (Br)</option>
                    </select>
                </div>

                {user?.role === 'SELLER' && (
                    <button
                        className="sell-property-btn"
                        onClick={() => navigate('/add-object')}
                        style={{
                            marginRight: '15px', padding: '8px 18px', backgroundColor: '#2ecc71',
                            color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600',
                            cursor: 'pointer', fontSize: '13px'
                        }}
                    >
                        + Продать недвижимость
                    </button>
                )}

                <div className="user-profile-container" ref={dropdownRef}>
                    <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <div className="user-nickname">{user?.name || 'Гость'}</div>
                        <div className="avatar-circle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                    </div>
                    {isMenuOpen && (
                        <div className="user-dropdown-menu">
                            <div className="dropdown-header">
                                <p className="d-name">{user?.name}</p>
                                <p className="d-email">{user?.email}</p>
                                <p className="d-role" style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{user?.role}</p>
                            </div>
                            <button className="dropdown-item">Профиль</button>
                            <button className="dropdown-item logout" onClick={handleLogout}>Выйти</button>
                        </div>
                    )}
                </div>
            </header>

            <main className="details-container">
                <section className="info-section">
                    <div className="main-image-container carousel">
                        {images.length > 1 && (
                            <>
                                <button className="carousel-btn prev" onClick={handlePrevImage}>&lt;</button>
                                <button className="carousel-btn next" onClick={handleNextImage}>&gt;</button>
                            </>
                        )}
                        <img
                            src={images[currentImageIndex]}
                            alt="Объект"
                            className="main-image"
                            onClick={openModal}
                            style={{ cursor: 'pointer' }}
                            onError={(e) => { e.target.src = '/no-photo.png'; }}
                        />
                        {images.length > 1 && (
                            <div className="carousel-dots">
                                {images.map((_, index) => (
                                    <span
                                        key={index}
                                        className={`carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }}
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
                    <h2 className="price">{formatPrice(displayBasePrice)}</h2>

                    <div className="specs-grid">
                        <div className="spec-item">
                            <span className="spec-label">Общая площадь</span>
                            <span className="spec-value">{object.areaTotal} м²</span>
                        </div>

                        {/* ЛОГИКА ЭТАЖЕЙ: Скрываем для участков, выводим прочерк для домов */}
                        {object.type !== 'Участок' && (
                            <div className="spec-item">
                                <span className="spec-label">Этаж</span>
                                <span className="spec-value">
                                    {object.type === 'Дом'
                                        ? `- / ${object.floorsTotal || '—'}`
                                        : `${object.floor || '—'} / ${object.floorsTotal || '—'}`}
                                </span>
                            </div>
                        )}

                        <div className="spec-item">
                            <span className="spec-label">Год постройки</span>
                            <span className="spec-value">{object.yearBuilt || 'Не указан'}</span>
                        </div>

                        {/* ЛОГИКА ЦЕНЫ ЗА М2: Оставляем до 2 знаков после запятой, чтобы не пропадали дробные значения */}
                        <div className="spec-item">
                            <span className="spec-label">Цена за м²</span>
                            <span className="spec-value">
                                {Number(displayPriceM2).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {currency === 'BYN' ? 'Br' : '$'}
                            </span>
                        </div>
                    </div>

                    <div className="description-block">
                        <h3>Описание</h3>
                        <p>{object.description}</p>
                    </div>

                    <div className="map-section" style={{ marginTop: '40px' }}>
                        <h3 style={{ marginBottom: '20px' }}>Расположение на карте</h3>
                        <YMaps query={{ apikey: '336d56de-38a8-483c-b152-781ed261ecf7', lang: 'ru_RU' }}>
                            <MapWithMarker address={fullAddress} />
                        </YMaps>
                    </div>
                </section>

                {/* Секция профессионального инвестиционного анализа: Скрыта для продавцов */}
                {user?.role !== 'SELLER' && taxRates && (
                    <InvestmentAnalyzer
                        object={object}
                        taxRates={taxRates}
                        formatPrice={formatPrice}
                        currency={currency}
                        convertPrice={convertPrice}
                    />
                )}
            </main>

            {/* Модальное окно (fullscreen просмотр) */}
            {isModalOpen && (
                <div className="image-modal-overlay" onClick={closeModal}>
                    <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={closeModal}>&times;</button>
                        {images.length > 1 && (
                            <button className="modal-side-nav prev" onClick={handlePrevImage}>
                                <span>&lt;</span>
                            </button>
                        )}
                        <img src={images[currentImageIndex]} alt="Full screen" className="modal-image" />
                        {images.length > 1 && (
                            <button className="modal-side-nav next" onClick={handleNextImage}>
                                <span>&gt;</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ObjectDetails;