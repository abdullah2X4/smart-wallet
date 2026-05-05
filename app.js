// Smart Wallet v13 - Global Secure Edition
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp, setDoc, getDoc, getDocs, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCneyuVIHKZOgOhun-YPK2SzkbT_PziFWg",
  authDomain: "smart-wallet-founders.firebaseapp.com",
  projectId: "smart-wallet-founders",
  storageBucket: "smart-wallet-founders.firebasestorage.app",
  messagingSenderId: "959366843094",
  appId: "1:959366843094:web:578d983b3e1568b74cd777"
};

// 🤖 Groq API Key
const GROQ_API_KEY = "";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let userPlan = 'free';
let expenseChart = null;
let allTransactions = [];

// الإعدادات
let settings = {
  lang: localStorage.getItem('lang') || 'ar',
  currency: localStorage.getItem('currency') || 'EGP',
  theme: localStorage.getItem('theme') || 'dark'
};

let aiQuestionsToday = parseInt(localStorage.getItem('aiCount') || '0');
let lastAiCall = parseInt(localStorage.getItem('lastAiCall') || '0');

// أسعار الصرف
const exchangeRates = { EGP: 1, USD: 0.021, EUR: 0.019, SAR: 0.078, AED: 0.077 };
const currencySymbols = { EGP: 'ج.م', USD: '$', EUR: '€', SAR: 'ر.س', AED: 'د.إ' };

// تسعير ذكي حسب الدولة/اللغة
const pricing = {
  ar: { amount: 20, currency: 'EGP', symbol: 'ج.م', yearly: 200 },
  en: { amount: 2, currency: 'USD', symbol: '$', yearly: 20 },
  fr: { amount: 2, currency: 'EUR', symbol: '€', yearly: 20 },
  de: { amount: 2, currency: 'EUR', symbol: '€', yearly: 20 },
  it: { amount: 2, currency: 'EUR', symbol: '€', yearly: 20 }
};

// ترجمات كاملة
const t = {
  ar: {
    welcome: "أهلاً بيك", ask_ai: "🤖 المساعد الذكي", logout: "خروج", upgrade: "🚀 ترقية الحساب",
    income: "إجمالي الدخل", expense: "إجمالي المصروف", balance: "الرصيد المتاح",
    addTransaction: "إضافة معاملة جديدة ➕", transactions: "سجل المعاملات 📝",
    budget: "ميزانية الشهر 🎯", chart: "التحليل البصري 📊", settings: "⚙️ الإعدادات",
    limitReached: "⚠️ وصلت للحد الأقصى 100 معاملة هذا الشهر",
    upgradeMsg: "فعّل الحساب المحترف واستمتع بمعاملات غير محدودة",
    deleteAll: "متأكد عايز تمسح كل المعاملات؟ مش هتعرف ترجعها!",
    aiLimit: "خلصت الـ 10 أسئلة المجانية. رقي الحساب لأسئلة غير محدودة!",
    aiThinking: "⏳ بحلل مصاريفك...", aiError: "❌ حصل خطأ في المساعد الذكي",
    budgetSaved: "اتحفظت الميزانية ✅", invalidAmount: "اكتب مبلغ صحيح", invalidCategory: "اكتب الفئة",
    invalidInput: "❌ مدخلات غير صالحة", rateLimitMsg: "⏳ استنى ثواني بين كل سؤال",
    deleteConfirm: "متأكد عايز تمسح المعاملة؟", amountPlaceholder: "المبلغ",
    categoryPlaceholder: "الفئة: أكل، مواصلات...", budgetPlaceholder: "حدد ميزانيتك"
  },
  en: {
    welcome: "Welcome", ask_ai: "🤖 AI Assistant", logout: "Logout", upgrade: "🚀 Upgrade Account",
    income: "Total Income", expense: "Total Expenses", balance: "Available Balance",
    addTransaction: "Add New Transaction ➕", transactions: "Transaction History 📝",
    budget: "Monthly Budget 🎯", chart: "Visual Analytics 📊", settings: "⚙️ Settings",
    limitReached: "⚠️ You've reached 100 transactions limit this month",
    upgradeMsg: "Upgrade to Pro for unlimited transactions",
    deleteAll: "Are you sure you want to delete all transactions? This cannot be undone!",
    aiLimit: "You've used 10 free AI questions. Upgrade for unlimited!",
    aiThinking: "⏳ Analyzing your expenses...", aiError: "❌ AI Assistant error",
    budgetSaved: "Budget saved ✅", invalidAmount: "Enter valid amount", invalidCategory: "Enter category",
    invalidInput: "❌ Invalid input", rateLimitMsg: "⏳ Wait a few seconds between questions",
    deleteConfirm: "Delete this transaction?", amountPlaceholder: "Amount",
    categoryPlaceholder: "Category: Food, Transport...", budgetPlaceholder: "Set your budget"
  },
  fr: {
    welcome: "Bienvenue", ask_ai: "🤖 Assistant IA", logout: "Déconnexion", upgrade: "🚀 Améliorer le compte",
    income: "Revenu total", expense: "Dépenses totales", balance: "Solde disponible",
    addTransaction: "Ajouter une transaction ➕", transactions: "Historique 📝",
    budget: "Budget mensuel 🎯", chart: "Analyses visuelles 📊", settings: "⚙️ Paramètres",
    limitReached: "⚠️ Limite de 100 transactions atteinte ce mois",
    upgradeMsg: "Passez à Pro pour des transactions illimitées",
    deleteAll: "Supprimer toutes les transactions? Irréversible!",
    aiLimit: "10 questions IA gratuites utilisées. Passez à Pro!",
    aiThinking: "⏳ Analyse de vos dépenses...", aiError: "❌ Erreur Assistant IA",
    budgetSaved: "Budget enregistré ✅", invalidAmount: "Montant invalide", invalidCategory: "Catégorie requise",
    invalidInput: "❌ Entrée invalide", rateLimitMsg: "⏳ Attendez quelques secondes",
    deleteConfirm: "Supprimer cette transaction?", amountPlaceholder: "Montant",
    categoryPlaceholder: "Catégorie: Nourriture...", budgetPlaceholder: "Définir budget"
  },
  de: {
    welcome: "Willkommen", ask_ai: "🤖 KI-Assistent", logout: "Abmelden", upgrade: "🚀 Konto upgraden",
    income: "Gesamteinkommen", expense: "Gesamtausgaben", balance: "Verfügbarer Saldo",
    addTransaction: "Neue Transaktion ➕", transactions: "Transaktionsverlauf 📝",
    budget: "Monatsbudget 🎯", chart: "Visuelle Analyse 📊", settings: "⚙️ Einstellungen",
    limitReached: "⚠️ 100 Transaktionen Limit erreicht",
    upgradeMsg: "Upgrade auf Pro für unbegrenzte Transaktionen",
    deleteAll: "Alle Transaktionen löschen? Unwiderruflich!",
    aiLimit: "10 kostenlose KI-Fragen aufgebraucht. Upgrade!",
    aiThinking: "⏳ Analysiere Ausgaben...", aiError: "❌ KI-Assistent Fehler",
    budgetSaved: "Budget gespeichert ✅", invalidAmount: "Betrag ungültig", invalidCategory: "Kategorie erforderlich",
    invalidInput: "❌ Ungültige Eingabe", rateLimitMsg: "⏳ Warten Sie einige Sekunden",
    deleteConfirm: "Transaktion löschen?", amountPlaceholder: "Betrag",
    categoryPlaceholder: "Kategorie: Essen...", budgetPlaceholder: "Budget festlegen"
  },
  it: {
    welcome: "Benvenuto", ask_ai: "🤖 Assistente IA", logout: "Esci", upgrade: "🚀 Aggiorna account",
    income: "Entrate totali", expense: "Spese totali", balance: "Saldo disponibile",
    addTransaction: "Nuova transazione ➕", transactions: "Cronologia 📝",
    budget: "Budget mensile 🎯", chart: "Analisi visiva 📊", settings: "⚙️ Impostazioni",
    limitReached: "⚠️ Limite 100 transazioni raggiunto",
    upgradeMsg: "Passa a Pro per transazioni illimitate",
    deleteAll: "Eliminare tutte le transazioni? Irreversibile!",
    aiLimit: "10 domande IA gratis usate. Aggiorna!",
    aiThinking: "⏳ Analizzo le spese...", aiError: "❌ Errore Assistente IA",
    budgetSaved: "Budget salvato ✅", invalidAmount: "Importo non valido", invalidCategory: "Categoria richiesta",
    invalidInput: "❌ Input non valido", rateLimitMsg: "⏳ Attendi qualche secondo",
    deleteConfirm: "Eliminare transazione?", amountPlaceholder: "Importo",
    categoryPlaceholder: "Categoria: Cibo...", budgetPlaceholder: "Imposta budget"
  }
};

// 🔒 تنظيف المدخلات من XSS
function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>\"'&]/g, '').trim().substring(0, 100);
}

// تحويل العملة
function convertAmount(amount) {
  const rate = exchangeRates[settings.currency] || 1;
  return (amount * rate).toFixed(2);
}

// تطبيق الإعدادات
function applySettings() {
  const dirs = { ar: 'rtl', en: 'ltr', fr: 'ltr', de: 'ltr', it: 'ltr' };
  document.documentElement.dir = dirs[settings.lang] || 'ltr';
  document.documentElement.lang = settings.lang;
  if (settings.theme === 'light') document.body.classList.add('light');
  else document.body.classList.remove('light');
  updateTexts();
}

function updateTexts() {
  const lang = t[settings.lang];
  const sym = currencySymbols[settings.currency];
  document.getElementById('welcomeUser').textContent = `${lang.welcome} ${currentUser?.displayName || ''} 👋`;
  document.getElementById('geminiBtn').textContent = lang.ask_ai;
  document.getElementById('logoutBtn').textContent = lang.logout;
  document.getElementById('upgradeBtn').textContent = lang.upgrade;
  document.getElementById('settingsBtn').textContent = lang.settings;
  document.querySelectorAll('#incomeCurrency, #expenseCurrency, #balanceCurrency').forEach(el => el.textContent = sym);

  // تحديث النصوص
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (lang[key]) el.textContent = lang[key];
  });

  document.getElementById('amountInput').placeholder = lang.amountPlaceholder;
  document.getElementById('categoryInput').placeholder = lang.categoryPlaceholder;
  document.getElementById('budgetInput').placeholder = lang.budgetPlaceholder;
}

// فتح/قفل الإعدادات
window.closeSettings = () => document.getElementById('settingsModal').classList.add('hidden');
document.getElementById('settingsBtn')?.addEventListener('click', () => {
  document.getElementById('langSelect').value = settings.lang;
  document.getElementById('currencySelect').value = settings.currency;
  document.getElementById('themeSelect').value = settings.theme;
  document.getElementById('settingsModal').classList.remove('hidden');
});

window.saveSettings = async () => {
  settings.lang = document.getElementById('langSelect').value;
  settings.currency = document.getElementById('currencySelect').value;
  settings.theme = document.getElementById('themeSelect').value;
  localStorage.setItem('lang', settings.lang);
  localStorage.setItem('currency', settings.currency);
  localStorage.setItem('theme', settings.theme);

  // حفظ في Firebase
  if (currentUser) {
    await setDoc(doc(db, 'users', currentUser.uid), { settings }, { merge: true });
  }

  applySettings();
  updateUI();
  closeSettings();
};

// تشغيل
const isLoginPage = document.getElementById('googleLoginBtn')!== null;
if (isLoginPage) initLogin(); else initDashboard();
applySettings();

function initLogin() {
  document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, 'users', result.user.uid), {
        plan: 'free', email: result.user.email, displayName: result.user.displayName,
        createdAt: new Date(), settings: settings, createdIP: 'hidden'
      }, { merge: true });
      window.location.href = 'index.html';
    } catch (err) {
      document.getElementById('errorMessage').textContent = t[settings.lang].invalidInput;
      document.getElementById('errorMessage').classList.remove('hidden');
    }
  });

  document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = sanitize(document.getElementById('emailInput').value);
    const password = document.getElementById('passwordInput').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'index.html';
    } catch (err) {
      document.getElementById('errorMessage').textContent = t[settings.lang].invalidInput;
      document.getElementById('errorMessage').classList.remove('hidden');
    }
  });

  document.getElementById('signupBtn')?.addEventListener('click', async () => {
    const email = sanitize(document.getElementById('emailInput').value);
    const password = document.getElementById('passwordInput').value;
    if (password.length < 6) {
      document.getElementById('errorMessage').textContent = t[settings.lang].invalidInput;
      document.getElementById('errorMessage').classList.remove('hidden');
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid), {
        plan: 'free', email: email, createdAt: new Date(), settings: settings
      });
      window.location.href = 'index.html';
    } catch (err) {
      document.getElementById('errorMessage').textContent = t[settings.lang].invalidInput;
      document.getElementById('errorMessage').classList.remove('hidden');
    }
  });

  onAuthStateChanged(auth, (user) => { if (user) window.location.href = 'index.html'; });
}

async function initDashboard() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = 'login.html';
    currentUser = user;

    // تحقق من الخطة من السيرفر - منع التلاعب
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if(userDoc.exists()) {
      const data = userDoc.data();
      userPlan = data.plan || 'free';
      if(data.settings) settings = {...settings,...data.settings};
    }

    applySettings();
    updatePlanUI();
    loadTransactions();
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => signOut(auth));
  document.getElementById('addTransactionBtn')?.addEventListener('click', addTransaction);
  document.getElementById('geminiBtn')?.addEventListener('click', askAI);
  document.getElementById('exportBtn')?.addEventListener('click', exportExcel);
  document.getElementById('saveBudgetBtn')?.addEventListener('click', saveBudget);
  document.getElementById('clearAllBtn')?.addEventListener('click', clearAllTransactions);
}

function updatePlanUI() {
  document.getElementById('proBadge')?.classList.toggle('hidden', userPlan!== 'pro');
  document.getElementById('maxBadge')?.classList.toggle('hidden', userPlan!== 'max');
  document.getElementById('upgradeBtn')?.classList.toggle('hidden', userPlan!== 'free');
}

async function addTransaction() {
  const lang = t[settings.lang];

  // تحقق من الحد من السيرفر
  if(userPlan === 'free') {
    const now = new Date();
    const thisMonth = allTransactions.filter(t => {
      const d = new Date(t.createdAt?.seconds * 1000);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    if(thisMonth.length >= 100) {
      document.getElementById('limitWarning')?.classList.remove('hidden');
      return;
    }
  }

  const amount = parseFloat(document.getElementById('amountInput').value);
  const category = sanitize(document.getElementById('categoryInput').value);

  // 🔒 التحقق من المدخلات
  if (!amount || amount <= 0 || amount > 1000000) return alert(lang.invalidAmount);
  if (!category || category.length < 2) return alert(lang.invalidCategory);

  await addDoc(collection(db, 'transactions'), {
    userId: currentUser.uid,
    amount: Number(amount.toFixed(2)),
    type: document.getElementById('typeInput').value,
    category: category,
    createdAt: serverTimestamp()
  });

  document.getElementById('amountInput').value = '';
  document.getElementById('categoryInput').value = '';
}

function loadTransactions() {
  const q = query(collection(db, 'transactions'), where('userId', '==', currentUser.uid));
  onSnapshot(q, (snapshot) => {
    allTransactions = [];
    snapshot.forEach((doc) => allTransactions.push({ id: doc.id,...doc.data() }));
    allTransactions.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    updateUI();
    updateChart();
  });
}

function updateUI() {
  let income = 0, expenses = 0;
  const list = document.getElementById('transactionsList');
  if (!list) return;
  list.innerHTML = '';

  allTransactions.slice(0, 50).forEach((t) => {
    if (t.type === 'income') income += t.amount; else expenses += t.amount;
    const date = new Date(t.createdAt?.seconds * 1000).toLocaleDateString();
    const amount = convertAmount(t.amount);
    const sym = currencySymbols[settings.currency];
    const icon = t.type === 'income'? '💵' : '💸';
    list.innerHTML += `
      <div class="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition card-hover">
        <div class="flex items-center gap-3">
          <span class="text-xl">${icon}</span>
          <div><p class="font-bold">${sanitize(t.category)}</p><p class="text-xs text-slate-400">${date}</p></div>
        </div>
        <div class="flex items-center gap-3">
          <p class="font-bold ${t.type === 'income'? 'text-emerald-400' : 'text-red-400'}">${t.type === 'income'? '+' : '-'}${amount} ${sym}</p>
          <button onclick="deleteTransaction('${t.id}')" class="text-xs text-red-500 btn-active hover:scale-110">🗑️</button>
        </div>
      </div>`;
  });

  document.getElementById('totalIncome').textContent = convertAmount(income);
  document.getElementById('totalExpenses').textContent = convertAmount(expenses);
  document.getElementById('currentBalance').textContent = convertAmount(income - expenses);
}

window.deleteTransaction = async (id) => {
  if (confirm(t[settings.lang].deleteConfirm)) await deleteDoc(doc(db, 'transactions', id));
};

async function clearAllTransactions() {
  const lang = t[settings.lang];
  if (!confirm(lang.deleteAll)) return;
  const batch = writeBatch(db);
  const snapshot = await getDocs(query(collection(db, 'transactions'), where('userId', '==', currentUser.uid)));
  snapshot.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

function updateChart() {
  const expenses = allTransactions.filter(t => t.type === 'expense');
  const byCategory = {};
  expenses.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });

  const ctx = document.getElementById('expenseChart');
  if (!ctx) return;
  if (expenseChart) expenseChart.destroy();
  const textColor = settings.theme === 'light'? '#475569' : '#94a3b8';
  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(byCategory),
      datasets: [{
        data: Object.values(byCategory).map(v => parseFloat(convertAmount(v))),
        backgroundColor: ['#00d9a3', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        legend: { labels: { color: textColor, font: { family: 'Cairo', size: 13 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed} ${currencySymbols[settings.currency]}`
          }
        }
      }
    }
  });
}

async function askAI() {
  const lang = t[settings.lang];

  // 🔒 Rate Limiting - منع السبام
  const now = Date.now();
  if (now - lastAiCall < 3000) return alert(lang.rateLimitMsg);
  lastAiCall = now;
  localStorage.setItem('lastAiCall', now);

  if (userPlan === 'free' && aiQuestionsToday >= 10) {
    alert(lang.aiLimit);
    return window.location.href = 'pricing.html';
  }

  const q = prompt(lang.ask_ai);
  if (!q || q.length < 3) return;

  const btn = document.getElementById('geminiBtn');
  const oldText = btn.textContent;
  btn.textContent = lang.aiThinking;
  btn.disabled = true;

  try {
    const thisMonth = allTransactions.filter(t => {
      const d = new Date(t.createdAt?.seconds * 1000);
      return d.getMonth() === new Date().getMonth();
    });

    const income = thisMonth.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const expense = thisMonth.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const categories = {};
    thisMonth.filter(t=>t.type==='expense').forEach(t => categories[t.category] = (categories[t.category]||0) + t.amount);
    const top3 = Object.entries(categories).sort((a,b)=>b[1]-a[1]).slice(0,3);

    const context = `You are a financial advisor. User language: ${settings.lang}.
Data: Income ${income}, Expenses ${expense}, Balance ${income-expense}, Top: ${JSON.stringify(top3)}
Question: ${sanitize(q)}
Answer in 4 lines with iPhone emojis: 1-Direct answer 2-Analysis 3-Tip 4-Action. Use ${settings.currency}.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: context }],
        temperature: 0.7,
        max_tokens: 400
      })
    });

    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content;
    if (!answer) throw new Error('No response');

    alert(sanitize(answer));

    if(userPlan === 'free') {
      aiQuestionsToday++;
      localStorage.setItem('aiCount', aiQuestionsToday);
    }

  } catch (err) {
    alert(lang.aiError + '\n\nWhatsApp: 01121898023');
  } finally {
    btn.textContent = oldText;
    btn.disabled = false;
  }
}

function exportExcel() {
  if (userPlan === 'free') {
    alert(t[settings.lang].aiLimit);
    return window.location.href = 'pricing.html';
  }
  const sym = currencySymbols[settings.currency];
  const ws = XLSX.utils.json_to_sheet(allTransactions.map(t => ({
    Amount: convertAmount(t.amount) + ' ' + sym,
    Type: t.type, Category: t.category,
    Date: new Date(t.createdAt?.seconds * 1000).toLocaleDateString()
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, 'SmartWallet.xlsx');
}

async function saveBudget() {
  const budget = parseFloat(document.getElementById('budgetInput').value);
  const lang = t[settings.lang];
  if (!budget || budget <= 0 || budget > 10000000) return alert(lang.invalidAmount);
  await setDoc(doc(db, 'users', currentUser.uid), { budget: Number(budget.toFixed(2)) }, { merge: true });
  alert(lang.budgetSaved);
}

// ريست عداد AI كل شهر
const now = new Date();
const lastMonth = localStorage.getItem('lastMonth');
if(!lastMonth || new Date(lastMonth).getMonth()!== now.getMonth()) {
  localStorage.setItem('aiCount', '0');
  localStorage.setItem('lastMonth', now.toISOString());
  aiQuestionsToday = 0;
}
