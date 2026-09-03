import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validate ownership & get plan
  const { data: site } = await supabase
    .from('sites')
    .select('owner_id, name')
    .eq('id', params.siteId)
    .single();

  if (!site || site.owner_id !== user.id) {
    return NextResponse.json({ error: 'Site not found or unauthorized' }, { status: 403 });
  }

  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('plan_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const planName = sub?.plan_name || 'Free';

  // 3. Enforce Premium Feature (Business and Pro only)
  if (planName !== 'Business' && planName !== 'Pro') {
    return NextResponse.json(
      { error: `Fitur Export Excel hanya tersedia untuk paket Business dan Pro. Paket Anda saat ini: ${planName}.` },
      { status: 403 }
    );
  }

  // 4. Fetch data (Visitors and their sessions)
  const { data: visitors, error: vError } = await supabase
    .from('visitors')
    .select('*')
    .eq('site_id', params.siteId)
    .order('last_seen', { ascending: false })
    .limit(5000); // Limit to prevent memory issues on massive datasets

  if (vError) {
    return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 });
  }

  // 5. Generate Excel
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Analitik Web';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Visitors');

  sheet.columns = [
    { header: 'Visitor ID', key: 'id', width: 36 },
    { header: 'Tipe Perangkat', key: 'device_type', width: 15 },
    { header: 'Browser', key: 'browser', width: 20 },
    { header: 'Sistem Operasi', key: 'os', width: 20 },
    { header: 'Resolusi Layar', key: 'resolution', width: 15 },
    { header: 'Terakhir Dilihat', key: 'last_seen', width: 25 },
    { header: 'Pertama Dilihat', key: 'first_seen', width: 25 },
  ];

  // Style headers
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

  // Add rows
  visitors.forEach((v) => {
    sheet.addRow({
      id: v.id,
      device_type: v.device_type,
      browser: v.browser || '-',
      os: v.os || '-',
      resolution: v.screen_width && v.screen_height ? `${v.screen_width}x${v.screen_height}` : '-',
      last_seen: new Date(v.last_seen).toLocaleString('id-ID'),
      first_seen: new Date(v.first_seen).toLocaleString('id-ID'),
    });
  });

  // 6. Return the Excel file
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="export_visitors_${site.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx"`,
    },
  });
}
