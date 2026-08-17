import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  IndianRupee, 
  MessageSquare, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  FileSpreadsheet, 
  BookOpen, 
  X, 
  Building2,
  FileText,
  Printer,
  Download,
  Send,
  Share2
} from 'lucide-react';
import { showToast } from '../toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonthlyWagesProps {
  currentUserRole: string;
}

export const MonthlyWages: React.FC<MonthlyWagesProps> = ({ currentUserRole }) => {
  const [divisions, setDivisions] = useState<any[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [wagesReport, setWagesReport] = useState<any[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable row overrides per worker: workerId -> amount
  const [customPf, setCustomPf] = useState<Record<string, number | string>>({});
  const [customEsi, setCustomEsi] = useState<Record<string, number | string>>({});
  const [customOtAllowance, setCustomOtAllowance] = useState<Record<string, number | string>>({});
  const [customAdvance, setCustomAdvance] = useState<Record<string, number | string>>({});
  const [customExtra, setCustomExtra] = useState<Record<string, number | string>>({});

  // Register book modal drilldown state
  const [drilldownWorkerId, setDrilldownWorkerId] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<any | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Salary Slip Modal Preview state
  const [slipModalWorker, setSlipModalWorker] = useState<any | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Table Responsive View Mode: 'fit' (fits desktop/tablet without scroll) | 'scroll' (wide ledger)
  const [tableViewMode, setTableViewMode] = useState<'fit' | 'scroll'>('fit');

  const formatIndianCurrency = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '') return '₹0';
    const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
    if (isNaN(num)) return '₹0';
    const hasDecimals = num % 1 !== 0;
    return `₹${hasDecimals ? num.toFixed(2) : num}`;
  };

  const formatDateDMY = (dStr: string | Date | null | undefined) => {
    if (!dStr) return '-';
    if (typeof dStr === 'string' && dStr.includes('-')) {
      const parts = dStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
      }
    }
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return String(dStr);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const months = [
    { value: '1', name: 'January' },
    { value: '2', name: 'February' },
    { value: '3', name: 'March' },
    { value: '4', name: 'April' },
    { value: '5', name: 'May' },
    { value: '6', name: 'June' },
    { value: '7', name: 'July' },
    { value: '8', name: 'August' },
    { value: '9', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' },
  ];

  const fetchDivisions = async () => {
    try {
      const res = await api.get('/divisions');
      setDivisions(res.data.divisions || (Array.isArray(res.data) ? res.data : []));
    } catch (err) {
      console.error('Failed to load divisions:', err);
    }
  };

  const fetchLogo = async () => {
    try {
      const res = await api.get('/logo/base64');
      if (res.data && res.data.base64) {
        setLogoBase64(res.data.base64);
      }
    } catch (err) {
      console.error('Logo fetch from backend:', err);
    }
  };

  useEffect(() => {
    fetchDivisions();
    fetchLogo();
  }, []);

  const handleCalculateWages = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.get('/wages/monthly', {
        params: {
          month: selectedMonth,
          year: selectedYear,
          divisionId: selectedDivisionId || undefined,
        },
      });
      const data = res.data.wages || [];
      setWagesReport(data);

      // Prepopulate editable fields from server data
      const initialPf: Record<string, number | string> = {};
      const initialEsi: Record<string, number | string> = {};
      const initialOtAllow: Record<string, number | string> = {};
      const initialAdv: Record<string, number | string> = {};
      const initialExt: Record<string, number | string> = {};

      data.forEach((w: any) => {
        if (w.pfAmount !== undefined && w.pfAmount !== null) initialPf[w.workerId] = parseFloat(w.pfAmount);
        if (w.esiAmount !== undefined && w.esiAmount !== null) initialEsi[w.workerId] = parseFloat(w.esiAmount);
        if (w.otAllowance !== undefined && w.otAllowance !== null) initialOtAllow[w.workerId] = parseFloat(w.otAllowance);
        if (w.advanceDeducted !== undefined && w.advanceDeducted !== null) initialAdv[w.workerId] = parseFloat(w.advanceDeducted);
        if (w.extraAmount !== undefined && w.extraAmount !== null) initialExt[w.workerId] = parseFloat(w.extraAmount);
      });

      setCustomPf(initialPf);
      setCustomEsi(initialEsi);
      setCustomOtAllowance(initialOtAllow);
      setCustomAdvance(initialAdv);
      setCustomExtra(initialExt);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to calculate monthly wages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCalculateWages();
  }, [selectedMonth, selectedYear, selectedDivisionId]);

  // Compute live values for a worker row
  const getRowCalculations = (w: any) => {
    const presentDays = parseFloat(w.presentDays) || 0;
    const halfDays = parseFloat(w.halfDays) || 0;
    const workingDays = w.workingDays !== undefined && w.workingDays !== null 
      ? (parseFloat(w.workingDays) || 0) 
      : (presentDays + (halfDays * 0.5));

    const dailyWage = parseFloat(w.dailyWage) || 0;
    const dailyAllowance = parseFloat(w.dailyAllowance) || 0;

    // Advance balance from worker master record
    const advanceBalance = parseFloat(w.advanceBalance) || 0;
    // Advance deducted this month (from override or saved payment)
    const advanceVal = customAdvance[w.workerId] ?? parseFloat(w.advanceDeducted) ?? 0;
    const advance = advanceVal === '' ? 0 : parseFloat(advanceVal as string) || 0;
    // Remaining balance AFTER deduction
    const remainingAdvance = Math.max(0, advanceBalance - advance);
    const advanceTaken = parseFloat(w.advanceTaken) || 0;

    const wagesAmount = Math.round(workingDays * dailyWage);
    const allowanceAmount = Math.round(workingDays * dailyAllowance);
    const grossPayment = wagesAmount + allowanceAmount;

    const pfVal = customPf[w.workerId] !== undefined ? customPf[w.workerId] : parseFloat(w.pfAmount || 0);
    const pf = pfVal === '' ? 0 : parseFloat(pfVal as string) || 0;

    const esiVal = customEsi[w.workerId] !== undefined ? customEsi[w.workerId] : parseFloat(w.esiAmount || 0);
    const esi = esiVal === '' ? 0 : parseFloat(esiVal as string) || 0;

    const netBaseAmount = grossPayment - pf - esi;

    const otHours = parseFloat(w.totalOtHours) || 0;
    const otHourlyRate = parseFloat(w.otHourlyRate) || 0;
    const otPayment = w.otPayment !== undefined && w.otPayment !== null 
      ? parseFloat(w.otPayment) 
      : Math.round(otHours * (otHourlyRate || (dailyWage / 8)));

    const otAllowanceVal = customOtAllowance[w.workerId] !== undefined 
      ? customOtAllowance[w.workerId] 
      : parseFloat(w.otAllowance ?? 0);
    const otAllowance = otAllowanceVal === '' ? 0 : parseFloat(otAllowanceVal as string) || 0;

    const totalPayment = netBaseAmount + otPayment + otAllowance;
    
    const extraVal = customExtra[w.workerId] !== undefined ? customExtra[w.workerId] : parseFloat(w.extraAmount || 0);
    const extra = extraVal === '' ? 0 : parseFloat(extraVal as string) || 0;
    
    const finalNetAmount = totalPayment - advance + extra;

    return {
      workingDays,
      dailyWage,
      dailyAllowance,
      advanceTaken,
      advanceBalance,
      wagesAmount,
      allowanceAmount,
      grossPayment,
      pf,
      esi,
      netBaseAmount,
      otHours,
      otPayment,
      otAllowance,
      totalPayment,
      advance,
      remainingAdvance,
      extra,
      finalNetAmount,
    };
  };

  const handleApprovePayment = async (worker: any) => {
    setError('');
    setSuccess('');
    const calc = getRowCalculations(worker);

    try {
      await api.post('/wages/approve', {
        workerId: worker.workerId,
        month: parseInt(selectedMonth, 10),
        year: parseInt(selectedYear, 10),
        presentDays: worker.presentDays,
        absentDays: worker.absentDays,
        halfDays: worker.halfDays,
        leaveDays: worker.leaveDays,
        totalOtHours: calc.otHours,
        wagesAmount: calc.wagesAmount,
        allowanceAmount: calc.allowanceAmount,
        grossPayment: calc.grossPayment,
        pfAmount: calc.pf,
        esiAmount: calc.esi,
        netBaseAmount: calc.netBaseAmount,
        otPayment: calc.otPayment,
        otAllowance: calc.otAllowance,
        totalPayment: calc.totalPayment,
        advanceDeducted: calc.advance,
        extraAmount: calc.extra,
        finalNetAmount: calc.finalNetAmount,
        calculatedAmount: calc.finalNetAmount,
        divisionSummary: worker.divisionBreakdown || null,
      });

      const successMsg = `Salary payment approved for '${worker.fullName}' (Net: ₹${calc.finalNetAmount})!`;
      setSuccess(successMsg);
      showToast(successMsg, 'success');
      
      setWagesReport(prev => prev.map(w => w.workerId === worker.workerId ? { ...w, paymentStatus: 'APPROVED' } : w));
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to approve wage payout.';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleApproveAll = async () => {
    const pendingWages = wagesReport.filter(w => w.paymentStatus !== 'APPROVED');
    if (pendingWages.length === 0) {
      showToast('All salaries in this list are already approved.', 'success');
      return;
    }
    if (!window.confirm(`Are you sure you want to approve payments for all ${pendingWages.length} workers?`)) return;

    setError('');
    setSuccess('');
    try {
      const promises = pendingWages.map(worker => {
        const calc = getRowCalculations(worker);
        return api.post('/wages/approve', {
          workerId: worker.workerId,
          month: parseInt(selectedMonth, 10),
          year: parseInt(selectedYear, 10),
          presentDays: worker.presentDays,
          absentDays: worker.absentDays,
          halfDays: worker.halfDays,
          leaveDays: worker.leaveDays,
          totalOtHours: calc.otHours,
          wagesAmount: calc.wagesAmount,
          allowanceAmount: calc.allowanceAmount,
          grossPayment: calc.grossPayment,
          pfAmount: calc.pf,
          esiAmount: calc.esi,
          netBaseAmount: calc.netBaseAmount,
          otPayment: calc.otPayment,
          otAllowance: calc.otAllowance,
          totalPayment: calc.totalPayment,
          advanceDeducted: calc.advance,
          extraAmount: calc.extra,
          finalNetAmount: calc.finalNetAmount,
          calculatedAmount: calc.finalNetAmount,
          divisionSummary: worker.divisionBreakdown || null,
        });
      });
      await Promise.all(promises);
      const successMsg = `Successfully approved salary payouts for all ${pendingWages.length} workers!`;
      setSuccess(successMsg);
      showToast(successMsg, 'success');
      handleCalculateWages();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to bulk-approve salaries.';
      setError(errMsg);
      showToast(errMsg, 'error');
    }
  };

  const handleDispatchSlip = async (worker: any) => {
    const calc = getRowCalculations(worker);
    try {
      const res = await api.post('/wages/whatsapp-link', {
        workerName: worker.fullName,
        mobileNumber: worker.mobileNumber,
        month: selectedMonth,
        year: selectedYear,
        presentDays: worker.presentDays,
        halfDays: worker.halfDays,
        totalOtHours: calc.otHours,
        wagesAmount: calc.wagesAmount,
        allowanceAmount: calc.allowanceAmount,
        grossPayment: calc.grossPayment,
        pfAmount: calc.pf,
        esiAmount: calc.esi,
        netBaseAmount: calc.netBaseAmount,
        otPayment: calc.otPayment,
        otAllowance: calc.otAllowance,
        totalPayment: calc.totalPayment,
        advanceDeducted: calc.advance,
        remainingAdvance: calc.remainingAdvance,
        extraAmount: calc.extra,
        finalNetAmount: calc.finalNetAmount,
        calculatedAmount: calc.finalNetAmount,
        divisionBreakdown: worker.divisionBreakdown || null,
      });

      if (res.data.whatsappUrl) {
        showToast(`WhatsApp payslip link generated for ${worker.fullName}`, 'success');
        window.open(res.data.whatsappUrl, '_blank');
      }
    } catch (err: any) {
      showToast('Failed to construct WhatsApp dispatch link.', 'error');
    }
  };

  // Open Register Book Attendance Drilldown Modal
  const handleOpenRegisterBook = async (workerId: string) => {
    setDrilldownWorkerId(workerId);
    setDrilldownLoading(true);
    try {
      const res = await api.get('/attendance/worker-month', {
        params: {
          workerId,
          month: selectedMonth,
          year: selectedYear
        }
      });
      setDrilldownData(res.data);
    } catch (err) {
      showToast('Failed to load register book records for worker.', 'error');
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleCloseRegisterBook = () => {
    setDrilldownWorkerId(null);
    setDrilldownData(null);
  };

  // Generate Exact Official Portrait Mode Salary Slip PDF
  const generateSalarySlipPdf = (worker: any, shouldDownload: boolean = true) => {
    const calc = getRowCalculations(worker);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const monthObj = months.find(m => m.value === selectedMonth);
    const fallbackMonth = months[new Date().getMonth()]?.name || '';
    const mName = monthObj ? monthObj.name.toUpperCase() : fallbackMonth.toUpperCase();
    const monthYearTitle = `PAY SLIP FOR THE MONTH OF  ${mName} - ${selectedYear}`;

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2); // 182mm

    let startY = 14;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);

    // ================= 1. TOP 3-COLUMN HEADER =================
    const headerHeight = 36;
    const col1Width = 62;
    const col2Width = 42;
    const col3Width = contentWidth - col1Width - col2Width; // 78mm

    // Draw 3 header boxes cleanly
    doc.rect(margin, startY, col1Width, headerHeight);
    doc.rect(margin + col1Width, startY, col2Width, headerHeight);
    doc.rect(margin + col1Width + col2Width, startY, col3Width, headerHeight);

    // Left Column: Sri Krishna Constructions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('SRI KRISHNA CONSTRUCTIONS', margin + (col1Width / 2), startY + 8, { align: 'center', maxWidth: col1Width - 4 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const addressLines = [
      'H.NO 2436 RAGHAVENDRA',
      'COLONY SHAKTINAGAR RAICHUR-',
      '584170'
    ];
    doc.text(addressLines, margin + (col1Width / 2), startY + 16, { align: 'center', lineHeightFactor: 1.3 });

    // Center Column: SALARY SLIP & SKC Monogram / Emblem
    doc.setFillColor(235, 235, 235);
    doc.rect(margin + col1Width, startY, col2Width, 8, 'F');
    doc.rect(margin + col1Width, startY, col2Width, 8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text('SALARY SLIP', margin + col1Width + (col2Width / 2), startY + 5.5, { align: 'center' });

    const centerX = margin + col1Width + (col2Width / 2);

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', centerX - 14, startY + 9, 28, 25);
      } catch (err) {
        // Vector fallback if image add fails
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.6);
        doc.circle(centerX, startY + 19, 7.5, 'S');
        doc.setFillColor(30, 41, 59);
        doc.circle(centerX, startY + 19, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(251, 191, 36);
        doc.text('SKC', centerX, startY + 21.5, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);
        doc.text('SALES & SERVICE', centerX, startY + 30, { align: 'center' });
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('ESTD 2019', centerX, startY + 33.5, { align: 'center' });
      }
    } else {
      // Vector Emblem Drawing
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.6);
      doc.circle(centerX, startY + 19, 7.5, 'S');
      doc.setFillColor(30, 41, 59);
      doc.circle(centerX, startY + 19, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(251, 191, 36);
      doc.text('SKC', centerX, startY + 21.5, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setTextColor(0, 0, 0);
      doc.text('SALES & SERVICE', centerX, startY + 30, { align: 'center' });
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('ESTD 2019', centerX, startY + 33.5, { align: 'center' });
    }

    // Right Column: Establishment Under Which Work Carried On
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text('NAME OF ESTABLISHMENT UNDER', margin + col1Width + col2Width + (col3Width / 2), startY + 5, { align: 'center' });
    doc.text('WHICH WORK CARRIED ON', margin + col1Width + col2Width + (col3Width / 2), startY + 8.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const estLines = [
      'KARNATAKA POWER CORPORATION',
      'LIMITED RAICHUR THERMAL POWER',
      'STATION SHAKTINAGAR-584170 Dist:',
      'Raichur'
    ];
    doc.text(estLines, margin + col1Width + col2Width + (col3Width / 2), startY + 15, { align: 'center', lineHeightFactor: 1.25 });

    startY += headerHeight;

    // ================= 2. PAY SLIP MONTH BAR =================
    const monthBarHeight = 7.5;
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, startY, contentWidth, monthBarHeight, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(monthYearTitle, margin + (contentWidth / 2), startY + 5.2, { align: 'center' });

    startY += monthBarHeight;

    // ================= 3. EMPLOYEE & STATUTORY DETAILS BOX =================
    const empBoxHeight = 36;
    const empColWidth = contentWidth / 2; // 91mm each

    doc.rect(margin, startY, empColWidth, empBoxHeight);
    doc.rect(margin + empColWidth, startY, empColWidth, empBoxHeight);

    const padX = 3;
    let empY = startY + 5.5;
    const lineGap = 6.2;

    doc.setFontSize(8);

    // Left Column details
    doc.setFont('helvetica', 'bold');
    doc.text('NAME: ', margin + padX, empY);
    doc.setFont('helvetica', 'normal');
    doc.text((worker.fullName || '').toUpperCase(), margin + padX + 14, empY);

    empY += lineGap;
    doc.setFont('helvetica', 'bold');
    doc.text('FATHER NAME: ', margin + padX, empY);
    doc.setFont('helvetica', 'normal');
    doc.text((worker.fatherName || '-').toUpperCase(), margin + padX + 26, empY);

    empY += lineGap;
    doc.setFont('helvetica', 'bold');
    doc.text('DESIGNATION: ', margin + padX, empY);
    doc.setFont('helvetica', 'normal');
    doc.text((worker.designation || 'WORKER').toUpperCase(), margin + padX + 26, empY);

    empY += lineGap;
    doc.setFont('helvetica', 'bold');
    doc.text('PLACE OF WORK: ', margin + padX, empY);
    doc.setFont('helvetica', 'normal');
    const placeWork = (worker.placeOfWork || worker.divisionName || 'GENERAL').toUpperCase();
    doc.text(placeWork, margin + padX + 29, empY, { maxWidth: empColWidth - 32 });

    empY += lineGap;
    doc.setFont('helvetica', 'bold');
    doc.text('NATURE OF WORK: ', margin + padX, empY);
    doc.setFont('helvetica', 'normal');
    const natureWork = (worker.natureOfWork || 'MAINTENANCE').toUpperCase();
    doc.text(natureWork, margin + padX + 32, empY);

    // Right Column Statutory details
    let statY = startY + 5.5;
    const rightX = margin + empColWidth + padX;

    doc.setFont('helvetica', 'bold');
    doc.text('PF ACCOUNT NO : ', rightX, statY);
    doc.setFont('helvetica', 'normal');
    doc.text(worker.pfNumber || 'GBRCH1955403000', rightX + 32, statY);

    statY += lineGap;
    doc.setFont('helvetica', 'bold');
    doc.text("ESI EMPLOYES'S Code: ", rightX, statY);
    doc.setFont('helvetica', 'normal');
    doc.text(worker.esiNumber || '71000088340001099', rightX + 38, statY);

    statY += lineGap;
    doc.setFont('helvetica', 'bold');
    doc.text('UAN NO: ', rightX, statY);
    doc.setFont('helvetica', 'normal');
    doc.text(worker.uanNumber || '100493430949', rightX + 18, statY);
    
    // ESI sub-number
    doc.setFont('helvetica', 'bold');
    doc.text('ESI: ', rightX + 48, statY);
    doc.setFont('helvetica', 'normal');
    doc.text(worker.esiNumber?.slice(-10) || '7118394300', rightX + 56, statY);

    statY += lineGap;
    doc.setFont('helvetica', 'bold');
    doc.text('BANK ACCOUNT NO: ', rightX, statY);
    doc.setFont('helvetica', 'normal');
    doc.text(worker.bankAccountNo || '06222200019793', rightX + 36, statY);

    statY += lineGap;
    doc.setFont('helvetica', 'bold');
    doc.text('IFSC CODE: ', rightX, statY);
    doc.setFont('helvetica', 'normal');
    doc.text(worker.ifscCode || 'CNRB0010622', rightX + 22, statY);

    startY += empBoxHeight;

    // ================= 4. EARNINGS & DEDUCTIONS TABLE =================
    const basicPlusAllowDaily = (parseFloat(calc.dailyWage) || 0) + (parseFloat(calc.dailyAllowance) || 0);
    const basicPlusAllowAmount = (parseFloat(calc.wagesAmount) || 0) + (parseFloat(calc.allowanceAmount) || 0);
    const otRateDaily = Math.round(parseFloat(worker.otHourlyRate) || ((parseFloat(calc.dailyWage) || 0) / 8));
    const totalDeductions = (parseFloat(calc.pf) || 0) + (parseFloat(calc.esi) || 0) + (parseFloat(calc.advance) || 0);

    // Exact matching widths summing to exactly 182mm (contentWidth)
    const cW_earnings = 50;  // col 0
    const cW_rate = 16;      // col 1
    const cW_days = 16;      // col 2
    const cW_earnAmt = 26;   // col 3
    const cW_deduct = 48;    // col 4
    const cW_dedAmt = 26;    // col 5 (50+16+16+26+48+26 = 182mm exactly)

    const tableBody = [
      [
        'BASIC +ALLOWANCE',
        basicPlusAllowDaily ? basicPlusAllowDaily.toString() : '-',
        calc.workingDays ? calc.workingDays.toFixed(0) : '0',
        basicPlusAllowAmount.toFixed(0),
        'PROCIDENT FUND',
        calc.pf ? calc.pf.toFixed(0) : '0'
      ],
      [
        'OT WAGES/ OT HOURS',
        otRateDaily ? otRateDaily.toString() : '-',
        calc.otHours ? calc.otHours.toFixed(0) : '0',
        calc.otPayment ? calc.otPayment.toFixed(1) : '0',
        'ESI',
        calc.esi ? calc.esi.toFixed(0) : '0'
      ],
      [
        'EXTRA',
        '',
        '',
        calc.extra ? calc.extra.toFixed(0) : '',
        'LIC/UNION FEE',
        '0'
      ],
      [
        '',
        '',
        '',
        '',
        'ADVANCE',
        calc.advanceTaken ? calc.advanceTaken.toFixed(0) : '0'
      ],
      [
        '',
        '',
        '',
        '',
        'DEDUCTED ADVANCE',
        calc.advance ? calc.advance.toFixed(0) : '0'
      ],
      [
        '',
        '',
        '',
        '',
        'BALANCE ADVANCE',
        calc.remainingAdvance ? calc.remainingAdvance.toFixed(0) : '0'
      ],
      [
        'TOTAL AMOUNT',
        '',
        '',
        (basicPlusAllowAmount + calc.otPayment + calc.extra).toFixed(1),
        'DEDUCTION TOTAL',
        totalDeductions.toFixed(0)
      ],
      [
        '',
        '',
        '',
        '',
        'NET AMOUNT :',
        calc.finalNetAmount.toFixed(0)
      ]
    ];

    autoTable(doc, {
      startY: startY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 8,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.35,
        cellPadding: 2,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.35
      },
      head: [
        [
          { content: 'EARNINGS', styles: { halign: 'left', cellWidth: cW_earnings } },
          { content: 'RATE', styles: { halign: 'center', cellWidth: cW_rate } },
          { content: 'DAYS', styles: { halign: 'center', cellWidth: cW_days } },
          { content: 'AMOUNT', styles: { halign: 'right', cellWidth: cW_earnAmt } },
          { content: 'DEDUCTION', styles: { halign: 'left', cellWidth: cW_deduct } },
          { content: 'AMOUNT', styles: { halign: 'right', cellWidth: cW_dedAmt } }
        ]
      ],
      body: tableBody,
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: cW_earnings },
        1: { halign: 'center', fontStyle: 'normal', cellWidth: cW_rate },
        2: { halign: 'center', fontStyle: 'normal', cellWidth: cW_days },
        3: { halign: 'right', fontStyle: 'normal', cellWidth: cW_earnAmt },
        4: { halign: 'left', fontStyle: 'bold', cellWidth: cW_deduct },
        5: { halign: 'right', fontStyle: 'normal', cellWidth: cW_dedAmt }
      },
      didParseCell: (data) => {
        // Total Amount Row styling
        if (data.row.index === 6) {
          data.cell.styles.fontStyle = 'bold';
        }
        // Net Amount Row styling
        if (data.row.index === 7) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 4 || data.column.index === 5) {
            data.cell.styles.fillColor = [245, 245, 245];
            data.cell.styles.fontSize = 9;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 180;

    // ================= 5. SIGNATURE & STAMP BOX =================
    const sigY = finalY + 14;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("Worker's Signature / Thumb Impression", margin + 10, sigY + 14);
    doc.line(margin + 5, sigY + 10, margin + 65, sigY + 10);

    doc.text('For SRI KRISHNA CONSTRUCTIONS', pageWidth - margin - 65, sigY);
    doc.text('Authorized Signatory', pageWidth - margin - 45, sigY + 14);
    doc.line(pageWidth - margin - 65, sigY + 10, pageWidth - margin - 5, sigY + 10);

    // Footer notice
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('This is a computer-generated salary slip and requires authorized signature & seal.', margin + (contentWidth / 2), sigY + 24, { align: 'center' });

    const filename = `Salary_Slip_${worker.fullName.replace(/\s+/g, '_')}_${mName}_${selectedYear}.pdf`;

    if (shouldDownload) {
      doc.save(filename);
      showToast(`Salary slip downloaded for ${worker.fullName}`, 'success');
    } else {
      // Return blob URL for printing / modal preview
      return doc.output('bloburl');
    }
  };

  // Bulk Print All Slips
  const handlePrintAllSlips = () => {
    if (filteredWages.length === 0) {
      showToast('No workers in the current list to print slips for.', 'error');
      return;
    }
    filteredWages.forEach((w) => {
      generateSalarySlipPdf(w, true);
    });
  };

  const handleExportExcel = () => {
    const exportData = filteredWages.map((w, index) => {
      const calc = getRowCalculations(w);
      return {
        'Sl No': index + 1,
        'Worker ID': w.empId,
        'Worker Name': w.fullName,
        'Father Name': w.fatherName,
        'Designation': w.designation,
        'Mobile Number': w.mobileNumber,
        'Assigned Division': w.divisionName,
        'Basic Wage/Day': w.dailyWage,
        'Working Days': calc.workingDays,
        'Daily Allowance/Day': w.dailyAllowance,
        'Wages Amount': calc.wagesAmount,
        'Allowance Amount': calc.allowanceAmount,
        'Gross Payment': calc.grossPayment,
        'P.F. Amount': calc.pf,
        'ESI Amount': calc.esi,
        'NET AMOUNT (Base)': calc.netBaseAmount,
        'O.T. Hours': calc.otHours,
        'OT Payment': calc.otPayment,
        'OT ALLOWANCE': calc.otAllowance,
        'TOTAL PAYMENT': calc.totalPayment,
        'Advance Taken': calc.advanceTaken,
        'Advance Deducted': calc.advance,
        'Advance Remaining Balance': calc.remainingAdvance,
        'EXTRA': calc.extra,
        'FINAL NET AMOUNT': calc.finalNetAmount,
        'Approval Status': w.paymentStatus,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    const monthName = months.find(m => m.value === selectedMonth)?.name || selectedMonth;
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PAYMENTS REGISTER');
    XLSX.writeFile(workbook, `SRI_KRISHNA_CONSTRUCTIONS_WAGES_${monthName.toUpperCase()}_${selectedYear}.xlsx`);
    showToast('Monthly wages register exported to Excel successfully!', 'success');
  };

  const filteredWages = wagesReport.filter((w) => {
    const term = workerSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      String(w.empId || '').toLowerCase().includes(term) ||
      String(w.fullName || '').toLowerCase().includes(term) ||
      String(w.fatherName || '').toLowerCase().includes(term) ||
      String(w.designation || '').toLowerCase().includes(term)
    );
  });

  const monthName = months.find(m => m.value === selectedMonth)?.name || selectedMonth;

  const totals = filteredWages.reduce((acc, w) => {
    const calc = getRowCalculations(w);
    acc.workingDays += calc.workingDays;
    acc.wagesAmount += calc.wagesAmount;
    acc.allowanceAmount += calc.allowanceAmount;
    acc.grossPayment += calc.grossPayment;
    acc.pf += calc.pf;
    acc.esi += calc.esi;
    acc.netBaseAmount += calc.netBaseAmount;
    acc.otPayment += calc.otPayment;
    acc.otAllowance += calc.otAllowance;
    acc.totalPayment += calc.totalPayment;
    acc.advanceTaken += calc.advanceTaken;
    acc.advance += calc.advance;
    acc.remainingAdvance += calc.remainingAdvance;
    acc.extra += calc.extra;
    acc.finalNetAmount += calc.finalNetAmount;
    return acc;
  }, {
    workingDays: 0,
    wagesAmount: 0,
    allowanceAmount: 0,
    grossPayment: 0,
    pf: 0,
    esi: 0,
    netBaseAmount: 0,
    otPayment: 0,
    otAllowance: 0,
    totalPayment: 0,
    advanceTaken: 0,
    advance: 0,
    remainingAdvance: 0,
    extra: 0,
    finalNetAmount: 0,
  });
  const avgWorkingDays = filteredWages.length > 0 ? totals.workingDays / filteredWages.length : 0;

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-2.5 sm:p-6 space-y-3 sm:space-y-6">
      {/* HEADER BANNER */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 sm:pb-4 gap-2">
        <div>
          <h2 className="text-sm sm:text-xl font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2">
            <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-[#1e3a8a]" /> Workers Payment Register
          </h2>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
            Official Muster Roll & Wage Register for <span className="font-bold text-[#1e3a8a]">{monthName} {selectedYear}</span>. Click any worker's name to view their complete Register Book.
          </p>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 bg-slate-50 p-2 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-0.5 text-[10px] sm:text-xs">Month *</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full p-1.5 sm:p-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white text-xs"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-0.5 text-[10px] sm:text-xs">Year *</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full p-1.5 sm:p-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white text-xs"
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-0.5 text-[10px] sm:text-xs">Division</label>
          <select
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            className="w-full p-1.5 sm:p-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-semibold bg-white text-xs"
          >
            <option value="">All Divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-1 sm:col-span-1">
          <label className="block font-semibold text-slate-700 mb-0.5 text-[10px] sm:text-xs">Search</label>
          <input
            type="text"
            value={workerSearch}
            onChange={(e) => setWorkerSearch(e.target.value)}
            placeholder="Name / ID..."
            className="w-full p-1.5 sm:p-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none bg-white font-semibold text-xs"
          />
        </div>
        <div className="col-span-2 sm:col-span-2 lg:col-span-3 flex items-end gap-1.5">
          <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 mr-1">
            <button
              onClick={() => setTableViewMode('fit')}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                tableViewMode === 'fit'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Fit entire 22-column payroll register on screen without horizontal scrolling"
            >
              🖥️ Fit Screen
            </button>
            <button
              onClick={() => setTableViewMode('scroll')}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                tableViewMode === 'scroll'
                  ? 'bg-[#1e3a8a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Wide Excel Ledger with full spacing"
            >
              ↔️ Wide Ledger
            </button>
          </div>
          <button
            onClick={handleExportExcel}
            className="flex-1 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md sm:rounded-lg text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow"
            title="Export Excel Register"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={handlePrintAllSlips}
            className="flex-1 py-1.5 sm:py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-md sm:rounded-lg text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow"
            title="Download All Salary Slips in PDF (Portrait A4)"
          >
            <FileText className="w-3.5 h-3.5" /> All Slips PDF
          </button>
          {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
            <button
              onClick={handleApproveAll}
              className="flex-1 py-1.5 sm:py-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold rounded-md sm:rounded-lg text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow"
              title="Approve All Salaries"
            >
              <Check className="w-4 h-4" /> Approve All
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
          <Check className="w-4 h-4 text-[#1e3a8a]" /> {success}
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-semibold flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" /> Calculating payroll wages...
        </div>
      ) : filteredWages.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
          No matching worker records found for search filter.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-inner max-h-[78vh]">
          <table className={`w-full text-left border-collapse ${tableViewMode === 'fit' ? 'text-[10px] xl:text-[11px] table-auto' : 'text-xs excel-table'}`}>
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className="bg-slate-800 text-white text-[9px] xl:text-[10px] uppercase font-bold tracking-tight">
                <th className="w-7 text-center py-2 px-1">#</th>
                <th className={`${tableViewMode === 'fit' ? 'min-w-[120px] max-w-[140px]' : 'min-w-[180px]'} py-2 px-1.5`}>Worker Name</th>
                <th className="text-right py-2 px-1">Basic</th>
                <th className="text-center py-2 px-1 bg-slate-700/60">Days</th>
                <th className="text-right py-2 px-1">Allow</th>
                <th className="text-right py-2 px-1 bg-slate-700/80">Wages</th>
                <th className="text-right py-2 px-1 bg-slate-700/80">Allow.Amt</th>
                <th className="text-right py-2 px-1 bg-blue-900/90 text-amber-300">Gross</th>
                <th className="text-center py-2 px-1 bg-red-900/70 text-red-200">P.F.</th>
                <th className="text-center py-2 px-1 bg-red-900/70 text-red-200">ESI</th>
                <th className="text-right py-2 px-1 bg-slate-700/90">Net Base</th>
                <th className="text-center py-2 px-1">OT.Hr</th>
                <th className="text-right py-2 px-1">OT.Pay</th>
                <th className="text-center py-2 px-1 bg-amber-900/70 text-amber-200">OT Allow</th>
                <th className="text-right py-2 px-1 bg-emerald-900/90 text-emerald-300">Total Pay</th>
                <th className="text-right py-2 px-1 bg-amber-900/60 text-amber-200">Adv.Take</th>
                <th className="text-center py-2 px-1 bg-amber-800 text-amber-100">Adv.Ded</th>
                <th className="text-right py-2 px-1 bg-amber-900/60 text-amber-200">Adv.Bal</th>
                <th className="text-center py-2 px-1 bg-indigo-900/70 text-indigo-200">Extra</th>
                <th className="text-left py-2 px-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black">FINAL NET</th>
                <th className="text-center py-2 px-1">Status</th>
                <th className="text-center py-2 px-1.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredWages.map((w, index) => {
                const calc = getRowCalculations(w);

                return (
                  <tr key={w.workerId} className="hover:bg-slate-50 transition-colors">
                    {/* 1. Sl No */}
                    <td className="font-mono text-center text-slate-500 font-bold py-1 px-1">{index + 1}</td>

                    {/* 2. Worker Name & Drilldown Trigger */}
                    <td className="py-1 px-1.5">
                      <div 
                        onClick={() => handleOpenRegisterBook(w.workerId)}
                        className="cursor-pointer group flex items-start justify-between"
                        title="Click to view Sri Krishna Constructions Daily Attendance Register & Muster Roll"
                      >
                        <div>
                          <div className="font-bold text-[#1e3a8a] group-hover:underline flex items-center gap-1 leading-tight">
                            <BookOpen className="w-3 h-3 text-amber-600 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">{w.fullName}</span>
                          </div>
                          <div className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5 leading-none">
                            <span className="truncate max-w-[70px]">{w.designation || 'Worker'}</span>
                            <span>•</span>
                            <span className="font-mono text-[8.5px] text-slate-400">{w.empId}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Basic Wage / Day */}
                    <td className="text-right font-mono font-semibold text-slate-700 py-1 px-1">{formatIndianCurrency(calc.dailyWage)}</td>

                    {/* 4. Working Days */}
                    <td className="text-center font-mono font-bold bg-emerald-50/60 text-emerald-800 py-1 px-1">{calc.workingDays.toFixed(1)}</td>

                    {/* 5. Allowance / Day */}
                    <td className="text-right font-mono text-slate-600 py-1 px-1">{formatIndianCurrency(calc.dailyAllowance)}</td>

                    {/* 6. Wages Amount */}
                    <td className="text-right font-mono font-semibold text-slate-800 py-1 px-1">{formatIndianCurrency(calc.wagesAmount)}</td>

                    {/* 7. Allowance Amount */}
                    <td className="text-right font-mono font-semibold text-slate-800 py-1 px-1">{formatIndianCurrency(calc.allowanceAmount)}</td>

                    {/* 8. Gross Payment */}
                    <td className="text-right font-mono font-bold bg-blue-50/50 text-blue-900 py-1 px-1">{formatIndianCurrency(calc.grossPayment)}</td>

                    {/* 9. P.F. (Manual Entry) */}
                    <td className="text-center py-1 px-0.5">
                      <input
                        type="number"
                        min="0"
                        value={customPf[w.workerId] !== undefined ? customPf[w.workerId] : (w.pfAmount || '')}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = raw === '' ? '' : (parseFloat(raw) || 0);
                          setCustomPf(prev => ({ ...prev, [w.workerId]: val }));
                        }}
                        placeholder="0"
                        className="w-14 text-right font-mono font-bold text-red-700 bg-red-50/40 border border-red-200 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-red-400"
                        title="Enter P.F. deduction"
                      />
                    </td>

                    {/* 10. ESI (Manual Entry) */}
                    <td className="text-center py-1 px-0.5">
                      <input
                        type="number"
                        min="0"
                        value={customEsi[w.workerId] !== undefined ? customEsi[w.workerId] : (w.esiAmount || '')}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = raw === '' ? '' : (parseFloat(raw) || 0);
                          setCustomEsi(prev => ({ ...prev, [w.workerId]: val }));
                        }}
                        placeholder="0"
                        className="w-14 text-right font-mono font-bold text-red-700 bg-red-50/40 border border-red-200 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-red-400"
                        title="Enter ESI deduction"
                      />
                    </td>

                    {/* 11. Net Amount (Base) */}
                    <td className="text-right font-mono font-bold text-slate-800 bg-slate-100/70 py-1 px-1">{formatIndianCurrency(calc.netBaseAmount)}</td>

                    {/* 12. OT Hours */}
                    <td className="text-center font-mono font-bold bg-indigo-50/40 text-indigo-800 py-1 px-1">{calc.otHours}h</td>

                    {/* 13. OT Payment */}
                    <td className="text-right font-mono font-semibold text-slate-700 py-1 px-1">{formatIndianCurrency(calc.otPayment)}</td>

                    {/* 14. OT ALLOWANCE (Entered Manually) */}
                    <td className="text-center py-1 px-0.5">
                      <input
                        type="number"
                        min="0"
                        value={customOtAllowance[w.workerId] !== undefined ? customOtAllowance[w.workerId] : (w.otAllowance ?? '')}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = raw === '' ? '' : (parseFloat(raw) || 0);
                          setCustomOtAllowance(prev => ({ ...prev, [w.workerId]: val }));
                        }}
                        placeholder="0"
                        className="w-14 text-right font-mono font-bold text-slate-800 bg-amber-50/60 border border-amber-300 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                        title="Enter OT Allowance manually"
                      />
                    </td>

                    {/* 15. Total Payment */}
                    <td className="text-right font-mono font-bold bg-emerald-50/70 text-emerald-900 py-1 px-1">{formatIndianCurrency(calc.totalPayment)}</td>

                    {/* 16. Advance Taken */}
                    <td className="text-right font-mono font-semibold text-slate-800 bg-amber-50/20 py-1 px-1">
                      {formatIndianCurrency(calc.advanceTaken)}
                    </td>

                    {/* 17. Advance Deduct (Editable) */}
                    <td className="text-center bg-amber-50/50 py-1 px-0.5">
                      <input
                        type="number"
                        min="0"
                        value={customAdvance[w.workerId] !== undefined ? customAdvance[w.workerId] : (w.advanceDeducted || '')}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = raw === '' ? '' : (parseFloat(raw) || 0);
                          setCustomAdvance(prev => ({ ...prev, [w.workerId]: val }));
                        }}
                        placeholder="0"
                        className="w-14 text-right font-mono font-bold text-amber-900 bg-white border border-amber-300 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                        title="Enter advance payment deduction for this month"
                      />
                    </td>

                    {/* 18. Advance Remaining Balance */}
                    <td className="text-right font-mono font-bold text-amber-900 bg-amber-50/40 py-1 px-1">
                      {formatIndianCurrency(calc.remainingAdvance)}
                    </td>

                    {/* 19. Extra Bonus (Editable) */}
                    <td className="text-center py-1 px-0.5">
                      <input
                        type="number"
                        min="0"
                        value={customExtra[w.workerId] !== undefined ? customExtra[w.workerId] : (w.extraAmount || '')}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = raw === '' ? '' : (parseFloat(raw) || 0);
                          setCustomExtra(prev => ({ ...prev, [w.workerId]: val }));
                        }}
                        placeholder="0"
                        className="w-14 text-right font-mono font-bold text-indigo-800 bg-indigo-50/60 border border-indigo-300 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        title="Enter extra bonus / incentives"
                      />
                    </td>

                    {/* 20. Final Net Amount */}
                    <td className={`text-left font-mono font-black text-xs xl:text-sm px-2 py-1 relative ${calc.finalNetAmount < 0 ? 'bg-red-100 text-red-900 border-2 border-red-500' : 'bg-gradient-to-r from-orange-50 to-amber-100 text-orange-950'}`}>
                      {formatIndianCurrency(calc.finalNetAmount)}
                      {calc.finalNetAmount < 0 && (
                        <AlertCircle className="w-4 h-4 text-red-600 absolute right-2 top-1/2 -translate-y-1/2" title="Negative Net Amount" />
                      )}
                    </td>

                    {/* Status */}
                    <td className="text-center py-1 px-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-full font-bold text-[8.5px] ${
                          w.paymentStatus === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {w.paymentStatus === 'APPROVED' ? 'PAID' : 'PENDING'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-center py-1 px-1">
                      <div className="flex items-center justify-center gap-1">
                        {(currentUserRole === 'OWNER' || currentUserRole === 'MANAGER') && (
                          <button
                            onClick={() => handleApprovePayment(w)}
                            className={`p-1 text-white font-bold rounded text-[9.5px] flex items-center gap-0.5 transition-colors shadow-sm ${
                              w.paymentStatus === 'APPROVED'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-[#1e3a8a] hover:bg-[#1e40af]'
                            }`}
                            title="Save & Approve Payout"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => setSlipModalWorker(w)}
                          className="p-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded text-[9.5px] flex items-center gap-0.5 transition-colors shadow-sm"
                          title="View Official Salary Slip & Print"
                        >
                          <FileText className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => generateSalarySlipPdf(w, true)}
                          className="p-1 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded text-[9.5px] flex items-center gap-0.5 transition-colors shadow-sm"
                          title="Download Portrait PDF Slip"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        
                        <button
                          onClick={() => handleDispatchSlip(w)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[9.5px] flex items-center gap-0.5 transition-colors shadow-sm"
                          title="Send WhatsApp payslip"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 shadow-md">
              <tr className="bg-slate-800 text-white font-bold text-[10px] uppercase tracking-tight">
                <td colSpan={3} className="text-right py-2 px-1.5 border-t border-slate-600">Totals:</td>
                <td className="text-center py-2 px-1 border-t border-slate-600">{avgWorkingDays.toFixed(1)} avg</td>
                <td className="text-right py-2 px-1 border-t border-slate-600">-</td>
                <td className="text-right py-2 px-1 border-t border-slate-600">{formatIndianCurrency(totals.wagesAmount)}</td>
                <td className="text-right py-2 px-1 border-t border-slate-600">{formatIndianCurrency(totals.allowanceAmount)}</td>
                <td className="text-right py-2 px-1 bg-blue-900/90 text-amber-300 border-t border-blue-700">{formatIndianCurrency(totals.grossPayment)}</td>
                <td className="text-center py-2 px-1 bg-red-900/70 text-red-200 border-t border-red-700">{formatIndianCurrency(totals.pf)}</td>
                <td className="text-center py-2 px-1 bg-red-900/70 text-red-200 border-t border-red-700">{formatIndianCurrency(totals.esi)}</td>
                <td className="text-right py-2 px-1 bg-slate-700/90 border-t border-slate-600">{formatIndianCurrency(totals.netBaseAmount)}</td>
                <td className="text-center py-2 px-1 border-t border-slate-600">-</td>
                <td className="text-right py-2 px-1 border-t border-slate-600">{formatIndianCurrency(totals.otPayment)}</td>
                <td className="text-center py-2 px-1 bg-amber-900/70 text-amber-200 border-t border-amber-700">{formatIndianCurrency(totals.otAllowance)}</td>
                <td className="text-right py-2 px-1 bg-emerald-900/90 text-emerald-300 border-t border-emerald-700">{formatIndianCurrency(totals.totalPayment)}</td>
                <td className="text-right py-2 px-1 bg-amber-900/60 text-amber-200 border-t border-amber-700">{formatIndianCurrency(totals.advanceTaken)}</td>
                <td className="text-center py-2 px-1 bg-amber-800 text-amber-100 border-t border-amber-700">{formatIndianCurrency(totals.advance)}</td>
                <td className="text-right py-2 px-1 bg-amber-900/60 text-amber-200 border-t border-amber-700">{formatIndianCurrency(totals.remainingAdvance)}</td>
                <td className="text-center py-2 px-1 bg-indigo-900/70 text-indigo-200 border-t border-indigo-700">{formatIndianCurrency(totals.extra)}</td>
                <td className="text-left py-2 px-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black border-t border-orange-400">{formatIndianCurrency(totals.finalNetAmount)}</td>
                <td colSpan={2} className="border-t border-slate-600"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* AUTHENTIC PHYSICAL "REGISTER BOOK" MODAL */}
      {drilldownWorkerId && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-2 sm:p-4 md:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseRegisterBook(); }}
        >
          <div className="bg-[#fcfaf2] rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-5xl border-2 border-[#d4af37]/40 flex flex-col max-h-[94vh] h-[94vh] sm:h-auto overflow-hidden animate-fadeIn">
            {/* REGISTER BOOK TOP BINDING HEADER */}
            <div className="bg-gradient-to-r from-[#2b1810] via-[#4a2612] to-[#2b1810] text-[#f5eed7] p-3 sm:p-4 md:p-5 flex justify-between items-center border-b-4 border-[#b8860b] shadow-md shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#b8860b]/20 border border-[#b8860b] flex items-center justify-center shadow-inner flex-shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-[#d4af37]" />
                </div>
                <div>
                  <h3 className="font-serif text-sm sm:text-lg md:text-xl font-bold tracking-wide text-[#fdf6e2] uppercase leading-tight">
                    Sri Krishna Constructions - Daily Attendance Register
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[#dfcfb0] font-sans">
                    MUSTER ROLL & ATTENDANCE RECORD • {monthName.toUpperCase()} {selectedYear}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseRegisterBook}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#f5eed7] flex items-center justify-center transition-colors flex-shrink-0 ml-2"
                title="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* REGISTER BOOK PAGE CONTENT WITH SMOOTH SCROLL */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-5 space-y-3 sm:space-y-4 bg-[#fbf9f4] font-sans overscroll-contain">
              {drilldownLoading || !drilldownData ? (
                <div className="py-16 text-center text-[#5c3a21] font-semibold flex items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#b8860b]" /> Opening attendance register page...
                </div>
              ) : (
                <>
                  {/* WORKER REGISTRY HEADER CARD */}
                  <div className="p-4 rounded-xl bg-white border border-[#e2d7c0] shadow-sm flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-lg shadow">
                        {drilldownData.worker.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-[#1e3a8a] flex items-center gap-2">
                          {drilldownData.worker.fullName}
                          <span className="text-xs font-normal text-slate-500 font-mono">({drilldownData.worker.empId})</span>
                        </h4>
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                          <span><strong>Father's Name:</strong> {drilldownData.worker.fatherName}</span>
                          <span>•</span>
                          <span><strong>Trade/Designation:</strong> {drilldownData.worker.designation}</span>
                          <span>•</span>
                          <span><strong>Mobile:</strong> {drilldownData.worker.mobileNumber}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                          <span><strong>Base Wage Rate:</strong> ₹{drilldownData.worker.dailyWage}/day</span>
                          <span>•</span>
                          <span><strong>Daily Allowance:</strong> ₹{drilldownData.worker.dailyAllowance}/day</span>
                          <span>•</span>
                          <span><strong>Advance Taken:</strong> <span className="font-bold text-slate-800 font-mono">₹{Number(drilldownData.worker.advanceTaken || drilldownData.worker.advanceBalance || 0).toLocaleString('en-IN')}</span></span>
                          <span>•</span>
                          <span><strong>Advance Balance:</strong> <span className="font-bold text-amber-900 font-mono">₹{Number(drilldownData.worker.advanceBalance || 0).toLocaleString('en-IN')}</span></span>
                          {drilldownData.worker.otAllowance > 0 && (
                            <>
                              <span>•</span>
                              <span><strong>OT Allowance:</strong> <span className="font-bold text-amber-800 font-mono">₹{Number(drilldownData.worker.otAllowance).toLocaleString('en-IN')}</span></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* DIVISION DAYS SUMMARY BADGES */}
                    <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4 min-w-[220px]">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#1e3a8a]" /> Division Breakdown (Days)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys(drilldownData.divisionSummary || {}).length === 0 ? (
                          <span className="text-xs text-slate-400">No attendance logged</span>
                        ) : (
                          Object.entries(drilldownData.divisionSummary).map(([div, days]: any) => (
                            <span
                              key={div}
                              className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 font-bold rounded-lg text-xs flex items-center gap-1"
                            >
                              <span>{div}:</span>
                              <span className="text-amber-700 font-mono">{days}d</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MONTHLY SUMMARY METRICS STRIP */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 block">Present Days</span>
                      <span className="text-base font-bold font-mono text-emerald-900">{drilldownData.summary.totalPresent}</span>
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-[10px] font-bold uppercase text-amber-700 block">Half Days</span>
                      <span className="text-base font-bold font-mono text-amber-900">{drilldownData.summary.totalHalfDay}</span>
                    </div>
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-[10px] font-bold uppercase text-red-700 block">Absent Days</span>
                      <span className="text-base font-bold font-mono text-red-900">{drilldownData.summary.totalAbsent}</span>
                    </div>
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-[10px] font-bold uppercase text-blue-700 block">Leave Days</span>
                      <span className="text-base font-bold font-mono text-blue-900">{drilldownData.summary.totalLeave}</span>
                    </div>
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <span className="text-[10px] font-bold uppercase text-indigo-700 block">Total OT Hours</span>
                      <span className="text-base font-bold font-mono text-indigo-900">{drilldownData.summary.totalOtHours}h</span>
                    </div>
                    <div className="p-2.5 bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-300 rounded-lg">
                      <span className="text-[10px] font-extrabold uppercase text-orange-950 block">Net Working Days</span>
                      <span className="text-base font-black font-mono text-orange-950">{drilldownData.summary.totalWorkingDays}</span>
                    </div>
                  </div>

                  {/* PHYSICAL REGISTER STYLE DATE-WISE TABLE (WITH HORIZONTAL SCROLL) */}
                  <div className="border-2 border-[#d1c7b7] rounded-xl overflow-x-auto shadow-sm bg-white touch-pan-x w-full">
                    <table className="w-full text-left text-xs min-w-[620px]">
                      <thead className="bg-[#f0eadd] text-[#4a2e18] border-b-2 border-[#d1c7b7] font-serif uppercase tracking-wider">
                        <tr>
                          <th className="p-2.5 text-center w-12 border-r border-[#d1c7b7]">Day</th>
                          <th className="p-2.5 min-w-[100px] border-r border-[#d1c7b7]">Date</th>
                          <th className="p-2.5 text-center min-w-[60px] border-r border-[#d1c7b7]">Weekday</th>
                          <th className="p-2.5 min-w-[140px] border-r border-[#d1c7b7]">Division Worked</th>
                          <th className="p-2.5 text-center min-w-[120px] border-r border-[#d1c7b7]">Status Stamp</th>
                          <th className="p-2.5 text-center min-w-[80px] border-r border-[#d1c7b7]">OT Hours</th>
                          <th className="p-2.5 min-w-[160px]">Remarks / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e8e0d0] font-sans">
                        {drilldownData.days.map((d: any) => {
                          const isSunday = d.isSunday;

                          return (
                            <tr
                              key={d.dateStr}
                              className={`${
                                d.status === 'PRESENT'
                                  ? 'hover:bg-emerald-50/40 bg-emerald-50/10'
                                  : d.status === 'HALF_DAY'
                                  ? 'hover:bg-amber-50/40 bg-amber-50/10'
                                  : d.status === 'ABSENT'
                                  ? 'bg-red-50/20'
                                  : d.status === 'LEAVE'
                                  ? 'bg-blue-50/20'
                                  : isSunday
                                  ? 'bg-[#f7f3ea]/80 text-slate-400'
                                  : 'hover:bg-amber-50/20'
                              } transition-colors`}
                            >
                              <td className="p-2 text-center font-mono font-bold text-slate-500 border-r border-[#e8e0d0]">
                                {d.dayNumber}
                              </td>
                              <td className="p-2 font-mono text-slate-700 border-r border-[#e8e0d0]">
                                {formatDateDMY(d.dateStr)}
                              </td>
                              <td className={`p-2 text-center font-bold border-r border-[#e8e0d0] ${isSunday ? 'text-red-500' : 'text-slate-600'}`}>
                                {d.dayName}
                              </td>
                              <td className="p-2 font-semibold text-[#1e3a8a] border-r border-[#e8e0d0]">
                                {d.status === 'PRESENT' || d.status === 'HALF_DAY' ? (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    {d.divisionName}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-center border-r border-[#e8e0d0]">
                                {d.status === 'PRESENT' && (
                                  <span className="px-2.5 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-400">
                                    [P] PRESENT
                                  </span>
                                )}
                                {d.status === 'HALF_DAY' && (
                                  <span className="px-2.5 py-0.5 rounded font-black text-[10px] bg-amber-100 text-amber-800 border border-amber-400">
                                    [HD] HALF DAY
                                  </span>
                                )}
                                {d.status === 'ABSENT' && (
                                  <span className="px-2.5 py-0.5 rounded font-black text-[10px] bg-red-100 text-red-800 border border-red-400">
                                    [A] ABSENT
                                  </span>
                                )}
                                {d.status === 'LEAVE' && (
                                  <span className="px-2.5 py-0.5 rounded font-black text-[10px] bg-blue-100 text-blue-800 border border-blue-400">
                                    [L] LEAVE
                                  </span>
                                )}
                                {d.status === 'HOLIDAY' && (
                                  <span className="px-2.5 py-0.5 rounded font-black text-[10px] bg-slate-100 text-slate-600 border border-slate-300">
                                    [H] SUNDAY
                                  </span>
                                )}
                                {d.status === 'NOT_MARKED' && (
                                  <span className="px-2 py-0.5 text-[10px] text-slate-400">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-center font-mono font-bold border-r border-[#e8e0d0]">
                                {d.overtimeHours > 0 ? (
                                  <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                    {d.overtimeHours}h
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-2 text-slate-600 text-[11px]">
                                {d.notes || (d.markedBy ? `Recorded by ${d.markedBy}` : '-')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="bg-[#f0eadd] p-3 border-t border-[#d1c7b7] flex justify-end">
              <button
                onClick={handleCloseRegisterBook}
                className="px-5 py-2 bg-[#2b1810] hover:bg-[#4a2612] text-[#fdf6e2] font-bold text-xs rounded-lg shadow"
              >
                Close Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXACT SALARY SLIP ON-SCREEN MODAL PREVIEW ================= */}
      {slipModalWorker && (() => {
        const w = slipModalWorker;
        const calc = getRowCalculations(w);
        const monthObj = months.find(m => m.value === selectedMonth);
        const fallbackMonth = months[new Date().getMonth()]?.name || '';
        const mName = monthObj ? monthObj.name.toUpperCase() : fallbackMonth.toUpperCase();
        const basicPlusAllowDaily = (parseFloat(calc.dailyWage) || 0) + (parseFloat(calc.dailyAllowance) || 0);
        const basicPlusAllowAmount = (parseFloat(calc.wagesAmount) || 0) + (parseFloat(calc.allowanceAmount) || 0);
        const otRateDaily = Math.round(parseFloat(w.otHourlyRate) || ((parseFloat(calc.dailyWage) || 0) / 8));
        const totalDeductions = (parseFloat(calc.pf) || 0) + (parseFloat(calc.esi) || 0) + (parseFloat(calc.advance) || 0);
        const placeWork = (w.placeOfWork || w.divisionName || 'GENERAL').toUpperCase();
        const natureWork = (w.natureOfWork || 'MAINTENANCE').toUpperCase();

        return (
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setSlipModalWorker(null); }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-slate-300 flex flex-col max-h-[96vh] overflow-hidden animate-fadeIn my-auto">
              {/* SLIP MODAL HEADER BAR */}
              <div className="bg-[#1e3a8a] text-white p-3 sm:p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">
                      Official Salary Slip Preview • {w.fullName}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-blue-200">
                      {mName} {selectedYear} • Portrait Mode Format
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateSalarySlipPdf(w, true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow"
                    title="Download Portrait PDF"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button
                    onClick={() => setSlipModalWorker(null)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* SLIP BODY (EXACT VISUAL MATCH TO SCREENSHOT) */}
              <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 flex justify-center">
                <div className="bg-white p-5 sm:p-6 rounded shadow-md border border-slate-300 w-full max-w-2xl text-black font-sans text-xs">
                  
                  {/* UNIFIED OUTER BOX WITH CLEAN INTERNAL BORDERS */}
                  <div className="border border-black">

                    {/* 1. TOP 3-COLUMN HEADER */}
                    <div className="grid grid-cols-12 border-b border-black">
                      {/* Left: Sri Krishna Constructions */}
                      <div className="col-span-4 p-2.5 border-r border-black text-center flex flex-col justify-center">
                        <h2 className="font-bold text-xs sm:text-[13px] tracking-tight leading-tight">
                          SRI KRISHNA CONSTRUCTIONS
                        </h2>
                        <p className="text-[10px] mt-1.5 leading-tight text-slate-800">
                          H.NO 2436 RAGHAVENDRA<br />
                          COLONY SHAKTINAGAR RAICHUR-<br />
                          584170
                        </p>
                      </div>

                      {/* Center: Logo / Salary Slip */}
                      <div className="col-span-3 border-r border-black flex flex-col items-center justify-between text-center bg-white">
                        <div className="w-full bg-slate-200 border-b border-black py-1 font-bold text-[11px] uppercase tracking-wider">
                          SALARY SLIP
                        </div>
                        <div className="py-1 flex flex-col items-center justify-center">
                          {/* REAL EXTRACTED HD LOGO IMAGE FROM EXCEL */}
                          <img
                            src={logoBase64 || '/api/logo/skc-logo'}
                            alt="SKC Logo"
                            className="h-14 w-auto max-w-[110px] object-contain"
                            onError={(e) => {
                              // If image fails, render styled emblem
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          {/* Fallback emblem if image endpoint is offline */}
                          <div className="hidden flex-col items-center justify-center">
                            <div className="w-11 h-11 rounded-full border-2 border-[#d4af37] bg-[#1e293b] flex flex-col items-center justify-center shadow">
                              <span className="text-[#f59e0b] font-black text-xs">SKC</span>
                              <span className="text-[5.5px] text-amber-200 font-bold">ESTD 2019</span>
                            </div>
                            <div className="text-[8px] font-black text-slate-900 mt-0.5">SALES & SERVICE</div>
                          </div>
                        </div>
                        <div className="h-0.5"></div>
                      </div>

                      {/* Right: Establishment Details */}
                      <div className="col-span-5 p-2 text-center flex flex-col justify-center">
                        <h3 className="font-bold text-[9px] sm:text-[10px] leading-tight">
                          NAME OF ESTABLISHMENT UNDER<br />WHICH WORK CARRIED ON
                        </h3>
                        <p className="text-[9px] mt-1 leading-tight font-medium text-slate-800">
                          KARNATAKA POWER CORPORATION LIMITED RAICHUR THERMAL POWER STATION SHAKTINAGAR-584170 Dist: Raichur
                        </p>
                      </div>
                    </div>

                    {/* 2. PAY SLIP MONTH BAR */}
                    <div className="bg-slate-200 border-b border-black py-1 text-center font-bold text-xs tracking-wide">
                      PAY SLIP FOR THE MONTH OF &nbsp; {mName} -{selectedYear}
                    </div>

                    {/* 3. EMPLOYEE & STATUTORY DETAILS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-black text-[10px] sm:text-[11px]">
                      {/* Left details */}
                      <div className="p-2 space-y-1 sm:border-r border-black">
                        <div><span className="font-bold">NAME:</span> <span className="font-semibold uppercase">{w.fullName}</span></div>
                        <div><span className="font-bold">FATHER NAME:</span> <span className="uppercase">{w.fatherName || '-'}</span></div>
                        <div><span className="font-bold">DESIGNATION:</span> <span className="uppercase">{w.designation || 'WORKER'}</span></div>
                        <div className="bg-emerald-50/60 p-0.5 border border-emerald-300 rounded-sm">
                          <span className="font-bold text-emerald-950">PLACE OF WORK:</span> <span className="font-semibold text-emerald-950">{placeWork}</span>
                        </div>
                        <div><span className="font-bold">NATURE OF WORK:</span> <span className="uppercase">{natureWork}</span></div>
                      </div>

                      {/* Right details */}
                      <div className="p-2 space-y-1">
                        <div><span className="font-bold">PF ACCOUNT NO :</span> <span className="font-mono">{w.pfNumber || 'GBRCH1955403000'}</span></div>
                        <div><span className="font-bold">ESI EMPLOYES'S Code:</span> <span className="font-mono">{w.esiNumber || '71000088340001099'}</span></div>
                        <div className="flex justify-between">
                          <div><span className="font-bold">UAN NO:</span> <span className="font-mono">{w.uanNumber || '100493430949'}</span></div>
                          <div><span className="font-bold">ESI:</span> <span className="font-mono">{w.esiNumber?.slice(-10) || '7118394300'}</span></div>
                        </div>
                        <div><span className="font-bold">BANK ACCOUNT NO:</span> <span className="font-mono">{w.bankAccountNo || '06222200019793'}</span></div>
                        <div><span className="font-bold">IFSC CODE:</span> <span className="font-mono uppercase">{w.ifscCode || 'CNRB0010622'}</span></div>
                      </div>
                    </div>

                    {/* 4. EARNINGS & DEDUCTIONS TABLE */}
                    <table className="w-full border-collapse text-[10px] sm:text-[11px]">
                      <thead>
                        <tr className="bg-slate-200 border-b border-black">
                          <th className="p-1.5 text-left border-r border-black w-[28%] font-bold">EARNINGS</th>
                          <th className="p-1.5 text-center border-r border-black w-[10%] font-bold">RATE</th>
                          <th className="p-1.5 text-center border-r border-black w-[10%] font-bold">DAYS</th>
                          <th className="p-1.5 text-right border-r border-black w-[14%] font-bold">AMOUNT</th>
                          <th className="p-1.5 text-left border-r border-black w-[24%] font-bold">DEDUCTION</th>
                          <th className="p-1.5 text-right w-[14%] font-bold">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {/* Row 1: Basic + Allowance vs PF */}
                        <tr>
                          <td className="p-1.5 font-bold border-r border-black">BASIC +ALLOWANCE</td>
                          <td className="p-1.5 text-center border-r border-black font-mono">{basicPlusAllowDaily || '-'}</td>
                          <td className="p-1.5 text-center border-r border-black font-mono">{calc.workingDays ? calc.workingDays.toFixed(0) : '0'}</td>
                          <td className="p-1.5 text-right border-r border-black font-mono">{basicPlusAllowAmount.toFixed(0)}</td>
                          <td className="p-1.5 font-bold border-r border-black">PROCIDENT FUND</td>
                          <td className="p-1.5 text-right font-mono">{calc.pf ? calc.pf.toFixed(0) : '0'}</td>
                        </tr>

                        {/* Row 2: OT Wages vs ESI */}
                        <tr>
                          <td className="p-1.5 font-bold border-r border-black">OT WAGES/ OT HOURS</td>
                          <td className="p-1.5 text-center border-r border-black font-mono">{otRateDaily || '-'}</td>
                          <td className="p-1.5 text-center border-r border-black font-mono">{calc.otHours ? calc.otHours.toFixed(0) : '0'}</td>
                          <td className="p-1.5 text-right border-r border-black font-mono">{calc.otPayment ? calc.otPayment.toFixed(1) : '0'}</td>
                          <td className="p-1.5 font-bold border-r border-black">ESI</td>
                          <td className="p-1.5 text-right font-mono">{calc.esi ? calc.esi.toFixed(0) : '0'}</td>
                        </tr>

                        {/* Row 3: Extra vs LIC / Union Fee */}
                        <tr>
                          <td className="p-1.5 font-bold border-r border-black">EXTRA</td>
                          <td className="p-1.5 text-center border-r border-black"></td>
                          <td className="p-1.5 text-center border-r border-black"></td>
                          <td className="p-1.5 text-right border-r border-black font-mono">{calc.extra ? calc.extra.toFixed(0) : ''}</td>
                          <td className="p-1.5 font-bold border-r border-black">LIC/UNION FEE</td>
                          <td className="p-1.5 text-right font-mono">0</td>
                        </tr>

                        {/* Row 4: Advance */}
                        <tr>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 font-bold border-r border-black">ADVANCE</td>
                          <td className="p-1.5 text-right font-mono">{calc.advanceTaken ? calc.advanceTaken.toFixed(0) : '0'}</td>
                        </tr>

                        {/* Row 5: Deducted Advance */}
                        <tr>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 font-bold border-r border-black">DEDUCTED ADVANCE</td>
                          <td className="p-1.5 text-right font-mono">{calc.advance ? calc.advance.toFixed(0) : '0'}</td>
                        </tr>

                        {/* Row 6: Balance Advance */}
                        <tr>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 font-bold border-r border-black">BALANCE ADVANCE</td>
                          <td className="p-1.5 text-right font-mono">{calc.remainingAdvance ? calc.remainingAdvance.toFixed(0) : '0'}</td>
                        </tr>

                        {/* Row 7: Totals */}
                        <tr className="font-bold bg-slate-100/60">
                          <td className="p-1.5 border-r border-black">TOTAL AMOUNT</td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 border-r border-black"></td>
                          <td className="p-1.5 text-right border-r border-black font-mono font-bold">
                            {(basicPlusAllowAmount + calc.otPayment + calc.extra).toFixed(1)}
                          </td>
                          <td className="p-1.5 border-r border-black font-bold">DEDUCTION TOTAL</td>
                          <td className="p-1.5 text-right font-mono font-bold">{totalDeductions.toFixed(0)}</td>
                        </tr>

                        {/* Row 8: Net Amount */}
                        <tr className="font-black text-xs bg-slate-200">
                          <td className="p-2 border-r border-black" colSpan={4}></td>
                          <td className="p-2 border-r border-black uppercase text-right">NET AMOUNT :</td>
                          <td className="p-2 text-right font-mono text-sm">{calc.finalNetAmount.toFixed(0)}</td>
                        </tr>
                      </tbody>
                    </table>

                  </div>

                  {/* 5. SIGNATURE & STAMP */}
                  <div className="mt-8 pt-4 flex justify-between items-end text-xs">
                    <div className="text-center">
                      <div className="w-44 border-t border-black mb-1"></div>
                      <div className="font-semibold text-slate-700 text-[11px]">Worker's Signature / Thumb</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold mb-8 text-[11px]">For SRI KRISHNA CONSTRUCTIONS</div>
                      <div className="w-44 border-t border-black mb-1 mx-auto"></div>
                      <div className="font-semibold text-slate-700 text-[11px]">Authorized Signatory</div>
                    </div>
                  </div>

                  <div className="text-center text-[9px] text-slate-400 mt-4">
                    This is an authentic computer-generated pay slip for Sri Krishna Constructions • ESTD 2019
                  </div>

                </div>
              </div>

              {/* SLIP MODAL FOOTER */}
              <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                <span className="text-xs text-slate-500">
                  Worker ID: <strong className="font-mono text-slate-800">{w.empId}</strong> • Mobile: <strong className="font-mono text-slate-800">{w.mobileNumber}</strong>
                </span>
                <div className="flex flex-wrap gap-2">
                  {/* Free Direct WhatsApp Link with pre-formatted breakdown */}
                  <button
                    onClick={() => {
                      let rawPhone = (w.mobileNumber || '').trim().replace(/[^0-9]/g, '');
                      // Normalize Indian phone number
                      if (rawPhone.length === 10) {
                        rawPhone = '91' + rawPhone;
                      } else if (rawPhone.length === 12 && rawPhone.startsWith('91')) {
                        // Already valid
                      } else if (rawPhone.length > 10 && rawPhone.startsWith('0')) {
                        rawPhone = '91' + rawPhone.substring(1);
                      }

                      if (!rawPhone || rawPhone.length < 10) {
                        showToast('Worker does not have a valid 10-digit mobile number!', 'error');
                        return;
                      }

                      const mName = (months.find(m => m.value === selectedMonth)?.name || 'Month').toUpperCase();
                      const messageText = 
                        `*SRI KRISHNA CONSTRUCTIONS* - SALARY SLIP\n` +
                        `------------------------------\n` +
                        `Dear *${w.fullName}*,\n` +
                        `Your Salary Slip for *${mName} ${selectedYear}* has been calculated & approved:\n\n` +
                        `• Present / Working Days: *${calc.workingDays} days*\n` +
                        `• Daily Wage + Allowance: *₹${(parseFloat(calc.dailyWage) || 0) + (parseFloat(calc.dailyAllowance) || 0)}/day*\n` +
                        `• Gross Earnings: *₹${calc.grossPayment}*\n` +
                        `• Total Earnings (incl. OT): *₹${calc.totalPayment}*\n` +
                        `• PF Deducted: *₹${calc.pf}*\n` +
                        `• ESI Deducted: *₹${calc.esi}*\n` +
                        `• Advance Deducted: *₹${calc.advance}*\n` +
                        `• Remaining Advance Balance: *₹${calc.remainingAdvance}*\n` +
                        `------------------------------\n` +
                        `*NET TAKE-HOME SALARY: ₹${calc.finalNetAmount}*\n` +
                        `------------------------------\n` +
                        `Salary disbursed. Thank you!`;

                      const waUrl = `https://api.whatsapp.com/send?phone=${rawPhone}&text=${encodeURIComponent(messageText)}`;
                      
                      // Reliable cross-browser opening
                      const win = window.open(waUrl, '_blank');
                      if (!win || win.closed || typeof win.closed === 'undefined') {
                        window.location.href = waUrl;
                      }
                    }}
                    className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95"
                    title="Send Free Salary Breakdown to Worker on WhatsApp without API bill"
                  >
                    <Send className="w-4 h-4" /> Send on WhatsApp
                  </button>

                  {/* Direct PDF Web Share API (Attach PDF directly to WhatsApp/Telegram on Mobile) */}
                  {'share' in navigator && (
                    <button
                      onClick={async () => {
                        try {
                          const doc = generateSalarySlipPdf(w, false);
                          if (doc) {
                            const pdfBlob = doc.output('blob');
                            const pdfFile = new File([pdfBlob], `${w.fullName.replaceAll(' ', '_')}_Payslip_${selectedMonth}_${selectedYear}.pdf`, { type: 'application/pdf' });
                            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                              await navigator.share({
                                files: [pdfFile],
                                title: `Payslip - ${w.fullName}`,
                                text: `Salary Slip of ${w.fullName} for ${months.find(m => m.value === selectedMonth)?.name} ${selectedYear} from Sri Krishna Constructions.`,
                              });
                            } else {
                              doc.save(`${w.fullName}_Payslip.pdf`);
                            }
                          }
                        } catch (e) {
                          console.log('Share error or cancelled', e);
                        }
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95"
                      title="Share PDF file directly to WhatsApp"
                    >
                      <Share2 className="w-4 h-4" /> Share PDF File
                    </button>
                  )}

                  <button
                    onClick={() => generateSalarySlipPdf(w, true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button
                    onClick={() => setSlipModalWorker(null)}
                    className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
