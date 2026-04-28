export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-display font-bold mb-8">Privacy Policy</h1>
        
        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              1. Information We Collect
            </h2>
            <p>
              When you create an account, we collect your email address. We use Supabase for authentication
              and database services. Your data is stored securely and encrypted at rest.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              2. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
              <li>Provide and maintain the ImpactGlobe service</li>
              <li>Send you notifications about events you're watching (if you opt in)</li>
              <li>Improve our AI analysis and data quality</li>
              <li>Communicate with you about service updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              3. Data Sharing
            </h2>
            <p>
              We do not sell your personal information. We share data only with service providers necessary
              to operate ImpactGlobe:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
              <li>Supabase (database and authentication)</li>
              <li>Vercel (hosting)</li>
              <li>Anthropic (AI analysis - no personal data sent)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              4. Push Notifications
            </h2>
            <p>
              If you enable push notifications, we store your browser's push subscription endpoint.
              You can unsubscribe at any time through your browser settings or by disabling notifications
              in your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              5. Cookies and Local Storage
            </h2>
            <p>
              We use cookies and local storage to maintain your session and remember your preferences
              (such as whether you've seen the onboarding flow). We do not use third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              6. Data Retention
            </h2>
            <p>
              We retain your account data for as long as your account is active. If you delete your account,
              we will delete your personal information within 30 days, except where required by law to retain it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              7. Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt out of notifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              8. Data Sources
            </h2>
            <p>
              ImpactGlobe aggregates data from public sources including RSS feeds, free environmental APIs
              (Open-Meteo, OpenAQ, USGS, NASA EONET, NOAA), and forex data providers. We do not collect
              personal information from these sources.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              9. Security
            </h2>
            <p>
              We implement industry-standard security measures including HTTPS encryption, secure password
              hashing, and regular security audits. However, no method of transmission over the internet
              is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by
              posting the new policy on this page and updating the "Last Updated" date below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              11. Contact Us
            </h2>
            <p>
              If you have questions about this privacy policy, please contact us at{' '}
              <a href="mailto:privacy@impactglobe.com" className="text-impact-low hover:underline">
                privacy@impactglobe.com
              </a>
            </p>
          </section>

          <div className="pt-8 mt-8 border-t border-border-subtle text-text-muted text-sm">
            Last Updated: April 28, 2026
          </div>
        </div>
      </div>
    </div>
  )
}
