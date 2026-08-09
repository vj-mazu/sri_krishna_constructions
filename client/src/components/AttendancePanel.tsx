import React, { useState, useEffect } from 'react';
import api from '../api';
import { Calendar, Users, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface AttendancePanelProps {
  currentUserRole?: string;
}

export const AttendancePanel: React.FC<AttendancePanelProps> = ({ currentUserRole }) => {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'; overtimeHours: string; dailyWageOverride: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions');
      const divList = res.data.divisions || [];
      setDivisions(divList);
      if (divList.length > 0) {
        setSelectedDivisionId(divList[0].id);
      }
    } catch (err) {
      console.error('Failed to load divisions:', err);
    }
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  const fetchWorkersAndAttendance = async () => {
    if (!selectedDivisionId || !selectedDate) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Fetch all workers under this division
      const workersRes = await api.get('/workers', { params: { divisionId: selectedDivisionId } });
      const activeWorkers = workersRes.data.workers || [];
      setWorkers(activeWorkers);

      // 2. Fetch existing daily logs if already logged today
      const attRes = await api.get('/attendance', { params: { date: selectedDate, divisionId: selectedDivisionId } });
      const logged = attRes.data.attendances || [];

      // 3. Build state map. If no record logged, default worker status to PRESENT
      const map: Record<string, { status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE'; overtimeHours: string; dailyWageOverride: string }> = {};
      activeWorkers.forEach((w: any) => {
        const record = logged.find((l: any) => l.workerId === w.id);
        map[w.id] = {
          status: record ? record.status : 'PRESENT',
          overtimeHours: record ? record.overtimeHours.toString() : '0',
          dailyWageOverride: record && record.dailyWageOverride !== null && record.dailyWageOverride !== undefined
            ? record.dailyWageOverride.toString()
            : '',
        };
      });

      setAttendanceRecords(map);
    } catch (err) {
      setError('Failed to load daily workers attendance roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkersAndAttendance();
  }, [selectedDivisionId, selectedDate]);

  const handleStatusChange = (workerId: string, status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE') => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        status,
      },
    }));
  };

  const handleOtChange = (workerId: string, overtimeHours: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        overtimeHours,
      },
    }));
  };

  const handleWageOverrideChange = (workerId: string, dailyWageOverride: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        dailyWageOverride,
      },
    }));
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const formattedData = Object.keys(attendanceRecords).map((workerId) => ({
      workerId,
      status: attendanceRecords[workerId].status,
      overtimeHours: parseFloat(attendanceRecords[workerId].overtimeHours) || 0.0,
      dailyWageOverride: attendanceRecords[workerId].dailyWageOverride
        ? parseFloat(attendanceRecords[workerId].dailyWageOverride)
        : null,
    }));

    try {
      const res = await api.post('/attendance', {
        date: selectedDate,
        attendanceData: formattedData,
      });
      
      if (res.data.requiresApproval) {
        setSuccess(res.data.message);
      } else {
        setSuccess('Daily worker attendance roster saved and updated successfully!');
      }
      setTimeout(() => setSuccess(''), 6000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record daily worker attendance sheet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#667eea]" /> Daily Workers Attendance Sheets
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose a Division and Date to mark daily worker presence and calculate site overtime (OT).
          </p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="text-xs">
          <label className="block font-semibold text-slate-700 mb-1">Select Site Division *</label>
          <select
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
          >
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="text-xs">
          <label className="block font-semibold text-slate-700 mb-1">Select Attendance Date *</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
          />
        </div>
        <div className="text-xs">
          <label className="block font-semibold text-slate-700 mb-1">Search Worker</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Name or ID"
            className="w-full p-2 border border-slate-300 rounded focus:border-[#667eea] focus:ring-1 focus:ring-[#667eea] outline-none font-semibold bg-white"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg text-xs border border-indigo-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* ATTENDANCE SHEET GRID */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-semibold flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" /> Loading attendance sheet roster...
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
          No registered workers found under this division. Register workers in 'User Management' first.
        </div>
      ) : (() => {
        const filteredWorkers = workers.filter((w) => {
          const query = searchQuery.toLowerCase().trim();
          if (!query) return true;
          return (
            w.workerId.toLowerCase().includes(query) ||
            w.fullName.toLowerCase().includes(query)
          );
        });

        if (filteredWorkers.length === 0) {
          return (
            <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
              No matching workers found for search filter.
            </div>
          );
        }

        return (
          <form onSubmit={handleSaveAttendance} className="space-y-4">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs excel-table">
                <thead>
                  <tr>
                    <th>Sl No</th>
                    <th>Worker ID</th>
                    <th>Worker Name</th>
                    <th className="text-center w-60">Attendance Status</th>
                    <th className="text-center w-32">Daily Wage Override (₹)</th>
                    <th className="text-center w-32">Overtime Hours (OT)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map((w, index) => {
                    const state = attendanceRecords[w.id] || { status: 'PRESENT', overtimeHours: '0', dailyWageOverride: '' };
                    return (
                      <tr key={w.id} className="hover:bg-slate-50/50">
                        <td className="font-mono text-center">{index + 1}</td>
                        <td className="font-mono font-bold text-slate-700">{w.workerId}</td>
                        <td>
                          <div className="font-semibold text-slate-800">{w.fullName}</div>
                          <div className="text-[10px] text-slate-400">{w.mobileNumber} | ₹{w.dailyWage}/day</div>
                        </td>
                      <td>
                        <div className="flex flex-wrap md:flex-nowrap justify-center gap-2">
                          {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as const).map((status) => {
                            const active = state.status === status;
                            let colorClasses = '';
                            if (status === 'PRESENT') colorClasses = active ? 'border-[#10b981] bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50';
                            if (status === 'ABSENT') colorClasses = active ? 'border-[#ef4444] bg-red-50 text-red-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50';
                            if (status === 'HALF_DAY') colorClasses = active ? 'border-[#f59e0b] bg-amber-50 text-amber-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50';
                            if (status === 'LEAVE') colorClasses = active ? 'border-slate-500 bg-slate-100 text-slate-800 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50';

                            let dotColor = '';
                            if (status === 'PRESENT') dotColor = 'bg-[#10b981]';
                            if (status === 'ABSENT') dotColor = 'bg-[#ef4444]';
                            if (status === 'HALF_DAY') dotColor = 'bg-[#f59e0b]';
                            if (status === 'LEAVE') dotColor = 'bg-slate-500';

                            return (
                              <label
                                key={status}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg cursor-pointer text-[10px] uppercase tracking-wide transition-all select-none ${colorClasses}`}
                              >
                                <input
                                  type="radio"
                                  name={`status-${w.id}`}
                                  value={status}
                                  checked={active}
                                  onChange={() => handleStatusChange(w.id, status)}
                                  className="sr-only"
                                  disabled={state.status === status}
                                />
                                <span className={`w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center shrink-0 ${active ? 'border-transparent bg-white' : ''}`}>
                                  {active && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
                                </span>
                                <span>{status.replace('_', ' ')}</span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1 font-mono">
                          <span className="text-[10px] text-slate-400 font-semibold">₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder={w.dailyWage.toString()}
                            disabled={currentUserRole !== 'OWNER' && currentUserRole !== 'MANAGER'}
                            value={state.dailyWageOverride}
                            onChange={(e) => handleWageOverrideChange(w.id, e.target.value)}
                            className={`w-20 p-1 border border-slate-300 rounded text-center font-bold focus:border-[#667eea] outline-none ${
                              currentUserRole !== 'OWNER' && currentUserRole !== 'MANAGER' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                            }`}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1.5 font-mono">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={state.overtimeHours}
                            onChange={(e) => handleOtChange(w.id, e.target.value)}
                            className="w-16 p-1 border border-slate-300 rounded text-center font-bold focus:border-[#667eea] outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-semibold">hrs</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center gap-2"
            >
              {saving ? 'Saving Sheet...' : 'Save & Submit Attendance'}
            </button>
          </div>
          </form>
        );
      })()}
    </div>
  );
};
