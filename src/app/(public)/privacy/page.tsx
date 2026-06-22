import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — FoodRaccoon",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] px-6 py-12 text-[#2C2420]">
      <div className="mx-auto max-w-2xl space-y-10">

        <div className="space-y-1">
          <Link href="/" className="text-2xl font-extrabold tracking-tight text-[#D44C2A]">
            foodraccoon
          </Link>
          <p className="text-sm text-[#8C7E72]">Phnom Penh restaurant discovery</p>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-[#D44C2A]">Privacy Policy</h1>
          <p className="text-sm text-[#8C7E72]">Effective date: 23 June 2026</p>
        </div>

        <Section title="1. Information We Collect">
          <p>When you create an account we collect your <strong>email address</strong> and a display name. When you use the app we store your <strong>restaurant interactions</strong> — save status (want to try, visited, favourite), numerical ratings, and written reviews — linked to your account.</p>
          <p>We also store small amounts of data in your browser&apos;s <code>localStorage</code>: recent searches and an install-prompt dismissal timestamp. These never leave your device.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the information you provide solely to operate FoodRaccoon — to display your saved restaurants, show your reviews, and personalise your experience. We do not use your data for advertising or profiling.</p>
        </Section>

        <Section title="3. Data Storage">
          <p>Your account data is stored with <strong>Supabase</strong> on AWS infrastructure in the ap-southeast-1 (Singapore) region. Data is encrypted in transit (TLS) and at rest.</p>
        </Section>

        <Section title="4. Third-Party Services">
          <p><strong>Mapbox</strong> powers the map tiles. When you view the map, your browser makes requests to Mapbox servers. Their <a href="https://www.mapbox.com/legal/privacy" className="text-[#D44C2A] underline underline-offset-2" target="_blank" rel="noopener noreferrer">privacy policy</a> applies to those requests. We do not pass your account details to Mapbox.</p>
          <p>We use no advertising networks, analytics trackers, or other third-party data processors.</p>
        </Section>

        <Section title="5. Data Sharing">
          <p>We do not sell, rent, or share your personal information with third parties, except as required by law.</p>
          <p>Your <strong>public reviews</strong> are visible to other users of the app. Your email address is never shown publicly.</p>
        </Section>

        <Section title="6. Your Rights">
          <p>You may request a copy of your data or ask us to delete your account and all associated data at any time. Email <a href="mailto:prachsovithyea11@gmail.com" className="text-[#D44C2A] underline underline-offset-2">prachsovithyea11@gmail.com</a> with your request. We will action it within 30 days.</p>
        </Section>

        <Section title="7. Cookies and Local Storage">
          <p>We do not use tracking cookies. We use <code>localStorage</code> for app functionality only (recent searches, onboarding state, install prompt state). These can be cleared by clearing your browser&apos;s site data.</p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>We may update this policy from time to time. Material changes will be noted with a revised effective date at the top of this page.</p>
        </Section>

        <Section title="9. Contact">
          <p>Questions about this policy? Email us at <a href="mailto:prachsovithyea11@gmail.com" className="text-[#D44C2A] underline underline-offset-2">prachsovithyea11@gmail.com</a>.</p>
        </Section>

        <footer className="border-t border-[#D4C8B4] pt-6 text-sm text-[#8C7E72] flex flex-wrap gap-4">
          <Link href="/" className="hover:text-[#D44C2A]">← Back to app</Link>
          <Link href="/terms" className="hover:text-[#D44C2A]">Terms of Service</Link>
        </footer>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[#D44C2A]">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-[#2C2420]">{children}</div>
    </section>
  );
}
