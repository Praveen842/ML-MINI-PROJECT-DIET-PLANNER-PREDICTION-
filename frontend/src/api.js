import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const trainModels = async () => {
  const response = await axios.post(`${API_URL}/train`);
  return response.data;
};

export const getMetrics = async () => {
  const response = await axios.get(`${API_URL}/metrics`);
  return response.data;
};

export const predictDiet = async (data) => {
  const response = await axios.post(`${API_URL}/predict`, data);
  return response.data;
};

export const getModelRepresentations = async () => {
  const response = await axios.get(`${API_URL}/model-representations`);
  return response.data;
};

