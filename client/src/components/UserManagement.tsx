import React, { useState, useEffect } from 'react';
import api from '../api';
import { UserPlus, UserCheck, Shield, Trash2, AlertCircle, Users, FolderPlus, Edit } from 'lucide-react';

interface UserManagementProps {
  currentUserRole: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUserRole }) => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'divisions' | 'workers'>(
    currentUserRole === 'SUPERVISOR' ? 'divisions' : 'accounts'
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ACCOUNTS STATE ---
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STAFF' | 'MANAGER' | 'SUPERVISOR'>('STAFF');

  // Edit account helper
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountMobile, setEditAccountMobile] = useState('');
  const [editAccountPassword, setEditAccountPassword] = useState('');
  const [editAccountRole, setEditAccountRole] = useState<'STAFF' | 'MANAGER' | 'SUPERVISOR'>('STAFF');

  // --- DIVISIONS STATE ---
  const [divisions, setDivisions] = useState<any[]>([]);
  const [divisionName, setDivisionName] = useState('');

  // --- WORKERS STATE ---
  const [workers, setWorkers] = useState<any[]>([]);
  const [showAddWorkerForm, setShowAddWorkerForm] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [workerName, setWorkerName] = useState('');
  const [workerMobile, setWorkerMobile] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [otHourlyRate, setOtHourlyRate] = useState('');
  const [workerDivisionId, setWorkerDivisionId] = useState('');

  // Edit worker wage helper
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editWorkerMobile, setEditWorkerMobile] = useState('');
  const [editWage, setEditWage] = useState('');
  const [editOtRate, setEditOtRate] = useState('');
  const [editWorkerDivisionId, setEditWorkerDivisionId] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load user list');
    }
  };

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions');
      setDivisions(res.data.divisions || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load divisions');
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers');
      setWorkers(res.data.workers || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load workers');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDivisions();
    fetchWorkers();
  }, []);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // --- ACTIONS: ACCOUNTS ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    if (!userMobile || !/^\d{10}$/.test(userMobile.trim())) {
      setError('Mobile number is mandatory and must be a valid 10-digit number!');
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

      setSuccess(`User Account '${username}' created successfully!`);
      setUsername('');
      setFullName('');
      setUserMobile('');
      setPassword('');
      setShowAddUserForm(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user account');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!editingAccount) return;

    if (!editAccountMobile || !/^\d{10}$/.test(editAccountMobile.trim())) {
      setError('Mobile number must be a valid 10-digit number!');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/users/${editingAccount.id}`, {
        fullName: editAccountName.trim(),
        mobileNumber: editAccountMobile.trim(),
        role: editAccountRole,
        password: editAccountPassword.trim() || undefined,
      });

      setSuccess(`User Account '${editingAccount.username}' updated successfully!`);
      setEditingAccount(null);
      setEditAccountPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user account details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Are you sure you want to delete user '${user.username}'?`)) return;
    clearMessages();

    try {
      await api.delete(`/users/${user.id}`);
      setSuccess(`User account '${user.username}' deleted successfully.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  // --- ACTIONS: DIVISIONS ---
  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!divisionName.trim()) return;

    try {
      await api.post('/divisions', { name: divisionName.trim() });
      setSuccess(`Division '${divisionName}' registered successfully!`);
      setDivisionName('');
      fetchDivisions();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create division');
    }
  };

  const handleDeleteDivision = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete division '${name}'? This will delete all workers in it.`)) return;
    clearMessages();

    try {
      await api.delete(`/divisions/${id}`);
      setSuccess(`Division '${name}' deleted successfully.`);
      fetchDivisions();
      fetchWorkers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete division');
    }
  };

  // --- ACTIONS: WORKERS ---
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    if (!workerMobile || !/^\d{10}$/.test(workerMobile.trim())) {
      setError('A valid 10-digit Indian mobile number is mandatory!');
      setLoading(false);
      return;
    }

    try {
      await api.post('/workers', {
        workerId: workerId.trim(),
        fullName: workerName.trim(),
        mobileNumber: workerMobile.trim(),
        dailyWage: parseFloat(dailyWage),
        otHourlyRate: otHourlyRate ? parseFloat(otHourlyRate) : parseFloat(dailyWage) / 8,
        divisionId: workerDivisionId,
      });

      setSuccess(`Worker '${workerName}' registered successfully!`);
      setWorkerId('');
      setWorkerName('');
      setWorkerMobile('');
      setDailyWage('');
      setOtHourlyRate('');
      setWorkerDivisionId('');
      setShowAddWorkerForm(false);
      fetchWorkers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register worker');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!editingWorker) return;

    if (!editWorkerMobile || !/^\d{10}$/.test(editWorkerMobile.trim())) {
      setError('A valid 10-digit Indian mobile number is mandatory!');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/workers/${editingWorker.id}`, {
        fullName: editWorkerName.trim(),
        mobileNumber: editWorkerMobile.trim(),
        dailyWage: parseFloat(editWage),
        otHourlyRate: editOtRate ? parseFloat(editOtRate) : parseFloat(editWage) / 8,
        divisionId: editWorkerDivisionId,
      });
      setSuccess(`Worker registry details for '${editWorkerName}' updated successfully!`);
      setEditingWorker(null);
      fetchWorkers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update worker registry details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete worker '${name}'?`)) return;
    clearMessages();

    try {
      await api.delete(`/workers/${id}`);
      setSuccess(`Worker '${name}' removed successfully.`);
      fetchWorkers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete worker');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#667eea]" /> Master Creation & User Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system logins, divisions, and worker registries.
          </p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto scrollbar-none gap-1">
          {currentUserRole !== 'SUPERVISOR' && (
            <button
              onClick={() => { setActiveSubTab('accounts'); clearMessages(); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial text-center ${
                activeSubTab === 'accounts' ? 'bg-[#667eea] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              System Logins
            </button>
          )}
          <button
            onClick={() => { setActiveSubTab('divisions'); clearMessages(); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial text-center ${
              activeSubTab === 'divisions' ? 'bg-[#667eea] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Divisions
          </button>
          <button
            onClick={() => { setActiveSubTab('workers'); clearMessages(); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap flex-1 md:flex-initial text-center ${
              activeSubTab === 'workers' ? 'bg-[#667eea] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Worker Registry
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg text-xs border border-indigo-200 flex items-center gap-2">
          <UserCheck className="w-4 h-4" /> {success}
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
                className="px-3 py-1.5 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <UserPlus className="w-4 h-4" /> {showAddUserForm ? 'Hide Form' : '+ Add New Login'}
              </button>
            )}
          </div>

          {showAddUserForm && (
            <form onSubmit={handleCreateUser} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-[#667eea] uppercase">Create Login Account</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User ID / Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. supervisor1"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
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
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
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
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
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
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold"
                  >
                    <option value="SUPERVISOR">SUPERVISOR (Attendance & Sites)</option>
                    <option value="STAFF">STAFF (Data Entry Inward/Sale only)</option>
                    <option value="MANAGER">MANAGER (Wages & Stocks admin)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#667eea] text-white font-bold rounded-lg text-xs shadow disabled:opacity-50"
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
                            : u.role === 'SUPERVISOR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                    <td>
                      <div className="flex items-center">
                        {currentUserRole === 'OWNER' && u.role !== 'OWNER' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingAccount(u);
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
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded"
                              title="Delete User Login"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white p-5 font-bold flex justify-between items-center rounded-t-2xl">
                  <span className="text-lg">Edit System Account: {editingAccount.username}</span>
                  <button onClick={() => setEditingAccount(null)} className="hover:text-rose-400 p-1 text-white">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleUpdateAccount} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editAccountName}
                      onChange={(e) => setEditAccountName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
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
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Password (Leave blank to keep current)</label>
                    <input
                      type="password"
                      value={editAccountPassword}
                      onChange={(e) => setEditAccountPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                    <select
                      value={editAccountRole}
                      onChange={(e: any) => setEditAccountRole(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
                    >
                      <option value="SUPERVISOR">SUPERVISOR (Attendance & Sites)</option>
                      <option value="STAFF">STAFF (Data Entry Inward/Sale only)</option>
                      <option value="MANAGER">MANAGER (Wages & Stocks admin)</option>
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
                      className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-bold rounded-lg shadow disabled:opacity-50"
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
                  <button
                    onClick={() => handleDeleteDivision(d.id, d.name)}
                    className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB: WORKERS --- */}
      {activeSubTab === 'workers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Workers Roster Registry</h3>
            <button
              onClick={() => { setShowAddWorkerForm(!showAddWorkerForm); setEditingWorker(null); }}
              className="px-3 py-1.5 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow"
            >
              <Users className="w-4 h-4" /> {showAddWorkerForm ? 'Hide Registry Form' : '+ Register Worker'}
            </button>
          </div>

          {showAddWorkerForm && (
            <form onSubmit={handleCreateWorker} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-[#667eea] uppercase">Register Worker details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
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
                    placeholder="Worker name"
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
                    onChange={(e) => setDailyWage(e.target.value)}
                    placeholder="Wage amount per day"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OT Hourly Rate (Rs, Optional)</label>
                  <input
                    type="number"
                    value={otHourlyRate}
                    onChange={(e) => setOtHourlyRate(e.target.value)}
                    placeholder="Leave blank for automatic calculation (Daily Wage / 8)"
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Division *</label>
                  <select
                    required
                    value={workerDivisionId}
                    onChange={(e) => setWorkerDivisionId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold"
                  >
                    <option value="">-- Choose Division --</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
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
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col">
                <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white p-5 font-bold flex justify-between items-center rounded-t-2xl">
                  <span className="text-lg">Edit Worker Details: {editingWorker.workerId}</span>
                  <button onClick={() => setEditingWorker(null)} className="hover:text-rose-400 p-1 text-white">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleUpdateWorker} className="p-6 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editWorkerName}
                      onChange={(e) => setEditWorkerName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mobile Number (Indian Format) *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={editWorkerMobile}
                      onChange={(e) => setEditWorkerMobile(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Daily Wage (Rs) *</label>
                      <input
                        type="number"
                        required
                        value={editWage}
                        onChange={(e) => setEditWage(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">OT Hourly Rate (Rs) *</label>
                      <input
                        type="number"
                        required
                        value={editOtRate}
                        onChange={(e) => setEditOtRate(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Division *</label>
                    <select
                      required
                      value={editWorkerDivisionId}
                      onChange={(e) => setEditWorkerDivisionId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
                    >
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
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
                      className="px-4 py-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-bold rounded-lg shadow disabled:opacity-50"
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
                  <th>Sl No</th>
                  <th>Worker ID</th>
                  <th>Full Name</th>
                  <th>Mobile Number</th>
                  <th>Division</th>
                  <th>Daily Wage</th>
                  <th>OT Hourly Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w, i) => (
                  <tr key={w.id}>
                    <td className="font-mono text-center">{i + 1}</td>
                    <td className="font-mono font-bold text-slate-800">{w.workerId}</td>
                    <td className="font-semibold text-slate-800">{w.fullName}</td>
                    <td className="font-mono text-slate-600">{w.mobileNumber}</td>
                    <td>{w.division.name}</td>
                    <td className="font-mono font-bold text-slate-700">₹{w.dailyWage}</td>
                    <td className="font-mono text-slate-700">₹{w.otHourlyRate}/hr</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {/* Only Owner or Manager can edit wages/rates */}
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            onClick={() => {
                              setEditingWorker(w);
                              setEditWorkerName(w.fullName);
                              setEditWorkerMobile(w.mobileNumber.startsWith('+91') ? w.mobileNumber.slice(3) : w.mobileNumber);
                              setEditWage(w.dailyWage.toString());
                              setEditOtRate(w.otHourlyRate.toString());
                              setEditWorkerDivisionId(w.divisionId);
                              setShowAddWorkerForm(false);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded text-[10px]"
                          >
                            Edit Worker
                          </button>
                        )}
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            onClick={() => handleDeleteWorker(w.id, w.fullName)}
                            className="p-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded"
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
    </div>
  );
};
