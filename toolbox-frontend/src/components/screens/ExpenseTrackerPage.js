import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box, Container, Typography, Paper,
  Button, Dialog, TextField, Alert, Snackbar, Chip, IconButton, Tooltip,
  Fab, Switch, FormControlLabel,
  Table, TableBody, TableCell, TableContainer,
  TableRow, TablePagination, InputAdornment, Autocomplete,
  useMediaQuery, Collapse, Slide, Stack, InputBase
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
  CallSplit as CallSplitIcon,
  Person as PersonIcon,
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
  createSplitManually, searchSplitUsers, getSplits, addSplitToExpenses,
  updateSplit, deleteSplit
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
import ActivitySplitsPanel from '../ui/ActivitySplitsPanel';
import { TransactionStoryDrawer, buildStoryFromExpense, PageHeader } from '../ui';
import CursorGlow from '../motion/CursorGlow';
import AssistantOrb from '../ui/AssistantOrb';
import { accents, color, motion, radius, type } from '../../theme/tokens';
import { useTheme } from '@mui/material/styles';
import { AnimatePresence, motion as framerMotion, useReducedMotion } from 'framer-motion';

// Color palette for categories
const categoryColors = [
 '#f44336', '#e91e63', '#9c27b0', '#673ab7',
 '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
 '#009688', '#4caf50', '#8bc34a', '#cddc39',
 '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
];

/* SlideUp transition for full-screen mobile dialogs */
const SlideUp = React.forwardRef((props, ref) => <Slide direction="up" ref={ref} {...props} />);

/* framer-motion wrapper for animated rows */
const MotionBox = framerMotion.create(Box);

/* Shared number style — tabular, display face, tight tracking */
const splitNumSx = { fontFamily: type.displayFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' };

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

/** A compact amount pill — matches the app's borderless-input language instead of a raw number spinner. */
function AmountField({ value, onChange, placeholder, ariaLabel }) {
 return (
   <Box
     sx={{
       display: 'flex', alignItems: 'center', gap: 0.4,
       px: 1.1, py: 0.7, borderRadius: radius.pill,
       border: '1px solid', borderColor: 'divider',
       bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
       transition: `border-color ${motion.fast}ms ${motion.ease}, background-color ${motion.fast}ms ${motion.ease}`,
       '&:focus-within': {
         borderColor: accents.mint,
         bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(48,214,165,0.08)' : 'rgba(48,214,165,0.06)',
       },
     }}
   >
     <Typography sx={{ fontSize: 12.5, color: 'text.disabled', fontWeight: 500 }}>₹</Typography>
     <InputBase
       value={value}
       onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
       placeholder={placeholder}
       inputProps={{ inputMode: 'decimal', 'aria-label': ariaLabel, style: { width: 46, padding: 0, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' } }}
     />
   </Box>
 );
}

export default function ExpenseTrackerPage() {
  // Use global authentication state
  const { isAuthenticated, isLoading, user } = useAuth();
  const theme = useTheme();
  const splitFullScreen = useMediaQuery(theme.breakpoints.down('sm'));

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
 // Which way along the tab row the last change travelled (+1 right, -1 left),
 // so the incoming panel can enter from that side.
 const [tabDir, setTabDir] = useState(0);
 const tabIndexRef = React.useRef(0);
 const reduceMotion = useReducedMotion();
 const selectTab = React.useCallback((next) => {
   setTabDir(next > tabIndexRef.current ? 1 : next < tabIndexRef.current ? -1 : 0);
   tabIndexRef.current = next;
   setActiveTab(next);
 }, []);
 /**
  * Apple Design §7/§8: the four sections sit in a row, so moving between them
  * should read as travel along that row. The arriving panel starts offset on
  * the side you moved toward and settles to zero — the in-between frames point
  * at the outcome instead of blinking there. There is no exit animation on
  * purpose: waiting for the old panel to leave would put latency on the tap
  * (§1). Reduced motion keeps the same cue as a plain cross-fade.
  */
 const tabEnter = React.useMemo(() => (reduceMotion
   ? {
     initial: { opacity: 0 },
     animate: { opacity: 1 },
     transition: { duration: motion.fast / 1000 },
   }
   : {
     initial: { opacity: 0, x: tabDir * 24 },
     animate: { opacity: 1, x: 0 },
     transition: { type: 'spring', stiffness: 480, damping: 42 },
   }), [reduceMotion, tabDir]);
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
 // Filters start closed on a phone, open on desktop where there's room.
 const isCompact = useMediaQuery((theme) => theme.breakpoints.down('md'));
 const [filtersOpen, setFiltersOpen] = useState(false);
 useEffect(() => { setFiltersOpen(!isCompact); }, [isCompact]);
 const clearFiltersPress = usePressSpring({ pressScale: 0.88 });

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
 // Inline editing of a split amount.
 const [editingSplit, setEditingSplit] = useState(null); // { id, amount }

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
     // getSplits returns both directions now. A split-only bill somebody ELSE
     // paid isn't ours to promote: "Add to expenses" PATCHes an expense owned
     // by them and 404s. Only bills owed *to* us belong in this section.
     setSplitOnlyBills(all.filter(s => s.splitOnly && s.direction === 'owed_to_you'));
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

 const askSettleSingle = (s) => setConfirm({
   title: 'Mark this as paid?',
   message: `${formatCurrency(s.amount)} from ${s.personName} for "${s.description}" will be settled.`,
   confirmLabel: 'Mark paid',
   onConfirm: () => handleSettleSingle(s.id, s.amount),
 });

 const handleSettleSingle = async (splitId, amount) => {
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

 const handleEditSplit = async (splitId, newAmount) => {
   const parsed = parseFloat(newAmount);
   if (!parsed || parsed <= 0) {
     setError('Amount must be greater than zero');
     return;
   }
   try {
     await updateSplit(splitId, { amount: parsed });
     setSuccess(`Split updated to ${formatCurrency(parsed)}`);
     feedback('success');
     window.dispatchEvent(new Event('toolbox:notify-refresh'));
     setEditingSplit(null);
     if (expandedPerson) {
       const all = await getSplits({ personId: expandedPerson, settled: 'false' });
       setPersonSplits(all);
     }
     loadBalances();
   } catch (e) {
     setError(e.message || 'Could not update split');
   }
 };

 const askDeleteSplit = (s) => setConfirm({
   title: 'Remove this split?',
   message: `${s.personName}'s ${formatCurrency(s.amount)} share of "${s.description}" stops being tracked. The expense itself stays.`,
   confirmLabel: 'Remove',
   destructive: true,
   onConfirm: () => handleDeleteSplit(s.id),
 });

 const handleDeleteSplit = async (splitId) => {
   try {
     await deleteSplit(splitId);
     setSuccess('Split removed');
     feedback('success');
     window.dispatchEvent(new Event('toolbox:notify-refresh'));
     setPersonSplits(prev => prev.filter(s => s.id !== splitId));
     loadBalances();
   } catch (e) {
     setError(e.message || 'Could not remove split');
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

 // The unified people list carries its own direction, so the panel hands the
 // whole entry back rather than the caller having to remember which way round
 // this person was.
 const askSettle = (entry) => {
   const owedByMe = entry.direction === 'you_owe';
   setConfirm({
     title: owedByMe ? `Paid ${entry.name} back?` : `Settle up with ${entry.name}?`,
     message: owedByMe
       ? `The ${formatCurrency(entry.owed)} you owe ${entry.name} across ${entry.unsettledCount} ${entry.unsettledCount === 1 ? 'bill' : 'bills'} will be marked paid.`
       : `${entry.name}'s ${formatCurrency(entry.owed)} across ${entry.unsettledCount} ${entry.unsettledCount === 1 ? 'bill' : 'bills'} will be marked settled.`,
     confirmLabel: owedByMe ? 'Mark paid' : 'Settle',
     onConfirm: () => handleSettle(entry.raw, owedByMe ? 'i_owe' : 'owed_to_me'),
   });
 };

 const handleSettle = async (balance, direction = 'owed_to_me') => {
   const owedByMe = direction === 'i_owe';
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
 const deleteExpenseHandler = (expenseId) => setConfirm({
   title: 'Delete this expense?',
   message: 'It disappears from the timeline and from every total on this page.',
   confirmLabel: 'Delete',
   destructive: true,
   onConfirm: () => deleteExpenseDirect(expenseId),
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

 useEffect(() => {
   if (activeTab === 3 && !splits.loaded && isAuthenticated) {
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
       <SectionNav
         value={activeTab}
         onChange={selectTab}
         sections={[
           { label: 'Expenses', icon: DashboardIcon, color: accents.blue },
           { label: 'Labels', icon: LabelsIcon, color: accents.purple },
           { label: 'Insights', icon: InsightsIcon, color: accents.mint },
           { label: 'Splits', icon: CallSplitIcon, color: accents.amber },
         ]}
       />

       {/* Expenses Tab */}
       {activeTab === 0 && (
         <MotionBox key="tab-0" {...tabEnter} sx={{ px: { xs: 0.75, sm: 3 }, py: { xs: 1.5, sm: 3 } }}>
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

           {/* Filters — a collapsible tray with a sunken inset feel */}
           <Paper
             elevation={0}
             sx={{
               p: { xs: 1.75, sm: 2.5 },
               mb: 3,
               borderRadius: `${radius.lg}px`,
               border: '1px solid',
               borderColor: 'divider',
               bgcolor: (t) => t.palette.mode === 'dark' ? color.sunken.dark : color.sunken.light,
               backdropFilter: 'blur(12px)',
             }}
           >
             <Box
               display="flex" alignItems="center" gap={1}
               onClick={() => setFiltersOpen(prev => !prev)}
               sx={{ mb: filtersOpen ? 1.5 : 0, cursor: { xs: 'pointer', md: 'default' } }}
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
               {activeFilterCount > 0 && (
                 <Box
                   sx={{
                     px: 0.85, py: 0.15, borderRadius: `${radius.sm}px`, minWidth: 20,
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
               {/* Fold away on mobile so filters don't eat the viewport. The
                   chevron is the keyboard path to the same toggle the whole
                   header row exposes to touch, so it carries the state. */}
               <IconButton
                 size="small"
                 aria-expanded={filtersOpen}
                 aria-controls="activity-filters-tray"
                 aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
                 sx={{
                   display: { xs: 'inline-flex', md: 'none' },
                   transition: `transform ${motion.normal}ms ${motion.ease}`,
                   transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                 }}
               >
                 <ExpandMoreIcon fontSize="small" />
               </IconButton>
             </Box>
             <Collapse in={filtersOpen} timeout={motion.normal} easing={motion.ease} id="activity-filters-tray">
               {/* Search + amount range only — category and date are already owned by
                   the chips and scope bar just below, so this tray isn't a second,
                   conflicting way to set the same thing. A single wrapping row instead
                   of a rigid grid, since there are only three controls left to place. */}
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1.25, sm: 1.5 }, alignItems: 'center' }}>
                 <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
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
                   />
                 </Box>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                   <AmountField
                     value={filters.amountMin}
                     onChange={(v) => handleFilterChange('amountMin', v)}
                     placeholder="Min"
                     ariaLabel="Minimum amount"
                   />
                   <Box aria-hidden sx={{ width: 8, height: '1px', bgcolor: 'divider', flexShrink: 0 }} />
                   <AmountField
                     value={filters.amountMax}
                     onChange={(v) => handleFilterChange('amountMax', v)}
                     placeholder="Max"
                     ariaLabel="Maximum amount"
                   />
                 </Box>
                 <Tooltip title="Clear filters">
                   <IconButton
                     ref={clearFiltersPress.ref}
                     {...clearFiltersPress.bindEvents}
                     onClick={clearFilters}
                     size="small"
                     sx={{
                       width: 32, height: 32, borderRadius: `${radius.sm}px`, flexShrink: 0,
                       bgcolor: (t) => t.palette.mode === 'dark'
                         ? 'rgba(255,255,255,0.04)'
                         : 'rgba(0,0,0,0.03)',
                       '&:hover': { color: accents.red, bgcolor: `${accents.red}14` },
                       transition: `color ${motion.fast}ms ${motion.ease}, background-color ${motion.fast}ms ${motion.ease}`,
                     }}
                   >
                     <CloseIcon sx={{ fontSize: 16 }} />
                   </IconButton>
                 </Tooltip>
               </Box>
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
         </MotionBox>
       )}

       {/* Labels Tab — categories and tags, one screen */}
       {activeTab === 1 && (
         <MotionBox key="tab-1" {...tabEnter} sx={{ px: { xs: 0.75, sm: 3 }, py: { xs: 1.5, sm: 3 } }}>
           <ActivityLabelsPanel
             categories={categories}
             tags={tags}
             breakdown={summary?.categoryBreakdown}
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
           />
         </MotionBox>
       )}

       {/* Insights Tab */}
       {activeTab === 2 && (
         <MotionBox key="tab-2" {...tabEnter} sx={{ px: { xs: 0.75, sm: 3 }, py: { xs: 1.5, sm: 3 } }}>
           <ActivityInsightsPanel
             breakdown={summary?.categoryBreakdown}
             categories={categories}
             scopeLabel={scopeLabel}
             insight={insight}
             onGenerate={runInsight}
             onSelectCategory={drillIntoCategory}
           />
         </MotionBox>
       )}

       {/* Splits Tab */}
       {activeTab === 3 && (
         <MotionBox key="tab-3" {...tabEnter} sx={{ px: { xs: 0.75, sm: 3 }, py: { xs: 1.5, sm: 3 } }}>
           <ActivitySplitsPanel
             splits={splits}
             splitOnlyBills={splitOnlyBills}
             expandedPerson={expandedPerson}
             personSplits={personSplits}
             editingSplit={editingSplit}
             onTextChange={(text) => setSplits(prev => ({ ...prev, text }))}
             onSplitAdd={handleSplitAdd}
             onOpenManual={openSplitForm}
             onTogglePerson={togglePersonSplits}
             onSettle={askSettle}
             onStartEditSplit={(s) => setEditingSplit({ id: s.id, amount: s.amount })}
             onEditSplitChange={(amount) => setEditingSplit(prev => ({ ...prev, amount }))}
             onCancelEditSplit={() => setEditingSplit(null)}
             onEditSplit={handleEditSplit}
             onDeleteSplit={askDeleteSplit}
             onSettleSingle={askSettleSingle}
             onAddToExpenses={handleAddToExpenses}
           />
         </MotionBox>
       )}
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

     {/* Manual split - exact numbers, no model call */}
     <Dialog
       open={splitForm.open}
       onClose={closeSplitForm}
       maxWidth="sm"
       fullWidth
       fullScreen={splitFullScreen}
       TransitionComponent={splitFullScreen ? SlideUp : undefined}
       PaperProps={{
         sx: {
           borderRadius: splitFullScreen ? 0 : `${radius.xl}px`,
           overflow: 'hidden',
           bgcolor: 'background.default',
           backgroundImage: 'none',
         },
       }}
     >
       {/* ── Hero header ─────────────────────────────────────────────── */}
       <Box
         sx={{
           position: 'relative', px: 2.5,
           pt: splitFullScreen ? 'calc(env(safe-area-inset-top) + 12px)' : 2.5,
           pb: 3,
           background: `linear-gradient(168deg, ${accents.amber}14 0%, transparent 60%)`,
         }}
       >
         {/* ── Title bar ── */}
         <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
           <IconButton
             onClick={closeSplitForm} size="small"
             aria-label="Close split dialog"
             sx={{
               ml: -0.5, width: 36, height: 36,
               borderRadius: `${radius.md}px`,
               bgcolor: color.sunken.dark, border: '1px solid', borderColor: color.hairline.dark,
               color: 'text.secondary',
               '&:hover': { bgcolor: color.raised.dark },
             }}
           >
             <CloseIcon sx={{ fontSize: 18 }} />
           </IconButton>
           <Stack direction="row" alignItems="center" spacing={1}>
             <Box
               sx={{
                 width: 28, height: 28, borderRadius: `${radius.sm}px`,
                 bgcolor: `${accents.amber}22`,
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
               }}
             >
               <CallSplitIcon sx={{ color: accents.amber, fontSize: 16 }} />
             </Box>
             <Typography
               sx={{
                 fontSize: 13, fontWeight: 650, letterSpacing: '-0.01em',
                 color: 'text.secondary',
               }}
             >
               Split a bill
             </Typography>
           </Stack>
           <Box sx={{ width: 36 }} />
         </Box>

         {/* ── Hero amount ── */}
         <Box
           sx={{
             cursor: 'text', textAlign: 'center', py: 1,
             display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.25,
           }}
         >
           <Typography
             sx={{
               ...splitNumSx, fontWeight: 600,
               fontSize: 'clamp(1.8rem, 6vw, 2.6rem)',
               color: accents.amber, opacity: 0.45,
               lineHeight: 1,
             }}
           >
             {'₹'}
           </Typography>
           <InputBase
             type="number" placeholder="0" value={splitForm.amount}
             onChange={(e) => setSplitForm(prev => ({ ...prev, amount: e.target.value }))}
             inputProps={{ inputMode: 'decimal', style: { textAlign: 'center' }, 'aria-label': 'Total amount' }}
             sx={{
               '& input': {
                 ...splitNumSx,
                 fontSize: 'clamp(2.8rem, 10vw, 4rem)', fontWeight: 700,
                 lineHeight: 1,
                 color: accents.amber,
                 width: `${Math.max((String(splitForm.amount).length || 1), 1) + 1}ch`,
                 minWidth: '2ch', maxWidth: '8ch', padding: 0,
                 MozAppearance: 'textfield',
               },
               '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                 WebkitAppearance: 'none', margin: 0,
               },
               '& input::placeholder': { color: `${accents.amber}33` },
             }}
           />
         </Box>
       </Box>

       {/* ── Hairline separator ── */}
       <Box sx={{ height: '1px', bgcolor: color.hairline.dark }} />

       {/* ── Body ─────────────────────────────────────────────────────── */}
       <Box sx={{ px: 2.5, pt: 2.5, pb: 2, overflowY: 'auto', flex: 1 }}>
         <Stack spacing={2.5}>
           {/* ── Description field ── */}
           <TextField
             fullWidth label="What for? *"
             value={splitForm.description}
             onChange={(e) => setSplitForm(prev => ({ ...prev, description: e.target.value }))}
             sx={{
               '& .MuiOutlinedInput-root': {
                 borderRadius: `${radius.md}px`,
                 '& fieldset': { borderColor: color.hairline.dark },
                 '&:hover fieldset': { borderColor: 'text.disabled' },
                 '&.Mui-focused fieldset': { borderColor: `${accents.amber}66`, borderWidth: 1 },
               },
             }}
           />

           {/* ── Category ── */}
           <AutocompleteComponent
             options={categories.map(cat => ({ label: cat.name, id: cat.id }))}
             label="Category"
             value={splitForm.categoryId}
             onChange={(value) => setSplitForm(prev => ({ ...prev, categoryId: value }))}
           />

           {/* ── People search ── */}
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
                 sx={{
                   '& .MuiOutlinedInput-root': {
                     borderRadius: `${radius.md}px`,
                     '& fieldset': { borderColor: color.hairline.dark },
                     '&:hover fieldset': { borderColor: 'text.disabled' },
                     '&.Mui-focused fieldset': { borderColor: `${accents.amber}66`, borderWidth: 1 },
                   },
                 }}
               />
             )}
           />

           {/* ── People details (animated in) ── */}
           <AnimatePresence initial={false}>
             {splitForm.people.length > 0 && (
               <MotionBox
                 initial={{ opacity: 0, y: 12 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -8 }}
                 transition={{ duration: motion.normal / 1000, ease: [0.32, 0.72, 0, 1] }}
               >
                 <Stack spacing={2}>
                   {/* ── Toggles ── */}
                   <Box
                     sx={{
                       borderRadius: `${radius.lg}px`,
                       bgcolor: color.sunken.dark,
                       border: '1px solid', borderColor: color.hairline.dark,
                       px: 2, py: 0.75,
                       display: 'flex', flexWrap: 'wrap', gap: 1,
                     }}
                   >
                     <FormControlLabel
                       control={
                         <Switch
                           checked={splitForm.splitWithMe}
                           onChange={(e) => setSplitForm(prev => ({ ...prev, splitWithMe: e.target.checked }))}
                           size="small"
                         />
                       }
                       label={<Typography sx={{ fontSize: 13, fontWeight: 500 }}>I shared this too</Typography>}
                     />
                     <FormControlLabel
                       control={
                         <Switch
                           checked={splitForm.addToExpenses}
                           onChange={(e) => setSplitForm(prev => ({ ...prev, addToExpenses: e.target.checked }))}
                           size="small"
                         />
                       }
                       label={<Typography sx={{ fontSize: 13, fontWeight: 500 }}>Add to my expenses</Typography>}
                     />
                   </Box>

                   {/* ── Who paid? toggle group ── */}
                   <Box>
                     <Typography
                       sx={{
                         fontSize: 11, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase',
                         color: 'text.secondary', mb: 1,
                       }}
                     >
                       Who paid?
                     </Typography>
                     <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                       {[{ label: 'I paid', value: '' }, ...splitForm.people.map(p => ({ label: p.label, value: p.label }))].map(opt => {
                         const selected = splitForm.paidBy === opt.value;
                         return (
                           <Box
                             key={opt.value || '__me'}
                             onClick={() => setSplitForm(prev => ({ ...prev, paidBy: opt.value }))}
                             role="radio"
                             aria-checked={selected}
                             tabIndex={0}
                             onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSplitForm(prev => ({ ...prev, paidBy: opt.value })); }}}
                             sx={{
                               px: 1.5, py: 0.625,
                               borderRadius: `${radius.pill}px`,
                               border: '1.5px solid',
                               borderColor: selected ? accents.amber : color.hairline.dark,
                               bgcolor: selected ? `${accents.amber}18` : 'transparent',
                               color: selected ? accents.amber : 'text.secondary',
                               fontSize: 13, fontWeight: selected ? 650 : 500,
                               cursor: 'pointer', userSelect: 'none',
                               transition: `all ${motion.fast}ms ${motion.ease}`,
                               '&:hover': {
                                 borderColor: selected ? accents.amber : 'text.disabled',
                                 bgcolor: selected ? `${accents.amber}22` : color.sunken.dark,
                               },
                             }}
                           >
                             {opt.label}
                           </Box>
                         );
                       })}
                     </Box>
                   </Box>

                   {/* ── Per-person share rows ── */}
                   <Box>
                     <Typography
                       sx={{
                         fontSize: 11, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase',
                         color: 'text.secondary', mb: 1,
                       }}
                     >
                       Individual shares
                     </Typography>
                     <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                       Leave blank to divide evenly, or set a fixed share
                     </Typography>
                     <Stack spacing={1}>
                       <AnimatePresence initial={false}>
                         {splitForm.people.map((person, index) => (
                           <MotionBox
                             key={person.label}
                             initial={{ opacity: 0, x: -16 }}
                             animate={{ opacity: 1, x: 0 }}
                             exit={{ opacity: 0, x: 16 }}
                             transition={{ duration: motion.fast / 1000, ease: [0.32, 0.72, 0, 1] }}
                             sx={{
                               display: 'flex', alignItems: 'center', gap: 1.5,
                               px: 1.5, py: 1,
                               borderRadius: `${radius.md}px`,
                               bgcolor: color.sunken.dark,
                               border: '1px solid', borderColor: color.hairline.dark,
                             }}
                           >
                             {/* Person avatar circle */}
                             <Box
                               sx={{
                                 width: 32, height: 32, borderRadius: '50%',
                                 bgcolor: person.userId ? `${accents.blue}22` : `${accents.violet}18`,
                                 border: '1.5px solid',
                                 borderColor: person.userId ? `${accents.blue}44` : `${accents.violet}33`,
                                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                                 flexShrink: 0,
                               }}
                             >
                               <PersonIcon sx={{
                                 fontSize: 16,
                                 color: person.userId ? accents.blue : accents.violet,
                               }} />
                             </Box>
                             {/* Name */}
                             <Typography
                               sx={{
                                 flex: 1, fontSize: 14, fontWeight: 550,
                                 overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                               }}
                             >
                               {person.label}
                             </Typography>
                             {/* Amount input */}
                             <Box
                               sx={{
                                 display: 'flex', alignItems: 'center', gap: 0.5,
                                 px: 1, py: 0.25,
                                 borderRadius: `${radius.sm}px`,
                                 bgcolor: 'background.default',
                                 border: '1px solid', borderColor: color.hairline.dark,
                                 width: 120,
                                 transition: `border-color ${motion.fast}ms ${motion.ease}`,
                                 '&:focus-within': { borderColor: `${accents.amber}55` },
                               }}
                             >
                               <Typography sx={{ fontSize: 13, color: 'text.disabled', fontWeight: 500, flexShrink: 0 }}>₹</Typography>
                               <InputBase
                                 type="number" placeholder="even"
                                 value={person.amount}
                                 onChange={(e) => setSplitForm(prev => {
                                   const people = [...prev.people];
                                   people[index] = { ...people[index], amount: e.target.value };
                                   return { ...prev, people };
                                 })}
                                 inputProps={{ inputMode: 'decimal', 'aria-label': `Share for ${person.label}` }}
                                 sx={{
                                   flex: 1,
                                   '& input': {
                                     ...splitNumSx, fontSize: 14, fontWeight: 600,
                                     py: 0.5, px: 0, color: 'text.primary',
                                     MozAppearance: 'textfield',
                                   },
                                   '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                     WebkitAppearance: 'none', margin: 0,
                                   },
                                   '& input::placeholder': { fontWeight: 400, color: 'text.disabled' },
                                 }}
                               />
                             </Box>
                           </MotionBox>
                         ))}
                       </AnimatePresence>
                     </Stack>
                   </Box>

                   {/* ── Preview: Who owes what ── */}
                   {(() => {
                     const preview = previewShares();
                     if (!preview) return null;
                     if (preview.error) {
                       return <Alert severity="warning" sx={{ borderRadius: `${radius.md}px` }}>{preview.error}</Alert>;
                     }
                     return (
                       <MotionBox
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ duration: motion.normal / 1000, ease: [0.32, 0.72, 0, 1] }}
                       >
                         <Box
                           sx={{
                             p: 2, borderRadius: `${radius.lg}px`,
                             background: `linear-gradient(135deg, ${accents.amber}0a 0%, ${accents.violet}08 100%)`,
                             border: '1px solid', borderColor: `${accents.amber}22`,
                           }}
                         >
                           <Typography
                             sx={{
                               fontSize: 11, fontWeight: 650, letterSpacing: '0.08em', textTransform: 'uppercase',
                               color: 'text.secondary', mb: 1.25,
                             }}
                           >
                             Who owes what
                           </Typography>
                           <Stack spacing={0.75}>
                             {preview.shares.map((share) => (
                               <Box key={share.label} display="flex" justifyContent="space-between" alignItems="center">
                                 <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{share.label}</Typography>
                                 <Typography sx={{ ...splitNumSx, fontSize: 14, fontWeight: 650, color: accents.amber }}>
                                   {formatCurrency(share.amount)}
                                 </Typography>
                               </Box>
                             ))}
                             <Box sx={{ height: '1px', bgcolor: color.hairline.dark, my: 0.25 }} />
                             <Box display="flex" justifyContent="space-between" alignItems="center">
                               <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'text.secondary' }}>you</Typography>
                               <Typography sx={{ ...splitNumSx, fontSize: 14, fontWeight: 650, color: 'text.secondary' }}>
                                 {formatCurrency(preview.yours)}
                               </Typography>
                             </Box>
                           </Stack>
                         </Box>
                       </MotionBox>
                     );
                   })()}
                 </Stack>
               </MotionBox>
             )}
           </AnimatePresence>
         </Stack>
       </Box>

       {/* ── Footer ── */}
       <Box
         sx={{
           px: 2.5, pt: 1.5,
           pb: splitFullScreen ? 'calc(env(safe-area-inset-bottom) + 16px)' : 2,
           borderTop: '1px solid', borderColor: color.hairline.dark,
           display: 'flex', justifyContent: 'flex-end', gap: 1.5,
         }}
       >
         <Button
           onClick={closeSplitForm}
           sx={{
             color: 'text.secondary', fontWeight: 600,
             borderRadius: `${radius.md}px`,
             '&:hover': { bgcolor: color.sunken.dark },
           }}
         >
           Cancel
         </Button>
         <Button
           onClick={saveManualSplit}
           variant="contained"
           disabled={splitForm.saving || !splitForm.amount || splitForm.people.length === 0}
           sx={{
             borderRadius: `${radius.md}px`,
             bgcolor: accents.amber,
             color: '#000',
             fontWeight: 650,
             px: 3,
             textTransform: 'none',
             boxShadow: `0 4px 14px -4px ${accents.amber}66`,
             '&:hover': { bgcolor: accents.amber, filter: 'brightness(1.08)' },
             '&.Mui-disabled': { bgcolor: `${accents.amber}33`, color: 'rgba(0,0,0,0.3)' },
           }}
         >
           {splitForm.saving ? 'Saving...' : 'Create split'}
         </Button>
       </Box>
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
