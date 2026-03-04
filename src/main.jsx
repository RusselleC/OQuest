// Polyfill window.storage for local development
window.storage = {
  _data: JSON.parse(localStorage.getItem('__storage__') || '{}'),
  _save() { localStorage.setItem('__storage__', JSON.stringify(this._data)); },
  async get(key) {
    const val = this._data[key];
    if (val === undefined) throw new Error('Key not found');
    return { key, value: val };
  },
  async set(key, value) {
    this._data[key] = value; this._save();
    return { key, value };
  },
  async delete(key) {
    delete this._data[key]; this._save();
    return { key, deleted: true };
  },
  async list(prefix = '') {
    const keys = Object.keys(this._data).filter(k => k.startsWith(prefix));
    return { keys };
  }
};

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)