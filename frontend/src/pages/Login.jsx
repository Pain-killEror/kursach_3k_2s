import React, { useState } from 'react';
import api from '../api/axios'; // Используем наш настроенный axios
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', {
        email: email,
        password: password
      });

      // ПРОВЕРЯЕМ ТОКЕН, А НЕ ПРОСТО ДАННЫЕ
      if (response.data.token) {
        // Сохраняем ТОКЕН
        localStorage.setItem('token', response.data.token);
        // Сохраняем юзера отдельно
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Неверный email или пароль');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Вход в систему</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn">
            Войти
          </button>
        </form>

        <div className="nav-links">
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;