"use client";

export type AccountIcon = "bank" | "chart" | "lock" | "shield";

export interface FinancialGoal {
  name: string;
  target: number;
  timeline_months: number;
  current_savings: number;
}

export interface LinkedAccount {
  type: string;
  provider: string;
  number: string;
  balance: string;
  balance_value: number;
  icon: AccountIcon;
}

export interface SetuTransaction {
  date: string;
  narration: string;
  amount: number;
  type: string;
}

export interface SetuBankAccount {
  type: string;
  bank: string;
  account_number: string;
  balance: number;
  transactions?: SetuTransaction[];
}

export interface SetuDeposit {
  type: string;
  bank: string;
  amount: number;
  rate: number;
  maturity: string;
}

export interface SetuHolding {
  name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  value: number;
}

export interface SetuAaData {
  consent_status?: string;
  accounts?: SetuBankAccount[];
  deposits?: SetuDeposit[];
  nsdl_holdings?: SetuHolding[];
}

export interface FinancialProfile {
  user_id: string;
  name: string;
  age: number;
  occupation: string;
  city: string;
  annual_income: number;
  monthly_take_home: number;
  monthly_expenses: number;
  monthly_savings: number;
  health_score: number;
  cash_balance: number;
  investments: Record<string, number>;
  emergency_fund: number;
  insurance: Record<string, number>;
  loans: Array<{
    loan_type: string;
    outstanding: number;
    emi: number;
    rate: number;
    remaining_months: number;
  }>;
  goals: FinancialGoal[];
  risk_profile: string;
  tax_regime: string;
  has_hra: boolean;
  rent_paid: number;
  metro_city: boolean;
  linked_accounts: LinkedAccount[];
  onboarding_completed: boolean;
  last_synced_at?: string;
}

export interface AppProfileState {
  profile: FinancialProfile;
  aa_data: SetuAaData | null;
}

export const APP_PROFILE_STORAGE_KEY = "et-money-mentor.profile";

export const FALLBACK_AA_DATA: SetuAaData = {
  consent_status: "APPROVED",
  accounts: [
    {
      type: "SAVINGS",
      bank: "HDFC Bank",
      account_number: "XXXX1234",
      balance: 285000,
      transactions: [
        { date: "2026-03-01", narration: "SALARY - TCS Ltd", amount: 104000, type: "CREDIT" },
        { date: "2026-03-10", narration: "EMI - Education Loan", amount: -8000, type: "DEBIT" },
      ],
    },
  ],
  deposits: [
    { type: "FD", bank: "SBI", amount: 100000, rate: 7.1, maturity: "2027-06-15" },
  ],
  nsdl_holdings: [
    { name: "Reliance Industries", quantity: 5, avg_price: 2400, current_price: 2850, value: 14250 },
    { name: "TCS", quantity: 10, avg_price: 3200, current_price: 3580, value: 35800 },
  ],
};

export function formatInr(value: number) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

export function getInvestmentLabel(key: string) {
  const labels: Record<string, string> = {
    ppf: "PPF",
    elss: "ELSS",
    equity_mf: "Equity MF",
    fd: "FD",
    epf: "EPF",
    nps: "NPS",
    stocks: "Stocks",
    gold: "Gold",
  };
  return labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function createDefaultFinancialProfile(name = "Rahul Sharma"): FinancialProfile {
  const monthly_take_home = 104000;
  const monthly_expenses = 45000;
  const loans = [
    { loan_type: "education", outstanding: 300000, emi: 8000, rate: 8.5, remaining_months: 42 },
  ];
  const monthly_savings = monthly_take_home - monthly_expenses - loans.reduce((sum, loan) => sum + loan.emi, 0);

  return {
    user_id: "demo_user",
    name,
    age: 28,
    occupation: "Software Engineer",
    city: "Bangalore",
    annual_income: 1500000,
    monthly_take_home,
    monthly_expenses,
    monthly_savings,
    health_score: 62,
    cash_balance: 0,
    investments: {
      ppf: 300000,
      elss: 200000,
      equity_mf: 150000,
      fd: 100000,
      epf: 450000,
      nps: 0,
      stocks: 50000,
      gold: 0,
    },
    emergency_fund: 200000,
    insurance: { term_life: 0, health: 500000, accident: 0 },
    loans,
    goals: [
      { name: "Emergency Fund", target: 540000, timeline_months: 12, current_savings: 200000 },
      { name: "Marriage", target: 2000000, timeline_months: 36, current_savings: 0 },
      { name: "House Down Payment", target: 3000000, timeline_months: 60, current_savings: 0 },
      { name: "Retirement", target: 50000000, timeline_months: 384, current_savings: 450000 },
    ],
    risk_profile: "moderate",
    tax_regime: "new",
    has_hra: true,
    rent_paid: 20000,
    metro_city: true,
    linked_accounts: [],
    onboarding_completed: false,
  };
}

export function createInitialAppProfileState(): AppProfileState {
  return {
    profile: createDefaultFinancialProfile(),
    aa_data: null,
  };
}

function cloneProfile(profile: FinancialProfile): FinancialProfile {
  return JSON.parse(JSON.stringify(profile)) as FinancialProfile;
}

function detectMonthlyIncome(aaData: SetuAaData | null, fallback: number) {
  const transactions = aaData?.accounts?.flatMap((account) => account.transactions || []) || [];
  const salaryCredit = transactions.find(
    (txn) => txn.amount > 0 && /salary/i.test(txn.narration || "")
  );
  return salaryCredit?.amount || fallback;
}

export function buildLinkedAccounts(aaData: SetuAaData | null): LinkedAccount[] {
  if (!aaData) return [];

  const bankAccounts = (aaData.accounts || []).map((account) => ({
    type: `${account.type || "Bank"} Account`,
    provider: account.bank || "Linked Bank",
    number: account.account_number || "Linked account",
    balance: formatInr(account.balance || 0),
    balance_value: account.balance || 0,
    icon: "bank" as const,
  }));

  const deposits = (aaData.deposits || []).map((deposit) => ({
    type: deposit.type || "Deposit",
    provider: deposit.bank || "Linked Deposit",
    number: deposit.maturity ? `Matures ${deposit.maturity}` : "Linked deposit",
    balance: formatInr(deposit.amount || 0),
    balance_value: deposit.amount || 0,
    icon: "lock" as const,
  }));

  const holdingsTotal = (aaData.nsdl_holdings || []).reduce((sum, holding) => sum + (holding.value || 0), 0);
  const holdings =
    holdingsTotal > 0
      ? [
          {
            type: "Demat Holdings",
            provider: "NSDL",
            number: `${aaData.nsdl_holdings?.length || 0} holdings`,
            balance: formatInr(holdingsTotal),
            balance_value: holdingsTotal,
            icon: "chart" as const,
          },
        ]
      : [];

  return [...bankAccounts, ...deposits, ...holdings];
}

export function buildProfileFromOnboarding(
  name: string,
  aaData: SetuAaData | null,
  currentProfile?: FinancialProfile
): FinancialProfile {
  const base = currentProfile ? cloneProfile(currentProfile) : createDefaultFinancialProfile();
  const linkedAccounts = buildLinkedAccounts(aaData);
  const cashBalance = (aaData?.accounts || []).reduce((sum, account) => sum + (account.balance || 0), 0);
  const fdAmount = (aaData?.deposits || []).reduce((sum, deposit) => sum + (deposit.amount || 0), 0);
  const stockValue = (aaData?.nsdl_holdings || []).reduce((sum, holding) => sum + (holding.value || 0), 0);
  const monthlyTakeHome = detectMonthlyIncome(aaData, base.monthly_take_home);
  const monthlySavings =
    monthlyTakeHome - base.monthly_expenses - base.loans.reduce((sum, loan) => sum + (loan.emi || 0), 0);

  return {
    ...base,
    name: name.trim() || base.name,
    monthly_take_home: monthlyTakeHome,
    monthly_savings: monthlySavings,
    cash_balance: cashBalance || base.cash_balance,
    investments: {
      ...base.investments,
      fd: fdAmount || base.investments.fd || 0,
      stocks: stockValue || base.investments.stocks || 0,
    },
    linked_accounts: linkedAccounts,
    onboarding_completed: true,
    last_synced_at: new Date().toISOString(),
  };
}

export function getPortfolioValue(profile: FinancialProfile) {
  return Object.values(profile.investments).reduce((sum, value) => sum + value, 0);
}

export function getNetWorth(profile: FinancialProfile) {
  return getPortfolioValue(profile) + profile.cash_balance;
}

export function getFirstName(profile: FinancialProfile) {
  return (profile.name || "there").trim().split(/\s+/)[0] || "there";
}

export function loadStoredAppProfileState(): AppProfileState {
  if (typeof window === "undefined") {
    return createInitialAppProfileState();
  }

  try {
    const raw = window.localStorage.getItem(APP_PROFILE_STORAGE_KEY);
    if (!raw) {
      return createInitialAppProfileState();
    }

    const parsed = JSON.parse(raw) as Partial<AppProfileState>;
    const fallback = createDefaultFinancialProfile(parsed.profile?.name || "Rahul Sharma");

    return {
      profile: {
        ...fallback,
        ...parsed.profile,
        investments: {
          ...fallback.investments,
          ...(parsed.profile?.investments || {}),
        },
        insurance: {
          ...fallback.insurance,
          ...(parsed.profile?.insurance || {}),
        },
        loans: parsed.profile?.loans || fallback.loans,
        goals: parsed.profile?.goals || fallback.goals,
        linked_accounts: parsed.profile?.linked_accounts || [],
      },
      aa_data: parsed.aa_data || null,
    };
  } catch {
    return createInitialAppProfileState();
  }
}

export function persistAppProfileState(state: AppProfileState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_PROFILE_STORAGE_KEY, JSON.stringify(state));
}
