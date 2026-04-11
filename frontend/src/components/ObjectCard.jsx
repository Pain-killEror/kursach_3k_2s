import React, { useState } from 'react';
import './ObjectCard.css';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';

// Константа для доступа к серверу, где хранятся загруженные файлы
const API_BASE_URL = "http://localhost:8080";

const ObjectCard = ({ object }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();
  const { convertPrice, formatPrice: formatCurrency } = useCurrency();

  // 1. Обработка картинок (внешние ссылки + локальные загрузки)
  let images = ['/no-photo.png'];

  if (object.imagesUrls) {
    let rawImages = [];
    try {
      const parsed = JSON.parse(object.imagesUrls);
      rawImages = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      const cleanString = object.imagesUrls.replace(/[\[\]'"]/g, '');
      rawImages = cleanString.split(',').map(img => img.trim()).filter(img => img !== '');
    }

    if (rawImages.length > 0) {
      // Превращаем относительные пути (/uploads/...) в полные ссылки на бэкенд
      images = rawImages.map(img =>
        img.startsWith('/uploads') ? `${API_BASE_URL}${img}` : img
      );
    }
  }

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // 2. Умный парсинг атрибутов (JSON)
  let parsedAttributes = null;
  if (object.attributes) {
    try {
      // Пытаемся обработать как стандартный JSON, заменяя одинарные кавычки на двойные
      let validJson = object.attributes.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false');
      parsedAttributes = JSON.parse(validJson);
    } catch (e) {
      console.warn("Ошибка парсинга атрибутов для объекта:", object.id);
    }
  }

  // 3. Словарь переводов
  const translateKey = (key) => {
    const dictionary = {
      rooms_count: 'Комнат',
      renovation_state: 'Ремонт',
      has_balcony: 'Балкон',
      house_type: 'Тип дома',
      plot_area_acres: 'Участок (сот.)',
      heating_type: 'Отопление',
      business_center_class: 'Класс БЦ',
      access_24_7: 'Доступ 24/7',
      warehouse_type: 'Тип склада',
      ceiling_height_m: 'Потолки (м)',
      has_ramp: 'Рампа',
      retail_type: 'Тип помещения',
      commercial_type: 'Тип комерц.',
      power_kw: 'Мощность (кВт)',
      land_purpose: 'Назначение',
      land_category: 'Категория',
      garage_type: 'Тип гаража',
      has_security: 'Охрана',
      is_covered: 'Крытый',
      has_pit: 'Яма',
      has_electricity: 'Свет',
      has_gas: 'Газ',
      material: 'Материал'
    };
    return dictionary[key] || key;
  };

  // 4. Форматирование булевых значений
  const formatAttributeValue = (value) => {
    if (value === true || value === 'true' || value === 'True') return 'Да';
    if (value === false || value === 'false' || value === 'False') return 'Нет';
    return value;
  };

  const getDisplayPrice = () => {
    if (!object.priceTotal) return 'Цена не указана';
    const convertedPrice = convertPrice(Number(object.priceTotal), object.currency);
    return formatCurrency(convertedPrice);
  };

  const renderFloorInfo = () => {
    if (!object.floor || object.floor === 0) return null;
    return (
      <span className="object-card-detail">
        <span className="detail-icon">🏢</span> {object.floor}{object.floorsTotal ? `/${object.floorsTotal}` : ''} эт.
      </span>
    );
  };

  return (
    <div className="object-card" onClick={() => navigate(`/object/${object.id}`)}>
      <div className="object-card-image-container">
        <img
          src={images[currentImageIndex]}
          alt={object.title || 'Объект'}
          className="object-card-image"
          onError={(e) => { e.target.src = '/no-photo.png'; }}
        />

        {images.length > 1 && (
          <>
            <button className="image-nav-btn prev" onClick={handlePrevImage}>❮</button>
            <button className="image-nav-btn next" onClick={handleNextImage}>❯</button>
            <div className="image-counter">
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      <div className="object-card-content">
        <div className="object-card-header-info">
          <h3 className="object-card-title">{object.title || 'Без названия'}</h3>
          <p className="object-card-price">{getDisplayPrice()}</p>
          <p className="object-card-address">
            {object.city ? `${object.city}, ` : ''}{object.address || 'Адрес не указан'}
          </p>

          <div className="object-card-details">
            {object.areaTotal && (
              <span className="object-card-detail">
                <span className="detail-icon">📐</span> {object.areaTotal} м²
              </span>
            )}
            {renderFloorInfo()}
          </div>
        </div>

        <div className="object-card-attributes-wrapper">
          {parsedAttributes && Object.keys(parsedAttributes).length > 0 ? (
            <div className="object-card-attributes">
              {Object.entries(parsedAttributes).map(([key, value]) => (
                <div key={key} className="attribute-item">
                  <span className="attribute-key">{translateKey(key)}:</span>
                  <span className="attribute-value">{formatAttributeValue(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-attributes">Нет доп. характеристик</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectCard;