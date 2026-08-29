import { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: localStorage.getItem('cc_token') || null,
  loading: true // true until we've checked for an existing session
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, token: null, loading: false };
    case 'HYDRATE_DONE':
      return { ...state, user: action.payload.user, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Session survives a page refresh: if a token exists, confirm it's still valid
  useEffect(() => {
    const token = localStorage.getItem('cc_token');
    if (!token) {
      dispatch({ type: 'HYDRATE_DONE', payload: { user: null } });
      return;
    }

    api.get('/auth/me')
      .then((res) => dispatch({ type: 'HYDRATE_DONE', payload: { user: res.data.user } }))
      .catch(() => dispatch({ type: 'HYDRATE_DONE', payload: { user: null } }));
  }, []);

  const login = (token, user) => {
    localStorage.setItem('cc_token', token);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
  };

  const logout = () => {
    localStorage.removeItem('cc_token');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);