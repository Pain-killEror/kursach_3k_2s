import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ObjectDetails from './pages/ObjectDetails';
import AddObject from './pages/AddObject';
import Admin from './pages/Admin'; // <-- Импортируем нашу будущую страницу админки

// Защищает обычные приватные страницы (если НЕТ токена -> на логин)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// НОВОЕ: Защищает страницу админа (если НЕТ токена ИЛИ роль НЕ ADMIN -> на главную)
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    user = null;
  }

  if (!token || user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/object/:id"
          element={
            <ProtectedRoute>
              <ObjectDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-object"
          element={
            <ProtectedRoute>
              <AddObject />
            </ProtectedRoute>
          }
        />

        {/* НОВЫЙ РОУТ ДЛЯ АДМИНА */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;