// File: src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://160.20.22.99:5040/api',
});

export default api;
