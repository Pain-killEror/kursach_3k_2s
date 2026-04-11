import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios'; // Убедись, что путь к axios правильный
import './AddObject.css';

// Конфигурация типов недвижимости и их полей
const REAL_ESTATE_CONFIG = {
    'Квартира': {
        subcategories: ['Плохой ремонт', 'Предчистовая', 'Средний ремонт', 'Хороший ремонт', 'Черновая отделка', 'Элитный ремонт'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'area_living', 'floor', 'floors_total', 'wall_material', 'year_built', 'price_total', 'currency']
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
    'г. Минск',
    'Минская область',
    'г. Брест',
    'Брестская область',
    'г. Витебск',
    'Витебская область',
    'г. Гомель',
    'Гомельская область',
    'г. Гродно',
    'Гродненская область',
    'г. Могилев',
    'Могилевская область'
];

const AddObject = () => {
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    // Начальное состояние формы
    const [formData, setFormData] = useState({
        type: 'Квартира',
        category: 'Средний ремонт',
        title: '',
        description: '',
        city: 'г. Минск',
        address: '',
        area_total: '',
        area_living: '',
        floor: '',
        floors_total: '',
        wall_material: '',
        year_built: '',
        price_total: '',
        currency: 'USD'
    });

    const [images, setImages] = useState([]);

    // Обработчик изменения типа недвижимости (сбрасывает категорию)
    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setFormData(prev => ({
            ...prev,
            type: newType,
            category: REAL_ESTATE_CONFIG[newType].subcategories[0],
            // Сбрасываем поля, которые могут быть не нужны в новом типе
            area_living: '',
            floor: '',
            floors_total: '',
            wall_material: '',
            year_built: ''
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        setImages(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // ВАЛИДАЦИЯ ПЕРЕД ОТПРАВКОЙ
        const activeFields = REAL_ESTATE_CONFIG[formData.type].fields;

        if (activeFields.includes('area_total') && activeFields.includes('area_living')) {
            if (parseFloat(formData.area_living) > parseFloat(formData.area_total)) {
                return setError('Жилая площадь не может быть больше общей площади!');
            }
        }

        if (activeFields.includes('floor') && activeFields.includes('floors_total')) {
            if (parseInt(formData.floor, 10) > parseInt(formData.floors_total, 10)) {
                return setError('Этаж объекта не может быть больше общего количества этажей в здании!');
            }
        }

        // Формируем payload. Строго парсим числа, чтобы избежать бага с "999999" вместо "1000000"
        const payload = new FormData();

        payload.append('type', formData.type);
        payload.append('category', formData.category);

        if (activeFields.includes('title')) payload.append('title', formData.title);
        if (activeFields.includes('description')) payload.append('description', formData.description);
        if (activeFields.includes('city')) payload.append('city', formData.city);
        if (activeFields.includes('address')) payload.append('address', formData.address);
        if (activeFields.includes('currency')) payload.append('currency', formData.currency);

        // Числовые поля парсим явно!
        if (activeFields.includes('price_total') && formData.price_total) {
            // Используем parseFloat, чтобы сохранить введенные копейки/десятичные значения
            payload.append('price_total', parseFloat(formData.price_total));
        }
        if (activeFields.includes('area_total') && formData.area_total) {
            payload.append('area_total', parseFloat(formData.area_total));
        }
        if (activeFields.includes('area_living') && formData.area_living) {
            payload.append('area_living', parseFloat(formData.area_living));
        }
        if (activeFields.includes('year_built') && formData.year_built) {
            payload.append('year_built', parseInt(formData.year_built, 10));
        }

        // Логика этажей для Домов
        if (formData.type === 'Дом') {
            // Для дома текущий этаж не задается, но мы можем передать null или не передавать вообще
            if (formData.floors_total) payload.append('floors_total', parseInt(formData.floors_total, 10));
        } else {
            if (activeFields.includes('floor') && formData.floor) payload.append('floor', parseInt(formData.floor, 10));
            if (activeFields.includes('floors_total') && formData.floors_total) payload.append('floors_total', parseInt(formData.floors_total, 10));
        }

        if (activeFields.includes('wall_material')) payload.append('wall_material', formData.wall_material);

        images.forEach(image => {
            payload.append('images', image);
        });

        try {
            await api.post('/objects', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/'); // Редирект на главную или в профиль
        } catch (err) {
            console.error(err);
            setError('Ошибка при создании объекта. Проверьте данные.');
        }
    };

    const activeFields = REAL_ESTATE_CONFIG[formData.type].fields;

    return (
        <div className="add-object-container">
            <h2>Добавить объект недвижимости</h2>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="add-object-form">

                <div className="form-group">
                    <label>Вид недвижимости</label>
                    <select name="type" value={formData.type} onChange={handleTypeChange} required>
                        {Object.keys(REAL_ESTATE_CONFIG).map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Категория (состояние/тип)</label>
                    <select name="category" value={formData.category} onChange={handleChange} required>
                        {REAL_ESTATE_CONFIG[formData.type].subcategories.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                        ))}
                    </select>
                </div>

                {activeFields.includes('title') && (
                    <div className="form-group">
                        <label>Заголовок объявления</label>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                    </div>
                )}

                {activeFields.includes('city') && (
                    <div className="form-group">
                        <label>Город / Регион</label>
                        <select name="city" value={formData.city} onChange={handleChange} required>
                            {BELARUS_CITIES.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>
                )}

                {activeFields.includes('address') && (
                    <div className="form-group">
                        <label>Точный адрес</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} required />
                    </div>
                )}

                <div className="form-row">
                    {activeFields.includes('area_total') && (
                        <div className="form-group half">
                            <label>Общая площадь (м²)</label>
                            <input type="number" step="0.1" name="area_total" value={formData.area_total} onChange={handleChange} required />
                        </div>
                    )}
                    {activeFields.includes('area_living') && (
                        <div className="form-group half">
                            <label>Жилая площадь (м²)</label>
                            <input type="number" step="0.1" name="area_living" value={formData.area_total && !formData.area_living && formData.type === 'Дом' ? formData.area_total : formData.area_living} onChange={handleChange} required />
                        </div>
                    )}
                </div>

                <div className="form-row">
                    {activeFields.includes('floor') && formData.type !== 'Дом' && (
                        <div className="form-group half">
                            <label>Этаж</label>
                            <input type="number" name="floor" value={formData.floor} onChange={handleChange} required={formData.type !== 'Участок'} />
                        </div>
                    )}
                    {activeFields.includes('floors_total') && (
                        <div className="form-group half">
                            <label>{formData.type === 'Дом' ? 'Количество этажей' : 'Всего этажей в здании'}</label>
                            <input type="number" name="floors_total" value={formData.floors_total} onChange={handleChange} required={formData.type !== 'Участок'} />
                        </div>
                    )}
                </div>

                {activeFields.includes('wall_material') && (
                    <div className="form-group">
                        <label>Материал стен</label>
                        <input type="text" name="wall_material" value={formData.wall_material} onChange={handleChange} />
                    </div>
                )}

                {activeFields.includes('year_built') && (
                    <div className="form-group">
                        <label>Год постройки</label>
                        <input type="number" name="year_built" value={formData.year_built} onChange={handleChange} />
                    </div>
                )}

                <div className="form-row">
                    {activeFields.includes('price_total') && (
                        <div className="form-group half">
                            <label>Стоимость</label>
                            <input type="number" name="price_total" value={formData.price_total} onChange={handleChange} required />
                        </div>
                    )}
                    {activeFields.includes('currency') && (
                        <div className="form-group half">
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
                    <div className="form-group">
                        <label>Описание</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="5"></textarea>
                    </div>
                )}

                <div className="form-group">
                    <label>Фотографии</label>
                    <input type="file" multiple accept="image/*" onChange={handleImageChange} />
                </div>

                <button type="submit" className="submit-btn">Опубликовать объявление</button>
            </form>
        </div>
    );
};

export default AddObject;