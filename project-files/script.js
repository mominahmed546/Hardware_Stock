// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFsuh5kl95DYu6yS17OQHN2nJlQnx3aMo",
  authDomain: "ledger-2729b.firebaseapp.com",
  projectId: "ledger-2729b",
  storageBucket: "ledger-2729b.appspot.com",
  messagingSenderId: "249531697575",
  appId: "1:249531697575:web:37f352ef65a7ecd126ce82",
  measurementId: "G-1C11V1FQ0L"
};

// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let balance = 0;

// ✅ Load previous entries
window.addEventListener("DOMContentLoaded", async () => {
  const snapshot = await db.collection("ledger").orderBy("date").get();
  snapshot.forEach(doc => {
    const entry = doc.data();
    balance += (entry.debit || 0) - (entry.credit || 0);
    addRowToTable(entry.date, entry.account, entry.description, entry.debit, entry.credit, balance);
  });
});

// ✅ Handle form submission
document.getElementById("entry-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const date = document.getElementById("date").value;
  const account = document.getElementById("account").value;
  const description = document.getElementById("description").value;
  const debit = parseFloat(document.getElementById("debit").value) || 0;
  const credit = parseFloat(document.getElementById("credit").value) || 0;

  balance += debit - credit;

  const entry = { date, account, description, debit, credit, balance };

  try {
    await db.collection("ledger").add(entry);
    addRowToTable(date, account, description, debit, credit, balance);
    document.getElementById("entry-form").reset();
  } catch (error) {
    console.error("❌ Error adding entry:", error);
  }
});

// ✅ Add row to table
function addRowToTable(date, account, description, debit, credit, balance) {
  const tbody = document.getElementById("ledger-body");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${date}</td>
    <td>${account}</td>
    <td>${description}</td>
    <td class="debit">${debit > 0 ? debit.toLocaleString() : '—'}</td>
    <td class="credit">${credit > 0 ? credit.toLocaleString() : '—'}</td>
    <td>${balance.toLocaleString()}</td>
  `;

  tbody.appendChild(row);
}
