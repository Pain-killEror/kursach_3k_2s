import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ],
  'КОММЕРЦИЯ': [
    { name: 'retail_type', label: 'Формат', type: 'select', options: ['Стрит-ритейл', 'ТЦ'] },
    { name: 'power_kw', label: 'Мощность (кВт)', type: 'range' } // ДОБАВЛЕН ФИЛЬТР МОЩНОСТИ
  ]
};

const Home = () => {
  const navigate = useNavigate();
  const [allObjects, setAllObjects] = useState([]);
  const [displayedObjects, setDisplayedObjects] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Инициализируем состояния из sessionStorage, если они там есть
  const [showAdvanced, setShowAdvanced] = useState(() => {
    const saved = sessionStorage.getItem('homeShowAdvanced');
    return saved ? JSON.parse(saved) : false;
  });

  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem('homeFilters');
    return saved ? JSON.parse(saved) : {
      city: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '',
      categories: [], attributes: {}
    };
  });

  const [sortOption, setSortOption] = useState(() => {
    const saved = sessionStorage.getItem('homeSortOption');
    return saved ? saved : 'default';
  });

  // Состояние для отображения кнопки "Наверх"
  const [showScrollTop, setShowScrollTop] = useState(false);

  const user = useMemo(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch (e) { return null; }
  }, []);

  // 1. Сохраняем фильтры и настройки при их изменении
  useEffect(() => {
    sessionStorage.setItem('homeFilters', JSON.stringify(filters));
    sessionStorage.setItem('homeSortOption', sortOption);
    sessionStorage.setItem('homeShowAdvanced', JSON.stringify(showAdvanced));
  }, [filters, sortOption, showAdvanced]);

  // 2. Отслеживаем скролл (для кнопки "Наверх" и сохранения позиции)
  useEffect(() => {
    let timeoutId;
    const handleScroll = () => {
      // Игнорируем фантомные события скролла при первоначальной отрисовке макета!
      if (!hasRestoredScroll.current) return;

      if (window.scrollY > 400) setShowScrollTop(true);
      else setShowScrollTop(false);

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.setItem('homeScrollPosition', window.scrollY);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  // 3. Восстанавливаем позицию скролла, когда объекты загрузились и отрендерились
  useEffect(() => {
    if (hasRestoredScroll.current) return;

    const savedScroll = sessionStorage.getItem('homeScrollPosition');
    if (savedScroll && displayedObjects.length > 0) {
      // Даем 150мс на то, чтобы открытая панель фильтров полностью увеличила высоту страницы
      setTimeout(() => {
        window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
        // Разрешаем сохранять скролл только после успешного прыжка
        setTimeout(() => { hasRestoredScroll.current = true; }, 50);
      }, 150);
    } else if (displayedObjects.length > 0) {
      // Если скролла нет (первый заход), просто разрешаем сохранение
      hasRestoredScroll.current = true;
    }
  }, [displayedObjects]);

  // Функция для кнопки "Наверх"
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const token = localStorage.getItem('token');
  const dropdownRef = useRef(null);
  const hasRestoredScroll = useRef(false);
  const { currency, setCurrency, convertPrice } = useCurrency();

  const activeFiltersText = useMemo(() => {
    const list = [];
    if (filters.city) list.push(`Город: ${filters.city}`);

    if (filters.minPrice || filters.maxPrice) {
      let p = `Бюджет (${currency}): `;
      if (filters.minPrice) p += `от ${filters.minPrice} `;
      if (filters.maxPrice) p += `до ${filters.maxPrice}`;
      list.push(p.trim());
    }

    if (filters.minArea || filters.maxArea) {
      let a = 'Площадь: ';
      if (filters.minArea) a += `от ${filters.minArea} `;
      if (filters.maxArea) a += `до ${filters.maxArea}`;
      list.push(a.trim() + ' м²');
    }

    if (filters.categories.length > 0) {
      list.push(`Тип: ${filters.categories.map(c => c.replace('_', ' ')).join(', ')}`);
    }

    const attrList = [];
    Object.keys(CATEGORY_CONFIG).forEach(cat => {
      // Игнорируем атрибуты категорий, которые не выбраны (если выбрана хоть одна)
      if (filters.categories.length > 0 && !filters.categories.includes(cat)) return;

      CATEGORY_CONFIG[cat].forEach(f => {
        if (f.type === 'range') {
          const min = filters.attributes[`${f.name}_min`];
          const max = filters.attributes[`${f.name}_max`];
          if (min || max) {
            let text = `${f.label}: `;
            if (min) text += `от ${min} `;
            if (max) text += `до ${max}`;
            attrList.push(text.trim());
          }
        } else if (f.type === 'boolean') {
          const val = filters.attributes[f.name];
          if (val === true || val === 'true') attrList.push(`${f.label}: Да`);
          if (val === false || val === 'false') attrList.push(`${f.label}: Нет`);
        } else {
          const val = filters.attributes[f.name];
          if (val) attrList.push(`${f.label}: ${val}`);
        }
      });
    });

    // Убираем дубликаты (если один атрибут есть в разных категориях)
    const uniqueAttrs = [...new Set(attrList)];
    list.push(...uniqueAttrs);

    return list.length > 0 ? list.join(' • ') : null;
  }, [filters, currency]);

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
            if (filterVal === undefined || filterVal === '') return true;
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
  }, [allObjects, filters, sortOption, convertPrice]);

  const toggleCategory = (cat) => {
    setFilters(prev => {
      const isRemoving = prev.categories.includes(cat);

      // Обновляем список категорий
      const newCategories = isRemoving
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat];

      // Копируем текущие атрибуты
      const newAttributes = { ...prev.attributes };

      // Если мы ОТКЛЮЧАЕМ категорию, то удаляем все её внутренние параметры
      if (isRemoving && CATEGORY_CONFIG[cat]) {
        CATEGORY_CONFIG[cat].forEach(f => {
          delete newAttributes[f.name];
          if (f.type === 'range') {
            delete newAttributes[`${f.name}_min`];
            delete newAttributes[`${f.name}_max`];
          }
        });
      }

      return {
        ...prev,
        categories: newCategories,
        attributes: newAttributes
      };
    });
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
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>💎 InvestHub</div>

        <div className="currency-selector" style={{ marginLeft: 'auto', marginRight: '15px' }}>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #444',
              cursor: 'pointer',
              outline: 'none',
              background: '#1a1a1a',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            <option value="USD">USD ($)</option>
            <option value="BYN">BYN (Br)</option>
          </select>
        </div>

        {user?.role === 'SELLER' && (
          <button
            className="sell-property-btn"
            onClick={() => navigate('/add-object')}
            style={{
              marginRight: '15px',
              padding: '8px 18px',
              backgroundColor: '#2ecc71',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              boxShadow: '0 2px 8px rgba(46, 204, 113, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#27ae60';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#2ecc71';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            + Продать недвижимость
          </button>
        )}

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
                <p className="d-role" style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{user?.role}</p>
              </div>
              <button className="dropdown-item">Мой профиль</button>
              <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }} className="dropdown-item logout">Выйти</button>
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
              <input type="number" placeholder="От" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} onWheel={(e) => e.target.blur()} />
              <input type="number" placeholder="До" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} onWheel={(e) => e.target.blur()} />
            </div>
          </div>

          <div className="f-box">
            <label>Площадь (м²)</label>
            <div className="dual-inputs">
              <input type="number" placeholder="От" value={filters.minArea} onChange={(e) => setFilters({ ...filters, minArea: e.target.value })} onWheel={(e) => e.target.blur()} />
              <input type="number" placeholder="До" value={filters.maxArea} onChange={(e) => setFilters({ ...filters, maxArea: e.target.value })} onWheel={(e) => e.target.blur()} />
            </div>
          </div>

          <button
            className={`adv-toggle-btn ${showAdvanced ? 'active' : (filters.categories.length > 0 || Object.values(filters.attributes).some(v => v !== '' && v !== null && v !== undefined && v !== false) ? 'partial-active' : '')}`}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Закрыть фильтры ⚙️' : 'Все фильтры ⚙️'}
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
                            if (val === '') handleAttrChange(f.name, '');
                            else handleAttrChange(f.name, val === 'true');
                          }}
                        >
                          <option value="">Любой</option>
                          <option value="true">Да</option>
                          <option value="false">Нет</option>
                        </select>
                      ) : f.type === 'range' ? (
                        <div className="dual-inputs attr-range">
                          <input className="attr-input" type="number" placeholder="От" value={filters.attributes[`${f.name}_min`] || ''} onChange={(e) => handleAttrChange(`${f.name}_min`, e.target.value)} onWheel={(e) => e.target.blur()} />
                          <input className="attr-input" type="number" placeholder="До" value={filters.attributes[`${f.name}_max`] || ''} onChange={(e) => handleAttrChange(`${f.name}_max`, e.target.value)} onWheel={(e) => e.target.blur()} />
                        </div>
                      ) : (
                        <input className="attr-input" type="number" placeholder="Значение" value={filters.attributes[f.name] || ''} onChange={(e) => handleAttrChange(f.name, e.target.value)} onWheel={(e) => e.target.blur()} />
                      )}
                    </div>
                  ))
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {activeFiltersText && (
        <div style={{ color: '#888', fontSize: '13px', marginBottom: '8px', marginTop: '0px', padding: '0 5px' }}>
          <b>Фильтры:</b> {activeFiltersText}
        </div>
      )}

      <div className="results-bar">Найдено объектов: <b>{displayedObjects.length}</b></div>

      <div className="objects-grid">
        {displayedObjects.map(obj => <ObjectCard key={obj.id} object={obj} />)}
      </div>
      <button
        className={`scroll-to-top-btn ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        title="Наверх"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
};

export default Home;