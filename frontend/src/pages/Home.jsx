import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ObjectCard from '../components/ObjectCard';
import './Home.css';

const Home = () => {
  const [objects, setObjects] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchObjects = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/objects');
        setObjects(response.data);
      } catch (error) {
        console.error('Error fetching objects:', error);
      }
    };
    fetchObjects();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.reload(); // Это активирует ProtectedRoute и перекинет на логин
  };

  return (
    <div className="home-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
        <h1>Инвестиционные объекты</h1>
        <div>
          <span style={{ marginRight: '15px' }}>Привет, {user?.name}!</span>
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