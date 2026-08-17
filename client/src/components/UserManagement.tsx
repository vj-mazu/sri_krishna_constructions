import React, { useState, useEffect } from 'react';
import api from '../api';
import { showToast } from '../toast';
import { UserPlus, UserCheck, Shield, Trash2, AlertCircle, Users, FolderPlus, Edit } from 'lucide-react';

interface UserManagementProps {
  currentUserRole: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUserRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'divisions' | 'workers' | 'pos'>(
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

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const [initialLoading, setInitialLoading] = useState(true);

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
    const promises: Promise<void>[] = [fetchDivisions(), fetchWorkers()];
    if (currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') {
      promises.push(fetchUsers(), fetchPurchaseOrders());
    }
    Promise.all(promises).finally(() => setInitialLoading(false));
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
    if (!window.confirm(`Are you sure you want to delete worker '${name}'?`)) return;
    clearMessages();

    try {
      await api.delete(`/workers/${id}`);
      const msg = `Worker '${name}' removed successfully.`;
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

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
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
                {workers.map((w, i) => (
                  <tr key={w.id}>
                    <td className="font-mono text-center">{i + 1}</td>
                    <td className="font-mono font-bold text-slate-800">{w.workerId}</td>
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
                ))}
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
    </div>
  );
};
