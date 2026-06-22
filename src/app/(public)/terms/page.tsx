import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — FoodRaccoon",
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-[#D44C2A]">Terms of Service</h1>
          <p className="text-sm text-[#8C7E72]">Effective date: 23 June 2026</p>
        </div>

        <Section title="1. Acceptance">
          <p>By accessing or using FoodRaccoon you agree to these Terms of Service. If you do not agree, do not use the app.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>FoodRaccoon is a restaurant discovery app focused on Phnom Penh, Cambodia. It allows users to browse restaurants on a map, save and rate venues, write reviews, and create lists.</p>
        </Section>

        <Section title="3. User Accounts">
          <p>An account is optional — you can browse the app without signing in. If you create an account you are responsible for maintaining the security of your credentials and for all activity under your account.</p>
        </Section>

        <Section title="4. User-Generated Content">
          <p>You retain ownership of any reviews, ratings, or other content you submit (&quot;User Content&quot;). By submitting User Content you grant FoodRaccoon a non-exclusive, worldwide, royalty-free licence to display and distribute it within the app.</p>
          <p>You must not submit content that is false, defamatory, harassing, or otherwise unlawful. We reserve the right to remove content that violates these terms.</p>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Post fake or manipulated reviews</li>
            <li>Scrape, crawl, or systematically download app data</li>
            <li>Impersonate another person or entity</li>
            <li>Use the app for any illegal purpose</li>
            <li>Attempt to gain unauthorised access to any part of the service</li>
          </ul>
        </Section>

        <Section title="6. Accuracy of Restaurant Data">
          <p>Restaurant information (hours, location, cuisine) is provided for convenience and may be incomplete or out of date. Always verify directly with the restaurant before visiting. FoodRaccoon accepts no liability for inaccurate data.</p>
        </Section>

        <Section title="7. No Warranty">
          <p>The app is provided &quot;as is&quot; without warranty of any kind. We do not guarantee uninterrupted availability, accuracy of content, or fitness for any particular purpose.</p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>To the fullest extent permitted by law, FoodRaccoon shall not be liable for any indirect, incidental, special, or consequential loss arising from your use of the app.</p>
        </Section>

        <Section title="9. Governing Law">
          <p>These terms are governed by the laws of the Kingdom of Cambodia. Any disputes shall be subject to the jurisdiction of the courts of Cambodia.</p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>We may update these terms from time to time. Continued use of the app after changes are posted constitutes acceptance of the revised terms.</p>
        </Section>

        <Section title="11. Contact">
          <p>Questions about these terms? Email us at <a href="mailto:admin@foodracoon.com" className="text-[#D44C2A] underline underline-offset-2">admin@foodracoon.com</a>.</p>
        </Section>

        <footer className="border-t border-[#D4C8B4] pt-6 text-sm text-[#8C7E72] flex flex-wrap gap-4">
          <Link href="/" className="hover:text-[#D44C2A]">← Back to app</Link>
          <Link href="/privacy" className="hover:text-[#D44C2A]">Privacy Policy</Link>
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
