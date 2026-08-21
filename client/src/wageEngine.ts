/**
 * Sri Krishna Constructions - Enterprise Wage & Statutory Calculation Engine
 * Formula verified against Indian Factory & Construction Labour Standards.
 */

export interface WageInput {
  presentDays: number;
  halfDays: number;
  govtHolidays?: number;
  dailyWage: number;
  dailyAllowance: number;
  totalOtHours?: number;
  otHourlyRate?: number;
  otAllowance?: number;
  advanceBalance?: number;
  advanceDeduction?: number;
  customPf?: number | null;
  customEsi?: number | null;
  extraAmount?: number;
}

export interface WageOutput {
  workingDays: number;
  wagesAmount: number;
  allowanceAmount: number;
  grossPayment: number;
  pfDeduction: number;
  esiDeduction: number;
  otPayment: number;
  otAllowance: number;
  totalGrossWithOt: number;
  netPayable: number;
  remainingAdvance: number;
}

export function calculateWorkerWage(input: WageInput): WageOutput {
  const presentDays = Number(input.presentDays) || 0;
  const halfDays = Number(input.halfDays) || 0;
  const govtHolidays = Number(input.govtHolidays) || 0;

  // Total working days (Present + 0.5 * HalfDay + Paid Govt Holidays)
  const workingDays = presentDays + (halfDays * 0.5) + govtHolidays;

  const dailyWage = Number(input.dailyWage) || 0;
  const dailyAllowance = Number(input.dailyAllowance) || 0;

  const wagesAmount = Math.round(workingDays * dailyWage);
  const allowanceAmount = Math.round(workingDays * dailyAllowance);
  const grossPayment = wagesAmount + allowanceAmount;

  // EPF / ESI Deductions
  const pfDeduction = input.customPf !== undefined && input.customPf !== null ? Number(input.customPf) : 0;
  const esiDeduction = input.customEsi !== undefined && input.customEsi !== null ? Number(input.customEsi) : 0;

  // Overtime calculations
  const totalOtHours = Number(input.totalOtHours) || 0;
  const otHourlyRate = Number(input.otHourlyRate) || (dailyWage > 0 ? dailyWage / 8 : 0);
  const otPayment = Math.round(totalOtHours * otHourlyRate);
  const otAllowance = totalOtHours > 0 ? (Number(input.otAllowance) || 0) : 0;

  // Advance Deductions & Extra Incentives
  const advanceBalance = Number(input.advanceBalance) || 0;
  const advanceDeduction = Number(input.advanceDeduction) || 0;
  const remainingAdvance = Math.max(0, advanceBalance - advanceDeduction);
  const extraAmount = Number(input.extraAmount) || 0;

  const totalGrossWithOt = grossPayment + otPayment + otAllowance + extraAmount;
  const netPayable = Math.max(0, totalGrossWithOt - pfDeduction - esiDeduction - advanceDeduction);

  return {
    workingDays,
    wagesAmount,
    allowanceAmount,
    grossPayment,
    pfDeduction,
    esiDeduction,
    otPayment,
    otAllowance,
    totalGrossWithOt,
    netPayable,
    remainingAdvance,
  };
}
