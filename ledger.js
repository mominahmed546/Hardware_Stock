// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let balance = 0;

// ✅ Load existing entries
window.addEventListener("DOMContentLoaded", async () => {
  const snapshot = await db.collection("ledger").orderBy("date").get();
  snapshot.forEach(doc => {
    const entry = doc.data();
    balance += (entry.debit || 0) - (entry.credit || 0);
    addRowToLedger(entry.date, entry.account, entry.description, entry.debit, entry.credit, balance);
  });
});

// ✅ Add new entry
document.getElementById("entry-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const date = document.getElementById("date").value;
  const account = document.getElementById("account").value;
  const description = document.getElementById("description").value;
  const debit = parseFloat(document.getElementById("debit").value) || 0;
  const credit = parseFloat(document.getElementById("credit").value) || 0;

  balance += debit - credit;

  const entry = { date, account, description, debit, credit, balance };

  await db.collection("ledger").add(entry);

  addRowToLedger(date, account, description, debit, credit, balance);

  document.getElementById("entry-form").reset();
});

// ✅ Row UI
function addRowToLedger(date, account, description, debit, credit, balance) {
  const tbody = document.getElementById("ledger-body");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${date}</td>
    <td>${account}</td>
    <td>${description}</td>
    <td>${debit > 0 ? debit.toLocaleString() : "—"}</td>
    <td>${credit > 0 ? credit.toLocaleString() : "—"}</td>
    <td>${balance.toLocaleString()}</td>
  `;

  tbody.appendChild(row);
}
