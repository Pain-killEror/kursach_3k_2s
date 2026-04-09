import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ObjectDetails from './pages/ObjectDetails';
import AddObject from './pages/AddObject';

// Защищает приватные страницы (если НЕТ токена -> на логин)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Защищает страницы логина/регистрации (если ЕСТЬ токен -> на главную)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичные страницы оборачиваем в PublicRoute */}
        <Route
          path="/login"
          element={<PublicRoute><Login /></PublicRoute>}
        />
        <Route
          path="/register"
          element={<PublicRoute><Register /></PublicRoute>}
        />

        {/* Защищенная главная страница */}
        <Route
          path="/"
          element={<ProtectedRoute><Home /></ProtectedRoute>}
        />

        <Route path="/object/:id" element={
          <ProtectedRoute>
            <ObjectDetails />
          </ProtectedRoute>
        } />

        <Route path="/add-object" element={<AddObject />} />

        {/* Если ввели несуществующий адрес — кидаем на главную */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;