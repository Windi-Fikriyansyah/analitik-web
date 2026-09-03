import { CheckCircle2, CreditCard } from "lucide-react";
import { C } from "@/lib/colors";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabaseServer";
import CheckoutButton from "@/components/CheckoutButton";

export const revalidate = 0;

export default async function BillingPage({ params }: { params: { siteId: string } }) {
  const supabase = getSupabaseServer();
  
  // Get site owner
  const { data: site } = await supabase.from('sites').select('owner_id').eq('id', params.siteId).maybeSingle();
  
  // Get subscription
  let currentPlan = 'Free';
  let monthlyVisitorCount = 0;
  
  if (site) {
    const { data: sub } = await supabase.from('user_subscriptions').select('*').eq('user_id', site.owner_id).maybeSingle();
    if (sub) {
      currentPlan = sub.plan_name;
      monthlyVisitorCount = sub.monthly_visitor_count;
    }
  }

  const limits: Record<string, number> = { 'Free': 1000, 'Starter': 5000, 'Growth': 15000, 'Business': 50000, 'Pro': 150000 };
  const maxVisitors = limits[currentPlan] || 1000;

  const plans = [
    {
      name: "Free", price: "Rp0", amount: 0,
      features: ["1.000 Visitor/bln", "1 Landing Page", "Retensi 7 hari", "1 Analisa AI/bulan", "Basic analytics"],
      cta: currentPlan === 'Free' ? "Paket Saat Ini" : "Upgrade ke Free", popular: false, current: currentPlan === 'Free',
    },
    {
      name: "Starter", price: "Rp49rb", amount: 49000,
      features: ["5.000 Visitor/bln", "3 Landing Page", "Retensi 30 hari", "10 Analisa AI/bulan", "Visitor, session, device, section"],
      cta: currentPlan === 'Starter' ? "Paket Saat Ini" : "Upgrade ke Starter", popular: false, current: currentPlan === 'Starter',
    },
    {
      name: "Growth", price: "Rp99rb", amount: 99000,
      features: ["15.000 Visitor/bln", "10 Landing Page", "Retensi 90 hari", "40 Analisa AI/bulan", "Semua Starter + funnel + heatmap"],
      cta: currentPlan === 'Growth' ? "Paket Saat Ini" : "Upgrade ke Growth", popular: true, current: currentPlan === 'Growth',
    },
    {
      name: "Business", price: "Rp199rb", amount: 199000,
      features: ["50.000 Visitor/bln", "30 Landing Page", "Retensi 180 hari", "150 Analisa AI/bulan", "Semua Growth + conversion tracking"],
      cta: currentPlan === 'Business' ? "Paket Saat Ini" : "Upgrade ke Business", popular: false, current: currentPlan === 'Business',
    },
    {
      name: "Pro", price: "Rp399rb", amount: 399000,
      features: ["150.000 Visitor/bln", "100 Landing Page", "Retensi 1 tahun", "500 Analisa AI/bulan", "Semua Business + advanced analytics"],
      cta: currentPlan === 'Pro' ? "Paket Saat Ini" : "Upgrade ke Pro", popular: false, current: currentPlan === 'Pro',
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: C.ink, display: "flex", alignItems: "center", gap: 10 }}>
          <CreditCard size={24} color={C.red} />
          Langganan & Billing
        </h1>
        <p style={{ fontSize: 14.5, color: C.muted, margin: 0, lineHeight: 1.6 }}>
          Kelola paket langganan Anda untuk mendapatkan akses ke lebih banyak fitur dan limit visitor yang lebih tinggi.
        </p>
      </div>

      <div style={{ padding: "24px", background: "#FFFFFF", borderRadius: 12, border: `1px solid ${C.line}`, marginBottom: 40, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 500 }}>Paket Anda Saat Ini</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.ink }}>{currentPlan} Plan</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 500 }}>Penggunaan Visitor (Bulan Ini)</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
            {monthlyVisitorCount.toLocaleString("id-ID")} / {maxVisitors.toLocaleString("id-ID")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 500 }}>Siklus Penagihan</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
            {currentPlan === 'Free' ? 'Gratis Selamanya' : 'Berlangganan (Pakasir)'}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 20 }}>
        {plans.map(plan => (
          <div key={plan.name} style={{
            padding: "32px 20px",
            border: plan.popular ? `2px solid ${C.red}` : (plan.current ? `2px solid ${C.moss}` : `1px solid ${C.line}`),
            borderRadius: 16,
            background: plan.popular ? "#FDFCF8" : "#FFFFFF",
            position: "relative",
            boxShadow: plan.popular ? "0 8px 32px rgba(178,58,42,0.08)" : "none",
            display: "flex", flexDirection: "column"
          }}>
            {plan.popular && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: C.red, color: "#FFF", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                Rekomendasi
              </div>
            )}
            {plan.current && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: C.moss, color: "#FFF", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                Paket Aktif
              </div>
            )}
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{plan.name}</h3>
            <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 24, color: C.ink, letterSpacing: "-0.03em" }}>
              {plan.price}<span style={{ fontSize: 13, color: C.muted, fontWeight: 500, letterSpacing: "normal" }}>/bln</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 12, flexGrow: 1 }}>
              {plan.features.map(feat => (
                <li key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: C.ink, lineHeight: 1.4 }}>
                  <CheckCircle2 size={16} color={C.moss} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <CheckoutButton 
              siteId={params.siteId} 
              planName={plan.name} 
              amount={plan.amount} 
              isCurrent={plan.current} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}
