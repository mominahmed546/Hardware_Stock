// ✅ Import Firebase modules directly in script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBbnsRkO-vDFENo0bvlRhz2mWUx__c_m80",
  authDomain: "hardwarestock-84447.firebaseapp.com",
  projectId: "hardwarestock-84447",
  storageBucket: "hardwarestock-84447.firebasestorage.app",
  messagingSenderId: "240781950352",
  appId: "1:240781950352:web:2c58f6ee22b5828ecf0715",
  measurementId: "G-47W205FW1S"
};

// ✅ Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ DOM elements
const form = document.getElementById("stock-form");
const nameInput = document.getElementById("item-name");
const qtyInput = document.getElementById("item-qty");
const table = document.getElementById("stock-table");

// ✅ Add item to Firestore
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const qty = parseInt(qtyInput.value);

  if (!name || isNaN(qty) || qty <= 0) return;

  try {
    await addDoc(collection(db, "stock"), {
      name,
      qty,
      timestamp: serverTimestamp()
    });
    nameInput.value = "";
    qtyInput.value = "";
    loadStock();
  } catch (error) {
    console.error("Error adding item:", error);
  }
});

// ✅ Load and render stock
async function loadStock() {
  table.innerHTML = "";
  try {
    const snapshot = await getDocs(collection(db, "stock"));
    snapshot.forEach((docItem) => {
      const item = docItem.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td><button onclick="deleteItem('${docItem.id}')" class="delete-btn">Delete</button></td>
      `;
      table.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading stock:", error);
  }
}

// ✅ Delete item
async function deleteItem(id) {
  if (confirm("Are you sure you want to delete this item?")) {
    try {
      await deleteDoc(doc(db, "stock", id));
      loadStock();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  }
}

// ✅ Load on start
window.onload = loadStock;
