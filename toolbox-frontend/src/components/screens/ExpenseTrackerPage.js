import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Container, Typography, Paper,
  Button, TextField, Alert, Snackbar, Chip, IconButton, Tooltip,
  Fab, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer,
  TableRow, TablePagination, InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Dashboard as DashboardIcon,
  LocalOffer as LabelsIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Insights as InsightsIcon,
  ChevronRight as ChevronRightIcon,
  CallSplit as MergeIcon,
} from '@mui/icons-material';

// Import API functions and reusable components
import {
  addExpenseApi, getExpenses, updateExpense, deleteExpense,
  getCategories, createCategory, updateCategory, deleteCategory,
  getTags, createTag, updateTag, deleteTag,
  getExpenseSummary, quickAddExpense, bulkAddExpenses,
  generateExpenseInsight, getLatestExpenseInsight, askExpenses,
  getSplits, getCategoryMergeSuggestions,
} from '../rest/expenseTrackerApis';

import DatePickerComponent from '../ReusableComponents/DatePickerComponent';
import SummaryStrip from '../ui/SummaryStrip';
import ActivityDeck from '../ui/ActivityDeck';
import ExpenseTimeline from '../ui/ExpenseTimeline';
import ActivityScopeBar, { scopeRange } from '../ui/ActivityScopeBar';
import ActivityComposition from '../ui/ActivityComposition';
import ActivityTagChips from '../ui/ActivityTagChips';
import ActivityGlance from '../ui/ActivityGlance';
import AmountRangeSlider from '../ui/AmountRangeSlider';
import BottomSheet from '../ui/BottomSheet';
import ExpenseComposer from '../ui/ExpenseComposer';
import QuickCapture from '../ui/QuickCapture';
import ErrorBanner from '../ui/ErrorBanner';
import { ExpenseListSkeleton, SummarySkeleton } from '../ui/Skeletons';
import { money } from '../ui/money';
import Reveal from '../ui/Reveal';
import { feedback } from '../ui/feedback';
import usePressSpring from '../ui/usePressSpring';
import ConfirmDialog from '../ui/ConfirmDialog';
import ActivityInsightsPanel from '../ui/ActivityInsightsPanel';
import ActivityLabelsPanel from '../ui/ActivityLabelsPanel';
import ActivityLabelDialog from '../ui/ActivityLabelDialog';
import { TransactionStoryDrawer, buildStoryFromExpense, PageHeader } from '../ui';
import DashMonthForecast from '../ui/DashMonthForecast';
import CursorGlow from '../motion/CursorGlow';
import AssistantOrb from '../ui/AssistantOrb';
import { accents, color, radius } from '../../theme/tokens';
import { AnimatePresence, motion as framerMotion } from 'framer-motion';

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
 // A save that looks like it echoes one from the last few minutes — same
 // amount, category, date (see ExpenseViewSet.create). Never blocks the
 // save; just a dismissible heads-up.
 const [duplicateWarning, setDuplicateWarning] = useState(null);
 const [activeTab, setActiveTab] = useState(0);
 // The four sections now live in ActivityDeck, which owns both the tab row and
 // the drag between panels — direction, momentum, the peek on the incoming
 // edge and the entrance are all one piece of physics in there, so nothing but
 // the index needs to live here.
 const selectTab = React.useCallback((next) => setActiveTab(next), []);
 // Which half of the Labels tab is showing. Categories first: every expense
 // has one, tags are the optional second cut.
 const [labelSegment, setLabelSegment] = useState('categories');
 // The one pending confirmation on the page. `window.confirm` blocks the whole
 // tab, can't be themed, and on iOS reads as a browser warning rather than as
 // this app asking — every destructive step now routes through ConfirmDialog.
 const [confirm, setConfirm] = useState(null);

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
 // The scope in words. Insights and Labels both quote real totals, so they
 // have to name the window those totals cover — a figure with no period is a
 // figure you can't trust (Apple Design §16.6, wayfinding).
 const scopeLabel = React.useMemo(() => {
   if (!scope || scope.mode === 'all') return 'All time';
   if (scope.mode === 'last30') return 'Last 30 days';
   const now = new Date();
   if (scope.year === now.getFullYear() && scope.month === now.getMonth()) return 'This month';
   return new Date(scope.year, scope.month, 1)
     .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
 }, [scope]);

 // A category row anywhere on the page opens exactly those transactions.
 const drillIntoCategory = (categoryId) => {
   setFilters(prev => ({ ...prev, category: String(categoryId) }));
   setPagination(prev => ({ ...prev, page: 0 }));
   selectTab(0);
   feedback('open');
 };
 // Same idea, for a tag row — tags are multi-select in the filter sheet, so
 // this replaces rather than adds to whatever tag filter was already active.
 const drillIntoTag = (tagId) => {
   setFilters(prev => ({ ...prev, tags: [String(tagId)] }));
   setPagination(prev => ({ ...prev, page: 0 }));
   selectTab(0);
   feedback('open');
 };
 // Filters live in a sheet, opened on demand — a modal that springs open
 // unasked on page load is never "there's room for it," just a surprise.
 const [filtersOpen, setFiltersOpen] = useState(false);
 const clearFiltersPress = usePressSpring({ pressScale: 0.88 });
 const filterTriggerPress = usePressSpring({ pressScale: 0.98 });

 // Quick Add (free-text, parsed by the LLM router endpoint) state
 const [story, setStory] = useState(null);
 const [quickAddText, setQuickAddText] = useState('');
 const [quickAddLoading, setQuickAddLoading] = useState(false);

 // Bulk import: paste a chat log, review what was found, then save
 // Spending review written by the model
 const [insight, setInsight] = useState({ data: null, loading: false, loaded: false });

 // Plain-language question over the expense list
 const [ask, setAsk] = useState({ question: '', loading: false, answer: null });

 // Swipe-to-delete undo state
 const [deletedExpense, setDeletedExpense] = useState(null);
 const [undoOpen, setUndoOpen] = useState(false);
 const undoTimerRef = React.useRef(null);
 const pendingDeleteIdRef = React.useRef(null);

 // Category merge suggestions
 const [mergeSuggestions, setMergeSuggestions] = useState([]);
 const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
 const [mergeDismissed, setMergeDismissed] = useState(
   () => sessionStorage.getItem('merge_suggestion_dismissed') === '1'
 );

 /**
  * The three sections, and the one real figure each can put on the peek card
  * that rides in behind a page drag (Apple Design §8). Every hint is a number
  * this page already holds — the server's transaction count, the label counts,
  * the categories the summary actually broke down. A section whose data has
  * not loaded yet contributes no hint at all rather than a placeholder: the
  * peek shows its name, and nothing more.
  */
 const deckSections = React.useMemo(() => [
   {
     label: 'Expenses', icon: DashboardIcon, color: accents.cyan,
     hint: pagination.total
       ? `${pagination.total} ${pagination.total === 1 ? 'transaction' : 'transactions'} · ${scopeLabel}`
       : undefined,
   },
   {
     label: 'Labels', icon: LabelsIcon, color: accents.violet,
     hint: categories.length || tags.length
       ? `${categories.length} categories · ${tags.length} tags`
       : undefined,
   },
   {
     label: 'Insights', icon: InsightsIcon, color: accents.mint,
     hint: summary?.categoryBreakdown?.length
       ? `${summary.categoryBreakdown.length} categories · ${scopeLabel}`
       : undefined,
   },
 ], [pagination.total, scopeLabel, categories.length, tags.length, summary]);

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
     // A share somebody else billed you lives on THEIR expense, so it never
     // appears in this list - yet once you accept it, it counts in your
     // spending. That left it felt but invisible. Accepted shares are fetched
     // alongside and merged in, so the item shows up where its effect is.
     const [response, shares] = await Promise.all([
       getExpenses({
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
       }),
       getSplits({ direction: 'you_owe', included: true }).catch(() => []),
     ]);

     const rows = response.results || [];
     // Scope them to the same window the list is showing, or the day groups
     // would carry dates the rest of the page has filtered out.
     const inScope = (d) => {
       if (!d) return false;
       const day = String(d).slice(0, 10);
       if (filters.dateFrom && day < filters.dateFrom) return false;
       if (filters.dateTo && day > filters.dateTo) return false;
       return true;
     };
     const shareRows = (shares || [])
       .filter((sp) => inScope(sp.date))
       .map((sp) => ({
         // Namespaced so it can never collide with an expense id, since these
         // two sets of ids come from different tables.
         id: `share-${sp.id}`,
         splitId: sp.id,
         date: sp.date,
         description: sp.description,
         amount: sp.amount,
         yourShare: sp.amount,
         transaction_type: 'expense',
         category: null,
         isSharedWithMe: true,
         paidBy: sp.paidBy,
       }));

     const merged = [...rows, ...shareRows].sort((a, b) => {
       const da = String(a.date || '').slice(0, 10);
       const db = String(b.date || '').slice(0, 10);
       return da < db ? 1 : da > db ? -1 : 0;
     });

     setExpenses(merged);
     // The count stays the server's: shares are not part of its pagination, so
     // claiming otherwise would make the pager lie about how many pages exist.
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
     // Same filters the list itself reads, so SPENT/INCOME/BALANCE up top
     // stays in lockstep with whatever's actually narrowing the rows below —
     // a tag or category filter used to only touch the list, leaving the
     // header quoting the whole scope's totals.
     const summaryData = await getExpenseSummary({
       dateFrom: filters.dateFrom,
       dateTo: filters.dateTo,
       amountMin: filters.amountMin,
       amountMax: filters.amountMax,
       category: filters.category,
       tags: filters.tags,
       search: filters.search,
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
       const created = await addExpenseApi(expenseForm.data);
       setSuccess('Expense added successfully!');
       if (created?.duplicateWarning) {
         const d = created.duplicateWarning;
         setDuplicateWarning(`Looks like a duplicate of "${d.description}" (${money(parseFloat(d.amount))}) added moments ago.`);
       }
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

 // Swipe-to-delete: optimistically remove from UI, offer a 5-second undo window,
 // then commit the real API delete. If another swipe arrives before the timer
 // fires, the pending deletion is committed immediately.
 const deleteExpenseDirect = (expenseId) => {
   // Commit any previous pending deletion before starting this one
   if (undoTimerRef.current) {
     clearTimeout(undoTimerRef.current);
     undoTimerRef.current = null;
     const prevId = pendingDeleteIdRef.current;
     pendingDeleteIdRef.current = null;
     if (prevId) deleteExpense(prevId).then(() => loadSummary()).catch(() => {});
     setUndoOpen(false);
     setDeletedExpense(null);
   }

   const toDelete = expenses.find(e => e.id === expenseId);
   if (!toDelete) return;

   pendingDeleteIdRef.current = expenseId;
   setExpenses(prev => prev.filter(e => e.id !== expenseId));
   setDeletedExpense(toDelete);
   setUndoOpen(true);

   undoTimerRef.current = setTimeout(async () => {
     undoTimerRef.current = null;
     pendingDeleteIdRef.current = null;
     setUndoOpen(false);
     setDeletedExpense(null);
     try {
       await deleteExpense(expenseId);
       loadSummary();
     } catch {
       setError('Failed to delete expense');
       loadExpenses();
     }
   }, 5000);
 };

 const handleUndoDelete = () => {
   if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
   pendingDeleteIdRef.current = null;
   setUndoOpen(false);
   const exp = deletedExpense;
   setDeletedExpense(null);
   if (!exp) return;
   addExpenseApi({
     amount: String(exp.amount),
     transactionType: exp.type || 'expense',
     categoryId: exp.category?.id || '',
     description: exp.description,
     date: exp.date,
     tagIds: (exp.tags || []).map(t => t.id),
     location: exp.location || '',
     paymentMethod: exp.paymentMethod || '',
     isRecurring: exp.isRecurring || false,
   }).then(() => {
     loadExpenses();
     loadSummary();
     setSuccess('Expense restored');
   }).catch(() => setError('Could not restore the expense'));
 };

 // The menu delete already has a confirm dialog — delete immediately there.
 const deleteExpenseHandler = (expenseId) => setConfirm({
   title: 'Delete this expense?',
   message: 'It disappears from the timeline and from every total on this page.',
   confirmLabel: 'Delete',
   destructive: true,
   onConfirm: async () => {
     setLoading(true);
     try {
       await deleteExpense(expenseId);
       setSuccess('Expense deleted successfully!');
       loadExpenses();
       loadSummary();
     } catch {
       setError('Failed to delete expense');
     } finally {
       setLoading(false);
     }
   },
 });

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

 const askDeleteCategory = (category) => setConfirm({
   title: `Delete "${category.name}"?`,
   message: 'Expenses already filed under it keep their amounts, but lose this grouping.',
   confirmLabel: 'Delete',
   destructive: true,
   onConfirm: () => deleteCategoryHandler(category.id),
 });

 const deleteCategoryHandler = async (categoryId) => {
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

 const askDeleteTag = (tag) => setConfirm({
   title: `Delete "${tag.name}"?`,
   message: 'The tag comes off every expense carrying it. Nothing else changes.',
   confirmLabel: 'Delete',
   destructive: true,
   onConfirm: () => deleteTagHandler(tag.id),
 });

 const deleteTagHandler = async (tagId) => {
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
   if (activeTab === 2 && !insight.loaded && isAuthenticated) {
     loadLatestInsight();
   }
 }, [activeTab, insight.loaded, isAuthenticated]);

 // Fetch category merge suggestions once on load; respect session-level dismissal.
 useEffect(() => {
   if (!isAuthenticated || mergeDismissed) return;
   getCategoryMergeSuggestions()
     .then(data => setMergeSuggestions(data?.suggestions || []))
     .catch(() => {});
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [isAuthenticated]);

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

 // Shown next to the Filters heading so a filter hidden behind the fold can't
 // silently explain why the list looks short.
 const activeFilterCount = [
   filters.search, filters.category, filters.dateFrom, filters.dateTo,
   filters.amountMin, filters.amountMax,
 ].filter(Boolean).length + (filters.tags?.length ? 1 : 0);

 // Every filter this tray owns (search / amount / category / tags — date and
 // scope stay the scope bar's own business), as a removable token each — the
 // Mail/Files pattern of showing exactly what's narrowing the view instead of
 // making you reopen the sheet to remember, or to undo just one of them.
 const activeFilterChips = React.useMemo(() => {
   const chips = [];
   if (filters.search) {
     chips.push({ key: 'search', label: `“${filters.search}”`, onRemove: () => handleFilterChange('search', '') });
   }
   if (filters.amountMin || filters.amountMax) {
     const lo = filters.amountMin ? money(Number(filters.amountMin)) : 'Any';
     const hi = filters.amountMax ? money(Number(filters.amountMax)) : 'Any';
     chips.push({
       key: 'amount', label: `${lo} – ${hi}`,
       onRemove: () => { handleFilterChange('amountMin', ''); handleFilterChange('amountMax', ''); },
     });
   }
   if (filters.category) {
     const cat = categories.find((c) => String(c.id) === String(filters.category));
     chips.push({ key: 'category', label: cat?.name || 'Category', color: cat?.color, onRemove: () => handleFilterChange('category', '') });
   }
   (filters.tags || []).forEach((tagId) => {
     const tag = tags.find((t) => String(t.id) === String(tagId));
     if (!tag) return;
     chips.push({
       key: `tag-${tagId}`, label: tag.name, color: tag.color,
       onRemove: () => handleFilterChange('tags', filters.tags.filter((id) => String(id) !== String(tagId))),
     });
   });
   return chips;
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [filters.search, filters.amountMin, filters.amountMax, filters.category, filters.tags, categories, tags]);

 // A one-line story context: this expense's place in its category this month.
 const storyContext = (expense) => {
   if (!expense?.category) return null;
   const sameCat = expenses.filter(e => e.category?.id === expense.category.id
     && (e.transaction_type === 'expense' || e.type === 'expense'));
   const total = sameCat.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
   if (sameCat.length <= 1) return `First ${expense.category.name} expense in this view.`;
   return `${sameCat.length} ${expense.category.name} expenses shown, ${formatCurrency(total)} in total.`;
 };

 // One formatter for the whole app: the panels below print the same figures
 // this page does, and two Intl instances is two chances to disagree.
 const formatCurrency = (amount) => money(amount);

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
         // The app shell already pays a 12px gutter on a phone, so this only
         // needs enough to lift the panel off it — a second 16px inset just
         // starved the Activity rows of the width their descriptions need.
         px: { xs: 1.25, sm: 3 },
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
     <Snackbar
       open={!!duplicateWarning}
       autoHideDuration={7000}
       onClose={() => setDuplicateWarning(null)}
       anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
       sx={{ bottom: { xs: 80, md: 24 } }}
     >
       <Alert onClose={() => setDuplicateWarning(null)} severity="warning" sx={{ width: '100%', borderRadius: 3 }}>
         {duplicateWarning}
       </Alert>
     </Snackbar>

     {/* Swipe-to-delete undo toast */}
     <Snackbar
       open={undoOpen}
       anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
       sx={{ bottom: { xs: 80, md: 24 } }}
       message="Expense deleted"
       action={
         <Button color="inherit" size="small" onClick={handleUndoDelete}>
           Undo
         </Button>
       }
     />

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

     {/* Category merge suggestion banner — shown once per session, dismissed to sessionStorage */}
     {!mergeDismissed && mergeSuggestions.length > 0 && (
       <Box
         sx={{
           display: 'flex', alignItems: 'center', justifyContent: 'space-between',
           gap: 1, px: 1.5, py: 1, mb: 2,
           borderRadius: `${radius.lg}px`,
           border: '1px solid', borderColor: `${accents.amber}44`,
           bgcolor: (t) => t.palette.mode === 'dark' ? `${accents.amber}10` : `${accents.amber}08`,
         }}
       >
         <Box
           role="button"
           onClick={() => setMergeDialogOpen(true)}
           sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, cursor: 'pointer', minWidth: 0 }}
         >
           <MergeIcon sx={{ fontSize: 16, color: accents.amber, flexShrink: 0 }} />
           <Typography sx={{ fontSize: 13, fontWeight: 550, color: 'text.secondary' }} noWrap>
             Tip: You have overlapping categories — review
           </Typography>
           <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
         </Box>
         <IconButton
           size="small"
           aria-label="Dismiss"
           onClick={() => {
             sessionStorage.setItem('merge_suggestion_dismissed', '1');
             setMergeDismissed(true);
           }}
           sx={{ flexShrink: 0, color: 'text.disabled' }}
         >
           <CloseIcon sx={{ fontSize: 15 }} />
         </IconButton>
       </Box>
     )}

     {/* Main Content Tabs */}
     <Paper
       elevation={0}
       sx={{
         border: '1px solid',
         borderColor: 'divider',
         borderRadius: '18px',
         // `clip` rather than `hidden`: both trim the panel to its corners, but
         // `hidden` makes this a scroll container, which silently killed the
         // day headers' `position: sticky` — they stuck to a box that never
         // scrolls instead of to the viewport. `clip` creates no scrollport, so
         // the headers pin under the app bar as intended. Browsers without it
         // fall back to the (still correct) plain clip of `hidden`.
         overflow: 'hidden',
         overflowX: 'clip',
         overflowY: 'clip',
         bgcolor: 'background.paper',
       }}
     >
       <ActivityDeck value={activeTab} onChange={selectTab} sections={deckSections}>

       {/* Expenses Tab */}
       {activeTab === 0 && (
         <Box key="tab-0" sx={{ px: { xs: 0.75, sm: 3 }, py: { xs: 1.5, sm: 3 } }}>
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

           {/* Filters — a trigger with the active tokens visible at a glance;
               editing itself happens in a sheet (Apple Design: Photos/Files/Mail
               all put filter *editing* behind one tap, but never hide *which*
               filters are on). */}
           <Paper
             elevation={0}
             sx={{
               p: { xs: 1.5, sm: 2 },
               mb: 3,
               borderRadius: `${radius.lg}px`,
               border: '1px solid',
               borderColor: 'divider',
               bgcolor: (t) => t.palette.mode === 'dark' ? color.sunken.dark : color.sunken.light,
               backdropFilter: 'blur(12px)',
             }}
           >
             <Box
               ref={filterTriggerPress.ref}
               {...filterTriggerPress.bindEvents}
               role="button" tabIndex={0}
               aria-haspopup="dialog"
               aria-expanded={filtersOpen}
               onClick={() => setFiltersOpen(true)}
               onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFiltersOpen(true); } }}
               sx={{
                 display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', outline: 'none',
                 WebkitTapHighlightColor: 'transparent', borderRadius: `${radius.sm}px`,
                 '&:focus-visible': { outline: `2px solid ${accents.mint}`, outlineOffset: 2 },
               }}
             >
               <Box
                 sx={{
                   width: 28, height: 28, borderRadius: `${radius.sm}px`,
                   bgcolor: (t) => t.palette.mode === 'dark'
                     ? `${accents.violet}18`
                     : `${accents.violet}12`,
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                 }}
               >
                 <FilterIcon sx={{ color: accents.violet, fontSize: 15 }} />
               </Box>
               <Typography variant="subtitle2" sx={{ fontWeight: 600, flexGrow: 1, color: 'text.secondary', fontSize: 13 }}>
                 Filters
               </Typography>
               {/* Springs in/out and pops on every count change (Apple Design §7) —
                   the number itself is the feedback that a filter just landed. */}
               <AnimatePresence mode="popLayout" initial={false}>
                 {activeFilterCount > 0 && (
                   <Box
                     key={activeFilterCount}
                     component={framerMotion.span}
                     initial={{ scale: 0.4, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0.4, opacity: 0 }}
                     transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                     sx={{
                       display: 'inline-flex', px: 0.85, py: 0.15, borderRadius: `${radius.sm}px`, minWidth: 20,
                       textAlign: 'center', fontSize: 11, fontWeight: 700,
                       bgcolor: (t) => t.palette.mode === 'dark'
                         ? `${accents.mint}22`
                         : `${accents.mint}18`,
                       color: accents.mint,
                       letterSpacing: '0.02em',
                     }}
                   >
                     {activeFilterCount}
                   </Box>
                 )}
               </AnimatePresence>
               <ChevronRightIcon aria-hidden sx={{ fontSize: 18, color: 'text.disabled' }} />
             </Box>

             {/* Active filter tokens — exactly what's narrowing the view, each
                 removable on its own without reopening the sheet. */}
             {activeFilterChips.length > 0 && (
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 1.25 }}>
                 {activeFilterChips.map((chip) => (
                   <Chip
                     key={chip.key}
                     size="small"
                     label={chip.label}
                     onDelete={chip.onRemove}
                     icon={chip.color ? (
                       <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: chip.color, ml: '8px !important' }} />
                     ) : undefined}
                     sx={{
                       height: 26, borderRadius: radius.pill, fontSize: 12, fontWeight: 550,
                       border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                       '& .MuiChip-deleteIcon': { fontSize: 15, color: 'text.disabled' },
                       '& .MuiChip-deleteIcon:hover': { color: accents.red },
                     }}
                   />
                 ))}
                 <Chip
                   size="small"
                   label="Clear all"
                   onClick={clearFilters}
                   sx={{
                     height: 26, borderRadius: radius.pill, fontSize: 12, fontWeight: 600,
                     bgcolor: 'transparent', color: 'text.disabled',
                     border: '1px dashed', borderColor: 'divider',
                     '&:hover': { color: accents.red, borderColor: accents.red },
                   }}
                 />
               </Box>
             )}
           </Paper>

           {/* The editing surface itself — a sheet that slides up on a phone
               (drag-to-dismiss, Apple's fluid-interfaces physics) and becomes a
               centred dialog with room to breathe on a larger screen. Category and
               tags stay owned by the chips and scope bar below; this is search +
               amount only. */}
           <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} maxWidth={440}>
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
               <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17 }}>Filters</Typography>
               <IconButton
                 size="small" onClick={() => setFiltersOpen(false)} aria-label="Close filters"
                 sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
               >
                 <CloseIcon fontSize="small" />
               </IconButton>
             </Box>

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
               placeholder="Description, location..."
               sx={{ mb: 3.5 }}
             />

             <AmountRangeSlider
               expenses={expenses}
               min={filters.amountMin}
               max={filters.amountMax}
               onChange={(lo, hi) => { handleFilterChange('amountMin', lo); handleFilterChange('amountMax', hi); }}
             />

             <Box sx={{ display: 'flex', gap: 1, mt: 3.5 }}>
               <Button
                 fullWidth variant="outlined" color="inherit"
                 ref={clearFiltersPress.ref}
                 {...clearFiltersPress.bindEvents}
                 onClick={clearFilters}
                 sx={{ borderRadius: radius.pill, textTransform: 'none', fontWeight: 600, borderColor: 'divider', color: 'text.secondary' }}
               >
                 Clear all
               </Button>
               <Button
                 fullWidth variant="contained" disableElevation
                 onClick={() => setFiltersOpen(false)}
                 sx={{ borderRadius: radius.pill, textTransform: 'none', fontWeight: 700, bgcolor: accents.mint, color: '#04150e', '&:hover': { bgcolor: accents.mint } }}
               >
                 Done
               </Button>
             </Box>
           </BottomSheet>

           {/* Scope the stream — segmented control + month stepping. Drives the
               same date filter the list and the SPENT/INCOME/BALANCE header read. */}
           <ActivityScopeBar scope={scope} onScope={applyScope} />

           {/* Month-at-a-glance — days with spend, average per active day, and the
               biggest single expense, all derived from the loaded rows. */}
           <ActivityGlance expenses={expenses} />

           {/* Month-end forecast — projected total, pace, top categories */}
           <DashMonthForecast />

           {/* One-tap category narrowing, wired into the existing category filter. */}
           {/* Where the period's money actually went — the server's own
               per-category totals for this exact scope, as one bar you can put
               a finger on. Releasing on a band sets the same filters.category
               the chips used to set, so it narrows the stream below. */}
           <ActivityComposition
             breakdown={summary?.categoryBreakdown}
             categories={categories}
             selected={filters.category}
             onSelect={(id) => handleFilterChange('category', id)}
             scopeLabel={scopeLabel}
           />

           {/* Tag narrowing — multi-select, since a transaction can honestly
               carry more than one tag. Drives the same filters.tags array the
               API already accepts. */}
           <ActivityTagChips
             tags={tags}
             selected={filters.tags}
             onChange={(ids) => handleFilterChange('tags', ids)}
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

       {/* Labels Tab — categories and tags, one screen */}
       {activeTab === 1 && (
         <Box key="tab-1" sx={{ px: { xs: 0.75, sm: 3 }, py: { xs: 1.5, sm: 3 } }}>
           <ActivityLabelsPanel
             categories={categories}
             tags={tags}
             breakdown={summary?.categoryBreakdown}
             tagBreakdown={summary?.tagBreakdown}
             scopeLabel={scopeLabel}
             segment={labelSegment}
             onSegmentChange={setLabelSegment}
             onAddCategory={() => openCategoryForm()}
             onEditCategory={(c) => openCategoryForm(c)}
             onDeleteCategory={askDeleteCategory}
             onAddTag={() => openTagForm()}
             onEditTag={(t) => openTagForm(t)}
             onDeleteTag={askDeleteTag}
             onSelectCategory={drillIntoCategory}
             onSelectTag={drillIntoTag}
           />
         </Box>
       )}

       {/* Insights Tab */}
       {activeTab === 2 && (
         <Box key="tab-2" sx={{ px: { xs: 0.75, sm: 3 }, py: { xs: 1.5, sm: 3 } }}>
           <ActivityInsightsPanel
             breakdown={summary?.categoryBreakdown}
             categories={categories}
             scopeLabel={scopeLabel}
             insight={insight}
             onGenerate={runInsight}
             onSelectCategory={drillIntoCategory}
           />
         </Box>
       )}
       </ActivityDeck>
     </Paper>

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

     {/* One dialog for both kinds of label — same shape as the split composer */}
     <ActivityLabelDialog
       open={categoryForm.open}
       kind="category"
       editing={categoryForm.editing}
       data={categoryForm.data}
       saving={loading}
       onClose={closeCategoryForm}
       onChange={(patch) => setCategoryForm(prev => ({ ...prev, data: { ...prev.data, ...patch } }))}
       onSave={saveCategory}
     />

     <ActivityLabelDialog
       open={tagForm.open}
       kind="tag"
       editing={tagForm.editing}
       data={tagForm.data}
       saving={loading}
       onClose={closeTagForm}
       onChange={(patch) => setTagForm(prev => ({ ...prev, data: { ...prev.data, ...patch } }))}
       onSave={saveTag}
     />

     {/* Category merge suggestions dialog */}
     <Dialog open={mergeDialogOpen} onClose={() => setMergeDialogOpen(false)} maxWidth="xs" fullWidth>
       <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>Overlapping categories</DialogTitle>
       <DialogContent sx={{ pb: 1 }}>
         {mergeSuggestions.map((s, i) => (
           <Box
             key={i}
             sx={{
               p: 1.5, mb: 1.5, borderRadius: `${radius.md}px`,
               border: '1px solid', borderColor: 'divider',
               bgcolor: 'background.paper',
             }}
           >
             <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
               Merge into: <Box component="span" sx={{ color: accents.mint }}>{s.into}</Box>
             </Typography>
             <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 0.75 }}>
               {Array.isArray(s.merge) ? s.merge.join(', ') : s.merge}
             </Typography>
             {s.reason && (
               <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>{s.reason}</Typography>
             )}
             <Button
               size="small" variant="outlined"
               sx={{ mt: 1, borderRadius: radius.pill, textTransform: 'none', fontWeight: 600, borderColor: 'divider', color: 'text.secondary' }}
               onClick={() => {
                 setMergeDialogOpen(false);
                 setSuccess('Feature coming — contact support to merge categories');
               }}
             >
               Merge
             </Button>
           </Box>
         ))}
       </DialogContent>
       <DialogActions sx={{ px: 2.5, pb: 2 }}>
         <Button
           onClick={() => {
             setMergeDialogOpen(false);
             sessionStorage.setItem('merge_suggestion_dismissed', '1');
             setMergeDismissed(true);
           }}
           sx={{ textTransform: 'none', color: 'text.secondary' }}
         >
           Dismiss
         </Button>
         <Button onClick={() => setMergeDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
           Close
         </Button>
       </DialogActions>
     </Dialog>

     {/* Every destructive or irreversible step goes through the one house
         confirmation instead of a browser-chrome window.confirm. */}
     <ConfirmDialog
       open={!!confirm}
       title={confirm?.title || ''}
       message={confirm?.message}
       confirmLabel={confirm?.confirmLabel || 'Confirm'}
       destructive={confirm?.destructive}
       onCancel={() => setConfirm(null)}
       onConfirm={() => { const c = confirm; setConfirm(null); c?.onConfirm?.(); }}
     />

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
