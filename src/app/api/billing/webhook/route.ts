import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    const body = await req.json();
    const { amount, order_id, project, status } = body;

    // 1. Validate payload
    if (!order_id || !project || !status) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 2. Fetch Transaction Detail API to prevent webhook spoofing
    const apiKey = process.env.PAKASIR_API_KEY || 'xxx123';
    const expectedProject = process.env.PAKASIR_PROJECT || 'depodomain';

    if (project !== expectedProject) {
      return NextResponse.json({ error: 'Project mismatch' }, { status: 400 });
    }

    const verifyUrl = `https://app.pakasir.com/api/transactiondetail?project=${project}&amount=${amount}&order_id=${order_id}&api_key=${apiKey}`;
    const verifyRes = await fetch(verifyUrl, { method: 'GET' });
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.transaction || verifyData.transaction.status !== 'completed') {
      console.error('Webhook verification failed', verifyData);
      return NextResponse.json({ error: 'Verification failed or not completed' }, { status: 400 });
    }

    // 3. Update Invoice Status
    const { data: invoice, error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', order_id)
      .eq('status', 'pending') // Only update if pending
      .select('user_id, plan_name')
      .single();

    if (updateError || !invoice) {
      console.error('Invoice update failed', updateError);
      return NextResponse.json({ error: 'Invoice not found or already processed' }, { status: 200 }); // Return 200 so webhook stops retrying
    }

    // 4. Update User Subscription
    const limits: Record<string, number> = { 'Free': 1000, 'Starter': 5000, 'Growth': 15000, 'Business': 50000, 'Pro': 150000 };
    const planLimit = limits[invoice.plan_name] || 1000;

    const { error: subError } = await supabase
      .from('user_subscriptions')
      .update({ 
        plan_name: invoice.plan_name,
        monthly_visitor_count: 0, // Reset usage on new plan
        billing_cycle_start: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', invoice.user_id);

    if (subError) {
      console.error('Subscription update failed', subError);
      return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('Webhook error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
