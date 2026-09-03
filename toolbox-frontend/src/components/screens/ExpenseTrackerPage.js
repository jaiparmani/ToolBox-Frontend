import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Container, Typography, Paper, Grid, Card, CardContent,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Snackbar, Chip, IconButton, Tooltip,
  Fab, Switch, FormControlLabel, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, InputAdornment, Menu, MenuItem,
  ListItemIcon, ListItemText, LinearProgress, Autocomplete,
  useMediaQuery, Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Dashboard as DashboardIcon,
  Category as CategoryIcon,
  Tag as TagIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  AutoAwesome as AutoAwesomeIcon,
  Insights as InsightsIcon,
  Lightbulb as LightbulbIcon,
  WarningAmber as WarningAmberIcon,
  HelpOutline as HelpOutlineIcon,
  QuestionAnswer as QuestionAnswerIcon,
  CallSplit as CallSplitIcon,
  Person as PersonIcon,
  DoneAll as DoneAllIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

// Import API functions and reusable components
import {
  addExpenseApi, getExpenses, updateExpense, deleteExpense,
  getCategories, createCategory, updateCategory, deleteCategory,
  getTags, createTag, updateTag, deleteTag,
  getExpenseSummary, quickAddExpense, bulkAddExpenses,
  generateExpenseInsight, getLatestExpenseInsight, askExpenses,
  splitAddExpense, getSplitBalances, settleUpWith,
  createSplitManually, searchSplitUsers, getSplits, addSplitToExpenses
} from '../rest/expenseTrackerApis';

import DatePickerComponent from '../ReusableComponents/DatePickerComponent';
import AutocompleteComponent from '../ReusableComponents/AutocompleteComponent';
import SummaryStrip from '../ui/SummaryStrip';
import SectionNav from '../ui/SectionNav';
import ExpenseTimeline from '../ui/ExpenseTimeline';
import ActivityScopeBar, { scopeRange } from '../ui/ActivityScopeBar';
import ActivityCategoryChips from '../ui/ActivityCategoryChips';
import ActivityGlance from '../ui/ActivityGlance';
import ExpenseComposer from '../ui/ExpenseComposer';
import QuickCapture from '../ui/QuickCapture';
import ThinkingHint from '../ui/ThinkingHint';
import ErrorBanner from '../ui/ErrorBanner';
import { ExpenseListSkeleton, SummarySkeleton } from '../ui/Skeletons';
import { money } from '../ui/money';
import Reveal from '../ui/Reveal';
import { feedback } from '../ui/feedback';
import { TransactionStoryDrawer, buildStoryFromExpense, PageHeader } from '../ui';
import CursorGlow from '../motion/CursorGlow';
import AssistantOrb from '../ui/AssistantOrb';
import { accents } from '../../theme/tokens';

// Color palette for categories
const categoryColors = [
 '#f44336', '#e91e63', '#9c27b0', '#673ab7',
 '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
 '#009688', '#4caf50', '#8bc34a', '#cddc39',
 '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
];

/** Opens the one ToolBox Assistant — the scattered AI boxes now live there. */
function AssistantNudge({ label }) {
 const open = () => window.dispatchEvent(new Event('toolbox:command-palette'));
 return (
   <Box
     role="button"
     aria-label="Open the ToolBox assistant"
     onClick={open}
     sx={{
       display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.15, borderRadius: '14px', cursor: 'pointer',
       border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
       transition: 'border-color 0.15s ease',
       '&:hover': { borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(17,17,20,0.22)' },
       '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2 },
     }}
   >
     <Box sx={{ flexShrink: 0 }}>
       <AssistantOrb state="idle" size={28} />
     </Box>
     <Box sx={{ flex: 1, minWidth: 0 }}>
       <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>{label}</Typography>
     </Box>
     <Box sx={{ display: { xs: 'none', sm: 'block' }, px: 0.75, py: 0.15, borderRadius: 1, border: '1px solid', borderColor: 'divider', fontSize: '0.7rem', fontWeight: 700, color: 'text.disabled', flexShrink: 0 }}>⌘K</Box>
   </Box>
 );
}

export default function ExpenseTrackerPage() {
  // Use global authentication state
  const { isAuthenticated, isLoading, user } = useAuth();

 // Main data state
 const [expenses, setExpenses] = useState([]);
 const [categories, setCategories] = useState([]);
 const [tags, setTags] = useState([]);
 const [summary, setSummary] = useState(null);

 // UI state
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [success, setSuccess] = useState(null);
 const [activeTab, setActiveTab] = useState(0);

 // Expense form state
 const [expenseForm, setExpenseForm] = useState({
   open: false,
   editing: false,
   data: {
     id: null,
     amount: '',
     description: '',
     categoryId: '',
     date: new Date(),
     tagIds: [],
     location: '',
     paymentMethod: '',
     transactionType: 'expense',
     isRecurring: false
   }
 });

 // Category form state
 const [categoryForm, setCategoryForm] = useState({
   open: false,
   editing: false,
   data: {
     id: null,
     name: '',
     description: '',
     color: categoryColors[0],
     icon: 'category',
     transactionType: 'expense'
   }
 });

 // Tag form state
 const [tagForm, setTagForm] = useState({
   open: false,
   editing: false,
   data: {
     id: null,
     name: '',
     color: '#2196f3'
   }
 });

 // Filtering and pagination state
 const [searchParams, setSearchParams] = useSearchParams();
 const [filters, setFilters] = useState({
   search: '',
   // Seed the category filter from ?category=<id> so a drill-in from Insights
   // lands on that category's actual transactions.
   category: searchParams.get('category') || '',
   dateFrom: '',
   dateTo: '',
   amountMin: '',
   amountMax: '',
   tags: []
 });

 // A ?category arriving after mount (client-side navigation) applies too, then
 // the param is cleared so it doesn't stick to later manual filter changes.
 useEffect(() => {
   const cat = searchParams.get('category');
   if (cat) {
     setFilters(prev => ({ ...prev, category: cat }));
     setSearchParams({}, { replace: true });
   }
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [searchParams]);
 const [pagination, setPagination] = useState({
   page: 0,
   pageSize: 10,
   total: 0
 });
 const [sortBy, setSortBy] = useState('-date');
 // Active date scope (This month / Last 30 / All, or a stepped month). It
 // drives the same date_from/date_to the list and summary already read, so the
 // SPENT/INCOME/BALANCE header and the timeline scope together.
 const [scope, setScope] = useState({ mode: 'all' });
 const applyScope = (next) => {
   setScope(next);
   const { dateFrom, dateTo } = scopeRange(next);
   setFilters(prev => ({ ...prev, dateFrom, dateTo }));
   setPagination(prev => ({ ...prev, page: 0 }));
 };
 // Filters start closed on a phone, open on desktop where there's room.
 const isCompact = useMediaQuery((theme) => theme.breakpoints.down('md'));
 const [filtersOpen, setFiltersOpen] = useState(false);
 useEffect(() => { setFiltersOpen(!isCompact); }, [isCompact]);
 const [anchorEl, setAnchorEl] = useState(null);
 const [menuType, setMenuType] = useState(null);

 // Quick Add (free-text, parsed by the LLM router endpoint) state
 const [story, setStory] = useState(null);
 const [quickAddText, setQuickAddText] = useState('');
 const [quickAddLoading, setQuickAddLoading] = useState(false);

 // Bulk import: paste a chat log, review what was found, then save
 // Spending review written by the model
 const [insight, setInsight] = useState({ data: null, loading: false, loaded: false });

 // Plain-language question over the expense list
 const [ask, setAsk] = useState({ question: '', loading: false, answer: null });

 // Shared bills: who owes what
 const [splits, setSplits] = useState({
   text: '', loading: false, balances: [], youOwe: [],
   totalOwed: 0, totalYouOwe: 0, net: 0, loaded: false, settling: null
 });

 // Split-only bills: tracked in Splits but not in expenses — can be flipped.
 const [splitOnlyBills, setSplitOnlyBills] = useState([]);

 // Expanded balance cards — show individual splits for a person.
 const [expandedPerson, setExpandedPerson] = useState(null);
 const [personSplits, setPersonSplits] = useState([]);

 // Manual split: exact numbers, no model call and no quota spent
 const [splitForm, setSplitForm] = useState({
   open: false, saving: false, amount: '', description: '', categoryId: '',
   splitWithMe: true, paidBy: '', addToExpenses: true,
   people: [], userOptions: [], searching: false
 });

 // Load data when authenticated
 useEffect(() => {
   if (isAuthenticated) {
     loadAllData();
   }
 }, [isAuthenticated, filters, pagination.page, pagination.pageSize, sortBy]);


 const loadAllData = async () => {
   setLoading(true);
   try {
     await Promise.all([
       loadExpenses(),
       loadCategories(),
       loadTags(),
       loadSummary()
     ]);
   } catch (error) {
     setError('Failed to load data');
   } finally {
     setLoading(false);
   }
 };

 const loadExpenses = async () => {
   try {
     const response = await getExpenses({
       search: filters.search,
       category: filters.category,
       dateFrom: filters.dateFrom,
       dateTo: filters.dateTo,
       amountMin: filters.amountMin,
       amountMax: filters.amountMax,
       tags: filters.tags,
       ordering: sortBy,
       page: pagination.page + 1,
       pageSize: pagination.pageSize
     });
     setExpenses(response.results || []);
     setPagination(prev => ({ ...prev, total: response.count || 0 }));
   } catch (error) {
     throw error;
   }
 };

 const loadCategories = async () => {
   try {
     const response = await getCategories();
     setCategories(response.results || []);
   } catch (error) {
     throw error;
   }
 };

 const loadTags = async () => {
   try {
     const response = await getTags();
     setTags(response.results || []);
   } catch (error) {
     throw error;
   }
 };

 const loadSummary = async () => {
   try {
     const summaryData = await getExpenseSummary({
       dateFrom: filters.dateFrom,
       dateTo: filters.dateTo
     });
     setSummary(summaryData);
   } catch (error) {
     throw error;
   }
 };

 // Form handlers
 const openExpenseForm = (expense = null) => {
   if (expense) {
     setExpenseForm({
       open: true,
       editing: true,
       data: {
         id: expense.id,
         amount: expense.amount,
         description: expense.description,
         categoryId: expense.category?.id || '',
         date: expense.date,
         tagIds: expense.tags?.map(tag => tag.id) || [],
         location: expense.location || '',
         paymentMethod: expense.paymentMethod || '',
         transactionType: expense.type || 'expense',
         isRecurring: expense.isRecurring || false
       }
     });
   } else {
     setExpenseForm({
       open: true,
       editing: false,
       data: {
         id: null,
         amount: '',
         description: '',
         categoryId: '',
         date: new Date(),
         tagIds: [],
         location: '',
         paymentMethod: '',
         transactionType: 'expense',
         isRecurring: false
       }
     });
   }
 };

 const closeExpenseForm = () => {
   setExpenseForm({ open: false, editing: false, data: {} });
 };

 const saveExpense = async () => {
   // Enhanced validation with better error messages
   if (!expenseForm.data.amount || parseFloat(expenseForm.data.amount) <= 0) {
     setError('Please enter a valid amount greater than 0');
     return;
   }

   if (!expenseForm.data.description || expenseForm.data.description.trim().length < 3) {
     setError('Please enter a description (minimum 3 characters)');
     return;
   }

   if (!expenseForm.data.categoryId) {
     setError('Please select a category');
     return;
   }

   if (!expenseForm.data.date) {
     setError('Please select a date');
     return;
   }

   setLoading(true);
   try {
     if (expenseForm.editing) {
       await updateExpense(expenseForm.data.id, expenseForm.data);
       setSuccess('Expense updated successfully!');
     } else {
       await addExpenseApi(expenseForm.data);
       setSuccess('Expense added successfully!');
     }
     feedback('success');
     closeExpenseForm();
     loadExpenses();
     loadSummary();
   } catch (error) {
     feedback('error');
     console.error('Expense save error:', error);
     // Show more specific error messages based on error type
     if (error.message.includes('400')) {
       setError(`Validation error: ${error.message}`);
     } else if (error.message.includes('401')) {
       setError('Authentication failed. Please log in again.');
     } else if (error.message.includes('403')) {
       setError('You do not have permission to perform this action.');
     } else if (error.message.includes('404')) {
       setError('Category not found. Please refresh and try again.');
     } else {
       setError(`Failed to ${expenseForm.editing ? 'update' : 'add'} expense: ${error.message}`);
     }
   } finally {
     setLoading(false);
   }
 };

 const handleQuickAdd = async () => {
   if (!quickAddText.trim()) {
     setError('Enter some expense text first');
     return;
   }

   setQuickAddLoading(true);
   try {
     const saved = await quickAddExpense(quickAddText.trim());
     // Echo back what was actually stored, not just "done". The model chose the
     // amount, description and category, so showing them is how a misread gets
     // noticed straight away rather than at the next reconciliation.
     // amount_display comes from the server already formatted in rupees.
     const amountText = saved.displayAmount || formatCurrency(saved.amount);
     const categoryText = saved.category?.name ? ` \u00b7 ${saved.category.name}` : '';
     setSuccess(`Added "${saved.description}" \u2014 ${amountText}${categoryText}`);
     setQuickAddText('');
     loadExpenses();
     loadSummary();
   } catch (error) {
     setError(error.message || 'Failed to parse and add expense');
   } finally {
     setQuickAddLoading(false);
   }
 };

 // Commit a reviewed batch straight from the composer's Smart-add flow. Sends
 // the reviewed rows (not the text) so nothing but what was seen is written.
 // Throws on failure so the composer can surface it inline.
 const addExpenseBatch = async (items) => {
   const result = await bulkAddExpenses(items, true);
   feedback('success');
   window.dispatchEvent(new Event('toolbox:notify-refresh'));
   setSuccess(`Added ${result.count} ${result.count === 1 ? 'transaction' : 'transactions'}`);
   closeExpenseForm();
   loadExpenses();
   loadSummary();
 };

 // Commit a single reviewed row without closing the composer, so the user can
 // add a batch one at a time. Throws so the composer can surface a failure.
 const addExpenseOne = async (item) => {
   const result = await bulkAddExpenses([item], true);
   feedback('success');
   window.dispatchEvent(new Event('toolbox:notify-refresh'));
   setSuccess(`Added ${result.count === 1 ? (result.items?.[0]?.description || 'expense') : `${result.count} transactions`}`);
   loadExpenses();
   loadSummary();
 };

 const openSplitForm = () => {
   setSplitForm({
     open: true, saving: false, amount: '', description: '', categoryId: '',
     splitWithMe: true, paidBy: '', addToExpenses: true,
     people: [], userOptions: [], searching: false
   });
   // Seed the picker with people already split with, before any typing.
   searchSplitUsers('').then(userOptions =>
     setSplitForm(prev => ({ ...prev, userOptions }))).catch(() => {});
 };

 const closeSplitForm = () => setSplitForm(prev => ({ ...prev, open: false }));

 const searchUsers = async (term) => {
   setSplitForm(prev => ({ ...prev, searching: true }));
   try {
     const userOptions = await searchSplitUsers(term);
     setSplitForm(prev => ({ ...prev, userOptions, searching: false }));
   } catch (error) {
     setSplitForm(prev => ({ ...prev, searching: false }));
   }
 };

 // What each person will owe, worked out the same way the server will, so the
 // form shows the real numbers before anything is saved.
 const previewShares = () => {
   const total = parseFloat(splitForm.amount);
   if (!total || total <= 0 || splitForm.people.length === 0) return null;
   const explicit = splitForm.people.filter(p => p.amount);
   const paise = Math.round(total * 100);
   if (explicit.length) {
     const named = explicit.reduce((sum, p) => sum + Math.round(parseFloat(p.amount) * 100), 0);
     if (named > paise) return { error: 'Those shares add up to more than the bill' };
     const rest = splitForm.people.filter(p => !p.amount);
     const each = rest.length ? Math.floor((paise - named) / rest.length) : 0;
     return {
       shares: splitForm.people.map(p => ({
         label: p.label,
         amount: p.amount ? parseFloat(p.amount) : each / 100
       })),
       yours: (paise - named - each * rest.length) / 100
     };
   }
   const ways = splitForm.people.length + (splitForm.splitWithMe ? 1 : 0);
   const base = Math.floor(paise / ways);
   const remainder = paise - base * ways;
   return {
     shares: splitForm.people.map(p => ({ label: p.label, amount: base / 100 })),
     yours: splitForm.splitWithMe ? (base + remainder) / 100 : 0
   };
 };

 const saveManualSplit = async () => {
   const preview = previewShares();
   if (!preview || preview.error) {
     setError(preview?.error || 'Enter an amount and at least one person');
     return;
   }
   if (!splitForm.description.trim()) {
     setError('What was the expense for?');
     return;
   }
   setSplitForm(prev => ({ ...prev, saving: true }));
   try {
     const result = await createSplitManually({
       amount: parseFloat(splitForm.amount),
       description: splitForm.description.trim(),
       categoryId: splitForm.categoryId || undefined,
       splitWithMe: splitForm.splitWithMe,
       paidBy: splitForm.paidBy || undefined,
       addToExpenses: splitForm.addToExpenses,
       participants: splitForm.people.map(p => ({
         userId: p.userId, name: p.label, amount: p.amount || undefined
       }))
     });
     setSuccess(`Split ${formatCurrency(result.expense.amount)} with ${result.splits.length} ` +
                `${result.splits.length === 1 ? 'person' : 'people'}`);
     feedback('success');
     window.dispatchEvent(new Event('toolbox:notify-refresh'));
     setSplitForm(prev => ({ ...prev, open: false, saving: false }));
     loadBalances();
     loadExpenses();
     loadSummary();
   } catch (error) {
     setSplitForm(prev => ({ ...prev, saving: false }));
     setError(error.message || 'Could not create the split');
   }
 };

 const loadBalances = async () => {
   try {
     const data = await getSplitBalances();
     setSplits(prev => ({
       ...prev,
       balances: data.balances,
       youOwe: data.youOwe,
       totalOwed: data.totalOwedToYou,
       totalYouOwe: data.totalYouOwe,
       net: data.net,
       loaded: true
     }));
   } catch (error) {
     setSplits(prev => ({ ...prev, loaded: true }));
     setError(error.message || 'Could not load balances');
   }
 };

 const loadSplitOnlyBills = async () => {
   try {
     const all = await getSplits({ settled: 'false' });
     setSplitOnlyBills(all.filter(s => s.splitOnly));
   } catch (e) { /* silent */ }
 };

 const handleAddToExpenses = async (expenseId) => {
   try {
     await addSplitToExpenses(expenseId);
     setSuccess('Added to your expenses');
     setSplitOnlyBills(prev => prev.filter(s => s.expenseId !== expenseId));
     loadExpenses();
     loadSummary();
   } catch (e) {
     setError(e.message || 'Could not update');
   }
 };

 const togglePersonSplits = async (personId) => {
   if (expandedPerson === personId) {
     setExpandedPerson(null);
     setPersonSplits([]);
     return;
   }
   setExpandedPerson(personId);
   try {
     const all = await getSplits({ personId, settled: 'false' });
     setPersonSplits(all);
   } catch (e) {
     setPersonSplits([]);
   }
 };

 const handleSettleSingle = async (splitId, personName, amount) => {
   if (!window.confirm(`Mark ${formatCurrency(amount)} from ${personName} as paid?`)) return;
   setSplits(prev => ({ ...prev, settling: `s${splitId}` }));
   try {
     await settleUpWith({ splitIds: [splitId] });
     setSuccess(`Settled ${formatCurrency(amount)}`);
     setPersonSplits(prev => prev.filter(s => s.id !== splitId));
     setSplits(prev => ({ ...prev, settling: null }));
     loadBalances();
   } catch (e) {
     setSplits(prev => ({ ...prev, settling: null }));
     setError(e.message || 'Could not settle');
   }
 };

 const handleSplitAdd = async () => {
   if (!splits.text.trim()) {
     setError('Describe the shared expense first');
     return;
   }
   setSplits(prev => ({ ...prev, loading: true }));
   try {
     const result = await splitAddExpense(splits.text.trim());
     const who = result.splits.map(s => `${s.person_name} ${formatCurrency(s.amount)}`).join(', ');
     setSuccess(`Split ${formatCurrency(result.expense.amount)} — ${who || 'no one'}`);
     setSplits(prev => ({ ...prev, text: '', loading: false }));
     loadBalances();
     loadExpenses();
     loadSummary();
   } catch (error) {
     setSplits(prev => ({ ...prev, loading: false }));
     setError(error.message || 'Could not split that');
   }
 };

 const handleSettle = async (balance, direction = 'owed_to_me') => {
   const owedByMe = direction === 'i_owe';
   const prompt = owedByMe
     ? `Mark the ${formatCurrency(balance.owed)} you owe ${balance.name} as paid?`
     : `Mark ${balance.name}'s ${formatCurrency(balance.owed)} as settled?`;
   if (!window.confirm(prompt)) return;

   const key = owedByMe ? `u${balance.userId}` : balance.personId;
   setSplits(prev => ({ ...prev, settling: key }));
   try {
     const result = await settleUpWith(
       owedByMe ? { owedToUserId: balance.userId } : { personId: balance.personId });
     setSuccess(`Settled ${formatCurrency(result.total)} with ${balance.name}`);
     setSplits(prev => ({ ...prev, settling: null }));
     loadBalances();
   } catch (error) {
     setSplits(prev => ({ ...prev, settling: null }));
     setError(error.message || 'Could not settle');
   }
 };

 const runAsk = async () => {
   if (!ask.question.trim()) {
     setError('Type a question first');
     return;
   }
   setAsk(prev => ({ ...prev, loading: true }));
   try {
     const answer = await askExpenses(ask.question.trim());
     setAsk(prev => ({ ...prev, loading: false, answer }));
   } catch (error) {
     setAsk(prev => ({ ...prev, loading: false }));
     setError(error.message || 'Could not answer that');
   }
 };

 const clearAsk = () => setAsk({ question: '', loading: false, answer: null });

 const loadLatestInsight = async () => {
   try {
     const latest = await getLatestExpenseInsight();
     setInsight({ data: latest, loading: false, loaded: true });
   } catch (error) {
     setInsight({ data: null, loading: false, loaded: true });
   }
 };

 const runInsight = async (force = false) => {
   setInsight(prev => ({ ...prev, loading: true }));
   try {
     const data = await generateExpenseInsight(30, force);
     setInsight({ data, loading: false, loaded: true });
     setSuccess(data.regenerated === false ? 'Showing your most recent review' : 'Spending review ready');
   } catch (error) {
     setInsight(prev => ({ ...prev, loading: false, loaded: true }));
     setError(error.message || 'Could not generate the review');
   }
 };

 const deleteExpenseDirect = async (expenseId) => {
   setLoading(true);
   try {
     await deleteExpense(expenseId);
     setSuccess('Expense deleted successfully!');
     loadExpenses();
     loadSummary();
   } catch (error) {
     setError('Failed to delete expense');
   } finally {
     setLoading(false);
   }
 };

 // The menu delete keeps a confirm; the swipe gesture is its own confirmation.
 const deleteExpenseHandler = (expenseId) => {
   if (window.confirm('Delete this expense?')) deleteExpenseDirect(expenseId);
 };

 // Category handlers
 const openCategoryForm = (category = null) => {
   if (category) {
     setCategoryForm({
       open: true,
       editing: true,
       data: { ...category }
     });
   } else {
     setCategoryForm({
       open: true,
       editing: false,
       data: {
         id: null,
         name: '',
         description: '',
         color: categoryColors[Math.floor(Math.random() * categoryColors.length)],
         icon: 'category',
         transactionType: 'expense'
       }
     });
   }
 };

 const closeCategoryForm = () => {
   setCategoryForm({ open: false, editing: false, data: {} });
 };

 const saveCategory = async () => {
   if (!categoryForm.data.name) {
     setError('Please enter a category name');
     return;
   }

   setLoading(true);
   try {
     if (categoryForm.editing) {
       await updateCategory(categoryForm.data.id, categoryForm.data);
       setSuccess('Category updated successfully!');
     } else {
       await createCategory(categoryForm.data);
       setSuccess('Category created successfully!');
     }
     closeCategoryForm();
     loadCategories();
   } catch (error) {
     setError(`Failed to ${categoryForm.editing ? 'update' : 'create'} category`);
   } finally {
     setLoading(false);
   }
 };

 const deleteCategoryHandler = async (categoryId) => {
   if (!window.confirm('Are you sure you want to delete this category?')) return;

   setLoading(true);
   try {
     await deleteCategory(categoryId);
     setSuccess('Category deleted successfully!');
     loadCategories();
   } catch (error) {
     setError('Failed to delete category');
   } finally {
     setLoading(false);
   }
 };

 // Tag handlers
 const openTagForm = (tag = null) => {
   if (tag) {
     setTagForm({
       open: true,
       editing: true,
       data: { ...tag }
     });
   } else {
     setTagForm({
       open: true,
       editing: false,
       data: {
         id: null,
         name: '',
         color: '#2196f3'
       }
     });
   }
 };

 const closeTagForm = () => {
   setTagForm({ open: false, editing: false, data: {} });
 };

 const saveTag = async () => {
   if (!tagForm.data.name) {
     setError('Please enter a tag name');
     return;
   }

   setLoading(true);
   try {
     if (tagForm.editing) {
       await updateTag(tagForm.data.id, tagForm.data);
       setSuccess('Tag updated successfully!');
     } else {
       await createTag(tagForm.data);
       setSuccess('Tag created successfully!');
     }
     closeTagForm();
     loadTags();
   } catch (error) {
     setError(`Failed to ${tagForm.editing ? 'update' : 'create'} tag`);
   } finally {
     setLoading(false);
   }
 };

 const deleteTagHandler = async (tagId) => {
   if (!window.confirm('Are you sure you want to delete this tag?')) return;

   setLoading(true);
   try {
     await deleteTag(tagId);
     setSuccess('Tag deleted successfully!');
     loadTags();
   } catch (error) {
     setError('Failed to delete tag');
   } finally {
     setLoading(false);
   }
 };

 // Pull the stored review the first time the Insights tab is opened, so the
 // panel isn't empty before the user has spent a model call.
 useEffect(() => {
   if (activeTab === 3 && !insight.loaded && isAuthenticated) {
     loadLatestInsight();
   }
 }, [activeTab, insight.loaded, isAuthenticated]);

 useEffect(() => {
   if (activeTab === 4 && !splits.loaded && isAuthenticated) {
     loadBalances();
     loadSplitOnlyBills();
   }
 }, [activeTab, splits.loaded, isAuthenticated]);

 // Filter handlers
 const handleFilterChange = (key, value) => {
   setFilters(prev => ({ ...prev, [key]: value }));
   setPagination(prev => ({ ...prev, page: 0 }));
 };

 const clearFilters = () => {
   setScope({ mode: 'all' });
   setFilters({
     search: '',
     category: '',
     dateFrom: '',
     dateTo: '',
     amountMin: '',
     amountMax: '',
     tags: []
   });
 };

 // Menu handlers
 const handleMenuOpen = (event, type, item) => {
   setAnchorEl(event.currentTarget);
   setMenuType({ type, item });
 };

 const handleMenuClose = () => {
   setAnchorEl(null);
   setMenuType(null);
 };

 // Shown next to the Filters heading so a filter hidden behind the fold can't
 // silently explain why the list looks short.
 const activeFilterCount = [
   filters.search, filters.category, filters.dateFrom, filters.dateTo,
   filters.amountMin, filters.amountMax,
 ].filter(Boolean).length + (filters.tags?.length ? 1 : 0);

 // A one-line story context: this expense's place in its category this month.
 const storyContext = (expense) => {
   if (!expense?.category) return null;
   const sameCat = expenses.filter(e => e.category?.id === expense.category.id
     && (e.transaction_type === 'expense' || e.type === 'expense'));
   const total = sameCat.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
   if (sameCat.length <= 1) return `First ${expense.category.name} expense in this view.`;
   return `${sameCat.length} ${expense.category.name} expenses shown, ${formatCurrency(total)} in total.`;
 };

 const formatCurrency = (amount) => {
   // Amounts are stored and returned by the server in rupees - it formats them
   // as such in amount_display - so showing them as dollars here misreported
   // every figure on the page.
   return new Intl.NumberFormat('en-IN', {
     style: 'currency',
     currency: 'INR'
   }).format(amount || 0);
 };

 const formatDate = (date) => {
   return new Date(date).toLocaleDateString();
 };

 // Keyboard shortcuts
 useEffect(() => {
   const handleKeyDown = (event) => {
     if (event.ctrlKey || event.metaKey) {
       switch (event.key) {
         case 'n':
           event.preventDefault();
           openExpenseForm();
           break;
         case 'r':
           event.preventDefault();
           loadAllData();
           break;
         case '/':
           event.preventDefault();
           document.getElementById('search-input')?.focus();
           break;
         default:
           break;
       }
     }
   };

   document.addEventListener('keydown', handleKeyDown);
   return () => document.removeEventListener('keydown', handleKeyDown);
 }, []);

 if (isLoading) {
   return (
     <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
       <Typography>Loading...</Typography>
     </Box>
   );
 }

 if (!isAuthenticated) {
   return (
     <Container maxWidth="sm" sx={{ mt: 8 }}>
       <Paper elevation={3} sx={{ p: 4 }}>
         <Typography variant="h4" gutterBottom align="center">
           Authentication Required
         </Typography>
         <Typography variant="body1" align="center" sx={{ mt: 2, mb: 3 }}>
           Please log in to access the Expense Tracker.
         </Typography>
         <Typography variant="body2" align="center" color="text.secondary">
           You'll be redirected to the login page automatically.
         </Typography>
       </Paper>
     </Container>
   );
 }

 return (
   <>
     <Container
       maxWidth="xl"
       sx={{
         mt: { xs: 1.5, sm: 2 },
         px: { xs: 2, sm: 3 },
         position: 'relative',
         // Room for the fixed bottom nav (and the home indicator under it).
         pb: { xs: 'calc(72px + env(safe-area-inset-bottom))', md: 4 },
       }}
     >
     {/* A whisper of cursor light — restrained, matching the dashboard. */}
     <CursorGlow />
     <Box sx={{ position: 'relative', zIndex: 1 }}>
     {/* Financial weather now lives once in the app top bar, not per-screen. */}
     <PageHeader
       icon={DashboardIcon}
       title="Expenses"
       subtitle="Every transaction, in one clear stream"
       actions={
         <>
           <Tooltip title="Refresh">
             <span><IconButton onClick={loadAllData} disabled={loading} size="small"><RefreshIcon fontSize="small" /></IconButton></span>
           </Tooltip>
           <Button variant="contained" startIcon={<AddIcon />} onClick={() => openExpenseForm()} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
             Add Expense
           </Button>
         </>
       }
     />

     {/* Capture, ask, and insights now all live in the one ToolBox Assistant. */}
     <Box sx={{ mb: { xs: 2, sm: 3 } }}>
       <AssistantNudge label="Add an expense, split a bill, or ask a question" />
     </Box>

     {/* Failures stay until dismissed; confirmations fade on their own */}
     <ErrorBanner error={error} onClose={() => setError(null)} />
     <Snackbar
       open={!!success}
       autoHideDuration={4000}
       onClose={() => setSuccess(null)}
       anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
       sx={{ bottom: { xs: 80, md: 24 } }}
     >
       <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%', borderRadius: 3 }}>
         {success}
       </Alert>
     </Snackbar>

     {/* Headline figures */}
     <Box sx={{ mb: { xs: 2, sm: 3 } }}>
       {!summary && loading ? (
         <SummarySkeleton />
       ) : summary ? (
         <SummaryStrip
           stats={[
             { label: 'Spent', raw: summary.totalExpenses, tone: accents.red },
             { label: 'Income', raw: summary.totalIncome, tone: accents.green },
             { label: 'Balance', raw: summary.netBalance },
             { label: 'Transactions', value: summary.transactionCount },
           ]}
         />
       ) : null}
     </Box>

     {/* Main Content Tabs */}
     <Paper
       elevation={0}
       sx={{
         border: '1px solid',
         borderColor: 'divider',
         borderRadius: '18px',
         overflow: 'hidden',
         bgcolor: 'background.paper',
       }}
     >
       <SectionNav
         value={activeTab}
         onChange={setActiveTab}
         sections={[
           { label: 'Expenses', icon: DashboardIcon, color: '#0A84FF' },
           { label: 'Categories', icon: CategoryIcon, color: '#BF5AF2' },
           { label: 'Tags', icon: TagIcon, color: '#FF9F0A' },
           { label: 'Insights', icon: InsightsIcon, color: '#30D158' },
           { label: 'Splits', icon: CallSplitIcon, color: '#FF9F0A' },
         ]}
       />

       {/* Expenses Tab */}
       {activeTab === 0 && (
         <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
           {/* Ask result — the question is asked from the one Assistant (⌘K);
               when it answers, the reading lands here as its own card. */}
           {ask.answer && (
             <Reveal>
             <Paper
               elevation={0}
               sx={{
                 p: { xs: 2, sm: 2.5 }, mb: { xs: 2, sm: 3 }, borderRadius: '14px',
                 border: '1px solid', borderColor: 'divider',
                 bgcolor: 'background.paper',
               }}
             >
               <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1.5} flexWrap="wrap">
                 <Box display="flex" alignItems="baseline" gap={1.5} flexWrap="wrap">
                   <Typography variant="h5" sx={{ fontWeight: 650, fontFamily: 'inherit' }}>
                     {formatCurrency(ask.answer.total)}
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     across {ask.answer.count} {ask.answer.count === 1 ? 'transaction' : 'transactions'}
                   </Typography>
                 </Box>
                 <Button size="small" onClick={clearAsk} color="inherit">Clear</Button>
               </Box>
               {ask.answer.interpretation && (
                 <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                   {ask.answer.interpretation}
                 </Typography>
               )}
               {Object.keys(ask.answer.filters).length > 0 && (
                 <Box display="flex" gap={0.5} flexWrap="wrap" sx={{ mt: 1.5 }}>
                   {Object.entries(ask.answer.filters).map(([key, value]) => (
                     <Chip key={key} size="small" variant="outlined" label={`${key}: ${value}`} />
                   ))}
                 </Box>
               )}
               {ask.answer.results.length > 0 && (
                 <TableContainer sx={{ mt: 2, borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
                   <Table size="small">
                     <TableBody>
                       {ask.answer.results.slice(0, 10).map((row) => (
                         <TableRow key={row.id} hover>
                           <TableCell sx={{ width: 110 }}>
                             <Typography variant="body2" color="text.secondary">
                               {formatDate(row.date)}
                             </Typography>
                           </TableCell>
                           <TableCell>{row.description}</TableCell>
                           <TableCell sx={{ width: 150 }}>
                             {row.category && (
                               <Chip
                                 label={row.category.name}
                                 size="small"
                                 sx={{ backgroundColor: row.category.color, color: '#fff', fontSize: '0.7rem' }}
                               />
                             )}
                           </TableCell>
                           <TableCell align="right" sx={{ width: 120 }}>
                             <Typography variant="body2" fontWeight={600}>
                               {row.displayAmount || formatCurrency(row.amount)}
                             </Typography>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </TableContainer>
               )}
               {ask.answer.count > 10 && (
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                   Showing the 10 most recent of {ask.answer.count}.
                 </Typography>
               )}
             </Paper>
             </Reveal>
           )}

           {/* Filters */}
           <Paper
             elevation={0}
             sx={{
               p: 2.5,
               mb: 3,
               borderRadius: '14px',
               border: '1px solid',
               borderColor: 'divider',
               bgcolor: 'background.paper',
             }}
           >
             <Box
               display="flex" alignItems="center" gap={1}
               onClick={() => setFiltersOpen(prev => !prev)}
               sx={{ mb: filtersOpen ? 2 : 0, cursor: { xs: 'pointer', md: 'default' } }}
             >
               <Box
                 sx={{
                   width: 26, height: 26, borderRadius: '8px',
                   border: '1px solid', borderColor: 'divider',
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                 }}
               >
                 <FilterIcon sx={{ color: 'text.secondary', fontSize: 15 }} />
               </Box>
               <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, flexGrow: 1 }}>
                 Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
               </Typography>
               {/* Four filter fields ate most of a phone screen before you saw a
                   single expense, so they fold away until asked for. */}
               <IconButton size="small" sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
                 {filtersOpen ? <CloseIcon fontSize="small" /> : <FilterIcon fontSize="small" />}
               </IconButton>
             </Box>
             <Collapse in={filtersOpen}>
             <Grid container spacing={2} alignItems="center">
               <Grid item xs={12} md={4}>
                 <TextField
                   id="search-input"
                   fullWidth
                   size="small"
                   label="Search expenses"
                   value={filters.search}
                   onChange={(e) => handleFilterChange('search', e.target.value)}
                   InputProps={{
                     startAdornment: (
                       <InputAdornment position="start">
                         <SearchIcon fontSize="small" />
                       </InputAdornment>
                     ),
                   }}
                   placeholder="Search by description, location..."
                 />
               </Grid>
               <Grid item xs={12} md={2}>
                 <AutocompleteComponent
                   options={categories.map(cat => ({ label: cat.name, id: cat.id }))}
                   label="Category"
                   value={filters.category}
                   onChange={(value) => handleFilterChange('category', value)}
                 />
               </Grid>
               <Grid item xs={12} md={2}>
                 <TextField
                   fullWidth
                   size="small"
                   type="date"
                   label="From Date"
                   value={filters.dateFrom}
                   onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                   InputLabelProps={{ shrink: true }}
                 />
               </Grid>
               <Grid item xs={12} md={2}>
                 <TextField
                   fullWidth
                   size="small"
                   type="date"
                   label="To Date"
                   value={filters.dateTo}
                   onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                   InputLabelProps={{ shrink: true }}
                 />
               </Grid>
               <Grid item xs={12} md={2}>
                 <Box display="flex" gap={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                   <Tooltip title="Clear filters">
                     <IconButton
                       onClick={clearFilters}
                       size="small"
                       sx={{ '&:hover': { color: accents.red } }}
                     >
                       <CloseIcon fontSize="small" />
                     </IconButton>
                   </Tooltip>
                   <Tooltip title="More filters">
                     <IconButton
                       onClick={(e) => handleMenuOpen(e, 'filter', null)}
                       size="small"
                       sx={{ '&:hover': { color: 'text.primary' } }}
                     >
                       <FilterIcon fontSize="small" />
                     </IconButton>
                   </Tooltip>
                 </Box>
               </Grid>
             </Grid>
             </Collapse>
           </Paper>

           {/* Scope the stream — segmented control + month stepping. Drives the
               same date filter the list and the SPENT/INCOME/BALANCE header read. */}
           <ActivityScopeBar scope={scope} onScope={applyScope} />

           {/* Month-at-a-glance — days with spend, average per active day, and the
               biggest single expense, all derived from the loaded rows. */}
           <ActivityGlance expenses={expenses} />

           {/* One-tap category narrowing, wired into the existing category filter. */}
           <ActivityCategoryChips
             categories={categories}
             selected={filters.category}
             onSelect={(id) => handleFilterChange('category', id)}
           />

           {/* The list, as a chronological timeline grouped by day — each day a
               quiet header with its net total over flat, hairline-separated rows. */}
           {loading && expenses.length === 0 ? (
             <Box sx={{ p: 1.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
               <ExpenseListSkeleton rows={6} />
             </Box>
           ) : expenses.length === 0 ? (
             <Box sx={{ p: { xs: 4, sm: 5 }, textAlign: 'center', borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
               <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
                 {activeFilterCount > 0 ? 'Nothing matches those filters' : 'No expenses yet'}
               </Typography>
               <Typography sx={{ fontSize: 12.5, color: 'text.disabled', mt: 0.5 }}>
                 {activeFilterCount > 0 ? 'Try clearing a filter to see more.' : 'Add your first — it will appear here.'}
               </Typography>
             </Box>
           ) : (
             <ExpenseTimeline
               expenses={expenses}
               onEdit={openExpenseForm}
               onDelete={deleteExpenseHandler}
               onDeleteDirect={deleteExpenseDirect}
               onOpen={setStory}
             />
           )}

           {/* Pagination */}
           <TablePagination
             component="div"
             count={pagination.total}
             page={pagination.page}
             onPageChange={(e, newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
             rowsPerPage={pagination.pageSize}
             onRowsPerPageChange={(e) => setPagination(prev => ({ ...prev, pageSize: parseInt(e.target.value, 10), page: 0 }))}
             rowsPerPageOptions={[5, 10, 25, 50]}
           />
         </Box>
       )}

       {/* Categories Tab */}
       {activeTab === 1 && (
         <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
           <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
             <Typography variant="h6" sx={{ fontWeight: 600 }}>Categories</Typography>
             <Button
               variant="contained"
               startIcon={<AddIcon />}
               onClick={() => openCategoryForm()}
             >
               Add Category
             </Button>
           </Box>
           <Grid container spacing={2}>
             {categories.map((category) => (
               <Grid item xs={12} sm={6} md={4} key={category.id}>
                 <Card
                   elevation={0}
                   sx={{
                     border: '1px solid',
                     borderColor: 'divider',
                     borderRadius: '14px',
                     bgcolor: 'background.paper',
                     transition: 'border-color 0.15s ease',
                     '&:hover': { borderColor: 'text.disabled' },
                   }}
                 >
                   <CardContent>
                     <Box display="flex" justifyContent="space-between" alignItems="center">
                       <Box display="flex" alignItems="center" gap={1.5}>
                         <Box
                           sx={{
                             width: 34, height: 34, borderRadius: '10px',
                             bgcolor: `${category.color}1f`,
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             flexShrink: 0,
                           }}
                         >
                           <CategoryIcon sx={{ color: category.color, fontSize: 18 }} />
                         </Box>
                         <Box>
                           <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{category.name}</Typography>
                           <Typography variant="body2" color="text.secondary">
                             {category.description}
                           </Typography>
                         </Box>
                       </Box>
                       <IconButton
                         size="small"
                         onClick={(e) => handleMenuOpen(e, 'category', category)}
                         sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                       >
                         <MoreVertIcon fontSize="small" />
                       </IconButton>
                     </Box>
                   </CardContent>
                 </Card>
               </Grid>
             ))}
           </Grid>
         </Box>
       )}

       {/* Tags Tab */}
       {activeTab === 2 && (
         <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
           <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
             <Typography variant="h6" sx={{ fontWeight: 600 }}>Tags</Typography>
             <Button
               variant="contained"
               startIcon={<AddIcon />}
               onClick={() => openTagForm()}
             >
               Add Tag
             </Button>
           </Box>
           <Grid container spacing={2}>
             {tags.map((tag) => (
               <Grid item xs={12} sm={6} md={4} key={tag.id}>
                 <Card
                   elevation={0}
                   sx={{
                     border: '1px solid',
                     borderColor: 'divider',
                     borderRadius: '14px',
                     bgcolor: 'background.paper',
                     transition: 'border-color 0.15s ease',
                     '&:hover': { borderColor: 'text.disabled' },
                   }}
                 >
                   <CardContent>
                     <Box display="flex" justifyContent="space-between" alignItems="center">
                       <Box display="flex" alignItems="center" gap={1.5}>
                         <Box
                           sx={{
                             width: 34, height: 34, borderRadius: '10px',
                             bgcolor: `${tag.color}1f`,
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             flexShrink: 0,
                           }}
                         >
                           <TagIcon sx={{ color: tag.color, fontSize: 18 }} />
                         </Box>
                         <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{tag.name}</Typography>
                       </Box>
                       <IconButton
                         size="small"
                         onClick={(e) => handleMenuOpen(e, 'tag', tag)}
                         sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}
                       >
                         <MoreVertIcon fontSize="small" />
                       </IconButton>
                     </Box>
                   </CardContent>
                 </Card>
               </Grid>
             ))}
           </Grid>
         </Box>
       )}

       {/* Insights Tab */}
       {activeTab === 3 && (
         <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
           <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
             <Box>
               <Typography variant="h6" sx={{ fontWeight: 600 }}>Spending Review</Typography>
               <Typography variant="body2" color="text.secondary">
                 An AI read of your last 30 days
               </Typography>
             </Box>
             <Button
               variant="contained"
               startIcon={<AutoAwesomeIcon />}
               onClick={() => window.dispatchEvent(new Event('toolbox:command-palette'))}
             >
               Ask ToolBox
             </Button>
           </Box>

           {insight.loading && <LinearProgress sx={{ mb: 2 }} />}

           {!insight.data && !insight.loading && (
             <Paper
               elevation={0}
               sx={{
                 p: 4, borderRadius: '14px', textAlign: 'center',
                 border: '1px dashed', borderColor: 'divider',
               }}
             >
               <InsightsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
               <Typography variant="body1" sx={{ fontWeight: 500 }}>
                 No review yet
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 Generate one to see where your money went and what stands out.
               </Typography>
             </Paper>
           )}

           {insight.data && (
             <Box>
               <Paper
                 elevation={0}
                 sx={{
                   p: 3, mb: 3, borderRadius: '14px',
                   border: '1px solid', borderColor: 'divider',
                   bgcolor: 'background.paper',
                 }}
               >
                 <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                   {insight.data.headline}
                 </Typography>
                 <Typography variant="body2" color="text.secondary">
                   {insight.data.summary}
                 </Typography>
                 <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                   {insight.data.period_start} to {insight.data.period_end}
                   {insight.data.payload?.entries_analysed != null &&
                     ` - ${insight.data.payload.entries_analysed} transactions`}
                 </Typography>
               </Paper>

               <Grid container spacing={2}>
                 {[
                   { key: 'observations', label: 'What the numbers show', icon: InsightsIcon, color: '#0A84FF' },
                   { key: 'concerns', label: 'Worth attention', icon: WarningAmberIcon, color: '#FF9F0A' },
                   { key: 'suggestions', label: 'Suggestions', icon: LightbulbIcon, color: '#30D158' },
                   { key: 'data_gaps', label: 'Not enough data', icon: HelpOutlineIcon, color: '#8E8E93' },
                 ].map((section) => {
                   const items = insight.data.payload?.[section.key] || [];
                   if (!items.length) return null;
                   return (
                     <Grid item xs={12} md={6} key={section.key}>
                       <Card
                         elevation={0}
                         sx={{
                           height: '100%', borderRadius: '14px',
                           border: '1px solid', borderColor: 'divider',
                         }}
                       >
                         <CardContent>
                           <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                             <Box
                               sx={{
                                 width: 26, height: 26, borderRadius: '8px',
                                 backgroundColor: `${section.color}1f`,
                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                               }}
                             >
                               <section.icon sx={{ color: section.color, fontSize: 15 }} />
                             </Box>
                             <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                               {section.label}
                             </Typography>
                           </Box>
                           <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                             {items.map((item, i) => (
                               <Typography component="li" variant="body2" key={i} sx={{ mb: 0.75 }}>
                                 {item}
                               </Typography>
                             ))}
                           </Box>
                         </CardContent>
                       </Card>
                     </Grid>
                   );
                 })}
               </Grid>
             </Box>
           )}
         </Box>
       )}

       {/* Splits Tab */}
       {activeTab === 4 && (
         <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
           <Box mb={3}>
             <Typography variant="h6" sx={{ fontWeight: 600 }}>Shared expenses</Typography>
             <Typography variant="body2" color="text.secondary">
               Log a bill you paid for a group and track what comes back to you
             </Typography>
           </Box>

           {/* Add a shared bill */}
           <Paper
             elevation={0}
             sx={{
               p: 2.5, mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider',
               bgcolor: 'background.paper',
             }}
           >
             <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
               <TextField
                 fullWidth
                 size="small"
                 sx={{ flex: 1, minWidth: 260 }}
                 placeholder='e.g. "split 1200 dinner with raj and priya"'
                 value={splits.text}
                 onChange={(e) => setSplits(prev => ({ ...prev, text: e.target.value }))}
                 disabled={splits.loading}
                 onKeyDown={(e) => { if (e.key === 'Enter') handleSplitAdd(); }}
               />
               <Button
                 variant="contained"
                 onClick={handleSplitAdd}
                 disabled={splits.loading || !splits.text.trim()}
                 startIcon={<AutoAwesomeIcon />}
               >
                 {splits.loading ? 'Splitting...' : 'Split'}
               </Button>
               <Button
                 variant="outlined"
                 onClick={openSplitForm}
                 startIcon={<AddIcon />}
               >
                 Enter manually
               </Button>
             </Box>
             {splits.loading && <LinearProgress sx={{ mt: 2 }} />}
             <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
               The full amount is recorded as your expense; each person's share is tracked
               as owed to you. Say "paid 500 for raj's ticket" when you didn't share the cost.
             </Typography>
           </Paper>

           {/* You owe - the other side of a split somebody else paid for */}
           {splits.youOwe.length > 0 && (
             <Paper
               elevation={0}
               sx={{
                 p: 2.5, mb: 3, borderRadius: '14px', border: '1px solid',
                 borderColor: `${accents.red}66`,
                 bgcolor: 'background.paper',
               }}
             >
               <Typography variant="overline" color="text.secondary">You owe</Typography>
               <Typography variant="h4" sx={{ fontWeight: 600, color: accents.red, mb: 1.5 }}>
                 {formatCurrency(splits.totalYouOwe)}
               </Typography>
               {splits.youOwe.map((debt) => (
                 <Box
                   key={debt.userId}
                   display="flex" alignItems="center" justifyContent="space-between"
                   gap={2} flexWrap="wrap"
                   sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}
                 >
                   <Box>
                     <Typography variant="body2" sx={{ fontWeight: 600 }}>{debt.name}</Typography>
                     <Typography variant="caption" color="text.secondary">
                       {debt.unsettledCount} shared {debt.unsettledCount === 1 ? 'bill' : 'bills'} they paid for
                     </Typography>
                   </Box>
                   <Box display="flex" alignItems="center" gap={2}>
                     <Typography variant="body1" sx={{ fontWeight: 600 }}>
                       {formatCurrency(debt.owed)}
                     </Typography>
                     <Button
                       size="small"
                       variant="outlined"
                       startIcon={<DoneAllIcon />}
                       onClick={() => handleSettle(debt, 'i_owe')}
                       disabled={splits.settling === `u${debt.userId}`}
                     >
                       {splits.settling === `u${debt.userId}` ? 'Settling...' : 'Mark paid'}
                     </Button>
                   </Box>
                 </Box>
               ))}
             </Paper>
           )}

           {/* Owed to you */}
           {splits.totalOwed > 0 && (
             <Paper
               elevation={0}
               sx={{
                 p: 3, mb: 3, borderRadius: '14px', border: '1px solid', borderColor: 'divider',
                 bgcolor: 'background.paper',
               }}
             >
               <Typography variant="overline" color="text.secondary">Owed to you</Typography>
               <Typography variant="h4" sx={{ fontWeight: 600 }}>
                 {formatCurrency(splits.totalOwed)}
               </Typography>
             </Paper>
           )}

           {splitOnlyBills.length > 0 && (
             <Paper
               elevation={0}
               sx={{ p: 2.5, mb: 3, borderRadius: '14px', border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}
             >
               <Typography variant="overline" color="text.secondary">Split only — not in expenses</Typography>
               {splitOnlyBills.map((s) => (
                 <Box
                   key={s.id}
                   display="flex" alignItems="center" justifyContent="space-between"
                   gap={2} flexWrap="wrap"
                   sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}
                 >
                   <Box sx={{ minWidth: 0 }}>
                     <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.description}</Typography>
                     <Typography variant="caption" color="text.secondary">
                       {s.personName} owes {formatCurrency(s.amount)}{s.paidBy ? ` · paid by ${s.paidBy}` : ''}
                     </Typography>
                   </Box>
                   <Button
                     size="small"
                     variant="outlined"
                     onClick={() => handleAddToExpenses(s.expenseId)}
                   >
                     Add to expenses
                   </Button>
                 </Box>
               ))}
             </Paper>
           )}

           {splits.balances.length === 0 && splits.youOwe.length === 0 && splitOnlyBills.length === 0 ? (
             <Paper
               elevation={0}
               sx={{ p: 4, borderRadius: '14px', textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}
             >
               <CallSplitIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
               <Typography variant="body1" sx={{ fontWeight: 500 }}>No shared expenses yet</Typography>
               <Typography variant="body2" color="text.secondary">
                 Split a bill above and whoever owes you will show up here.
               </Typography>
             </Paper>
           ) : (
             <Grid container spacing={2}>
               {splits.balances.map((balance) => {
                 const isExpanded = expandedPerson === balance.personId;
                 return (
                 <Grid item xs={12} sm={6} md={4} key={balance.personId}>
                   <Card
                     elevation={0}
                     sx={{
                       borderRadius: '14px', border: '1px solid',
                       borderColor: balance.owed > 0 ? `${accents.amber}66` : 'divider',
                     }}
                   >
                     <CardContent>
                       <Box
                         display="flex" alignItems="center" gap={2} mb={1.5}
                         sx={{ cursor: balance.unsettledCount > 0 ? 'pointer' : 'default' }}
                         onClick={() => balance.unsettledCount > 0 && togglePersonSplits(balance.personId)}
                       >
                         <Box
                           sx={{
                             width: 38, height: 38, borderRadius: '50%',
                             bgcolor: balance.owed > 0 ? `${accents.amber}1f` : `${accents.mint}1f`,
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             flexShrink: 0,
                           }}
                         >
                           <PersonIcon sx={{ color: balance.owed > 0 ? accents.amber : accents.mint, fontSize: 19 }} />
                         </Box>
                         <Box sx={{ minWidth: 0, flex: 1 }}>
                           <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                             {balance.name}
                           </Typography>
                           <Typography variant="caption" color="text.secondary" noWrap>
                             {balance.unsettledCount === 0
                               ? 'all settled'
                               : `${balance.unsettledCount} unsettled`}
                             {balance.linkedUsername ? ' · has an account' : ''}
                           </Typography>
                         </Box>
                         {balance.unsettledCount > 0 && (
                           <ExpandMoreIcon
                             sx={{
                               fontSize: 20, color: 'text.disabled',
                               transform: isExpanded ? 'rotate(180deg)' : 'none',
                               transition: 'transform .2s ease',
                             }}
                           />
                         )}
                       </Box>
                       <Typography
                         variant="h5"
                         sx={{ fontWeight: 600 }}
                         color={balance.owed > 0 ? 'warning.main' : 'text.secondary'}
                       >
                         {formatCurrency(balance.owed)}
                       </Typography>

                       <Collapse in={isExpanded}>
                         <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                           {personSplits.length === 0 ? (
                             <Typography variant="caption" color="text.disabled">Loading…</Typography>
                           ) : personSplits.map((s) => (
                             <Box
                               key={s.id}
                               display="flex" alignItems="center" justifyContent="space-between"
                               gap={1} sx={{ py: 0.75 }}
                             >
                               <Box sx={{ minWidth: 0, flex: 1 }}>
                                 <Typography variant="body2" sx={{ fontWeight: 550, fontSize: 13 }} noWrap>
                                   {s.description}
                                 </Typography>
                                 <Typography variant="caption" color="text.secondary" noWrap>
                                   {s.date}{s.paidBy ? ` · paid by ${s.paidBy}` : ''}
                                 </Typography>
                               </Box>
                               <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                 {formatCurrency(s.amount)}
                               </Typography>
                               <Button
                                 size="small"
                                 variant="text"
                                 sx={{ minWidth: 0, px: 1, fontSize: 11 }}
                                 onClick={() => handleSettleSingle(s.id, s.personName, s.amount)}
                                 disabled={splits.settling === `s${s.id}`}
                               >
                                 {splits.settling === `s${s.id}` ? '…' : 'Paid'}
                               </Button>
                             </Box>
                           ))}
                         </Box>
                       </Collapse>

                       {balance.owed > 0 && (
                         <Button
                           fullWidth
                           size="small"
                           variant="outlined"
                           startIcon={<DoneAllIcon />}
                           sx={{ mt: 1.5 }}
                           onClick={() => handleSettle(balance)}
                           disabled={splits.settling === balance.personId}
                         >
                           {splits.settling === balance.personId ? 'Settling...' : 'Settle all'}
                         </Button>
                       )}
                     </CardContent>
                   </Card>
                 </Grid>
                 );
               })}
             </Grid>
           )}
         </Box>
       )}
     </Paper>

     {/* Context Menu */}
     <Menu
       anchorEl={anchorEl}
       open={!!anchorEl}
       onClose={handleMenuClose}
       PaperProps={{ sx: { minWidth: 160 } }}
     >
       {menuType?.type === 'category' && (
         <>
           <MenuItem onClick={() => { handleMenuClose(); openCategoryForm(menuType.item); }}>
             <ListItemIcon><EditIcon fontSize="small" sx={{ color: '#0A84FF' }} /></ListItemIcon>
             <ListItemText>Edit</ListItemText>
           </MenuItem>
           <MenuItem onClick={() => { handleMenuClose(); deleteCategoryHandler(menuType.item.id); }} sx={{ color: '#FF453A' }}>
             <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#FF453A' }} /></ListItemIcon>
             <ListItemText>Delete</ListItemText>
           </MenuItem>
         </>
       )}
       {menuType?.type === 'tag' && (
         <>
           <MenuItem onClick={() => { handleMenuClose(); openTagForm(menuType.item); }}>
             <ListItemIcon><EditIcon fontSize="small" sx={{ color: '#0A84FF' }} /></ListItemIcon>
             <ListItemText>Edit</ListItemText>
           </MenuItem>
           <MenuItem onClick={() => { handleMenuClose(); deleteTagHandler(menuType.item.id); }} sx={{ color: '#FF453A' }}>
             <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#FF453A' }} /></ListItemIcon>
             <ListItemText>Delete</ListItemText>
           </MenuItem>
         </>
       )}
       {menuType?.type === 'filter' && (
         <>
           <MenuItem onClick={() => { handleMenuClose(); handleFilterChange('amountMin', ''); handleFilterChange('amountMax', ''); }}>
             <ListItemIcon><FilterIcon fontSize="small" sx={{ color: '#0A84FF' }} /></ListItemIcon>
             <ListItemText>Amount Range</ListItemText>
           </MenuItem>
           <MenuItem onClick={() => { handleMenuClose(); handleFilterChange('tags', []); }}>
             <ListItemIcon><TagIcon fontSize="small" sx={{ color: '#FF9F0A' }} /></ListItemIcon>
             <ListItemText>Tag Filter</ListItemText>
           </MenuItem>
         </>
       )}
     </Menu>

     {/* Transaction story - the shared drawer, rich detail on tapping a row */}
     <TransactionStoryDrawer
       open={!!story}
       story={story ? {
         ...buildStoryFromExpense(story, expenses),
         context: storyContext(story),
         actions: [
           { label: 'Edit', icon: EditIcon, onClick: () => { setStory(null); openExpenseForm(story); } },
           { label: 'Delete', icon: DeleteIcon, tone: accents.red, onClick: () => { setStory(null); deleteExpenseHandler(story.id); } },
         ],
       } : null}
       onClose={() => setStory(null)}
     />

     {/* Expense composer - amount-first, type-tinted, categories as chips */}
     <ExpenseComposer
       open={expenseForm.open}
       editing={expenseForm.editing}
       data={expenseForm.data}
       saving={loading}
       categories={categories}
       tags={tags}
       onClose={closeExpenseForm}
       onChange={(patch) => setExpenseForm(prev => ({ ...prev, data: { ...prev.data, ...patch } }))}
       onSave={saveExpense}
       onSmartParse={(text) => bulkAddExpenses(text, false)}
       onAddBatch={addExpenseBatch}
       onAddOne={addExpenseOne}
     />

     {/* Category Form Dialog */}
     <Dialog open={categoryForm.open} onClose={closeCategoryForm} maxWidth="sm" fullWidth>
       <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
         <Box
           sx={{
             width: 40, height: 40, borderRadius: '12px',
             bgcolor: `${categoryForm.data.color}1f`,
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             flexShrink: 0,
             transition: 'background-color 0.2s ease',
           }}
         >
           <CategoryIcon sx={{ color: categoryForm.data.color, fontSize: 20 }} />
         </Box>
         <Box sx={{ flexGrow: 1, minWidth: 0 }}>
           <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
             {categoryForm.editing ? 'Edit Category' : 'Add New Category'}
           </Typography>
           <Typography variant="body2" color="text.secondary">
             Group expenses under a color-coded category
           </Typography>
         </Box>
         <IconButton onClick={closeCategoryForm} size="small">
           <CloseIcon fontSize="small" />
         </IconButton>
       </DialogTitle>
       <DialogContent>
         <Grid container spacing={3} sx={{ mt: 1 }}>
           <Grid item xs={12}>
             <TextField
               fullWidth
               label="Name *"
               value={categoryForm.data.name}
               onChange={(e) => setCategoryForm(prev => ({
                 ...prev,
                 data: { ...prev.data, name: e.target.value }
               }))}
             />
           </Grid>
           <Grid item xs={12}>
             <TextField
               fullWidth
               label="Description"
               multiline
               rows={2}
               value={categoryForm.data.description}
               onChange={(e) => setCategoryForm(prev => ({
                 ...prev,
                 data: { ...prev.data, description: e.target.value }
               }))}
             />
           </Grid>
           <Grid item xs={12} md={6}>
             <TextField
               fullWidth
               type="color"
               label="Color"
               value={categoryForm.data.color}
               onChange={(e) => setCategoryForm(prev => ({
                 ...prev,
                 data: { ...prev.data, color: e.target.value }
               }))}
             />
           </Grid>
           <Grid item xs={12} md={6}>
             <AutocompleteComponent
               options={[
                 { label: 'Expense', id: 'expense' },
                 { label: 'Income', id: 'income' },
                 { label: 'Both', id: 'both' }
               ]}
               label="Transaction Type"
               value={categoryForm.data.transactionType}
               onChange={(value) => setCategoryForm(prev => ({
                 ...prev,
                 data: { ...prev.data, transactionType: value }
               }))}
             />
           </Grid>
           {categoryForm.data.name && (
             <Grid item xs={12}>
               <Chip
                 label={categoryForm.data.name}
                 sx={{
                   backgroundColor: categoryForm.data.color,
                   color: '#fff',
                   fontWeight: 600,
                 }}
               />
             </Grid>
           )}
         </Grid>
       </DialogContent>
       <DialogActions>
         <Button onClick={closeCategoryForm} color="inherit">Cancel</Button>
         <Button onClick={saveCategory} variant="contained">
           {categoryForm.editing ? 'Update' : 'Add'} Category
         </Button>
       </DialogActions>
     </Dialog>

     {/* Tag Form Dialog */}
     <Dialog open={tagForm.open} onClose={closeTagForm} maxWidth="sm" fullWidth>
       <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
         <Box
           sx={{
             width: 40, height: 40, borderRadius: '12px',
             bgcolor: `${tagForm.data.color}1f`,
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             flexShrink: 0,
             transition: 'background-color 0.2s ease',
           }}
         >
           <TagIcon sx={{ color: tagForm.data.color, fontSize: 20 }} />
         </Box>
         <Box sx={{ flexGrow: 1, minWidth: 0 }}>
           <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
             {tagForm.editing ? 'Edit Tag' : 'Add New Tag'}
           </Typography>
           <Typography variant="body2" color="text.secondary">
             Tags help you slice expenses across categories
           </Typography>
         </Box>
         <IconButton onClick={closeTagForm} size="small">
           <CloseIcon fontSize="small" />
         </IconButton>
       </DialogTitle>
       <DialogContent>
         <Grid container spacing={3} sx={{ mt: 1 }}>
           <Grid item xs={12}>
             <TextField
               fullWidth
               label="Name *"
               value={tagForm.data.name}
               onChange={(e) => setTagForm(prev => ({
                 ...prev,
                 data: { ...prev.data, name: e.target.value }
               }))}
             />
           </Grid>
           <Grid item xs={12} md={6}>
             <TextField
               fullWidth
               type="color"
               label="Color"
               value={tagForm.data.color}
               onChange={(e) => setTagForm(prev => ({
                 ...prev,
                 data: { ...prev.data, color: e.target.value }
               }))}
             />
           </Grid>
           {tagForm.data.name && (
             <Grid item xs={12} md={6}>
               <Box display="flex" alignItems="center" height="100%">
                 <Chip
                   label={tagForm.data.name}
                   sx={{
                     backgroundColor: tagForm.data.color,
                     color: '#fff',
                     fontWeight: 500,
                   }}
                 />
               </Box>
             </Grid>
           )}
         </Grid>
       </DialogContent>
       <DialogActions>
         <Button onClick={closeTagForm} color="inherit">Cancel</Button>
         <Button onClick={saveTag} variant="contained">
           {tagForm.editing ? 'Update' : 'Add'} Tag
         </Button>
       </DialogActions>
     </Dialog>




     {/* Manual split - exact numbers, no model call */}
     <Dialog open={splitForm.open} onClose={closeSplitForm} maxWidth="sm" fullWidth>
       <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
         <Box
           sx={{
             width: 40, height: 40, borderRadius: '12px',
             bgcolor: `${accents.amber}1f`,
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             flexShrink: 0,
           }}
         >
           <CallSplitIcon sx={{ color: accents.amber, fontSize: 20 }} />
         </Box>
         <Box sx={{ flexGrow: 1, minWidth: 0 }}>
           <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>Split a bill</Typography>
           <Typography variant="body2" color="text.secondary">
             Exact amounts, no AI involved
           </Typography>
         </Box>
         <IconButton onClick={closeSplitForm} size="small"><CloseIcon fontSize="small" /></IconButton>
       </DialogTitle>
       <DialogContent>
         <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
           <Grid item xs={12} sm={5}>
             <TextField
               fullWidth label="Amount *" type="number"
               value={splitForm.amount}
               onChange={(e) => setSplitForm(prev => ({ ...prev, amount: e.target.value }))}
               InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
             />
           </Grid>
           <Grid item xs={12} sm={7}>
             <TextField
               fullWidth label="What for? *"
               value={splitForm.description}
               onChange={(e) => setSplitForm(prev => ({ ...prev, description: e.target.value }))}
             />
           </Grid>

           <Grid item xs={12}>
             <AutocompleteComponent
               options={categories.map(cat => ({ label: cat.name, id: cat.id }))}
               label="Category"
               value={splitForm.categoryId}
               onChange={(value) => setSplitForm(prev => ({ ...prev, categoryId: value }))}
             />
           </Grid>

           <Grid item xs={12}>
             <Autocomplete
               multiple
               freeSolo
               options={splitForm.userOptions}
               getOptionLabel={(option) =>
                 typeof option === 'string' ? option : option.username}
               filterSelectedOptions
               loading={splitForm.searching}
               onInputChange={(e, value, reason) => {
                 if (reason === 'input' && value.length >= 2) searchUsers(value);
               }}
               onChange={(e, values) => {
                 setSplitForm(prev => ({
                   ...prev,
                   // An option from the list carries a userId, so the split
                   // reaches that account's panel; free text is a name only.
                   people: values.map(v => {
                     const existing = prev.people.find(p =>
                       p.label === (typeof v === 'string' ? v : v.username));
                     if (existing) return existing;
                     return typeof v === 'string'
                       ? { label: v, userId: null, amount: '' }
                       : { label: v.username, userId: v.userId, amount: '' };
                   })
                 }));
               }}
               renderInput={(params) => (
                 <TextField
                   {...params}
                   label="Split with *"
                   placeholder="Search accounts, or type a name"
                   helperText="People with an account see the split in their own panel"
                 />
               )}
             />
           </Grid>

           {splitForm.people.length > 0 && (
             <Grid item xs={12}>
               <Box
                 sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', px: 2, py: 0.5, mb: 1.5 }}
               >
                 <FormControlLabel
                   control={
                     <Switch
                       checked={splitForm.splitWithMe}
                       onChange={(e) => setSplitForm(prev => ({ ...prev, splitWithMe: e.target.checked }))}
                     />
                   }
                   label="I shared this too"
                 />
                 <FormControlLabel
                   control={
                     <Switch
                       checked={splitForm.addToExpenses}
                       onChange={(e) => setSplitForm(prev => ({ ...prev, addToExpenses: e.target.checked }))}
                     />
                   }
                   label="Add to my expenses"
                 />
               </Box>

               <Box sx={{ mt: 1.5, mb: 0.5 }}>
                 <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
                   Who paid?
                 </Typography>
                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                   <Chip
                     label="I paid"
                     size="small"
                     variant={!splitForm.paidBy ? 'filled' : 'outlined'}
                     color={!splitForm.paidBy ? 'primary' : 'default'}
                     onClick={() => setSplitForm(prev => ({ ...prev, paidBy: '' }))}
                   />
                   {splitForm.people.map(p => (
                     <Chip
                       key={p.label}
                       label={p.label}
                       size="small"
                       variant={splitForm.paidBy === p.label ? 'filled' : 'outlined'}
                       color={splitForm.paidBy === p.label ? 'primary' : 'default'}
                       onClick={() => setSplitForm(prev => ({ ...prev, paidBy: p.label }))}
                     />
                   ))}
                 </Box>
               </Box>

               <Typography variant="caption" color="text.secondary">
                 Leave amounts blank to divide evenly, or set one to fix that person's share
               </Typography>
               {splitForm.people.map((person, index) => (
                 <Box key={person.label} display="flex" alignItems="center" gap={2} sx={{ mt: 1.5 }}>
                   <Chip
                     label={person.label}
                     size="small"
                     color={person.userId ? 'primary' : 'default'}
                     variant={person.userId ? 'filled' : 'outlined'}
                     sx={{ minWidth: 110 }}
                   />
                   <TextField
                     size="small" type="number" placeholder="even"
                     value={person.amount}
                     onChange={(e) => setSplitForm(prev => {
                       const people = [...prev.people];
                       people[index] = { ...people[index], amount: e.target.value };
                       return { ...prev, people };
                     })}
                     InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                     sx={{ width: 150 }}
                   />
                 </Box>
               ))}
             </Grid>
           )}

           {(() => {
             const preview = previewShares();
             if (!preview) return null;
             if (preview.error) {
               return (
                 <Grid item xs={12}>
                   <Alert severity="warning">{preview.error}</Alert>
                 </Grid>
               );
             }
             return (
               <Grid item xs={12}>
                 <Paper
                   elevation={0}
                   sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}
                 >
                   <Typography variant="caption" color="text.secondary">Who owes what</Typography>
                   {preview.shares.map((share) => (
                     <Box key={share.label} display="flex" justifyContent="space-between" sx={{ mt: 0.5 }}>
                       <Typography variant="body2">{share.label}</Typography>
                       <Typography variant="body2" fontWeight={600}>
                         {formatCurrency(share.amount)}
                       </Typography>
                     </Box>
                   ))}
                   <Box display="flex" justifyContent="space-between" sx={{ mt: 0.5 }}>
                     <Typography variant="body2" color="text.secondary">you</Typography>
                     <Typography variant="body2" color="text.secondary" fontWeight={600}>
                       {formatCurrency(preview.yours)}
                     </Typography>
                   </Box>
                 </Paper>
               </Grid>
             );
           })()}
         </Grid>
       </DialogContent>
       <DialogActions>
         <Button onClick={closeSplitForm} color="inherit">Cancel</Button>
         <Button
           onClick={saveManualSplit}
           variant="contained"
           disabled={splitForm.saving || !splitForm.amount || splitForm.people.length === 0}
         >
           {splitForm.saving ? 'Saving...' : 'Create split'}
         </Button>
       </DialogActions>
     </Dialog>

     {/* Floating Action Button for mobile */}
     <Fab
       aria-label="add"
       sx={{
         position: 'fixed', right: 16,
         // Sits above the bottom bar on a phone, in the corner on desktop.
         bottom: { xs: 'calc(76px + env(safe-area-inset-bottom))', md: 24 },
         bgcolor: accents.mint, color: '#04150e',
         boxShadow: '0 8px 24px -6px rgba(0,0,0,0.5)',
         '&:hover': { bgcolor: accents.mint, filter: 'brightness(1.05)' },
       }}
       onClick={() => openExpenseForm()}
     >
       <AddIcon />
     </Fab>
     </Box>
   </Container>
   </>
 );
}
