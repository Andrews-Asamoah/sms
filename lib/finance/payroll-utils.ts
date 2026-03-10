/**
 * Ghanaian Payroll Calculation Utilities
 * Based on GRA and SSNIT standards
 */

export const SSNIT_RATE_EMPLOYEE = 0.055; // 5.5%
export const SSNIT_RATE_EMPLOYER = 0.13; // 13.0%

/**
 * Calculate SSNIT deductions
 * @param basicSalary
 * @returns { employee: number, employer: number, total: number }
 */
export function calculateSSNIT(basicSalary: number) {
  const employee = basicSalary * SSNIT_RATE_EMPLOYEE;
  const employer = basicSalary * SSNIT_RATE_EMPLOYER;
  return {
    employee,
    employer,
    total: employee + employer,
  };
}

/**
 * Calculate PAYE (Pay As You Earn) Tax
 * 2024 Tax Bands (Approximate - should ideally be configurable or fetched)
 * First GHS 490: 0%
 * Next GHS 110: 5%
 * Next GHS 130: 10%
 * Next GHS 3,000: 17.5%
 * Next GHS 16,395: 25%
 * Next GHS 29,875: 30%
 * Beyond GHS 50,000: 35%
 */
export function calculatePAYE(taxableIncome: number) {
  let tax = 0;
  let remaining = taxableIncome;

  const bands = [
    { limit: 490, rate: 0 },
    { limit: 110, rate: 0.05 },
    { limit: 130, rate: 0.1 },
    { limit: 3000, rate: 0.175 },
    { limit: 16395, rate: 0.25 },
    { limit: 29875, rate: 0.3 },
    { limit: Infinity, rate: 0.35 },
  ];

  for (const band of bands) {
    if (remaining <= 0) break;
    const taxableAtThisBand = Math.min(remaining, band.limit);
    tax += taxableAtThisBand * band.rate;
    remaining -= taxableAtThisBand;
  }

  return tax;
}

/**
 * Calculate full payroll breakdown
 */
export function calculatePayrollBreakdown(
  basicSalary: number,
  allowances: number = 0,
  otherDeductions: number = 0,
) {
  const { employee: ssnitEmployee, employer: ssnitEmployer } =
    calculateSSNIT(basicSalary);

  // Taxable income is Gross minus Employee SSNIT
  const grossSalary = basicSalary + allowances;
  const taxableIncome = grossSalary - ssnitEmployee;

  const incomeTax = calculatePAYE(taxableIncome);

  const netSalary = grossSalary - ssnitEmployee - incomeTax - otherDeductions;

  return {
    basicSalary,
    allowances,
    grossSalary,
    ssnitEmployee,
    ssnitEmployer,
    incomeTax,
    otherDeductions,
    netSalary,
  };
}
