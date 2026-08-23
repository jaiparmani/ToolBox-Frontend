// API Configuration - Dynamic base URL with environment detection
import { getCsrfHeaders, requiresCsrfProtection } from './csrfUtils.js';
import { apiInterceptor } from './authUtils.js';

const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local');

    const baseUrl = isLocalhost
        ? 'http://localhost:8000/api/expenses'
        : 'https://toolbox.pythonanywhere.com/api/expenses';

    // Environment indicator for debugging
    console.log(`🔗 API Environment: ${isLocalhost ? 'DEVELOPMENT' : 'PRODUCTION'} | Base URL: ${baseUrl}`);

    return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();
// Insights are a sibling app: .../api/expenses -> .../api/insights
const INSIGHTS_BASE_URL = API_BASE_URL.replace(/\/expenses$/, '/insights');
const LLM_BASE_URL = API_BASE_URL.replace(/\/expenses$/, '/llm');
const ARRAY_SUM_API_URL = 'https://toolbox.pythonanywhere.com/api/tools/array-sum';

// Session-based authentication utilities
export const clearAuthCredentials = () => {
    localStorage.removeItem('apiCredentials');
};

// Utility function for making authenticated requests with Django session cookies
const authenticatedFetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Add CSRF token for state-changing requests (Django handles this via cookies for session auth)
    if (requiresCsrfProtection(method)) {
        try {
            const csrfHeaders = await getCsrfHeaders(headers);
            Object.assign(headers, csrfHeaders);
        } catch (error) {
            console.warn('Failed to get CSRF token for expenses API:', error);
            // For session authentication, CSRF should be handled via cookies
            // This warning is expected and normal for session-based auth
        }
    }

    // Add userid to URL using interceptor
    const finalUrl = apiInterceptor.addUserIdToUrl(url);

    // Add userid to request body if needed
    let body = options.body;
    if (body && typeof body === 'string') {
        try {
            const parsedBody = JSON.parse(body);
            body = apiInterceptor.addUserIdToBody(parsedBody, method);
            body = JSON.stringify(body);
        } catch (error) {
            // If body is not JSON, leave it as is
            console.warn('Could not parse request body as JSON for userid injection:', error);
        }
    }

    const response = await fetch(finalUrl, {
        ...options,
        headers,
        body,
        credentials: 'include' // Include credentials for Django session cookie authentication
    });

    if (response.status === 401) {
        console.error(`🚫 Authentication failed for ${method} ${url} - Status: ${response.status}`);
        clearAuthCredentials();
        throw new Error('Authentication failed. Please log in again.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`🚫 API Error for ${method} ${url}:`, {
            status: response.status,
            statusText: response.statusText,
            errorData: errorData,
            url: url
        });
        throwHttpError(errorData, response.status);
    }

    console.log(`✅ API Success: ${method} ${finalUrl} - Status: ${response.status}`);

    return response;
};

/**
 * DRF error bodies aren't always {"detail": "..."} - validation errors come back
 * field-keyed, e.g. {"category_id": ["Category is required."]}. Pull a human-readable
 * message out of whatever shape comes back, and carry the real status on the Error
 * so handleApiError doesn't have to string-sniff the message for digits.
 */
const throwHttpError = (errorData, status) => {
    let message = `HTTP error! status: ${status}`;
    if (errorData && typeof errorData === 'object') {
        if (errorData.detail) {
            message = errorData.detail;
        } else if (typeof errorData.error === 'string') {
            message = errorData.error;
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

// Error handling utility
export const handleApiError = (error, operation) => {
    console.error(`Error ${operation}:`, error);
    const status = error.status;

    if (status === 401 || error.message.includes('Authentication failed')) {
        // Redirect to login or trigger re-authentication
        return { type: 'auth_error', message: 'Please log in again.' };
    } else if (status === 400) {
        return { type: 'validation_error', message: error.message };
    } else if (status === 403) {
        return { type: 'permission_error', message: 'You do not have permission to perform this action.' };
    } else if (status === 404) {
        return { type: 'not_found', message: 'Resource not found.' };
    } else if (status === 429) {
        // The server says which quota ran out and when it resets - keep that.
        return { type: 'rate_limit', message: error.message || 'Too many requests. Please try again later.' };
    } else {
        return { type: 'network_error', message: error.message || `Failed to ${operation}. Please try again.` };
    }
};

// Data transformation utilities
export const transformExpenseForUI = (apiExpense) => {
    return {
        id: apiExpense.id,
        amount: parseFloat(apiExpense.amount),
        displayAmount: apiExpense.amount_display,
        date: new Date(apiExpense.date),
        description: apiExpense.description,
        category: apiExpense.category ? {
            id: apiExpense.category.id,
            name: apiExpense.category.name,
            color: apiExpense.category.color,
            icon: apiExpense.category.icon
        } : null,
        tags: apiExpense.tags ? apiExpense.tags.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color
        })) : [],
        isRecent: apiExpense.is_recent,
        type: apiExpense.transaction_type,
        location: apiExpense.location,
        paymentMethod: apiExpense.payment_method,
        isRecurring: apiExpense.is_recurring,
        createdAt: apiExpense.created_at,
        updatedAt: apiExpense.updated_at
    };
};

// Updated expense creation function
export const addExpenseApi = async (expenseData, onSuccess, onError) => {
    try {
        // Convert JavaScript Date object to YYYY-MM-DD format for Django DateField
        const formatDateForAPI = (date) => {
            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }
            return date;
        };

        // Debug logging for troubleshooting
        console.log('Sending expense data:', {
            amount: expenseData.amount,
            transaction_type: expenseData.transactionType || 'expense',
            category_id: expenseData.categoryId,
            description: expenseData.description,
            date: formatDateForAPI(expenseData.date),
            tag_ids: expenseData.tagIds || [],
            location: expenseData.location,
            payment_method: expenseData.paymentMethod,
            is_recurring: expenseData.isRecurring || false
        });

        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/`, {
            method: 'POST',
            body: JSON.stringify({
                amount: expenseData.amount,
                transaction_type: expenseData.transactionType || 'expense',
                category_id: expenseData.categoryId,
                description: expenseData.description,
                date: formatDateForAPI(expenseData.date),
                tag_ids: expenseData.tagIds || [],
                location: expenseData.location,
                payment_method: expenseData.paymentMethod,
                is_recurring: expenseData.isRecurring || false
            })
        });

        const data = await response.json();
        const transformedData = transformExpenseForUI(data);

        if (onSuccess) onSuccess(transformedData);
        return transformedData;
    } catch (error) {
        const handledError = handleApiError(error, 'create expense');
        if (onError) onError(handledError);
        throw handledError;
    }
};

// Quick Add - free-text expense parsed and saved by the LLM router endpoint
export const quickAddExpense = async (text) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/quick_add/`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        return transformExpenseForUI(data);
    } catch (error) {
        throw handleApiError(error, 'quick add expense');
    }
};

/**
 * Bulk import - extract every transaction from pasted text.
 *
 * Called with text and commit=false for the dry run. To save, pass the reviewed
 * rows back as `items`: that skips a second model call, so saving is instant,
 * and guarantees what gets stored is exactly what was on screen (re-parsing the
 * same text can return different rows).
 */
export const bulkAddExpenses = async (textOrItems, commit = false) => {
    try {
        const body = commit && Array.isArray(textOrItems)
            ? { items: textOrItems, commit: true }
            : { text: textOrItems, commit };
        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/bulk_add/`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        const data = await response.json();
        return {
            committed: !!data.committed,
            count: data.count || 0,
            detail: data.detail || null,
            // Preview rows are raw parsed items; committed rows are full expenses.
            items: data.committed ? (data.items || []).map(transformExpenseForUI) : (data.items || [])
        };
    } catch (error) {
        throw handleApiError(error, commit ? 'save imported expenses' : 'preview import');
    }
};

// Spending review written by the model. force=true bypasses the server-side cache.
export const generateExpenseInsight = async (days = 30, force = false) => {
    try {
        const response = await authenticatedFetch(`${INSIGHTS_BASE_URL}/expense/generate/`, {
            method: 'POST',
            body: JSON.stringify({ days, force })
        });
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'generate spending review');
    }
};

// Most recent stored review, or null when there has never been one.
export const getLatestExpenseInsight = async () => {
    try {
        const response = await authenticatedFetch(`${INSIGHTS_BASE_URL}/expense/latest/`);
        return await response.json();
    } catch (error) {
        if (error.type === 'not_found') return null;
        throw handleApiError(error, 'fetch spending review');
    }
};

/**
 * OpenRouter key queue. Keys power every AI feature; the server rotates them
 * front-to-back so the daily per-key request cap multiplies by however many
 * are stored. The full key is never returned - only a masked form.
 */
export const getOpenRouterKeys = async () => {
    try {
        const response = await authenticatedFetch(`${LLM_BASE_URL}/keys/`);
        const data = await response.json();
        return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
        throw handleApiError(error, 'fetch API keys');
    }
};

export const addOpenRouterKey = async (key, label = '') => {
    try {
        const response = await authenticatedFetch(`${LLM_BASE_URL}/keys/`, {
            method: 'POST',
            body: JSON.stringify({ key, label })
        });
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'add API key');
    }
};

export const deleteOpenRouterKey = async (id) => {
    try {
        await authenticatedFetch(`${LLM_BASE_URL}/keys/${id}/`, { method: 'DELETE' });
        return true;
    } catch (error) {
        throw handleApiError(error, 'remove API key');
    }
};

export const moveOpenRouterKeyToBack = async (id) => {
    try {
        const response = await authenticatedFetch(`${LLM_BASE_URL}/keys/${id}/move_to_back/`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'reorder API key');
    }
};

/**
 * Ask a question about spending in plain words. The server has the model pick
 * filter values only - the matching and the arithmetic are done in the database,
 * so the totals are real rather than model-written.
 */
export const askExpenses = async (question) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/ask/`, {
            method: 'POST',
            body: JSON.stringify({ question })
        });
        const data = await response.json();
        return {
            question: data.question,
            interpretation: data.interpretation,
            filters: data.filters || {},
            total: parseFloat(data.total || 0),
            count: data.count || 0,
            results: (data.results || []).map(transformExpenseForUI)
        };
    } catch (error) {
        throw handleApiError(error, 'answer that question');
    }
};

/**
 * Splitting bills. The server records the expense in full against you and
 * stores what each other person owes, so your spending total stays truthful
 * while the balances track separately.
 */
export const splitAddExpense = async (text) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/split_add/`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        return {
            expense: transformExpenseForUI(data.expense),
            splits: data.splits || [],
            yourShare: parseFloat(data.your_share || 0),
            owedToYou: parseFloat(data.owed_to_you || 0)
        };
    } catch (error) {
        throw handleApiError(error, 'split that expense');
    }
};

export const getSplitBalances = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/splits/balances/`);
        const data = await response.json();
        return {
            totalOwedToYou: parseFloat(data.total_owed_to_you || 0),
            totalYouOwe: parseFloat(data.total_you_owe || 0),
            net: parseFloat(data.net || 0),
            balances: (data.balances || []).map(b => ({
                personId: b.person_id,
                name: b.name,
                linkedUsername: b.linked_username || null,
                owed: parseFloat(b.owed || 0),
                unsettledCount: b.unsettled_count || 0
            })),
            // Splits pointing at you, on bills somebody else paid.
            youOwe: (data.you_owe || []).map(b => ({
                userId: b.user_id,
                name: b.name,
                owed: parseFloat(b.owed || 0),
                unsettledCount: b.unsettled_count || 0
            }))
        };
    } catch (error) {
        throw handleApiError(error, 'fetch balances');
    }
};

/**
 * Record that the money moved. Either side can do it: pass person_id when
 * someone has paid you back, or owed_to_user_id when you have paid them.
 */
export const settleUpWith = async ({ personId, owedToUserId }) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/splits/settle/`, {
            method: 'POST',
            body: JSON.stringify(personId ? { person_id: personId }
                                          : { owed_to_user_id: owedToUserId })
        });
        const data = await response.json();
        return { count: data.settled_count || 0, total: parseFloat(data.settled_total || 0) };
    } catch (error) {
        throw handleApiError(error, 'settle up');
    }
};

// Accounts you can split with. Without a search term this returns only people
// you've already split with, so it isn't a directory of every user.
export const searchSplitUsers = async (search = '') => {
    try {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await authenticatedFetch(`${API_BASE_URL}/people/available_users/${query}`);
        const data = await response.json();
        return (data || []).map(u => ({
            userId: u.user_id, username: u.username, alreadyAdded: u.already_added
        }));
    } catch (error) {
        throw handleApiError(error, 'find people to split with');
    }
};

/**
 * Create a split from exact fields - no model call, so the numbers are
 * whatever was typed and it costs nothing against the daily AI quota.
 * participants: [{ userId }] for app accounts, or [{ name }] for someone
 * without one; add `amount` to a participant to set their share explicitly.
 */
export const createSplitManually = async ({ amount, description, categoryId, date,
                                            splitWithMe = true, participants }) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/create_split/`, {
            method: 'POST',
            body: JSON.stringify({
                amount,
                description,
                category_id: categoryId || undefined,
                date: date || undefined,
                split_with_me: splitWithMe,
                participants: participants.map(p => ({
                    user_id: p.userId || undefined,
                    name: p.userId ? undefined : p.name,
                    amount: p.amount || undefined
                }))
            })
        });
        const data = await response.json();
        return {
            expense: transformExpenseForUI(data.expense),
            splits: data.splits || [],
            yourShare: parseFloat(data.your_share || 0),
            owedToYou: parseFloat(data.owed_to_you || 0)
        };
    } catch (error) {
        throw handleApiError(error, 'create the split');
    }
};

// Legacy function for backward compatibility
export const addExpenseApiLegacy = (user, amount, category, date, description, onSuccess, onError) => {
    addExpenseApi({
        amount,
        categoryId: category,
        description,
        date,
        transactionType: 'expense'
    }, onSuccess, onError);
};

// Categories API Functions
export const getCategories = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.ordering) params.append('ordering', filters.ordering);
        if (filters.page) params.append('page', filters.page);
        if (filters.pageSize) params.append('page_size', filters.pageSize);

        const response = await authenticatedFetch(`${API_BASE_URL}/categories/?${params}`);
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'fetch categories');
    }
};

export const createCategory = async (categoryData) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/categories/`, {
            method: 'POST',
            body: JSON.stringify({
                name: categoryData.name,
                description: categoryData.description,
                color: categoryData.color,
                icon: categoryData.icon,
                transaction_type: categoryData.transactionType || 'expense'
            })
        });
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'create category');
    }
};

export const updateCategory = async (categoryId, categoryData) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/categories/${categoryId}/`, {
            method: 'PATCH',
            body: JSON.stringify(categoryData)
        });
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'update category');
    }
};

export const deleteCategory = async (categoryId) => {
    try {
        await authenticatedFetch(`${API_BASE_URL}/categories/${categoryId}/`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        throw handleApiError(error, 'delete category');
    }
};

// Tags API Functions
export const getTags = async (options = {}) => {
    try {
        const params = new URLSearchParams();
        if (options.ordering) params.append('ordering', options.ordering);
        if (options.page) params.append('page', options.page);
        if (options.pageSize) params.append('page_size', options.pageSize);

        const response = await authenticatedFetch(`${API_BASE_URL}/tags/?${params}`);
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'fetch tags');
    }
};

export const createTag = async (tagData) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/tags/`, {
            method: 'POST',
            body: JSON.stringify({
                name: tagData.name,
                color: tagData.color
            })
        });
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'create tag');
    }
};

export const updateTag = async (tagId, tagData) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/tags/${tagId}/`, {
            method: 'PATCH',
            body: JSON.stringify(tagData)
        });
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'update tag');
    }
};

export const deleteTag = async (tagId) => {
    try {
        await authenticatedFetch(`${API_BASE_URL}/tags/${tagId}/`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        throw handleApiError(error, 'delete tag');
    }
};

// Enhanced Expenses API Functions
export const getExpenses = async (filters = {}) => {
    try {
        const params = new URLSearchParams();

        // Date filters
        if (filters.dateFrom) params.append('date_from', filters.dateFrom);
        if (filters.dateTo) params.append('date_to', filters.dateTo);

        // Amount filters
        if (filters.amountMin) params.append('amount_min', filters.amountMin);
        if (filters.amountMax) params.append('amount_max', filters.amountMax);

        // Category and tag filters
        if (filters.category) params.append('category', filters.category);
        if (filters.tags) params.append('tags', filters.tags.join(','));

        // Other filters
        if (filters.transactionType) params.append('transaction_type', filters.transactionType);
        if (filters.isRecurring !== undefined) params.append('is_recurring', filters.isRecurring);
        if (filters.search) params.append('search', filters.search);

        // Sorting and pagination
        if (filters.ordering) params.append('ordering', filters.ordering);
        if (filters.page) params.append('page', filters.page);
        if (filters.pageSize) params.append('page_size', filters.pageSize);

        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/?${params}`);
        const data = await response.json();

        // Transform expenses for UI
        if (data.results) {
            data.results = data.results.map(transformExpenseForUI);
        }

        return data;
    } catch (error) {
        throw handleApiError(error, 'fetch expenses');
    }
};

export const getExpense = async (expenseId) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/${expenseId}/`);
        const data = await response.json();
        return transformExpenseForUI(data);
    } catch (error) {
        throw handleApiError(error, 'fetch expense');
    }
};

export const updateExpense = async (expenseId, expenseData) => {
    try {
        // Convert JavaScript Date object to YYYY-MM-DD format for Django DateField
        const formatDateForAPI = (date) => {
            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }
            return date;
        };

        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/${expenseId}/`, {
            method: 'PATCH',
            body: JSON.stringify({
                amount: expenseData.amount,
                transaction_type: expenseData.transactionType,
                category_id: expenseData.categoryId,
                description: expenseData.description,
                date: formatDateForAPI(expenseData.date),
                tag_ids: expenseData.tagIds || [],
                location: expenseData.location,
                payment_method: expenseData.paymentMethod,
                is_recurring: expenseData.isRecurring
            })
        });

        const data = await response.json();
        return transformExpenseForUI(data);
    } catch (error) {
        throw handleApiError(error, 'update expense');
    }
};

export const deleteExpense = async (expenseId) => {
    try {
        await authenticatedFetch(`${API_BASE_URL}/expenses/${expenseId}/`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        throw handleApiError(error, 'delete expense');
    }
};

// Expense Tag Management
export const addTagsToExpense = async (expenseId, tagIds) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/${expenseId}/add_tags/`, {
            method: 'POST',
            body: JSON.stringify({ tag_ids: tagIds })
        });
        const data = await response.json();
        return transformExpenseForUI(data);
    } catch (error) {
        throw handleApiError(error, 'add tags to expense');
    }
};

export const removeTagsFromExpense = async (expenseId, tagIds) => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/${expenseId}/remove_tags/`, {
            method: 'DELETE',
            body: JSON.stringify({ tag_ids: tagIds })
        });
        const data = await response.json();
        return transformExpenseForUI(data);
    } catch (error) {
        throw handleApiError(error, 'remove tags from expense');
    }
};

// Summary and Reporting Functions
export const getExpenseSummary = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.dateFrom) params.append('date_from', filters.dateFrom);
        if (filters.dateTo) params.append('date_to', filters.dateTo);

        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/summary/?${params}`);
        const data = await response.json();

        // Transform summary data for charts
        return {
            totalExpenses: parseFloat(data.total_expenses || 0),
            totalIncome: parseFloat(data.total_income || 0),
            totalDebt: parseFloat(data.total_debt || 0),
            totalCredit: parseFloat(data.total_credit || 0),
            netBalance: parseFloat(data.net_balance || 0),
            transactionCount: data.transaction_count || 0,
            categoryBreakdown: data.category_breakdown ? Object.entries(data.category_breakdown).map(
                ([name, amount]) => ({
                    name,
                    amount: parseFloat(amount)
                })
            ) : []
        };
    } catch (error) {
        throw handleApiError(error, 'fetch expense summary');
    }
};

export const getRecentExpenses = async () => {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/recent/`);
        const data = await response.json();
        return Array.isArray(data) ? data.map(transformExpenseForUI) : [];
    } catch (error) {
        throw handleApiError(error, 'fetch recent expenses');
    }
};

export const getMonthlyReport = async (year, month) => {
    try {
        const params = new URLSearchParams();
        if (year) params.append('year', year);
        if (month) params.append('month', month);

        const response = await authenticatedFetch(`${API_BASE_URL}/expenses/monthly_report/?${params}`);
        return await response.json();
    } catch (error) {
        throw handleApiError(error, 'fetch monthly report');
    }
};

// Utility function for array sum (keeping existing functionality)
export const getArraySumApi = (values, onSuccess, onError) => {
    const queryString = values.join(',');
    const url = `${ARRAY_SUM_API_URL}/?values=${encodeURIComponent(queryString)}`;

    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log('Array sum success:', data);
        if (onSuccess) onSuccess(data);
    })
    .catch((error) => {
        console.error('Array sum error:', error);
        if (onError) onError(error);
    });
};