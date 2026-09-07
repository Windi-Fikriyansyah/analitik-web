import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidUuid } from '@/lib/validateSite';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function normalizePhone(raw: any): string {
  if (raw === null || raw === undefined) return '';
  let str = String(raw).trim();
  // Handle numbers with decimals from Excel like 62812345678.0
  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts[1] === '0' || parts[1] === '00') str = parts[0];
  }
  let clean = str.replace(/[^0-9]/g, '');
  if (clean.startsWith('08')) clean = '628' + clean.slice(2);
  else if (clean.startsWith('8')) clean = '62' + clean;
  return clean;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const { siteId } = params;
  if (!isValidUuid(siteId)) {
    return NextResponse.json({ status: false, error: 'Invalid site ID' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, owner_id, name')
    .eq('id', siteId)
    .maybeSingle();

  if (siteError || !site || site.owner_id !== user.id) {
    return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json({ status: false, error: 'Format data tidak valid' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const importType = (formData.get('importType') as string) === 'email' ? 'email' : 'whatsapp';

  if (!file) {
    return NextResponse.json({ status: false, error: 'File Excel (.xlsx) wajib diunggah' }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
    return NextResponse.json(
      { status: false, error: 'Format file tidak didukung. Harap unggah file Excel (.xlsx / .xls) atau .csv' },
      { status: 400 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    if (fileName.endsWith('.csv')) {
      const { Readable } = await import('stream');
      const stream = Readable.from(buffer);
      await workbook.csv.read(stream);
    } else {
      await workbook.xlsx.load(buffer as any);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ status: false, error: 'File Excel tidak memiliki lembar kerja (worksheet)' }, { status: 400 });
    }

    // Identify column mapping from Header row (Row 1)
    let phoneColIndex = -1;
    let emailColIndex = -1;
    let nameColIndex = -1;
    let messageColIndex = -1;
    let deviceColIndex = -1;

    const headerRow = worksheet.getRow(1);
    if (headerRow && headerRow.cellCount > 0) {
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        let rawText = '';
        if (cell.text && typeof cell.text === 'string') {
          rawText = cell.text.toLowerCase().trim();
        } else if (cell.value) {
          rawText = String(cell.value).toLowerCase().trim();
        }

        if (
          rawText.includes('whatsapp') ||
          rawText.includes('no wa') ||
          rawText.includes('no. wa') ||
          rawText.includes('nomor wa') ||
          rawText.includes('phone') ||
          rawText.includes('telepon') ||
          rawText.includes('handphone') ||
          rawText === 'wa' ||
          rawText === 'hp' ||
          rawText.startsWith('wa ') ||
          rawText.endsWith(' wa')
        ) {
          if (phoneColIndex === -1) phoneColIndex = colNumber;
        } else if (rawText.includes('email') || rawText.includes('surel') || rawText.includes('mail')) {
          if (emailColIndex === -1) emailColIndex = colNumber;
        } else if (rawText.includes('nama') || rawText.includes('name') || rawText.includes('pengirim') || rawText.includes('sender') || rawText.includes('kontak')) {
          if (nameColIndex === -1) nameColIndex = colNumber;
        } else if (rawText.includes('pesan') || rawText.includes('message') || rawText.includes('chat') || rawText.includes('catatan') || rawText.includes('note')) {
          if (messageColIndex === -1) messageColIndex = colNumber;
        } else if (rawText.includes('device') || rawText.includes('perangkat') || rawText.includes('sumber') || rawText.includes('source')) {
          if (deviceColIndex === -1) deviceColIndex = colNumber;
        }
      });
    }

    // Fallback if header detection did not catch primary columns
    if (importType === 'whatsapp' && phoneColIndex === -1) {
      phoneColIndex = 1;
      if (emailColIndex === -1) emailColIndex = 2;
      if (nameColIndex === -1) nameColIndex = 3;
      if (messageColIndex === -1) messageColIndex = 4;
      if (deviceColIndex === -1) deviceColIndex = 5;
    } else if (importType === 'email' && emailColIndex === -1) {
      emailColIndex = 1;
      if (phoneColIndex === -1) phoneColIndex = 2;
      if (nameColIndex === -1) nameColIndex = 3;
      if (messageColIndex === -1) messageColIndex = 4;
      if (deviceColIndex === -1) deviceColIndex = 5;
    }

    const admin = getSupabaseAdmin();

    // Fetch existing phone numbers and emails for this site to prevent duplicate saves
    const { data: existingEvents } = await admin
      .from('track_events')
      .select('phone_number, metadata')
      .eq('site_id', siteId)
      .limit(50000);

    const existingPhones = new Set<string>();
    const existingEmails = new Set<string>();

    if (Array.isArray(existingEvents)) {
      for (const ev of existingEvents) {
        if (ev.phone_number && ev.phone_number !== '-') {
          const np = normalizePhone(ev.phone_number);
          if (np) existingPhones.add(np);
        }
        if (ev.metadata?.email) {
          existingEmails.add(String(ev.metadata.email).toLowerCase().trim());
        }
      }
    }

    const seenPhonesInFile = new Set<string>();
    const seenEmailsInFile = new Set<string>();
    let duplicateCount = 0;

    const rowsToInsert: any[] = [];
    const skippedRows: { row: number; reason: string }[] = [];

    const now = new Date();
    const nowIso = now.toISOString();
    const nowWib = now.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB';

    // Iterate rows efficiently using eachRow to prevent reading thousands of empty/sparse rows
    worksheet.eachRow({ includeEmpty: false }, (row, r) => {
      if (r === 1) return; // Skip header row
      if (!row || row.cellCount === 0) return;

      const getCellValue = (idx: number): string => {
        if (idx <= 0) return '';
        const cell = row.getCell(idx);
        if (!cell || cell.value === null || cell.value === undefined) return '';
        if (cell.text && typeof cell.text === 'string' && cell.text.trim()) {
          return cell.text.trim();
        }
        if (typeof cell.value === 'object') {
          const valObj = cell.value as any;
          if (valObj.text) return String(valObj.text).trim();
          if (valObj.result !== undefined && valObj.result !== null) return String(valObj.result).trim();
          if (valObj.richText && Array.isArray(valObj.richText)) {
            return valObj.richText.map((rt: any) => rt.text || '').join('').trim();
          }
        }
        return String(cell.value).trim();
      };

      const rawPhone = getCellValue(phoneColIndex);
      const rawEmail = getCellValue(emailColIndex);
      const rawName = getCellValue(nameColIndex);
      const rawMessage = getCellValue(messageColIndex);
      const rawDevice = getCellValue(deviceColIndex);

      // Check if entire row is empty
      if (!rawPhone && !rawEmail && !rawName && !rawMessage && !rawDevice) {
        return;
      }

      let cleanPhone = '';
      let cleanEmail = '';

      if (importType === 'whatsapp') {
        // WhatsApp number is MANDATORY
        if (!rawPhone) {
          skippedRows.push({ row: r, reason: 'Nomor WhatsApp kosong' });
          return;
        }

        cleanPhone = normalizePhone(rawPhone);
        if (cleanPhone.length < 8) {
          skippedRows.push({ row: r, reason: `Nomor WhatsApp tidak valid: "${rawPhone}"` });
          return;
        }

        // Email is optional in WhatsApp mode
        if (rawEmail) {
          cleanEmail = rawEmail.toLowerCase().trim();
          if (!isValidEmail(cleanEmail)) {
            cleanEmail = cleanEmail.replace(/\s+/g, '');
          }
        }
      } else {
        // Email is MANDATORY
        if (!rawEmail) {
          skippedRows.push({ row: r, reason: 'Alamat Email kosong' });
          return;
        }

        cleanEmail = rawEmail.toLowerCase().trim();
        if (!isValidEmail(cleanEmail)) {
          skippedRows.push({ row: r, reason: `Format Email tidak valid: "${rawEmail}"` });
          return;
        }

        // WhatsApp number is optional in Email mode
        if (rawPhone) {
          const norm = normalizePhone(rawPhone);
          if (norm.length >= 8) cleanPhone = norm;
        }
      }

      // Check for duplicates: neither phone nor email should already exist
      let isDuplicate = false;
      let duplicateReason = '';

      if (cleanPhone && cleanPhone !== '-') {
        if (existingPhones.has(cleanPhone)) {
          isDuplicate = true;
          duplicateReason = `Nomor WhatsApp (${cleanPhone}) sudah terdaftar di sistem`;
        } else if (seenPhonesInFile.has(cleanPhone)) {
          isDuplicate = true;
          duplicateReason = `Nomor WhatsApp (${cleanPhone}) duplikat di dalam file`;
        }
      }

      if (!isDuplicate && cleanEmail) {
        if (existingEmails.has(cleanEmail)) {
          isDuplicate = true;
          duplicateReason = `Email (${cleanEmail}) sudah terdaftar di sistem`;
        } else if (seenEmailsInFile.has(cleanEmail)) {
          isDuplicate = true;
          duplicateReason = `Email (${cleanEmail}) duplikat di dalam file`;
        }
      }

      if (isDuplicate) {
        duplicateCount++;
        skippedRows.push({ row: r, reason: duplicateReason });
        return;
      }

      // Track as seen in this file
      if (cleanPhone && cleanPhone !== '-') {
        seenPhonesInFile.add(cleanPhone);
      }
      if (cleanEmail) {
        seenEmailsInFile.add(cleanEmail);
      }

      const record = {
        site_id: siteId,
        phone_number: cleanPhone || '-',
        sender_name: rawName || null,
        message: rawMessage || null,
        device_number: rawDevice || (importType === 'email' ? 'Import Excel (Email)' : 'Import Excel (WA)'),
        event_name: 'imported',
        status: 'imported',
        metadata: {
          imported: true,
          import_type: importType,
          email: cleanEmail || null,
          imported_at: nowIso,
          imported_at_wib: nowWib,
        },
        created_at: nowIso,
      };

      rowsToInsert.push(record);
    });

    if (rowsToInsert.length === 0) {
      return NextResponse.json(
        {
          status: false,
          error:
            duplicateCount > 0
              ? `Tidak ada data baru yang disimpan. Sebanyak ${duplicateCount} kontak dilewati karena nomor WhatsApp atau email sudah terdaftar di sistem.`
              : skippedRows.length > 0
              ? `Tidak ada data valid yang dapat diimpor (${skippedRows.length} baris dilewati). Contoh penyebab: ${skippedRows[0]?.reason} di baris ${skippedRows[0]?.row}.`
              : 'File Excel kosong atau tidak memiliki baris data yang dapat diproses.',
          duplicateCount,
          skippedCount: skippedRows.length,
          skippedRows,
        },
        { status: 400 }
      );
    }

    // Perform database insertion in batches of 100 using Supabase Admin
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      const { error: insertErr } = await admin.from('track_events').insert(batch);

      if (insertErr) {
        console.error('[events/import] Error inserting batch:', insertErr);
        return NextResponse.json(
          {
            status: false,
            error: `Gagal menyimpan data ke database: ${insertErr.message}`,
            insertedCount,
          },
          { status: 500 }
        );
      }
      insertedCount += batch.length;
    }

    const typeLabel = importType === 'whatsapp' ? 'Nomor WhatsApp' : 'Email';
    const dupText = duplicateCount > 0 ? ` (${duplicateCount} data duplikat dilewati)` : '';
    return NextResponse.json({
      status: true,
      message: `Berhasil mengimpor ${insertedCount} data baru (${typeLabel})${dupText}.`,
      importedCount: insertedCount,
      duplicateCount,
      skippedCount: skippedRows.length,
      skippedRows: skippedRows.slice(0, 25),
    });
  } catch (err: any) {
    console.error('[events/import] Excel processing error:', err);
    return NextResponse.json(
      { status: false, error: `Gagal memproses file Excel: ${err.message}` },
      { status: 500 }
    );
  }
}
