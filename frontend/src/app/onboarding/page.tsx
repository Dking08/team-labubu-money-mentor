"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFinancialProfile } from "@/components/ProfileProvider";
import {
  FALLBACK_AA_DATA,
  buildLinkedAccounts,
  buildProfileFromOnboarding,
  type AccountIcon,
} from "@/lib/financial-profile";
import { getSetuMockData } from "@/lib/api";

const SvgIcons: Record<AccountIcon, React.ReactNode> = {
  bank: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>,
  chart: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  lock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  shield: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

export default function OnboardingPage() {
  const { profile, aaData, setAppState } = useFinancialProfile();
  const [step, setStep] = useState<"name" | "linking" | "linked">("name");
  const [name, setName] = useState(profile.name || "");
  const [visibleAccounts, setVisibleAccounts] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setName(profile.name || "");
    if (profile.onboarding_completed && profile.linked_accounts.length > 0) {
      setStep("linked");
      setVisibleAccounts(profile.linked_accounts.length);
    }
  }, [profile]);

  const startLinking = async () => {
    if (!name.trim()) return;
    setStep("linking");

    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      const fetchedAaData = await getSetuMockData().catch(() => FALLBACK_AA_DATA);
      await pause(1200);
      const nextProfile = buildProfileFromOnboarding(name, fetchedAaData, profile);
      setAppState({
        profile: nextProfile,
        aa_data: fetchedAaData,
      });
      setVisibleAccounts(0);
      setStep("linked");
      nextProfile.linked_accounts.forEach((_, i) => {
        setTimeout(() => setVisibleAccounts(i + 1), i * 300);
      });
    } catch {
      const nextProfile = buildProfileFromOnboarding(name, FALLBACK_AA_DATA, profile);
      setAppState({
        profile: nextProfile,
        aa_data: FALLBACK_AA_DATA,
      });
      setVisibleAccounts(nextProfile.linked_accounts.length);
      setStep("linked");
    }
  };

  const linkedAccounts = profile.onboarding_completed
    ? profile.linked_accounts
    : buildLinkedAccounts(aaData || FALLBACK_AA_DATA);

  return (
    <div className="onboarding-page">
      <div className="onboarding-bg" />

      <div className="onboarding-container">
        {/* Logo */}
        <div className="onboarding-logo">
          <div className="onboarding-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 className="onboarding-title">ET Money Mentor</h1>
          <p className="onboarding-subtitle">AI-Powered Personal Finance Mentor</p>
        </div>

        {step === "name" && (
          <div className="onboarding-card animate-in stagger-1">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, fontFamily: "'Space Grotesk'" }}>
              Welcome to your financial journey
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>
              Let&apos;s start by connecting your financial accounts securely via Account Aggregator
            </p>

            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                className="form-input"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startLinking()}
                autoFocus
                id="onboarding-name"
                style={{ fontSize: 16, padding: "14px 16px" }}
              />
            </div>

            <button
              className="btn-gradient"
              onClick={startLinking}
              disabled={!name.trim()}
              style={{ width: "100%", padding: "14px", fontSize: 16, marginTop: 8 }}
              id="link-accounts-btn"
            >
              Link Accounts via Setu AA
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Secured by Setu Account Aggregator — RBI regulated
              </span>
            </div>
          </div>
        )}

        {step === "linking" && (
          <div className="onboarding-card animate-in">
            <div className="onboarding-linking">
              <div className="onboarding-spinner-ring">
                <div className="onboarding-spinner" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginTop: 24, fontFamily: "'Space Grotesk'" }}>
                Connecting to your accounts...
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>
                Fetching data securely via Setu Account Aggregator
              </p>
              <div className="onboarding-steps-list">
                <div className="onboarding-step-item done">Authenticating with Setu AA</div>
                <div className="onboarding-step-item active">Discovering financial accounts</div>
                <div className="onboarding-step-item">Fetching portfolio data</div>
              </div>
            </div>
          </div>
        )}

        {step === "linked" && (
          <div className="onboarding-card animate-in" style={{ maxWidth: 620 }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Space Grotesk'" }}>
                All accounts linked successfully
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6 }}>
                Welcome, <strong style={{ color: "var(--text-primary)" }}>{profile.name || name}</strong> — {linkedAccounts.length} accounts discovered
              </p>
            </div>

            <div className="onboarding-accounts">
              {linkedAccounts.slice(0, visibleAccounts).map((acc, i) => (
                <div className="onboarding-account-card" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="onboarding-account-icon">{SvgIcons[acc.icon]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{acc.type}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{acc.provider} — {acc.number}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Space Grotesk'" }}>{acc.balance}</div>
                  </div>
                </div>
              ))}
            </div>

            {visibleAccounts >= linkedAccounts.length && (
              <div className="animate-in" style={{ marginTop: 24 }}>
                <button
                  className="btn-gradient"
                  onClick={() => router.push("/")}
                  style={{ width: "100%", padding: "14px", fontSize: 16 }}
                  id="continue-btn"
                >
                  Continue to Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
