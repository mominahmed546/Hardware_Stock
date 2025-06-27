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
  const billSelect = document.getElementById("bill-item-name");
  const billQty = document.getElementById("bill-qty");
  const billOutput = document.getElementById("bill-output");

  const filterDate = document.getElementById("filter-date");
  const salesTable = document.getElementById("sales-history");

  let stockItems = {};

  async function loadStock() {
    const snap = await getDocs(collection(db, "stock"));
    stockTable.innerHTML = "";
    billSelect.innerHTML = `<option value="">Select Item</option>`;
    stockItems = {};
    snap.forEach(docSnap => {
      const data = docSnap.data();
      stockItems[docSnap.id] = { id:docSnap.id, ...data };
      stockTable.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${data.name}</td>
          <td>${data.purchaseRate}</td>
          <td>${data.saleRate}</td>
          <td>${data.quantity}</td>
          <td><button onclick="deleteStock('${docSnap.id}')">Delete</button></td>
        </tr>
      `);
      billSelect.insertAdjacentHTML("beforeend",
        `<option value="${docSnap.id}">${data.name}</option>`);
    });
  }

  stockForm.addEventListener("submit", async e => {
    e.preventDefault();
    const name = itemName.value.trim();
    const pr = parseFloat(purchaseRate.value);
    const sr = parseFloat(saleRate.value);
    const qty = parseInt(quantity.value);
    if (!name||isNaN(pr)||isNaN(sr)||isNaN(qty)) return;
    let exists = Object.values(stockItems).find(i => i.name.toLowerCase()===name.toLowerCase());
    if (exists) {
      await updateDoc(doc(db,"stock",exists.id),{
        quantity:exists.quantity+qty, purchaseRate:pr, saleRate:sr,
        updatedAt:serverTimestamp()
      });
    } else {
      await addDoc(collection(db,"stock"),{name,purchaseRate:pr,saleRate:sr,quantity:qty,createdAt:serverTimestamp()});
    }
    stockForm.reset(); await loadStock();
  });

  window.deleteStock = async id => {
    if (confirm("Delete this item?")) {
      await deleteDoc(doc(db,"stock",id));
      loadStock();
    }
  };

  billingForm.addEventListener("submit", async e => {
    e.preventDefault();
    const id = billSelect.value;
    const qty = parseInt(billQty.value);
    if (!id||isNaN(qty)) return;
    const item = stockItems[id];
    if (!item||qty>item.quantity) return alert("Invalid qty");
    // update stock
    await updateDoc(doc(db,"stock",id),{quantity:item.quantity-qty,updatedAt:serverTimestamp()});
    const total = item.saleRate*qty;
    const date = new Date().toLocaleDateString();
    await addDoc(collection(db,"sales"),{name:item.name,qty,total,date,createdAt:serverTimestamp()});
    billOutput.innerHTML = `
      <div id="invoice">
        <h2>Invoice</h2>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Item:</strong> ${item.name}</p>
        <p><strong>Qty:</strong> ${qty}</p>
        <p><strong>Rate:</strong> ${item.saleRate}</p>
        <p><strong>Total:</strong> ${total}</p>
        <button onclick="window.print()">🖨️ Print</button>
      </div>
    `;
    billingForm.reset();
    loadStock();
    loadSalesHistory();
  });

  window.loadSalesHistory = async () => {
    const dateVal = filterDate.value;
    let q = collection(db,"sales");
    if (dateVal) q = query(q,where("date","==",dateVal));
    const snap = await getDocs(q);
    salesTable.innerHTML="";
    snap.forEach(docSnap=>{
      const d=docSnap.data();
      salesTable.insertAdjacentHTML("beforeend",`
        <tr>
          <td>${d.date}</td><td>${d.name}</td><td>${d.qty}</td><td>${d.total}</td>
        </tr>`);
    });
  };

  // initial
  loadStock();
  loadSalesHistory();
});
