import { NextRequest, NextResponse } from 'next/server';
import { isValidUuid, siteExists } from '@/lib/validateSite';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { site_id, fonnte_token, target, message } = body;

    if (!site_id || !isValidUuid(site_id)) {
      return NextResponse.json(
        { status: false, error: 'site_id tidak valid' },
        { status: 400 }
      );
    }

    const valid = await siteExists(site_id);
    if (!valid) {
      return NextResponse.json(
        { status: false, error: 'Tenant site tidak ditemukan' },
        { status: 404 }
      );
    }

    // Use FONNTE_TOKEN from environment variable (.env) as primary source
    const token =
      process.env.FONNTE_TOKEN?.trim() ||
      (typeof fonnte_token === 'string' ? fonnte_token.trim() : '');

    if (!token) {
      return NextResponse.json(
        {
          status: false,
          error:
            'FONNTE_TOKEN belum diatur di file .env.local. Silakan tambahkan FONNTE_TOKEN=your_token pada file .env.local Anda terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    if (!target || typeof target !== 'string' || !target.trim()) {
      return NextResponse.json(
        { status: false, error: 'Nomor WhatsApp tujuan wajib diisi' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { status: false, error: 'Pesan chat wajib diisi' },
        { status: 400 }
      );
    }

    // Prepare clean target phone (digits only)
    const cleanTarget = target.replace(/[^0-9]/g, '');

    // Call Fonnte Official Send API
    const formData = new FormData();
    formData.append('target', cleanTarget);
    formData.append('message', message.trim());
    formData.append('countryCode', '62');

    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const fonnteData = await fonnteRes.json().catch(() => null);

    if (!fonnteRes.ok || !fonnteData) {
      return NextResponse.json(
        {
          status: false,
          error:
            fonnteData?.reason ||
            fonnteData?.message ||
            `Fonnte API HTTP error ${fonnteRes.status}`,
        },
        { status: 400 }
      );
    }

    if (fonnteData.status === false) {
      return NextResponse.json(
        {
          status: false,
          error: fonnteData.reason || fonnteData.message || 'Gagal mengirim pesan via Fonnte',
          fonnte_response: fonnteData,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: true,
      message: `Pesan WhatsApp berhasil dikirim ke ${cleanTarget}!`,
      fonnte_response: fonnteData,
      target: cleanTarget,
    });
  } catch (err: any) {
    console.error('[fonnte test-send] Error:', err);
    return NextResponse.json(
      { status: false, error: err.message || 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
