export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-fade-in py-4">
        <div className="text-center space-y-3">
            <h1 className="font-serif text-4xl tracking-tight text-[#f0ebe0]">Privacy Policy</h1>
            <p className="text-[#8a8580] text-sm">Last updated: March 27, 2026</p>
        </div>

        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-8 space-y-8 text-sm text-[#8a8580] leading-relaxed">
            <section>
                <h2 className="text-[#f0ebe0] font-medium text-base mb-3">1. Information We Collect</h2>
                <p><strong className="text-[#f0ebe0]">Account Data:</strong> Email address and username you provide during registration.<br/>
                <strong className="text-[#f0ebe0]">Usage Data:</strong> Trading activity, portfolio holdings, and platform interactions.<br/>
                <strong className="text-[#f0ebe0]">Technical Data:</strong> Browser type, device information, and IP address for security purposes.</p>
            </section>

            <section>
                <h2 className="text-[#f0ebe0] font-medium text-base mb-3">2. How We Use Your Information</h2>
                <p>We use collected information to: provide and maintain the TraX platform, process virtual trades and update portfolios, display leaderboard rankings, prevent abuse and ensure platform security, and improve the overall user experience.</p>
            </section>

            <section>
                <h2 className="text-[#f0ebe0] font-medium text-base mb-3">3. Data Storage</h2>
                <p>Your data is stored securely on Supabase infrastructure. Authentication is handled through Supabase Auth with industry-standard encryption. We do not store payment information as TraX uses only virtual currency.</p>
            </section>

            <section>
                <h2 className="text-[#f0ebe0] font-medium text-base mb-3">4. Data Sharing</h2>
                <p>We do not sell, rent, or share your personal information with third parties. Public information (username, portfolio value, leaderboard rank) is visible to other users. Trade history and specific holdings are private to your account.</p>
            </section>

            <section>
                <h2 className="text-[#f0ebe0] font-medium text-base mb-3">5. Cookies</h2>
                <p>TraX uses essential cookies and localStorage for authentication tokens and user preferences (like chart settings). We do not use tracking cookies or third-party analytics.</p>
            </section>

            <section>
                <h2 className="text-[#f0ebe0] font-medium text-base mb-3">6. Your Rights</h2>
                <p>You may request access to your personal data, request deletion of your account and associated data, and opt out of any non-essential communications. Contact us through our GitHub repository to exercise these rights.</p>
            </section>

            <section>
                <h2 className="text-[#f0ebe0] font-medium text-base mb-3">7. Security</h2>
                <p>We implement appropriate security measures including encrypted connections (HTTPS), secure authentication via Supabase Auth, and Row Level Security (RLS) on all database tables to protect your data.</p>
            </section>

            <section>
                <h2 className="text-[#f0ebe0] font-medium text-base mb-3">8. Changes to This Policy</h2>
                <p>We may update this Privacy Policy from time to time. We will notify users of significant changes through the platform. Continued use of TraX after changes constitutes acceptance.</p>
            </section>

            <section>
                <h2 className="text-[#f0ebe0] font-medium text-base mb-3">9. Contact</h2>
                <p>For privacy-related questions or concerns, please reach out via our GitHub repository or community channels.</p>
            </section>
        </div>
    </div>
  );
}
