/**
 * MK EVENTS ET CONSEILS - Receipt App Engine
 * - Dynamic row calculations
 * - Strict 1-Page A4 PDF generator (html2pdf)
 * - Number to words in French (FCFA)
 * - Mobile navigation & LocalStorage history
 */

const STORAGE_KEY = 'mkevents_saved_receipts';

const state = {
  activeScreen: 'screen-editor',
  receiptNo: 'MK-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100),
  date: new Date().toISOString().split('T')[0],
  paymentMode: 'Espèces',
  clientName: '',
  clientPhone: '',
  clientCity: '',
  discount: 0,
  advance: 0,
  notes: '',
  zoom: 0.65,
  items: [
    { id: 1, name: 'Service Traiteur Buffet Prestige', qty: 50, price: 8500 },
    { id: 2, name: 'Location Couverts complets VIP', qty: 50, price: 1500 },
    { id: 3, name: 'Décoration Salle & Scène des Mariés', qty: 1, price: 180000 }
  ],
  menus: [
    {
      id: 'menu-1',
      mainTitle: 'PROPOSITION MENU',
      priceInfo: '8 500 FCFA / Assiette',
      sections: [
        {
          id: 'sec-1',
          title: 'Entrée',
          itemsText: 'Salade composée\nŒufs durs, Sauce cocktail'
        },
        {
          id: 'sec-2',
          title: 'Plats chauds',
          itemsText: 'Ndolè Royal\nÉmincé de bœuf aux oignons\nPoulet yassa\nFricassé de poisson\nPorc fumé sauté'
        },
        {
          id: 'sec-3',
          title: 'Complément',
          itemsText: 'Igname blanche\nRiz créole\nMiondo\nPlantain frit'
        },
        {
          id: 'sec-4',
          title: 'Dessert',
          itemsText: 'Cascade de fruits de saison'
        }
      ]
    }
  ]
};

// DOM Elements
const inputDate = document.getElementById('input-date');
const inputPaymentMode = document.getElementById('input-payment-mode');
const inputClientName = document.getElementById('input-client-name');
const inputClientPhone = document.getElementById('input-client-phone');
const inputClientCity = document.getElementById('input-client-city');
const inputDiscount = document.getElementById('input-discount');
const inputAdvance = document.getElementById('input-advance');
const inputNotes = document.getElementById('input-notes');

// Menus Editor DOM Elements
const btnAddMenuBlock = document.getElementById('btn-add-menu-block');
const menusContainer = document.getElementById('menus-container');

// Menus Preview DOM Elements
const viewMenusContainer = document.getElementById('view-menus-container');

const displayReceiptNo = document.getElementById('display-receipt-no');
const itemsList = document.getElementById('items-list');
const btnAddItem = document.getElementById('btn-add-item');

const btnNew = document.getElementById('btn-new');
const btnSave = document.getElementById('btn-save');
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');

const viewReceiptNo = document.getElementById('view-receipt-no');
const viewReceiptDate = document.getElementById('view-receipt-date');
const viewClientName = document.getElementById('view-client-name');
const viewClientPhone = document.getElementById('view-client-phone');
const receiptTableBody = document.getElementById('receipt-table-body');
const viewWordsAmount = document.getElementById('view-words-amount');
const viewNotes = document.getElementById('view-notes');
const viewNotesContainer = document.getElementById('view-notes-container');

const viewTotalGross = document.getElementById('view-total-gross');
const viewTotalDiscount = document.getElementById('view-total-discount');
const viewDiscountRow = document.getElementById('view-discount-row');
const viewTotalNet = document.getElementById('view-total-net');
const viewTotalAdvance = document.getElementById('view-total-advance');
const viewTotalBalance = document.getElementById('view-total-balance');
const barTotalAmount = document.getElementById('bar-total-amount');

const receiptSheet = document.getElementById('receipt-sheet');
const previewViewport = document.getElementById('preview-viewport');
const zoomValue = document.getElementById('zoom-value');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomReset = document.getElementById('btn-zoom-reset');

const historyList = document.getElementById('history-list');
const historySearch = document.getElementById('history-search');
const toastEl = document.getElementById('toast');

// Format Number Currency
function formatFCFA(val) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(val || 0)) + ' FCFA';
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoStr;
}

// Convert Number to French Words
function numberToFrenchWords(number) {
  let num = Math.round(Number(number) || 0);
  if (num === 0) return 'Zéro Franc CFA';
  if (num < 0) return 'Moins ' + numberToFrenchWords(Math.abs(num));

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertChunk(n) {
    let chunk = '';
    const h = Math.floor(n / 100);
    const r = n % 100;

    if (h > 0) {
      if (h === 1) chunk += 'cent ';
      else chunk += units[h] + (r === 0 ? ' cents ' : ' cent ');
    }

    if (r > 0) {
      if (r < 10) {
        chunk += units[r] + ' ';
      } else if (r < 20) {
        chunk += teens[r - 10] + ' ';
      } else {
        const t = Math.floor(r / 10);
        const u = r % 10;
        if (t === 7) {
          chunk += (u === 1 ? 'soixante et onze ' : 'soixante-' + teens[u] + ' ');
        } else if (t === 9) {
          chunk += 'quatre-vingt-' + teens[u] + ' ';
        } else {
          if (u === 1 && t !== 8) {
            chunk += tens[t] + ' et un ';
          } else if (u === 0) {
            chunk += tens[t] + ' ';
          } else {
            chunk += tens[t] + '-' + units[u] + ' ';
          }
        }
      }
    }
    return chunk;
  }

  const billions = Math.floor(num / 1000000000);
  num %= 1000000000;
  const millions = Math.floor(num / 1000000);
  num %= 1000000;
  const thousands = Math.floor(num / 1000);
  const rest = num % 1000;

  let result = '';
  if (billions > 0) {
    result += (billions === 1 ? 'un milliard ' : convertChunk(billions) + ' milliards ');
  }
  if (millions > 0) {
    result += (millions === 1 ? 'un million ' : convertChunk(millions) + ' millions ');
  }
  if (thousands > 0) {
    result += (thousands === 1 ? 'mille ' : convertChunk(thousands) + ' mille ');
  }
  if (rest > 0) {
    result += convertChunk(rest);
  }

  result = result.trim();
  return result.charAt(0).toUpperCase() + result.slice(1) + ' Francs CFA';
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// Switch Screens
function switchScreen(screenId) {
  state.activeScreen = screenId;
  document.querySelectorAll('.screen-view').forEach(s => s.classList.toggle('active', s.id === screenId));
  document.querySelectorAll('.nav-button').forEach(b => b.classList.toggle('active', b.dataset.screen === screenId));

  if (screenId === 'screen-preview') {
    autoFitSheet();
  } else if (screenId === 'screen-history') {
    renderHistoryList();
  }
}

// Render Line Items in Form Editor
function renderItemsEditor() {
  itemsList.innerHTML = '';
  state.items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'item-editor-card';
    const rowTotal = (item.qty || 0) * (item.price || 0);

    row.innerHTML = `
      <div class="item-editor-row-1">
        <span class="item-num">#${index + 1}</span>
        <input type="text" class="item-desc" placeholder="Désignation de la prestation / matériel" value="${escapeHtml(item.name || '')}">
        <button class="btn-remove-item" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
      </div>
      <div class="item-editor-row-2">
        <div class="form-group">
          <label>Quantité</label>
          <input type="number" class="item-qty" min="1" value="${item.qty || 1}">
        </div>
        <div class="form-group">
          <label>Prix Unitaire</label>
          <input type="number" class="item-price" min="0" step="500" value="${item.price || 0}">
        </div>
        <div class="form-group">
          <label>Total Ligne</label>
          <div class="item-total-preview">${formatFCFA(rowTotal)}</div>
        </div>
      </div>
    `;

    // Bind item inputs
    const descInput = row.querySelector('.item-desc');
    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');
    const delBtn = row.querySelector('.btn-remove-item');

    descInput.addEventListener('input', (e) => {
      item.name = e.target.value;
      updateReceiptCalculations();
    });

    qtyInput.addEventListener('input', (e) => {
      item.qty = Number(e.target.value) || 0;
      row.querySelector('.item-total-preview').textContent = formatFCFA((item.qty || 0) * (item.price || 0));
      updateReceiptCalculations();
    });

    priceInput.addEventListener('input', (e) => {
      item.price = Number(e.target.value) || 0;
      row.querySelector('.item-total-preview').textContent = formatFCFA((item.qty || 0) * (item.price || 0));
      updateReceiptCalculations();
    });

    delBtn.addEventListener('click', () => {
      if (state.items.length <= 1) {
        showToast('Le reçu doit contenir au moins 1 ligne.');
        return;
      }
      state.items = state.items.filter(it => it.id !== item.id);
      renderItemsEditor();
      updateReceiptCalculations();
    });

    itemsList.appendChild(row);
  });
}

function addNewItem() {
  if (state.items.length >= 14) {
    showToast('Limite atteinte : maximum 14 lignes pour garantir 1 seule page A4.');
    return;
  }
  const newItem = {
    id: Date.now(),
    name: 'Nouvelle prestation',
    qty: 1,
    price: 10000
  };
  state.items.push(newItem);
  renderItemsEditor();
  updateReceiptCalculations();
  showToast('Ligne ajoutée !');
}

// Render Menu Sections in Form Editor
// Render Menus in Form Editor (Supports multiple menus)
function renderMenusEditor() {
  if (!state.menus) {
    state.menus = [];
  }

  menusContainer.innerHTML = '';

  if (state.menus.length === 0) {
    menusContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-sub); padding: 18px 10px; font-size: 11.5px; border: 1px dashed var(--border-color); border-radius: var(--radius-sm);">
        <i class="fa-solid fa-utensils" style="font-size: 20px; margin-bottom: 6px; display: block; opacity: 0.6;"></i>
        Aucun menu configuré. Cliquez sur <strong>"Ajouter un menu"</strong> pour ajouter une proposition (Entrée, Plats, etc.).
      </div>
    `;
    return;
  }

  state.menus.forEach((menu, menuIndex) => {
    const block = document.createElement('div');
    block.className = 'menu-block-card';

    block.innerHTML = `
      <div class="menu-block-topbar">
        <span class="menu-block-badge">
          <i class="fa-solid fa-bowl-food"></i> Menu #${menuIndex + 1}
        </span>
        <button class="btn-remove-item btn-del-menu-block" title="Supprimer ce menu">
          <i class="fa-solid fa-trash-can"></i> Supprimer
        </button>
      </div>

      <div class="form-grid-2">
        <div class="form-group">
          <label>Titre Principal du Menu</label>
          <input type="text" class="input-menu-title" placeholder="Ex: PROPOSITION MENU 1" value="${escapeHtml(menu.mainTitle || '')}">
        </div>
        <div class="form-group">
          <label>Prix par assiette / plat (optionnel)</label>
          <input type="text" class="input-menu-price" placeholder="Ex: 8 500 FCFA / assiette" value="${escapeHtml(menu.priceInfo || '')}">
        </div>
      </div>

      <div class="menu-sections-editor-list">
        <!-- Rendered categories of this menu -->
      </div>

      <button class="btn-sm btn-outline-gold btn-add-category" type="button" style="margin-top: 4px; justify-content: center;">
        <i class="fa-solid fa-plus"></i> Ajouter une rubrique (Entrée, Plats chauds...)
      </button>
    `;

    const titleInput = block.querySelector('.input-menu-title');
    const priceInput = block.querySelector('.input-menu-price');
    const delMenuBtn = block.querySelector('.btn-del-menu-block');
    const addCatBtn = block.querySelector('.btn-add-category');
    const sectionsListEl = block.querySelector('.menu-sections-editor-list');

    titleInput.addEventListener('input', (e) => {
      menu.mainTitle = e.target.value;
      updateReceiptCalculations();
    });

    priceInput.addEventListener('input', (e) => {
      menu.priceInfo = e.target.value;
      updateReceiptCalculations();
    });

    delMenuBtn.addEventListener('click', () => {
      state.menus = state.menus.filter(m => m.id !== menu.id);
      renderMenusEditor();
      updateReceiptCalculations();
      showToast('Menu supprimé.');
    });

    addCatBtn.addEventListener('click', () => {
      if (!menu.sections) menu.sections = [];
      menu.sections.push({
        id: 'sec-' + Date.now(),
        title: 'Nouvelle Rubrique',
        itemsText: 'Plat 1\nPlat 2'
      });
      renderMenusEditor();
      updateReceiptCalculations();
    });

    // Render individual categories inside this menu
    if (!menu.sections) menu.sections = [];
    menu.sections.forEach(sec => {
      const secCard = document.createElement('div');
      secCard.className = 'menu-section-card';
      secCard.innerHTML = `
        <div class="menu-section-header">
          <input type="text" class="menu-section-title-input" placeholder="Rubrique (Ex: Entrée, Plats chauds...)" value="${escapeHtml(sec.title || '')}">
          <button class="btn-remove-item btn-del-cat" title="Supprimer rubrique"><i class="fa-solid fa-trash-can"></i></button>
        </div>
        <textarea class="menu-items-textarea" placeholder="Listez les plats (un par ligne)...">${escapeHtml(sec.itemsText || '')}</textarea>
        <span class="menu-section-help"><i class="fa-solid fa-circle-info"></i> 1 ligne = 1 plat</span>
      `;

      const catTitleInput = secCard.querySelector('.menu-section-title-input');
      const catTextarea = secCard.querySelector('.menu-items-textarea');
      const delCatBtn = secCard.querySelector('.btn-del-cat');

      catTitleInput.addEventListener('input', (e) => {
        sec.title = e.target.value;
        updateReceiptCalculations();
      });

      catTextarea.addEventListener('input', (e) => {
        sec.itemsText = e.target.value;
        updateReceiptCalculations();
      });

      delCatBtn.addEventListener('click', () => {
        menu.sections = menu.sections.filter(s => s.id !== sec.id);
        renderMenusEditor();
        updateReceiptCalculations();
      });

      sectionsListEl.appendChild(secCard);
    });

    menusContainer.appendChild(block);
  });
}

function addNewMenuBlock() {
  if (!state.menus) state.menus = [];
  const count = state.menus.length + 1;
  const newMenu = {
    id: 'menu-' + Date.now(),
    mainTitle: 'PROPOSITION MENU ' + count,
    priceInfo: '',
    sections: [
      { id: 'sec-' + Date.now() + '-1', title: 'Entrée', itemsText: 'Salade composée' },
      { id: 'sec-' + Date.now() + '-2', title: 'Plats chauds', itemsText: 'Ndolè\nPoisson braisé' }
    ]
  };
  state.menus.push(newMenu);
  renderMenusEditor();
  updateReceiptCalculations();
  showToast('Nouveau menu ajouté !');
}

// Sync Menus in Receipt Sheet Preview
function syncMenusPreview() {
  if (!viewMenusContainer) return;
  if (!state.menus || state.menus.length === 0) {
    viewMenusContainer.style.display = 'none';
    viewMenusContainer.innerHTML = '';
    return;
  }

  // Filter menus that have at least title or sections
  const activeMenus = state.menus.filter(m => (m.mainTitle && m.mainTitle.trim()) || (m.sections && m.sections.length > 0));

  if (activeMenus.length === 0) {
    viewMenusContainer.style.display = 'none';
    viewMenusContainer.innerHTML = '';
    return;
  }

  viewMenusContainer.style.display = 'flex';
  viewMenusContainer.innerHTML = '';

  activeMenus.forEach(menu => {
    const menuEl = document.createElement('div');
    menuEl.className = 'receipt-menu-section';

    let headerHtml = `
      <div class="menu-banner-header">
        <span class="menu-main-title">${escapeHtml(menu.mainTitle || 'PROPOSITION MENU')}</span>
        ${menu.priceInfo && menu.priceInfo.trim() ? `<span class="menu-price-badge">${escapeHtml(menu.priceInfo.trim())}</span>` : ''}
      </div>
    `;

    let gridHtml = '<div class="menu-categories-grid">';
    (menu.sections || []).forEach(sec => {
      const rawLines = (sec.itemsText || '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      if (!sec.title && rawLines.length === 0) return;

      gridHtml += '<div class="menu-category-block">';
      if (sec.title && sec.title.trim()) {
        gridHtml += `<div class="menu-category-heading">${escapeHtml(sec.title.trim())}</div>`;
      }
      if (rawLines.length > 0) {
        gridHtml += '<ul class="menu-dish-list">';
        rawLines.forEach(line => {
          const cleanLine = line.replace(/^[-•*]\s*/, '');
          gridHtml += `<li class="menu-dish-item">${escapeHtml(cleanLine)}</li>`;
        });
        gridHtml += '</ul>';
      }
      gridHtml += '</div>';
    });
    gridHtml += '</div>';

    menuEl.innerHTML = headerHtml + gridHtml;
    viewMenusContainer.appendChild(menuEl);
  });
}

// Update Calculations & Receipt Preview
function updateReceiptCalculations() {
  // Sync state from inputs
  state.receiptNo = displayReceiptNo.textContent;
  state.date = inputDate.value || new Date().toISOString().split('T')[0];
  state.paymentMode = inputPaymentMode.value;
  state.clientName = inputClientName.value.trim();
  state.clientPhone = inputClientPhone.value.trim();
  state.clientCity = inputClientCity.value.trim();
  state.discount = Number(inputDiscount.value) || 0;
  state.advance = Number(inputAdvance.value) || 0;
  state.notes = inputNotes.value.trim();

  // Computations
  const totalGross = state.items.reduce((acc, it) => acc + ((it.qty || 0) * (it.price || 0)), 0);
  const totalNet = Math.max(0, totalGross - state.discount);
  const totalBalance = Math.max(0, totalNet - state.advance);

  // Sync Info Bar
  viewReceiptNo.textContent = state.receiptNo;
  viewReceiptDate.textContent = formatDate(state.date);
  viewClientName.textContent = state.clientName ? state.clientName + (state.clientCity ? ` (${state.clientCity})` : '') : '-';
  viewClientPhone.textContent = state.clientPhone || '-';

  // Sync Table Rows (Dynamic rows only - strictly matches item count)
  receiptTableBody.innerHTML = '';
  state.items.forEach((item, idx) => {
    const tr = document.createElement('tr');
    const rowTotal = (item.qty || 0) * (item.price || 0);

    tr.innerHTML = `
      <td class="cell-center">${idx + 1}</td>
      <td class="cell-gold cell-name">${escapeHtml(item.name || '-')}</td>
      <td class="cell-center">${item.qty || 1}</td>
      <td class="cell-gold cell-right">${formatFCFA(item.price || 0).replace(' FCFA', '')}</td>
      <td class="cell-right">${formatFCFA(rowTotal).replace(' FCFA', '')}</td>
    `;
    receiptTableBody.appendChild(tr);
  });

  // Sync Menus Section in Receipt Preview
  syncMenusPreview();

  // Sync Words Amount
  viewWordsAmount.textContent = numberToFrenchWords(totalNet);

  // Sync Notes
  if (state.notes) {
    viewNotes.textContent = 'Note: ' + state.notes;
    viewNotesContainer.style.display = 'block';
  } else {
    viewNotes.textContent = '';
    viewNotesContainer.style.display = 'none';
  }

  // Sync Summary Totals
  viewTotalGross.textContent = formatFCFA(totalGross);
  viewTotalDiscount.textContent = '-' + formatFCFA(state.discount);
  viewDiscountRow.style.display = state.discount > 0 ? 'flex' : 'none';
  viewTotalNet.textContent = formatFCFA(totalNet);
  viewTotalAdvance.textContent = formatFCFA(state.advance);
  viewTotalBalance.textContent = formatFCFA(totalBalance);
  barTotalAmount.textContent = formatFCFA(totalNet);
}

// Sheet Auto-Scaling for Mobile View
function setZoom(val) {
  state.zoom = Math.min(Math.max(val, 0.35), 1.2);
  receiptSheet.style.transform = `scale(${state.zoom})`;
  zoomValue.textContent = Math.round(state.zoom * 100) + '%';
}

function autoFitSheet() {
  if (state.activeScreen !== 'screen-preview') return;
  const viewportWidth = previewViewport.clientWidth || window.innerWidth;
  // Standard A4 sheet rendered at 210mm ~ 794px
  const sheetWidth = 794;
  const targetZoom = (viewportWidth - 24) / sheetWidth;
  setZoom(Math.min(targetZoom, 0.95));
}

// Generate Single-Page A4 PDF
async function generateReceiptPdfBlob() {
  const element = document.getElementById('receipt-sheet');

  // Clone element into an isolated offscreen container so screen scaling,
  // flex centering, scroll positions, or hidden screen states don't clip the render
  const clone = element.cloneNode(true);
  clone.id = 'receipt-sheet-export-clone';
  clone.style.transform = 'none';
  clone.style.transition = 'none';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  clone.style.width = '794px';
  clone.style.minWidth = '794px';
  clone.style.maxWidth = '794px';
  clone.style.height = '1123px';
  clone.style.minHeight = '1123px';
  clone.style.maxHeight = '1123px';
  clone.style.boxSizing = 'border-box';

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.width = '794px';
  container.style.height = '1123px';
  container.style.zIndex = '-9999';
  container.style.background = '#ffffff';
  container.appendChild(clone);
  document.body.appendChild(container);

  const opt = {
    margin: 0,
    filename: `Recu_${state.receiptNo}_MK_Events.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: 'avoid-all' }
  };

  try {
    const pdf = await html2pdf().set(opt).from(clone).toPdf().get('pdf');
    // Force exactly 1 page: remove any accidental extra pages generated by micro sub-pixel overflows
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = totalPages; i > 1; i--) {
      pdf.deletePage(i);
    }
    const pdfBlob = pdf.output('blob');
    return pdfBlob;
  } finally {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

// Download PDF Action
async function downloadReceiptPdf() {
  showToast('Génération du PDF 1 page...');
  try {
    const blob = await generateReceiptPdfBlob();
    const fileName = `Recu_${state.receiptNo}_MK_Events.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast('Reçu PDF téléchargé avec succès !');
  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('Impression standard lancée...');
    switchScreen('screen-preview');
    setTimeout(() => window.print(), 300);
  }
}

// WhatsApp Direct Share
async function shareViaWhatsApp() {
  showToast('Préparation du partage WhatsApp...');
  try {
    const blob = await generateReceiptPdfBlob();
    const fileName = `Recu_${state.receiptNo}_MK_Events.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    const totalNet = Math.max(0, state.items.reduce((acc, it) => acc + ((it.qty || 0) * (it.price || 0)), 0) - (state.discount || 0));
    const msg = `*MK EVENTS ET CONSEILS*\n📄 Reçu N°: *${state.receiptNo}*\n👤 Client: *${state.clientName || 'Cher Client'}*\n💰 Net à Payer: *${formatFCFA(totalNet)}*\n\nMerci pour votre confiance !`;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Reçu ${state.receiptNo}`,
        text: msg
      });
      showToast('Reçu partagé sur WhatsApp !');
      return;
    }
  } catch (err) {
    console.warn('Direct file sharing not supported, redirecting to WhatsApp message:', err);
  }

  // Fallback direct WhatsApp text URL
  const totalNet = Math.max(0, state.items.reduce((acc, it) => acc + ((it.qty || 0) * (it.price || 0)), 0) - (state.discount || 0));
  const phoneClean = state.clientPhone.replace(/\D/g, '');
  const targetPhone = phoneClean.length === 9 ? '237' + phoneClean : phoneClean;
  const msg = encodeURIComponent(`*MK EVENTS ET CONSEILS*\n📄 Reçu N°: *${state.receiptNo}*\n👤 Client: *${state.clientName || 'Cher Client'}*\n💰 Net à Payer: *${formatFCFA(totalNet)}*\n\nMerci pour votre confiance !`);
  
  const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${msg}` : `https://wa.me/?text=${msg}`;
  window.open(waUrl, '_blank');
}

// LocalStorage Persistence & History
function saveCurrentReceipt() {
  const receipts = getSavedReceipts();
  const totalGross = state.items.reduce((acc, it) => acc + ((it.qty || 0) * (it.price || 0)), 0);
  const totalNet = Math.max(0, totalGross - state.discount);

  const receiptData = {
    receiptNo: state.receiptNo,
    date: state.date,
    clientName: state.clientName,
    clientPhone: state.clientPhone,
    clientCity: state.clientCity,
    paymentMode: state.paymentMode,
    discount: state.discount,
    advance: state.advance,
    notes: state.notes,
    items: JSON.parse(JSON.stringify(state.items)),
    menus: JSON.parse(JSON.stringify(state.menus || [])),
    totalNet: totalNet,
    savedAt: new Date().toISOString()
  };

  const existingIdx = receipts.findIndex(r => r.receiptNo === state.receiptNo);
  if (existingIdx >= 0) {
    receipts[existingIdx] = receiptData;
  } else {
    receipts.unshift(receiptData);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  showToast('Reçu sauvegardé dans l\'historique !');
}

function getSavedReceipts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistoryList() {
  const query = (historySearch.value || '').toLowerCase().trim();
  const receipts = getSavedReceipts();
  const filtered = receipts.filter(r => 
    (r.receiptNo && r.receiptNo.toLowerCase().includes(query)) ||
    (r.clientName && r.clientName.toLowerCase().includes(query)) ||
    (r.clientPhone && r.clientPhone.includes(query))
  );

  historyList.innerHTML = '';
  if (filtered.length === 0) {
    historyList.innerHTML = `
      <div style="text-align: center; color: var(--text-sub); padding: 40px 10px; font-size: 13px;">
        <i class="fa-regular fa-folder-open" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
        Aucun reçu trouvé dans l'historique.
      </div>
    `;
    return;
  }

  filtered.forEach(r => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-left">
        <span class="history-title">${escapeHtml(r.clientName || 'Client sans nom')}</span>
        <span class="history-meta">${escapeHtml(r.receiptNo)} • ${formatDate(r.date)}</span>
      </div>
      <div class="history-card-right">
        <span class="history-amount">${formatFCFA(r.totalNet)}</span>
        <button class="btn-history-del" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    `;

    card.querySelector('.history-card-left').addEventListener('click', () => {
      loadReceipt(r);
    });

    card.querySelector('.btn-history-del').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteReceipt(r.receiptNo);
    });

    historyList.appendChild(card);
  });
}

function loadReceipt(r) {
  state.receiptNo = r.receiptNo;
  displayReceiptNo.textContent = r.receiptNo;
  inputDate.value = r.date;
  inputPaymentMode.value = r.paymentMode || 'Espèces';
  inputClientName.value = r.clientName || '';
  inputClientPhone.value = r.clientPhone || '';
  inputClientCity.value = r.clientCity || '';
  inputDiscount.value = r.discount || 0;
  inputAdvance.value = r.advance || 0;
  inputNotes.value = r.notes || '';
  state.items = JSON.parse(JSON.stringify(r.items || []));
  if (r.menus) {
    state.menus = JSON.parse(JSON.stringify(r.menus));
  } else if (r.menu) {
    // Backward compatibility for single menu records
    state.menus = [JSON.parse(JSON.stringify(r.menu))];
  } else {
    state.menus = [];
  }

  renderItemsEditor();
  renderMenusEditor();
  updateReceiptCalculations();
  switchScreen('screen-preview');
  showToast(`Reçu ${r.receiptNo} chargé !`);
}

function deleteReceipt(receiptNo) {
  const receipts = getSavedReceipts().filter(r => r.receiptNo !== receiptNo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  renderHistoryList();
  showToast('Reçu supprimé de l\'historique.');
}

function startNewReceipt() {
  state.receiptNo = 'MK-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100);
  displayReceiptNo.textContent = state.receiptNo;
  inputDate.value = new Date().toISOString().split('T')[0];
  inputClientName.value = '';
  inputClientPhone.value = '';
  inputClientCity.value = '';
  inputDiscount.value = 0;
  inputAdvance.value = 0;
  inputNotes.value = '';
  state.items = [
    { id: 1, name: 'Service Traiteur Buffet Prestige', qty: 50, price: 8500 }
  ];
  state.menus = [
    {
      id: 'menu-' + Date.now(),
      mainTitle: 'PROPOSITION MENU 1',
      priceInfo: '8 500 FCFA / Assiette',
      sections: [
        { id: 'sec-1', title: 'Entrée', itemsText: 'Salade composée\nŒufs durs, Sauce cocktail' },
        { id: 'sec-2', title: 'Plats chauds', itemsText: 'Ndolè Royal\nÉmincé de bœuf aux oignons\nPoulet yassa\nFricassé de poisson\nPorc fumé sauté' },
        { id: 'sec-3', title: 'Complément', itemsText: 'Igname blanche\nRiz créole\nMiondo\nPlantain frit' },
        { id: 'sec-4', title: 'Dessert', itemsText: 'Cascade de fruits de saison' }
      ]
    }
  ];
  renderItemsEditor();
  renderMenusEditor();
  updateReceiptCalculations();
  switchScreen('screen-editor');
  showToast('Nouveau reçu initialisé !');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initializer
function init() {
  // Set default date
  inputDate.value = state.date;
  displayReceiptNo.textContent = state.receiptNo;

  // Bind Form Inputs
  [inputDate, inputPaymentMode, inputClientName, inputClientPhone, inputClientCity, inputDiscount, inputAdvance, inputNotes].forEach(el => {
    el.addEventListener('input', updateReceiptCalculations);
  });

  // Menus Add Button
  btnAddMenuBlock.addEventListener('click', addNewMenuBlock);

  // Action Buttons
  btnAddItem.addEventListener('click', addNewItem);
  btnNew.addEventListener('click', startNewReceipt);
  btnSave.addEventListener('click', saveCurrentReceipt);
  btnDownloadPdf.addEventListener('click', downloadReceiptPdf);
  btnShareWhatsapp.addEventListener('click', shareViaWhatsApp);

  const btnQuickPreview = document.getElementById('btn-quick-preview');
  if (btnQuickPreview) {
    btnQuickPreview.addEventListener('click', () => switchScreen('screen-preview'));
  }

  const btnEditorGotoPreview = document.getElementById('btn-editor-goto-preview');
  if (btnEditorGotoPreview) {
    btnEditorGotoPreview.addEventListener('click', () => switchScreen('screen-preview'));
  }

  // Zoom Buttons
  btnZoomIn.addEventListener('click', () => setZoom(state.zoom + 0.08));
  btnZoomOut.addEventListener('click', () => setZoom(state.zoom - 0.08));
  btnZoomReset.addEventListener('click', autoFitSheet);

  // Navigation
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.addEventListener('click', () => {
      switchScreen(btn.dataset.screen);
    });
  });

  historySearch.addEventListener('input', renderHistoryList);

  renderItemsEditor();
  renderMenusEditor();
  updateReceiptCalculations();
  autoFitSheet();
}

window.generateReceiptPdfBlob = generateReceiptPdfBlob;
window.downloadReceiptPdf = downloadReceiptPdf;
window.addEventListener('resize', autoFitSheet);
document.addEventListener('DOMContentLoaded', init);
