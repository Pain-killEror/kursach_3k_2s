import React from 'react';
import './ObjectCard.css';

const ObjectCard = ({ object }) => {
  // Безопасное извлечение первой картинки из списка
  let coverImage = 'https://via.placeholder.com/350x200?text=Нет+фото';
  
  if (object.imagesUrls) {
    try {
      // Пытаемся разобрать JSON-массив
      const images = JSON.parse(object.imagesUrls);
      if (Array.isArray(images) && images.length > 0) {
        coverImage = images[0];
      }
    } catch (e) {
      // Если это просто строка через запятую или одиночный URL
      const images = object.imagesUrls.split(',');
      if (images.length > 0 && images[0].trim() !== '') {
        coverImage = images[0].trim();
      }
    }
  }

  // Форматирование цены (группировка разрядов)
  const formatPrice = (price) => {
    if (!price) return 'Цена не указана';
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  return (
    <div className="object-card">
      <div className="object-card-image-container">
        <img src={coverImage} alt={object.title || 'Объект'} className="object-card-image" />
      </div>
      <div className="object-card-content">
        <h3 className="object-card-title" title={object.title}>
          {object.title || 'Без названия'}
        </h3>
        <p className="object-card-price">
          {formatPrice(object.priceTotal)} {object.currency || ''}
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
          {object.floor && (
            <span className="object-card-detail">
              <span className="detail-icon">🏢</span> Этаж: {object.floor}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectCard;
