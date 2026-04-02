import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        email: email,
        password: password
      });

      if (response.data) {
        // Сохраняем объект пользователя в браузере
        localStorage.setItem('user', JSON.stringify(response.data));
        // Переходим на главную
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Неверный email или пароль');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '300px', gap: '10px' }}>
        <h2>Вход в систему</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Войти</button>
        <p>Нет аккаунта? <Link to="/register">Регистрация</Link></p>
      </form>
    </div>
  );
};

export default Login;