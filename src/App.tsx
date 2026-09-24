import type { ReactElement } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { RequireSession } from "./app/AppShell";
import { Billing, Notifications, OrganizationPage as OrganizationAdminPage, Security, Settings, Storage, SupportApp } from "./app/pages/Manage";
import { Activity, ActivityDetails, BackupSets, Devices, Overview } from "./app/pages/Protect";
import { Restore, SmartCleanup, Trash } from "./app/pages/Recover";
import { SiteLayout } from "./components/SiteLayout";
import { useAuth } from "./lib/auth";
import type { Capability } from "./lib/capabilities";
import { PageHero } from "./site/blocks";
import { ForgotPassword, ResetPassword, SignIn, SignUp, VerifyEmail } from "./site/pages/Auth";
import { Faq, Feedback } from "./site/pages/FaqAndFeedback";
import Home from "./site/pages/Home";
import { Contact, Download, Features, OrganizationPage, Personal, Pioneer, Referral, ReleaseNotes, Roadmap, SecurityPage, Support, Trials } from "./site/pages/Marketing";
import Pricing from "./site/pages/Pricing";

function NotFound() {
  return (
    <>
      <PageHero title="Page not found" lead="That page does not exist or has moved." />
      <section className="section">
        <div className="container">
          <Link className="btn btn-primary" to="/">
            Back to the home page
          </Link>
        </div>
      </section>
    </>
  );
}

/** A page the server says this person cannot use. The server refuses the data
 *  regardless; this only avoids showing an empty, confusing screen to someone who typed the URL. */
function RoleGate({ capability, children }: { capability: Capability; children: ReactElement }) {
  const { me } = useAuth();
  if (me && !me.capabilities[capability]) {
    return (
      <>
        <h1>Not available for your role</h1>
        <p className="sub">Your role does not include this page. Ask your Organization Admin if you need access.</p>
        <Link to="/app">Back to Overview</Link>
      </>
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/download" element={<Download />} />
        <Route path="/release-notes" element={<ReleaseNotes />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/features" element={<Features />} />
        <Route path="/personal" element={<Personal />} />
        <Route path="/organization" element={<OrganizationPage />} />
        <Route path="/trials" element={<Trials />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/referral" element={<Referral />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/pioneer" element={<Pioneer />} />
        <Route path="/support" element={<Support />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/app" element={<RequireSession />}>
        <Route index element={<Overview />} />
        <Route path="devices" element={<Devices />} />
        <Route path="backup-sets" element={<BackupSets />} />
        <Route path="activity" element={<Activity />} />
        <Route path="activity/:sessionId" element={<ActivityDetails />} />
        <Route path="restore" element={<Restore />} />
        <Route path="trash" element={<Trash />} />
        <Route path="smart-cleanup" element={<SmartCleanup />} />
        <Route path="organization" element={<RoleGate capability="viewMembers"><OrganizationAdminPage /></RoleGate>} />
        <Route path="storage" element={<Storage />} />
        <Route path="security" element={<Security />} />
        <Route path="billing" element={<RoleGate capability="viewBilling"><Billing /></RoleGate>} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="support" element={<SupportApp />} />
        <Route
          path="*"
          element={
            <>
              <h1>Page not found</h1>
              <Link to="/app">Back to Overview</Link>
            </>
          }
        />
      </Route>
    </Routes>
  );
}
