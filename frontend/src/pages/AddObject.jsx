import React, { useState, useEffect } from 'react';
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

// Матрица доступных типов сделки для каждого вида недвижимости
const DEAL_TYPE_MATRIX = {
    'Квартира': ['SALE', 'LONG_RENT', 'SHORT_RENT'],
    'Дом': ['SALE', 'LONG_RENT', 'SHORT_RENT'],
    'Участок': ['SALE'],
    'Коммерция': ['SALE', 'RENT'],
    'Офис': ['SALE', 'RENT'],
    'Склад': ['SALE', 'RENT'],
    'Гараж': ['SALE', 'RENT'],
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

    // === СОСТОЯНИЕ ФОТОГРАФИЙ И ЛАЙТБОКСА ===
    const [photos, setPhotos] = useState([]);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [draggedId, setDraggedId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    const [dropPosition, setDropPosition] = useState(null);

    const [formData, setFormData] = useState({
        deal_type: 'SALE', // Новое поле: тип сделки (SALE, LONG_RENT, SHORT_RENT)
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

    useEffect(() => {
        if (isSubmitting || lightboxIndex !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isSubmitting, lightboxIndex]);

    useEffect(() => {
        if (lightboxIndex === null) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setLightboxIndex(null);
            if (e.key === 'ArrowLeft') setLightboxIndex(prev => prev > 0 ? prev - 1 : photos.length - 1);
            if (e.key === 'ArrowRight') setLightboxIndex(prev => prev < photos.length - 1 ? prev + 1 : 0);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, photos.length]);

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        setErrors({});
        const allowedDeals = DEAL_TYPE_MATRIX[newType] || ['SALE'];
        // Если текущий тип сделки не поддерживается для нового типа — сбрасываем на первый доступный
        const newDealType = allowedDeals.includes(formData.deal_type) ? formData.deal_type : allowedDeals[0];
        setFormData(prev => ({
            ...prev,
            type: newType,
            deal_type: newDealType,
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

        if (name === 'title') finalValue = finalValue.replace(/^[-—–]+/, '');

        if (['title', 'description', 'address', 'wall_material'].includes(name)) {
            finalValue = finalValue.replace(/^\s+/, '');
            finalValue = finalValue.replace(/\s{2,}/g, ' ');
            finalValue = finalValue.replace(/\s+([.,!?:;])/g, '$1');
            finalValue = finalValue.replace(/([.,!?:;])([.,!?:;])+/g, '$1');

            if (finalValue.length > 0) {
                finalValue = finalValue.toLowerCase();
                finalValue = finalValue.replace(/(^\s*|[.!?]\s*)([a-zа-яё])/gi, (match, separator, char) => {
                    return separator + char.toUpperCase();
                });
            }
        }

        if (name === 'wall_material') finalValue = finalValue.replace(/[^a-zA-Zа-яА-ЯёЁ\s\-]/g, '');
        if (type === 'number' && finalValue.includes('-')) finalValue = finalValue.replace('-', '');

        setFormData(prev => ({ ...prev, [name]: finalValue }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    // Изменение типа сделки
    const handleDealTypeChange = (type) => {
        setFormData(prev => ({ ...prev, deal_type: type }));
    };

    // Определение подписи для цены
    const getPriceLabel = () => {
        switch (formData.deal_type) {
            case 'LONG_RENT': return 'Стоимость / месяц';
            case 'SHORT_RENT': return 'Стоимость / сутки';
            case 'RENT': return 'Стоимость аренды';
            case 'SALE':
            default: return 'Стоимость';
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newPhotos = [];
        let duplicatesFound = false;

        files.forEach(file => {
            const isDuplicate = photos.some(p =>
                p.file.name === file.name &&
                p.file.size === file.size &&
                p.file.lastModified === file.lastModified
            );

            if (!isDuplicate) {
                newPhotos.push({
                    id: Math.random().toString(36).substr(2, 9),
                    file,
                    url: URL.createObjectURL(file)
                });
            } else {
                duplicatesFound = true;
            }
        });

        if (duplicatesFound) {
            setErrors(prev => ({ ...prev, images: 'Некоторые фотографии были пропущены, так как они уже загружены.' }));
        } else if (errors.images) {
            setErrors(prev => ({ ...prev, images: null }));
        }

        if (newPhotos.length > 0) {
            setPhotos(prev => [...prev, ...newPhotos]);
        }
        e.target.value = null;
    };

    const removePhoto = (id, e) => {
        e.stopPropagation();
        setPhotos(prev => {
            const photoToRemove = prev.find(p => p.id === id);
            if (photoToRemove) URL.revokeObjectURL(photoToRemove.url);
            return prev.filter(p => p.id !== id);
        });
    };

    const handleDragStart = (e, id) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(id));
    };

    const handleDragOver = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";

        if (id === 'END') {
            if (dragOverId !== 'END') {
                setDragOverId('END');
                setDropPosition('left');
            }
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = x < rect.width / 2 ? 'left' : 'right';

        if (dragOverId !== id || dropPosition !== position) {
            setDragOverId(id);
            setDropPosition(position);
        }
    };

    const handleDrop = (e, targetId) => {
        e.preventDefault();
        e.stopPropagation();

        const sourceId = e.dataTransfer.getData("text/plain") || String(draggedId);

        setDraggedId(null);
        setDragOverId(null);
        setDropPosition(null);

        if (!sourceId || sourceId === String(targetId)) return;

        setPhotos(prevPhotos => {
            const sourceIdx = prevPhotos.findIndex(p => String(p.id) === sourceId);
            if (sourceIdx === -1) return prevPhotos;

            const newPhotos = [...prevPhotos];
            const [movedItem] = newPhotos.splice(sourceIdx, 1);

            if (targetId === 'END') {
                newPhotos.push(movedItem);
            } else {
                let targetIdx = prevPhotos.findIndex(p => String(p.id) === String(targetId));
                if (dropPosition === 'right') targetIdx += 1;
                if (sourceIdx < targetIdx) targetIdx -= 1;
                newPhotos.splice(targetIdx, 0, movedItem);
            }

            return newPhotos;
        });
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
        setDropPosition(null);
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

        if (photos.length === 0) {
            setIsSubmitting(false);
            setErrors(prev => ({ ...prev, images: 'Пожалуйста, загрузите хотя бы одну фотографию объекта.' }));
            setTimeout(() => {
                const errEl = document.querySelector('.photo-upload-section');
                if (errEl) errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
            return;
        }

        const activeFields = REAL_ESTATE_CONFIG[formData.type].fields;
        const newErrors = {};

        if (activeFields.includes('title') && formData.title) {
            const titleStr = formData.title.trim();
            const wordsCount = titleStr.split(/\s+/).filter(w => w.length > 0).length;

            if (wordsCount < 3) {
                newErrors.title = 'Заголовок должен состоять минимум из 3 слов!';
            } else if (!/[a-zA-Zа-яА-ЯёЁ]/.test(titleStr)) {
                newErrors.title = 'Заголовок должен содержать буквы, а не только цифры!';
            }
        }

        if (activeFields.includes('area_total') && activeFields.includes('area_living')) {
            const living = parseFloat(formData.area_living);
            const total = parseFloat(formData.area_total);

            if (living < 2) {
                newErrors.area_living = 'Жилая площадь должна быть не меньше 2 м²!';
            } else if (living > total) {
                newErrors.area_living = 'Жилая площадь не может быть больше общей!';
            }
        }

        if (activeFields.includes('floor') && activeFields.includes('floors_total') && formData.type !== 'Склад') {
            const floorVal = (formData.type === 'Коммерция' && formData.category === 'Стрит-ритейл') ? 1 : parseInt(formData.floor, 10);
            const floorsTotalVal = parseInt(formData.floors_total, 10);

            if (floorVal > floorsTotalVal) {
                newErrors.floor = 'Этаж объекта не может быть больше общего количества этажей!';
            }
        }

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
            category: formData.type.toUpperCase(),
            // Фиксируем статус объекта в зависимости от типа сделки
            objectStatus: formData.deal_type === 'SALE' ? 'FOR_SALE' : 'FOR_RENT'
        };

        if (activeFields.includes('title')) objectData.title = formData.title.trim();
        if (activeFields.includes('description')) objectData.description = formData.description.trim();
        if (activeFields.includes('city')) objectData.city = formData.city;
        if (activeFields.includes('address')) objectData.address = formData.address.trim();
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

        if (formData.type === 'Склад') {
            objectData.floor = 1; objectData.floorsTotal = 1;
        } else if (formData.type === 'Коммерция' && formData.category === 'Стрит-ритейл') {
            objectData.floor = 1;
            if (activeFields.includes('floors_total') && formData.floors_total) objectData.floorsTotal = parseInt(formData.floors_total, 10);
        } else {
            if (activeFields.includes('floor') && formData.floor) objectData.floor = parseInt(formData.floor, 10);
            if (activeFields.includes('floors_total') && formData.floors_total) objectData.floorsTotal = parseInt(formData.floors_total, 10);
        }

        if (activeFields.includes('wall_material') && formData.wall_material) {
            objectData.wallMaterial = formData.wall_material.trim();
        }

        const attributesObj = {};

        // Записываем rent_type только если выбрана аренда, с нужным текстом
        if (formData.deal_type === 'LONG_RENT') {
            attributesObj.type_rent = 'долгосрочная аренда';
        } else if (formData.deal_type === 'SHORT_RENT') {
            attributesObj.type_rent = 'краткосрочная аренда';
        } else if (formData.deal_type === 'RENT') {
            attributesObj.type_rent = 'общая аренда';
        }

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

        photos.forEach(photo => {
            payload.append('images', photo.file);
        });

        try {
            await api.post('/objects', payload, { headers: { 'Content-Type': 'multipart/form-data' } });

            setSuccessMessage('🎉 Объявление успешно опубликовано! Через несколько секунд вы будете перенаправлены на главную...');
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => { navigate('/'); }, 4000);
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
            <style>
                {`
                .photo-card-wrapper { position: relative; transition: opacity 0.2s, transform 0.2s; }
                .photo-card-wrapper.drag-over-left::before, .add-photo-btn-wrapper.drag-over-left::before { content: ''; position: absolute; left: 5px; top: 7.5px; height: 120px; width: 4px; background: #007bff; border-radius: 4px; box-shadow: 0 0 8px rgba(0, 123, 255, 0.6); pointer-events: none; z-index: 10; }
                .photo-card-wrapper.drag-over-right::after { content: ''; position: absolute; right: 5px; top: 7.5px; height: 120px; width: 4px; background: #007bff; border-radius: 4px; box-shadow: 0 0 8px rgba(0, 123, 255, 0.6); pointer-events: none; z-index: 10; }
                .photo-card-wrapper.drag-over { margin-left: 30px; }
                .photo-card-wrapper.drag-over::before { content: ''; position: absolute; left: -18px; top: 0; height: 120px; width: 6px; background: #007bff; border-radius: 4px; box-shadow: 0 0 10px rgba(0, 123, 255, 0.5); pointer-events: none; }
                .add-photo-btn.drag-over { transform: scale(1.05); border-color: #007bff !important; background: #e6f2ff !important; }
                .photo-card-wrapper .delete-photo-btn { opacity: 0; transition: opacity 0.2s ease, background 0.2s ease; }
                .photo-card-wrapper:hover .delete-photo-btn { opacity: 1; }
                .delete-photo-btn:hover { background: #ff3b30 !important; }
                .end-dropzone { width: 20px; height: 120px; position: relative; }
                .end-dropzone.drag-over { margin-left: 10px; }
                .end-dropzone.drag-over::before { content: ''; position: absolute; left: 7px; top: 0; height: 120px; width: 6px; background: #007bff; border-radius: 4px; box-shadow: 0 0 10px rgba(0, 123, 255, 0.5); pointer-events: none; }
                
                /* Стили для кнопок выбора типа сделки */
                .deal-type-selector { 
                    display: flex; 
                    gap: 10px; 
                    margin-bottom: 20px; 
                }

                .deal-type-btn { 
                    flex: 1; 
                    padding: 12px; 
                    border: 1px solid #222; 
                    background: #333; /* Темный фон */
                    color: #ffffff;    /* Белый текст */
                    border-radius: 8px; 
                    cursor: pointer; 
                    transition: 0.2s; 
                    font-weight: 500; 
                    font-size: 15px; 
                }

                .deal-type-btn.active { 
                    background: #007bff; /* Синий цвет для активной кнопки (можно заменить на #000 для полностью черного) */
                    color: white; 
                    border-color: #007bff; 
                    box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3); 
                }

                .deal-type-btn:hover:not(.active) { 
                    background: #444; /* Чуть светлее при наведении */
                    border-color: #555;
                    color: #ffffff;
                }
            `}
            </style>

            <div className="add-header">
                <button className="back-link" onClick={() => navigate(-1)} disabled={isSubmitting}>← Назад</button>
                <h2>Добавить объект недвижимости</h2>
            </div>

            {globalError && (
                <div className="error-message" style={{ marginTop: '-10px', color: '#ff3b30', background: 'rgba(255, 59, 48, 0.1)', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid rgba(255, 59, 48, 0.3)' }}>
                    {globalError}
                </div>
            )}

            {successMessage && (
                <div className="success-message" style={{ marginTop: '-10px', color: '#28a745', background: 'rgba(40, 167, 69, 0.1)', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #28a745', fontWeight: 'bold', textAlign: 'center' }}>
                    {successMessage}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-section">
                    <h3>Тип сделки</h3>
                    <div className="deal-type-selector">
                        {/* Кнопка Продажа — доступна всегда */}
                        <button
                            type="button"
                            className={`deal-type-btn ${formData.deal_type === 'SALE' ? 'active' : ''}`}
                            onClick={() => handleDealTypeChange('SALE')}
                            disabled={isSubmitting}
                        >
                            Продажа
                        </button>

                        {/* Долгосрочная аренда */}
                        {DEAL_TYPE_MATRIX[formData.type]?.includes('LONG_RENT') ? (
                            <button
                                type="button"
                                className={`deal-type-btn ${formData.deal_type === 'LONG_RENT' ? 'active' : ''}`}
                                onClick={() => handleDealTypeChange('LONG_RENT')}
                                disabled={isSubmitting}
                            >
                                Долгосрочная аренда
                            </button>
                        ) : !DEAL_TYPE_MATRIX[formData.type]?.includes('RENT') ? (
                            <button
                                type="button"
                                className="deal-type-btn"
                                disabled
                                title={`Для объекта «${formData.type}» аренда недоступна`}
                                style={{ opacity: 0.4, cursor: 'not-allowed' }}
                            >
                                Долгосрочная аренда
                            </button>
                        ) : null}

                        {/* Общая аренда (для Склада, Коммерции и т.д.) */}
                        {DEAL_TYPE_MATRIX[formData.type]?.includes('RENT') && (
                            <button
                                type="button"
                                className={`deal-type-btn ${formData.deal_type === 'RENT' ? 'active' : ''}`}
                                onClick={() => handleDealTypeChange('RENT')}
                                disabled={isSubmitting}
                            >
                                Аренда
                            </button>
                        )}

                        {/* Краткосрочная аренда */}
                        {DEAL_TYPE_MATRIX[formData.type]?.includes('SHORT_RENT') ? (
                            <button
                                type="button"
                                className={`deal-type-btn ${formData.deal_type === 'SHORT_RENT' ? 'active' : ''}`}
                                onClick={() => handleDealTypeChange('SHORT_RENT')}
                                disabled={isSubmitting}
                            >
                                Краткосрочная аренда
                            </button>
                        ) : !DEAL_TYPE_MATRIX[formData.type]?.includes('RENT') ? (
                            <button
                                type="button"
                                className="deal-type-btn"
                                disabled
                                title={`Для объекта «${formData.type}» посуточная аренда недоступна`}
                                style={{ opacity: 0.4, cursor: 'not-allowed' }}
                            >
                                Краткосрочная аренда
                            </button>
                        ) : null}
                    </div>

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
                            <input
                                className={errors.title ? 'input-error' : ''}
                                type="text" name="title" value={formData.title} onChange={handleChange} required disabled={isSubmitting}
                            />
                            {errors.title && <span className="error-text">{errors.title}</span>}
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
                                    type="number" step="0.01" min="2" name="area_total"
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
                                    type="number" step="0.01" min="2" name="area_living"
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
                                    type="number" step="0.01" min="0.01" name="plot_area_acres"
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
                                    type="number" step="0.01" min="0.01" name="ceiling_height_m"
                                    value={formData.ceiling_height_m} onChange={handleChange} required
                                    onWheel={(e) => e.target.blur()} disabled={isSubmitting}
                                />
                            </div>
                        )}
                        {activeFields.includes('power_kw') && (
                            <div className="input-field">
                                <label>Электрическая мощность (кВт)</label>
                                <input
                                    type="number" step="0.1" min="0.1" name="power_kw"
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
                                <label>{getPriceLabel()}</label>
                                <input
                                    type="number" min="0.01" step="0.01" name="price_total"
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

                <div className="form-section photo-upload-section" style={{ opacity: isSubmitting ? 0.5 : 1, pointerEvents: isSubmitting ? 'none' : 'auto' }}>
                    <h3>Фотографии</h3>

                    {errors.images && (
                        <div className="error-text" style={{ marginBottom: '15px', fontSize: '15px', background: 'rgba(255,59,48,0.1)', padding: '10px', borderRadius: '8px', color: '#ff3b30' }}>
                            {errors.images}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-7.5px', alignItems: 'flex-start' }}>

                        {photos.map((photo, index) => {
                            const isDraggingOverThis = dragOverId === photo.id && draggedId !== photo.id;
                            const dropClass = isDraggingOverThis ? (dropPosition === 'left' ? 'drag-over-left' : 'drag-over-right') : '';

                            return (
                                <div
                                    key={photo.id}
                                    className={`photo-card-wrapper ${dropClass}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, photo.id)}
                                    onDragOver={(e) => handleDragOver(e, photo.id)}
                                    onDrop={(e) => handleDrop(e, photo.id)}
                                    onDragEnd={handleDragEnd}
                                    style={{
                                        padding: '7.5px',
                                        cursor: 'grab',
                                        opacity: draggedId === photo.id ? 0.4 : 1,
                                        transform: draggedId === photo.id ? 'scale(0.95)' : 'scale(1)'
                                    }}
                                >
                                    <div
                                        style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                        onClick={() => setLightboxIndex(index)}
                                    >
                                        <img src={photo.url} alt={`preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable="false" />

                                        <button
                                            className="delete-photo-btn"
                                            onClick={(e) => removePhoto(photo.id, e)}
                                            type="button"
                                            style={{
                                                position: 'absolute', top: '5px', right: '5px', width: '26px', height: '26px',
                                                background: 'rgba(0, 0, 0, 0.6)', color: 'white', border: 'none', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                fontSize: '18px', fontWeight: 'bold', zIndex: 2
                                            }}
                                            title="Удалить фото"
                                        >
                                            −
                                        </button>
                                    </div>
                                    <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: '#555', fontWeight: '500' }}>
                                        {index + 1}-я
                                    </div>
                                </div>
                            );
                        })}

                        <div
                            className={`add-photo-btn-wrapper ${dragOverId === 'END' ? 'drag-over-left' : ''}`}
                            onDragOver={(e) => handleDragOver(e, 'END')}
                            onDrop={(e) => handleDrop(e, 'END')}
                            style={{ padding: '7.5px', position: 'relative' }}
                        >
                            <div
                                className="add-photo-btn"
                                onClick={() => document.getElementById('photo-upload-input').click()}
                                style={{
                                    width: '120px', height: '120px', border: `2px dashed ${errors.images ? '#ff3b30' : '#ccc'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', borderRadius: '8px', fontSize: '24px', fontWeight: 'bold',
                                    color: '#666', background: '#f9f9f9', transition: 'background 0.2s, border-color 0.2s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#eee'; e.currentTarget.style.borderColor = '#999'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = '#f9f9f9'; e.currentTarget.style.borderColor = errors.images ? '#ff3b30' : '#ccc'; }}
                            >
                                + {photos.length + 1}
                            </div>
                        </div>
                        <input id="photo-upload-input" type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} disabled={isSubmitting} />

                    </div>
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

            {/* === ЛАЙТБОКС (ГАЛЕРЕЯ НА ВЕСЬ ЭКРАН) === */}
            {lightboxIndex !== null && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onClick={() => setLightboxIndex(null)}
                >
                    <button
                        style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: '#fff', fontSize: '40px', cursor: 'pointer', zIndex: 10001 }}
                        onClick={() => setLightboxIndex(null)}
                    >
                        &times;
                    </button>

                    {photos.length > 1 && (
                        <button
                            style={{ position: 'absolute', left: '30px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '30px', padding: '15px 20px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', zIndex: 10001 }}
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev > 0 ? prev - 1 : photos.length - 1); }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        >
                            &#10094;
                        </button>
                    )}

                    <img
                        src={photos[lightboxIndex].url}
                        style={{ maxHeight: '90vh', maxWidth: '80vw', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 10000 }}
                        onClick={(e) => e.stopPropagation()}
                        alt="Enlarged view"
                    />

                    {photos.length > 1 && (
                        <button
                            style={{ position: 'absolute', right: '30px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '30px', padding: '15px 20px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', zIndex: 10001 }}
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev < photos.length - 1 ? prev + 1 : 0); }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        >
                            &#10095;
                        </button>
                    )}

                    <div style={{ position: 'absolute', bottom: '30px', color: '#fff', fontSize: '18px', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '20px' }}>
                        {lightboxIndex + 1} из {photos.length}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddObject;