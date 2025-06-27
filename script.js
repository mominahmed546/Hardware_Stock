// Import Firebase modules
import {
  collection, getDocs, addDoc, doc, updateDoc,
  deleteDoc, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

const stockForm = document.getElementById("stock-form");
const billingForm = document.getElementById("billing-form");
const filterDate = document.getElementById("filter-date");

const itemNameInput = document.getElementById("item-name");
const purchaseRateInput = document.getElementById("purchase-rate");
const saleRateInput = document.getElementById("sale-rate");
const quantityInput = document.getElementById("quantity");

const billItemName = document.getElementById("bill-item-name");
const billQtyInput = document.getElementById("bill-qty");
const billOutput = document.getElementById("bill-output");

const stockTable = document.getElementById("stock-table");
const salesHistoryTable = document.getElementById("sales-history");

let stockItems = {}; // in-memory cache for fast billing

// Load and display stock data
async function loadStock() {
  const snapshot = await getDocs(collection(db, "stock"));
  stockTable.innerHTML = "";
  billItemName.innerHTML = "";
  stockItems = {};

  snapshot.forEach(docSnap => {
    const item = docSnap.data();
    stockItems[docSnap.id] = { id: docSnap.id, ...item };

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.purchaseRate}</td>
      <td>${item.saleRate}</td>
      <td>${item.quantity}</td>
      <td><button onclick="deleteItem('${docSnap.id}')">Delete</button></td>
    `;
    stockTable.appendChild(row);

    const option = document.createElement("option");
    option.value = docSnap.id;
    option.textContent = item.name;
    billItemName.appendChild(option);
  });
}

// Add or update stock
stockForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = itemNameInput.value.trim();
  const purchaseRate = parseFloat(purchaseRateInput.value);
  const saleRate = parseFloat(saleRateInput.value);
  const quantity = parseInt(quantityInput.value);

  if (!name || isNaN(purchaseRate) || isNaN(saleRate) || isNaN(quantity)) return;

  let existing = null;
  for (const id in stockItems) {
    if (stockItems[id].name.toLowerCase() === name.toLowerCase()) {
      existing = stockItems[id];
      break;
    }
  }

  if (existing) {
    await updateDoc(doc(db, "stock", existing.id), {
      quantity: existing.quantity + quantity,
      purchaseRate,
      saleRate,
      updatedAt: serverTimestamp()
    });
  } else {
    await addDoc(collection(db, "stock"), {
      name,
      purchaseRate,
      saleRate,
      quantity,
      createdAt: serverTimestamp()
    });
  }

  itemNameInput.value = "";
  purchaseRateInput.value = "";
  saleRateInput.value = "";
  quantityInput.value = "";
  await loadStock();
});

// Delete stock item
async function deleteItem(id) {
  if (confirm("Are you sure you want to delete this item?")) {
    await deleteDoc(doc(db, "stock", id));
    await loadStock();
  }
}

// Billing
billingForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const itemId = billItemName.value;
  const quantity = parseInt(billQtyInput.value);
  const item = stockItems[itemId];
  if (!item || isNaN(quantity) || quantity <= 0 || quantity > item.quantity) return;

  const total = item.saleRate * quantity;
  const date = new Date().toISOString().slice(0, 10);

  // Update stock
  await updateDoc(doc(db, "stock", itemId), {
    quantity: item.quantity - quantity
  });

  // Save bill to DB
  await addDoc(collection(db, "sales"), {
    name: item.name,
    qty: quantity,
    total,
    date,
    createdAt: serverTimestamp()
  });

  billOutput.innerHTML = `
    <div id="invoice">
      <h2>Invoice</h2>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Item:</strong> ${item.name}</p>
      <p><strong>Quantity:</strong> ${quantity}</p>
      <p><strong>Rate:</strong> ${item.saleRate}</p>
      <p><strong>Total:</strong> ${total}</p>
      <button onclick="window.print()">🖨️ Print</button>
    </div>
  `;

  billQtyInput.value = "";
  await loadStock();
  await loadSalesHistory();
});

// Load sales history
async function loadSalesHistory() {
  const salesRef = collection(db, "sales");
  let q = salesRef;
  const filter = filterDate.value;
  if (filter) q = query(salesRef, where("date", "==", filter));

  const snapshot = await getDocs(q);
  salesHistoryTable.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.date}</td>
      <td>${data.name}</td>
      <td>${data.qty}</td>
      <td>${data.total}</td>
    `;
    salesHistoryTable.appendChild(row);
  });
}

// Initial Load
loadStock();
loadSalesHistory();
