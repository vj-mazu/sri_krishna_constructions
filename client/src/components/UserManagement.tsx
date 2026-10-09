import React, { useState, useEffect } from 'react';
import api from '../api';
import { showToast } from '../toast';
import { showConfirm } from '../confirmDialog';
import { UserPlus, UserCheck, Shield, Trash2, AlertCircle, Users, FolderPlus, Edit, Package, ArrowDownToLine, ArrowUpFromLine, Receipt, History, Eye, FileText, X, Building2, Search, Plus, CheckCircle2, Power, Briefcase } from 'lucide-react';
import { DatePickerDMY } from './DatePickerDMY';

interface UserManagementProps {
  currentUserRole: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUserRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'divisions' | 'workers' | 'pos' | 'holidays'>(
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
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'SUPERVISOR'>('SUPERVISOR');
  const [userAssignedDivisionId, setUserAssignedDivisionId] = useState<string>('ALL');
  const [userActive, setUserActive] = useState<boolean>(true);

  // Edit user state
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editAccountUsername, setEditAccountUsername] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountMobile, setEditAccountMobile] = useState('');
  const [editAccountRole, setEditAccountRole] = useState<'OWNER' | 'MANAGER' | 'SUPERVISOR'>('SUPERVISOR');
  const [editAccountPassword, setEditAccountPassword] = useState('');
  const [editAccountAssignedDivisionId, setEditAccountAssignedDivisionId] = useState<string>('ALL');
  const [editAccountActive, setEditAccountActive] = useState<boolean>(true);

  // --- DIVISIONS STATE ---
  const [divisionCategoryTab, setDivisionCategoryTab] = useState<'ATTENDANCE' | 'PO_CLIENT'>('ATTENDANCE');
  const [divisionStatusFilter, setDivisionStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [divisions, setDivisions] = useState<any[]>([]);
  const [divisionSearch, setDivisionSearch] = useState('');
  const [divisionName, setDivisionName] = useState('');
  const [editingDivision, setEditingDivision] = useState<any>(null);
  const [editDivisionName, setEditDivisionName] = useState('');
  const [editDivisionType, setEditDivisionType] = useState<'ATTENDANCE' | 'PO_CLIENT'>('ATTENDANCE');
  const [editDivisionActive, setEditDivisionActive] = useState<boolean>(true);

  // --- WORKERS STATE ---
  const [workerStatusFilter, setWorkerStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [workerSearch, setWorkerSearch] = useState('');
  const [workers, setWorkers] = useState<any[]>([]);
  const [showAddWorkerForm, setShowAddWorkerForm] = useState(false);
  const [workerActive, setWorkerActive] = useState<boolean>(true);
  const [workerId, setWorkerId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [workerFatherName, setWorkerFatherName] = useState('');
  const [workerDesignation, setWorkerDesignation] = useState('');
  const [workerMobile, setWorkerMobile] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [dailyAllowance, setDailyAllowance] = useState('');
  const [workerExtra, setWorkerExtra] = useState('');
  const [advanceTaken, setAdvanceTaken] = useState('');
  const [advanceTakenDate, setAdvanceTakenDate] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceReturnDate, setAdvanceReturnDate] = useState('');
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
  const [editWorkerActive, setEditWorkerActive] = useState<boolean>(true);
  const [editWorkerId, setEditWorkerId] = useState('');
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editWorkerMobile, setEditWorkerMobile] = useState('');
  const [editWage, setEditWage] = useState('');
  const [editDailyAllowance, setEditDailyAllowance] = useState('');
  const [editWorkerExtra, setEditWorkerExtra] = useState('');
  const [editAdvanceTaken, setEditAdvanceTaken] = useState('');
  const [editAdvanceTakenDate, setEditAdvanceTakenDate] = useState('');
  const [editAdvanceReason, setEditAdvanceReason] = useState('');
  const [editAdvanceReturnDate, setEditAdvanceReturnDate] = useState('');
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
  const [poStatusFilter, setPoStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
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
  const [editPOActive, setEditPOActive] = useState<boolean>(true);
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
    const confirmed = await showConfirm({
      title: 'Remove Holiday',
      message: `Are you sure you want to remove the holiday '${name}'?`,
      confirmText: 'Remove',
      type: 'danger'
    });
    if (!confirmed) return;
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
    const promises: Promise<void>[] = [fetchDivisions(), fetchWorkers()];
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
        assignedDivisionId: role === 'SUPERVISOR' && userAssignedDivisionId !== 'ALL' ? userAssignedDivisionId : null,
        isActive: userActive,
      });

      const msg = `User Account '${username}' created successfully!`;
      setSuccess(msg);
      showToast(msg, 'success');
      setUsername('');
      setFullName('');
      setUserMobile('');
      setPassword('');
      setUserAssignedDivisionId('ALL');
      setUserActive(true);
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

  const handleToggleUserActive = async (u: any) => {
    const currentActive = u.isActive !== false;
    try {
      clearMessages();
      await api.patch(`/users/${u.id}/toggle-active`);
      setUsers(prev => prev.map(user => user.id === u.id ? { ...user, isActive: !currentActive } : user));
      const msg = `User login '${u.username}' marked as ${!currentActive ? 'ACTIVE' : 'INACTIVE'}`;
      setSuccess(msg);
      showToast(msg, 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update user login status';
      setError(errMsg);
      showToast(errMsg, 'error');
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
        assignedDivisionId: editAccountRole === 'SUPERVISOR' ? (editAccountAssignedDivisionId !== 'ALL' ? editAccountAssignedDivisionId : null) : null,
        isActive: editAccountActive,
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
    const confirmed = await showConfirm({
      title: 'Delete User Account',
      message: `Are you sure you want to delete user '${user.username}'?`,
      confirmText: 'Delete User',
      type: 'danger'
    });
    if (!confirmed) return;
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
      await api.post('/divisions', { 
        name: divisionName.trim(),
        type: divisionCategoryTab 
      });
      const catLabel = divisionCategoryTab === 'ATTENDANCE' ? 'Attendance Division' : 'PO Division / Client';
      const msg = `${catLabel} '${divisionName}' registered successfully!`;
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

  const handleToggleDivisionActive = async (id: string, name: string, currentActive: boolean) => {
    try {
      clearMessages();
      await api.patch(`/divisions/${id}/toggle-active`);
      setDivisions(prev => prev.map(d => d.id === id ? { ...d, isActive: !currentActive } : d));
      const msg = `Division '${name}' marked as ${!currentActive ? 'ACTIVE' : 'INACTIVE'}`;
      setSuccess(msg);
      showToast(msg, 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update division status';
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
      await api.put(`/divisions/${editingDivision.id}`, { 
        name: editDivisionName.trim(),
        type: editDivisionType,
        isActive: editDivisionActive
      });
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

    const confirmed = await showConfirm({
      title: 'Delete Division',
      message: `Are you sure you want to delete division '${name}'?\n\nNote: Division cannot be deleted if workers are still assigned to it. Reassign workers first.`,
      confirmText: 'Delete Division',
      type: 'danger'
    });
    if (!confirmed) return;
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
        extraAmount: workerExtra ? parseFloat(workerExtra) : 0,
        advanceTaken: advanceTaken ? parseFloat(advanceTaken) : (advanceBalance ? parseFloat(advanceBalance) : 0),
        advanceTakenDate: advanceTakenDate || undefined,
        advanceReason: advanceReason.trim() || undefined,
        advanceReturnDate: advanceReturnDate || undefined,
        advanceBalance: advanceBalance ? parseFloat(advanceBalance) : (advanceTaken ? parseFloat(advanceTaken) : 0),
        otAllowance: otAllowance ? parseFloat(otAllowance) : 0,
        otHourlyRate: otHourlyRate ? parseFloat(otHourlyRate) : parseFloat(dailyWage) / 8,
        divisionId: workerDivisionId,
        isActive: workerActive,
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
      setWorkerExtra('');
      setAdvanceTaken('');
      setAdvanceTakenDate('');
      setAdvanceReason('');
      setAdvanceReturnDate('');
      setAdvanceBalance('');
      setOtAllowance('');
      setOtHourlyRate('');
      setWorkerDivisionId('');
      setWorkerActive(true);
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

  const handleToggleWorkerActive = async (id: string, name: string, currentActive: boolean) => {
    try {
      clearMessages();
      await api.patch(`/workers/${id}/toggle-active`);
      setWorkers(prev => prev.map(w => w.id === id ? { ...w, isActive: !currentActive } : w));
      const msg = `Worker '${name}' marked as ${!currentActive ? 'ACTIVE' : 'INACTIVE'}`;
      setSuccess(msg);
      showToast(msg, 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update worker active status';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleUpdateWorker = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
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
        workerId: editWorkerId.trim() || undefined,
        fullName: editWorkerName.trim(),
        fatherName: editFatherName.trim(),
        designation: editDesignation.trim(),
        mobileNumber: editWorkerMobile.trim(),
        dailyWage: parseFloat(editWage),
        dailyAllowance: editDailyAllowance ? parseFloat(editDailyAllowance) : 0,
        extraAmount: editWorkerExtra ? parseFloat(editWorkerExtra) : 0,
        advanceTaken: editAdvanceTaken ? parseFloat(editAdvanceTaken) : 0,
        advanceTakenDate: editAdvanceTakenDate || undefined,
        advanceReason: editAdvanceReason.trim() || undefined,
        advanceReturnDate: editAdvanceReturnDate || undefined,
        advanceBalance: editAdvanceBalance ? parseFloat(editAdvanceBalance) : 0,
        otAllowance: editOtAllowance ? parseFloat(editOtAllowance) : 0,
        otHourlyRate: editOtRate ? parseFloat(editOtRate) : parseFloat(editWage) / 8,
        divisionId: editWorkerDivisionId,
        isActive: editWorkerActive,
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
    const confirmed = await showConfirm({
      title: 'Permanent Delete Worker',
      message: `You are about to permanently delete worker '${name}'.\n\nAll past attendance and wage payment history linked to this worker will be erased. This action CANNOT be undone.`,
      confirmText: 'Delete Worker Permanently',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

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
  
  const handleTogglePoActive = async (id: string, poNumber: string, currentActive: boolean) => {
    try {
      clearMessages();
      await api.patch(`/purchase-orders/${id}/toggle-active`);
      setPurchaseOrders(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentActive } : p));
      const msg = `Purchase Order '${poNumber}' marked as ${!currentActive ? 'ACTIVE' : 'INACTIVE'}`;
      setSuccess(msg);
      showToast(msg, 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to update purchase order status';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleStartEditPO = (po: any) => {
    setEditingPO(po);
    setEditPONumber(po.poNumber);
    setEditPODivisionId(po.divisionId || (po.division ? po.division.id : ''));
    setEditPODate(po.date ? new Date(po.date).toISOString().split('T')[0] : '');
    setEditPOAmount(String(po.poAmount ?? po.amount ?? ''));
    setEditPOActive(po.isActive !== false);
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
        poAmount: parseFloat(editPOAmount),
        isActive: editPOActive
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
    const confirmed = await showConfirm({
      title: 'Delete Purchase Order',
      message: `Are you sure you want to delete purchase order '${poNumber}'?`,
      confirmText: 'Delete PO',
      type: 'danger'
    });
    if (!confirmed) return;
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
      {activeSubTab === 'accounts' && (() => {
        const ownerCount = users.filter((u) => u.role === 'OWNER').length;
        const managerCount = users.filter((u) => u.role === 'MANAGER').length;
        const supervisorCount = users.filter((u) => u.role === 'SUPERVISOR').length;

        return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Operational System Accounts</h3>
              <p className="text-xs text-slate-500 mt-0.5">Role Limits: Owner (Max 2), Manager (Max 2), Supervisor (Max 5)</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${ownerCount >= 2 ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  👑 Owner: <strong>{ownerCount}/2</strong>
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${managerCount >= 2 ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  👔 Manager: <strong>{managerCount}/2</strong>
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${supervisorCount >= 5 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  👷 Supervisor: <strong>{supervisorCount}/5</strong>
                </span>
              </div>
              {currentUserRole === 'OWNER' && (
                <button
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className="px-3 py-1.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
                >
                  <UserPlus className="w-4 h-4" /> {showAddUserForm ? 'Hide Form' : '+ Add New Login'}
                </button>
              )}
            </div>
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
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
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
                    <option value="SUPERVISOR" disabled={supervisorCount >= 5}>
                      SUPERVISOR {supervisorCount >= 5 ? '(Limit of 5 reached)' : `(${supervisorCount}/5)`}
                    </option>
                    <option value="MANAGER" disabled={managerCount >= 2}>
                      MANAGER {managerCount >= 2 ? '(Limit of 2 reached)' : `(${managerCount}/2)`}
                    </option>
                    <option value="OWNER" disabled={ownerCount >= 2}>
                      OWNER {ownerCount >= 2 ? '(Limit of 2 reached)' : `(${ownerCount}/2)`}
                    </option>
                  </select>
                </div>
                {role === 'SUPERVISOR' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Assigned Division <span className="text-[10px] text-slate-500 font-normal">(Optional Restriction)</span>
                    </label>
                    <select
                      value={userAssignedDivisionId}
                      onChange={(e) => setUserAssignedDivisionId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-medium bg-white"
                    >
                      <option value="ALL">🌐 All Divisions (Full Access)</option>
                      {divisions.filter(d => d.type === 'ATTENDANCE' || !d.type).map(d => (
                        <option key={d.id} value={d.id}>🔒 {d.name} Only</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Login Status</label>
                  <button
                    type="button"
                    onClick={() => setUserActive(!userActive)}
                    className={`w-full p-2 border rounded font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      userActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${userActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {userActive ? 'Active (Can Sign In)' : 'Inactive (Login Blocked)'}
                    </span>
                    <span className="text-[10px] font-normal underline">Toggle</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs shadow disabled:opacity-50 cursor-pointer"
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
                  <th>Assigned Site / Division</th>
                  <th>Status</th>
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
                    <td>
                      {u.role === 'SUPERVISOR' ? (
                        u.assignedDivisionId && (u.assignedDivision?.name || divisions.find(d => d.id === u.assignedDivisionId)?.name) ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            🔒 {u.assignedDivision?.name || divisions.find(d => d.id === u.assignedDivisionId)?.name} Only
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">🌐 All Sites</span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </td>
                    <td>
                      {currentUserRole === 'OWNER' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleUserActive(u)}
                          className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                            u.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                          }`}
                          title="Click to toggle Active / Inactive status"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          <span>{u.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span>
                        </button>
                      ) : (
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1.5 ${
                            u.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                          <span>{u.isActive !== false ? 'ACTIVE' : 'INACTIVE'}</span>
                        </span>
                      )}
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
                                setEditAccountAssignedDivisionId(u.assignedDivisionId || 'ALL');
                                setEditAccountActive(u.isActive !== false);
                                clearMessages();
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded mr-1.5 cursor-pointer"
                              title="Edit User Login"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {u.role !== 'OWNER' && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded cursor-pointer"
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
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-start sm:items-center justify-center py-4 sm:py-8 p-4 overflow-y-auto animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col my-auto max-h-[92vh]">
                <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-5 font-bold flex justify-between items-center rounded-t-2xl">
                  <span className="text-lg">Edit System Account</span>
                  <button onClick={() => setEditingAccount(null)} className="hover:text-white/80 p-1 text-white cursor-pointer">
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
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white cursor-pointer"
                    >
                      <option value="SUPERVISOR" disabled={editAccountRole !== 'SUPERVISOR' && supervisorCount >= 5}>
                        SUPERVISOR {editAccountRole !== 'SUPERVISOR' && supervisorCount >= 5 ? '(Limit of 5 reached)' : ''}
                      </option>
                      <option value="MANAGER" disabled={editAccountRole !== 'MANAGER' && managerCount >= 2}>
                        MANAGER {editAccountRole !== 'MANAGER' && managerCount >= 2 ? '(Limit of 2 reached)' : ''}
                      </option>
                      <option value="OWNER" disabled={editAccountRole !== 'OWNER' && ownerCount >= 2}>
                        OWNER {editAccountRole !== 'OWNER' && ownerCount >= 2 ? '(Limit of 2 reached)' : ''}
                      </option>
                    </select>
                  </div>
                  {editAccountRole === 'SUPERVISOR' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Assigned Division <span className="text-[10px] text-slate-500 font-normal">(Single Division Restriction)</span>
                      </label>
                      <select
                        value={editAccountAssignedDivisionId}
                        onChange={(e) => setEditAccountAssignedDivisionId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-medium bg-white cursor-pointer"
                      >
                        <option value="ALL">🌐 All Divisions (Full Access)</option>
                        {divisions.filter(d => d.type === 'ATTENDANCE' || !d.type).map(d => (
                          <option key={d.id} value={d.id}>🔒 {d.name} Only</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Account Login Status</label>
                    <button
                      type="button"
                      onClick={() => setEditAccountActive(!editAccountActive)}
                      className={`w-full p-2.5 border rounded-lg font-bold text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        editAccountActive
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-rose-50 border-rose-300 text-rose-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${editAccountActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {editAccountActive ? 'Active (User can sign in)' : 'Inactive (User cannot sign in)'}
                      </span>
                      <span className="text-[10px] font-normal underline">Click to toggle</span>
                    </button>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingAccount(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-gray-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {/* --- SUB-TAB: DIVISIONS --- */}
      {activeSubTab === 'divisions' && (
        <div className="space-y-5">
          {/* TOP HEADER & SEGMENTED SWITCH */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1e3a8a]" />
                <span>Master Divisions & Cost Centers</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {divisionCategoryTab === 'ATTENDANCE'
                  ? 'Organize worker attendance rosters, muster rolls, and site shifts.'
                  : 'Manage client cost-centers, project divisions, and billing purchase orders.'}
              </p>
            </div>

            {/* CATEGORY SWITCHER PILLS */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 self-start md:self-auto">
              <button
                type="button"
                onClick={() => { setDivisionCategoryTab('ATTENDANCE'); setDivisionSearch(''); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  divisionCategoryTab === 'ATTENDANCE'
                    ? 'bg-[#1e3a8a] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Attendance Divisions</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  divisionCategoryTab === 'ATTENDANCE' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {divisions.filter(d => (d.type || 'PO_CLIENT') === 'ATTENDANCE').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setDivisionCategoryTab('PO_CLIENT'); setDivisionSearch(''); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  divisionCategoryTab === 'PO_CLIENT'
                    ? 'bg-[#1e3a8a] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>PO Divisions / Clients</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  divisionCategoryTab === 'PO_CLIENT' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {divisions.filter(d => (d.type || 'PO_CLIENT') === 'PO_CLIENT').length}
                </span>
              </button>
            </div>
          </div>

          {/* QUICK CREATE CARD */}
          {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
            <form onSubmit={handleCreateDivision} className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Create New {divisionCategoryTab === 'ATTENDANCE' ? 'Attendance Division' : 'PO / Client Division'}
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={divisionName}
                    onChange={(e) => setDivisionName(e.target.value)}
                    placeholder={divisionCategoryTab === 'ATTENDANCE' ? 'e.g. TM-1, TM-2, AHP-2, Workshop, Bottom Ash...' : 'e.g. KPCL Raichur, BTPS, RTPS Unit 7, ISGEC...'}
                    className="w-full pl-3.5 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/15 outline-none font-medium text-xs text-slate-800 transition-all placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all shrink-0 active:scale-98"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add {divisionCategoryTab === 'ATTENDANCE' ? 'Attendance Division' : 'PO Division'}</span>
                </button>
              </div>
            </form>
          )}

          {/* SEARCH & STATUS FILTER BAR */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* SEARCH */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={divisionSearch}
                onChange={(e) => setDivisionSearch(e.target.value)}
                placeholder={`Search ${divisionCategoryTab === 'ATTENDANCE' ? 'attendance divisions' : 'client divisions'}...`}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
              />
              {divisionSearch && (
                <button
                  type="button"
                  onClick={() => setDivisionSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* STATUS FILTER BUTTONS */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {(['ACTIVE', 'INACTIVE', 'ALL'] as const).map(status => {
                const count = divisions.filter(d => 
                  (d.type || 'PO_CLIENT') === divisionCategoryTab && 
                  (status === 'ALL' || (status === 'ACTIVE' ? d.isActive !== false : d.isActive === false))
                ).length;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setDivisionStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                      divisionStatusFilter === status 
                        ? (status === 'ACTIVE' 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : status === 'INACTIVE' 
                              ? 'bg-rose-600 text-white shadow-xs' 
                              : 'bg-[#1e3a8a] text-white shadow-xs')
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{status === 'ACTIVE' ? 'Active' : status === 'INACTIVE' ? 'Inactive' : 'All'}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      divisionStatusFilter === status ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DIVISIONS GRID */}
          {(() => {
            const filteredDivs = divisions.filter(d => {
              const matchesType = (d.type || 'PO_CLIENT') === divisionCategoryTab;
              const matchesStatus = divisionStatusFilter === 'ALL' || (divisionStatusFilter === 'ACTIVE' ? d.isActive !== false : d.isActive === false);
              const matchesSearch = !divisionSearch.trim() || d.name.toLowerCase().includes(divisionSearch.trim().toLowerCase());
              return matchesType && matchesStatus && matchesSearch;
            });

            if (filteredDivs.length === 0) {
              return (
                <div className="p-12 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">No Divisions Found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {divisionSearch 
                      ? `No ${divisionCategoryTab === 'ATTENDANCE' ? 'attendance' : 'PO'} divisions match "${divisionSearch}".`
                      : `No ${divisionStatusFilter !== 'ALL' ? divisionStatusFilter.toLowerCase() + ' ' : ''}${divisionCategoryTab === 'ATTENDANCE' ? 'attendance divisions' : 'client divisions'} registered yet.`}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDivs.map((d) => {
                  const isActive = d.isActive !== false;
                  return (
                    <div 
                      key={d.id} 
                      className={`p-4 bg-white border rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition-all ${
                        isActive 
                          ? 'border-slate-200 hover:border-slate-300' 
                          : 'border-rose-200 bg-rose-50/20 opacity-80'
                      }`}
                    >
                      {/* CARD TOP HEADER */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-bold text-sm leading-tight ${isActive ? 'text-slate-800' : 'text-slate-500 line-through'}`}>
                            {d.name}
                          </h4>
                          {/* STATUS BADGE */}
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {/* METRIC BADGE */}
                        <div className="mt-3">
                          {d.type === 'ATTENDANCE' ? (
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                              <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span>{d._count?.workers || 0} Registered Workers</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                              <Package className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>{d._count?.purchaseOrders || 0} Purchase Orders</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CARD FOOTER ACTIONS */}
                      {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleToggleDivisionActive(d.id, d.name, isActive)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all ${
                              isActive 
                                ? 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-200' 
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={isActive ? 'Mark as Inactive' : 'Activate Division'}
                          >
                            <Power className="w-3 h-3" />
                            <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingDivision(d);
                                setEditDivisionName(d.name);
                                setEditDivisionType(d.type || 'PO_CLIENT');
                                setEditDivisionActive(d.isActive !== false);
                                clearMessages();
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Division"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDivision(d.id, d.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Division"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* EDIT DIVISION MODAL */}
          {editingDivision && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-start sm:items-center justify-center py-4 sm:py-8 p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 flex flex-col my-auto max-h-[92vh]">
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
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Division Type *</label>
                    <select
                      value={editDivisionType}
                      onChange={(e: any) => setEditDivisionType(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-medium bg-white"
                    >
                      <option value="ATTENDANCE">Attendance Division</option>
                      <option value="PO_CLIENT">PO Division / Client</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status *</label>
                    <select
                      value={editDivisionActive ? 'ACTIVE' : 'INACTIVE'}
                      onChange={(e) => setEditDivisionActive(e.target.value === 'ACTIVE')}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-bold bg-white"
                    >
                      <option value="ACTIVE">🟢 ACTIVE (Shown in dropdowns)</option>
                      <option value="INACTIVE">🔴 INACTIVE (Hidden from new entries)</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
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
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Workers Roster Registry</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage worker profiles, wages, statutory IDs, and active employment status.
              </p>
            </div>
            {currentUserRole !== 'SUPERVISOR' && (
              <button
                onClick={() => { setShowAddWorkerForm(!showAddWorkerForm); setEditingWorker(null); }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] hover:opacity-90 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <Users className="w-4 h-4" /> {showAddWorkerForm ? 'Hide Registry Form' : '+ Register Worker'}
              </button>
            )}
          </div>

          {/* SEARCH & STATUS FILTER BAR */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* SEARCH INPUT */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
                placeholder="Search by worker name, ID, father, designation, division, phone..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] transition-all placeholder:text-slate-400"
              />
              {workerSearch && (
                <button
                  type="button"
                  onClick={() => setWorkerSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  title="Clear Search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* STATUS PILLS */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="font-bold text-slate-600 mr-1 text-[11px] uppercase tracking-wider hidden lg:inline">Status:</span>
              {(['ACTIVE', 'INACTIVE', 'ALL'] as const).map(status => {
                const count = status === 'ACTIVE' 
                  ? workers.filter(w => w.isActive !== false).length 
                  : status === 'INACTIVE' 
                  ? workers.filter(w => w.isActive === false).length 
                  : workers.length;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setWorkerStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 ${
                      workerStatusFilter === status 
                        ? (status === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-xs' : status === 'INACTIVE' ? 'bg-rose-600 text-white shadow-xs' : 'bg-[#1e3a8a] text-white shadow-xs')
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <span>{status === 'ACTIVE' ? '🟢 Active' : status === 'INACTIVE' ? '🔴 Inactive' : '📋 All'}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      workerStatusFilter === status ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {showAddWorkerForm && (
            <form onSubmit={handleCreateWorker} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-[#1e3a8a] uppercase">Register Worker details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Worker ID / Badge No *</label>
                  <input
                    type="text"
                    required
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    placeholder="e.g. SKC-W-104"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
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
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={workerFatherName}
                    onChange={(e) => setWorkerFatherName(e.target.value)}
                    placeholder="Father's name"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation / Trade</label>
                  <input
                    type="text"
                    value={workerDesignation}
                    onChange={(e) => setWorkerDesignation(e.target.value)}
                    placeholder="e.g. Mason, Welder, Fitter, Helper"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={workerMobile}
                    onChange={(e) => setWorkerMobile(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none font-mono"
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
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Daily Allowance (Rs)</label>
                  <input
                    type="number"
                    value={dailyAllowance}
                    onChange={(e) => setDailyAllowance(e.target.value)}
                    placeholder="Allowance per day (e.g. 565)"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Extra Amount (Rs)</label>
                  <input
                    type="number"
                    value={workerExtra}
                    onChange={(e) => setWorkerExtra(e.target.value)}
                    placeholder="e.g. 3000 (Added to Monthly Wage)"
                    className="w-full p-2 border border-indigo-300 bg-indigo-50/30 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono font-bold"
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
                  <label className="block font-semibold text-slate-700 mb-1">Advance Taken Date</label>
                  <DatePickerDMY
                    value={advanceTakenDate}
                    onChange={(val) => setAdvanceTakenDate(val)}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Advance Purpose / Reason</label>
                  <input
                    type="text"
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                    placeholder="e.g. Festival Advance, Medical, Festival Bonus"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Return Date</label>
                  <DatePickerDMY
                    value={advanceReturnDate}
                    onChange={(val) => setAdvanceReturnDate(val)}
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
                    placeholder="e.g. 200 (or 0)"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
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
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Division *</label>
                  <select
                    required
                    value={workerDivisionId}
                    onChange={(e) => setWorkerDivisionId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none font-semibold bg-white"
                  >
                    <option value="">-- Choose Division --</option>
                    {divisions.filter(d => (d.type || 'PO_CLIENT') === 'ATTENDANCE' && d.isActive !== false).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Status *</label>
                  <select
                    value={workerActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setWorkerActive(e.target.value === 'ACTIVE')}
                    className={`w-full p-2 border rounded focus:ring-1 outline-none font-bold text-xs ${
                      workerActive ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    <option value="ACTIVE">🟢 Active (Employed)</option>
                    <option value="INACTIVE">🔴 Inactive (Left Company)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Place of Work</label>
                  <input
                    type="text"
                    value={workerPlaceOfWork}
                    onChange={(e) => setWorkerPlaceOfWork(e.target.value)}
                    placeholder="e.g. UNIT5 TO 8 COMPRESSOR TURBINE"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nature of Work</label>
                  <input
                    type="text"
                    value={workerNatureOfWork}
                    onChange={(e) => setWorkerNatureOfWork(e.target.value)}
                    placeholder="e.g. MAINTENANCE, PIPELINE"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={workerPfNumber}
                    onChange={(e) => setWorkerPfNumber(e.target.value)}
                    placeholder="e.g. Canara Bank, SBI, HDFC"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ESI Employee Code</label>
                  <input
                    type="text"
                    value={workerEsiNumber}
                    onChange={(e) => setWorkerEsiNumber(e.target.value)}
                    placeholder="e.g. 71000088340001099"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UAN No</label>
                  <input
                    type="text"
                    value={workerUanNumber}
                    onChange={(e) => setWorkerUanNumber(e.target.value)}
                    placeholder="e.g. 100493430949"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Account No</label>
                  <input
                    type="text"
                    value={workerBankAcc}
                    onChange={(e) => setWorkerBankAcc(e.target.value)}
                    placeholder="e.g. 06222200019793"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank IFSC Code</label>
                  <input
                    type="text"
                    value={workerIfsc}
                    onChange={(e) => setWorkerIfsc(e.target.value)}
                    placeholder="e.g. CNRB0010622"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] outline-none font-mono uppercase"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs shadow disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Register Worker'}
                </button>
              </div>
            </form>
          )}

          {/* EDIT WORKER REGISTRY MODAL (DESKTOP ONLY) */}
          {editingWorker && (
            <div className="hidden md:flex fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] items-center justify-center p-4 overflow-y-auto min-h-screen py-8">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col my-auto max-h-[90vh] overflow-hidden animate-fadeIn">
                <div className="bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-4 sm:p-5 font-bold flex justify-between items-center shrink-0">
                  <span className="text-base sm:text-lg">Edit Worker: {editingWorker.workerId}</span>
                  <button onClick={() => setEditingWorker(null)} className="hover:text-white/80 p-1 text-white text-lg font-bold">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleUpdateWorker} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto pr-2">
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
                          {divisions.filter(d => (d.type || 'PO_CLIENT') === 'ATTENDANCE' && (d.isActive !== false || d.id === editWorkerDivisionId)).map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Worker ID *</label>
                          <input
                            type="text"
                            required
                            value={editWorkerId}
                            onChange={(e) => setEditWorkerId(e.target.value.toUpperCase())}
                            placeholder="e.g. SKC-001"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono font-bold uppercase"
                          />
                        </div>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Place of Work</label>
                          <input
                            type="text"
                            value={editPlaceOfWork}
                            onChange={(e) => setEditPlaceOfWork(e.target.value)}
                            placeholder="e.g. UNIT5 TO 8 COMPRESSOR TURBINE"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Nature of Work</label>
                          <input
                            type="text"
                            value={editNatureOfWork}
                            onChange={(e) => setEditNatureOfWork(e.target.value)}
                            placeholder="e.g. MAINTENANCE, PIPELINE"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-medium"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Mobile Number *</label>
                          <input
                            type="text"
                            required
                            maxLength={10}
                            value={editWorkerMobile}
                            onChange={(e) => setEditWorkerMobile(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Employment Status *</label>
                          <select
                            value={editWorkerActive ? 'ACTIVE' : 'INACTIVE'}
                            onChange={(e) => setEditWorkerActive(e.target.value === 'ACTIVE')}
                            className={`w-full p-2 border rounded focus:ring-1 outline-none font-bold text-xs ${
                              editWorkerActive ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
                            }`}
                          >
                            <option value="ACTIVE">🟢 Active (Employed)</option>
                            <option value="INACTIVE">🔴 Inactive (Left Company)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          <label className="block font-semibold text-indigo-950 mb-1">Extra (₹)</label>
                          <input
                            type="number"
                            value={editWorkerExtra}
                            onChange={(e) => setEditWorkerExtra(e.target.value)}
                            placeholder="e.g. 3000"
                            className="w-full p-2 border border-indigo-300 bg-indigo-50/40 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono font-bold text-indigo-950"
                            title="Extra monthly bonus/addition (e.g. 3000)"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">OT Allowance</label>
                          <input
                            type="number"
                            value={editOtAllowance}
                            onChange={(e) => setEditOtAllowance(e.target.value)}
                            placeholder="0"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">OT Rate/Hr *</label>
                          <input
                            type="number"
                            required
                            value={editOtRate}
                            onChange={(e) => setEditOtRate(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono font-bold"
                          />
                        </div>
                      </div>
                      <div>
                          <label className="block font-semibold text-slate-700 mb-1">Division *</label>
                          <select
                            required
                            value={editWorkerDivisionId}
                            onChange={(e) => setEditWorkerDivisionId(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none bg-white font-semibold"
                          >
                            {divisions.filter(d => (d.type || 'PO_CLIENT') === 'ATTENDANCE' && (d.isActive !== false || d.id === editWorkerDivisionId)).map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                      </div>

                      {/* Advance Fields */}
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                        <div className="font-bold text-amber-900 text-xs">Worker Advance Management</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Advance Taken (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={editAdvanceTaken}
                              onChange={(e) => setEditAdvanceTaken(e.target.value)}
                              className="w-full p-2 border border-amber-300 rounded font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Advance Balance (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={editAdvanceBalance}
                              onChange={(e) => setEditAdvanceBalance(e.target.value)}
                              className="w-full p-2 border border-amber-300 rounded font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Advance Taken Date</label>
                            <DatePickerDMY
                              value={editAdvanceTakenDate}
                              onChange={(val) => setEditAdvanceTakenDate(val)}
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Expected Return Date</label>
                            <DatePickerDMY
                              value={editAdvanceReturnDate}
                              onChange={(val) => setEditAdvanceReturnDate(val)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-slate-700 mb-1">Advance Purpose / Reason</label>
                            <input
                              type="text"
                              value={editAdvanceReason}
                              onChange={(e) => setEditAdvanceReason(e.target.value)}
                              placeholder="e.g. Festival Advance, Medical, Home Repair"
                              className="w-full p-2 border border-slate-300 rounded"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Statutory & Banking Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={editPfNumber}
                            onChange={(e) => setEditPfNumber(e.target.value)}
                            placeholder="e.g. Canara Bank, SBI, HDFC"
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-medium"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">ESI Employee Code</label>
                          <input
                            type="text"
                            value={editEsiNumber}
                            onChange={(e) => setEditEsiNumber(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">UAN No</label>
                          <input
                            type="text"
                            value={editUanNumber}
                            onChange={(e) => setEditUanNumber(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Bank Account No</label>
                          <input
                            type="text"
                            value={editBankAcc}
                            onChange={(e) => setEditBankAcc(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-700 mb-1">Bank IFSC Code</label>
                          <input
                            type="text"
                            value={editIfsc}
                            onChange={(e) => setEditIfsc(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono uppercase"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex justify-end gap-2 pt-3 border-t shrink-0 sticky bottom-0 bg-white">
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
                const filtered = workers.filter(w => {
                  if (workerStatusFilter === 'ACTIVE' && w.isActive === false) return false;
                  if (workerStatusFilter === 'INACTIVE' && w.isActive !== false) return false;
                  if (workerSearch.trim()) {
                    const q = workerSearch.toLowerCase().trim();
                    const matches =
                      (w.fullName && w.fullName.toLowerCase().includes(q)) ||
                      (w.workerId && w.workerId.toLowerCase().includes(q)) ||
                      (w.fatherName && w.fatherName.toLowerCase().includes(q)) ||
                      (w.designation && w.designation.toLowerCase().includes(q)) ||
                      (w.mobileNumber && w.mobileNumber.toLowerCase().includes(q)) ||
                      (w.division?.name && w.division.name.toLowerCase().includes(q)) ||
                      (w.placeOfWork && w.placeOfWork.toLowerCase().includes(q)) ||
                      (w.natureOfWork && w.natureOfWork.toLowerCase().includes(q)) ||
                      (w.bankAccountNumber && w.bankAccountNumber.toLowerCase().includes(q)) ||
                      (w.uanNumber && w.uanNumber.toLowerCase().includes(q)) ||
                      (w.pfNumber && w.pfNumber.toLowerCase().includes(q)) ||
                      (w.esiNumber && w.esiNumber.toLowerCase().includes(q));
                    if (!matches) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                      {workerSearch ? `No workers found matching "${workerSearch}".` : `No ${workerStatusFilter === 'ACTIVE' ? 'active' : workerStatusFilter === 'INACTIVE' ? 'inactive' : ''} workers found.`}
                    </div>
                  );
                }

                const sorted = [...filtered].sort((a, b) => {
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
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold text-[10px] border border-blue-200">
                          {w.division?.name || 'General'}
                        </span>
                        {w.isActive === false ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                            Inactive
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50/60 p-2 rounded-lg border border-slate-100 font-mono">
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase">Daily Wage</span>
                        <span className="font-bold text-slate-800">{formatIndianCurrency(w.dailyWage)}/d</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase">Extra</span>
                        <span className="font-bold text-indigo-800">+{formatIndianCurrency(w.extraAmount || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase">Allowance</span>
                        <span className="font-bold text-emerald-700">+{formatIndianCurrency(w.dailyAllowance || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[9px] block uppercase">OT Allowance</span>
                        <span className="font-bold text-indigo-700">+{formatIndianCurrency(w.otAllowance || 0)}</span>
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
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            onClick={() => handleToggleWorkerActive(w.id, w.fullName, w.isActive !== false)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                              w.isActive === false
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                            }`}
                            title={w.isActive === false ? 'Activate Worker' : 'Deactivate Worker (Left Company)'}
                          >
                            {w.isActive === false ? 'Activate' : 'Deactivate'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingWorker(w);
                            setEditWorkerActive(w.isActive !== false);
                            setEditWorkerId(w.workerId || '');
                            setEditWorkerName(w.fullName);
                            setEditFatherName(w.fatherName || '');
                            setEditDesignation(w.designation || '');
                            setEditWorkerMobile(w.mobileNumber.startsWith('+91') ? w.mobileNumber.slice(3) : w.mobileNumber);
                            setEditWage(w.dailyWage.toString());
                            setEditDailyAllowance((w.dailyAllowance || 0).toString());
                            setEditWorkerExtra((w.extraAmount || 0).toString());
                            setEditAdvanceTaken((w.advanceTaken || w.advanceBalance || 0).toString());
                            setEditAdvanceTakenDate(w.advanceTakenDate ? w.advanceTakenDate.split('T')[0] : '');
                            setEditAdvanceReason(w.advanceReason || '');
                            setEditAdvanceReturnDate(w.advanceReturnDate ? w.advanceReturnDate.split('T')[0] : '');
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

                    {/* INLINE COMPLETE EDIT FORM FOR MOBILE VIEW (ALL 22 FIELDS) */}
                    {editingWorker?.id === w.id && (
                      <div className="mt-3 pt-3 border-t-2 border-[#1e3a8a]/20 bg-blue-50/40 p-3 rounded-xl space-y-3 md:hidden animate-fadeIn text-slate-800">
                        <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                          <span className="font-black text-xs text-[#1e3a8a] flex items-center gap-1.5">
                            <Edit className="w-3.5 h-3.5" /> Full Worker Edit: <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">{w.workerId}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingWorker(null)}
                            className="text-slate-600 hover:text-slate-800 text-xs font-bold px-2.5 py-1 rounded bg-white border border-slate-300 shadow-2xs"
                          >
                            ✕ Close
                          </button>
                        </div>
                        {currentUserRole === 'SUPERVISOR' ? (
                          <div className="space-y-2.5">
                            <div className="p-2.5 bg-blue-100/70 border border-blue-200 rounded-lg text-[11px] font-semibold text-blue-950">
                              Supervisor Access: Reassign worker division.
                            </div>
                            <div>
                              <label className="block font-bold text-slate-700 text-xs mb-1">Assigned Division *</label>
                              <select
                                value={editWorkerDivisionId}
                                onChange={(e) => setEditWorkerDivisionId(e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold text-[#1e3a8a]"
                              >
                                {divisions.filter(d => (d.type || 'PO_CLIENT') === 'ATTENDANCE' && (d.isActive !== false || d.id === editWorkerDivisionId)).map((d) => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={handleUpdateWorker}
                              className="w-full py-2.5 bg-[#1e3a8a] text-white rounded-lg font-bold text-xs shadow hover:bg-[#172554] active:scale-98 transition-all"
                            >
                              Save Division Changes
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 text-xs">
                            {/* SECTION 1: PERSONAL & WORK DETAILS */}
                            <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                              <div className="font-bold text-[11px] text-[#1e3a8a] border-b border-slate-100 pb-1">1. Personal & Role Info</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Worker ID *</label>
                                  <input
                                    type="text"
                                    value={editWorkerId}
                                    onChange={(e) => setEditWorkerId(e.target.value.toUpperCase())}
                                    className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold uppercase text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Full Name *</label>
                                  <input
                                    type="text"
                                    value={editWorkerName}
                                    onChange={(e) => setEditWorkerName(e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Father's Name</label>
                                  <input
                                    type="text"
                                    value={editFatherName}
                                    onChange={(e) => setEditFatherName(e.target.value)}
                                    placeholder="Father's name"
                                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Designation / Trade</label>
                                  <input
                                    type="text"
                                    value={editDesignation}
                                    onChange={(e) => setEditDesignation(e.target.value)}
                                    placeholder="e.g. Mason, Welder"
                                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Place of Work</label>
                                  <input
                                    type="text"
                                    value={editPlaceOfWork}
                                    onChange={(e) => setEditPlaceOfWork(e.target.value)}
                                    placeholder="e.g. Turbine Hall"
                                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Nature of Work</label>
                                  <input
                                    type="text"
                                    value={editNatureOfWork}
                                    onChange={(e) => setEditNatureOfWork(e.target.value)}
                                    placeholder="e.g. Maintenance"
                                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Mobile Number *</label>
                                  <input
                                    type="text"
                                    maxLength={10}
                                    value={editWorkerMobile}
                                    onChange={(e) => setEditWorkerMobile(e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 rounded font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Employment Status *</label>
                                  <select
                                    value={editWorkerActive ? 'ACTIVE' : 'INACTIVE'}
                                    onChange={(e) => setEditWorkerActive(e.target.value === 'ACTIVE')}
                                    className={`w-full p-1.5 border rounded font-bold text-xs ${
                                      editWorkerActive ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
                                    }`}
                                  >
                                    <option value="ACTIVE">🟢 Active</option>
                                    <option value="INACTIVE">🔴 Inactive</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Assigned Division *</label>
                                <select
                                  value={editWorkerDivisionId}
                                  onChange={(e) => setEditWorkerDivisionId(e.target.value)}
                                  className="w-full p-1.5 border border-slate-300 rounded bg-white font-semibold text-xs text-[#1e3a8a]"
                                >
                                  {divisions.filter(d => (d.type || 'PO_CLIENT') === 'ATTENDANCE' && (d.isActive !== false || d.id === editWorkerDivisionId)).map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* SECTION 2: WAGES & OVERTIME RATES */}
                            <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                              <div className="font-bold text-[11px] text-emerald-800 border-b border-slate-100 pb-1">2. Wage, Allowance & OT Rates</div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Daily Wage (₹) *</label>
                                  <input
                                    type="number"
                                    value={editWage}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditWage(val);
                                      if (val && !editOtRate) {
                                        const calc = Math.round(parseFloat(val) / 8);
                                        setEditOtRate(isNaN(calc) ? '' : calc.toString());
                                      }
                                    }}
                                    className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Daily Allowance (₹)</label>
                                  <input
                                    type="number"
                                    value={editDailyAllowance}
                                    onChange={(e) => setEditDailyAllowance(e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 rounded font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-indigo-950 text-[11px] mb-0.5">Extra (₹)</label>
                                  <input
                                    type="number"
                                    value={editWorkerExtra}
                                    onChange={(e) => setEditWorkerExtra(e.target.value)}
                                    placeholder="e.g. 3000"
                                    className="w-full p-1.5 border border-indigo-300 bg-indigo-50/40 rounded font-mono font-bold text-indigo-900 text-xs"
                                    title="Extra bonus/addition to monthly wage"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">OT Allowance (₹)</label>
                                  <input
                                    type="number"
                                    value={editOtAllowance}
                                    onChange={(e) => setEditOtAllowance(e.target.value)}
                                    placeholder="0"
                                    className="w-full p-1.5 border border-slate-300 rounded font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">OT Rate/Hr (₹) *</label>
                                  <input
                                    type="number"
                                    value={editOtRate}
                                    onChange={(e) => setEditOtRate(e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold text-xs"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* SECTION 3: ADVANCES & RECOVERY */}
                            <div className="space-y-2 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                              <div className="font-bold text-[11px] text-amber-900 border-b border-amber-200 pb-1">3. Worker Advance Management</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Advance Taken (₹)</label>
                                  <input
                                    type="number"
                                    value={editAdvanceTaken}
                                    onChange={(e) => setEditAdvanceTaken(e.target.value)}
                                    className="w-full p-1.5 border border-amber-300 bg-white rounded font-mono text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Advance Balance (₹)</label>
                                  <input
                                    type="number"
                                    value={editAdvanceBalance}
                                    onChange={(e) => setEditAdvanceBalance(e.target.value)}
                                    className="w-full p-1.5 border border-amber-300 bg-white rounded font-mono font-bold text-xs text-amber-900"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Advance Taken Date</label>
                                  <DatePickerDMY
                                    value={editAdvanceTakenDate}
                                    onChange={(val) => setEditAdvanceTakenDate(val)}
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Expected Return Date</label>
                                  <DatePickerDMY
                                    value={editAdvanceReturnDate}
                                    onChange={(val) => setEditAdvanceReturnDate(val)}
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Advance Purpose / Reason</label>
                                <input
                                  type="text"
                                  value={editAdvanceReason}
                                  onChange={(e) => setEditAdvanceReason(e.target.value)}
                                  placeholder="e.g. Festival Advance, Medical"
                                  className="w-full p-1.5 border border-slate-300 bg-white rounded text-xs"
                                />
                              </div>
                            </div>

                            {/* SECTION 4: STATUTORY & BANKING */}
                            <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                              <div className="font-bold text-[11px] text-indigo-900 border-b border-slate-100 pb-1">4. Statutory & Banking Details</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Bank Name</label>
                                  <input
                                    type="text"
                                    value={editPfNumber}
                                    onChange={(e) => setEditPfNumber(e.target.value)}
                                    placeholder="e.g. SBI, Canara"
                                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">ESI Employee Code</label>
                                  <input
                                    type="text"
                                    value={editEsiNumber}
                                    onChange={(e) => setEditEsiNumber(e.target.value)}
                                    placeholder="ESI Code"
                                    className="w-full p-1.5 border border-slate-300 rounded font-mono text-xs"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">UAN No</label>
                                  <input
                                    type="text"
                                    value={editUanNumber}
                                    onChange={(e) => setEditUanNumber(e.target.value)}
                                    placeholder="UAN Number"
                                    className="w-full p-1.5 border border-slate-300 rounded font-mono text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Bank Account No</label>
                                  <input
                                    type="text"
                                    value={editBankAcc}
                                    onChange={(e) => setEditBankAcc(e.target.value)}
                                    placeholder="Account Number"
                                    className="w-full p-1.5 border border-slate-300 rounded font-mono text-xs"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block font-semibold text-slate-700 text-[11px] mb-0.5">Bank IFSC Code</label>
                                <input
                                  type="text"
                                  value={editIfsc}
                                  onChange={(e) => setEditIfsc(e.target.value)}
                                  placeholder="IFSC Code"
                                  className="w-full p-1.5 border border-slate-300 rounded font-mono uppercase text-xs"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={handleUpdateWorker}
                                className="flex-1 py-2.5 bg-[#1e3a8a] text-white rounded-lg font-bold text-xs shadow hover:bg-[#172554] active:scale-98 transition-all"
                              >
                                Save All Changes
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingWorker(null)}
                                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs border border-slate-300 hover:bg-slate-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ));
              })()
            )}
          </div>

          {/* 💻 DESKTOP/TABLET TABLE */}
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
                  <th>Status</th>
                  {currentUserRole !== 'SUPERVISOR' && (
                    <>
                      <th>Daily Wage</th>
                      <th className="bg-indigo-50 text-indigo-900 font-bold">Extra (₹)</th>
                      <th>Daily Allowance</th>
                      <th>OT Allowance</th>
                      <th className="bg-amber-50 text-amber-900">Advance Taken</th>
                      <th className="bg-amber-100 text-amber-950 font-bold">Advance Balance</th>
                      <th>OT Hourly Rate</th>
                    </>
                  )}
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = workers.filter(w => {
                    if (workerStatusFilter === 'ACTIVE' && w.isActive === false) return false;
                    if (workerStatusFilter === 'INACTIVE' && w.isActive !== false) return false;
                    if (workerSearch.trim()) {
                      const q = workerSearch.toLowerCase().trim();
                      const matches =
                        (w.fullName && w.fullName.toLowerCase().includes(q)) ||
                        (w.workerId && w.workerId.toLowerCase().includes(q)) ||
                        (w.fatherName && w.fatherName.toLowerCase().includes(q)) ||
                        (w.designation && w.designation.toLowerCase().includes(q)) ||
                        (w.mobileNumber && w.mobileNumber.toLowerCase().includes(q)) ||
                        (w.division?.name && w.division.name.toLowerCase().includes(q)) ||
                        (w.placeOfWork && w.placeOfWork.toLowerCase().includes(q)) ||
                        (w.natureOfWork && w.natureOfWork.toLowerCase().includes(q)) ||
                        (w.bankAccountNumber && w.bankAccountNumber.toLowerCase().includes(q)) ||
                        (w.uanNumber && w.uanNumber.toLowerCase().includes(q)) ||
                        (w.pfNumber && w.pfNumber.toLowerCase().includes(q)) ||
                        (w.esiNumber && w.esiNumber.toLowerCase().includes(q));
                      if (!matches) return false;
                    }
                    return true;
                  });

                  const sortedWorkers = [...filtered].sort((a, b) => {
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
                        <td colSpan={currentUserRole !== 'SUPERVISOR' ? 14 : 9} className="p-8 text-center text-slate-400 font-medium text-xs">
                          {workerSearch ? `No workers found matching "${workerSearch}".` : `No ${workerStatusFilter === 'ACTIVE' ? 'active' : workerStatusFilter === 'INACTIVE' ? 'inactive' : ''} workers registered yet.`}
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
                    <td>
                      {w.isActive === false ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold">
                          🔴 Inactive
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          🟢 Active
                        </span>
                      )}
                    </td>
                    {currentUserRole !== 'SUPERVISOR' && (
                      <>
                        <td className="font-mono font-bold text-slate-700">{formatIndianCurrency(w.dailyWage)}</td>
                        <td className="font-mono text-xs bg-indigo-50/40 font-bold text-indigo-900">
                          {Number(w.extraAmount) > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                              +{formatIndianCurrency(w.extraAmount)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">₹0</span>
                          )}
                        </td>
                        <td className="font-mono font-bold text-emerald-700">{formatIndianCurrency(w.dailyAllowance || 0)}</td>
                        <td className="font-mono text-indigo-700">{formatIndianCurrency(w.otAllowance || 0)}</td>
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
                        <td className="font-mono text-slate-700">{formatIndianCurrency(w.otHourlyRate)}/hr</td>
                      </>
                    )}
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Owner or Manager can quickly toggle Active / Inactive status */}
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            onClick={() => handleToggleWorkerActive(w.id, w.fullName, w.isActive !== false)}
                            className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                              w.isActive === false
                                ? 'text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                : 'text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-200'
                            }`}
                            title={w.isActive === false ? 'Reactivate Worker' : 'Deactivate Worker (Left Company)'}
                          >
                            {w.isActive === false ? 'Activate' : 'Deactivate'}
                          </button>
                        )}
                        {/* Owner, Manager or Supervisor can edit (Supervisor can only change division) */}
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER' || currentUserRole === 'SUPERVISOR') && (
                          <button
                            onClick={() => {
                              setEditingWorker(w);
                              setEditWorkerActive(w.isActive !== false);
                              setEditWorkerId(w.workerId || '');
                              setEditWorkerName(w.fullName);
                              setEditFatherName(w.fatherName || '');
                              setEditDesignation(w.designation || '');
                              setEditWorkerMobile(w.mobileNumber.startsWith('+91') ? w.mobileNumber.slice(3) : w.mobileNumber);
                              setEditWage(w.dailyWage.toString());
                              setEditDailyAllowance((w.dailyAllowance || 0).toString());
                              setEditAdvanceTaken((w.advanceTaken || w.advanceBalance || 0).toString());
                              setEditAdvanceTakenDate(w.advanceTakenDate ? w.advanceTakenDate.split('T')[0] : '');
                              setEditAdvanceReason(w.advanceReason || '');
                              setEditAdvanceReturnDate(w.advanceReturnDate ? w.advanceReturnDate.split('T')[0] : '');
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
            <div className="fixed inset-0 bg-black/60 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-6 w-full max-w-lg max-h-[92vh] flex flex-col animate-fadeIn">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    Edit Purchase Order: <span className="font-mono text-[#1e3a8a]">{editingPO.poNumber}</span>
                  </h3>
                  <button onClick={() => setEditingPO(null)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
                </div>
                <form onSubmit={handleUpdatePO} className="space-y-3.5 text-xs overflow-y-auto pr-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PO Number *</label>
                    <input
                      type="text"
                      required
                      value={editPONumber}
                      onChange={(e) => setEditPONumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Division *</label>
                    <select
                      required
                      value={editPODivisionId}
                      onChange={(e) => setEditPODivisionId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white"
                    >
                      <option value="">-- Choose Division --</option>
                      {divisions.filter(d => (d.type || 'PO_CLIENT') === 'PO_CLIENT' && (d.isActive !== false || d.id === editPODivisionId)).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                    <DatePickerDMY
                      required
                      value={editPODate}
                      onChange={(val) => setEditPODate(val)}
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
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status *</label>
                    <select
                      value={editPOActive ? 'ACTIVE' : 'INACTIVE'}
                      onChange={(e) => setEditPOActive(e.target.value === 'ACTIVE')}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-bold bg-white"
                    >
                      <option value="ACTIVE">🟢 ACTIVE (Shown in dropdowns)</option>
                      <option value="INACTIVE">🔴 INACTIVE (Hidden from new entries)</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
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
                      className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg shadow disabled:opacity-50"
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
                  {divisions.filter(d => (d.type || 'PO_CLIENT') === 'PO_CLIENT' && d.isActive !== false).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                <DatePickerDMY
                  required
                  value={poDate}
                  onChange={(val) => setPoDate(val)}
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

          {/* PO ACTIVE / INACTIVE FILTER BAR */}
          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 mr-1 text-[11px] uppercase tracking-wider">Status:</span>
              {(['ACTIVE', 'INACTIVE', 'ALL'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPoStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    poStatusFilter === status 
                      ? (status === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-xs' : status === 'INACTIVE' ? 'bg-rose-600 text-white shadow-xs' : 'bg-[#1e3a8a] text-white shadow-xs')
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {status === 'ACTIVE' ? '🟢 Active POs' : status === 'INACTIVE' ? '🔴 Inactive POs' : '📋 All POs'} (
                    {purchaseOrders.filter(p => (poStatusFilter === 'ALL' || (status === 'ACTIVE' ? p.isActive !== false : p.isActive === false))).length}
                  )
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs excel-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Division / Client</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Added By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredPOs = purchaseOrders.filter(p => 
                    poStatusFilter === 'ALL' || (poStatusFilter === 'ACTIVE' ? p.isActive !== false : p.isActive === false)
                  );
                  if (filteredPOs.length === 0) {
                    return <tr><td colSpan={7} className="p-6 text-center text-slate-400">No {poStatusFilter !== 'ALL' ? poStatusFilter.toLowerCase() + ' ' : ''}purchase orders found.</td></tr>;
                  }
                  return filteredPOs.map((po) => {
                    const isPoActive = po.isActive !== false;
                    return (
                      <tr key={po.id} className={!isPoActive ? 'bg-rose-50/30' : ''}>
                        <td className={`font-bold font-mono ${isPoActive ? 'text-[#667eea]' : 'text-slate-400 line-through'}`}>{po.poNumber}</td>
                        <td className="font-semibold text-slate-700">{po.division?.name || '-'}</td>
                        <td>{new Date(po.date).toLocaleDateString('en-GB')}</td>
                        <td className="font-mono font-bold text-slate-800">{formatIndianCurrency(po.poAmount ?? po.amount ?? 0)}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            isPoActive ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}>
                            {isPoActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td>{po.addedBy?.fullName || '-'}</td>
                        <td>
                          {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTogglePoActive(po.id, po.poNumber, isPoActive)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                  isPoActive 
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                                title={isPoActive ? 'Deactivate PO' : 'Activate PO'}
                              >
                                {isPoActive ? 'Deactivate' : 'Activate'}
                              </button>
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
                    );
                  });
                })()}
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
                  <DatePickerDMY
                    required
                    value={holidayDate}
                    onChange={(val) => setHolidayDate(val)}
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
                    <option value="GOVT_HOLIDAY">Govt Holiday</option>
                    <option value="FESTIVAL_HOLIDAY">Festival Holiday</option>
                    <option value="COMPANY_HOLIDAY">Company Holiday</option>
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
    </div>
  );
};
