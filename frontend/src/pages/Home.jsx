import React, { useEffect, useState, useMemo, useRef } from 'react';
import api from '../api/axios';
import ObjectCard from '../components/ObjectCard';
import { useCurrency } from '../context/CurrencyContext';
import './Home.css';

const CATEGORY_CONFIG = {
  'КВАРТИРА': [
    { name: 'rooms_count', label: 'Комнат', type: 'number' },
    { name: 'renovation_state', label: 'Ремонт', type: 'select', options: ['Черновая отделка', 'Предчистовая', 'Плохой ремонт', 'Средний ремонт', 'Хороший ремонт', 'Элитный ремонт'] },
    { name: 'has_balcony', label: 'Балкон', type: 'boolean' }
  ],
  'ДОМ': [
    { name: 'house_type', label: 'Тип дома', type: 'select', options: ['Коттедж', 'Таунхаус', 'Старый дом'] },
    { name: 'heating_type', label: 'Отопление', type: 'select', options: ['Газ', 'Твердотопливный', 'Электрическое'] },
    { name: 'plot_area_acres', label: 'Участок (сот.)', type: 'range' }
  ],
  'СКЛАД': [
    { name: 'warehouse_type', label: 'Тип склада', type: 'select', options: ['Отапливаемый', 'Холодный'] },
    { name: 'has_ramp', label: 'Пандус', type: 'boolean' },
    { name: 'ceiling_height_m', label: 'Потолки (м)', type: 'range' }
  ],
  'ОФИС': [
    { name: 'business_center_class', label: 'Класс БЦ', type: 'select', options: ['A', 'B', 'C'] },
    { name: 'access_24_7', label: 'Доступ 24/7', type: 'boolean' }
  ],
  'УЧАСТОК': [
    { name: 'land_purpose', label: 'Назначение', type: 'select', options: ['ИЖС', 'Промназначение', 'Коммерция'] },
    { name: 'has_electricity', label: 'Свет', type: 'boolean' },
    { name: 'has_gas', label: 'Газ', type: 'boolean' }
  ],
  'ГАРАЖ': [
    { name: 'material', label: 'Тип', type: 'select', options: ['Металлический', 'Кирпичный'] },
    { name: 'is_covered', label: 'Крытый', type: 'boolean' },
    { name: 'has_pit', label: 'Яма', type: 'boolean' }
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

  const { currency, setCurrency, convertPrice } = useCurrency();

  // Хелпер для корректного приведения значений из БД к булеву типу
  const toBool = (val) => {
    if (val === true || val === 'true' || val === 'True' || val === 1) return true;
    return false;
  };

  useEffect(() => {
    const fetchObjects = async () => {
      try {
        const response = await api.get('/objects');
        setAllObjects(response.data);
      } catch (error) { console.error('Load error:', error); }
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

  useEffect(() => {
    let result = [...allObjects];

    if (filters.city) result = result.filter(obj => obj.city === filters.city);
    if (filters.minPrice) {
      result = result.filter(obj => convertPrice(Number(obj.priceTotal), obj.currency) >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter(obj => convertPrice(Number(obj.priceTotal), obj.currency) <= Number(filters.maxPrice));
    }
    if (filters.minArea) result = result.filter(obj => Number(obj.areaTotal) >= Number(filters.minArea));
    if (filters.maxArea) result = result.filter(obj => Number(obj.areaTotal) <= Number(filters.maxArea));

    if (filters.categories.length > 0) {
      result = result.filter(obj => filters.categories.includes(obj.category));
    }

    const hasActiveAttrFilters = Object.entries(filters.attributes).some(([k, v]) => v !== '' && v !== null && v !== undefined && v !== false);

    if (hasActiveAttrFilters) {
      result = result.filter(obj => {
        const catConfig = CATEGORY_CONFIG[obj.category];
        if (!catConfig) return true;

        let objAttrs = {};
        try {
          objAttrs = typeof obj.attributes === 'string' ? JSON.parse(obj.attributes) : (obj.attributes || {});
        } catch (e) { objAttrs = {}; }

        return catConfig.every(f => {
          if (f.type === 'range') {
            const minVal = filters.attributes[`${f.name}_min`];
            const maxVal = filters.attributes[`${f.name}_max`];
            const objVal = objAttrs[f.name];
            if (minVal && (objVal === undefined || Number(objVal) < Number(minVal))) return false;
            if (maxVal && (objVal === undefined || Number(objVal) > Number(maxVal))) return false;
            return true;
          } else if (f.type === 'boolean') {
            const filterVal = filters.attributes[f.name];
            // Если фильтр не задан ("Любой"), показываем всё
            if (filterVal === undefined || filterVal === '') return true;

            // Строгое соответствие: если фильтр "Да" (true), ищем true. Если "Нет" (false), ищем false.
            return toBool(objAttrs[f.name]) === filterVal;
          } else {
            const filterVal = filters.attributes[f.name];
            if (filterVal === undefined || filterVal === '') return true;
            const objVal = objAttrs[f.name];
            if (objVal === null || objVal === undefined) return false;
            return String(objVal).toLowerCase() === String(filterVal).toLowerCase();
          }
        });
      });
    }

    if (sortOption === 'price_asc') {
      result.sort((a, b) => convertPrice(Number(a.priceTotal), a.currency) - convertPrice(Number(b.priceTotal), b.currency));
    } else if (sortOption === 'price_desc') {
      result.sort((a, b) => convertPrice(Number(b.priceTotal), b.currency) - convertPrice(Number(a.priceTotal), a.currency));
    }

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

  const resetFilters = () => {
    setFilters({ city: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '', categories: [], attributes: {} });
    setShowAdvanced(false);
  };

  const uniqueCities = useMemo(() =>
    [...new Set(allObjects.map(obj => obj.city).filter(Boolean))].sort()
    , [allObjects]);

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="brand">💎 InvestHub</div>

        {/* <--- ДОБАВЛЯЕМ ПЕРЕКЛЮЧАТЕЛЬ СЮДА ---> */}
        <div className="currency-selector" style={{ marginLeft: 'auto', marginRight: '20px' }}>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #444',
              cursor: 'pointer',
              outline: 'none',
              background: '#1a1a1a', // Темный фон
              color: 'white',        // Белый текст
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            <option value="USD">USD ($)</option>
            <option value="BYN">BYN (Br)</option>
          </select>
        </div>

        <div className="user-profile-container" ref={dropdownRef}>
          <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span className="user-nickname">{user?.name || 'Гость'}</span>
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
              </div>
              <button className="dropdown-item">Мой профиль</button>
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
            <label>Бюджет ({currency === 'BYN' ? 'BYN' : '$'})</label>
            <div className="dual-inputs">
              <input type="number" placeholder="От" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} />
              <input type="number" placeholder="До" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
            </div>
          </div>

          <div className="f-box">
            <label>Площадь (м²)</label>
            <div className="dual-inputs">
              <input type="number" placeholder="От" value={filters.minArea} onChange={(e) => setFilters({ ...filters, minArea: e.target.value })} />
              <input type="number" placeholder="До" value={filters.maxArea} onChange={(e) => setFilters({ ...filters, maxArea: e.target.value })} />
            </div>
          </div>

          <button className={`adv-toggle-btn ${showAdvanced ? 'active' : ''}`} onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Закрыть параметры' : 'Все фильтры ⚙️'}
          </button>

          <div className="f-box">
            <label>Сортировка</label>
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
              <option value="default">По умолчанию</option>
              <option value="price_asc">Дешевле</option>
              <option value="price_desc">Дороже</option>
            </select>
          </div>

          <button className="reset-all-btn" onClick={resetFilters} title="Сбросить фильтры">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showAdvanced && (
          <div className="advanced-dropdown">
            <p className="section-title">Категория недвижимости</p>
            <div className="cat-chips">
              {Object.keys(CATEGORY_CONFIG).map(cat => (
                <button
                  key={cat}
                  className={`chip ${filters.categories.includes(cat) ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            {filters.categories.length > 0 && (
              <div className="dynamic-grid">
                {filters.categories.map(cat => (
                  CATEGORY_CONFIG[cat].map(f => (
                    <div key={f.name} className="attr-item">
                      <label className="attr-label">{f.label} <small>({cat})</small></label>
                      {f.type === 'select' ? (
                        <select className="attr-select" value={filters.attributes[f.name] || ''} onChange={(e) => handleAttrChange(f.name, e.target.value)}>
                          <option value="">Любой</option>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === 'boolean' ? (
                        <select
                          className="attr-select"
                          value={filters.attributes[f.name] !== undefined && filters.attributes[f.name] !== '' ? filters.attributes[f.name].toString() : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') handleAttrChange(f.name, ''); // Сброс в "Любой"
                            else handleAttrChange(f.name, val === 'true'); // Конвертация строки в булево значение
                          }}
                        >
                          <option value="">Любой</option>
                          <option value="true">Да</option>
                          <option value="false">Нет</option>
                        </select>
                      ) : f.type === 'range' ? (
                        <div className="dual-inputs attr-range">
                          <input className="attr-input" type="number" placeholder="От" value={filters.attributes[`${f.name}_min`] || ''} onChange={(e) => handleAttrChange(`${f.name}_min`, e.target.value)} />
                          <input className="attr-input" type="number" placeholder="До" value={filters.attributes[`${f.name}_max`] || ''} onChange={(e) => handleAttrChange(`${f.name}_max`, e.target.value)} />
                        </div>
                      ) : (
                        <input className="attr-input" type="number" placeholder="Значение" value={filters.attributes[f.name] || ''} onChange={(e) => handleAttrChange(f.name, e.target.value)} />
                      )}
                    </div>
                  ))
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="results-bar">Найдено объектов: <b>{displayedObjects.length}</b></div>

      <div className="objects-grid">
        {displayedObjects.map(obj => <ObjectCard key={obj.id} object={obj} />)}
      </div>
    </div>
  );
};

export default Home;