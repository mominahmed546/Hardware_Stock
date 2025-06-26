// Firebase setup (already initialized in index.html)
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const db = getFirestore();
const stockRef = collection(db, "stock");
const salesRef = collection(db, "sales");

const form = document.getElementById("stock-form");
const nameInput = document.getElementById("item-name");
const qtyInput = document.getElementById("item-qty");
const purchaseInput = document.getElementById("item-purchase");
const saleInput = document.getElementById("item-sale");
const table = document.getElementById("stock-table");

const billForm = document.getElementById("bill-form");
const billName = document.getElementById("bill-item-name");
const billQty = document.getElementById("bill-qty");
const billRate = document.getElementById("bill-rate");
const billDate = document.getElementById("bill-date");
const invoiceDiv = document.getElementById("invoice");

async function loadStock() {
  table.innerHTML = "";
  const snapshot = await getDocs(orderBy(stockRef, "timestamp", "desc"));
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.name}</td>
      <td>${data.qty}</td>
      <td>${data.purchase}</td>
      <td>${data.sale}</td>
      <td><button onclick="deleteItem('${docSnap.id}')">Delete</button></td>
    `;
    table.appendChild(row);
  });
}

async function deleteItem(id) {
  if (confirm("Delete this item?")) {
    await deleteDoc(doc(stockRef, id));
    loadStock();
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const qty = parseInt(qtyInput.value);
  const purchase = parseFloat(purchaseInput.value);
  const sale = parseFloat(saleInput.value);
  if (!name || qty <= 0 || isNaN(purchase) || isNaN(sale)) return;

  const existing = await getDocs(query(stockRef, where("name", "==", name)));
  if (!existing.empty) {
    const docSnap = existing.docs[0];
    const newQty = docSnap.data().qty + qty;
    await updateDoc(doc(stockRef, docSnap.id), { qty: newQty });
  } else {
    await addDoc(stockRef, { name, qty, purchase, sale, timestamp: serverTimestamp() });
  }
  form.reset();
  loadStock();
});

billForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = billName.value.trim();
  const qty = parseInt(billQty.value);
  const rate = parseFloat(billRate.value);
  const date = billDate.value;
  if (!name || qty <= 0 || isNaN(rate)) return;

  const qSnap = await getDocs(query(stockRef, where("name", "==", name)));
  if (qSnap.empty) return alert("Item not in stock");

  const docSnap = qSnap.docs[0];
  const availableQty = docSnap.data().qty;
  if (qty > availableQty) return alert("Not enough stock");

  await updateDoc(doc(stockRef, docSnap.id), { qty: availableQty - qty });
  await addDoc(salesRef, { name, qty, rate, date, timestamp: serverTimestamp() });

  invoiceDiv.innerHTML = `
    <h3>Invoice</h3>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Item:</strong> ${name}</p>
    <p><strong>Quantity:</strong> ${qty}</p>
    <p><strong>Rate:</strong> ${rate}</p>
    <p><strong>Total:</strong> ${qty * rate}</p>
  `;

  window.print();
  billForm.reset();
  loadStock();
});

window.onload = loadStock;
