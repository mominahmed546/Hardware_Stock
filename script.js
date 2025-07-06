import {
  collection, getDocs, addDoc, doc,
  updateDoc, deleteDoc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

window.addEventListener("DOMContentLoaded", () => {
  // Stock form elements
  const stockForm = document.getElementById("stock-form");
  const itemName = document.getElementById("item-name");
  const purchaseRate = document.getElementById("purchase-rate");
  const saleRate = document.getElementById("sale-rate");
  const quantity = document.getElementById("quantity");
  const stockTable = document.getElementById("stock-table");

  // Billing elements
  const billingForm = document.getElementById("billing-form");
  const billDropdown = document.getElementById("bill-item-name");
  const billQty = document.getElementById("bill-qty");
  const billOutput = document.getElementById("bill-output");

  // Sales history elements
  const filterDateInput = document.getElementById("filter-date");
  const salesHistoryTable = document.getElementById("sales-history");

  let stockItems = {};

  // Load stock and update billing dropdown
  async function loadStock() {
    const snap = await getDocs(collection(db, "stock"));
    stockTable.innerHTML = "";
    stockItems = {};

    // Clear billing dropdown
    billDropdown.innerHTML = '<option value="">Select Item</option>';

    snap.forEach(docSnap => {
      const data = docSnap.data();
      stockItems[docSnap.id] = { id: docSnap.id, ...data };

      // Populate stock table
      stockTable.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${data.name}</td>
          <td>${data.purchaseRate}</td>
          <td>${data.saleRate}</td>
          <td>${data.quantity}</td>
          <td><button onclick="deleteStock('${docSnap.id}')">Delete</button></td>
        </tr>
      `);

      // Populate billing dropdown
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = data.name;
      billDropdown.appendChild(option);
    });
  }

  // Submit stock form
  stockForm.addEventListener("submit", async e => {
    e.preventDefault();
    const name = itemName.value.trim();
    const pr = parseFloat(purchaseRate.value);
    const sr = parseFloat(saleRate.value);
    const qty = parseInt(quantity.value);
    if (!name || isNaN(pr) || isNaN(sr) || isNaN(qty)) return;

    const existing = Object.values(stockItems).find(i => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await updateDoc(doc(db, "stock", existing.id), {
        purchaseRate: pr,
        saleRate: sr,
        quantity: existing.quantity + qty,
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

  // Delete stock item
  window.deleteStock = async id => {
    if (confirm("Delete this item?")) {
      await deleteDoc(doc(db, "stock", id));
      await loadStock();
    }
  };

  // Submit billing form
  billingForm.addEventListener("submit", async e => {
    e.preventDefault();
    const itemId = billDropdown.value;
    const qtyVal = parseInt(billQty.value);
    if (!itemId || isNaN(qtyVal) || qtyVal < 1) return;

    const item = stockItems[itemId];
    if (qtyVal > item.quantity) {
      alert(`Not enough stock for ${item.name}`);
      return;
    }

    const amount = item.saleRate * qtyVal;
    const date = new Date().toLocaleDateString();

    // Update stock
    await updateDoc(doc(db, "stock", item.id), {
      quantity: item.quantity - qtyVal,
      updatedAt: serverTimestamp()
    });

    // Add sales record
    await addDoc(collection(db, "sales"), {
      name: item.name,
      qty: qtyVal,
      total: amount,
      date,
      createdAt: serverTimestamp()
    });

    // Show bill output
    billOutput.innerHTML = `
      <div id="invoice">
        <h2>Invoice</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p>${item.name} × ${qtyVal} @ ${item.saleRate} = ${amount}</p>
        <h3>Total: ${amount}</h3>
        <button onclick="window.print()">🖨️ Print</button>
      </div>
    `;

    billingForm.reset();
    await loadStock();
    await loadSalesHistory();
  });

  // Load sales history
  window.loadSalesHistory = async () => {
    const dateVal = filterDateInput.value;
    let q = collection(db, "sales");
    if (dateVal) q = query(q, where("date", "==", dateVal));
    const snap = await getDocs(q);
    salesHistoryTable.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      salesHistoryTable.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${d.date}</td>
          <td>${d.name}</td>
          <td>${d.qty}</td>
          <td>${d.total}</td>
        </tr>
      `);
    });
  };

  // Initial load
  loadStock();
  loadSalesHistory();
});
