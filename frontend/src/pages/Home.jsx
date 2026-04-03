import React, { useEffect, useState, useMemo, useRef } from 'react';
import api from '../api/axios';
import ObjectCard from '../components/ObjectCard';
import './Home.css';

// ПОЛНАЯ СИНХРОНИЗАЦИЯ С generator.py
const CATEGORY_CONFIG = {
  'КВАРТИРА': [
    { name: 'rooms_count', label: 'Комнат', type: 'number' },
    { name: 'renovation_state', label: 'Ремонт', type: 'select', options: ['Черновая отделка', 'Предчистовая', 'Плохой ремонт', 'Средний ремонт', 'Хороший ремонт', 'Элитный ремонт'] },
    { name: 'has_balcony', label: 'Балкон', type: 'boolean' }
  ],
  'ДОМ': [
    { name: 'house_type', label: 'Тип дома', type: 'select', options: ['Коттедж', 'Таунхаус', 'Старый дом'] },
    { name: 'heating_type', label: 'Отопление', type: 'select', options: ['Газ', 'Твердотопливный', 'Электрическое'] },
    { name: 'land_area', label: 'Участок (сот)', type: 'number' }
  ],
  'СКЛАД': [
    { name: 'warehouse_type', label: 'Тип склада', type: 'select', options: ['Отапливаемый', 'Холодный'] },
    { name: 'has_ramp', label: 'Пандус', type: 'boolean' },
    { name: 'ceiling_height', label: 'Потолки (м)', type: 'number' }
  ],
  'ОФИС': [
    { name: 'business_center_class', label: 'Класс БЦ', type: 'select', options: ['A', 'B', 'C'] },
    { name: 'has_parking', label: 'Парковка', type: 'boolean' }
  ],
  'УЧАСТОК': [
    { name: 'land_category', label: 'Категория', type: 'select', options: ['ИЖС', 'СНТ', 'Пром'] },
    { name: 'has_electricity', label: 'Свет', type: 'boolean' },
    { name: 'has_gas', label: 'Газ', type: 'boolean' }
  ],
  'ГАРАЖ': [
    { name: 'garage_type', label: 'Тип', type: 'select', options: ['Металлический', 'Кирпичный'] },
    { name: 'is_heated', label: 'Обогрев', type: 'boolean' }
  ],
  'ТОРГОВОЕ_ПОМЕЩЕНИЕ': [
    { name: 'line_number', label: 'Линия', type: 'select', options: ['1-я линия', '2-я линия'] },
    { name: 'has_showcase', label: 'Витрина', type: 'boolean' }
  ],
  'ПРОИЗВОДСТВО': [
    { name: 'power_capacity', label: 'Мощность (кВт)', type: 'number' },
    { name: 'has_crane_beam', label: 'Кран-балка', type: 'boolean' }
  ]
};

const Home = () => {
  const [allObjects, setAllObjects] = useState([]);
  const [displayedObjects, setDisplayedObjects] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [filters, setFilters] = useState({
    city: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '',
    categories: [], attributes: {}
  });

  const [sortOption, setSortOption] = useState('default');
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchObjects = async () => {
      try {
        const response = await api.get('/objects');
        setAllObjects(response.data);
      } catch (error) { console.error('Ошибка:', error); }
    };
    if (token) fetchObjects();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Логика фильтрации
  useEffect(() => {
    let result = [...allObjects];

    if (filters.city) result = result.filter(obj => obj.city === filters.city);
    if (filters.minPrice) result = result.filter(obj => Number(obj.priceTotal) >= Number(filters.minPrice));
    if (filters.maxPrice) result = result.filter(obj => Number(obj.priceTotal) <= Number(filters.maxPrice));
    if (filters.minArea) result = result.filter(obj => Number(obj.areaTotal) >= Number(filters.minArea));
    if (filters.maxArea) result = result.filter(obj => Number(obj.areaTotal) <= Number(filters.maxArea));

    if (filters.categories.length > 0) {
      result = result.filter(obj => filters.categories.includes(obj.category));
    }

    const activeAttrKeys = Object.keys(filters.attributes).filter(k =>
      filters.attributes[k] !== '' && filters.attributes[k] !== null
    );

    if (activeAttrKeys.length > 0) {
      result = result.filter(obj => {
        // Парсим attributes, так как в БД они часто лежат как строка
        const objAttrs = typeof obj.attributes === 'string' ? JSON.parse(obj.attributes) : obj.attributes;

        return activeAttrKeys.every(attrKey => {
          const isApplicable = CATEGORY_CONFIG[obj.category]?.some(f => f.name === attrKey);
          if (!isApplicable) return true; // Оставляем объект, если фильтр к нему не относится

          const filterVal = filters.attributes[attrKey];
          const objVal = objAttrs ? objAttrs[attrKey] : null;

          if (typeof filterVal === 'boolean') return !!objVal === filterVal;
          if (objVal === null || objVal === undefined) return false;

          return String(objVal).toLowerCase() === String(filterVal).toLowerCase();
        });
      });
    }

    // Сортировка
    if (sortOption === 'price_asc') result.sort((a, b) => Number(a.priceTotal) - Number(b.priceTotal));
    else if (sortOption === 'price_desc') result.sort((a, b) => Number(b.priceTotal) - Number(a.priceTotal));
    else if (sortOption === 'area_desc') result.sort((a, b) => Number(b.areaTotal) - Number(a.areaTotal));

    setDisplayedObjects(result);
  }, [allObjects, filters, sortOption]);

  const toggleCategory = (cat) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(cat) ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat]
    }));
  };

  const handleAttrChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [name]: value }
    }));
  };

  const uniqueCities = useMemo(() =>
    [...new Set(allObjects.map(obj => obj.city).filter(Boolean))].sort()
    , [allObjects]);

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="brand">💎 InvestHub</div>

        <div className="user-profile-container" ref={dropdownRef}>
          <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span className="user-nickname">{user?.name || 'Гость'}</span>
            <div className="avatar-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>

          {isMenuOpen && (
            <div className="user-dropdown-menu">
              <div className="dropdown-header">
                <p className="d-name">{user?.name}</p>
                <p className="d-email">{user?.email}</p>
              </div>
              <button className="dropdown-item">Мой портфель</button>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="dropdown-item logout">Выйти</button>
            </div>
          )}
        </div>
      </header>

      <div className="filter-wrapper">
        <div className="main-filter-row">
          <div className="f-box">
            <label>Город</label>
            <select value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}>
              <option value="">Все города</option>
              {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="f-box">
            <label>Бюджет</label>
            <div className="dual-inputs">
              <input type="number" placeholder="От" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} />
              <input type="number" placeholder="До" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
            </div>
          </div>

          <button className={`adv-toggle ${showAdvanced ? 'on' : ''}`} onClick={() => setShowAdvanced(!showAdvanced)}>
            Параметры {showAdvanced ? '✕' : '⚙️'}
          </button>

          <div className="f-box">
            <label>Сортировка</label>
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
              <option value="default">По дате</option>
              <option value="price_asc">Дешевле</option>
              <option value="price_desc">Дороже</option>
              <option value="area_desc">Больше м²</option>
            </select>
          </div>

          <button className="reset-min" onClick={() => setFilters({ city: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '', categories: [], attributes: {} })}>✕</button>
        </div>

        {showAdvanced && (
          <div className="advanced-dropdown">
            <p className="section-title">Категория недвижимости</p>
            <div className="cat-chips">
              {Object.keys(CATEGORY_CONFIG).map(cat => (
                <button key={cat} className={`chip ${filters.categories.includes(cat) ? 'active' : ''}`} onClick={() => toggleCategory(cat)}>
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            {filters.categories.length > 0 && (
              <div className="dynamic-grid">
                {filters.categories.map(cat => (
                  CATEGORY_CONFIG[cat].map(f => (
                    <div key={f.name} className="attr-item">
                      <label>{f.label}</label>
                      {f.type === 'select' ? (
                        <select onChange={(e) => handleAttrChange(f.name, e.target.value)}>
                          <option value="">Любой</option>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === 'boolean' ? (
                        <div className="toggle-box" onClick={() => handleAttrChange(f.name, !filters.attributes[f.name])}>
                          <div className={`toggle-track ${filters.attributes[f.name] ? 'active' : ''}`}></div>
                          <span>Да</span>
                        </div>
                      ) : (
                        <input type="number" placeholder="Значение" onChange={(e) => handleAttrChange(f.name, e.target.value)} />
                      )}
                    </div>
                  ))
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="results-bar">Найдено: {displayedObjects.length} объектов</div>

      <div className="objects-grid">
        {displayedObjects.map(obj => <ObjectCard key={obj.id} object={obj} />)}
      </div>
    </div>
  );
};

export default Home;