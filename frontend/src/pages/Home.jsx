import React, { useEffect, useState } from 'react';
import api from '../api/axios'; // <--- Импортируем наш настроенный Axios!
import ObjectCard from '../components/ObjectCard';
import './Home.css';

const Home = () => {
  const [objects, setObjects] = useState([]);

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchObjects = async () => {
      try {
        // <--- Запрос стал супер-коротким! Нет полного URL и нет возни с headers.
        // Interceptor сам добавит токен.
        const response = await api.get('/objects');
        setObjects(response.data);
      } catch (error) {
        console.error('Error fetching objects:', error);
        // Если сервер ответил 401 или 403 (токен недействителен), выкидываем из аккаунта
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          handleLogout();
        }
      }
    };

    if (token) {
      fetchObjects();
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="home-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
        <h1>Инвестиционные объекты</h1>
        <div>
          <span style={{ marginRight: '15px' }}>Привет, {user ? user.name : 'Гость'}!</span>
          <button onClick={handleLogout}>Выйти</button>
        </div>
      </header>

      <div className="objects-grid">
        {objects.map(obj => (
          <ObjectCard key={obj.id} object={obj} />
        ))}
      </div>
    </div>
  );
};

export default Home;