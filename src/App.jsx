import React, { useEffect, useMemo, useState } from "react";
import { api, jsonBody } from "./api.js";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Ellipsis,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
  Check,
  Menu,
} from "lucide-react";

function makeBasicAuth(email, password) {
  const bytes = new TextEncoder().encode(`${email}:${password}`);
  return `Basic ${btoa(String.fromCharCode(...bytes))}`;
}
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [active, setActive] = useState("Overview");
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [modal, setModal] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const notify = (s) => {
    setToast(s);
    setTimeout(() => setToast(""), 2600);
  };
  const admin = currentUser?.role === "ADMIN";
  const loadUserData = async (providedUser) => {
    setLoading(true);
    setApiError("");
    try {
      const user = providedUser || await api("/auth/me");
      const [expenseRows, budgetRows, goalRows] = await Promise.all([api("/expenses"), api("/budgets"), api("/goals")]);
      setCurrentUser(user);
      setTransactions(expenseRows.map((row) => ({ id: row.id, name: row.description, category: row.category, date: row.date, amount: row.category === "Income" ? Number(row.amount) : -Number(row.amount), icon: "✦", tone: "mint" })));
      setBudgets(budgetRows.map((row) => ({ id: row.id, name: row.category, duration: row.duration, used: expenseRows.filter((expense) => expense.category === row.category && expense.category !== "Income").reduce((sum, expense) => sum + Number(expense.amount), 0), total: Number(row.amount), color: "#9d8ee5", icon: "◌" })));
      setGoals(goalRows.map((row) => ({ id: row.id, name: row.description, saved: Number(row.currentAmount), target: Number(row.targetAmount), deadline: row.deadline, icon: "✦", color: "#e4a16d" })));
    } catch (error) {
      setApiError(error.message);
      setCurrentUser(null);
    } finally { setLoading(false); }
  };
  useEffect(() => {
    const storedCredentials = sessionStorage.getItem("moneta.auth");
    if (storedCredentials) loadUserData();
    else setLoading(false);
  }, []);
  useEffect(() => {
    if (!admin) return;
    Promise.all([api("/users"), api("/admin/settings")]).then(([userRows, settingRows]) => { setUsers(userRows); setSettings(settingRows); }).catch((error) => setApiError(error.message));
  }, [admin]);
  useEffect(() => { const navigate = (event) => setActive(event.detail); window.addEventListener("finance:navigate", navigate); return () => window.removeEventListener("finance:navigate", navigate); }, []);
  const menu =
    !admin
      ? [
          ["Overview", LayoutDashboard],
          ["Transactions", CreditCard],
          ["Budgets", Wallet],
          ["Goals", Target],
        ]
      : [
          ["Overview", LayoutDashboard],
          ["User management", Users],
          ["Data security", Shield],
          ["System settings", Settings],
        ];
  const filtered = useMemo(
    () =>
      transactions.filter((t) =>
        `${t.name} ${t.category}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [transactions, query],
  );
  const addTransaction = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try { await api("/expenses", { method: "POST", body: jsonBody({ description: f.get("name"), category: f.get("category"), amount: Number(f.get("amount")), date: f.get("date") }) }); await loadUserData(currentUser); setModal(""); notify("Transaction saved to the database"); }
    catch (error) { setApiError(error.message); }
  };
  const addBudget = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try { await api("/budgets", { method: "POST", body: jsonBody({ category: f.get("name"), amount: Number(f.get("amount")), duration: f.get("duration") }) }); await loadUserData(currentUser); setModal(""); notify("Budget saved to the database"); }
    catch (error) { setApiError(error.message); }
  };
  const addGoal = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try { await api("/goals", { method: "POST", body: jsonBody({ description: f.get("name"), targetAmount: Number(f.get("amount")), currentAmount: 0, deadline: f.get("deadline") }) }); await loadUserData(currentUser); setModal(""); notify("Goal saved to the database"); }
    catch (error) { setApiError(error.message); }
  };
  const createAccount = async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const email = String(f.get("email")).trim().toLowerCase(); const password = String(f.get("password"));
    try { sessionStorage.removeItem("moneta.auth"); await api("/auth/register", { method: "POST", body: jsonBody({ name: f.get("name"), email, password }) }); sessionStorage.setItem("moneta.auth", makeBasicAuth(email, password)); await loadUserData(); notify("Account created"); }
    catch (error) { setApiError(error.message); }
  };
  const loginAccount = async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const email = String(f.get("email")).trim().toLowerCase(); const password = String(f.get("password")); sessionStorage.setItem("moneta.auth", makeBasicAuth(email, password)); await loadUserData(); };
  const createAdminUser = async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    try { await api("/users", { method: "POST", body: jsonBody({ name: f.get("name"), email: f.get("email"), role: f.get("role"), password: f.get("password") }) }); const rows = await api("/users"); setUsers(rows); setModal(""); notify("User account saved"); }
    catch (error) { setApiError(error.message); }
  };
  if (loading) return <div className="boot-screen"><div className="brand-mark">m</div><b>Connecting to your finance database…</b></div>;
  if (!currentUser) return <div className="boot-screen"><section className="panel account-setup"><div className="brand"><div className="brand-mark">m</div><span>moneta</span></div><h1>{authMode === "register" ? "Create your account" : "Sign in"}</h1><p>{authMode === "register" ? "New accounts are created with the USER role." : "Sign in to load your saved finance data."}</p>{apiError&&<div className="api-error">{apiError}</div>}<form onSubmit={authMode === "register" ? createAccount : loginAccount}>{authMode === "register"&&<label>Full name<input name="name" autoComplete="name" required/></label>}<label>Email address<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={8} required/></label><button className="primary-button">{authMode === "register" ? "Create account" : "Sign in"}</button></form><div className="setup-divider">{authMode === "register" ? "Already registered?" : "New to Moneta?"} <button className="link-button" onClick={() => { setApiError(""); setAuthMode(authMode === "register" ? "login" : "register"); }}>{authMode === "register" ? "Sign in" : "Create an account"}</button></div></section></div>;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <span>m</span>
          </div>
          <span>moneta</span>
        </div>
        <div className="workspace-label">
          WORKSPACE <ChevronDown size={13} />
        </div>
        <div className="workspace">
          <div className="workspace-avatar">{currentUser.name?.slice(0, 1)?.toUpperCase()}</div>
          <div>
            <b>{currentUser.name}’s account</b>
            <small>
              {admin ? "Platform administrator" : "Personal account"}
            </small>
          </div>
          <Ellipsis size={18} className="muted" />
        </div>
        <div className="nav-label">MENU</div>
        <nav>
          {menu.map(([label, Icon]) => (
            <button
              key={label}
              className={`nav-item ${active === label ? "selected" : ""}`}
              onClick={() => {
                setActive(label);
                setMobileOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={17} />
            </div>
            <b>Need a hand?</b>
            <p>Visit our help center for tips and answers.</p>
            <button onClick={() => notify("Help center is coming soon")}>
              Get support <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="nav-item"
            onClick={() => setActive(admin ? "System settings" : "Settings")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <div className="profile">
            <div className="profile-pic">{admin ? "JD" : "SC"}</div>
            <div className="profile-text">
              <b>{currentUser.name}</b>
              <small>{admin ? "Administrator" : currentUser.email}</small>
            </div>
            <Ellipsis size={18} />
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <div className="scrim" onClick={() => setMobileOpen(false)} />
      )}
      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            {admin ? "Admin" : "Personal"} <span>/</span> <b>{active}</b>
          </div>
          <div className="top-actions">
            <span className="role-label">{admin ? "Administrator" : currentUser.email}</span>
            <button
              className="icon-button"
              onClick={() => notify("You’re all caught up")}
            >
              <Bell size={18} />
              <i />
            </button>
            <button className="top-avatar" title="Sign out" onClick={() => { sessionStorage.removeItem("moneta.auth"); setCurrentUser(null); setTransactions([]); setBudgets([]); setGoals([]); setApiError(""); setAuthMode("login"); }}>↪</button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{admin ? "MONETA ADMINISTRATION" : "PERSONAL FINANCE"}</div>
              <h1>{admin ? active : active === "Overview" ? `Welcome, ${currentUser.name}` : active}<span>{admin ? " ✦" : " ☀️"}</span></h1>
              <p>{admin ? ({Overview:"A live snapshot of accounts and platform configuration.","User management":"Search accounts and manage account roles and access.","Data security":"Review and update stored security configuration.","System settings":"Manage platform preferences and feature settings."}[active] || "Manage your finance platform.") : active === "Overview" ? "Here’s your financial snapshot from your saved records." : `Manage your ${active.toLowerCase()} using records saved in your account.`}</p>
            </div>
            <div className="heading-actions">
              {((admin && active === "User management") || (!admin && ["Overview", "Transactions", "Budgets", "Goals"].includes(active))) && <button className="primary-button" onClick={() => setModal(admin ? "user" : active === "Budgets" ? "budget" : active === "Goals" ? "goal" : "expense")}><Plus size={17}/>{admin ? "Add user" : active === "Budgets" ? "Create budget" : active === "Goals" ? "New goal" : "New transaction"}</button>}
            </div>
          </div>
          {apiError && <div className="api-error" role="alert">{apiError} <button onClick={() => { setApiError(""); loadUserData(currentUser); }}>Retry</button></div>}
          {admin ? (
            <AdminDashboard active={active} currentUser={currentUser} notify={notify} users={users} settings={settings} setUsers={setUsers} setSettings={setSettings} />
          ) : active === "Overview" ? (
            <UserDashboard
              transactions={transactions}
              budgets={budgets}
              goals={goals}
              onAdd={() => setModal("expense")}
              filtered={filtered}
              query={query}
              setQuery={setQuery}
              notify={notify}
            />
          ) : active === "Transactions" ? (
            <TransactionsPage
              transactions={filtered}
              query={query}
              setQuery={setQuery}
            />
          ) : active === "Budgets" ? (
            <BudgetsPage budgets={budgets} />
          ) : active === "Goals" ? (
            <GoalsPage goals={goals} />
          ) : (
            <SettingsPage user={currentUser} />
          )}
        </div>
      </main>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">
                  {modal === "expense"
                    ? "TRANSACTION"
                    : modal === "budget"
                      ? "SPENDING PLAN"
                      : modal === "goal"
                        ? "SAVINGS PLAN"
                        : "TEAM MANAGEMENT"}
                </div>
                <h2>
                  {modal === "expense"
                    ? "Add a transaction"
                    : modal === "budget"
                      ? "Create a budget"
                      : modal === "goal"
                        ? "Create a financial goal"
                        : "Add a user"}
                </h2>
              </div>
              <button className="icon-button" onClick={() => setModal("")}>
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={
                modal === "expense"
                  ? addTransaction
                  : modal === "budget"
                    ? addBudget
                    : modal === "goal"
                      ? addGoal
                  : createAdminUser
              }
            >
              {modal === "expense" ? (
                <>
                  <label>
                    Description
                    <input
                      name="name"
                      placeholder="e.g. Weekly groceries"
                      required
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Amount
                      <input
                        name="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        required
                      />
                    </label>
                    <label>
                      Category
                      <select name="category">
                        <option>Income</option>
                        <option>Groceries</option>
                        <option>Food & drink</option>
                        <option>Transport</option>
                        <option>Entertainment</option>
                        <option>Housing</option>
                        <option>Other</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Date
                    <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                  </label>
                </>
              ) : modal === "budget" ? (
                <>
                  <label>
                    Budget category
                    <input name="name" placeholder="e.g. Shopping" required />
                  </label>
                  <label>
                    Monthly limit
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      placeholder="0.00"
                      required
                    />
                  </label>
                  <label>Duration<select name="duration" defaultValue="MONTHLY"><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option><option value="YEARLY">Yearly</option></select></label>
                </>
              ) : modal === "goal" ? (
                <>
                  <label>
                    Goal name
                    <input name="name" placeholder="e.g. New car" required />
                  </label>
                  <label>
                    Target amount
                    <input
                      name="amount"
                      type="number"
                      min="1"
                      placeholder="0.00"
                      required
                    />
                  </label>
                  <label>
                    Target date
                    <input name="deadline" type="date" required />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Full name
                    <input
                      name="name"
                      placeholder="e.g. Alex Morgan"
                      required
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      placeholder="alex@example.com"
                      required
                    />
                  </label>
                  <label>
                    Temporary password
                    <input name="password" type="password" minLength={8} autoComplete="new-password" required />
                  </label>
                  <label>
                    Role
                    <select name="role">
                      <option value="USER">User</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </label>
                </>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModal("")}
                >
                  Cancel
                </button>
                <button className="primary-button">
                  <Check size={16} />
                  {modal === "expense"
                    ? "Save transaction"
                    : modal === "budget"
                      ? "Create budget"
                      : modal === "goal"
                        ? "Create goal"
                        : "Add user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function UserDashboard({
  transactions,
  budgets,
  goals,
  onAdd,
  filtered,
  query,
  setQuery,
  notify,
}) {
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() - (6 - index)); return day; });
    return days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      const rows = transactions.filter((transaction) => transaction.date === key);
      return { day: day.toLocaleDateString(undefined, { weekday: "short" }), income: rows.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0), spend: rows.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0) };
    });
  }, [transactions]);
  const income = transactions.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0);
  const spend = transactions.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0);
  const net = transactions.reduce((sum, row) => sum + row.amount, 0);
  const money = (amount) => amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
  return (
    <>
      <div className="stat-grid">
        <Stat
          label="Net tracked"
          value={money(net)}
          change="From saved records"
          sub="all time"
          icon={Wallet}
          color="green"
        />
        <Stat
          label="Income recorded"
          value={money(income)}
          change="From saved records"
          sub="income transactions"
          icon={ArrowDownLeft}
          color="blue"
        />
        <Stat
          label="Expenses recorded"
          value={money(spend)}
          change="From saved records"
          sub="expense transactions"
          icon={ArrowUpRight}
          color="orange"
        />
        <Stat
          label="Savings rate"
          value={`${income ? Math.round((net / income) * 100) : 0}%`}
          change="From saved records"
          sub="net / income"
          icon={TrendingUp}
          color="purple"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel spending-panel">
          <div className="panel-header">
            <div>
              <h2>Cash flow</h2>
              <p>Daily totals from your saved transactions</p>
            </div>
            <button className="dots-button">
              <Ellipsis size={19} />
            </button>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-income" />
              Income
            </span>
            <span>
              <i className="legend-spend" />
              Expenses
            </span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 6, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#528366" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#528366" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e4a16d" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#e4a16d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#eef0eb"
                  strokeDasharray="4 5"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#98a097", fontSize: 12 }}
                  dy={11}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#98a097", fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                  ticks={[0, 250, 500, 750, 1000]}
                />
                <Tooltip
                  formatter={(v) => `$${v}`}
                  contentStyle={{
                    border: "1px solid #e9ece6",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#528366"
                  strokeWidth={2.5}
                  fill="url(#incomeFill)"
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="#e4a16d"
                  strokeWidth={2.5}
                  fill="url(#spendFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel budget-panel">
          <div className="panel-header">
            <div>
              <h2>Budget overview</h2>
              <p>Spending by category</p>
            </div>
            <button
              className="text-link"
              onClick={() => notify("Showing all budgets")}
            >
              See all
            </button>
          </div>
          <div className="budget-list">
            {budgets.slice(0, 3).map((b) => (
              <div className="budget-item" key={b.id}>
                <div className="budget-item-top">
                  <div className="budget-name">
                    <span className="budget-icon" style={{ color: b.color }}>
                      {b.icon}
                    </span>
                    <div>
                      <b>{b.name}</b>
                      <small>
                        ${b.used.toLocaleString()} of $
                        {b.total.toLocaleString()}
                      </small>
                    </div>
                  </div>
                  <strong>{Math.round((b.used / b.total) * 100)}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    style={{
                      width: `${Math.min((b.used / b.total) * 100, 100)}%`,
                      background: b.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="budget-footer">
            <span>Monthly total</span>
            <b>{money(budgets.reduce((sum, budget) => sum + budget.used, 0))} <small>/ {money(budgets.reduce((sum, budget) => sum + budget.total, 0))}</small></b>
          </div>
        </section>
      </div>
      <section className="panel transactions-panel">
        <div className="panel-header">
          <div>
            <h2>Recent transactions</h2>
            <p>Your latest activity across all accounts</p>
          </div>
          <button
            className="text-link"
            onClick={() => notify("Viewing all transactions")}
          >
            View all <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="table-tools">
          <div className="search-box">
            <Search size={15} />
            <input
              placeholder="Search transactions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="filter-button" onClick={() => onAdd()}>
            <Plus size={15} /> Add transaction
          </button>
        </div>
        <TransactionTable transactions={filtered.slice(0, 5)} />
      </section>
    </>
  );
}
function Stat({ label, value, change, sub, icon: Icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className={`stat-icon ${color}`}>
          <Icon size={17} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-change">
        <b>{change}</b>
        <span>{sub}</span>
      </div>
    </div>
  );
}
function TransactionTable({ transactions }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>TRANSACTION</th>
            <th>CATEGORY</th>
            <th>DATE</th>
            <th className="align-right">AMOUNT</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={i}>
              <td>
                <div className="transaction-title">
                  <span className={`transaction-icon ${t.tone}`}>{t.icon}</span>
                  <b>{t.name}</b>
                </div>
              </td>
              <td>
                <span className="category-pill">{t.category}</span>
              </td>
              <td className="date-cell">{t.date}</td>
              <td className={`amount-cell ${t.amount > 0 ? "positive" : ""}`}>
                {t.amount > 0 ? "+" : "−"}${Math.abs(t.amount).toFixed(2)}
              </td>
              <td>
                <button className="row-menu">
                  <Ellipsis size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!transactions.length && (
        <div className="empty-state">No transactions found.</div>
      )}
    </div>
  );
}
function TransactionsPage({ transactions, query, setQuery }) {
  return (
    <section className="panel full-panel">
      <div className="panel-header">
        <div>
          <h2>All transactions</h2>
          <p>Review and search your complete transaction history</p>
        </div>
        <button className="filter-button">
          <span>All categories</span>
          <ChevronDown size={14} />
        </button>
      </div>
      <div className="table-tools">
        <div className="search-box">
          <Search size={15} />
          <input
            placeholder="Search transactions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <TransactionTable transactions={transactions} />
    </section>
  );
}
function BudgetsPage({ budgets }) {
  return (
    <div className="cards-grid">
      {budgets.map((b) => (
        <div className="panel detail-card" key={b.name}>
          <div className="budget-name">
            <span className="budget-icon" style={{ color: b.color }}>
              {b.icon}
            </span>
            <div>
              <b>{b.name}</b>
            <small>{b.duration?.toLowerCase() || "budget"} budget</small>
            </div>
            <button className="dots-button">
              <Ellipsis size={18} />
            </button>
          </div>
          <div className="detail-amount">
            ${b.used.toLocaleString()}{" "}
            <small>/ ${b.total.toLocaleString()}</small>
          </div>
          <div className="progress-track">
            <div
              style={{
                width: `${Math.min((b.used / b.total) * 100, 100)}%`,
                background: b.color,
              }}
            />
          </div>
          <div className="detail-foot">
            <span>{Math.round((b.used / b.total) * 100)}% used</span>
            <span>${(b.total - b.used).toLocaleString()} left</span>
          </div>
        </div>
      ))}
    </div>
  );
}
function GoalsPage({ goals }) {
  return (
    <div className="cards-grid">
      {goals.map((g) => (
        <div className="panel goal-card" key={g.name}>
          <div className="goal-top">
            <div className="goal-emoji">{g.icon}</div>
            <button className="dots-button">
              <Ellipsis size={18} />
            </button>
          </div>
          <h2>{g.name}</h2>
          <p>Target: ${g.target.toLocaleString()}</p>
          <div className="goal-progress-head">
            <span>Saved so far</span>
            <b>${g.saved.toLocaleString()}</b>
          </div>
          <div className="progress-track">
            <div
              style={{
                width: `${Math.min((g.saved / g.target) * 100, 100)}%`,
                background: g.color,
              }}
            />
          </div>
          <div className="detail-foot">
            <span>{Math.round((g.saved / g.target) * 100)}% complete</span>
            <span>${(g.target - g.saved).toLocaleString()} to go</span>
          </div>
        </div>
      ))}
    </div>
  );
}
function AdminDashboard({ active, currentUser, notify, users, settings, setUsers, setSettings }) {
  const [search, setSearch] = useState("");
  const matchingUsers = users.filter((user) => `${user.name} ${user.email} ${user.role} ${user.status}`.toLowerCase().includes(search.toLowerCase()));
  const refreshUsers = async () => setUsers(await api("/users"));
  const refreshSettings = async () => setSettings(await api("/admin/settings"));
  const changeStatus = async (user, status) => { try { await api(`/users/${user.id}/status`, { method: "PATCH", body: jsonBody({ status }) }); await refreshUsers(); notify("Account status saved"); } catch (error) { notify(error.message); } };
  const changeRole = async (user, role) => { try { await api(`/users/${user.id}/role`, { method: "PATCH", body: jsonBody({ role }) }); await refreshUsers(); notify(`${user.name}'s role changed to ${role}`); } catch (error) { notify(error.message); } };
  const removeUser = async (user) => { if (!window.confirm(`Delete ${user.name}'s account?`)) return; try { await api(`/users/${user.id}`, { method: "DELETE" }); await refreshUsers(); notify("Account deleted"); } catch (error) { notify(error.message); } };
  const securitySettings = settings.filter((setting) => /security|encrypt|access/i.test(setting.settingKey));
  const systemSettings = settings.filter((setting) => !/security|encrypt|access/i.test(setting.settingKey));
  if (active === "User management") return <section className="panel admin-users full-panel">
    <div className="panel-header"><div><h2>User management</h2><p>{users.length} account(s) loaded from the database. Change roles here.</p></div></div>
    <div className="table-tools"><div className="search-box"><Search size={15}/><input placeholder="Search users..." value={search} onChange={(event) => setSearch(event.target.value)}/></div></div>
    <div className="table-scroll"><table><thead><tr><th>USER</th><th>ROLE</th><th>STATUS</th><th>ACCOUNT ID</th><th/></tr></thead><tbody>
      {matchingUsers.map((user) => <tr key={user.id}><td><div className="user-table-cell"><span className="user-initial">{user.name.slice(0,1).toUpperCase()}</span><div><b>{user.name}</b><small>{user.email}</small></div></div></td><td><select aria-label={`Role for ${user.name}`} value={user.role} disabled={user.id === currentUser.id} onChange={(event) => changeRole(user, event.target.value)}><option value="USER">User</option><option value="ADMIN">Admin</option></select>{user.id === currentUser.id && <small className="role-self-note">Current account</small>}</td><td><select aria-label={`Status for ${user.name}`} value={user.status} onChange={(event) => changeStatus(user, event.target.value)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></td><td className="date-cell">#{user.id}</td><td><button className="row-menu" title={`Delete ${user.name}`} onClick={() => removeUser(user)}><Ellipsis size={17}/></button></td></tr>)}
    </tbody></table>{matchingUsers.length===0&&<div className="empty-state">No database accounts match this search.</div>}</div>
  </section>;
  if (active === "Data security") return <section className="panel security-card full-panel"><div className="panel-header"><div><h2>Data security configuration</h2><p>Settings stored in the database. Updates are saved through the API.</p></div><div className="stat-icon green"><Shield size={17}/></div></div>
    {securitySettings.map((setting) => <SettingEditor key={setting.settingKey} setting={setting} onSaved={refreshSettings} notify={notify}/>)}
    {!securitySettings.length&&<div className="empty-state">No security settings have been saved yet.</div>}
    <AddSettingForm onSaved={refreshSettings} notify={notify} initialKey="security.encryption"/>
  </section>;
  if (active === "System settings") return <section className="panel system-card full-panel"><div className="panel-header"><div><h2>System settings</h2><p>Platform preferences and feature settings persisted in the database.</p></div></div>
    <AddSettingForm onSaved={refreshSettings} notify={notify}/>
    {systemSettings.map((setting) => <SettingEditor key={setting.settingKey} setting={setting} onSaved={refreshSettings} notify={notify}/>)}
    {!systemSettings.length&&<div className="empty-state">No system settings have been saved.</div>}
  </section>;
  return <>
    <div className="stat-grid">
      <Stat label="User accounts" value={users.length.toLocaleString()} change="From database" sub="total accounts" icon={Users} color="green" />
      <Stat label="Active accounts" value={users.filter((user) => user.status === "ACTIVE").length.toLocaleString()} change="From database" sub="current status" icon={Check} color="blue" />
      <Stat label="System settings" value={settings.length.toLocaleString()} change="Persisted config" sub="saved settings" icon={Settings} color="purple" />
      <Stat label="Security settings" value={securitySettings.length.toLocaleString()} change="Persisted config" sub="saved settings" icon={Shield} color="orange" />
    </div>
    <section className="panel full-panel admin-overview"><div className="panel-header"><div><h2>Platform administration</h2><p>Choose a section to manage. Records are loaded from the finance API.</p></div></div>
      <div className="admin-shortcuts">{[["User management", Users, `${users.length} registered accounts`],["Data security", Shield, `${securitySettings.length} saved security settings`],["System settings", Settings, `${systemSettings.length} saved configuration values`]].map(([title, Icon, detail]) => <button className="admin-shortcut" key={title} onClick={() => window.dispatchEvent(new CustomEvent("finance:navigate", { detail: title }))}><span className="stat-icon green"><Icon size={17}/></span><b>{title}</b><small>{detail}</small><ArrowUpRight size={15}/></button>)}</div>
    </section>
  </>;
}
function SettingEditor({ setting, onSaved, notify }) {
  const [value, setValue] = useState(setting.settingValue);
  const save = async (event) => { event.preventDefault(); try { await api(`/admin/settings/${encodeURIComponent(setting.settingKey)}`, { method: "PUT", body: jsonBody({ value }) }); await onSaved(); notify("Setting saved to the database"); } catch (error) { notify(error.message); } };
  return <form className="setting-editor" onSubmit={save}><label>{setting.settingKey}<input value={value} onChange={(event) => setValue(event.target.value)} /></label><button className="secondary-button">Save</button></form>;
}
function AddSettingForm({ onSaved, notify, initialKey = "" }) {
  const save = async (event) => { event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); const key = String(form.get("key")).trim(); const value = String(form.get("value")).trim(); try { await api(`/admin/settings/${encodeURIComponent(key)}`, { method: "PUT", body: jsonBody({ value }) }); formElement.reset(); await onSaved(); notify("Setting saved to the database"); } catch (error) { notify(error.message); } };
  return <form className="add-setting-form" onSubmit={save}><input name="key" placeholder="Setting key" defaultValue={initialKey} required/><input name="value" placeholder="Value" required/><button className="secondary-button">Save setting</button></form>;
}
function SettingsPage({ user }) {
  return (
    <section className="panel settings-page">
      <div className="panel-header">
        <div>
          <h2>Account details</h2>
          <p>Account information loaded from the finance API</p>
        </div>
      </div>
      {[['Name', user.name], ['Email', user.email], ['Role', user.role], ['Account status', user.status], ['Database user ID', user.id]].map(([label, value]) => (
        <div className="preference-row" key={label}>
          <div>
            <b>{label}</b>
            <small>{value}</small>
          </div>
        </div>
      ))}
    </section>
  );
}

export default App;
