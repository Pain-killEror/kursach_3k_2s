import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './AddObject.css';

// Полная конфигурация полей на основе твоего парсера (generator.py)
const CATEGORY_FIELDS = {
    'КВАРТИРА': [
        { name: 'rooms_count', label: 'Количество комнат', type: 'number' },
        { name: 'renovation_state', label: 'Ремонт', type: 'select', options: ['Черновая отделка', 'Предчистовая', 'Плохой ремонт', 'Средний ремонт', 'Хороший ремонт', 'Элитный ремонт'] },
        { name: 'has_balcony', label: 'Балкон', type: 'boolean' }
    ],
    'ДОМ': [
        { name: 'house_type', label: 'Тип дома', type: 'select', options: ['Коттедж', 'Таунхаус', 'Старый дом'] },
        { name: 'heating_type', label: 'Отопление', type: 'select', options: ['Газ', 'Твердотопливный', 'Электрическое'] },
        { name: 'plot_area_acres', label: 'Участок (сот.)', type: 'number' }
    ],
    'КОММЕРЦИЯ': [
        { name: 'commercial_type', label: 'Тип помещения', type: 'select', options: ['Стрит-ритейл', 'ТЦ', 'Офис'] },
        { name: 'has_separate_entrance', label: 'Отдельный вход', type: 'boolean' },
        { name: 'ceiling_height_m', label: 'Высота потолков (м)', type: 'number' }
    ],
    'ОФИС': [
        { name: 'business_center_class', label: 'Класс БЦ', type: 'select', options: ['A', 'B', 'C'] },
        { name: 'access_24_7', label: 'Доступ 24/7', type: 'boolean' }
    ],
    'СКЛАД': [
        { name: 'warehouse_type', label: 'Тип склада', type: 'select', options: ['Отапливаемый', 'Холодный'] },
        { name: 'has_ramp', label: 'Наличие пандуса', type: 'boolean' },
        { name: 'ceiling_height_m', label: 'Высота потолков (м)', type: 'number' }
    ],
    'УЧАСТОК': [
        { name: 'land_purpose', label: 'Назначение', type: 'select', options: ['ИЖС', 'СНТ', 'Промназначение'] },
        { name: 'has_electricity', label: 'Электричество', type: 'boolean' },
        { name: 'has_gas', label: 'Газ', type: 'boolean' }
    ],
    'ГАРАЖ': [
        { name: 'material', label: 'Материал', type: 'select', options: ['Кирпичный', 'Металлический', 'Бетонный'] },
        { name: 'is_covered', label: 'Крытый', type: 'boolean' },
        { name: 'has_pit', label: 'Наличие ямы', type: 'boolean' }
    ]
};

const AddObject = () => {
    const navigate = useNavigate();
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user'));
        } catch (e) { return null; }
    }, []);

    const [mainInfo, setMainInfo] = useState({
        title: '',
        category: 'КВАРТИРА',
        type: 'Продажа',
        city: '',
        address: '',
        priceTotal: '',
        currency: 'USD',
        areaTotal: '',
        description: '',
        floor: '',
        floorsTotal: ''
    });

    const [attributes, setAttributes] = useState({});
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
        const filePreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(filePreviews);
    };

    const handleMainChange = (e) => {
        const { name, value } = e.target;
        setMainInfo(prev => ({ ...prev, [name]: value }));
        if (name === 'category') setAttributes({});
    };

    const handleAttrChange = (name, value) => {
        setAttributes(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            alert("Необходимо войти в систему");
            return;
        }
        setLoading(true);

        try {
            const formData = new FormData();

            // Рассчитываем цену за м2 перед отправкой
            const priceTotal = parseFloat(mainInfo.priceTotal);
            const areaTotal = parseFloat(mainInfo.areaTotal);
            const pricePerM2 = (priceTotal && areaTotal) ? (priceTotal / areaTotal).toFixed(2) : 0;

            // Формируем объект данных для бэкенда
            const objectData = {
                ...mainInfo,
                pricePerM2: pricePerM2,
                attributes: JSON.stringify(attributes) // Сериализуем атрибуты в JSON строку
            };

            // Добавляем данные объекта как строку (RequestPart в Spring)
            formData.append('objectData', JSON.stringify(objectData));

            // Добавляем файлы изображений
            selectedFiles.forEach(file => {
                formData.append('images', file);
            });

            // Отправляем запрос с ID пользователя в параметрах
            await api.post(`/objects?userId=${user.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Объявление успешно опубликовано!');
            navigate('/');
        } catch (error) {
            console.error(error);
            alert('Ошибка при сохранении: ' + (error.response?.data || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-object-container">
            <header className="add-header">
                <button className="back-link" onClick={() => navigate(-1)}>← Назад</button>
                <h1>Новое объявление</h1>
            </header>

            <form onSubmit={handleSubmit} className="add-form">
                <section className="form-section">
                    <h3>Основная информация</h3>
                    <div className="input-field">
                        <label>Заголовок объявления</label>
                        <input name="title" required placeholder="Напр: Уютная квартира рядом с парком" onChange={handleMainChange} />
                    </div>

                    <div className="grid-row">
                        <div className="input-field">
                            <label>Категория недвижимости</label>
                            <select name="category" value={mainInfo.category} onChange={handleMainChange}>
                                {Object.keys(CATEGORY_FIELDS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div className="input-field">
                            <label>Полная стоимость</label>
                            <div className="price-row">
                                <input type="number" name="priceTotal" required placeholder="0" onChange={handleMainChange} />
                                <select name="currency" onChange={handleMainChange}>
                                    <option value="USD">USD ($)</option>
                                    <option value="BYN">BYN (Br)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <h3>Местоположение и параметры</h3>
                    <div className="grid-row">
                        <div className="input-field">
                            <label>Город</label>
                            <input name="city" required placeholder="Минск" onChange={handleMainChange} />
                        </div>
                        <div className="input-field">
                            <label>Адрес (Улица и номер дома)</label>
                            <input name="address" required placeholder="ул. Ленина, 10" onChange={handleMainChange} />
                        </div>
                    </div>
                    <div className="grid-row">
                        <div className="input-field">
                            <label>Общая площадь (м²)</label>
                            <input type="number" step="0.01" name="areaTotal" required placeholder="0.00" onChange={handleMainChange} />
                        </div>
                        <div className="input-field">
                            <label>Этаж (если есть)</label>
                            <div className="price-row">
                                <input type="number" name="floor" placeholder="Этаж" onChange={handleMainChange} />
                                <span style={{ alignSelf: 'center', color: '#888' }}>/</span>
                                <input type="number" name="floorsTotal" placeholder="Всего" onChange={handleMainChange} />
                            </div>
                        </div>
                    </div>
                    <div className="input-field">
                        <label>Описание</label>
                        <textarea name="description" rows="5" placeholder="Расскажите об особенностях объекта..." onChange={handleMainChange}></textarea>
                    </div>
                </section>

                <section className="form-section">
                    <h3>Фотографии объекта</h3>
                    <div className="file-upload-zone">
                        <input type="file" id="images" multiple accept="image/*" onChange={handleFileChange} hidden />
                        <label htmlFor="images" className="file-label">
                            <span className="icon">📸</span>
                            <span>Выберите фотографии для загрузки</span>
                        </label>
                    </div>
                    <div className="previews-list">
                        {previews.map((url, i) => <img key={i} src={url} alt="preview" className="img-preview" />)}
                    </div>
                </section>

                <section className="form-section">
                    <h3>Характеристики для: {mainInfo.category}</h3>
                    <div className="grid-row">
                        {CATEGORY_FIELDS[mainInfo.category].map(f => (
                            <div key={f.name} className="input-field">
                                <label>{f.label}</label>
                                {f.type === 'select' ? (
                                    <select onChange={(e) => handleAttrChange(f.name, e.target.value)}>
                                        <option value="">Не выбрано</option>
                                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : f.type === 'boolean' ? (
                                    <select onChange={(e) => handleAttrChange(f.name, e.target.value === 'true')}>
                                        <option value="false">Нет</option>
                                        <option value="true">Да</option>
                                    </select>
                                ) : (
                                    <input type="number" step="0.1" placeholder="0" onChange={(e) => handleAttrChange(f.name, e.target.value)} />
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <button type="submit" className="save-btn" disabled={loading}>
                    {loading ? 'Публикация объявления...' : 'Опубликовать объявление'}
                </button>
            </form>
        </div>
    );
};

export default AddObject;