import React, { useState, useEffect } from 'react';
import api from '../api';
import { showToast } from '../toast';
import { UserPlus, UserCheck, Shield, Trash2, AlertCircle, Users, FolderPlus, Edit, Package, ArrowDownToLine, ArrowUpFromLine, Receipt, History } from 'lucide-react';

interface UserManagementProps {
  currentUserRole: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUserRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'divisions' | 'workers' | 'pos' | 'holidays' | 'individual_stocks'>(
    currentUserRole === 'SUPERVISOR' ? 'workers' : 'accounts'
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUserRole === 'SUPERVISOR') {
      setActiveSubTab('workers');
    }
  }, [currentUserRole]);

  // --- ACCOUNTS STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'SUPERVISOR'>('SUPERVISOR');

  // Edit user state
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editAccountUsername, setEditAccountUsername] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountMobile, setEditAccountMobile] = useState('');
  const [editAccountRole, setEditAccountRole] = useState<'OWNER' | 'MANAGER' | 'SUPERVISOR'>('SUPERVISOR');
  const [editAccountPassword, setEditAccountPassword] = useState('');

  // --- DIVISIONS STATE ---
  const [divisions, setDivisions] = useState<any[]>([]);
  const [divisionName, setDivisionName] = useState('');
  const [editingDivision, setEditingDivision] = useState<any>(null);
  const [editDivisionName, setEditDivisionName] = useState('');

  // --- WORKERS STATE ---
  const [workers, setWorkers] = useState<any[]>([]);
  const [showAddWorkerForm, setShowAddWorkerForm] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [workerFatherName, setWorkerFatherName] = useState('');
  const [workerDesignation, setWorkerDesignation] = useState('');
  const [workerMobile, setWorkerMobile] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [dailyAllowance, setDailyAllowance] = useState('');
  const [advanceTaken, setAdvanceTaken] = useState('');
  const [advanceBalance, setAdvanceBalance] = useState('');
  const [otAllowance, setOtAllowance] = useState('');
  const [otHourlyRate, setOtHourlyRate] = useState('');
  const [workerDivisionId, setWorkerDivisionId] = useState('');
  const [workerPfNumber, setWorkerPfNumber] = useState('');
  const [workerEsiNumber, setWorkerEsiNumber] = useState('');
  const [workerUanNumber, setWorkerUanNumber] = useState('');
  const [workerBankAcc, setWorkerBankAcc] = useState('');
  const [workerIfsc, setWorkerIfsc] = useState('');
  const [workerPlaceOfWork, setWorkerPlaceOfWork] = useState('');
  const [workerNatureOfWork, setWorkerNatureOfWork] = useState('');

  // Edit worker wage helper
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editWorkerMobile, setEditWorkerMobile] = useState('');
  const [editWage, setEditWage] = useState('');
  const [editDailyAllowance, setEditDailyAllowance] = useState('');
  const [editAdvanceTaken, setEditAdvanceTaken] = useState('');
  const [editAdvanceBalance, setEditAdvanceBalance] = useState('');
  const [editOtAllowance, setEditOtAllowance] = useState('');
  const [editOtRate, setEditOtRate] = useState('');
  const [editWorkerDivisionId, setEditWorkerDivisionId] = useState('');
  const [editPfNumber, setEditPfNumber] = useState('');
  const [editEsiNumber, setEditEsiNumber] = useState('');
  const [editUanNumber, setEditUanNumber] = useState('');
  const [editBankAcc, setEditBankAcc] = useState('');
  const [editIfsc, setEditIfsc] = useState('');
  const [editPlaceOfWork, setEditPlaceOfWork] = useState('');
  const [editNatureOfWork, setEditNatureOfWork] = useState('');

  // --- PURCHASE ORDERS (MASTER) STATE ---
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [poNumber, setPoNumber] = useState('');
  const [poDivisionId, setPoDivisionId] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [poAmount, setPoAmount] = useState('');
  
  // Edit PO State
  const [editingPO, setEditingPO] = useState<any>(null);
  const [editPONumber, setEditPONumber] = useState('');
  const [editPODivisionId, setEditPODivisionId] = useState('');
  const [editPODate, setEditPODate] = useState('');
  const [editPOAmount, setEditPOAmount] = useState('');
  // --- INDIVIDUAL STOCKS (STANDALONE NON-PO INVENTORY) STATE ---
  const [individualStocks, setIndividualStocks] = useState<any[]>([]);
  const [indStockSearch, setIndStockSearch] = useState('');
  const [indStockItemName, setIndStockItemName] = useState('');
  const [indStockPartNumber, setIndStockPartNumber] = useState('');
  const [indStockUnit, setIndStockUnit] = useState('NOS');
  const [indStockOpening, setIndStockOpening] = useState('');
  const [indStockRemarks, setIndStockRemarks] = useState('');
  const [showAddIndStockForm, setShowAddIndStockForm] = useState(false);
  const [editingIndStock, setEditingIndStock] = useState<any>(null);

  // Inward Purchase Modal for Individual Stock
  const [purchaseModalItem, setPurchaseModalItem] = useState<any>(null);
  const [indPurchaseForm, setIndPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    qty: '',
    rate: '',
    partyName: '',
    supplierAddress: '',
    gstNumber: '',
    partyInvoiceNumber: '',
    supplierInvoiceDate: '',
    vehicleNumber: '',
    cgstPercent: '9',
    sgstPercent: '9',
    igstPercent: '0',
    remarks: ''
  });

  // Outward Sale Modal for Individual Stock
  const [saleModalItem, setSaleModalItem] = useState<any>(null);
  const [indSaleForm, setIndSaleForm] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    qty: '',
    rate: '',
    partyName: '',
    supplierAddress: '',
    gstNumber: '',
    vehicleNumber: '',
    cgstPercent: '9',
    sgstPercent: '9',
    igstPercent: '0',
    remarks: ''
  });

  // Transactions History Modal
  const [txHistoryItem, setTxHistoryItem] = useState<any>(null);
  const [transactionsList, setTransactionsList] = useState<any[]>([]);

  const fetchIndividualStocks = async () => {
    try {
      const res = await api.get('/individual-stocks');
      setIndividualStocks(res.data.items || []);
    } catch (err: any) {
      console.error('Failed to load individual stocks:', err);
      showToast(err.response?.data?.error || 'Failed to load individual stocks', 'error');
    }
  };

  const handleCreateIndStock = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!indStockItemName.trim()) {
      showToast('Item Name is required', 'error');
      return;
    }

    try {
      setLoading(true);
      await api.post('/individual-stocks', {
        itemName: indStockItemName.trim(),
        partNumber: indStockPartNumber.trim() || undefined,
        unit: indStockUnit.trim() || 'NOS',
        openingStock: parseFloat(indStockOpening) || 0,
        remarks: indStockRemarks.trim() || undefined
      });
      showToast(`Individual Stock '${indStockItemName}' registered successfully!`, 'success');
      setIndStockItemName('');
      setIndStockPartNumber('');
      setIndStockUnit('NOS');
      setIndStockOpening('');
      setIndStockRemarks('');
      setShowAddIndStockForm(false);
      fetchIndividualStocks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to create individual stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIndStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndStock) return;
    clearMessages();

    try {
      setLoading(true);
      await api.put(`/individual-stocks/${editingIndStock.id}`, {
        itemName: editingIndStock.itemName.trim(),
        partNumber: editingIndStock.partNumber?.trim() || null,
        unit: editingIndStock.unit || 'NOS',
        openingStock: parseFloat(editingIndStock.openingStock) || 0,
        remarks: editingIndStock.remarks || null
      });
      showToast('Individual stock item updated successfully!', 'success');
      setEditingIndStock(null);
      fetchIndividualStocks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIndStock = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete '${name}'?`)) return;
    try {
      await api.delete(`/individual-stocks/${id}`);
      showToast('Item deleted successfully', 'success');
      fetchIndividualStocks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete item', 'error');
    }
  };

  const handleRecordIndPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseModalItem) return;
    const qty = parseFloat(indPurchaseForm.qty) || 0;
    const rate = parseFloat(indPurchaseForm.rate) || 0;
    if (qty <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }

    try {
      setLoading(true);
      await api.post('/individual-stocks/purchase', {
        stockId: purchaseModalItem.id,
        date: indPurchaseForm.date,
        qty,
        rate,
        partyName: indPurchaseForm.partyName.trim() || undefined,
        supplierAddress: indPurchaseForm.supplierAddress.trim() || undefined,
        gstNumber: indPurchaseForm.gstNumber.trim() || undefined,
        partyInvoiceNumber: indPurchaseForm.partyInvoiceNumber.trim() || undefined,
        supplierInvoiceDate: indPurchaseForm.supplierInvoiceDate || undefined,
        vehicleNumber: indPurchaseForm.vehicleNumber.trim() || undefined,
        cgstPercent: parseFloat(indPurchaseForm.cgstPercent) || 0,
        sgstPercent: parseFloat(indPurchaseForm.sgstPercent) || 0,
        igstPercent: parseFloat(indPurchaseForm.igstPercent) || 0,
        remarks: indPurchaseForm.remarks.trim() || undefined
      });
      showToast(`Inward purchase of ${qty} ${purchaseModalItem.unit || 'NOS'} recorded successfully!`, 'success');
      setPurchaseModalItem(null);
      fetchIndividualStocks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to record inward purchase', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordIndSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleModalItem) return;
    const qty = parseFloat(indSaleForm.qty) || 0;
    const rate = parseFloat(indSaleForm.rate) || 0;
    if (!indSaleForm.invoiceNumber.trim()) {
      showToast('Invoice Number is required', 'error');
      return;
    }
    if (qty <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }
    if (qty > saleModalItem.balanceStock) {
      showToast(`Quantity (${qty}) exceeds available stock balance (${saleModalItem.balanceStock})`, 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/individual-stocks/sale', {
        stockId: saleModalItem.id,
        invoiceNumber: indSaleForm.invoiceNumber.trim(),
        invoiceDate: indSaleForm.invoiceDate,
        qty,
        rate,
        partyName: indSaleForm.partyName.trim() || undefined,
        supplierAddress: indSaleForm.supplierAddress.trim() || undefined,
        gstNumber: indSaleForm.gstNumber.trim() || undefined,
        vehicleNumber: indSaleForm.vehicleNumber.trim() || undefined,
        cgstPercent: parseFloat(indSaleForm.cgstPercent) || 0,
        sgstPercent: parseFloat(indSaleForm.sgstPercent) || 0,
        igstPercent: parseFloat(indSaleForm.igstPercent) || 0,
        remarks: indSaleForm.remarks.trim() || undefined
      });
      showToast(res.data.message || 'Sale submitted successfully!', 'success');
      setSaleModalItem(null);
      fetchIndividualStocks();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to record sale', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTxHistory = async (item: any) => {
    setTxHistoryItem(item);
    try {
      const res = await api.get(`/individual-stocks/${item.id}/transactions`);
      setTransactionsList(res.data.transactions || []);
    } catch (err: any) {
      showToast('Failed to load transaction history', 'error');
    }
  };

  // --- HOLIDAYS (CALENDAR) STATE ---
  const [holidays, setHolidays] = useState<any[]>([]);
  const [holidayDate, setHolidayDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayName, setHolidayName] = useState('');
  const [holidayType, setHolidayType] = useState('GOVT_HOLIDAY');
  const [holidayDescription, setHolidayDescription] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/holidays');
      setHolidays(res.data.holidays || []);
    } catch (err: any) {
      console.error('Failed to load holidays:', err);
      showToast(err.response?.data?.error || 'Failed to load holiday calendar', 'error');
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!holidayName.trim() || !holidayDate) {
      showToast('Holiday name and date are required', 'error');
      return;
    }

    try {
      setLoading(true);
      await api.post('/holidays', {
        date: holidayDate,
        name: holidayName.trim(),
        type: holidayType,
        description: holidayDescription.trim() || undefined,
      });
      const msg = `Holiday '${holidayName}' declared successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setHolidayName('');
      setHolidayDescription('');
      fetchHolidays();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to save holiday';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the holiday '${name}'?`)) return;
    clearMessages();

    try {
      await api.delete(`/holidays/${id}`);
      const msg = `Holiday '${name}' removed successfully.`;
      setSuccess(msg);
      showToast(msg, 'success');
      fetchHolidays();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to delete holiday';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      showToast(err.response?.data?.error || 'Failed to load user accounts', 'error');
    }
  };

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions');
      setDivisions(res.data.divisions || []);
    } catch (err: any) {
      console.error('Failed to load divisions:', err);
      showToast(err.response?.data?.error || 'Failed to load divisions list', 'error');
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers');
      setWorkers(res.data.workers || []);
    } catch (err: any) {
      console.error('Failed to load workers:', err);
      showToast(err.response?.data?.error || 'Failed to load worker registry', 'error');
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const res = await api.get('/purchase-orders');
      setPurchaseOrders(res.data.purchaseOrders || []);
    } catch (err: any) {
      console.error('Failed to load POs:', err);
      showToast(err.response?.data?.error || 'Failed to load purchase orders', 'error');
    }
  };

  useEffect(() => {
    const promises: Promise<void>[] = [fetchDivisions(), fetchWorkers(), fetchIndividualStocks()];
    if (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') {
      promises.push(fetchUsers(), fetchPurchaseOrders(), fetchHolidays());
    }
    Promise.all(promises);
  }, [currentUserRole]);

  // --- ACTIONS: USERS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    if (!userMobile || !/^\d{10}$/.test(userMobile.trim())) {
      const msg = 'Mobile number must be a valid 10-digit number!';
      setError(msg);
      showToast(msg, 'error');
      setLoading(false);
      return;
    }

    try {
      await api.post('/users', {
        username: username.trim(),
        fullName: fullName.trim(),
        mobileNumber: userMobile.trim(),
        password,
        role,
      });

      const msg = `User Account '${username}' created successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setUsername('');
      setFullName('');
      setUserMobile('');
      setPassword('');
      setShowAddUserForm(false);
      fetchUsers();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to create user account';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!editingAccount) return;

    if (!editAccountUsername || !editAccountUsername.trim()) {
      const msg = 'User ID / Username is required!';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    if (!editAccountMobile || !/^\d{10}$/.test(editAccountMobile.trim())) {
      const msg = 'Mobile number must be a valid 10-digit number!';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/users/${editingAccount.id}`, {
        username: editAccountUsername.trim(),
        fullName: editAccountName.trim(),
        mobileNumber: editAccountMobile.trim(),
        role: editAccountRole,
        password: editAccountPassword.trim() || undefined,
      });

      const msg = `User Account '${editAccountUsername}' updated successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setEditingAccount(null);
      setEditAccountPassword('');
      fetchUsers();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update user account details';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Are you sure you want to delete user '${user.username}'?`)) return;
    clearMessages();

    try {
      await api.delete(`/users/${user.id}`);
      const msg = `User account '${user.username}' deleted successfully.`;
      setSuccess(msg);
      showToast(msg, 'success');
      fetchUsers();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to delete user';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  // --- ACTIONS: DIVISIONS ---
  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!divisionName.trim()) return;

    try {
      await api.post('/divisions', { name: divisionName.trim() });
      const msg = `Division '${divisionName}' registered successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setDivisionName('');
      fetchDivisions();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to create division';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleUpdateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!editingDivision || !editDivisionName.trim()) return;

    try {
      setLoading(true);
      await api.put(`/divisions/${editingDivision.id}`, { name: editDivisionName.trim() });
      const msg = `Division '${editDivisionName}' updated successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setEditingDivision(null);
      setEditDivisionName('');
      fetchDivisions();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update division';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDivision = async (id: string, name: string) => {
    const assignedWorkers = workers.filter(w => w.divisionId === id || w.division?.id === id);
    if (assignedWorkers.length > 0) {
      const msg = `Cannot delete '${name}' — ${assignedWorkers.length} worker(s) are assigned to it. Please reassign them first.`;
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete division '${name}'?\n\nNote: Division cannot be deleted if workers are still assigned to it. Reassign workers first.`)) return;
    clearMessages();

    try {
      await api.delete(`/divisions/${id}`);
      const msg = `Division '${name}' deleted successfully.`;
      setSuccess(msg);
      showToast(msg, 'success');
      fetchDivisions();
      fetchWorkers();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to delete division';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  // --- ACTIONS: WORKERS ---
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    if (!workerMobile || !/^\d{10}$/.test(workerMobile.trim())) {
      const msg = 'A valid 10-digit Indian mobile number is mandatory!';
      setError(msg);
      showToast(msg, 'error');
      setLoading(false);
      return;
    }

    try {
      await api.post('/workers', {
        workerId: workerId.trim(),
        fullName: workerName.trim(),
        fatherName: workerFatherName.trim(),
        designation: workerDesignation.trim(),
        mobileNumber: workerMobile.trim(),
        dailyWage: parseFloat(dailyWage),
        dailyAllowance: dailyAllowance ? parseFloat(dailyAllowance) : 0,
        advanceTaken: advanceTaken ? parseFloat(advanceTaken) : (advanceBalance ? parseFloat(advanceBalance) : 0),
        advanceBalance: advanceBalance ? parseFloat(advanceBalance) : (advanceTaken ? parseFloat(advanceTaken) : 0),
        otAllowance: otAllowance ? parseFloat(otAllowance) : 0,
        otHourlyRate: otHourlyRate ? parseFloat(otHourlyRate) : parseFloat(dailyWage) / 8,
        divisionId: workerDivisionId,
        pfNumber: workerPfNumber.trim() || undefined,
        esiNumber: workerEsiNumber.trim() || undefined,
        uanNumber: workerUanNumber.trim() || undefined,
        bankAccountNo: workerBankAcc.trim() || undefined,
        ifscCode: workerIfsc.trim() || undefined,
        placeOfWork: workerPlaceOfWork.trim() || undefined,
        natureOfWork: workerNatureOfWork.trim() || undefined,
      });

      const msg = `Worker '${workerName}' registered successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setWorkerId('');
      setWorkerName('');
      setWorkerFatherName('');
      setWorkerDesignation('');
      setWorkerMobile('');
      setDailyWage('');
      setDailyAllowance('');
      setAdvanceTaken('');
      setAdvanceBalance('');
      setOtAllowance('');
      setOtHourlyRate('');
      setWorkerDivisionId('');
      setWorkerPfNumber('');
      setWorkerEsiNumber('');
      setWorkerUanNumber('');
      setWorkerBankAcc('');
      setWorkerIfsc('');
      setWorkerPlaceOfWork('');
      setWorkerNatureOfWork('');
      setShowAddWorkerForm(false);
      fetchWorkers();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to register worker';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!editingWorker) return;

    if (currentUserRole === 'SUPERVISOR') {
      try {
        setLoading(true);
        await api.put(`/workers/${editingWorker.id}`, {
          divisionId: editWorkerDivisionId,
        });
        const msg = `Worker '${editingWorker.fullName}' assigned division updated successfully!`;
        setSuccess(msg);
        showToast(msg, 'success');
        setEditingWorker(null);
        fetchWorkers();
      } catch (err: any) {
        const errMsg = err.response?.data?.error || 'Failed to update worker division';
        setError(errMsg);
        showToast(errMsg, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!editWorkerMobile || !/^\d{10}$/.test(editWorkerMobile.trim())) {
      const msg = 'A valid 10-digit Indian mobile number is mandatory!';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/workers/${editingWorker.id}`, {
        fullName: editWorkerName.trim(),
        fatherName: editFatherName.trim(),
        designation: editDesignation.trim(),
        mobileNumber: editWorkerMobile.trim(),
        dailyWage: parseFloat(editWage),
        dailyAllowance: editDailyAllowance ? parseFloat(editDailyAllowance) : 0,
        advanceTaken: editAdvanceTaken ? parseFloat(editAdvanceTaken) : 0,
        advanceBalance: editAdvanceBalance ? parseFloat(editAdvanceBalance) : 0,
        otAllowance: editOtAllowance ? parseFloat(editOtAllowance) : 0,
        otHourlyRate: editOtRate ? parseFloat(editOtRate) : parseFloat(editWage) / 8,
        divisionId: editWorkerDivisionId,
        pfNumber: editPfNumber.trim() || undefined,
        esiNumber: editEsiNumber.trim() || undefined,
        uanNumber: editUanNumber.trim() || undefined,
        bankAccountNo: editBankAcc.trim() || undefined,
        ifscCode: editIfsc.trim() || undefined,
        placeOfWork: editPlaceOfWork.trim() || undefined,
        natureOfWork: editNatureOfWork.trim() || undefined,
      });
      const msg = `Worker registry details for '${editWorkerName}' updated successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setEditingWorker(null);
      fetchWorkers();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update worker registry details';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async (id: string, name: string) => {
    const confirmFirst = window.confirm(
      `⚠️ WARNING: ARE YOU ABSOLUTELY SURE?\n\nYou are about to permanently delete worker '${name}'.\nAll past attendance and wage payment history linked to this worker will be erased.`
    );
    if (!confirmFirst) return;

    const confirmSecond = window.confirm(
      `🚨 FINAL CONFIRMATION:\n\nDo you really want to delete '${name}'? This action CANNOT be undone.`
    );
    if (!confirmSecond) return;

    clearMessages();

    try {
      await api.delete(`/workers/${id}`);
      const msg = `Worker '${name}' and associated records removed successfully.`;
      setSuccess(msg);
      showToast(msg, 'success');
      fetchWorkers();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to delete worker';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  // --- ACTIONS: POS ---
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      await api.post('/purchase-orders', {
        poNumber: poNumber.trim(),
        divisionId: poDivisionId,
        date: poDate,
        poAmount: parseFloat(poAmount),
      });

      const msg = `Purchase Order '${poNumber}' created successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setPoNumber('');
      setPoDate('');
      setPoAmount('');
      setPoDivisionId('');
      fetchPurchaseOrders();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to create PO';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartEditPO = (po: any) => {
    setEditingPO(po);
    setEditPONumber(po.poNumber);
    setEditPODivisionId(po.divisionId || (po.division ? po.division.id : ''));
    setEditPODate(po.date ? new Date(po.date).toISOString().split('T')[0] : '');
    setEditPOAmount(String(po.poAmount ?? po.amount ?? ''));
  };

  const handleUpdatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPO) return;
    clearMessages();
    setLoading(true);
    try {
      await api.put(`/purchase-orders/${editingPO.id}`, {
        poNumber: editPONumber.trim(),
        divisionId: editPODivisionId,
        date: editPODate,
        poAmount: parseFloat(editPOAmount)
      });
      const msg = `Purchase Order '${editPONumber}' updated successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setEditingPO(null);
      fetchPurchaseOrders();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update PO';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePO = async (id: string, poNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete purchase order '${poNumber}'?`)) return;
    clearMessages();

    try {
      await api.delete(`/purchase-orders/${id}`);
      const msg = `Purchase Order '${poNumber}' deleted successfully.`;
      setSuccess(msg);
      showToast(msg, 'success');
      fetchPurchaseOrders();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to delete PO';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const formatIndianCurrency = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '₹0';
    const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
    if (isNaN(num)) return '₹0';
    const hasDecimals = num % 1 !== 0;
    return `₹${hasDecimals ? num.toFixed(2) : num}`;
  };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-2.5 sm:p-6 space-y-3 sm:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-2 sm:pb-4 gap-2.5">
        <div>
          <h2 className="text-sm sm:text-xl font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e3a8a]" /> Master Creation
          </h2>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Manage system logins, divisions, and worker registries.
          </p>
        </div>

          {/* SUB-TABS NAVIGATION (Native App Pill bar) */}
          <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto scrollbar-none gap-1">
            {currentUserRole !== 'SUPERVISOR' && (
              <button
                onClick={() => { setActiveSubTab('accounts'); clearMessages(); }}
                className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial text-center ${
                  activeSubTab === 'accounts' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Logins
              </button>
            )}
            {currentUserRole !== 'SUPERVISOR' && (
              <button
                onClick={() => { setActiveSubTab('divisions'); clearMessages(); }}
                className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial text-center ${
                  activeSubTab === 'divisions' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                Divisions
              </button>
            )}
            <button
              onClick={() => { setActiveSubTab('workers'); clearMessages(); }}
              className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial text-center ${
                activeSubTab === 'workers' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Worker Registry
            </button>
            {currentUserRole !== 'SUPERVISOR' && (
              <button
                onClick={() => { setActiveSubTab('pos'); clearMessages(); }}
                className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial text-center ${
                  activeSubTab === 'pos' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                POs
              </button>
            )}
            {currentUserRole !== 'SUPERVISOR' && (
              <button
                onClick={() => { setActiveSubTab('holidays'); clearMessages(); fetchHolidays(); }}
                className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial text-center flex items-center gap-1 ${
                  activeSubTab === 'holidays' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>🏛️</span> Holidays
              </button>
            )}
            <button
              onClick={() => { setActiveSubTab('individual_stocks'); clearMessages(); fetchIndividualStocks(); }}
              className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial text-center flex items-center gap-1 ${
                activeSubTab === 'individual_stocks' ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Individual Stocks
            </button>
          </div>
        </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-xs border border-blue-200 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#1e3a8a]" /> {success}
        </div>
      )}

      {/* --- SUB-TAB: ACCOUNTS --- */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Operational System Accounts</h3>
            {currentUserRole === 'OWNER' && (
              <button
                onClick={() => setShowAddUserForm(!showAddUserForm)}
                className="px-3 py-1.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <UserPlus className="w-4 h-4" /> {showAddUserForm ? 'Hide Form' : '+ Add New Login'}
              </button>
            )}
          </div>

          {showAddUserForm && (
            <form onSubmit={handleCreateUser} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-[#1e3a8a] uppercase">Create Login Account</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User ID / Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. supervisor1"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number (Mandatory) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={userMobile}
                    onChange={(e) => setUserMobile(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Account password"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white"
                  >
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="MANAGER">MANAGER</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs shadow disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Login'}
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs excel-table">
              <thead>
                <tr>
                  <th>Sl No</th>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Mobile Number</th>
                  <th>Role</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td className="font-mono text-center">{i + 1}</td>
                    <td className="font-bold text-[#667eea]">{u.username}</td>
                    <td>{u.fullName}</td>
                    <td className="font-mono">{u.mobileNumber}</td>
                    <td>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          u.role === 'OWNER'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'MANAGER'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                    <td>
                      <div className="flex items-center">
                        {currentUserRole === 'OWNER' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingAccount(u);
                                setEditAccountUsername(u.username);
                                setEditAccountName(u.fullName);
                                setEditAccountMobile(u.mobileNumber);
                                setEditAccountPassword('');
                                setEditAccountRole(u.role);
                                clearMessages();
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded mr-1.5"
                              title="Edit User Login"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {u.role !== 'OWNER' && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded"
                                title="Delete User Login"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* EDIT ACCOUNT MODAL */}
          {editingAccount && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col">
                <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-5 font-bold flex justify-between items-center rounded-t-2xl">
                  <span className="text-lg">Edit System Account</span>
                  <button onClick={() => setEditingAccount(null)} className="hover:text-white/80 p-1 text-white">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleUpdateAccount} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">User ID / Username *</label>
                    <input
                      type="text"
                      required
                      value={editAccountUsername}
                      onChange={(e) => setEditAccountUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editAccountName}
                      onChange={(e) => setEditAccountName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={editAccountMobile}
                      onChange={(e) => setEditAccountMobile(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Password (Enter new password or leave blank to keep current)</label>
                    <input
                      type="password"
                      value={editAccountPassword}
                      onChange={(e) => setEditAccountPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                    <select
                      value={editAccountRole}
                      onChange={(e: any) => setEditAccountRole(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white"
                    >
                      {editingAccount?.role === 'OWNER' && <option value="OWNER">OWNER</option>}
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="MANAGER">MANAGER</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingAccount(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-gray-200 text-slate-700 font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SUB-TAB: DIVISIONS --- */}
      {activeSubTab === 'divisions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Site Divisions Master</h3>
          </div>

          <form onSubmit={handleCreateDivision} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 text-xs">
              <label className="block font-semibold text-slate-700 mb-1">New Division Name (e.g. Electrical, Bricklaying) *</label>
              <input
                type="text"
                required
                value={divisionName}
                onChange={(e) => setDivisionName(e.target.value)}
                placeholder="Enter division name"
                className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#667eea] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow h-fit w-full sm:w-auto"
            >
              <FolderPlus className="w-4 h-4" /> Create Division
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {divisions.map((d) => (
              <div key={d.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-800">{d.name}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">Registered Workers: {d._count?.workers || 0}</span>
                </div>
                {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingDivision(d);
                        setEditDivisionName(d.name);
                        clearMessages();
                      }}
                      className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Edit Division Name"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDivision(d.id, d.name)}
                      className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete Division"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* EDIT DIVISION MODAL */}
          {editingDivision && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col">
                <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-5 font-bold flex justify-between items-center rounded-t-2xl">
                  <span className="text-lg">Edit Division</span>
                  <button onClick={() => setEditingDivision(null)} className="hover:text-white/80 p-1 text-white">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleUpdateDivision} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Division Name *</label>
                    <input
                      type="text"
                      required
                      value={editDivisionName}
                      onChange={(e) => setEditDivisionName(e.target.value)}
                      placeholder="Enter new division name"
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingDivision(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-gray-200 text-slate-700 font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SUB-TAB: WORKERS --- */}
      {activeSubTab === 'workers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Workers Roster Registry</h3>
            {currentUserRole !== 'SUPERVISOR' && (
              <button
                onClick={() => { setShowAddWorkerForm(!showAddWorkerForm); setEditingWorker(null); }}
                className="px-3 py-1.5 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <Users className="w-4 h-4" /> {showAddWorkerForm ? 'Hide Registry Form' : '+ Register Worker'}
              </button>
            )}
          </div>

          {showAddWorkerForm && (
            <form onSubmit={handleCreateWorker} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-[#667eea] uppercase">Register Worker details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Worker ID / Badge No *</label>
                  <input
                    type="text"
                    required
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    placeholder="e.g. SKC-W-104"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    placeholder="Worker full name"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={workerFatherName}
                    onChange={(e) => setWorkerFatherName(e.target.value)}
                    placeholder="Father's name"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation / Trade</label>
                  <input
                    type="text"
                    value={workerDesignation}
                    onChange={(e) => setWorkerDesignation(e.target.value)}
                    placeholder="e.g. Mason, Welder, Fitter, Helper"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number (Indian Format) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={workerMobile}
                    onChange={(e) => setWorkerMobile(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Daily Wage (Rs) *</label>
                  <input
                    type="number"
                    required
                    value={dailyWage}
                    onChange={(e) => {
                      const wage = e.target.value;
                      setDailyWage(wage);
                      if (wage && !otHourlyRate) {
                        const calcOt = Math.round(parseFloat(wage) / 8);
                        setOtHourlyRate(isNaN(calcOt) ? '' : calcOt.toString());
                      }
                    }}
                    placeholder="Wage per day (e.g. 601)"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Daily Allowance (Rs)</label>
                  <input
                    type="number"
                    value={dailyAllowance}
                    onChange={(e) => setDailyAllowance(e.target.value)}
                    placeholder="Allowance per day (e.g. 565)"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Advance Taken (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={advanceTaken}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdvanceTaken(val);
                      setAdvanceBalance(val);
                    }}
                    placeholder="e.g. 60000"
                    className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Advance Balance (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={advanceBalance}
                    onChange={(e) => setAdvanceBalance(e.target.value)}
                    placeholder="e.g. 60000 (or 0)"
                    className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OT Allowance (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={otAllowance}
                    onChange={(e) => setOtAllowance(e.target.value)}
                    placeholder="e.g. 1000 (or 0)"
                    className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OT Hourly Rate (Rs) *</label>
                  <input
                    type="number"
                    required
                    value={otHourlyRate}
                    onChange={(e) => setOtHourlyRate(e.target.value)}
                    placeholder="e.g. 150 (Wage / 8)"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Division *</label>
                  <select
                    required
                    value={workerDivisionId}
                    onChange={(e) => setWorkerDivisionId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
                  >
                    <option value="">-- Choose Division --</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Place of Work</label>
                  <input
                    type="text"
                    value={workerPlaceOfWork}
                    onChange={(e) => setWorkerPlaceOfWork(e.target.value)}
                    placeholder="e.g. UNIT5 TO 8 COMPRESSOR TURBINE"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nature of Work</label>
                  <input
                    type="text"
                    value={workerNatureOfWork}
                    onChange={(e) => setWorkerNatureOfWork(e.target.value)}
                    placeholder="e.g. MAINTENANCE, PIPELINE"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PF Account No</label>
                  <input
                    type="text"
                    value={workerPfNumber}
                    onChange={(e) => setWorkerPfNumber(e.target.value)}
                    placeholder="e.g. GBRCH1955403000"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ESI Employee Code</label>
                  <input
                    type="text"
                    value={workerEsiNumber}
                    onChange={(e) => setWorkerEsiNumber(e.target.value)}
                    placeholder="e.g. 71000088340001099"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UAN No</label>
                  <input
                    type="text"
                    value={workerUanNumber}
                    onChange={(e) => setWorkerUanNumber(e.target.value)}
                    placeholder="e.g. 100493430949"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Account No</label>
                  <input
                    type="text"
                    value={workerBankAcc}
                    onChange={(e) => setWorkerBankAcc(e.target.value)}
                    placeholder="e.g. 06222200019793"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank IFSC Code</label>
                  <input
                    type="text"
                    value={workerIfsc}
                    onChange={(e) => setWorkerIfsc(e.target.value)}
                    placeholder="e.g. CNRB0010622"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono uppercase"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#667eea] text-white font-bold rounded-lg text-xs shadow disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Register Worker'}
                </button>
              </div>
            </form>
          )}

          {/* EDIT WORKER REGISTRY MODAL */}
          {editingWorker && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-5 font-bold flex justify-between items-center rounded-t-2xl">
                  <span className="text-lg">Edit Worker: {editingWorker.workerId}</span>
                  <button onClick={() => setEditingWorker(null)} className="hover:text-white/80 p-1 text-white">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleUpdateWorker} className="p-6 space-y-4 text-xs">
                  {currentUserRole === 'SUPERVISOR' ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 text-[#1e3a8a] border border-blue-200 rounded-lg text-xs font-semibold">
                        Supervisor Access: Select the new division to reassign this worker.
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-slate-700">
                        <div><strong className="text-slate-900">Worker ID:</strong> <span className="font-mono">{editingWorker.workerId}</span></div>
                        <div><strong className="text-slate-900">Full Name:</strong> {editingWorker.fullName}</div>
                        <div><strong className="text-slate-900">Father's Name:</strong> {editingWorker.fatherName || '-'}</div>
                        <div><strong className="text-slate-900">Designation:</strong> {editingWorker.designation || 'Worker'}</div>
                        <div><strong className="text-slate-900">Mobile Number:</strong> <span className="font-mono">{editingWorker.mobileNumber}</span></div>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-900 mb-1.5 text-xs">Assigned Division *</label>
                        <select
                          required
                          value={editWorkerDivisionId}
                          onChange={(e) => setEditWorkerDivisionId(e.target.value)}
                          className="w-full p-2.5 border-2 border-[#1e3a8a] rounded-lg focus:ring-2 focus:ring-[#1e3a8a]/20 outline-none font-bold text-sm bg-white text-[#1e3a8a]"
                        >
                          {divisions.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={editWorkerName}
                          onChange={(e) => setEditWorkerName(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Father's Name</label>
                          <input
                            type="text"
                            value={editFatherName}
                            onChange={(e) => setEditFatherName(e.target.value)}
                            placeholder="Father's name"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Designation / Trade</label>
                          <input
                            type="text"
                            value={editDesignation}
                            onChange={(e) => setEditDesignation(e.target.value)}
                            placeholder="e.g. Mason, Welder"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Mobile Number (Indian Format) *</label>
                        <input
                          type="text"
                          required
                          maxLength={10}
                          value={editWorkerMobile}
                          onChange={(e) => setEditWorkerMobile(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Daily Wage *</label>
                          <input
                            type="number"
                            required
                            value={editWage}
                            onChange={(e) => setEditWage(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Allowance</label>
                          <input
                            type="number"
                            value={editDailyAllowance}
                            onChange={(e) => setEditDailyAllowance(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-amber-800">Adv Taken</label>
                          <input
                            type="number"
                            min="0"
                            value={editAdvanceTaken}
                            onChange={(e) => setEditAdvanceTaken(e.target.value)}
                            className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono font-bold text-amber-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-amber-800">Adv Bal</label>
                          <input
                            type="number"
                            min="0"
                            value={editAdvanceBalance}
                            onChange={(e) => setEditAdvanceBalance(e.target.value)}
                            className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono font-bold text-amber-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-amber-800">OT Allow</label>
                          <input
                            type="number"
                            min="0"
                            value={editOtAllowance}
                            onChange={(e) => setEditOtAllowance(e.target.value)}
                            className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none font-mono font-bold text-amber-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">OT Rate *</label>
                          <input
                            type="number"
                            required
                            value={editOtRate}
                            onChange={(e) => setEditOtRate(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Assigned Division *</label>
                        <select
                          required
                          value={editWorkerDivisionId}
                          onChange={(e) => setEditWorkerDivisionId(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white"
                        >
                          {divisions.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Place of Work</label>
                          <input
                            type="text"
                            value={editPlaceOfWork}
                            onChange={(e) => setEditPlaceOfWork(e.target.value)}
                            placeholder="e.g. UNIT5 TO 8 COMPRESSOR TURBINE"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Nature of Work</label>
                          <input
                            type="text"
                            value={editNatureOfWork}
                            onChange={(e) => setEditNatureOfWork(e.target.value)}
                            placeholder="e.g. MAINTENANCE, PIPELINE"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">PF Account No</label>
                          <input
                            type="text"
                            value={editPfNumber}
                            onChange={(e) => setEditPfNumber(e.target.value)}
                            placeholder="e.g. GBRCH1955403000"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">ESI Employee Code</label>
                          <input
                            type="text"
                            value={editEsiNumber}
                            onChange={(e) => setEditEsiNumber(e.target.value)}
                            placeholder="e.g. 71000088340001099"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">UAN No</label>
                          <input
                            type="text"
                            value={editUanNumber}
                            onChange={(e) => setEditUanNumber(e.target.value)}
                            placeholder="e.g. 100493430949"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Bank Account No</label>
                          <input
                            type="text"
                            value={editBankAcc}
                            onChange={(e) => setEditBankAcc(e.target.value)}
                            placeholder="e.g. 06222200019793"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-700 mb-1">Bank IFSC Code</label>
                          <input
                            type="text"
                            value={editIfsc}
                            onChange={(e) => setEditIfsc(e.target.value)}
                            placeholder="e.g. CNRB0010622"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono uppercase"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setEditingWorker(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-gray-200 text-slate-700 font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 📱 MOBILE WORKER CARDS (Shown on mobile screens only) */}
          <div className="block md:hidden space-y-2.5">
            {workers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">No workers registered yet.</div>
            ) : (
              (() => {
                const sorted = [...workers].sort((a, b) => {
                  const extractNum = (str: string) => {
                    if (!str) return 999999;
                    const match = str.match(/\d+/);
                    return match ? parseInt(match[0], 10) : 999999;
                  };
                  return extractNum(a.workerId) - extractNum(b.workerId);
                });

                return sorted.map((w, i) => (
                  <div key={w.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] font-bold text-xs flex items-center justify-center">
                          {w.fullName?.charAt(0) || 'W'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{w.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                            <span className="text-[#1e3a8a] font-bold">{w.workerId}</span>
                            <span>•</span>
                            <span>{w.designation || 'Worker'}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold text-[10px] border border-blue-200">
                        {w.division?.name || 'General'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/60 p-2 rounded-lg border border-slate-100 font-mono">
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase">Daily Wage</span>
                        <span className="font-bold text-slate-800">{formatIndianCurrency(w.dailyWage)}/d</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase">Allowance</span>
                        <span className="font-bold text-emerald-700">+{formatIndianCurrency(w.dailyAllowance || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase">Advance Taken</span>
                        <span className="font-semibold text-slate-700">{formatIndianCurrency(w.advanceTaken || w.advanceBalance || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase">Advance Balance</span>
                        <span className="font-bold text-amber-900">{formatIndianCurrency(w.advanceBalance || 0)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] text-slate-400 font-mono">{w.mobileNumber}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingWorker(w);
                            setEditWorkerName(w.fullName);
                            setEditFatherName(w.fatherName || '');
                            setEditDesignation(w.designation || '');
                            setEditWorkerMobile(w.mobileNumber.startsWith('+91') ? w.mobileNumber.slice(3) : w.mobileNumber);
                            setEditWage(w.dailyWage.toString());
                            setEditDailyAllowance((w.dailyAllowance || 0).toString());
                            setEditAdvanceTaken((w.advanceTaken || w.advanceBalance || 0).toString());
                            setEditAdvanceBalance((w.advanceBalance || 0).toString());
                            setEditOtAllowance((w.otAllowance || 0).toString());
                            setEditOtRate((w.otHourlyRate || 0).toString());
                            setEditWorkerDivisionId(w.divisionId);
                            setEditPfNumber(w.pfNumber || '');
                            setEditEsiNumber(w.esiNumber || '');
                            setEditUanNumber(w.uanNumber || '');
                            setEditBankAcc(w.bankAccountNo || '');
                            setEditIfsc(w.ifscCode || '');
                            setEditPlaceOfWork(w.placeOfWork || '');
                            setEditNatureOfWork(w.natureOfWork || '');
                            setShowAddWorkerForm(false);
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] rounded-lg font-bold text-[11px] flex items-center gap-1 border border-blue-200"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            onClick={() => handleDeleteWorker(w.id, w.fullName)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11px] border border-rose-200"
                            title="Delete Worker"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>

          {/* 💻 DESKTOP/TABLET TABLE (100% UNTOUCHED) */}
          <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs excel-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">Sl No</th>
                  <th>Worker ID</th>
                  <th>Full Name</th>
                  <th>Father's Name</th>
                  <th>Designation</th>
                  <th>Mobile Number</th>
                  <th>Assigned Division</th>
                  {currentUserRole !== 'SUPERVISOR' && (
                    <>
                      <th>Daily Wage</th>
                      <th>Daily Allowance</th>
                      <th className="bg-amber-50 text-amber-900">Advance Taken</th>
                      <th className="bg-amber-100 text-amber-950 font-bold">Advance Balance</th>
                      <th className="bg-amber-50 text-amber-900">OT Allowance</th>
                      <th>OT Hourly Rate</th>
                    </>
                  )}
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sortedWorkers = [...workers].sort((a, b) => {
                    const extractNum = (str: string) => {
                      if (!str) return 999999;
                      const match = str.match(/\d+/);
                      return match ? parseInt(match[0], 10) : 999999;
                    };
                    const numA = extractNum(a.workerId);
                    const numB = extractNum(b.workerId);
                    if (numA !== numB) return numA - numB;
                    return (a.workerId || '').localeCompare(b.workerId || '');
                  });

                  if (sortedWorkers.length === 0) {
                    return (
                      <tr>
                        <td colSpan={currentUserRole !== 'SUPERVISOR' ? 14 : 8} className="p-8 text-center text-slate-400">
                          No workers registered yet.
                        </td>
                      </tr>
                    );
                  }

                  return sortedWorkers.map((w, i) => (
                    <tr key={w.id} className="hover:bg-slate-50/50">
                      <td className="font-mono text-center font-bold text-slate-500">{i + 1}</td>
                      <td className="font-mono font-bold text-slate-900">{w.workerId}</td>
                      <td className="font-semibold text-slate-800">{w.fullName}</td>
                      <td className="text-slate-600">{w.fatherName || '-'}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-[10px]">
                          {w.designation || 'Worker'}
                        </span>
                      </td>
                    <td className="font-mono text-slate-600">{w.mobileNumber}</td>
                    <td className="font-semibold text-blue-900">{w.division?.name || '-'}</td>
                    {currentUserRole !== 'SUPERVISOR' && (
                      <>
                        <td className="font-mono font-bold text-slate-700">{formatIndianCurrency(w.dailyWage)}</td>
                        <td className="font-mono font-bold text-emerald-700">{formatIndianCurrency(w.dailyAllowance || 0)}</td>
                        <td className="font-mono font-semibold text-slate-800 bg-amber-50/30">
                          {formatIndianCurrency(w.advanceTaken || w.advanceBalance || 0)}
                        </td>
                        <td className="font-mono font-bold text-amber-900 bg-amber-50/60">
                          {(w.advanceBalance > 0 || (w.advanceTaken > 0 && (w.advanceBalance === 0 || w.advanceBalance === undefined || w.advanceBalance === null))) ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                              {formatIndianCurrency(w.advanceBalance > 0 ? w.advanceBalance : w.advanceTaken)}
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>
                        <td className="font-mono font-bold text-amber-800 bg-amber-50/30">
                          {formatIndianCurrency(w.otAllowance || 0)}
                        </td>
                        <td className="font-mono text-slate-700">{formatIndianCurrency(w.otHourlyRate)}/hr</td>
                      </>
                    )}
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Owner, Manager or Supervisor can edit (Supervisor can only change division) */}
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER' || currentUserRole === 'SUPERVISOR') && (
                          <button
                            onClick={() => {
                              setEditingWorker(w);
                              setEditWorkerName(w.fullName);
                              setEditFatherName(w.fatherName || '');
                              setEditDesignation(w.designation || '');
                              setEditWorkerMobile(w.mobileNumber.startsWith('+91') ? w.mobileNumber.slice(3) : w.mobileNumber);
                              setEditWage(w.dailyWage.toString());
                              setEditDailyAllowance((w.dailyAllowance || 0).toString());
                              setEditAdvanceTaken((w.advanceTaken || w.advanceBalance || 0).toString());
                              setEditAdvanceBalance((w.advanceBalance || 0).toString());
                              setEditOtAllowance((w.otAllowance || 0).toString());
                              setEditOtRate((w.otHourlyRate || 0).toString());
                              setEditWorkerDivisionId(w.divisionId);
                              setEditPfNumber(w.pfNumber || '');
                              setEditEsiNumber(w.esiNumber || '');
                              setEditUanNumber(w.uanNumber || '');
                              setEditBankAcc(w.bankAccountNo || '');
                              setEditIfsc(w.ifscCode || '');
                              setEditPlaceOfWork(w.placeOfWork || '');
                              setEditNatureOfWork(w.natureOfWork || '');
                              setShowAddWorkerForm(false);
                            }}
                            className="p-1.5 text-[#1e3a8a] hover:text-[#1e40af] bg-blue-50 hover:bg-blue-100 rounded flex items-center gap-1 font-bold text-[11px]"
                            title={currentUserRole === 'SUPERVISOR' ? 'Change Division' : 'Edit Worker & Wages'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                            {currentUserRole === 'SUPERVISOR' && <span>Change Division</span>}
                          </button>
                        )}
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            onClick={() => handleDeleteWorker(w.id, w.fullName)}
                            className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded"
                            title="Delete Worker"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ));
              })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUB-TAB: POS --- */}
      {activeSubTab === 'pos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Purchase Order Master</h3>
          </div>

          {/* EDIT PO MODAL */}
          {editingPO && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-lg animate-fadeIn">
                <h3 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                  Edit Purchase Order: <span className="font-mono text-[#667eea]">{editingPO.poNumber}</span>
                </h3>
                <form onSubmit={handleUpdatePO} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PO Number *</label>
                    <input
                      type="text"
                      required
                      value={editPONumber}
                      onChange={(e) => setEditPONumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Division *</label>
                    <select
                      required
                      value={editPODivisionId}
                      onChange={(e) => setEditPODivisionId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
                    >
                      <option value="">-- Choose Division --</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={editPODate}
                      onChange={(e) => setEditPODate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editPOAmount}
                      onChange={(e) => setEditPOAmount(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono font-bold"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingPO(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-[#667eea] hover:bg-indigo-600 text-white font-bold rounded-lg shadow disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Update Purchase Order'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <form onSubmit={handleCreatePO} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PO Number *</label>
                <input
                  type="text"
                  required
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value.toUpperCase())}
                  placeholder="Enter PO number"
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono font-bold uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Division *</label>
                <select
                  required
                  value={poDivisionId}
                  onChange={(e) => setPoDivisionId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
                >
                  <option value="">-- Choose Division --</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount (Rs) *</label>
                <input
                  type="number"
                  required
                  value={poAmount}
                  onChange={(e) => setPoAmount(e.target.value)}
                  placeholder="e.g. 2500000"
                  className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono font-bold"
                />
                {poAmount && (
                  <div className="text-[11px] font-bold text-[#667eea] mt-1 font-mono bg-indigo-50 px-2 py-0.5 rounded w-fit border border-indigo-100">
                    Preview: {formatIndianCurrency(poAmount)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#667eea] hover:bg-indigo-600 text-white font-bold rounded-lg text-xs shadow disabled:opacity-50"
              >
                Create Purchase Order
              </button>
            </div>
          </form>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs excel-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Division</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Added By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-400">No purchase orders created yet.</td></tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="font-bold text-[#667eea] font-mono">{po.poNumber}</td>
                      <td>{po.division?.name || '-'}</td>
                      <td>{new Date(po.date).toLocaleDateString('en-GB')}</td>
                      <td className="font-mono font-bold text-slate-800">{formatIndianCurrency(po.poAmount ?? po.amount ?? 0)}</td>
                      <td>{po.addedBy?.fullName || '-'}</td>
                      <td>
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEditPO(po)}
                              className="p-1 text-[#667eea] hover:text-[#764ba2] bg-indigo-50 hover:bg-indigo-100 rounded"
                              title="Edit Purchase Order"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePO(po.id, po.poNumber)}
                              className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded"
                              title="Delete Purchase Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: HOLIDAY CALENDAR (GOVT & COMPANY PAID HOLIDAYS) --- */}
      {activeSubTab === 'holidays' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 rounded-xl border border-amber-200">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <span>🏛️</span> Official Company & Government Holiday Calendar
              </h3>
              <p className="text-xs text-slate-500">
                Holidays declared here apply to <strong>all divisions</strong> and are automatically credited as a paid working day for workers in daily attendance and payroll.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-500 text-white font-bold text-xs rounded-lg shadow-sm">
              {holidays.length} Declared Holidays
            </span>
          </div>

          {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
            <form onSubmit={handleAddHoliday} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Declare New Holiday</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Holiday Date *</label>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Holiday Name *</label>
                  <input
                    type="text"
                    required
                    value={holidayName}
                    onChange={(e) => setHolidayName(e.target.value)}
                    placeholder="e.g. Independence Day, Rajyotsava, Gandhi Jayanti"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Holiday Type</label>
                  <select
                    value={holidayType}
                    onChange={(e) => setHolidayType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none font-semibold"
                  >
                    <option value="GOVT_HOLIDAY">Govt Holiday (Paid)</option>
                    <option value="FESTIVAL_HOLIDAY">Festival Holiday (Paid)</option>
                    <option value="COMPANY_HOLIDAY">Company Holiday (Paid)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-lg text-xs shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>🏛️</span> Declare Holiday
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs excel-table">
              <thead>
                <tr>
                  <th>Holiday Date</th>
                  <th>Holiday Name</th>
                  <th>Category</th>
                  <th>Declared By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No holidays declared yet for this calendar year.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-amber-50/30">
                      <td className="font-mono font-bold text-[#1e3a8a]">
                        {new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="font-bold text-slate-800 flex items-center gap-1.5 py-2">
                        <span>🏛️</span> {h.name}
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {h.type?.replace('_', ' ') || 'GOVT HOLIDAY'}
                        </span>
                      </td>
                      <td className="text-slate-600">{h.addedByName || 'Owner/Manager'}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Paid Holiday
                        </span>
                      </td>
                      <td>
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            onClick={() => handleDeleteHoliday(h.id, h.name)}
                            className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded transition-colors"
                            title="Remove Holiday"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* --- SUB-TAB: INDIVIDUAL STOCKS (STANDALONE NON-PO INVENTORY) --- */}
      {activeSubTab === 'individual_stocks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1e3a8a]" /> Individual Stocks (Non-PO Items)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Register and manage stock purchased directly without a PO. Record inward purchases, sales with owner approval, and track balances.
              </p>
            </div>

            {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
              <button
                onClick={() => setShowAddIndStockForm(!showAddIndStockForm)}
                className="px-3.5 py-1.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <Package className="w-4 h-4" /> {showAddIndStockForm ? 'Hide Form' : '+ Add Individual Stock'}
              </button>
            )}
          </div>

          {/* ADD INDIVIDUAL STOCK FORM */}
          {showAddIndStockForm && (
            <form onSubmit={handleCreateIndStock} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 animate-fadeIn">
              <h4 className="font-bold text-xs text-[#1e3a8a] uppercase flex items-center gap-1.5">
                <Package className="w-4 h-4" /> Register Standalone Stock Item
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={indStockItemName}
                    onChange={(e) => setIndStockItemName(e.target.value.toUpperCase())}
                    placeholder="e.g. BALL BEARING 6205, COUPLING RUBBER, WELDING RODS"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Part Number / Item Code
                  </label>
                  <input
                    type="text"
                    value={indStockPartNumber}
                    onChange={(e) => setIndStockPartNumber(e.target.value.toUpperCase())}
                    placeholder="Optional Part No"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Unit of Measurement
                  </label>
                  <select
                    value={indStockUnit}
                    onChange={(e) => setIndStockUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none font-semibold"
                  >
                    <option value="NOS">NOS (Numbers)</option>
                    <option value="SET">SET</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="KGS">KGS (Kilograms)</option>
                    <option value="LTR">LTR (Liters)</option>
                    <option value="PKT">PKT (Packets)</option>
                    <option value="BOX">BOX</option>
                    <option value="PAIR">PAIR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Opening Stock Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={indStockOpening}
                    onChange={(e) => setIndStockOpening(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none font-mono"
                  />
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Remarks / Purpose
                  </label>
                  <input
                    type="text"
                    value={indStockRemarks}
                    onChange={(e) => setIndStockRemarks(e.target.value)}
                    placeholder="e.g. Purchased directly for site maintenance, emergency spares, etc."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddIndStockForm(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                >
                  <Package className="w-3.5 h-3.5" /> {loading ? 'Saving...' : 'Save Stock Item'}
                </button>
              </div>
            </form>
          )}

          {/* SEARCH & STATS BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={indStockSearch}
                onChange={(e) => setIndStockSearch(e.target.value)}
                placeholder="Search individual stocks by Item Name, Part No, or Remarks..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1e3a8a] outline-none"
              />
              <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span>Total Items: <strong className="text-slate-900">{individualStocks.length}</strong></span>
            </div>
          </div>

          {/* INDIVIDUAL STOCKS TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-left text-xs excel-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Part No</th>
                  <th>Unit</th>
                  <th className="text-right">Opening</th>
                  <th className="text-right">Total Inward</th>
                  <th className="text-right">Total Sold</th>
                  <th className="text-right">Available Stock</th>
                  <th>Remarks</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {individualStocks.filter(s => {
                  if (!indStockSearch) return true;
                  const q = indStockSearch.toLowerCase();
                  return (s.itemName || '').toLowerCase().includes(q) ||
                         (s.partNumber || '').toLowerCase().includes(q) ||
                         (s.remarks || '').toLowerCase().includes(q);
                }).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No individual stock items registered yet. Click <strong>+ Add Individual Stock</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  individualStocks
                    .filter(s => {
                      if (!indStockSearch) return true;
                      const q = indStockSearch.toLowerCase();
                      return (s.itemName || '').toLowerCase().includes(q) ||
                             (s.partNumber || '').toLowerCase().includes(q) ||
                             (s.remarks || '').toLowerCase().includes(q);
                    })
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="font-bold text-slate-900">
                          {item.itemName}
                        </td>
                        <td className="font-mono text-slate-600">
                          {item.partNumber || '-'}
                        </td>
                        <td>
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold text-slate-700">
                            {item.unit || 'NOS'}
                          </span>
                        </td>
                        <td className="text-right font-mono text-slate-600">
                          {item.openingStock || 0}
                        </td>
                        <td className="text-right font-mono font-bold text-emerald-700">
                          +{item.totalInward || 0}
                        </td>
                        <td className="text-right font-mono font-bold text-blue-700">
                          -{item.totalSold || 0}
                          {item.pendingSold > 0 && (
                            <span className="text-[10px] text-amber-600 block">({item.pendingSold} pending)</span>
                          )}
                        </td>
                        <td className="text-right font-mono font-black text-sm">
                          <span className={`px-2 py-0.5 rounded-full ${
                            (item.balanceStock || 0) > 0 
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {item.balanceStock || 0} {item.unit || 'NOS'}
                          </span>
                        </td>
                        <td className="text-slate-500 max-w-xs truncate" title={item.remarks || ''}>
                          {item.remarks || '-'}
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Inward Purchase Button */}
                            {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                              <button
                                onClick={() => {
                                  setPurchaseModalItem(item);
                                  setIndPurchaseForm({
                                    date: new Date().toISOString().split('T')[0],
                                    qty: '',
                                    rate: '',
                                    partyName: '',
                                    supplierAddress: '',
                                    gstNumber: '',
                                    partyInvoiceNumber: '',
                                    supplierInvoiceDate: '',
                                    vehicleNumber: '',
                                    cgstPercent: '9',
                                    sgstPercent: '9',
                                    igstPercent: '0',
                                    remarks: ''
                                  });
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded font-semibold text-[11px] flex items-center gap-1"
                                title="Record Inward Purchase"
                              >
                                <ArrowDownToLine className="w-3 h-3" /> Inward
                              </button>
                            )}

                            {/* Outward Sale Button */}
                            <button
                              onClick={() => {
                                setSaleModalItem(item);
                                setIndSaleForm({
                                  invoiceNumber: '',
                                  invoiceDate: new Date().toISOString().split('T')[0],
                                  qty: '',
                                  rate: '',
                                  partyName: '',
                                  supplierAddress: '',
                                  gstNumber: '',
                                  vehicleNumber: '',
                                  cgstPercent: '9',
                                  sgstPercent: '9',
                                  igstPercent: '0',
                                  remarks: ''
                                });
                              }}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded font-semibold text-[11px] flex items-center gap-1"
                              title="Record Outward Sale"
                            >
                              <ArrowUpFromLine className="w-3 h-3" /> Sale
                            </button>

                            {/* History Button */}
                            <button
                              onClick={() => handleOpenTxHistory(item)}
                              className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                              title="View Transactions History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Button */}
                            {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                              <button
                                onClick={() => setEditingIndStock(item)}
                                className="p-1 text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-300"
                                title="Edit Stock Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Button */}
                            {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                              <button
                                onClick={() => handleDeleteIndStock(item.id, item.itemName)}
                                className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded border border-red-300"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* MODAL: INWARD PURCHASE (FULL GST FIELDS) */}
          {purchaseModalItem && (
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden my-6">
                <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-6 py-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <ArrowDownToLine className="w-5 h-5 text-emerald-300" /> Record Inward Purchase (Individual Stock)
                    </h3>
                    <p className="text-xs text-emerald-200 mt-0.5">
                      Item: <strong>{purchaseModalItem.itemName}</strong> ({purchaseModalItem.partNumber || 'No Part Number'})
                    </p>
                  </div>
                  <button onClick={() => setPurchaseModalItem(null)} className="text-white/80 hover:text-white text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleRecordIndPurchase} className="p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Inward Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={indPurchaseForm.date}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, date: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Quantity Inward <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={indPurchaseForm.qty}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, qty: e.target.value })}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Unit Purchase Rate (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={indPurchaseForm.rate}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, rate: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Party / Supplier Name
                      </label>
                      <input
                        type="text"
                        value={indPurchaseForm.partyName}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, partyName: e.target.value })}
                        placeholder="e.g. SKF Bearing Distributor"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Supplier GSTIN Number
                      </label>
                      <input
                        type="text"
                        value={indPurchaseForm.gstNumber}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, gstNumber: e.target.value.toUpperCase() })}
                        placeholder="29XXXXXXXXXXXXX"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Party Bill / Invoice Number
                      </label>
                      <input
                        type="text"
                        value={indPurchaseForm.partyInvoiceNumber}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, partyInvoiceNumber: e.target.value.toUpperCase() })}
                        placeholder="Vendor Invoice #"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Supplier Invoice Date
                      </label>
                      <input
                        type="date"
                        value={indPurchaseForm.supplierInvoiceDate}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, supplierInvoiceDate: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        value={indPurchaseForm.vehicleNumber}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, vehicleNumber: e.target.value.toUpperCase() })}
                        placeholder="KA 36C 1234"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600 font-mono uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">CGST %</label>
                        <input
                          type="number"
                          value={indPurchaseForm.cgstPercent}
                          onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, cgstPercent: e.target.value })}
                          className="w-full px-1.5 py-1.5 border border-slate-300 rounded outline-none font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">SGST %</label>
                        <input
                          type="number"
                          value={indPurchaseForm.sgstPercent}
                          onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, sgstPercent: e.target.value })}
                          className="w-full px-1.5 py-1.5 border border-slate-300 rounded outline-none font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">IGST %</label>
                        <input
                          type="number"
                          value={indPurchaseForm.igstPercent}
                          onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, igstPercent: e.target.value })}
                          className="w-full px-1.5 py-1.5 border border-slate-300 rounded outline-none font-mono text-center"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Supplier Address</label>
                      <input
                        type="text"
                        value={indPurchaseForm.supplierAddress}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, supplierAddress: e.target.value })}
                        placeholder="Street, City, State, PIN"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks</label>
                      <input
                        type="text"
                        value={indPurchaseForm.remarks}
                        onChange={(e) => setIndPurchaseForm({ ...indPurchaseForm, remarks: e.target.value })}
                        placeholder="Optional remarks"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-emerald-800 font-semibold">Basic: ₹{(Number(indPurchaseForm.qty || 0) * Number(indPurchaseForm.rate || 0)).toLocaleString('en-IN')}</span>
                      <span className="text-emerald-700 ml-3">Tax: {Number(indPurchaseForm.cgstPercent || 0) + Number(indPurchaseForm.sgstPercent || 0) + Number(indPurchaseForm.igstPercent || 0)}%</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-950 text-sm">
                        Total Inward Amount: ₹{Math.round(
                          (Number(indPurchaseForm.qty || 0) * Number(indPurchaseForm.rate || 0)) * 
                          (1 + (Number(indPurchaseForm.cgstPercent || 0) + Number(indPurchaseForm.sgstPercent || 0) + Number(indPurchaseForm.igstPercent || 0)) / 100)
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPurchaseModalItem(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" /> {loading ? 'Saving...' : 'Confirm Inward Purchase'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: OUTWARD SALE (REQUIRES OWNER APPROVAL) */}
          {saleModalItem && (
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 overflow-hidden my-6">
                <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-6 py-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <ArrowUpFromLine className="w-5 h-5 text-blue-300" /> Record Outward Sale (Individual Stock)
                    </h3>
                    <p className="text-xs text-blue-200 mt-0.5">
                      Item: <strong>{saleModalItem.itemName}</strong> | Available Balance: <span className="font-bold font-mono text-emerald-300">{saleModalItem.balanceStock} {saleModalItem.unit || 'NOS'}</span>
                    </p>
                  </div>
                  <button onClick={() => setSaleModalItem(null)} className="text-white/80 hover:text-white text-xl font-bold">✕</button>
                </div>

                <form onSubmit={handleRecordIndSale} className="p-6 space-y-4 text-xs">
                  {currentUserRole !== 'OWNER' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                      <span>🛡️</span>
                      <span>
                        <strong>Note:</strong> Sales on Individual Stock submitted by {currentUserRole} will be placed under <strong>Pending Approvals</strong> and require Owner review before stock deduction.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Invoice Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={indSaleForm.invoiceNumber}
                        onChange={(e) => setIndSaleForm({ ...indSaleForm, invoiceNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. SKC/2026/01"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Invoice Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={indSaleForm.invoiceDate}
                        onChange={(e) => setIndSaleForm({ ...indSaleForm, invoiceDate: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Quantity to Sell <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        max={saleModalItem.balanceStock}
                        required
                        value={indSaleForm.qty}
                        onChange={(e) => setIndSaleForm({ ...indSaleForm, qty: e.target.value })}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Selling Rate (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={indSaleForm.rate}
                        onChange={(e) => setIndSaleForm({ ...indSaleForm, rate: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Buyer / Customer Name
                      </label>
                      <input
                        type="text"
                        value={indSaleForm.partyName}
                        onChange={(e) => setIndSaleForm({ ...indSaleForm, partyName: e.target.value })}
                        placeholder="e.g. KPCL Raichur"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Buyer GSTIN Number
                      </label>
                      <input
                        type="text"
                        value={indSaleForm.gstNumber}
                        onChange={(e) => setIndSaleForm({ ...indSaleForm, gstNumber: e.target.value.toUpperCase() })}
                        placeholder="29XXXXXXXXXXXXX"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Dispatch Vehicle Number
                      </label>
                      <input
                        type="text"
                        value={indSaleForm.vehicleNumber}
                        onChange={(e) => setIndSaleForm({ ...indSaleForm, vehicleNumber: e.target.value.toUpperCase() })}
                        placeholder="KA 36C 2722"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 font-mono uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">CGST %</label>
                        <input
                          type="number"
                          value={indSaleForm.cgstPercent}
                          onChange={(e) => setIndSaleForm({ ...indSaleForm, cgstPercent: e.target.value })}
                          className="w-full px-1.5 py-1.5 border border-slate-300 rounded outline-none font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">SGST %</label>
                        <input
                          type="number"
                          value={indSaleForm.sgstPercent}
                          onChange={(e) => setIndSaleForm({ ...indSaleForm, sgstPercent: e.target.value })}
                          className="w-full px-1.5 py-1.5 border border-slate-300 rounded outline-none font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">IGST %</label>
                        <input
                          type="number"
                          value={indSaleForm.igstPercent}
                          onChange={(e) => setIndSaleForm({ ...indSaleForm, igstPercent: e.target.value })}
                          className="w-full px-1.5 py-1.5 border border-slate-300 rounded outline-none font-mono text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Company GSTIN</label>
                      <input
                        type="text"
                        disabled
                        value="29DWKPP3582H1ZV"
                        className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-slate-600 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Delivery Address</label>
                      <input
                        type="text"
                        value={indSaleForm.supplierAddress}
                        onChange={(e) => setIndSaleForm({ ...indSaleForm, supplierAddress: e.target.value })}
                        placeholder="Plant Premises, Shaktinagara, Raichur"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks</label>
                      <input
                        type="text"
                        value={indSaleForm.remarks}
                        onChange={(e) => setIndSaleForm({ ...indSaleForm, remarks: e.target.value })}
                        placeholder="Optional sale dispatch notes"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-blue-900 font-semibold">Basic Value: ₹{(Number(indSaleForm.qty || 0) * Number(indSaleForm.rate || 0)).toLocaleString('en-IN')}</span>
                      <span className="text-blue-700 ml-3">Tax: {Number(indSaleForm.cgstPercent || 0) + Number(indSaleForm.sgstPercent || 0) + Number(indSaleForm.igstPercent || 0)}%</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-blue-950 text-sm">
                        Total Invoice Value: ₹{Math.round(
                          (Number(indSaleForm.qty || 0) * Number(indSaleForm.rate || 0)) * 
                          (1 + (Number(indSaleForm.cgstPercent || 0) + Number(indSaleForm.sgstPercent || 0) + Number(indSaleForm.igstPercent || 0)) / 100)
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSaleModalItem(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                    >
                      <ArrowUpFromLine className="w-3.5 h-3.5" /> {loading ? 'Submitting...' : currentUserRole === 'OWNER' ? 'Confirm Sale' : 'Submit for Owner Approval'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: TRANSACTION HISTORY */}
          {txHistoryItem && (
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 overflow-hidden my-6">
                <div className="bg-[#1e3a8a] text-white px-6 py-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <History className="w-5 h-5 text-sky-200" /> Transaction Ledger: {txHistoryItem.itemName}
                    </h3>
                    <p className="text-xs text-sky-200 mt-0.5">
                      Part No: <strong>{txHistoryItem.partNumber || '-'}</strong> | Unit: <strong>{txHistoryItem.unit || 'NOS'}</strong>
                    </p>
                  </div>
                  <button onClick={() => setTxHistoryItem(null)} className="text-white/80 hover:text-white text-xl font-bold">✕</button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-left text-xs excel-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Invoice / Bill #</th>
                        <th>Party Name & GSTIN</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Rate</th>
                        <th className="text-right">Total (₹)</th>
                        <th>Status</th>
                        <th>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionsList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            No inward or outward transactions recorded yet for this item.
                          </td>
                        </tr>
                      ) : (
                        transactionsList.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50">
                            <td className="font-mono text-slate-800">
                              {new Date(tx.date).toLocaleDateString('en-GB')}
                            </td>
                            <td>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === 'INWARD' 
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                  : 'bg-blue-100 text-blue-900 border border-blue-300'
                              }`}>
                                {tx.type === 'INWARD' ? '📥 INWARD' : '📤 OUTWARD'}
                              </span>
                            </td>
                            <td className="font-mono font-bold text-slate-900">
                              {tx.partyInvoiceNumber || '-'}
                            </td>
                            <td>
                              <div className="font-bold text-slate-800">{tx.partyName || '-'}</div>
                              {tx.gstNumber && <div className="text-[10px] text-slate-500 font-mono">GST: {tx.gstNumber}</div>}
                            </td>
                            <td className={`text-right font-mono font-bold ${tx.type === 'INWARD' ? 'text-emerald-700' : 'text-blue-700'}`}>
                              {tx.type === 'INWARD' ? '+' : '-'}{tx.qty}
                            </td>
                            <td className="text-right font-mono text-slate-700">
                              ₹{parseFloat(tx.rate || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="text-right font-mono font-bold text-slate-900">
                              ₹{Math.round(parseFloat(tx.totalAmount || 0)).toLocaleString('en-IN')}
                            </td>
                            <td>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.status === 'APPROVED' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : tx.status === 'PENDING' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="text-slate-500 text-[11px]">
                              {tx.addedBy?.fullName || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => setTxHistoryItem(null)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: EDIT INDIVIDUAL STOCK DETAILS */}
          {editingIndStock && (
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
                <div className="bg-[#1e3a8a] text-white px-6 py-4 flex justify-between items-center">
                  <h3 className="font-bold text-sm">Edit Stock Details</h3>
                  <button onClick={() => setEditingIndStock(null)} className="text-white/80 hover:text-white">✕</button>
                </div>
                <form onSubmit={handleUpdateIndStock} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      required
                      value={editingIndStock.itemName}
                      onChange={(e) => setEditingIndStock({ ...editingIndStock, itemName: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Part Number</label>
                    <input
                      type="text"
                      value={editingIndStock.partNumber || ''}
                      onChange={(e) => setEditingIndStock({ ...editingIndStock, partNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit</label>
                    <select
                      value={editingIndStock.unit || 'NOS'}
                      onChange={(e) => setEditingIndStock({ ...editingIndStock, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] font-semibold"
                    >
                      <option value="NOS">NOS</option>
                      <option value="SET">SET</option>
                      <option value="MTR">MTR</option>
                      <option value="KGS">KGS</option>
                      <option value="LTR">LTR</option>
                      <option value="PKT">PKT</option>
                      <option value="BOX">BOX</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Opening Stock</label>
                    <input
                      type="number"
                      step="any"
                      value={editingIndStock.openingStock || 0}
                      onChange={(e) => setEditingIndStock({ ...editingIndStock, openingStock: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks</label>
                    <input
                      type="text"
                      value={editingIndStock.remarks || ''}
                      onChange={(e) => setEditingIndStock({ ...editingIndStock, remarks: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditingIndStock(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
