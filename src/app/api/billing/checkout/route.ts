import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { plan_name, amount } = await req.json();

  if (!plan_name || !amount) {
    return NextResponse.json({ error: 'Missing plan_name or amount' }, { status: 400 });
  }

  try {
    const invoiceId = crypto.randomUUID();

    // Just save Invoice to DB with status pending
    // We don't hit Pakasir yet. That will happen when user selects method.
    const { error: insertError } = await supabase
      .from('invoices')
      .insert({
        id: invoiceId,
        user_id: user.id,
        plan_name,
        amount: parseInt(amount, 10),
        status: 'pending',
      });

    if (insertError) {
      console.error('Invoice DB Error:', insertError);
      return NextResponse.json({ error: 'Gagal membuat invoice di database' }, { status: 500 });
    }

    // Return the created invoice ID
    return NextResponse.json({ ok: true, invoiceId: invoiceId });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
