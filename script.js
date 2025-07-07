import {
  collection, getDocs, addDoc, doc,
  updateDoc, deleteDoc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

window.addEventListener("DOMContentLoaded", () => {
  const stockForm = document.getElementById("stock-form");
  const itemName = document.getElementById("item-name");
  const purchaseRate = document.getElementById("purchase-rate");
  const saleRate = document.getElementById("sale-rate");
  const quantity = document.getElementById("quantity");
  const stockTable = document.getElementById("stock-table");

  const billingForm = document.getElementById("billing-form");
  const customerNameInput = document.getElementById("customer-name");
  const billItemsContainer = document.getElementById("bill-items"); // ✅ fixed ID
  const addBillItemBtn = document.getElementById("add-bill-item");
  const billOutput = document.getElementById("bill-output");

  const filterDateInput = document.getElementById("filter-date");
  const salesHistoryTable = document.getElementById("sales-history");

  let stockItems = {};

  // Load Stock
  async function loadStock() {
    const snap = await getDocs(collection(db, "stock"));
    stockTable.innerHTML = "";
    stockItems = {};
    billItemsContainer.innerHTML = ""; // Reset billing

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

    createBillItemRow();
  }

  // Add/Update Stock
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

  // Delete Stock
  window.deleteStock = async id => {
    if (confirm("Delete this item?")) {
      await deleteDoc(doc(db, "stock", id));
      await loadStock();
    }
  };

  // Create billing row
  function createBillItemRow() {
    const row = document.createElement("div");
    row.className = "bill-row";

    const select = document.createElement("select");
    select.className = "bill-item-select";
    select.innerHTML = '<option value="">Select item</option>';
    Object.values(stockItems).forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      select.appendChild(opt);
    });

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.className = "bill-qty";
    qtyInput.placeholder = "Qty";
    qtyInput.min = 1;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.onclick = () => row.remove();

    row.append(select, qtyInput, removeBtn);
    billItemsContainer.appendChild(row);
  }

  addBillItemBtn.onclick = createBillItemRow;

  // Billing Submission
  billingForm.addEventListener("submit", async e => {
    e.preventDefault();

    const customerName = customerNameInput.value.trim();
    if (!customerName) {
      alert("Please enter customer name.");
      return;
    }

    const rows = billItemsContainer.querySelectorAll(".bill-row");
    const date = new Date().toLocaleDateString();
    let total = 0;
    const saleRecords = [];

    for (const row of rows) {
      const select = row.querySelector(".bill-item-select");
      const qtyInput = row.querySelector(".bill-qty");

      const itemId = select.value;
      const qty = parseInt(qtyInput.value);

      if (!itemId || isNaN(qty) || qty < 1) continue;

      const item = stockItems[itemId];

      if (qty > item.quantity) {
        alert(`Not enough stock for ${item.name}`);
        return;
      }

      const amount = item.saleRate * qty;
      total += amount;

      saleRecords.push({ item, qty, amount });
    }

    if (!saleRecords.length) return;

    for (const record of saleRecords) {
      await updateDoc(doc(db, "stock", record.item.id), {
        quantity: record.item.quantity - record.qty,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, "sales"), {
        name: record.item.name,
        qty: record.qty,
        total: record.amount,
        customer: customerName,
        date,
        createdAt: serverTimestamp()
      });
    }

    billOutput.innerHTML = `
      <div id="invoice">
        <h2>Invoice</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        ${saleRecords.map(r =>
          `<p>${r.item.name} × ${r.qty} @ ${r.item.saleRate} = ${r.amount}</p>`
        ).join('')}
        <h3>Total: ${total}</h3>
        <button onclick="window.print()">🖨️ Print</button>
      </div>
    `;

    billingForm.reset();
    billItemsContainer.innerHTML = "";
    createBillItemRow();
    await loadStock();
    await loadSalesHistory();
  });

  // Load Sales History
  window.loadSalesHistory = async () => {
    const dateVal = filterDateInput.value;
    let q = collection(db, "sales");

    if (dateVal) {
      q = query(q, where("date", "==", dateVal));
    }

    const snap = await getDocs(q);
    salesHistoryTable.innerHTML = "";

    snap.forEach(docSnap => {
      const d = docSnap.data();
      salesHistoryTable.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${d.date}</td>
          <td>${d.customer || ''}</td>
          <td>${d.name}</td>
          <td>${d.qty}</td>
          <td>${d.total}</td>
        </tr>
      `);
    });
  };

  // Initial Load
  loadStock();
  loadSalesHistory();
});