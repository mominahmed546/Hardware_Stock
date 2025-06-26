// Access the Firestore setup from index.html
const db = window.db;
const { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } = window.firestoreTools;

const form = document.getElementById("stock-form");
const nameInput = document.getElementById("item-name");
const qtyInput = document.getElementById("item-qty");
const table = document.getElementById("stock-table");

// Add item to Firestore
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const qty = parseInt(qtyInput.value);

  if (!name || isNaN(qty) || qty <= 0) return;

  try {
    await addDoc(collection(db, "stock"), {
      name: name,
      qty: qty,
      timestamp: serverTimestamp()
    });
    nameInput.value = "";
    qtyInput.value = "";
    loadStock(); // Refresh table
  } catch (error) {
    console.error("Error adding item:", error);
  }
});

// Load stock from Firestore and display
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
          <button onclick="deleteItem('${docSnap.id}')" class="delete-btn">Delete</button>
        </td>
      `;
      table.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading stock:", error);
  }
}

// Delete item from Firestore
async function deleteItem(id) {
  if (confirm("Delete this item?")) {
    try {
      await deleteDoc(doc(db, "stock", id));
      loadStock();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  }
}

// Load stock when page loads
window.onload = loadStock;
