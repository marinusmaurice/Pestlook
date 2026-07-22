import { downloadFile, uploadFile } from './client.js';

export function downloadObservationTemplate(fieldId) {
  return downloadFile('/import/observations/template', { fieldId });
}

export function validateImportFile(file) {
  return uploadFile('/import/observations/validate', file);
}

export function commitImportFile(file) {
  return uploadFile('/import/observations/commit', file);
}
