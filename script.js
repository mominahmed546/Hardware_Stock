// Firestore initialization (already in your index.html with firebaseConfig)
const db = firebase.firestore();

const form = document.getElementById("stock-form");
const nameInput = document.getElementById("item-name");
const qtyInput = document.getElementById("item-qty");
const table = document.getElementById("stock-table");

// Add item to Firestore
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const qty = parseInt(qtyInput.value);

  if (!name || isNaN(qty) || qty <= 0) return;

  db.collection("stock").add({
    name: name,
    qty: qty,
    timestamp: new Date()
  }).then(() => {
    nameInput.value = "";
    qtyInput.value = "";
    loadStock(); // reload after add
  }).catch((error) => {
    console.error("Error adding item:", error);
  });
});

// Load stock from Firestore and display in table
function loadStock() {
  table.innerHTML = "";
  db.collection("stock").orderBy("timestamp", "desc").get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const item = doc.data();
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>
            <button onclick="deleteItem('${doc.id}')" class="delete-btn">Delete</button>
          </td>
        `;

        table.appendChild(row);
      });
    }).catch((error) => {
      console.error("Error loading stock:", error);
    });
}

// Delete item by ID from Firestore
function deleteItem(id) {
  if (confirm("Delete this item?")) {
    db.collection("stock").doc(id).delete()
      .then(() => {
        loadStock(); // reload after delete
      }).catch((error) => {
        console.error("Error deleting item:", error);
      });
  }
}

// Load on page open
window.onload = loadStock;
