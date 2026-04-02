import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/axios';
import ObjectCard from '../components/ObjectCard';
import './Home.css';

const Home = () => {
  const [allObjects, setAllObjects] = useState([]); // Все объекты с сервера
  const [displayedObjects, setDisplayedObjects] = useState([]); // Отфильтрованные объекты

  // Состояния фильтров
  const [filters, setFilters] = useState({
    city: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: ''
  });

  // Состояние сортировки
  const [sortOption, setSortOption] = useState('default');

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  // 1. Загрузка данных один раз при монтировании
  useEffect(() => {
    const fetchObjects = async () => {
      try {
        const response = await api.get('/objects');
        setAllObjects(response.data);
        setDisplayedObjects(response.data);
      } catch (error) {
        console.error('Error fetching objects:', error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          handleLogout();
        }
      }
    };

    if (token) {
      fetchObjects();
    }
  }, [token]);

  // 2. Логика фильтрации и сортировки (выполняется на клиенте при изменении фильтров)
  useEffect(() => {
    let result = [...allObjects];

    // --- ФИЛЬТРАЦИЯ ---
    if (filters.city) {
      result = result.filter(obj =>
        obj.city && obj.city.toLowerCase().includes(filters.city.toLowerCase())
      );
    }
    if (filters.minPrice) {
      result = result.filter(obj => obj.priceTotal >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter(obj => obj.priceTotal <= Number(filters.maxPrice));
    }
    if (filters.minArea) {
      result = result.filter(obj => obj.areaTotal >= Number(filters.minArea));
    }
    if (filters.maxArea) {
      result = result.filter(obj => obj.areaTotal <= Number(filters.maxArea));
    }

    // --- СОРТИРОВКА ---
    switch (sortOption) {
      case 'price_asc':
        result.sort((a, b) => a.priceTotal - b.priceTotal);
        break;
      case 'price_desc':
        result.sort((a, b) => b.priceTotal - a.priceTotal);
        break;
      case 'area_asc':
        result.sort((a, b) => a.areaTotal - b.areaTotal);
        break;
      case 'area_desc':
        result.sort((a, b) => b.areaTotal - a.areaTotal);
        break;
      default:
        // default - оставляем как пришло с сервера
        break;
    }

    setDisplayedObjects(result);
  }, [allObjects, filters, sortOption]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.reload();
  };

  // Получаем список уникальных городов для выпадающего списка
  const uniqueCities = useMemo(() => {
    const cities = allObjects.map(obj => obj.city).filter(Boolean);
    return [...new Set(cities)].sort();
  }, [allObjects]);

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Инвестиционные объекты</h1>
        <div>
          <span style={{ marginRight: '15px' }}>Привет, {user ? user.name : 'Гость'}!</span>
          <button onClick={handleLogout} className="logout-btn">Выйти</button>
        </div>
      </header>

      {/* Панель фильтров и сортировки */}
      <div className="filters-container">
        <div className="filter-group">
          <label>Город:</label>
          <select name="city" value={filters.city} onChange={handleFilterChange}>
            <option value="">Все города</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Цена:</label>
          <div className="inputs-row">
            <input type="number" name="minPrice" placeholder="От" value={filters.minPrice} onChange={handleFilterChange} />
            <input type="number" name="maxPrice" placeholder="До" value={filters.maxPrice} onChange={handleFilterChange} />
          </div>
        </div>

        <div className="filter-group">
          <label>Площадь (м²):</label>
          <div className="inputs-row">
            <input type="number" name="minArea" placeholder="От" value={filters.minArea} onChange={handleFilterChange} />
            <input type="number" name="maxArea" placeholder="До" value={filters.maxArea} onChange={handleFilterChange} />
          </div>
        </div>

        <div className="filter-group">
          <label>Сортировка:</label>
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
            <option value="default">По умолчанию</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="area_desc">Сначала большие</option>
            <option value="area_asc">Сначала маленькие</option>
          </select>
        </div>

        <button
          className="reset-btn"
          onClick={() => setFilters({ city: '', minPrice: '', maxPrice: '', minArea: '', maxArea: '' })}
        >
          Сбросить
        </button>
      </div>

      {/* Индикатор количества объектов */}
      <div className="results-info">
        Найдено объектов: {displayedObjects.length}
      </div>

      <div className="objects-grid">
        {displayedObjects.length > 0 ? (
          displayedObjects.map(obj => (
            <ObjectCard key={obj.id} object={obj} />
          ))
        ) : (
          <div className="no-data-message">Объекты не найдены</div>
        )}
      </div>
    </div>
  );
};

export default Home;