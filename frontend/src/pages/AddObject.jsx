import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './AddObject.css';

const REAL_ESTATE_CONFIG = {
    'Квартира': {
        subcategories: ['Плохой ремонт', 'Предчистовая', 'Средний ремонт', 'Хороший ремонт', 'Черновая отделка', 'Элитный ремонт'],
        fields: ['title', 'description', 'city', 'address', 'rooms_count', 'area_total', 'area_living', 'floor', 'floors_total', 'wall_material', 'year_built', 'has_balcony', 'price_total', 'currency']
    },
    'Дом': {
        subcategories: ['Коттедж', 'Таунхаус', 'Старый дом'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'area_living', 'plot_area_acres', 'heating_type', 'floors_total', 'wall_material', 'year_built', 'price_total', 'currency']
    },
    'Участок': {
        subcategories: ['Стандарт'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'land_purpose', 'has_electricity', 'has_gas', 'price_total', 'currency']
    },
    'Коммерция': {
        subcategories: ['Стрит-ритейл', 'ТЦ'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'power_kw', 'floor', 'floors_total', 'year_built', 'price_total', 'currency']
    },
    'Офис': {
        subcategories: ['A', 'B', 'C'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'floor', 'floors_total', 'access_24_7', 'year_built', 'price_total', 'currency']
    },
    'Склад': {
        subcategories: ['Отапливаемый', 'Холодный'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'ceiling_height_m', 'has_ramp', 'year_built', 'price_total', 'currency']
    },
    'Гараж': {
        subcategories: ['Кирпичный', 'Металлический'],
        fields: ['title', 'description', 'city', 'address', 'area_total', 'is_covered', 'has_pit', 'year_built', 'price_total', 'currency']
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
    const [successMessage, setSuccessMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        type: 'Квартира',
        category: 'Средний ремонт',
        title: '',
        description: '',
        city: 'г. Минск',
        address: '',
        rooms_count: '1',
        area_total: '',
        area_living: '',
        plot_area_acres: '',
        heating_type: 'Газ',
        ceiling_height_m: '',
        power_kw: '',
        has_ramp: 'Нет',
        access_24_7: 'Нет',
        land_purpose: 'ИЖС',
        has_electricity: 'Нет',
        has_gas: 'Нет',
        is_covered: 'Да',
        has_pit: 'Нет',
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
            has_balcony: 'Нет',
            plot_area_acres: '',
            ceiling_height_m: '',
            power_kw: ''
        }));
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        let finalValue = value;

        // УМНАЯ ЗАГЛАВНАЯ БУКВА
        if (['title', 'description', 'address', 'wall_material'].includes(name) && finalValue.length > 0) {
            finalValue = finalValue.replace(/(^\s*|[.!?]\s+)([a-zа-яё])/gi, (match, separator, char) => {
                return separator + char.toUpperCase();
            });
        }

        // ЖЕСТКАЯ ВАЛИДАЦИЯ ТЕКСТА
        if (name === 'wall_material') {
            finalValue = finalValue.replace(/[^a-zA-Zа-яА-ЯёЁ\s\-]/g, '');
        }

        // ЖЕСТКАЯ ВАЛИДАЦИЯ ЧИСЕЛ
        if (type === 'number' && finalValue.includes('-')) {
            finalValue = finalValue.replace('-', '');
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
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
        setSuccessMessage(null);
        setErrors({});
        setIsSubmitting(true);

        const userString = localStorage.getItem('user');
        let userId = null;
        if (userString) {
            try {
                const parsedUser = JSON.parse(userString);
                userId = parsedUser.id || parsedUser.userId || parsedUser.uuid;
            } catch (err) { console.error(err); }
        }

        if (!userId || String(userId) === 'undefined' || String(userId) === 'null') {
            setIsSubmitting(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return setGlobalError('Ошибка: ID пользователя не найден. Пожалуйста, выйдите из аккаунта и авторизуйтесь заново.');
        }

        if (images.length === 0) {
            setIsSubmitting(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return setGlobalError('Пожалуйста, загрузите хотя бы одну фотографию объекта. Это обязательно.');
        }

        const activeFields = REAL_ESTATE_CONFIG[formData.type].fields;
        const newErrors = {};

        // ВАЛИДАЦИЯ ПЛОЩАДЕЙ
        if (activeFields.includes('area_total') && activeFields.includes('area_living')) {
            if (parseFloat(formData.area_living) > parseFloat(formData.area_total)) {
                newErrors.area_living = 'Жилая площадь не может быть больше общей!';
            }
        }

        // ВАЛИДАЦИЯ ЭТАЖЕЙ
        if (activeFields.includes('floor') && activeFields.includes('floors_total') && formData.type !== 'Склад') {
            // Если это Стрит-ритейл, этаж всегда 1
            const floorVal = (formData.type === 'Коммерция' && formData.category === 'Стрит-ритейл') ? 1 : parseInt(formData.floor, 10);
            const floorsTotalVal = parseInt(formData.floors_total, 10);

            if (floorVal > floorsTotalVal) {
                newErrors.floor = 'Этаж объекта не может быть больше общего количества этажей!';
            }
        }

        // ВАЛИДАЦИЯ ГОДА
        if (activeFields.includes('year_built') && formData.year_built) {
            const year = parseInt(formData.year_built, 10);
            if (year < 1800 || year > 2026) {
                newErrors.year_built = 'Год постройки должен быть реальным (от 1800 до 2026)';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsSubmitting(false);
            setTimeout(() => {
                const firstErrorEl = document.querySelector('.input-error');
                if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            return;
        }

        const objectData = {
            type: 'REALTY',
            category: formData.type.toUpperCase()
        };

        if (activeFields.includes('title')) objectData.title = formData.title;
        if (activeFields.includes('description')) objectData.description = formData.description;
        if (activeFields.includes('city')) objectData.city = formData.city;
        if (activeFields.includes('address')) objectData.address = formData.address;
        if (activeFields.includes('currency')) objectData.currency = formData.currency;

        if (activeFields.includes('price_total') && formData.price_total) {
            objectData.priceTotal = Number(parseFloat(formData.price_total).toFixed(2));
            if (activeFields.includes('area_total') && formData.area_total) {
                objectData.pricePerM2 = Number((objectData.priceTotal / parseFloat(formData.area_total)).toFixed(2));
            }
        }

        if (activeFields.includes('area_total') && formData.area_total) {
            objectData.areaTotal = Number(parseFloat(formData.area_total).toFixed(2));
        }

        if (activeFields.includes('area_living') && formData.area_living) {
            objectData.areaLiving = Number(parseFloat(formData.area_living).toFixed(2));
        }

        if (activeFields.includes('year_built') && formData.year_built) {
            objectData.yearBuilt = parseInt(formData.year_built, 10);
        }

        // Логика этажей
        if (formData.type === 'Склад') {
            objectData.floor = 1;
            objectData.floorsTotal = 1;
        } else if (formData.type === 'Дом') {
            if (formData.floors_total) objectData.floorsTotal = parseInt(formData.floors_total, 10);
        } else if (formData.type === 'Коммерция' && formData.category === 'Стрит-ритейл') {
            objectData.floor = 1; // Всегда 1 этаж
            if (activeFields.includes('floors_total') && formData.floors_total) {
                objectData.floorsTotal = parseInt(formData.floors_total, 10);
            }
        } else {
            if (activeFields.includes('floor') && formData.floor) objectData.floor = parseInt(formData.floor, 10);
            if (activeFields.includes('floors_total') && formData.floors_total) objectData.floorsTotal = parseInt(formData.floors_total, 10);
        }

        if (activeFields.includes('wall_material')) objectData.wallMaterial = formData.wall_material;

        const attributesObj = {};

        if (formData.type === 'Квартира') attributesObj.renovation_state = formData.category;
        if (formData.type === 'Дом') attributesObj.house_type = formData.category;
        if (formData.type === 'Офис') attributesObj.business_center_class = formData.category;
        if (formData.type === 'Склад') attributesObj.warehouse_type = formData.category;
        if (formData.type === 'Коммерция') attributesObj.retail_type = formData.category;
        if (formData.type === 'Гараж') attributesObj.material = formData.category;

        if (activeFields.includes('rooms_count') && formData.rooms_count) attributesObj.rooms_count = parseInt(formData.rooms_count, 10);
        if (activeFields.includes('has_balcony')) attributesObj.has_balcony = formData.has_balcony === 'Да';
        if (activeFields.includes('plot_area_acres') && formData.plot_area_acres) attributesObj.plot_area_acres = Number(parseFloat(formData.plot_area_acres).toFixed(2));
        if (activeFields.includes('heating_type')) attributesObj.heating_type = formData.heating_type;
        if (activeFields.includes('ceiling_height_m') && formData.ceiling_height_m) attributesObj.ceiling_height_m = Number(parseFloat(formData.ceiling_height_m).toFixed(2));
        if (activeFields.includes('power_kw') && formData.power_kw) attributesObj.power_kw = Number(parseFloat(formData.power_kw).toFixed(2));
        if (activeFields.includes('has_ramp')) attributesObj.has_ramp = formData.has_ramp === 'Да';
        if (activeFields.includes('access_24_7')) attributesObj.access_24_7 = formData.access_24_7 === 'Да';
        if (activeFields.includes('land_purpose')) attributesObj.land_purpose = formData.land_purpose;
        if (activeFields.includes('has_electricity')) attributesObj.has_electricity = formData.has_electricity === 'Да';
        if (activeFields.includes('has_gas')) attributesObj.has_gas = formData.has_gas === 'Да';
        if (activeFields.includes('is_covered')) attributesObj.is_covered = formData.is_covered === 'Да';
        if (activeFields.includes('has_pit')) attributesObj.has_pit = formData.has_pit === 'Да';

        objectData.attributes = JSON.stringify(attributesObj);

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

            setSuccessMessage('🎉 Объявление успешно опубликовано! Возвращаем на главную страницу...');
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (err) {
            console.error(err);
            setIsSubmitting(false);
            setGlobalError(`Ошибка при публикации объекта. Сервер ответил: ${err.response?.status} ${err.response?.statusText}. Проверьте данные или авторизацию.`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const activeFields = REAL_ESTATE_CONFIG[formData.type].fields;

    return (
        <div className="add-object-container">
            <div className="add-header">
                <button className="back-link" onClick={() => navigate(-1)} disabled={isSubmitting}>← Назад</button>
                <h2>Добавить объект недвижимости</h2>
            </div>

            {globalError && (
                <div className="error-message" style={{ color: '#ff3b30', background: 'rgba(255, 59, 48, 0.1)', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid rgba(255, 59, 48, 0.3)' }}>
                    {globalError}
                </div>
            )}

            {successMessage && (
                <div className="success-message" style={{ color: '#28a745', background: 'rgba(40, 167, 69, 0.1)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #28a745', fontWeight: 'bold', textAlign: 'center' }}>
                    {successMessage}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-section">
                    <h3>Основная информация</h3>
                    <div className="grid-row">
                        <div className="input-field">
                            <label>Вид недвижимости</label>
                            <select name="type" value={formData.type} onChange={handleTypeChange} required disabled={isSubmitting}>
                                {Object.keys(REAL_ESTATE_CONFIG).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-field">
                            <label>Категория (состояние/тип)</label>
                            <select name="category" value={formData.category} onChange={handleChange} required disabled={isSubmitting}>
                                {REAL_ESTATE_CONFIG[formData.type].subcategories.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {activeFields.includes('title') && (
                        <div className="input-field">
                            <label>Заголовок объявления</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} required disabled={isSubmitting} />
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3>Расположение и параметры</h3>
                    <div className="grid-row">
                        {activeFields.includes('city') && (
                            <div className="input-field">
                                <label>Город / Регион</label>
                                <select name="city" value={formData.city} onChange={handleChange} required disabled={isSubmitting}>
                                    {BELARUS_CITIES.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {activeFields.includes('address') && (
                            <div className="input-field">
                                <label>Точный адрес</label>
                                <input type="text" name="address" value={formData.address} onChange={handleChange} required disabled={isSubmitting} />
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('area_total') && (
                            <div className="input-field">
                                <label>Общая площадь (м²)</label>
                                <input
                                    type="number" step="0.01" min="0" name="area_total"
                                    value={formData.area_total} onChange={handleChange} required
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                            </div>
                        )}
                        {activeFields.includes('area_living') && (
                            <div className="input-field">
                                <label>Жилая площадь (м²)</label>
                                <input
                                    className={errors.area_living ? 'input-error' : ''}
                                    type="number" step="0.01" min="0" name="area_living"
                                    value={formData.area_living}
                                    onChange={handleChange} required
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                                {errors.area_living && <span className="error-text">{errors.area_living}</span>}
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('plot_area_acres') && (
                            <div className="input-field">
                                <label>Участок (в сотках)</label>
                                <input
                                    type="number" step="0.01" min="0" name="plot_area_acres"
                                    value={formData.plot_area_acres} onChange={handleChange} required
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                            </div>
                        )}
                        {activeFields.includes('heating_type') && (
                            <div className="input-field">
                                <label>Отопление</label>
                                <select name="heating_type" value={formData.heating_type} onChange={handleChange} disabled={isSubmitting}>
                                    <option value="Газ">Газ</option>
                                    <option value="Электричество">Электричество</option>
                                    <option value="Твердотопливный">Твердотопливный</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('ceiling_height_m') && (
                            <div className="input-field">
                                <label>Высота потолков (м)</label>
                                <input
                                    type="number" step="0.01" min="0" name="ceiling_height_m"
                                    value={formData.ceiling_height_m} onChange={handleChange} required
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                            </div>
                        )}
                        {activeFields.includes('power_kw') && (
                            <div className="input-field">
                                <label>Электрическая мощность (кВт)</label>
                                <input
                                    type="number" step="0.1" min="0" name="power_kw"
                                    value={formData.power_kw} onChange={handleChange} required
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                            </div>
                        )}
                        {activeFields.includes('has_ramp') && (
                            <div className="input-field">
                                <label>Наличие рампы</label>
                                <select name="has_ramp" value={formData.has_ramp} onChange={handleChange} disabled={isSubmitting}>
                                    <option value="Нет">Нет</option>
                                    <option value="Да">Есть</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {formData.type === 'Участок' && (
                        <>
                            <div className="grid-row">
                                <div className="input-field">
                                    <label>Назначение участка</label>
                                    <select name="land_purpose" value={formData.land_purpose} onChange={handleChange} disabled={isSubmitting}>
                                        <option value="ИЖС">ИЖС</option>
                                        <option value="Коммерция">Коммерция</option>
                                        <option value="Промназначение">Промназначение</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid-row">
                                <div className="input-field">
                                    <label>Наличие электричества</label>
                                    <select name="has_electricity" value={formData.has_electricity} onChange={handleChange} disabled={isSubmitting}>
                                        <option value="Нет">Нет</option>
                                        <option value="Да">Есть</option>
                                    </select>
                                </div>
                                <div className="input-field">
                                    <label>Наличие газа</label>
                                    <select name="has_gas" value={formData.has_gas} onChange={handleChange} disabled={isSubmitting}>
                                        <option value="Нет">Нет</option>
                                        <option value="Да">Есть</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="grid-row">
                        {activeFields.includes('access_24_7') && (
                            <div className="input-field">
                                <label>Доступ 24/7</label>
                                <select name="access_24_7" value={formData.access_24_7} onChange={handleChange} disabled={isSubmitting}>
                                    <option value="Нет">Нет</option>
                                    <option value="Да">Есть</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('is_covered') && (
                            <div className="input-field">
                                <label>Крыша</label>
                                <select name="is_covered" value={formData.is_covered} onChange={handleChange} disabled={isSubmitting}>
                                    <option value="Да">Да (Крытый)</option>
                                    <option value="Нет">Нет (Открытый)</option>
                                </select>
                            </div>
                        )}
                        {activeFields.includes('has_pit') && (
                            <div className="input-field">
                                <label>Смотровая яма</label>
                                <select name="has_pit" value={formData.has_pit} onChange={handleChange} disabled={isSubmitting}>
                                    <option value="Нет">Нет</option>
                                    <option value="Да">Есть</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('rooms_count') && (
                            <div className="input-field">
                                <label>Количество комнат</label>
                                <input
                                    type="number" name="rooms_count" min="1" max="10"
                                    value={formData.rooms_count} onChange={handleChange} required
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                            </div>
                        )}

                        {activeFields.includes('floor') && formData.type !== 'Дом' && formData.type !== 'Склад' && (
                            <div className="input-field">
                                <label>Этаж</label>
                                <input
                                    className={errors.floor ? 'input-error' : ''}
                                    type="number" min="1" name="floor"
                                    value={(formData.type === 'Коммерция' && formData.category === 'Стрит-ритейл') ? 1 : formData.floor}
                                    onChange={handleChange} required={formData.type !== 'Участок'}
                                    onWheel={(e) => e.target.blur()}
                                    disabled={isSubmitting || (formData.type === 'Коммерция' && formData.category === 'Стрит-ритейл')}
                                />
                                {errors.floor && <span className="error-text">{errors.floor}</span>}
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('floors_total') && formData.type !== 'Склад' && (
                            <div className="input-field">
                                <label>{formData.type === 'Дом' ? 'Количество этажей' : 'Всего этажей в здании'}</label>
                                <input
                                    type="number" min="1" name="floors_total" value={formData.floors_total}
                                    onChange={handleChange} required={formData.type !== 'Участок'}
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                            </div>
                        )}
                        {activeFields.includes('year_built') && (
                            <div className="input-field">
                                <label>Год постройки</label>
                                <input
                                    className={errors.year_built ? 'input-error' : ''}
                                    type="number" min="1800" max="2026" name="year_built"
                                    value={formData.year_built} onChange={handleChange}
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                                {errors.year_built && <span className="error-text">{errors.year_built}</span>}
                            </div>
                        )}
                    </div>

                    <div className="grid-row">
                        {activeFields.includes('wall_material') && (
                            <div className="input-field">
                                <label>Материал стен (Только буквы)</label>
                                <input type="text" name="wall_material" value={formData.wall_material} onChange={handleChange} disabled={isSubmitting} />
                            </div>
                        )}

                        {activeFields.includes('has_balcony') && (
                            <div className="input-field">
                                <label>Балкон / Лоджия</label>
                                <select name="has_balcony" value={formData.has_balcony} onChange={handleChange} disabled={isSubmitting}>
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
                                <input
                                    type="number" min="0" step="0.01" name="price_total"
                                    value={formData.price_total} onChange={handleChange} required
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                            </div>
                        )}
                        {activeFields.includes('currency') && (
                            <div className="input-field" style={{ flex: 1 }}>
                                <label>Валюта</label>
                                <select name="currency" value={formData.currency} onChange={handleChange} disabled={isSubmitting}>
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
                            <textarea name="description" value={formData.description} onChange={handleChange} rows="5" disabled={isSubmitting}></textarea>
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3>Фотографии</h3>
                    <div className="file-upload-zone" style={{ opacity: isSubmitting ? 0.5 : 1, pointerEvents: isSubmitting ? 'none' : 'auto' }}>
                        <label className="file-label">
                            <span style={{ fontSize: '30px', marginBottom: '10px' }}>📁</span>
                            <span>Нажмите, чтобы выбрать фото</span>
                            <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} disabled={isSubmitting} />
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

                <button
                    type="submit"
                    className="save-btn"
                    disabled={isSubmitting}
                    style={{ background: isSubmitting ? '#a8a8a8' : '#28a745', cursor: isSubmitting ? 'wait' : 'pointer' }}
                >
                    {isSubmitting ? 'Публикация...' : 'Опубликовать объявление'}
                </button>
            </form>
        </div>
    );
};

export default AddObject;