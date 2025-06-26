const db = window.db;
const { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } = window.firestoreTools;

const form = document.getElementById("stock-form");
const nameInput = document.getElementById("item-name");
const qtyInput = document.getElementById("item-qty");
const table = document.getElementById("stock-table");

// Add item
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
  } catch (err) {
    console.error("Error adding item:", err);
  }
});

// Load items
async function loadStock() {
  table.innerHTML = "";
  try {
    const snapshot = await getDocs(collection(db, "stock"));
    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>
          <button onclick="deleteItem('${docSnap.id}')">Delete</button>
        </td>
      `;
      table.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading stock:", err);
  }
}

// Delete item
async function deleteItem(id) {
  if (confirm("Delete this item?")) {
    try {
      await deleteDoc(doc(db, "stock", id));
      loadStock();
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  }
}

window.onload = loadStock;
