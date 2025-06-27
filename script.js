// script.js

// Import Firebase Firestore modules
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

// Wait for DOM to load
window.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const stockForm = document.getElementById("stock-form");
  const itemNameInput = document.getElementById("item-name");
  const purchaseRateInput = document.getElementById("purchase-rate");
  const saleRateInput = document.getElementById("sale-rate");
  const quantityInput = document.getElementById("quantity");
  const stockTable = document.getElementById("stock-table");

  const billingForm = document.getElementById("billing-form");
  const billItemSelect = document.getElementById("bill-item-name");
  const billQtyInput = document.getElementById("bill-qty");
  const billOutput = document.getElementById("bill-output");

  const filterDateInput = document.getElementById("filter-date");
  const salesHistoryTable = document.getElementById("sales-history");

  let stockItems = {};

  // Load stock items from Firestore
  async function loadStock() {
    const snap = await getDocs(collection(db, "stock"));
    stockTable.innerHTML = "";
    billItemSelect.innerHTML = "<option value=\"\">Select Item</option>";
    stockItems = {};

    snap.forEach(docSnap => {
      const data = docSnap.data();
      stockItems[docSnap.id] = { id: docSnap.id, ...data };

      // Render row
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.name}</td>
        <td>${data.purchaseRate}</td>
        <td>${data.saleRate}</td>
        <td>${data.quantity}</td>
        <td><button onclick="deleteStock('${docSnap.id}')">Delete</button></td>
      `;
      stockTable.appendChild(tr);

      // Add to billing select
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = data.name;
      billItemSelect.appendChild(opt);
    });
  }

  // Add or update stock
  stockForm.addEventListener("submit", async e => {
    e.preventDefault();
    const name = itemNameInput.value.trim();
    const purchaseRate = parseFloat(purchaseRateInput.value);
    const saleRate = parseFloat(saleRateInput.value);
    const quantity = parseInt(quantityInput.value);

    if (!name || isNaN(purchaseRate) || isNaN(saleRate) || isNaN(quantity)) return;

    // Check if exists
    let existingId = null;
    Object.values(stockItems).forEach(item => {
      if (item.name.toLowerCase() === name.toLowerCase()) existingId = item.id;
    });

    if (existingId) {
      // Update quantity and rates
      const item = stockItems[existingId];
      await updateDoc(doc(db, "stock", existingId), {
        quantity: item.quantity + quantity,
        purchaseRate,
        saleRate,
        updatedAt: serverTimestamp()
      });
    } else {
      // Add new
      await addDoc(collection(db, "stock"), {
        name,
        purchaseRate,
        saleRate,
        quantity,
        createdAt: serverTimestamp()
      });
    }

    stockForm.reset();
    await loadStock();
  });

  // Delete stock item
  window.deleteStock = async id => {
    if (confirm("Delete this item?")) {
      await deleteDoc(doc(db, "stock", id));
      await loadStock();
    }
  };

  // Billing form
  billingForm.addEventListener("submit", async e => {
    e.preventDefault();
    const itemId = billItemSelect.value;
    const qty = parseInt(billQtyInput.value);
    if (!itemId || isNaN(qty)) return;

    const item = stockItems[itemId];
    if (!item || qty > item.quantity) { alert("Invalid quantity"); return; }

    // Update stock
    await updateDoc(doc(db, "stock", itemId), {
      quantity: item.quantity - qty,
      updatedAt: serverTimestamp()
    });

    const total = item.saleRate * qty;
    const date = new Date().toLocaleDateString();

    // Save to sales
    await addDoc(collection(db, "sales"), {
      name: item.name,
      qty,
      rate: item.saleRate,
      total,
      date,
      createdAt: serverTimestamp()
    });

    // Show invoice
    billOutput.innerHTML = `
      <div id="invoice">
        <h2>Invoice</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Item:</strong> ${item.name}</p>
        <p><strong>Quantity:</strong> ${qty}</p>
        <p><strong>Rate:</strong> ${item.saleRate}</p>
        <p><strong>Total:</strong> ${total}</p>
        <button onclick="window.print()">🖨️ Print</button>
      </div>
    `;

    billingForm.reset();
    await loadStock();
    await loadSalesHistory();
  });

  // Load sales history
  window.loadSalesHistory = async () => {
    const filter = filterDateInput.value;
    let q = collection(db, "sales");
    if (filter) q = query(q, where("date", "==", filter));

    const snap = await getDocs(q);
    salesHistoryTable.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const displayName = d.name || d.itemName || "(unknown)";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.date}</td>
        <td>${displayName}</td>
        <td>${d.qty}</td>
        <td>${d.total}</td>
      `;
      salesHistoryTable.appendChild(tr);
    });
  };

  // Initial loads
  loadStock();
  loadSalesHistory();
});
