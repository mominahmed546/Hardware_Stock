import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBbnsRkO-vDFENo0bvlRhz2mWUx__c_m80",
  authDomain: "hardwarestock-84447.firebaseapp.com",
  projectId: "hardwarestock-84447",
  storageBucket: "hardwarestock-84447.firebasestorage.app",
  messagingSenderId: "240781950352",
  appId: "1:240781950352:web:2c58f6ee22b5828ecf0715",
  measurementId: "G-47W205FW1S",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Form & DOM elements
const form = document.getElementById("stock-form");
const nameInput = document.getElementById("item-name");
const qtyInput = document.getElementById("item-qty");
const purchaseInput = document.getElementById("item-purchase");
const saleInput = document.getElementById("item-sale");
const table = document.getElementById("stock-table");

// ✅ Add or Update Item
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim().toLowerCase();
  const qty = parseInt(qtyInput.value);
  const purchaseRate = parseFloat(purchaseInput.value);
  const saleRate = parseFloat(saleInput.value);

  if (!name || isNaN(qty) || isNaN(purchaseRate) || isNaN(saleRate)) return;

  const stockRef = collection(db, "stock");
  const snapshot = await getDocs(stockRef);

  let existingDoc = null;

  snapshot.forEach((docItem) => {
    const data = docItem.data();
    if (data.name.toLowerCase() === name) {
      existingDoc = { id: docItem.id, data };
    }
  });

  if (existingDoc) {
    const newQty = existingDoc.data.qty + qty;
    await updateDoc(doc(db, "stock", existingDoc.id), {
      qty: newQty
    });
  } else {
    await addDoc(stockRef, {
      name,
      qty,
      purchaseRate,
      saleRate,
      timestamp: serverTimestamp()
    });
  }

  form.reset();
  loadStock();
});

// ✅ Load Items
async function loadStock() {
  table.innerHTML = "";
  const stockRef = collection(db, "stock");
  const snapshot = await getDocs(stockRef);

  snapshot.forEach((docSnap) => {
    const item = docSnap.data();
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${item.purchaseRate}</td>
      <td>${item.saleRate}</td>
      <td>
        <button onclick="deleteItem('${docSnap.id}')" class="delete-btn">Delete</button>
      </td>
    `;

    table.appendChild(row);
  });
}

// ✅ Delete
window.deleteItem = async (id) => {
  if (confirm("Are you sure you want to delete this item?")) {
    await deleteDoc(doc(db, "stock", id));
    loadStock();
  }
};

window.onload = loadStock;
// ---------------- Billing Logic ----------------
const billingForm = document.getElementById("billing-form");
const billOutput = document.getElementById("bill-output");

billingForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const item = document.getElementById("bill-item").value.trim();
  const date = document.getElementById("bill-date").value;
  const rate = parseFloat(document.getElementById("bill-rate").value);
  const qty = parseInt(document.getElementById("bill-qty").value);

  if (!item || !date || isNaN(rate) || isNaN(qty) || qty <= 0 || rate <= 0) return;

  const total = rate * qty;

  billOutput.innerHTML = `
    <h3>Bill Summary</h3>
    <p><strong>Item:</strong> ${item}</p>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Rate:</strong> ${rate}</p>
    <p><strong>Quantity:</strong> ${qty}</p>
    <p><strong>Total:</strong> Rs. ${total}</p>
  `;

  billingForm.reset();
});
