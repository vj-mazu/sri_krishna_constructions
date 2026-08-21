import React, { useState, useEffect } from 'react';
import api from '../api';
import { showToast } from '../toast';
import { Calendar, AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff, CloudUpload } from 'lucide-react';

interface AttendancePanelProps {
  currentUserRole?: string;
}

export const AttendancePanel: React.FC<AttendancePanelProps> = ({ currentUserRole }) => {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [workers, setWorkers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, { status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | ''; overtimeHours: string; dailyWageOverride: string; divisionId?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);

  // Check offline queue on mount
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        syncOfflineQueue();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    checkOfflineQueueCount();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const checkOfflineQueueCount = () => {
    try {
      const queue = JSON.parse(localStorage.getItem('skc_offline_attendance_queue') || '[]');
      setOfflinePendingCount(queue.length);
    } catch {
      setOfflinePendingCount(0);
    }
  };

  const syncOfflineQueue = async () => {
    try {
      const queue = JSON.parse(localStorage.getItem('skc_offline_attendance_queue') || '[]');
      if (queue.length === 0) return;

      showToast(`Syncing ${queue.length} offline attendance submissions...`, 'info');
      
      for (const item of queue) {
        await api.post('/attendance', {
          date: item.date,
          attendanceData: item.attendanceData,
        });
      }

      localStorage.removeItem('skc_offline_attendance_queue');
      setOfflinePendingCount(0);
      showToast('All offline attendance records synced successfully to cloud!', 'success');
      fetchWorkersAndAttendance();
    } catch (err: any) {
      console.error('Offline sync error:', err);
    }
  };

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions');
      const divList = res.data.divisions || [];
      setDivisions(divList);
      // Default to ALL divisions
      setSelectedDivisionId('ALL');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load divisions', 'error');
    }
  };

  useEffect(() => {
    fetchDivisions();
  }, []);

  const [holidayInfo, setHolidayInfo] = useState<any>(null);

  const fetchWorkersAndAttendance = async () => {
    if (!selectedDate) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Always fetch all workers so supervisors can dynamically assign any worker to any division
      const [workersRes, attendanceRes, holidaysRes] = await Promise.all([
        api.get('/workers?limit=1000'),
        api.get(`/attendance?date=${selectedDate}`),
        api.get(`/holidays?year=${new Date(selectedDate).getFullYear()}&month=${new Date(selectedDate).getMonth() + 1}`),
      ]);

      const fetchedWorkers = workersRes.data.workers || [];
      const fetchedAttendance = attendanceRes.data.attendances || attendanceRes.data.attendance || [];
      const fetchedHolidays = holidaysRes.data.holidays || [];

      // Check if selected date is an official declared holiday
      const currentHoliday = fetchedHolidays.find((h: any) => {
        const hDate = new Date(h.date).toISOString().split('T')[0];
        return hDate === selectedDate;
      });
      setHolidayInfo(currentHoliday || null);

      setWorkers(fetchedWorkers);

      const recordsMap: Record<string, { status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | ''; overtimeHours: string; dailyWageOverride: string; divisionId: string; divisionName?: string }> = {};

      // Initialize all workers as clean/unmarked
      fetchedWorkers.forEach((w: any) => {
        recordsMap[w.id] = {
          status: '',
          overtimeHours: '0',
          dailyWageOverride: '',
          divisionId: selectedDivisionId !== 'ALL' ? selectedDivisionId : (w.divisionId || ''),
        };
      });

      // Overlay saved attendance records
      fetchedAttendance.forEach((att: any) => {
        recordsMap[att.workerId] = {
          status: att.status,
          overtimeHours: att.overtimeHours ? att.overtimeHours.toString() : '0',
          dailyWageOverride: att.dailyWageOverride ? att.dailyWageOverride.toString() : '',
          divisionId: att.divisionId || att.worker?.divisionId || '',
          divisionName: att.divisionName || '',
          secondDivisionId: att.secondDivisionId || '',
          secondDivisionName: att.secondDivisionName || '',
        };
      });

      setAttendanceRecords(recordsMap);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to fetch workers and daily attendance data';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkersAndAttendance();
  }, [selectedDate, selectedDivisionId]);

  const handleStatusChange = (workerId: string, status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE') => {
    const currentRec = attendanceRecords[workerId] || { status: '', overtimeHours: '0', dailyWageOverride: '', divisionId: '' };
    const workerObj = workers.find(w => w.id === workerId);
    const workerName = workerObj?.fullName || 'Worker';

    // Split Half-Day Business Validation:
    // If worker was already marked HALF_DAY at another division today:
    const wasHalfDayInOtherDiv = currentRec.status === 'HALF_DAY' && currentRec.divisionId && selectedDivisionId !== 'ALL' && currentRec.divisionId !== selectedDivisionId;

    if (wasHalfDayInOtherDiv && status === 'PRESENT') {
      const errAlert = `⚠️ Cannot mark full "Present" for ${workerName}. This worker already worked Half-Day at another site today. You can only mark "Half Day" (0.5 day) at this division!`;
      setError(errAlert);
      showToast(errAlert, 'error');
      return;
    }

    setAttendanceRecords((prev) => {
      return {
        ...prev,
        [workerId]: {
          ...currentRec,
          status,
          divisionId: selectedDivisionId !== 'ALL' ? selectedDivisionId : (currentRec.divisionId || ''),
        },
      };
    });
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

  const formatDateDMY = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
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
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Filter only records that have a status chosen
      const markedEntries = Object.entries(attendanceRecords).filter(([_, data]) => Boolean(data.status));
      
      if (markedEntries.length === 0) {
        const msg = 'Please select attendance status (Present, Absent, Half, Leave) for at least one worker before saving.';
        setError(msg);
        showToast(msg, 'error');
        setSaving(false);
        return;
      }

      // Check for illegal double-full-day conflicts
      for (const [workerId, data] of markedEntries) {
        const workerObj = workers.find(w => w.id === workerId);
        const wasHalfDayInOtherDiv = data.status === 'HALF_DAY' && data.divisionId && selectedDivisionId !== 'ALL' && data.divisionId !== selectedDivisionId;
        if (wasHalfDayInOtherDiv && data.status === 'PRESENT') {
          const err = `Error: Worker ${workerObj?.fullName || workerId} is already marked Half Day at another site. Cannot mark full Present!`;
          setError(err);
          showToast(err, 'error');
          setSaving(false);
          return;
        }
      }

      // Prepare records with dynamic divisionId for the day
      const recordsToSave = markedEntries.map(([workerId, data]) => {
        let divToAssign = selectedDivisionId !== 'ALL' ? selectedDivisionId : data.divisionId;
        return {
          workerId,
          status: data.status,
          overtimeHours: parseFloat(data.overtimeHours) || 0,
          dailyWageOverride: data.dailyWageOverride ? parseFloat(data.dailyWageOverride) : null,
          divisionId: divToAssign || null,
        };
      });

      try {
        await api.post('/attendance', {
          date: selectedDate,
          attendanceData: recordsToSave,
        });

        setSuccess('Attendance marked successfully!');
        showToast('Daily attendance saved successfully!', 'success');
        fetchWorkersAndAttendance();
      } catch (networkErr: any) {
        // If device is offline or network failed, cache in Offline Queue!
        const existingQueue = JSON.parse(localStorage.getItem('skc_offline_attendance_queue') || '[]');
        // Filter out duplicate submissions for same date
        const updatedQueue = existingQueue.filter((item: any) => item.date !== selectedDate);
        updatedQueue.push({
          date: selectedDate,
          attendanceData: recordsToSave,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('skc_offline_attendance_queue', JSON.stringify(updatedQueue));
        checkOfflineQueueCount();

        setSuccess('💾 Saved Offline! Attendance will automatically sync when network returns.');
        showToast('Saved in Offline Storage! Will auto-sync when online.', 'info');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to save attendance records';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-2.5 sm:p-6 space-y-2.5 sm:space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-4">
        <div>
          <h2 className="text-sm sm:text-xl font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e3a8a]" /> Daily Workers Attendance
          </h2>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Choose a Division and Date to mark daily worker presence and calculate site overtime (OT).
          </p>
        </div>

        {/* Live Network & Offline Queue Pill */}
        <div className="flex items-center gap-2">
          {offlinePendingCount > 0 && (
            <button
              onClick={syncOfflineQueue}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-[11px] font-black shadow-xs animate-pulse transition-all"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>Sync {offlinePendingCount} Offline</span>
            </button>
          )}

          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
          }`}>
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3 h-3" /> Online
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" /> Offline Mode
              </>
            )}
          </div>
        </div>
      </div>

      {/* COMPACT FILTER CONTROLS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-2 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200">
        <div className="text-xs">
          <label className="block font-bold text-slate-700 mb-0.5 text-[10px] sm:text-[11px]">Division *</label>
          <select
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            className="w-full p-1.5 sm:p-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white text-xs"
          >
            <option value="ALL">🏢 All Divisions (All Sites)</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="text-xs">
          <label className="block font-bold text-slate-700 mb-0.5 text-[10px] sm:text-[11px]">
            Date * {selectedDate && <span className="text-[#1e3a8a] font-mono font-bold text-[10px]">[{formatDateDMY(selectedDate)}]</span>}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-1.5 sm:p-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white text-xs font-mono"
          />
        </div>
        <div className="text-xs col-span-2 md:col-span-1">
          <label className="block font-bold text-slate-700 mb-0.5 text-[10px] sm:text-[11px]">Search Worker</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Name or ID..."
            className="w-full p-1.5 sm:p-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white text-xs"
          />
        </div>
      </div>

      {holidayInfo && (
        <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl shadow-sm flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏛️</span>
            <div>
              <div className="font-bold text-xs sm:text-sm tracking-wide uppercase">
                OFFICIAL COMPANY / GOVT HOLIDAY: {holidayInfo.name}
              </div>
              <div className="text-[10px] sm:text-xs text-amber-100 font-sans">
                Workers on this date are automatically credited with a paid working day. Site overtime (OT) can still be entered if emergency site work is done.
              </div>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-white/20 text-white font-bold text-[10px] rounded-full uppercase">
            Paid Holiday
          </span>
        </div>
      )}

      {error && (
        <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="p-2.5 bg-blue-50 text-blue-800 rounded-lg text-xs border border-blue-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#1e3a8a] shrink-0" /> {success}
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
          const rec = attendanceRecords[w.id];
          const query = searchQuery.toLowerCase().trim();
          
          // 1. Text Search Filter (Worker Name or ID)
          if (query && !w.workerId.toLowerCase().includes(query) && !w.fullName.toLowerCase().includes(query)) {
            return false;
          }

          // 2. Strict Division Isolation & Business Logic:
          if (selectedDivisionId && selectedDivisionId !== 'ALL') {
            const isMarkedInThisDiv = rec && (rec.divisionId === selectedDivisionId || rec.secondDivisionId === selectedDivisionId) && Boolean(rec.status);
            
            // 1. If worker has attendance recorded at this division, show them!
            if (isMarkedInThisDiv) {
              return true;
            }

            // 2. If worker has ANY attendance recorded at ANY OTHER division (Full Day or Half Day),
            // EXCLUDE them from this division so they don't show up with buttons or clutter!
            const isMarkedAtOtherSite = rec && Boolean(rec.status) && Boolean(rec.divisionId) && rec.divisionId !== selectedDivisionId;
            if (isMarkedAtOtherSite) {
              return false;
            }

            // 3. If unmarked, show only if this division is the worker's home/registered division
            const isUnmarked = !rec || !rec.status;
            const isDefaultDiv = w.divisionId === selectedDivisionId;
            return isDefaultDiv && isUnmarked;
          }

          return true;
        });

        if (filteredWorkers.length === 0) {
          return (
            <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl bg-white p-6">
              {selectedDivisionId !== 'ALL' 
                ? 'All available workers have already been marked for full-day attendance at other divisions for this date.' 
                : 'No matching workers found for search filter.'}
            </div>
          );
        }

        const presentCount = Object.values(attendanceRecords).filter(r => r.status === 'PRESENT').length;
        const absentCount = Object.values(attendanceRecords).filter(r => r.status === 'ABSENT').length;
        const halfCount = Object.values(attendanceRecords).filter(r => r.status === 'HALF_DAY').length;
        const leaveCount = Object.values(attendanceRecords).filter(r => r.status === 'LEAVE').length;
        const unmarkedCount = filteredWorkers.length - (presentCount + absentCount + halfCount + leaveCount);

        const getStatusBadge = (status: string) => {
          switch (status) {
            case 'PRESENT':
              return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">🟢 Present</span>;
            case 'ABSENT':
              return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">🔴 Absent</span>;
            case 'HALF_DAY':
              return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">🟡 Half Day</span>;
            case 'LEAVE':
              return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 shadow-xs">🟣 Leave</span>;
            default:
              return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">⚪ Unmarked</span>;
          }
        };

        return (
          <form onSubmit={handleSaveAttendance} className="space-y-3">
            {/* REAL-TIME SUMMARY STATS BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs text-center text-xs">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-1.5">
                <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Present</div>
                <div className="text-sm font-black text-emerald-800 font-mono">{presentCount}</div>
              </div>
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-1.5">
                <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Absent</div>
                <div className="text-sm font-black text-rose-800 font-mono">{absentCount}</div>
              </div>
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-1.5">
                <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Half Day</div>
                <div className="text-sm font-black text-amber-800 font-mono">{halfCount}</div>
              </div>
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-lg p-1.5">
                <div className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Leave</div>
                <div className="text-sm font-black text-purple-800 font-mono">{leaveCount}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Unmarked</div>
                <div className="text-sm font-black text-slate-700 font-mono">{Math.max(0, unmarkedCount)}</div>
              </div>
            </div>

            {/* 1. NATIVE MOBILE APP CARD LIST (100% Mobile Optimized) */}
            <div className="block md:hidden space-y-3 pb-16">
              {filteredWorkers.map((w) => {
                const state = attendanceRecords[w.id] || { status: '', overtimeHours: '0', dailyWageOverride: '' };
                return (
                  <div key={w.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 transition-all">
                    {/* Header info */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] text-white font-black text-sm flex items-center justify-center shadow-xs">
                          {(w.fullName || '?').charAt(0)}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm leading-tight">{w.fullName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-[#1e3a8a] font-mono font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">{w.workerId}</span>
                            <span className="text-[11px] text-slate-500 font-medium">{w.designation || 'Worker'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(state.status)}
                        <div className="text-[11px] text-emerald-800 font-bold font-mono">₹{w.dailyWage}/d</div>
                      </div>
                    </div>

                    {/* Split Half-Day Context Notice */}
                    {state.status === 'HALF_DAY' && state.divisionId && selectedDivisionId !== 'ALL' && state.divisionId !== selectedDivisionId && state.secondDivisionId !== selectedDivisionId && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1.5 text-[11px] text-amber-900 font-medium">
                        <span>⚡</span>
                        <span>Worker is on <strong>Half-Day (0.5d)</strong> at another site. Mark <strong>Half Day (🟡)</strong> here to complete full 1.0 day!</span>
                      </div>
                    )}
                    {state.secondDivisionId && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1.5 text-[11px] text-emerald-900 font-medium">
                        <span>🏢</span>
                        <span>Full 1.0d Split across <strong>2 Sites Completed</strong></span>
                      </div>
                    )}

                    {/* Attendance status selector: Large, high-contrast Mobile Touch Pills */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Select Attendance</div>
                      {state.status === 'HALF_DAY' && state.divisionId && selectedDivisionId !== 'ALL' && state.divisionId !== selectedDivisionId && state.secondDivisionId !== selectedDivisionId ? (
                        <div>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(w.id, 'HALF_DAY')}
                            className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all"
                          >
                            <span>➕ Add 2nd Half Day (0.5d) at this Site</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5">
                          {([
                            { key: 'PRESENT', label: 'Present', short: 'P', icon: '🟢', activeBg: 'bg-emerald-600 border-emerald-600 text-white shadow-md' },
                            { key: 'ABSENT', label: 'Absent', short: 'A', icon: '🔴', activeBg: 'bg-rose-600 border-rose-600 text-white shadow-md' },
                            { key: 'HALF_DAY', label: 'Half', short: 'HD', icon: '🟡', activeBg: 'bg-amber-500 border-amber-500 text-white shadow-md' },
                            { key: 'LEAVE', label: 'Leave', short: 'L', icon: '🟣', activeBg: 'bg-purple-600 border-purple-600 text-white shadow-md' }
                          ] as const).map((item) => {
                            const active = state.status === item.key;

                            return (
                              <button
                                type="button"
                                key={item.key}
                                onClick={() => handleStatusChange(w.id, item.key)}
                                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center border ${
                                  active
                                    ? `${item.activeBg} font-black ring-2 ring-offset-1 ring-blue-500/20`
                                    : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span className="text-xs leading-none mb-0.5">{item.icon}</span>
                                <span className="text-[10px] uppercase tracking-tight">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Wage override & Overtime (Enhanced mobile row) */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-slate-500 text-xs font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder={`Wage: ₹${w.dailyWage}`}
                          disabled={currentUserRole !== 'OWNER' && currentUserRole !== 'MANAGER'}
                          value={state.dailyWageOverride}
                          onChange={(e) => handleWageOverrideChange(w.id, e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-slate-500 text-[10px] font-bold uppercase">OT:</span>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          placeholder="0 hrs"
                          value={state.overtimeHours === '0' ? '' : state.overtimeHours}
                          onChange={(e) => handleOtChange(w.id, e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                        />
                        <span className="text-slate-400 text-[10px] font-semibold">hrs</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. DESKTOP / TABLET EXCEL TABLE (Hidden on mobile screens) */}
            <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
              <table className="w-full text-left text-xs excel-table border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-100 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.03)] min-w-[140px] px-3 py-2.5">Worker Details</th>
                    <th className="text-center min-w-[100px] px-3 py-2.5">Status</th>
                    <th className="text-center min-w-[260px] px-3 py-2.5">Attendance Mark</th>
                    <th className="text-center min-w-[120px] px-3 py-2.5">Daily Wage Override (₹)</th>
                    <th className="text-center min-w-[110px] px-3 py-2.5">Overtime Hours (OT)</th>
                  </tr>
                </thead>
                <tbody>
                    {filteredWorkers.map((w) => {
                      const state = attendanceRecords[w.id] || { status: '', overtimeHours: '0', dailyWageOverride: '' };
                      const isMarkedAtOtherSiteOnly = state.status === 'HALF_DAY' && state.divisionId && selectedDivisionId !== 'ALL' && state.divisionId !== selectedDivisionId && state.secondDivisionId !== selectedDivisionId;
                      const isCompletedAtThisSite = state.status === 'HALF_DAY' && (state.divisionId === selectedDivisionId || state.secondDivisionId === selectedDivisionId);

                      return (
                        <tr key={w.id} className="hover:bg-slate-50/50">
                          <td className="sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.03)] min-w-[140px] px-3 py-2">
                            <div className="font-bold text-slate-800 text-[11px] leading-tight truncate">{w.fullName}</div>
                            <div className="text-[9px] text-[#1e3a8a] font-mono font-bold mt-0.5">{w.workerId}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">₹{Number(w.dailyWage || 0).toLocaleString('en-IN')}/day</div>
                            {isMarkedAtOtherSiteOnly && (
                              <div className="mt-1 inline-block px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-bold">
                                ⚡ 0.5d done at {state.divisionName || 'Other Site'}
                              </div>
                            )}
                            {state.secondDivisionId && (
                              <div className="mt-1 inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[9px] font-bold">
                                🏢 Full 1.0d Split across 2 Sites
                              </div>
                            )}
                          </td>
                          
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            {isMarkedAtOtherSiteOnly ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
                                ⚡ 0.5d at {state.divisionName || 'Site 1'}
                              </span>
                            ) : (
                              getStatusBadge(state.status)
                            )}
                          </td>

                          <td className="px-3 py-2">
                            {isMarkedAtOtherSiteOnly ? (
                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(w.id, 'HALF_DAY')}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-[11px] font-black shadow-xs flex items-center gap-1 transition-all"
                                >
                                  <span>➕ Add 2nd Half Day at this Site</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-1.5">
                              {(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'] as const).map((status) => {
                                const active = state.status === status;
                                let colorClasses = '';
                                if (status === 'PRESENT') colorClasses = active ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50';
                                if (status === 'ABSENT') colorClasses = active ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50';
                                if (status === 'HALF_DAY') colorClasses = active ? 'border-amber-500 bg-amber-50 text-amber-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50';
                                if (status === 'LEAVE') colorClasses = active ? 'border-slate-500 bg-slate-100 text-slate-800 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50';

                                let dotColor = '';
                                if (status === 'PRESENT') dotColor = 'bg-emerald-500';
                                if (status === 'ABSENT') dotColor = 'bg-red-500';
                                if (status === 'HALF_DAY') dotColor = 'bg-amber-500';
                                if (status === 'LEAVE') dotColor = 'bg-slate-500';

                                return (
                                  <label
                                    key={status}
                                    className={`flex items-center gap-1 px-2 py-1.5 border rounded-lg cursor-pointer text-[9px] uppercase tracking-wider font-semibold transition-all select-none ${colorClasses}`}
                                  >
                                    <input
                                      type="radio"
                                      name={`status-${w.id}`}
                                      value={status}
                                      checked={active}
                                      onChange={() => handleStatusChange(w.id, status)}
                                      className="sr-only"
                                    />
                                    <span className={`w-2.5 h-2.5 rounded-full border border-slate-300 flex items-center justify-center shrink-0 ${active ? 'border-transparent bg-white shadow-sm' : ''}`}>
                                      {active && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
                                    </span>
                                    <span>{status === 'HALF_DAY' ? 'Half' : status === 'PRESENT' ? 'Present' : status === 'ABSENT' ? 'Absent' : 'Leave'}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1 font-mono">
                            <span className="text-[10px] text-slate-400 font-semibold">₹</span>
                            <input
                              type="number"
                              min="0"
                              placeholder={w.dailyWage?.toString() || '0'}
                              disabled={currentUserRole !== 'OWNER' && currentUserRole !== 'MANAGER'}
                              value={state.dailyWageOverride}
                              onChange={(e) => handleWageOverrideChange(w.id, e.target.value)}
                              className={`w-20 p-1 border border-slate-300 rounded text-center font-bold focus:border-[#1e3a8a] outline-none text-xs ${
                                currentUserRole !== 'OWNER' && currentUserRole !== 'MANAGER' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                              }`}
                            />
                          </div>
                        </td>
                        
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1 font-mono">
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={state.overtimeHours}
                              onChange={(e) => handleOtChange(w.id, e.target.value)}
                              className="w-14 p-1 border border-slate-300 rounded text-center font-bold focus:border-[#1e3a8a] outline-none text-xs"
                            />
                            <span className="text-[9px] text-slate-400 font-semibold">h</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* DESKTOP SAVE BUTTON */}
            <div className="hidden md:flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? 'Saving Sheet...' : 'Save & Submit Attendance'}
              </button>
            </div>

            {/* FLOATING MOBILE SAVE BUTTON (STAY FIXED ABOVE BOTTOM NAV) */}
            <div className="md:hidden fixed bottom-16 left-3 right-3 z-40">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-[#1e3a8a] hover:bg-[#1e40af] active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-xl border border-blue-400/30 flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                {saving ? 'Saving Attendance Sheet...' : 'Save & Submit Attendance'}
              </button>
            </div>
          </form>
        );
      })()}
    </div>
  );
};
