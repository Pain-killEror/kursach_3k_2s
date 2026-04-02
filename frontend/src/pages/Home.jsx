import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ObjectCard from '../components/ObjectCard';
import './Home.css';

const Home = () => {
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchObjects = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/objects');
        setObjects(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке объектов:', err);
        setError('Не удалось загрузить данные об объектах недвижимости.');
        setLoading(false);
      }
    };

    fetchObjects();
  }, []);

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-spinner">Загрузка объектов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <h1 className="home-title">Каталог недвижимости</h1>
      {objects.length === 0 ? (
        <p className="no-data-message">Объекты временно отсутствуют.</p>
      ) : (
        <div className="objects-grid">
          {objects.map((obj) => (
            <ObjectCard key={obj.id} object={obj} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
