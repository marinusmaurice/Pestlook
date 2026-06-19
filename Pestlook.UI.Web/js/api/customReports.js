import { apiRequest } from './client.js';

const BASE = '/custom-reports';

export const customReportsApi = {
  getSchema:   ()         => apiRequest(`${BASE}/schema`),
  run:         (def)      => apiRequest(`${BASE}/run`,    { method: 'POST', body: def }),
  getSaved:    ()         => apiRequest(`${BASE}/saved`),
  createSaved: (req)      => apiRequest(`${BASE}/saved`,       { method: 'POST',   body: req }),
  updateSaved: (id, req)  => apiRequest(`${BASE}/saved/${id}`, { method: 'PUT',    body: req }),
  deleteSaved: (id)       => apiRequest(`${BASE}/saved/${id}`, { method: 'DELETE' }),
};
