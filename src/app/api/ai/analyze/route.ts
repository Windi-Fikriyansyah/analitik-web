import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const maxDuration = 60; // allow up to 60s for OpenAI response

// ---------- Types ----------
type AIInsight = {
  level: 'kritis' | 'peringatan' | 'peluang';
  title: string;
  desc: string;
  confidence: number;
  impact: string;
};

type AIRecommendation = {
  priority: 'tinggi' | 'sedang' | 'rendah';
  title: string;
  desc: string;
  sectionTarget?: string;
  textBefore?: string;
  textAfter?: string;
  steps: string[];
};

type AIAnalysisResult = {
  conversionScore: number;
  summary: string;
  insights: AIInsight[];
  recommendations: AIRecommendation[];
};

// ---------- Helpers ----------
function formatSeconds(seconds: number) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

// ---------- Landing Page Scraper ----------
type PageContent = {
  title: string;
  metaDescription: string;
  headings: { level: string; text: string }[];
  links: { text: string; href: string }[];
  buttons: string[];
  images: { alt: string; src: string }[];
  sections: { id: string; textPreview: string }[];
  textContent: string;
  formCount: number;
  hasVideo: boolean;
  wordCount: number;
  dataLpButtons: Record<string, string>;
};

async function scrapePageContent(domain: string): Promise<PageContent | null> {
  try {
    // Normalize URL
    let url = domain.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BooknesiaBot/1.0; +https://Booknesia.id)',
        'Accept': 'text/html',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    if (!html || html.length < 100) return null;

    // --- Parse HTML with regex (lightweight, no dependency needed) ---

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch?.[1]?.trim() ?? '';

    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
      ?? html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const metaDescription = metaDescMatch?.[1]?.trim() ?? '';

    // Extract headings (h1-h6)
    const headings: { level: string; text: string }[] = [];
    const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
    let hMatch;
    while ((hMatch = headingRegex.exec(html)) !== null && headings.length < 30) {
      const text = hMatch[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (text) headings.push({ level: hMatch[1].toUpperCase(), text });
    }

    // Extract buttons and CTAs
    const buttons: string[] = [];
    const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
    let bMatch;
    while ((bMatch = buttonRegex.exec(html)) !== null && buttons.length < 20) {
      const text = bMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (text && text.length < 100) buttons.push(text);
    }
    // Also look for CTA-like links (a tags with class containing btn/button/cta)
    const ctaLinkRegex = /<a[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
    let clMatch;
    while ((clMatch = ctaLinkRegex.exec(html)) !== null && buttons.length < 25) {
      const text = clMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (text && text.length < 100) buttons.push(text);
    }

    // Extract data-lp-button mappings
    const dataLpButtons: Record<string, string> = {};
    const dataLpBtnRegex = /data-lp-button=["']([^"']*)["'][^>]*>([\s\S]*?)<\/(?:button|a|div|span|p)>/gi;
    let lpMatch;
    while ((lpMatch = dataLpBtnRegex.exec(html)) !== null) {
      const id = lpMatch[1];
      const text = lpMatch[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (text && text.length < 100) dataLpButtons[id] = text;
    }

    // Extract links
    const links: { text: string; href: string }[] = [];
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let lMatch;
    while ((lMatch = linkRegex.exec(html)) !== null && links.length < 20) {
      const text = lMatch[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (text && text.length < 80) links.push({ text, href: lMatch[1] });
    }

    // Extract images
    const images: { alt: string; src: string }[] = [];
    const imgRegex = /<img[^>]*(?:alt=["']([^"']*)["'])?[^>]*src=["']([^"']*)["'][^>]*/gi;
    let iMatch;
    while ((iMatch = imgRegex.exec(html)) !== null && images.length < 15) {
      images.push({ alt: iMatch[1]?.trim() ?? '', src: iMatch[2] });
    }

    // Extract section/div IDs and approximate text content
    const sections: { id: string; textPreview: string }[] = [];
    const sectionRegex = /data-lp-section=["']([^"']*)["']/gi;
    let sMatch;
    while ((sMatch = sectionRegex.exec(html)) !== null && sections.length < 20) {
      const id = sMatch[1];
      const snippet = html.substring(sMatch.index, sMatch.index + 1500);
      const textPreview = snippet.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
      sections.push({ id, textPreview });
    }

    // Count forms
    const formCount = (html.match(/<form/gi) ?? []).length;

    // Check for video
    const hasVideo = /<video|youtube|vimeo|wistia/i.test(html);

    // Extract body text content (strip HTML, scripts, styles)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] ?? html;
    const textContent = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000); // Limit to ~3000 chars to keep prompt reasonable

    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    return {
      title,
      metaDescription,
      headings,
      links,
      buttons,
      images,
      sections,
      textContent,
      formCount,
      hasVideo,
      wordCount,
      dataLpButtons,
    };
  } catch (err) {
    console.error('Failed to scrape landing page:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let body: { siteId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { siteId } = body;
  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
  }

  // 3. Validate site ownership
  const { data: site } = await supabase
    .from('sites')
    .select('id, name, domain')
    .eq('id', siteId)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // 4. Check OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key belum dikonfigurasi. Tambahkan OPENAI_API_KEY di file .env.local' },
      { status: 500 }
    );
  }

  // 5. Fetch analytics data
  const [
    { data: visitors },
    { data: sessions },
    { data: dbSections },
    { data: buttonClicks },
  ] = await Promise.all([
    supabase.from('visitors').select('first_seen, device_type').eq('site_id', site.id),
    supabase.from('sessions').select('duration_seconds, referrer').eq('site_id', site.id),
    supabase
      .from('section_metrics')
      .select('section_id, visitor_count, avg_duration_seconds, avg_entry_offset_seconds')
      .eq('site_id', site.id)
      .order('avg_entry_offset_seconds', { ascending: true }),
    supabase.from('button_clicks').select('button_id, visitor_id').eq('site_id', site.id),
  ]);

  // 6. Compute metrics
  const totalVisitors = visitors?.length ?? 0;
  const totalSessions = sessions?.length ?? 0;

  const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
  (visitors ?? []).forEach((v) => {
    if (v.device_type && v.device_type in deviceBreakdown) {
      deviceBreakdown[v.device_type as keyof typeof deviceBreakdown] += 1;
    }
  });

  const completedDurations = (sessions ?? [])
    .map((s) => s.duration_seconds)
    .filter((d): d is number => typeof d === 'number' && d >= 0);
  const avgDuration =
    completedDurations.length > 0
      ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
      : 0;

  const bounceCount = completedDurations.filter((d) => d < 5).length;
  const bounceRate = totalSessions > 0 ? ((bounceCount / totalSessions) * 100).toFixed(1) : '0';

  // 7. Scrape the actual landing page content (if domain is set)
  let pageContent: PageContent | null = null;
  if (site.domain) {
    pageContent = await scrapePageContent(site.domain);
  }

  // Section funnel data
  const sectionData = (dbSections ?? []).map((s) => {
    const preview = pageContent?.sections?.find(ps => ps.id === s.section_id)?.textPreview || "Teks konten tidak diketahui";
    return {
      section_id: s.section_id,
      section_text: preview,
      visitor_count: s.visitor_count,
      avg_duration: formatSeconds(Number(s.avg_duration_seconds ?? 0)),
      avg_duration_seconds: Number(s.avg_duration_seconds ?? 0),
    };
  });

  // Button click data
  const buttonStatsMap = new Map<string, { totalClicks: number; uniqueVisitors: Set<string> }>();
  (buttonClicks ?? []).forEach((b) => {
    if (!buttonStatsMap.has(b.button_id)) {
      buttonStatsMap.set(b.button_id, { totalClicks: 0, uniqueVisitors: new Set() });
    }
    const stat = buttonStatsMap.get(b.button_id)!;
    stat.totalClicks += 1;
    stat.uniqueVisitors.add(b.visitor_id);
  });

  const buttonData = Array.from(buttonStatsMap.entries())
    .map(([button_id, stat]) => ({
      button_id,
      total_clicks: stat.totalClicks,
      unique_visitors: stat.uniqueVisitors.size,
      click_rate: totalVisitors > 0 ? ((stat.uniqueVisitors.size / totalVisitors) * 100).toFixed(1) + '%' : '0%',
    }))
    .sort((a, b) => b.total_clicks - a.total_clicks);

  // Referrer data
  const referrerMap = new Map<string, number>();
  (sessions ?? []).forEach((s) => {
    const ref = s.referrer || '(langsung)';
    referrerMap.set(ref, (referrerMap.get(ref) ?? 0) + 1);
  });
  const topReferrers = Array.from(referrerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));

  // Traffic trend (last 14 days)
  const trafficMap = new Map<string, { visits: number }>();
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    trafficMap.set(key, { visits: 0 });
  }
  (visitors ?? []).forEach((v) => {
    if (v.first_seen) {
      const key = new Date(v.first_seen).toISOString().split('T')[0];
      const entry = trafficMap.get(key);
      if (entry) entry.visits += 1;
    }
  });
  const trafficTrend = Array.from(trafficMap.entries()).map(([date, val]) => ({
    date,
    visits: val.visits,
  }));


  // 8. Build prompt
  const enrichedButtonData = buttonData.map(b => ({
    ...b,
    button_text: pageContent?.dataLpButtons?.[b.button_id] || "Teks tidak diketahui (hanya ID)",
  }));

  const analyticsContext = JSON.stringify(
    {
      site_name: site.name,
      site_domain: site.domain,
      total_visitors: totalVisitors,
      total_sessions: totalSessions,
      avg_session_duration: formatSeconds(avgDuration),
      avg_session_duration_seconds: Math.round(avgDuration * 10) / 10,
      bounce_rate: bounceRate + '%',
      device_breakdown: deviceBreakdown,
      section_funnel: sectionData,
      button_clicks: enrichedButtonData,
      top_referrers: topReferrers,
      traffic_trend_14d: trafficTrend,
    },
    null,
    2
  );

  let pageContentContext = '';
  if (pageContent) {
    pageContentContext = `\n\n=== KONTEN LANDING PAGE (di-scrape dari ${site.domain}) ===\n` + JSON.stringify(
      {
        page_title: pageContent.title,
        meta_description: pageContent.metaDescription,
        headings: pageContent.headings,
        cta_buttons: pageContent.buttons,
        navigation_links: pageContent.links.slice(0, 10),
        images_count: pageContent.images.length,
        images_without_alt: pageContent.images.filter(img => !img.alt).length,
        page_sections: pageContent.sections,
        form_count: pageContent.formCount,
        has_video: pageContent.hasVideo,
        word_count: pageContent.wordCount,
        body_text_preview: pageContent.textContent,
      },
      null,
      2
    );
  }

  const hasPageContent = !!pageContent;

  const systemPrompt = `Kamu adalah seorang ahli CRO (Conversion Rate Optimization) dan landing page analyst berpengalaman.

Tugasmu:
1. Menganalisa data analitik landing page yang diberikan
2. ${hasPageContent ? 'Menganalisa konten dan struktur ACTUAL dari landing page yang telah di-scrape' : 'Menemukan masalah berdasarkan pola perilaku pengunjung'}
3. Menemukan masalah dan peluang yang mempengaruhi konversi
4. Memberikan saran perbaikan yang SPESIFIK dan ACTIONABLE untuk meningkatkan conversion rate

PENTING:
- Analisa harus berdasarkan DATA NYATA yang diberikan, bukan asumsi
- ${hasPageContent ? 'Kamu memiliki akses ke KONTEN ACTUAL landing page — gunakan ini untuk memberikan saran yang SANGAT SPESIFIK. Misalnya: sarankan perubahan headline tertentu, perbaikan teks CTA, penambahan elemen yang hilang, dll.' : 'Domain tidak tersedia atau gagal diakses. Analisa berdasarkan data analitik saja.'}
- ${hasPageContent ? 'Komentari kualitas headline, copywriting, CTA, struktur halaman, dan elemen konversi berdasarkan konten yang kamu lihat' : ''}
- Saran harus praktis dan bisa langsung diterapkan
- Gunakan Bahasa Indonesia yang profesional
- Jika data terlalu sedikit, tetap berikan analisa sebaik mungkin dengan catatan bahwa diperlukan lebih banyak data

Berikan response dalam format JSON EXACT seperti ini (tanpa markdown code block, langsung JSON):
{
  "conversionScore": <number 0-100, estimasi kualitas konversi berdasarkan metrik${hasPageContent ? ' DAN kualitas konten halaman' : ''}>,
  "summary": "<ringkasan singkat performa landing page dalam 2-3 kalimat${hasPageContent ? ', termasuk evaluasi konten dan copywriting' : ''}>",
  "insights": [
    {
      "level": "<kritis|peringatan|peluang>",
      "title": "<judul temuan singkat>",
      "desc": "<deskripsi detail temuan berdasarkan data${hasPageContent ? ' dan konten halaman' : ''}>",
      "confidence": <number 0-100, tingkat keyakinan>,
      "impact": "<estimasi dampak jika diperbaiki>"
    }
  ],
  "recommendations": [
    {
      "priority": "<tinggi|sedang|rendah>",
      "title": "<judul rekomendasi>",
      "desc": "<penjelasan mengapa ini penting${hasPageContent ? '. Referensikan elemen spesifik dari halaman.' : ''}>",
      "sectionTarget": "<nama section yang harus diperbaiki, misal: Hero Section, Pricing, dll (opsional)>",
      "textBefore": "<teks asli saat ini yang kurang baik (opsional, isi jika ada teks yang perlu diubah)>",
      "textAfter": "<saran teks baru yang lebih konversi tinggi (opsional, isi jika textBefore diisi)>",
      "steps": [
        "<langkah 1 yang spesifik${hasPageContent ? ' — referensikan teks/elemen actual dari halaman' : ''}>",
        "<langkah 2 yang spesifik>",
        "<langkah 3 yang spesifik>"
      ]
    }
  ]
}

Berikan minimal 3 insights dan 4 recommendations. Urutkan insights dari yang paling kritis, dan recommendations dari prioritas tertinggi.${hasPageContent ? '\n\nKarena kamu memiliki akses ke konten halaman, pastikan rekomendasi SANGAT SPESIFIK — misalnya jangan hanya bilang "perbaiki headline" tapi sarankan teks headline baru yang lebih baik. Jangan hanya bilang "tambahkan CTA" tapi sarankan teks CTA yang spesifik beserta penempatannya.' : ''}`;

  const userPrompt = `Berikut data analitik landing page yang perlu kamu analisa:\n\n${analyticsContext}${pageContentContext}`;

  // 9. Call OpenAI
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.error('OpenAI API error:', openaiRes.status, errBody);
      return NextResponse.json(
        { error: `OpenAI API error: ${openaiRes.status}` },
        { status: 502 }
      );
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'Empty response from OpenAI' }, { status: 502 });
    }

    // Parse the JSON response from GPT
    let analysis: AIAnalysisResult;
    try {
      // Strip potential markdown code fences
      const cleaned = content.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse OpenAI response:', content);
      return NextResponse.json(
        { error: 'Gagal memproses respons AI. Silakan coba lagi.' },
        { status: 502 }
      );
    }

    // Validate structure
    if (
      typeof analysis.conversionScore !== 'number' ||
      !Array.isArray(analysis.insights) ||
      !Array.isArray(analysis.recommendations)
    ) {
      return NextResponse.json(
        { error: 'Format respons AI tidak valid. Silakan coba lagi.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ analysis, pageScraped: !!pageContent });
  } catch (fetchErr) {
    console.error('OpenAI fetch error:', fetchErr);
    return NextResponse.json(
      { error: 'Gagal menghubungi OpenAI. Periksa koneksi internet server.' },
      { status: 502 }
    );
  }
}
