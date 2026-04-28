export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-display font-bold mb-8">Terms of Service</h1>
        
        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using ImpactGlobe, you accept and agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              2. Description of Service
            </h2>
            <p>
              ImpactGlobe is a real-time geopolitical risk monitoring platform that displays global news events
              on an interactive 3D globe, with AI-powered analysis of forex market impacts and environmental
              data layers. The service is provided free of charge to all users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              3. User Accounts
            </h2>
            <p>
              You may create a free account to access additional features such as watchlists and push notifications.
              You are responsible for:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              4. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Scrape, crawl, or systematically download content</li>
              <li>Reverse engineer any part of the service</li>
              <li>Use the service to make investment decisions without independent verification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              5. Data and Content
            </h2>
            <p>
              ImpactGlobe aggregates data from public sources and uses AI to analyze news events. We strive
              for accuracy but make no guarantees about:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
              <li>The accuracy, completeness, or timeliness of any information</li>
              <li>The reliability of AI-generated analysis</li>
              <li>The availability or uptime of the service</li>
            </ul>
            <p className="mt-4">
              <strong>Important:</strong> ImpactGlobe is for informational purposes only and does not constitute
              financial, investment, or trading advice. Always conduct your own research and consult with
              qualified professionals before making financial decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              6. Data Sources and Attribution
            </h2>
            <p>
              ImpactGlobe uses data from the following free public sources:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
              <li>Open-Meteo (weather and climate data)</li>
              <li>OpenAQ (air quality data)</li>
              <li>USGS (earthquake data)</li>
              <li>NASA EONET (wildfire and storm data)</li>
              <li>NOAA (weather alerts)</li>
              <li>Twelve Data (forex market data)</li>
              <li>Various RSS news feeds</li>
            </ul>
            <p className="mt-4">
              We respect the terms of service of all data providers and encourage users to do the same.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              7. Intellectual Property
            </h2>
            <p>
              The ImpactGlobe platform, including its design, code, and original content, is owned by
              ImpactGlobe and protected by copyright and other intellectual property laws. You may not
              copy, modify, or distribute any part of the service without permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              8. Disclaimer of Warranties
            </h2>
            <p>
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
              WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              AND NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              9. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IMPACTGLOBE SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
              WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER
              INTANGIBLE LOSSES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              10. Service Modifications
            </h2>
            <p>
              We reserve the right to modify, suspend, or discontinue the service at any time without notice.
              We may also update these terms from time to time. Continued use of the service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              11. Termination
            </h2>
            <p>
              We may terminate or suspend your account at any time for violation of these terms or for any
              other reason. You may delete your account at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              12. Governing Law
            </h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the jurisdiction
              in which ImpactGlobe operates, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold text-text-primary mb-4">
              13. Contact
            </h2>
            <p>
              For questions about these terms, please contact us at{' '}
              <a href="mailto:legal@impactglobe.com" className="text-impact-low hover:underline">
                legal@impactglobe.com
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
