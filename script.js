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
  const billItemsContainer = document.getElementById("bill-items");
  const addBillItemBtn = document.getElementById("add-bill-item");
  const billOutput = document.getElementById("bill-output");

  const filterDateInput = document.getElementById("filter-date");
  const salesHistoryTable = document.getElementById("sales-history");

  let stockItems = {};

  async function loadStock() {
    const snap = await getDocs(collection(db, "stock"));
    stockTable.innerHTML = "";
    stockItems = {};
    billItemsContainer.innerHTML = "";

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

  window.deleteStock = async id => {
    if (confirm("Delete this item?")) {
      await deleteDoc(doc(db, "stock", id));
      await loadStock();
    }
  };

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

    // 🔁 Get previous balance from ledger (for specific customer)
    let previousBalance = 0;
    const ledgerSnap = await getDocs(query(collection(db, "ledger"), where("account", "==", customerName)));
    ledgerSnap.forEach(doc => {
  const data = doc.data();
  if ((data.account || '').toLowerCase() === customerName.toLowerCase()) {
    previousBalance += (data.debit || 0) - (data.credit || 0);
  }
});


    // 🧾 Prepare invoice data
    const now = new Date();
    const invoiceData = {
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      customer: customerName,
      saleId: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
      items: saleRecords.map(r => ({
        name: r.item.name,
        rate: r.item.saleRate,
        qty: r.qty,
        total: r.amount
      })),
      previousBalance,
      totalBalance: previousBalance + total,
      netTotal: previousBalance + total
    };

    openInvoiceTab(invoiceData);

    billingForm.reset();
    billItemsContainer.innerHTML = "";
    createBillItemRow();
    await loadStock();
    await loadSalesHistory();
  });

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

  loadStock();
  loadSalesHistory();
});

function openInvoiceTab(invoiceData) {
  const newTab = window.open('', '_blank');
  newTab.document.write(`
    <html>
    <head>
      <title>Invoice</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h2, h3 { text-align: center; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        .total { font-weight: bold; text-align: right; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; font-style: italic; }
        .download-btn { margin-top: 20px; text-align: center; }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    </head>
    <body>
      <div id="invoice-content">
        <h2>Hardware</h2>
        <h3>Office no.316 St 5A sardar plaza gulraiz Ph-II, High Court Rd, Rwp</h3>
        <p> Ph: 0300-5411417 | 0300-4339933</p>
        <p><strong>Date:</strong> ${invoiceData.date} | <strong>Time:</strong> ${invoiceData.time}</p>
        <p><strong>Customer:</strong> ${invoiceData.customer} | <strong>Sale ID:</strong> ${invoiceData.saleId}</p>

        <table>
          <thead>
            <tr><th>Product</th><th>Rate</th><th>Qty</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${invoiceData.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.rate}</td>
                <td>${item.qty}</td>
                <td>${item.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p class="total">Previous Balance: Rs.${invoiceData.previousBalance}</p>
        <p class="total">Total Balance: Rs.${invoiceData.totalBalance}</p>
        <h3 class="total">Net Total: Rs.${invoiceData.totalBalance}</h3>

        <div class="footer">Return Policy</div>
        <div class="download-btn">
          <button onclick="window.print()">🖨️ Print</button>
          <button onclick="downloadPDF()">⬇️ Download PDF</button>
        </div>
      </div>

      <script>
        function downloadPDF() {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();
          doc.html(document.getElementById('invoice-content'), {
            callback: function (pdf) {
              pdf.save('invoice-${invoiceData.saleId}.pdf');
            },
            x: 10,
            y: 10
          });
        }
      </script>
    </body>
    </html>
  `);
  newTab.document.close();
}
