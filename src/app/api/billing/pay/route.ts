import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { invoiceId, payment_method } = await req.json();

  if (!invoiceId || !payment_method) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    // 1. Get the pending invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('amount, status')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice tidak ditemukan' }, { status: 404 });
    }

    if (invoice.status !== 'pending') {
      return NextResponse.json({ error: 'Invoice sudah diproses' }, { status: 400 });
    }

    // 2. Calculate Admin Fee based on Pakasir pricing
    const baseAmount = parseInt(invoice.amount.toString(), 10);
    let adminFee = 0;
    
    if (payment_method === 'qris') {
      adminFee = Math.ceil(baseAmount * 0.007) + 310;
    } else {
      adminFee = 3500; // Default for Virtual Accounts
    }
    
    const totalAmount = baseAmount + adminFee;

    // 3. Prepare Pakasir Payload
    const apiKey = process.env.PAKASIR_API_KEY || 'xxx123';
    const project = process.env.PAKASIR_PROJECT || 'depodomain';

    const payload = {
      project,
      order_id: invoiceId,
      amount: totalAmount,
      api_key: apiKey
    };

    // 3. Hit Pakasir API
    const res = await fetch(`https://app.pakasir.com/api/transactioncreate/${payment_method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.payment || !data.payment.payment_number) {
      console.error('Pakasir API Error:', data);
      return NextResponse.json({ error: 'Gagal membuat transaksi di Pakasir' }, { status: 500 });
    }

    // 4. Update Invoice in DB
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        payment_method,
        payment_number: data.payment.payment_number
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Update Invoice Error:', updateError);
      return NextResponse.json({ error: 'Gagal menyimpan data pembayaran' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, payment: data.payment });
  } catch (err) {
    console.error('Payment creation error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
