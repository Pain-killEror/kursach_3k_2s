import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './AddObject.css';

// КОНФИГУРАЦИЯ: Добавлено поле rooms_count для квартиры
const REAL_ESTATE_CONFIG = {
    'Квартира': {
        subcategories: ['Плохой ремонт', 'Предчистовая', 'Средний ремонт', 'Хороший ремонт', 'Черновая отделка', 'Элитный ремонт'],
        fields: ['title', 'description', 'city', 'address', 'rooms_count', 'area_total', 'area_living', 'floor', 'floors_total', 'wall_material', 'year_built', 'has_balcony', 'price_total', 'currency']
    },
    'Дом': {
        subcategories: ['Коттедж', 'Таунхаус', 'Старый дом'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'area_living', 'floors_total', 'wall_material', 'year_built', 'price_total', 'currency']
    },
    'Участок': {
        subcategories: ['Стандарт'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'price_total', 'currency']
    },
    'Коммерция': {
        subcategories: ['Стрит-ритейл', 'ТЦ'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'floor', 'floors_total', 'year_built', 'price_total', 'currency']
    },
    'Офис': {
        subcategories: ['A', 'B', 'C'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'floor', 'floors_total', 'year_built', 'price_total', 'currency']
    },
    'Склад': {
        subcategories: ['Отапливаемый', 'Холодный'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'floor', 'floors_total', 'year_built', 'price_total', 'currency']
    },
    'Гараж': {
        subcategories: ['Кирпичный', 'Металлический'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'year_built', 'price_total', 'currency']
    }
};

const BELARUS_CITIES = [
    'г. Минск', 'Минская область', 'г. Брест', 'Брестская область',
    'г. Витебск', 'Витебская область', 'г. Гомель', 'Гомельская область',
    'г. Гродно', 'Гродненская область', 'г. Могилев', 'Могилевская область'
];

const AddObject = () => {
    const navigate = useNavigate();
    const [globalError, setGlobalError] = useState(null);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        type: 'Квартира',
        category: 'Средний ремонт',
        title: '',
        description: '',
        city: 'г. Минск',
        address: '',
        rooms_count: '1', // Значение по умолчанию для комнат
        area_total: '',
        area_living: '',
        floor: '',
        floors_total: '',
        wall_material: '',
        year_built: '',
        has_balcony: 'Нет',
        price_total: '',
        currency: 'USD'
    });

    const [images, setImages] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setErrors({});
        setFormData(prev => ({
            ...prev,
            type: newType,
            category: REAL_ESTATE_CONFIG[newType].subcategories[0],
            rooms_count: '1',
            area_living: '',
            floor: '',
            floors_total: '',
            wall_material: '',
            year_built: '',
            has_balcony: 'Нет'
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        setImages(files);
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGlobalError(null);
        setErrors({});

        const userString = localStorage.getItem('user');
        let userId = null;
        if (userString) {
            try {
                const parsedUser = JSON.parse(userString);
                userId = parsedUser.id || parsedUser.userId || parsedUser.uuid;
            } catch (err) { console.error(err); }
        }

        if (!userId || String(userId) === 'undefined' || String(userId) === 'null') {
            return setGlobalError('Ошибка: ID пользователя не найден. Пожалуйста, выйдите из аккаунта и авторизуйтесь заново.');
        }

        if (images.length === 0) {
            return setGlobalError('Пожалуйста, загрузите хотя бы одну фотографию объекта. Это обязательно.');
        }

        const activeFields = REAL_ESTATE_CONFIG[formData.type].fields;
        const newErrors = {};

        if (activeFields.includes('area_total') && activeFields.includes('area_living')) {
            if (parseFloat(formData.area_living) > parseFloat(formData.area_total)) {
                newErrors.area_living = 'Жилая площадь не может быть больше общей!';
            }
        }
        if (activeFields.includes('floor') && activeFields.includes('floors_total')) {
            if (parseInt(formData.floor, 10) > parseInt(formData.floors_total, 10)) {
                newErrors.floor = 'Этаж объекта не может быть больше общего количества этажей!';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setTimeout(() => {
                const firstErrorEl = document.querySelector('.input-error');
                if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            return;
        }

        // ==========================================
        // ИСПРАВЛЕННАЯ ЛОГИКА ФОРМИРОВАНИЯ ДАННЫХ
        // ==========================================
        const objectData = {
            type: 'REALTY', // Всегда REALTY, как в генераторе
            category: formData.type.toUpperCase() // "КВАРТИРА", "ДОМ" - капсом для фильтров!
        };

        if (activeFields.includes('title')) objectData.title = formData.title;
        if (activeFields.includes('description')) objectData.description = formData.description;
        if (activeFields.includes('city')) objectData.city = formData.city;
        if (activeFields.includes('address')) objectData.address = formData.address;
        if (activeFields.includes('currency')) objectData.currency = formData.currency;

        if (activeFields.includes('price_total') && formData.price_total) {
            objectData.priceTotal = parseFloat(formData.price_total);
            if (activeFields.includes('area_total') && formData.area_total) {
                objectData.pricePerM2 = parseFloat((objectData.priceTotal / parseFloat(formData.area_total)).toFixed(2));
            }
        }
        if (activeFields.includes('area_total') && formData.area_total) objectData.areaTotal = parseFloat(formData.area_total);
        if (activeFields.includes('area_living') && formData.area_living) objectData.areaLiving = parseFloat(formData.area_living);
        if (activeFields.includes('year_built') && formData.year_built) objectData.yearBuilt = parseInt(formData.year_built, 10);

        if (formData.type === 'Дом') {
            if (formData.floors_total) objectData.floorsTotal = parseInt(formData.floors_total, 10);
        } else {
            if (activeFields.includes('floor') && formData.floor) objectData.floor = parseInt(formData.floor, 10);
            if (activeFields.includes('floors_total') && formData.floors_total) objectData.floorsTotal = parseInt(formData.floors_total, 10);
        }
        if (activeFields.includes('wall_material')) objectData.wallMaterial = formData.wall_material;

        // --- УПАКОВКА АТРИБУТОВ ---
        const attributesObj = {};

        // 1. Состояние / Подкатегория
        if (formData.type === 'Квартира') attributesObj.renovation_state = formData.category;
        if (formData.type === 'Дом') attributesObj.house_type = formData.category;
        if (formData.type === 'Офис') attributesObj.business_center_class = formData.category;
        if (formData.type === 'Склад') attributesObj.warehouse_type = formData.category;
        if (formData.type === 'Коммерция') attributesObj.retail_type = formData.category;
        if (formData.type === 'Гараж') attributesObj.material = formData.category;

        // 2. Количество комнат
        if (activeFields.includes('rooms_count') && formData.rooms_count) {
            attributesObj.rooms_count = parseInt(formData.rooms_count, 10);
        }

        // 3. Балкон
        if (activeFields.includes('has_balcony')) {
            attributesObj.has_balcony = formData.has_balcony === 'Да';
        }

        objectData.attributes = JSON.stringify(attributesObj);
        // ==========================================

        const payload = new FormData();
        payload.append('objectData', new Blob([JSON.stringify(objectData)], { type: 'application/json' }));
        payload.append('userId', userId);

        images.forEach(image => {
            payload.append('images', image);
        });

        try {
            await api.post('/objects', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/');
        } catch (err) {
            console.error(err);
            setGlobalError(`Ошибка при создании объекта. Сервер ответил: ${err.response?.status} ${err.response?.statusText}`);
        }
    };

    const activeFields = REAL_ESTATE_CONFIG[formData.type].fields;

    return (
        <div className="add-object-container">
            <div className="add-header">
                <button className="back-link" onClick={() => navigate(-1)}>← Назад</button>
                <h2>Добавить объект недвижимости</h2>
            </div>

            {globalError && <div className="error-message" style={{ color: '#ff3b30', background: 'rgba(255, 59, 48, 0.1)', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>{globalError}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-section">
                    <h3>Основная информация</h3>
                    <div className="grid-row">
                        <div className="input-field">
                            <label>Вид недвижимости</label>
                            <select name="type" value={formData.type} onChange={handleTypeChange} required>
                                {Object.keys(REAL_ESTATE_CONFIG).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-field">
                            <label>Категория (состояние/тип)</label>
                            <select name="category" value={formData.category} onChange={handleChange} required>
                                {REAL_ESTATE_CONFIG[formData.type].subcategories.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {activeFields.includes('title') && (
                        <div className="input-field">
                            <label>Заголовок объявления</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3>Расположение и параметры</h3>
                    <div className="grid-row">
                        {activeFields.includes('city') && (
                            <div className="input-field">
                                <label>Город / Регион</label>
                                <select name="city" value={formData.city} onChange={handleChange} required>
                                    {BELARUS_CITIES.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {activeFields.includes('address') && (
                            <div className="input-field">
                                <label>Точный адрес</label>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} required />
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('area_total') && (
                            <div className="input-field">
                                <label>Общая площадь (м²)</label>
                                <input type="number" step="0.1" name="area_total" value={formData.area_total} onChange={handleChange} required />
                            </div>
                        )}
                        {activeFields.includes('area_living') && (
                            <div className="input-field">
                                <label>Жилая площадь (м²)</label>
                                <input
                                    className={errors.area_living ? 'input-error' : ''}
                                    type="number" step="0.1" name="area_living"
                                    value={formData.area_total && !formData.area_living && formData.type === 'Дом' ? formData.area_total : formData.area_living}
                                    onChange={handleChange} required
                                />
                                {errors.area_living && <span className="error-text">{errors.area_living}</span>}
                            </div>
                        )}
                    </div>

                    {/* ДОБАВЛЕН БЛОК ДЛЯ КОМНАТ И ЭТАЖЕЙ */}
                    <div className="grid-row">
                        {activeFields.includes('rooms_count') && (
                            <div className="input-field">
                                <label>Количество комнат</label>
                                <input type="number" name="rooms_count" min="1" max="10" value={formData.rooms_count} onChange={handleChange} required />
                            </div>
                        )}

                        {activeFields.includes('floor') && formData.type !== 'Дом' && (
                            <div className="input-field">
                                <label>Этаж</label>
                                <input
                                    className={errors.floor ? 'input-error' : ''}
                                    type="number" name="floor" value={formData.floor} onChange={handleChange} required={formData.type !== 'Участок'}
                                />
                                {errors.floor && <span className="error-text">{errors.floor}</span>}
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('floors_total') && (
                            <div className="input-field">
                                <label>{formData.type === 'Дом' ? 'Количество этажей' : 'Всего этажей в здании'}</label>
                                <input type="number" name="floors_total" value={formData.floors_total} onChange={handleChange} required={formData.type !== 'Участок'} />
                            </div>
                        )}
                        {activeFields.includes('year_built') && (
                            <div className="input-field">
                                <label>Год постройки</label>
                                <input type="number" name="year_built" value={formData.year_built} onChange={handleChange} />
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('wall_material') && (
                            <div className="input-field">
                                <label>Материал стен</label>
                                <input type="text" name="wall_material" value={formData.wall_material} onChange={handleChange} />
                            </div>
                        )}

                        {activeFields.includes('has_balcony') && (
                            <div className="input-field">
                                <label>Балкон / Лоджия</label>
                                <select name="has_balcony" value={formData.has_balcony} onChange={handleChange}>
                                    <option value="Нет">Нет</option>
                                    <option value="Да">Есть</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="form-section">
                    <h3>Стоимость и детали</h3>
                    <div className="price-row">
                        {activeFields.includes('price_total') && (
                            <div className="input-field" style={{ flex: 2 }}>
                                <label>Стоимость</label>
                                <input type="number" name="price_total" value={formData.price_total} onChange={handleChange} required />
                            </div>
                        )}
                        {activeFields.includes('currency') && (
                            <div className="input-field" style={{ flex: 1 }}>
                                <label>Валюта</label>
                                <select name="currency" value={formData.currency} onChange={handleChange}>
                                    <option value="USD">USD ($)</option>
                                    <option value="BYN">BYN (Br)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {activeFields.includes('description') && (
                        <div className="input-field">
                            <label>Описание</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows="5"></textarea>
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3>Фотографии</h3>
                    <div className="file-upload-zone">
                        <label className="file-label">
                            <span style={{ fontSize: '30px', marginBottom: '10px' }}>📁</span>
                            <span>Нажмите, чтобы выбрать фото</span>
                            <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                        </label>
                    </div>
                    {previewUrls.length > 0 && (
                        <div className="previews-list">
                            {previewUrls.map((url, idx) => (
                                <img key={idx} src={url} alt={`Preview ${idx}`} className="img-preview" />
                            ))}
                        </div>
                    )}
                </div>

                <button type="submit" className="save-btn">Опубликовать объявление</button>
            </form>
        </div>
    );
};

export default AddObject;