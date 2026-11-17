function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: getAllTransactions() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action || 'readTransactions';

    if (action === 'readTransactions') {
      return jsonResponse({ ok: true, data: getAllTransactions() });
    }

    if (action === 'saveTransaction') {
      const payload = body.payload || {};
      const result = saveTransactionToSheet(payload);
      return jsonResponse({ ok: true, message: 'Transaksi berhasil disimpan', data: result });
    }

    if (action === 'deleteTransaction') {
      const payload = body.payload || {};
      const result = deleteTransactionFromSheet(payload);
      return jsonResponse({ ok: true, message: 'Transaksi berhasil dihapus', data: result });
    }

    return jsonResponse({ ok: false, message: 'Action tidak dikenali' });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message || 'Terjadi kesalahan server' });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAllTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = { pemasukan: [], pengeluaran: [] };

  ['Pemasukan', 'Pengeluaran'].forEach((sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return;
    }

    const values = sheet.getDataRange().getValues();
    if (!values.length) {
      return;
    }

    const headerRow = values[0].map((cell) => String(cell || '').toLowerCase().trim());
    const idx = {
      tanggal: getHeaderIndex(headerRow, ['tanggal', 'date', 'tgl']),
      kategori: getHeaderIndex(headerRow, ['kategori', 'category', 'jenis']),
      nominal: getHeaderIndex(headerRow, ['nominal', 'amount', 'nilai', 'jumlah']),
      catatan: getHeaderIndex(headerRow, ['catatan', 'notes', 'keterangan'])
    };

    const list = [];
    for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
      const row = values[rowIndex];
      const tanggal = row[idx.tanggal] || '';
      const kategori = row[idx.kategori] || '';
      const nominal = cleanAmount(row[idx.nominal]);
      const catatan = row[idx.catatan] || '';

      if (!tanggal || !kategori || nominal === null || nominal <= 0) {
        continue;
      }

      list.push({
        tanggal: normalizeDate(tanggal),
        kategori: String(kategori).trim(),
        nominal: Number(nominal),
        catatan: String(catatan).trim()
      });
    }

    result[sheetName.toLowerCase() === 'pemasukan' ? 'pemasukan' : 'pengeluaran'] = list;
  });

  return result;
}

function saveTransactionToSheet(payload) {
  const sheetName = payload.sheet || 'Pemasukan';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" tidak ditemukan. Pastikan nama sheet sesuai.');
  }

  const amount = Number(payload.amount || 0);
  if (!payload.date || !payload.category || !amount || amount < 0) {
    throw new Error('Nominal, tanggal, dan kategori wajib diisi dengan benar.');
  }

  const headerRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 4)).getValues()[0];
  const idx = {
    tanggal: getHeaderIndex(headerRow.map((cell) => String(cell || '').toLowerCase().trim()), ['tanggal', 'date', 'tgl']),
    kategori: getHeaderIndex(headerRow.map((cell) => String(cell || '').toLowerCase().trim()), ['kategori', 'category', 'jenis']),
    nominal: getHeaderIndex(headerRow.map((cell) => String(cell || '').toLowerCase().trim()), ['nominal', 'amount', 'nilai', 'jumlah']),
    catatan: getHeaderIndex(headerRow.map((cell) => String(cell || '').toLowerCase().trim()), ['catatan', 'notes', 'keterangan'])
  };

  const row = [];
  const totalColumns = Math.max(headerRow.length, 4);
  for (let i = 0; i < totalColumns; i += 1) {
    row.push('');
  }

  const dateValue = normalizeDate(payload.date);
  const categoryValue = String(payload.category || '').trim();
  const noteValue = String(payload.note || '').trim();

  if (idx.tanggal >= 0) row[idx.tanggal] = dateValue;
  else row[0] = dateValue;

  if (idx.kategori >= 0) row[idx.kategori] = categoryValue;
  else row[1] = categoryValue;

  if (idx.nominal >= 0) row[idx.nominal] = amount;
  else row[2] = amount;

  if (idx.catatan >= 0) row[idx.catatan] = noteValue;
  else row[3] = noteValue;

  sheet.appendRow(row);
  return { ok: true, sheetName: sheetName, rowData: row };
}

function deleteTransactionFromSheet(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(payload.sheet);

  if (!sheet) {
    throw new Error('Sheet tidak ditemukan untuk dihapus.');
  }

  const data = sheet.getDataRange().getValues();
  const headerRow = data[0] || [];
  const idx = {
    tanggal: getHeaderIndex(headerRow.map((cell) => String(cell || '').toLowerCase().trim()), ['tanggal', 'date', 'tgl']),
    kategori: getHeaderIndex(headerRow.map((cell) => String(cell || '').toLowerCase().trim()), ['kategori', 'category', 'jenis']),
    nominal: getHeaderIndex(headerRow.map((cell) => String(cell || '').toLowerCase().trim()), ['nominal', 'amount', 'nilai', 'jumlah']),
    catatan: getHeaderIndex(headerRow.map((cell) => String(cell || '').toLowerCase().trim()), ['catatan', 'notes', 'keterangan'])
  };

  let deleted = false;
  for (let rowIndex = data.length - 1; rowIndex >= 1; rowIndex -= 1) {
    const row = data[rowIndex];
    const tanggal = row[idx.tanggal] || '';
    const kategori = row[idx.kategori] || '';
    const nominal = cleanAmount(row[idx.nominal]);
    const catatan = row[idx.catatan] || '';

    if (
      normalizeDate(tanggal) === normalizeDate(payload.date) &&
      String(kategori).trim() === String(payload.category || '').trim() &&
      Number(nominal) === Number(payload.amount || 0) &&
      String(catatan).trim() === String(payload.note || '').trim()
    ) {
      sheet.deleteRow(rowIndex + 1);
      deleted = true;
      break;
    }
  }

  if (!deleted) {
    throw new Error('Transaksi yang akan dihapus tidak ditemukan.');
  }

  return { ok: true };
}

function getHeaderIndex(headers, candidates) {
  for (let i = 0; i < headers.length; i += 1) {
    const header = String(headers[i] || '').toLowerCase().trim();
    for (let j = 0; j < candidates.length; j += 1) {
      if (header === String(candidates[j]).toLowerCase().trim()) {
        return i;
      }
    }
  }
  return -1;
}

function normalizeDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).trim();
  }
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function cleanAmount(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const cleaned = String(value).replace(/[^0-9,-]/g, '').replace(/\./g, '').replace(',', '.');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
