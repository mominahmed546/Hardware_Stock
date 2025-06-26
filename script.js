let stock = JSON.parse(localStorage.getItem("stock")) || [];

const form = document.getElementById("stock-form");
const nameInput = document.getElementById("item-name");
const qtyInput = document.getElementById("item-qty");
const table = document.getElementById("stock-table");

function saveStock() {
  localStorage.setItem("stock", JSON.stringify(stock));
}

function renderTable() {
  table.innerHTML = "";
  stock.forEach((item, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>
        <button onclick="deleteItem(${index})" class="delete-btn">Delete</button>
      </td>
    `;
    table.appendChild(row);
  });
}

function deleteItem(index) {
  stock.splice(index, 1);
  saveStock();
  renderTable();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const qty = parseInt(qtyInput.value);

  if (!name || isNaN(qty) || qty <= 0) return;

  stock.push({ name, qty });
  saveStock();
  renderTable();

  nameInput.value = "";
  qtyInput.value = "";
});

renderTable();
