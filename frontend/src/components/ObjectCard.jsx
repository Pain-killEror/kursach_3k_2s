import React, { useState } from 'react';
import './ObjectCard.css';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';

const ObjectCard = ({ object }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();
  const { convertPrice, formatPrice: formatCurrency } = useCurrency();
  // 1. Безопасный парсинг картинок
  let images = ['https://via.placeholder.com/350x200?text=Нет+фото'];
  if (object.imagesUrls) {
    try {
      const parsedImages = JSON.parse(object.imagesUrls);
      if (Array.isArray(parsedImages) && parsedImages.length > 0) {
        images = parsedImages;
      }
    } catch (e) {
      const cleanString = object.imagesUrls.replace(/[\[\]'"]/g, '');
      const splitImages = cleanString.split(',').map(img => img.trim()).filter(img => img !== '');
      if (splitImages.length > 0) {
        images = splitImages;
      }
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

  // 2. Умный парсинг атрибутов
  let parsedAttributes = null;
  if (object.attributes) {
    try {
      let validJson = object.attributes.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false');
      parsedAttributes = JSON.parse(validJson);
    } catch (e) {
      console.warn("Ошибка парсинга атрибутов для объекта:", object.id);
    }
  }

  // 3. ПОЛНЫЙ словарь переводов
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

  // 4. Форматирование значений (превращаем true/false в Да/Нет)
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
    if ((object.floor === 1 && object.floorsTotal === 1) || !object.floorsTotal) return null;
    return (
      <span className="object-card-detail">
        <span className="detail-icon">🏢</span> {object.floor}/{object.floorsTotal}
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
        />

        {images.length > 1 && (
          <>
            <button className="image-nav-btn prev" onClick={handlePrevImage} title="Предыдущее фото">
              ❮
            </button>
            <button className="image-nav-btn next" onClick={handleNextImage} title="Следующее фото">
              ❯
            </button>
            <div className="image-counter">
              {currentImageIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      <div className="object-card-content">
        <div className="object-card-header-info">
          <h3 className="object-card-title" title={object.title}>
            {object.title || 'Без названия'}
          </h3>
          <p className="object-card-price">
            {getDisplayPrice()}
          </p>
          <p className="object-card-address" title={`${object.city || ''}, ${object.address || ''}`}>
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
                <div key={key} className="attribute-item" title={`${translateKey(key)}: ${formatAttributeValue(value)}`}>
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