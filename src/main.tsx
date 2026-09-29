import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// общие стили подключаются раньше компонентов: стили компонентов идут после базовых
import './styles/tokens.css';
import './styles/base.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
