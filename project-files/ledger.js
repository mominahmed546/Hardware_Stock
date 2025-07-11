// ✅ Your Firebase config (replace with your own values)
const firebaseConfig = {
  apiKey: "AIzaSyBbnsRkO-vDFENo0bvlRhz2mWUx__c_m80",
  authDomain: "hardwarestock-84447.firebaseapp.com",
  projectId: "hardwarestock-84447",
  storageBucket: "hardwarestock-84447.appspot.com",
  messagingSenderId: "240781950352",
  appId: "1:240781950352:web:2c58f6ee22b5828ecf0715",
  measurementId: "G-47W205FW1S"
};


// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let balance = 0;

// ✅ Load existing entries
window.addEventListener("DOMContentLoaded", async () => {
  balance = 0;
  const snapshot = await db.collection("ledger").orderBy("date").get();

  snapshot.forEach(doc => {
    const entry = doc.data();
    balance += (entry.debit || 0) - (entry.credit || 0);
    addRowToTable(doc.id, entry.date, entry.account, entry.description, entry.debit, entry.credit, balance);
  });
});

// ✅ Handle Add Entry form
document.getElementById("entry-form").addEventListener("submit", async function (e) {
  e.preventDefault(); // 🔴 Prevent form from reloading the page

  const date = document.getElementById("date").value;
  const account = document.getElementById("account").value;
  const description = document.getElementById("description").value;
  const debit = parseFloat(document.getElementById("debit").value) || 0;
  const credit = parseFloat(document.getElementById("credit").value) || 0;

  if (!date || !account || !description || (debit <= 0 && credit <= 0)) {
    alert("Please enter all required fields and at least one amount.");
    return;
  }

  balance += debit - credit;

  const entry = { date, account, description, debit, credit, balance };

  try {
    const docRef = await db.collection("ledger").add(entry);
    addRowToTable(docRef.id, date, account, description, debit, credit, balance);
    document.getElementById("entry-form").reset();
  } catch (error) {
    console.error("Error adding entry:", error);
    alert("Failed to add entry.");
  }
});

// ✅ Render row
function addRowToTable(id, date, account, description, debit, credit, balance) {
  const tbody = document.getElementById("ledger-body");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${date}</td>
    <td>${account}</td>
    <td>${description}</td>
    <td class="debit">${debit > 0 ? debit.toLocaleString() : '—'}</td>
    <td class="credit">${credit > 0 ? credit.toLocaleString() : '—'}</td>
    <td>${balance.toLocaleString()}</td>
    <td><button onclick="deleteEntry('${id}')">🗑️ Delete</button></td>
  `;

  tbody.appendChild(row);
}

// ✅ Delete entry
async function deleteEntry(id) {
  if (confirm("Are you sure you want to delete this entry?")) {
    try {
      await db.collection("ledger").doc(id).delete();
      alert("Deleted successfully.");
      location.reload();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete.");
    }
  }
}
