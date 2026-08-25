// API Configuration - Dynamic base URL with environment detection
import { authUtils } from './authUtils.js';

const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local');

    const baseUrl = isLocalhost
        ? 'http://localhost:8000/api/health'
        : 'https://toolbox.pythonanywhere.com/api/health';

    console.log(`🔗 Health API Environment: ${isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION'} | Base URL: ${baseUrl}`);

    return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

/**
 * DRF error bodies aren't always {"detail": "..."} - validation errors come back
 * field-keyed, e.g. {"value": ["Value must be greater than zero."]}. Pull a
 * human-readable message out of whatever shape comes back, and carry the real
 * status on the Error so callers don't have to string-sniff the message.
 */
const throwHttpError = (errorData, status) => {
    let message = `HTTP error! status: ${status}`;
    if (errorData && typeof errorData === 'object') {
        if (errorData.detail) {
            message = errorData.detail;
        } else {
            const fieldMessages = Object.entries(errorData)
                .filter(([, value]) => Array.isArray(value) || typeof value === 'string')
                .map(([field, value]) => {
                    const text = Array.isArray(value) ? value.join(' ') : value;
                    return field === 'non_field_errors' ? text : `${field}: ${text}`;
                });
            if (fieldMessages.length > 0) {
                message = fieldMessages.join(' ');
            }
        }
    }
    const error = new Error(message);
    error.status = status;
    throw error;
};

const authenticatedFetch = async (url, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...authUtils.authHeader(),
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers, body: options.body });

    if (response.status === 401) {
        authUtils.logout();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
        }
        throw Object.assign(new Error('Authentication failed. Please log in again.'), { status: 401 });
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throwHttpError(errorData, response.status);
    }

    return response;
};

export const handleApiError = (error, operation) => {
    console.error(`Error ${operation}:`, error);
    const status = error.status;

    if (status === 401) {
        return { type: 'auth_error', message: 'Please log in again.' };
    } else if (status === 400) {
        return { type: 'validation_error', message: error.message };
    } else if (status === 403) {
        return { type: 'permission_error', message: 'You do not have permission to perform this action.' };
    } else if (status === 404) {
        return { type: 'not_found', message: 'Resource not found.' };
    } else {
        return { type: 'network_error', message: error.message || `Failed to ${operation}. Please try again.` };
    }
};

/** List health metric entries, optionally filtered by metric_type / date range */
export const getMetrics = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.metricType) params.append('metric_type', filters.metricType);
        if (filters.dateFrom) params.append('date_from', filters.dateFrom);
        if (filters.dateTo) params.append('date_to', filters.dateTo);
        params.append('page_size', filters.pageSize || 30);

        const response = await authenticatedFetch(`${API_BASE_URL}/metrics/?${params}`);
        const data = await response.json();
        return {
            results: data.results || [],
            count: data.count || 0
        };
    } catch (error) {
        throw handleApiError(error, 'fetch health metrics');
    }
};

/** Latest reading + 7-day stats for every metric type */
export const getMetricsSummary = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/metrics/summary/`);
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'fetch health summary');
    }
};

export const addMetric = async (metricData) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/metrics/`, {
            method: 'POST',
            body: JSON.stringify(metricData)
        });
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'add health metric');
    }
};

export const updateMetric = async (metricId, metricData) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/metrics/${metricId}/`, {
            method: 'PATCH',
            body: JSON.stringify(metricData)
        });
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'update health metric');
    }
};

export const deleteMetric = async (metricId) => {
    try {
        await authenticatedFetch(`${API_BASE_URL}/metrics/${metricId}/`, {
            method: 'DELETE'
        });
    } catch (error) {
        throw handleApiError(error, 'delete health metric');
    }
};
