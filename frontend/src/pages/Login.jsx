import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Новые стейты для завершения регистрации через Google ---
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [googleData, setGoogleData] = useState({ email: '', name: '', token: '' });
  const [extraData, setExtraData] = useState({ phoneNumber: '', role: 'INVESTOR' });

  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleExtraChange = (e) => setExtraData({ ...extraData, [e.target.name]: e.target.value });

  // Обычный вход
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка авторизации. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  // Вход через Google
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/google', {
        token: credentialResponse.credential
      });

      // Перехватываем нового пользователя!
      if (response.data.needsRegistration) {
        setGoogleData({
          email: response.data.email,
          name: response.data.name,
          token: credentialResponse.credential
        });
        setNeedsRegistration(true);
      } else {
        // Обычный успешный вход
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/');
        window.location.reload();
      }
    } catch (err) {
      setError('Ошибка при входе через Google.');
    } finally {
      setLoading(false);
    }
  };

  // Завершение регистрации после Google OAuth
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Создаем пользователя в БД
      await api.post('/auth/register', {
        name: googleData.name,
        email: googleData.email,
        phoneNumber: extraData.phoneNumber,
        role: extraData.role,
        password: "" // Пустой пароль, так как вход через Google
      });

      // 2. Сразу после успешной регистрации авторизуем его снова через сохраненный токен
      const loginResponse = await api.post('/auth/google', { token: googleData.token });
      localStorage.setItem('token', loginResponse.data.token);
      localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
      navigate('/');
      window.location.reload();

    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка завершения регистрации.');
    } finally {
      setLoading(false);
    }
  };

  // ЕСЛИ ТРЕБУЕТСЯ ЗАВЕРШЕНИЕ РЕГИСТРАЦИИ, ПОКАЗЫВАЕМ ТОЛЬКО ЭТУ ФОРМУ
  if (needsRegistration) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ padding: '24px 32px' }}>
          <h2 style={{ marginBottom: '4px', fontSize: '1.5rem', textAlign: 'center', color: '#fff' }}>
            Почти готово!
          </h2>
          <p className="auth-subtitle" style={{ marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center', color: '#a1a1aa' }}>
            Укажите вашу роль и номер телефона для завершения регистрации
          </p>

          {error && <div className="error-message" style={{ padding: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>{error}</div>}

          <form onSubmit={handleCompleteRegistration} className="auth-form" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
            <div className="input-group" style={{ gap: '4px', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.85rem', color: '#e4e4e7' }}>Роль</label>
              <select
                name="role"
                value={extraData.role}
                onChange={handleExtraChange}
                style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff' }}
              >
                <option value="INVESTOR">Инвестор</option>
                <option value="SELLER">Продавец</option>
              </select>
            </div>

            <div className="input-group" style={{ gap: '4px', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.85rem', color: '#e4e4e7' }}>Номер телефона</label>
              <input
                type="tel"
                name="phoneNumber"
                value={extraData.phoneNumber}
                onChange={handleExtraChange}
                placeholder="+375 (44) 000-00-00"
                required
                style={{ padding: '10px 12px' }}
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading} style={{ marginTop: '10px', padding: '10px' }}>
              {loading ? 'Завершение...' : 'Завершить регистрацию'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ОБЫЧНАЯ ФОРМА ЛОГИНА
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ padding: '24px 32px' }}>
        <h2 style={{ marginBottom: '4px', fontSize: '1.5rem', textAlign: 'center', color: '#fff' }}>
          Вход в систему
        </h2>
        <p className="auth-subtitle" style={{ marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center', color: '#a1a1aa' }}>
          Войдите, чтобы работать с портфелем
        </p>

        {error && (
          <div className="error-message" style={{ padding: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
          <div className="input-group" style={{ gap: '4px', display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.85rem', color: '#e4e4e7' }}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
              required
              style={{ padding: '10px 12px' }}
            />
          </div>

          <div className="input-group" style={{ gap: '4px', display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.85rem', color: '#e4e4e7' }}>Пароль</label>
            <div className="password-input-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Ваш пароль"
                required
                style={{ padding: '10px 12px', paddingRight: '40px', width: '100%' }}
              />
              {/* Кнопка появляется только если введен хотя бы один символ */}
              {formData.password.length > 0 && (
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '10px', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0'
                  }}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  )}
                </button>
              )}
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={loading} style={{ marginTop: '10px', padding: '10px' }}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="divider" style={{ margin: '20px 0', textAlign: 'center', color: '#a1a1aa', fontSize: '0.85rem' }}>
          или
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Ошибка при подключении Google.')}
          />
        </div>

        <p className="auth-footer" style={{ marginTop: '10px', textAlign: 'center', fontSize: '0.85rem' }}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;