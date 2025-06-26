import {
  collection, getDocs, addDoc, doc,
  updateDoc, deleteDoc, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const db = window.db;

const stockForm = document.getElementById("stock-form");
const stockTable = document.getElementById("stock-table");
const nameInput = document.getElementById("item-name");
const purchaseRateInput = document.getElementById("purchase-rate");
const saleRateInput = document.getElementById("sale-rate");
const quantityInput = document.getElementById("quantity");

const billingForm = document.getElementById("billing-form");
const billItemSelect = document.getElementById("bill-item-name");
const billQtyInput = document.getElementById("bill-qty");
const billOutput = document.getElementById("bill-output");

const salesHistory = document.getElementById("sales-history");
const filterDate = document.getElementById("filter-date");

async function loadStock() {
  stockTable.innerHTML = "";
  billItemSelect.innerHTML = "<option value=''>Select Item</option>";
  const snapshot = await getDocs(collection(db, "stock"));
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.name}</td>
      <td>${data.purchaseRate}</td>
      <td>${data.saleRate}</td>
      <td>${data.qty}</td>
      <td><button onclick="deleteItem('${docSnap.id}')">Delete</button></td>
    `;
    stockTable.appendChild(row);

    billItemSelect.innerHTML += `<option value="${docSnap.id}" data-name="${data.name}" data-rate="${data.saleRate}">${data.name}</option>`;
  });
}

stockForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const purchaseRate = +purchaseRateInput.value;
  const saleRate = +saleRateInput.value;
  const qty = +quantityInput.value;

  if (!name || !qty || !purchaseRate || !saleRate) return;

  const stockRef = collection(db, "stock");
  const snapshot = await getDocs(stockRef);
  let found = false;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.name.toLowerCase() === name.toLowerCase()) {
      found = true;
      const newQty = data.qty + qty;
      await updateDoc(doc(db, "stock", docSnap.id), { qty: newQty });
      break;
    }
  }

  if (!found) {
    await addDoc(stockRef, { name, purchaseRate, saleRate, qty });
  }

  nameInput.value = "";
  purchaseRateInput.value = "";
  saleRateInput.value = "";
  quantityInput.value = "";

  loadStock();
};

window.deleteItem = async (id) => {
  await deleteDoc(doc(db, "stock", id));
  loadStock();
};

billingForm.onsubmit = async (e) => {
  e.preventDefault();
  const id = billItemSelect.value;
  const qty = +billQtyInput.value;
  if (!id || !qty) return;

  const itemDoc = await getDocs(collection(db, "stock"));
  let item;
  itemDoc.forEach(docSnap => {
    if (docSnap.id === id) {
      item = { ...docSnap.data(), id: docSnap.id };
    }
  });

  if (item.qty < qty) {
    alert("Not enough stock.");
    return;
  }

  const total = item.saleRate * qty;
  billOutput.innerHTML = `
    <h3>Invoice</h3>
    <p><strong>Item:</strong> ${item.name}</p>
    <p><strong>Rate:</strong> ${item.saleRate}</p>
    <p><strong>Quantity:</strong> ${qty}</p>
    <p><strong>Total:</strong> ${total}</p>
    <button onclick="window.print()">Print Bill</button>
  `;

  await updateDoc(doc(db, "stock", item.id), { qty: item.qty - qty });

  await addDoc(collection(db, "sales"), {
    itemName: item.name,
    qty,
    rate: item.saleRate,
    total,
    date: new Date().toISOString().split("T")[0],
    timestamp: serverTimestamp()
  });

  loadStock();
  billQtyInput.value = "";
};

window.loadSalesHistory = async () => {
  salesHistory.innerHTML = "";
  const selectedDate = filterDate.value;
  let q = collection(db, "sales");
  if (selectedDate) {
    q = query(q, where("date", "==", selectedDate));
  }
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.date}</td>
      <td>${data.itemName}</td>
      <td>${data.qty}</td>
      <td>${data.total}</td>
    `;
    salesHistory.appendChild(row);
  });
};

loadStock();
loadSalesHistory();
