// script.js

import {
  collection, getDocs, addDoc, doc,
  updateDoc, deleteDoc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

window.addEventListener("DOMContentLoaded", () => {
  // Stock form elements
  const stockForm = document.getElementById("stock-form");
  const itemNameInput = document.getElementById("item-name");
  const purchaseRateInput = document.getElementById("purchase-rate");
  const saleRateInput = document.getElementById("sale-rate");
  const quantityInput = document.getElementById("quantity");
  const stockTable = document.getElementById("stock-table");

  // Billing elements for multiple items
  const billingForm = document.getElementById("billing-form");
  const billItemsContainer = document.getElementById("bill-items");
  const addBillItemBtn = document.getElementById("add-bill-item");
  const billOutput = document.getElementById("bill-output");

  const filterDateInput = document.getElementById("filter-date");
  const salesHistoryTable = document.getElementById("sales-history");

  let stockItems = {};

  // Load stock items from Firestore
  async function loadStock() {
    const snap = await getDocs(collection(db, "stock"));
    stockTable.innerHTML = "";
    stockItems = {};
    snap.forEach(docSnap => {
      const data = docSnap.data();
      stockItems[docSnap.id] = { id: docSnap.id, ...data };
      stockTable.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${data.name}</td>
          <td>${data.purchaseRate}</td>
          <td>${data.saleRate}</td>
          <td>${data.quantity}</td>
          <td><button onclick="deleteStock('${docSnap.id}')">Delete</button></td>
        </tr>
      `);
    });
    // After stock loaded, reset billing items
    billItemsContainer.innerHTML = "";
    // Create initial billing row
    createBillItemRow();
  }

  // Add or update stock
  stockForm.addEventListener("submit", async e => {
    e.preventDefault();
    const name = itemNameInput.value.trim();
    const pr = parseFloat(purchaseRateInput.value);
    const sr = parseFloat(saleRateInput.value);
    const qty = parseInt(quantityInput.value);
    if (!name || isNaN(pr) || isNaN(sr) || isNaN(qty)) return;
    let exists = Object.values(stockItems).find(i => i.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      await updateDoc(doc(db, "stock", exists.id), {
        quantity: exists.quantity + qty,
        purchaseRate: pr,
        saleRate: sr,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, "stock"), {
        name,
        purchaseRate: pr,
        saleRate: sr,
        quantity: qty,
        createdAt: serverTimestamp()
      });
    }
    stockForm.reset();
    await loadStock();
  });

  // Delete stock
  window.deleteStock = async id => {
    if (confirm("Delete this item?")) {
      await deleteDoc(doc(db, "stock", id));
      loadStock();
    }
  };

  // Billing: dynamic items
  function createBillItemRow() {
    const row = document.createElement("div");
    row.classList.add("bill-row");
    row.innerHTML = `
      <select class="bill-item-select">
        <option value="">Select item</option>
        ${Object.values(stockItems).map(i => `<option value="${i.id}" data-rate="${i.saleRate}">${i.name}</option>`).join('')}
      </select>
      <input type="number" class="bill-qty" placeholder="Qty" min="1"/>
      <button type="button" class="remove-bill-item">×</button>
    `;
    billItemsContainer.appendChild(row);
    row.querySelector('.remove-bill-item').onclick = () => row.remove();
  }

  addBillItemBtn.onclick = () => createBillItemRow();

  billingForm.addEventListener("submit", async e => {
    e.preventDefault();
    const rows = [...billItemsContainer.children];
    let totalAmount = 0;
    const date = new Date().toLocaleDateString();
    const saleRecords = [];
    for (const row of rows) {
      const sel = row.querySelector('.bill-item-select');
      const qtyInput = row.querySelector('.bill-qty');
      const itemId = sel.value;
      const qty = parseInt(qtyInput.value);
      if (!itemId || isNaN(qty) || qty < 1) continue;
      const item = stockItems[itemId];
      if (qty > item.quantity) { alert('Not enough stock for ' + item.name); return; }
      const amount = item.saleRate * qty;
      totalAmount += amount;
      saleRecords.push({ item, qty, amount });
    }
    if (!saleRecords.length) return;
    for (const rec of saleRecords) {
      await updateDoc(doc(db, 'stock', rec.item.id), { quantity: rec.item.quantity - rec.qty, updatedAt: serverTimestamp() });
      await addDoc(collection(db, 'sales'), { name: rec.item.name, qty: rec.qty, total: rec.amount, date, createdAt: serverTimestamp() });
    }
    billOutput.innerHTML = `
      <div id="invoice">
        <h2>Invoice</h2>
        <p><strong>Date:</strong> ${date}</p>
        ${saleRecords.map(r => `<p>${r.item.name} × ${r.qty} @ ${r.item.saleRate} = ${r.amount}</p>`).join('')}
        <h3>Total: ${totalAmount}</h3>
        <button onclick="window.print()">🖨️ Print</button>
      </div>
    `;
    billingForm.reset();
    // Initialize billing rows again
    billItemsContainer.innerHTML = "";
    createBillItemRow();
    loadStock();
    loadSalesHistory();
  });

  // Load sales history
  window.loadSalesHistory = async () => {
    const dateVal = filterDateInput.value;
    let q = collection(db, 'sales');
    if (dateVal) q = query(q, where('date', '==', dateVal));
    const snap = await getDocs(q);
    salesHistoryTable.innerHTML = '';
    snap.forEach(docSnap => {
      const d = docSnap.data();
      salesHistoryTable.insertAdjacentHTML('beforeend', `<tr><td>${d.date}</td><td>${d.name}</td><td>${d.qty}</td><td>${d.total}</td></tr>`);
    });
  };

  // Initial load
  loadStock();
  loadSalesHistory();
});
