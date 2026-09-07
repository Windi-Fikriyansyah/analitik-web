import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { isValidUuid } from '@/lib/validateSite';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
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

  const { data: site } = await supabase
    .from('sites')
    .select('id, owner_id, name')
    .eq('id', siteId)
    .maybeSingle();

  if (!site || site.owner_id !== user.id) {
    return NextResponse.json({ status: false, error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type') === 'email' ? 'email' : 'whatsapp';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Analitik Web';
  workbook.created = new Date();

  if (type === 'whatsapp') {
    const sheet = workbook.addWorksheet('Format Import Nomor WA', {
      views: [{ showGridLines: true }],
    });

    sheet.columns = [
      { header: 'Nomor WhatsApp (*WAJIB)', key: 'phone', width: 28 },
      { header: 'Email (Opsional)', key: 'email', width: 28 },
      { header: 'Nama Pengirim (Opsional)', key: 'name', width: 24 },
      { header: 'Pesan (Opsional)', key: 'message', width: 34 },
      { header: 'Device (Opsional)', key: 'device', width: 18 },
    ];

    // Style Header: Forest Green background (#15803D), White bold text
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF15803D' },
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0D5A2B' } },
        bottom: { style: 'medium', color: { argb: 'FF0D5A2B' } },
        left: { style: 'thin', color: { argb: 'FF1E9E4F' } },
        right: { style: 'thin', color: { argb: 'FF1E9E4F' } },
      };
    });

    // Sample data rows (3 realistic Indonesian samples)
    const samples = [
      {
        phone: '081234567890',
        email: 'budi.santoso@gmail.com',
        name: 'Budi Santoso',
        message: 'Halo, saya tertarik dengan promo produk Anda.',
        device: 'Device CS 1',
      },
      {
        phone: '6285712345678',
        email: 'siti.nurhaliza@yahoo.com',
        name: 'Siti Nurhaliza',
        message: 'Bisa minta info pricelist terbaru?',
        device: 'Device CS 1',
      },
      {
        phone: '089611223344',
        email: '',
        name: 'Ahmad Fauzi',
        message: 'Order paket premium via WhatsApp',
        device: 'Device CS 2',
      },
    ];

    samples.forEach((sample) => {
      const row = sheet.addRow(sample);
      row.height = 22;
      row.getCell('phone').numFmt = '@'; // Format as text to avoid leading 0 stripping
      row.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Instructions sheet
    const guideSheet = workbook.addWorksheet('Petunjuk Pengisian');
    guideSheet.columns = [
      { header: 'Kolom', key: 'col', width: 26 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Keterangan & Format', key: 'desc', width: 65 },
    ];
    guideSheet.getRow(1).font = { bold: true };
    guideSheet.addRow({
      col: 'Nomor WhatsApp',
      status: 'WAJIB DIISI',
      desc: 'Boleh diawali 08, 62, atau +62 (contoh: 081234567890 atau 6281234567890). Tidak boleh kosong.',
    });
    guideSheet.addRow({
      col: 'Email',
      status: 'Opsional',
      desc: 'Alamat email aktif pelanggan (contoh: user@example.com). Boleh dikosongkan.',
    });
    guideSheet.addRow({
      col: 'Nama Pengirim',
      status: 'Opsional',
      desc: 'Nama lengkap atau panggilan pelanggan. Boleh dikosongkan.',
    });
    guideSheet.addRow({
      col: 'Pesan',
      status: 'Opsional',
      desc: 'Catatan pesan chat atau riwayat interaksi pelanggan. Boleh dikosongkan.',
    });
    guideSheet.addRow({
      col: 'Device',
      status: 'Opsional',
      desc: 'Nama/nomor perangkat CS penerima pesan. Boleh dikosongkan.',
    });
  } else {
    // Mode Email
    const sheet = workbook.addWorksheet('Format Import Email', {
      views: [{ showGridLines: true }],
    });

    sheet.columns = [
      { header: 'Email (*WAJIB)', key: 'email', width: 30 },
      { header: 'Nomor WhatsApp (Opsional)', key: 'phone', width: 28 },
      { header: 'Nama Pengirim (Opsional)', key: 'name', width: 24 },
      { header: 'Pesan (Opsional)', key: 'message', width: 34 },
      { header: 'Device (Opsional)', key: 'device', width: 18 },
    ];

    // Style Header: Navy Blue background (#1D4ED8), White bold text
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1D4ED8' },
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1E40AF' } },
        bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
        left: { style: 'thin', color: { argb: 'FF3B82F6' } },
        right: { style: 'thin', color: { argb: 'FF3B82F6' } },
      };
    });

    // Sample data rows
    const samples = [
      {
        email: 'budi.santoso@gmail.com',
        phone: '081234567890',
        name: 'Budi Santoso',
        message: 'Inquiry produk via web newsletter',
        device: 'Web Form',
      },
      {
        email: 'siti.nurhaliza@yahoo.com',
        phone: '',
        name: 'Siti Nurhaliza',
        message: 'Pendaftaran event webinar',
        device: 'Webinar Landing',
      },
      {
        email: 'ahmad.fauzi@outlook.com',
        phone: '089611223344',
        name: 'Ahmad Fauzi',
        message: 'Download ebook katalog',
        device: 'Lead Magnet',
      },
    ];

    samples.forEach((sample) => {
      const row = sheet.addRow(sample);
      row.height = 22;
      row.getCell('phone').numFmt = '@';
      row.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Instructions sheet
    const guideSheet = workbook.addWorksheet('Petunjuk Pengisian');
    guideSheet.columns = [
      { header: 'Kolom', key: 'col', width: 26 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Keterangan & Format', key: 'desc', width: 65 },
    ];
    guideSheet.getRow(1).font = { bold: true };
    guideSheet.addRow({
      col: 'Email',
      status: 'WAJIB DIISI',
      desc: 'Alamat email aktif pelanggan (contoh: budi@example.com). Tidak boleh kosong.',
    });
    guideSheet.addRow({
      col: 'Nomor WhatsApp',
      status: 'Opsional',
      desc: 'Boleh diisi nomor WA atau dikosongkan jika pelanggan hanya memiliki email.',
    });
    guideSheet.addRow({
      col: 'Nama Pengirim',
      status: 'Opsional',
      desc: 'Nama lengkap atau panggilan pelanggan. Boleh dikosongkan.',
    });
    guideSheet.addRow({
      col: 'Pesan',
      status: 'Opsional',
      desc: 'Catatan pesan atau deskripsi pelanggan. Boleh dikosongkan.',
    });
    guideSheet.addRow({
      col: 'Device',
      status: 'Opsional',
      desc: 'Asal kanal lead atau perangkat. Boleh dikosongkan.',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename =
    type === 'whatsapp'
      ? 'template_import_whatsapp.xlsx'
      : 'template_import_email.xlsx';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache',
    },
  });
}
