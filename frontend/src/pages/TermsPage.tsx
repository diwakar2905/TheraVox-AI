import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-[100vh] bg-[var(--bg)] text-[var(--text)]">
      {/* ── Navigation ── */}
      <header className="fixed top-0 w-full z-50 bg-[var(--surface)] border-b border-[var(--border)] supports-backdrop-blur:bg-[var(--surface)]/60 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center shadow-sm">
              <img src="/logo.png" alt="TheraVox logo" className="w-5 h-5 object-contain" />
            </div>
            <span>TheraVox AI</span>
          </Link>
          <Link to="/register" className="text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)] transition-colors">
            Back to Register
          </Link>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="prose prose-slate dark:prose-invert max-w-none"
        >
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-[var(--text-tertiary)] mb-12 border-b border-[var(--border)] pb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--text)]">1. Acceptance of Terms</h2>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              By accessing or using TheraVox AI ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service. The Service is maintained for informational and self-improvement purposes only.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--text)]">2. Not Medical Advice</h2>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              <strong className="text-[var(--text)]">TheraVox AI is not a substitute for professional medical advice, diagnosis, or treatment.</strong> The emotional insights, sentiment analysis, and AI-generated responses provided by our platform are designed for self-reflection and personal growth.
            </p>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              Never disregard professional medical advice or delay in seeking it because of something you have read or heard on TheraVox. If you think you may have a medical emergency, call your doctor or emergency services immediately.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--text)]">3. Data Privacy and Security</h2>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              We take the privacy of your journal entries and voice recordings seriously. By using the Service, you consent to the collection and use of information as detailed in our Privacy Policy.
            </p>
            <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2 mb-4">
              <li>Your audio recordings are processed securely for transcription and sentiment analysis.</li>
              <li>Text journal entries are encrypted in transit and at rest.</li>
              <li>We do not sell your personal data or deeply personal reflections to third-party advertising networks.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--text)]">4. User Account Responsibilities</h2>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              You are responsible for safeguarding the password that you use to access the Service. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--text)]">5. Acceptable Use Policy</h2>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              You agree not to use the Service in any way that is unlawful, harmful, or violates these Terms. You will not:
            </p>
            <ul className="list-disc pl-6 text-[var(--text-secondary)] space-y-2 mb-4">
              <li>Attempt to reverse engineer the AI analysis algorithms or the application's source code.</li>
              <li>Use the Service to transmit explicitly harmful, illegal, or malicious content.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--text)]">6. Intellectual Property</h2>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              The Service and its original content (excluding your personal User Content), features, and functionality are and will remain the exclusive property of TheraVox AI and its licensors. The Service is protected by copyright, trademark, and other laws.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--text)]">7. Changes to Terms</h2>
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-[var(--text)]">8. Contact Us</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              If you have any questions about these Terms, please contact us at <a href="mailto:support@theravox.ai" className="text-[var(--brand)] hover:underline">support@theravox.ai</a>.
            </p>
          </section>

        </motion.div>
      </main>
    </div>
  );
}
