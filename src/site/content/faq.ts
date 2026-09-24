// Tornova public FAQ content.
//
// GENERATED from the two official source documents in docs/stage9 ("Master FAQ"
// and "FAQ - Additional Level 2"), reorganised into the twelve locked categories
// and updated ONLY where a newer locked Stage 9 decision supersedes older wording
// (docs/stage9/08 section 3): Smart Backup vs Automatic Backup, trial prices,
// USD-only public pricing, unlimited Personal devices, the Equal Restore
// Allowance, Organization pricing, Pioneer rules and the hosting wording.
// No claim is made about who can read CSE data (key custody is undecided).
//
// `future: true` marks capabilities that are planned, not current.

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string[];
  future?: boolean;
}

export const FAQ_CATEGORIES: Array<{ id: string; name: string }> = [
  {
    "id": "getting-started",
    "name": "Getting Started"
  },
  {
    "id": "personal",
    "name": "Personal Backup"
  },
  {
    "id": "organizations",
    "name": "Organizations & Teams"
  },
  {
    "id": "backup-automation",
    "name": "Backup & Automation"
  },
  {
    "id": "smart",
    "name": "Smart Backup & Smart Cleanup"
  },
  {
    "id": "restore",
    "name": "Restore & Recovery"
  },
  {
    "id": "security",
    "name": "Security & Privacy"
  },
  {
    "id": "agent-devices",
    "name": "Windows Agent & Devices"
  },
  {
    "id": "pricing",
    "name": "Pricing, Plans & Trials"
  },
  {
    "id": "reliability",
    "name": "Reliability & Troubleshooting"
  },
  {
    "id": "pioneer",
    "name": "Pioneer & Referral"
  },
  {
    "id": "infrastructure",
    "name": "Infrastructure & Future"
  }
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    "id": "how-does-tornova-back-up-my-files",
    "category": "getting-started",
    "question": "How does Tornova back up my files?",
    "answer": [
      "You install the Tornova Windows Agent, sign in, and choose the files, folders or drives you want to protect - your backup set.",
      "The Agent then protects that backup set in the background and sends your data securely to Tornova's cloud storage. The website and dashboard let you manage and monitor your backups; the Windows Agent is what actually reads and backs up the files on your PC."
    ]
  },
  {
    "id": "what-is-tornova-backup",
    "category": "getting-started",
    "question": "What is Tornova Backup?",
    "answer": [
      "Tornova Backup is a modern cloud backup platform designed to protect files, folders, and selected drives on Windows computers.",
      "Tornova goes beyond simply copying files to cloud storage. It is designed around backup visibility, health monitoring, controlled recovery, security, Organization and Team management, Smart Backup, Smart Cleanup, versioning, and centralized administration.",
      "The goal is simple: customers should not only have a backup—they should also be able to understand whether their backup is healthy and have clear control when recovery is needed."
    ]
  },
  {
    "id": "what-makes-tornova-different-from-a-traditional-backup-service",
    "category": "getting-started",
    "question": "What makes Tornova different from a traditional backup service?",
    "answer": [
      "A traditional backup system may answer one question:",
      "“Have my files been backed up?”",
      "Tornova is designed to answer several more:",
      "“Are my backups healthy?”“Did any backup fail?”“Which user or device needs attention?”“Who is permitted to restore company data?”“Can I centrally control backups across my Organization?”",
      "For business customers, Tornova introduces an Organization → Team → User → Device structure rather than treating every computer as an isolated backup.",
      "For Personal customers, the same philosophy is simplified into an easy personal backup and health experience.",
      "The customer value is not storage alone—it is visibility, control, protection, and recoverability."
    ]
  },
  {
    "id": "does-tornova-provide-backup-health-monitoring",
    "category": "getting-started",
    "question": "Does Tornova provide Backup Health monitoring?",
    "answer": [
      "Yes. Backup Health is a core Tornova concept for both Personal and Business customers.",
      "Instead of expecting customers to assume that everything is fine, Tornova is designed to surface backup health and problems that require attention.",
      "For a business, health information can be viewed at the appropriate Organization or Team scope. Personal customers receive health information relevant to their own backup environment."
    ]
  },
  {
    "id": "what-can-i-do-from-the-tornova-web-dashboard",
    "category": "getting-started",
    "question": "What can I do from the Tornova Web Dashboard?",
    "answer": [
      "The Web Dashboard is the management and visibility layer for Tornova.",
      "Depending on account type and permission, it is designed to support account/Organization administration, backup configuration, Backup Health visibility, relevant controls and suitable small-file restore scenarios.",
      "Actual Windows-device backup execution remains the responsibility of the Tornova Agent."
    ]
  },
  {
    "id": "why-do-i-need-the-windows-agent",
    "category": "getting-started",
    "question": "Why do I need the Windows Agent?",
    "answer": [
      "A website cannot independently read arbitrary files from your Windows computer in the background.",
      "The Tornova Agent provides the secure device-side component that identifies selected backup content, communicates with Tornova services and executes scheduled/background backup.",
      "For bulk/full recovery—and all CSE recovery—the Agent also provides the appropriate restore path."
    ]
  },
  {
    "id": "how-do-customers-obtain-the-agent",
    "category": "getting-started",
    "question": "How do customers obtain the Agent?",
    "answer": [
      "The Windows Agent is packaged and code-signed as an installer and made available through Tornova's website.",
      "Customers download and install it on their own Windows PCs.",
      "There is no physical “shipping” of backup software."
    ]
  },
  {
    "id": "can-tornova-perform-a-backup-if-the-windows-agent-is-not-installed",
    "category": "getting-started",
    "question": "Can Tornova perform a backup if the Windows Agent is not installed?",
    "answer": [
      "No.",
      "Tornova does not claim to provide web-only backup of files sitting on a Windows PC.",
      "The Windows Agent performs the actual device-side backup work. The Web application is used for management, visibility, configuration and supported restore scenarios."
    ]
  },
  {
    "id": "why-should-i-trust-a-new-backup-company-with-important-data",
    "category": "getting-started",
    "question": "Why should I trust a new backup company with important data?",
    "answer": [
      "Customers should not make that decision based only on a slogan.",
      "They should examine where the data is stored, how access is controlled, what happens when something fails, how restore is protected, what deletion safeguards exist and whether the provider is transparent about limitations.",
      "Tornova is being built around Microsoft Azure infrastructure, defined Account and Device boundaries, encryption, MFA capability, Restore Locks, controlled storage access, Backup Health, lifecycle safeguards and recoverability.",
      "Just as importantly, Tornova does not intend to turn future features or unrealistic “zero-risk” promises into marketing claims.",
      "Trust should be earned through architecture, transparency and demonstrated product performance."
    ]
  },
  {
    "id": "what-if-something-goes-wrong-even-though-i-have-a-backup",
    "category": "getting-started",
    "question": "What if something goes wrong even though I have a backup?",
    "answer": [
      "That is exactly why Tornova is designed around more than storage.",
      "Depending on the situation, Tornova's protection and recovery model can involve Backup Health, previous versions, Trash, restore controls, previous-device visibility, diagnostics and Organization-level controls.",
      "A backup system becomes valuable when customers can identify problems and recover from them—not merely when it reports that storage has been consumed."
    ]
  },
  {
    "id": "why-should-i-try-tornova-rather-than-simply-judge-it-from-a-feature-li",
    "category": "getting-started",
    "question": "Why should I try Tornova rather than simply judge it from a feature list?",
    "answer": [
      "Backup is ultimately a product that should prove itself in use.",
      "Customers should evaluate the installation experience, backup workflow, health visibility, management experience, security controls and—most importantly—the recovery experience.",
      "That is also why Tornova has chosen a small, clearly priced, non-auto-renewing paid trial: customers can experience the product before deciding whether it deserves a larger role in protecting their data.",
      "Our Philosophy",
      "Tornova's philosophy can be summarized in five words:",
      "Protect. Monitor. Control. Recover. Improve.",
      "We want Personal customers to understand the health of their backups.",
      "We want Team Admins to understand the protection status of their Teams.",
      "We want Organization Admins to have meaningful centralized visibility and control.",
      "We want recovery to be protected rather than casually exposed.",
      "And we want the customers who support Tornova from its earliest days—the Tornova Pioneer Customers—to have a meaningful place in Tornova's long-term journey.",
      "Tornova Backup",
      "Powerful Backup. Peace of Mind."
    ]
  },
  {
    "id": "can-i-choose-which-files-and-folders-to-back-up",
    "category": "personal",
    "question": "Can I choose which files and folders to back up?",
    "answer": [
      "Yes. You choose exactly what Tornova protects: individual files, folders or whole drives. You are never required to back up an entire device."
    ]
  },
  {
    "id": "what-can-i-back-up",
    "category": "personal",
    "question": "What can I back up?",
    "answer": [
      "Tornova Backup Sets are designed to support:",
      "Drives, folders and individual files.",
      "Backup configuration can be synchronized between the Web experience and Windows Agent, while manual path selection is also supported."
    ]
  },
  {
    "id": "how-many-devices-can-i-protect-with-a-personal-plan",
    "category": "personal",
    "question": "How many devices can I protect with a Personal plan?",
    "answer": [
      "Personal currently allows unlimited Windows devices. Your plan is defined by the backup storage you choose, not by a device count."
    ]
  },
  {
    "id": "do-personal-customers-receive-backup-health-too",
    "category": "personal",
    "question": "Do Personal customers receive Backup Health too?",
    "answer": [
      "Yes.",
      "Backup Health is not reserved only for large Organizations. Personal customers are intended to receive a simpler health experience appropriate to their own devices and backups."
    ]
  },
  {
    "id": "i-run-a-business-can-i-monitor-backup-protection-across-my-employees-a",
    "category": "organizations",
    "question": "I run a business. Can I monitor backup protection across my employees and teams?",
    "answer": [
      "Yes. Organization Admins can centrally view users, Teams, devices, Backup Health, storage usage, and relevant backup activity across the Organization.",
      "Team Admins receive visibility and controls limited to their assigned Team(s)."
    ]
  },
  {
    "id": "what-is-a-tornova-organization",
    "category": "organizations",
    "question": "What is a Tornova Organization?",
    "answer": [
      "An Organization is the main ownership and administration boundary for a Tornova Business account.",
      "It brings users, Teams, devices, subscription capacity, quota and administrative controls together under one Organization.",
      "This gives businesses a centralized way to manage backup rather than treating every employee's computer as a completely separate environment."
    ]
  },
  {
    "id": "why-is-the-organization-model-valuable-to-a-business",
    "category": "organizations",
    "question": "Why is the Organization model valuable to a business?",
    "answer": [
      "Imagine a company with 50 computers.",
      "Knowing that the company has purchased backup storage is not enough. An administrator needs to know whether those computers are actually being protected and where attention may be required.",
      "Tornova is designed to give the Organization Admin centralized visibility and control, while still allowing responsibilities to be delegated to Teams.",
      "That turns backup from an individual-PC activity into a manageable business operation."
    ]
  },
  {
    "id": "can-i-create-separate-teams-within-my-organization",
    "category": "organizations",
    "question": "Can I create separate Teams within my Organization?",
    "answer": [
      "Yes.",
      "Teams are optional and can represent departments or groups such as:",
      "Accounts, Sales, Development, Operations or Management.",
      "An Organization Admin has Organization-wide authority, while a Team Admin operates within the scope of their Team."
    ]
  },
  {
    "id": "can-a-team-admin-manage-another-team",
    "category": "organizations",
    "question": "Can a Team Admin manage another Team?",
    "answer": [
      "No. Team Admin authority is scoped to the Team they administer.",
      "An Organization Admin retains Organization-wide visibility and control.",
      "This separation is intentional and forms part of Tornova's authorization model."
    ]
  },
  {
    "id": "can-an-organization-admin-identify-backup-problems-across-the-company",
    "category": "organizations",
    "question": "Can an Organization Admin identify backup problems across the company?",
    "answer": [
      "That is one of the principal purposes of Organization Backup Health.",
      "The design supports visibility through the Organization structure so an administrator can identify where a backup problem exists rather than checking computers individually.",
      "This is especially valuable as the number of users and devices grows."
    ]
  },
  {
    "id": "does-a-team-admin-have-their-own-health-view",
    "category": "organizations",
    "question": "Does a Team Admin have their own health view?",
    "answer": [
      "Yes. A Team Admin's view is intended to be scoped to the Team they administer.",
      "This allows responsibility to be distributed without giving every Team Admin Organization-wide authority."
    ]
  },
  {
    "id": "why-should-a-business-choose-centralized-backup-management-instead-of-",
    "category": "organizations",
    "question": "Why should a business choose centralized backup management instead of backing up every PC separately?",
    "answer": [
      "As an Organization grows, individually managed PCs become harder to monitor consistently.",
      "Centralized Organization and Team structures make it possible to delegate responsibility while retaining appropriate visibility and control.",
      "For a business, that can mean moving from:",
      "“We think everybody is backed up.”",
      "to a much more useful question:",
      "“Show me the health of our backup environment and where attention is required.”",
      "That is a central part of Tornova's Organization philosophy."
    ]
  },
  {
    "id": "what-is-automatic-backup",
    "category": "backup-automation",
    "question": "What is Automatic Backup?",
    "answer": [
      "Automatic Backup runs your selected backup set automatically at the schedule you choose.",
      "The schedule is managed from your Tornova account and carried out by the Windows Agent on your device, using that device's local time zone."
    ]
  },
  {
    "id": "who-controls-the-backup-schedule",
    "category": "backup-automation",
    "question": "Who controls the backup schedule?",
    "answer": [
      "The cloud owns the schedule configuration and the Tornova Agent executes it on the customer's device.",
      "Tornova also captures the device's local timezone so schedules can be interpreted appropriately for that device."
    ]
  },
  {
    "id": "does-signing-out-of-the-tornova-agent-stop-scheduled-backup",
    "category": "backup-automation",
    "question": "Does signing out of the Tornova Agent stop scheduled backup?",
    "answer": [
      "No.",
      "Signing out of the interactive Agent UI clears the user's interactive session, but it does not remove the registered device credentials.",
      "Therefore, scheduled/background backup can continue.",
      "When the customer signs into the Agent UI again, username and password are required, and the existing registered device is reused rather than creating a new device unnecessarily."
    ]
  },
  {
    "id": "how-does-tornova-handle-large-backup-files",
    "category": "backup-automation",
    "question": "How does Tornova handle large backup files?",
    "answer": [
      "Tornova's backup architecture uses chunking rather than assuming every large file should be transferred as one enormous object.",
      "The default chunk size is 100 MB, with adaptive 64 MB and 32 MB options in the locked design.",
      "This provides a technical foundation for efficient backup transfer handling."
    ]
  },
  {
    "id": "how-fast-will-my-backup-be",
    "category": "backup-automation",
    "question": "How fast will my backup be?",
    "answer": [
      "Actual backup speed depends on factors such as the customer's internet connection, file sizes, device performance and workload.",
      "Tornova therefore should not promise an artificial fixed Mbps figure.",
      "The platform is being engineered around chunked transfers and cloud-based storage, but real-world performance should be evaluated under the customer's actual environment."
    ]
  },
  {
    "id": "what-is-smart-backup",
    "category": "smart",
    "question": "What is Smart Backup?",
    "answer": [
      "Smart Backup detects new and changed files within your selected backup set and protects them efficiently, so files that have not changed are not uploaded again.",
      "Smart Backup is not a schedule. Running your backup at a chosen time is a separate feature called Automatic Backup."
    ]
  },
  {
    "id": "what-is-smart-cleanup",
    "category": "smart",
    "question": "What is Smart Cleanup?",
    "answer": [
      "Smart Cleanup helps identify files that have been deleted from the local computer but still have backup copies in Tornova cloud storage.",
      "Crucially, Tornova does not simply delete those cloud copies without the customer's involvement.",
      "Smart Cleanup presents the relevant items for review and requires explicit customer confirmation before they enter the normal deletion lifecycle."
    ]
  },
  {
    "id": "if-i-accidentally-delete-a-file-from-my-computer-will-smart-cleanup-im",
    "category": "smart",
    "question": "If I accidentally delete a file from my computer, will Smart Cleanup immediately delete the cloud copy too?",
    "answer": [
      "No.",
      "That would defeat an important purpose of backup.",
      "Smart Cleanup is optional and user-controlled. It identifies eligible cloud backups, presents them for review and requires explicit confirmation.",
      "This helps protect customers from turning a local mistake into an immediate cloud deletion."
    ]
  },
  {
    "id": "does-tornova-support-file-versions",
    "category": "smart",
    "question": "Does Tornova support file versions?",
    "answer": [
      "Yes. Versioning is optional and OFF by default.",
      "Customers can choose to retain:",
      "3, 10 or 50 versions.",
      "Stored versions consume backup quota."
    ]
  },
  {
    "id": "why-is-versioning-useful",
    "category": "smart",
    "question": "Why is versioning useful?",
    "answer": [
      "Suppose an important document is changed incorrectly rather than deleted.",
      "Having only the latest copy may not solve the problem.",
      "Versioning can provide earlier retained versions, subject to the customer's configured version policy."
    ]
  },
  {
    "id": "what-happens-when-backup-data-is-deleted",
    "category": "smart",
    "question": "What happens when backup data is deleted?",
    "answer": [
      "Tornova uses a 1-day Trash retention period for the applicable backup deletion lifecycle.",
      "This provides a short safety window before permanent deletion.",
      "Physical blob deletion also follows reference-count safety checks so shared references within the supported deduplication scope are not blindly removed."
    ]
  },
  {
    "id": "how-do-i-restore-my-files",
    "category": "restore",
    "question": "How do I restore my files?",
    "answer": [
      "Tornova uses a Hybrid Restore model.",
      "The Web experience is intended for suitable smaller-file restore scenarios using controlled, short-lived access.",
      "For bulk or full recovery, the Tornova Windows Agent is the appropriate restore path.",
      "CSE accounts use Agent-only restore/download."
    ]
  },
  {
    "id": "can-i-restore-my-files-from-another-device",
    "category": "restore",
    "question": "Can I restore my files from another device?",
    "answer": [
      "Yes. Backups from your current, previous, replaced or lost devices remain available for restore, subject to your restore permissions.",
      "Smaller selections can be restored through the web where supported; bulk and full restores use the Tornova Windows Agent."
    ]
  },
  {
    "id": "does-my-plan-include-restore-capacity",
    "category": "restore",
    "question": "Does my plan include restore capacity?",
    "answer": [
      "Yes. Tornova includes a Restore allowance equal to the Backup storage capacity of the selected plan.",
      "Example: 100 GB Backup + 100 GB Restore Included."
    ]
  },
  {
    "id": "what-happens-if-i-use-all-of-my-included-restore-allowance",
    "category": "restore",
    "question": "What happens if I use all of my included Restore allowance?",
    "answer": [
      "Additional Restore capacity can be obtained from within the Tornova customer account when required. Additional Restore packages are not shown as separate products on the public pricing page."
    ]
  },
  {
    "id": "why-doesn-t-tornova-simply-allow-every-restore-directly-through-the-br",
    "category": "restore",
    "question": "Why doesn't Tornova simply allow every restore directly through the browser?",
    "answer": [
      "Convenience is only one consideration.",
      "Large-scale recovery and stronger security models can benefit from the installed Agent, while small-file Web restore remains useful for appropriate Standard Secure Account scenarios.",
      "This hybrid approach allows Tornova to use the appropriate recovery path for different requirements."
    ]
  },
  {
    "id": "what-is-a-restore-lock",
    "category": "restore",
    "question": "What is a Restore Lock?",
    "answer": [
      "Restore Locks give customers—particularly Organizations—additional control over recovery.",
      "Business accounts default to Restore Lock ON, while Personal accounts default to Restore Lock OFF.",
      "Organization-level and applicable Team/user authorization controls can restrict restoration even when backup data exists."
    ]
  },
  {
    "id": "what-happens-if-a-team-restore-lock-is-enabled",
    "category": "restore",
    "question": "What happens if a Team Restore Lock is enabled?",
    "answer": [
      "The Restore Lock applies to relevant members of that Team, not merely to the Team Admin.",
      "This means an Organization can use Team-level restore control as a genuine security boundary rather than just an administrative setting."
    ]
  },
  {
    "id": "what-happens-if-both-my-user-permission-and-organization-settings-are-",
    "category": "restore",
    "question": "What happens if both my user permission and Organization settings are involved?",
    "answer": [
      "Tornova follows a restrictive security model.",
      "Passing one permission does not automatically override another applicable restriction.",
      "For example, an individual Restore permission does not defeat an active Organization Master Restore Lock."
    ]
  },
  {
    "id": "does-restore-require-mfa",
    "category": "restore",
    "question": "Does restore require MFA?",
    "answer": [
      "Where MFA is required by the Tornova restore security flow, the user must satisfy that additional authentication gate before restore is authorized.",
      "This means possession of a logged-in session alone does not automatically guarantee permission to restore protected data."
    ]
  },
  {
    "id": "what-if-my-computer-fails-completely",
    "category": "restore",
    "question": "What if my computer fails completely?",
    "answer": [
      "Your backup is stored in Tornova's cloud infrastructure rather than existing only on that physical PC.",
      "Tornova also retains previous device records according to its device lifecycle and restore model, allowing recovery workflows to be based on backed-up data rather than requiring the original computer to remain operational."
    ]
  },
  {
    "id": "how-secure-is-my-backup",
    "category": "security",
    "question": "How secure is my backup?",
    "answer": [
      "Your data is encrypted in transit (TLS 1.2+) and encrypted at rest in cloud storage. Storage is never publicly or anonymously accessible, and access uses short-lived, controlled authorization.",
      "You can add optional multi-factor authentication (MFA), and choose the optional Client-Side Double-Layer Encryption account type for an additional client-side encryption layer.",
      "Restore is controlled separately from backup, every Windows Agent has its own device credential, and file content is verified with SHA-256."
    ]
  },
  {
    "id": "how-does-tornova-protect-my-data-while-it-is-being-transferred",
    "category": "security",
    "question": "How does Tornova protect my data while it is being transferred?",
    "answer": [
      "Tornova's Standard Secure Account architecture uses TLS 1.2 or later for data in transit.",
      "The architecture also uses server-side encryption at rest, role-based access controls and controlled, short-lived storage access mechanisms."
    ]
  },
  {
    "id": "does-every-windows-agent-share-the-same-password-or-secret",
    "category": "security",
    "question": "Does every Windows Agent share the same password or secret?",
    "answer": [
      "No.",
      "Every registered Tornova Windows Agent uses its own cryptographically random DeviceId and DeviceSecret.",
      "Device authentication is separate from the user's normal interactive login, and server-side mechanisms are designed to allow device credentials to be revoked or rotated."
    ]
  },
  {
    "id": "why-separate-device-authentication-from-my-normal-login",
    "category": "security",
    "question": "Why separate device authentication from my normal login?",
    "answer": [
      "Your scheduled backup should not depend on somebody remaining interactively signed into the Tornova user interface.",
      "The registered device has its own secure identity for background operations, while username/password authentication remains part of the interactive customer experience.",
      "This separation improves both security and reliability."
    ]
  },
  {
    "id": "does-tornova-support-mfa",
    "category": "security",
    "question": "Does Tornova support MFA?",
    "answer": [
      "Yes. Tornova supports optional TOTP-based multi-factor authentication.",
      "MFA forms an additional security gate for sensitive user activity such as authentication and restore.",
      "Importantly, scheduled/background backup does not depend on repeatedly asking a person for an MFA code."
    ]
  },
  {
    "id": "can-somebody-restore-data-simply-because-they-have-permission-to-back-",
    "category": "security",
    "question": "Can somebody restore data simply because they have permission to back it up?",
    "answer": [
      "Not necessarily.",
      "Tornova treats Backup permission and Restore permission as separate controls.",
      "This is particularly important for businesses. A person may need to operate backup without automatically being given unrestricted ability to recover company data."
    ]
  },
  {
    "id": "what-is-a-standard-secure-account",
    "category": "security",
    "question": "What is a Standard Secure Account?",
    "answer": [
      "A Standard Secure Account uses Tornova's managed security architecture, including encrypted transport, encryption at rest, access controls, short-lived storage access and auditing mechanisms.",
      "It is intended to provide strong protection while retaining a practical managed backup and restore experience."
    ]
  },
  {
    "id": "what-is-client-side-double-layer-encryption",
    "category": "security",
    "question": "What is Client-Side Double-Layer Encryption?",
    "answer": [
      "Tornova also provides a Client-Side Double-Layer Encryption (CSE) account option.",
      "With CSE, an additional encryption layer is applied on the client side.",
      "Because this fundamentally changes how recovery works, CSE is a permanent account choice. A CSE account cannot later be converted into a Standard Secure Account; moving to Standard would require a new account.",
      "For security reasons, CSE download/restore is performed through the Tornova Agent rather than ordinary Web restore."
    ]
  },
  {
    "id": "can-i-switch-from-cse-to-standard-later-if-i-change-my-mind",
    "category": "security",
    "question": "Can I switch from CSE to Standard later if I change my mind?",
    "answer": [
      "No.",
      "This is deliberately treated as a permanent security decision rather than silently weakening the security model later.",
      "Customers should therefore choose the appropriate account type carefully when creating the account."
    ]
  },
  {
    "id": "does-tornova-use-content-hashing",
    "category": "security",
    "question": "Does Tornova use content hashing?",
    "answer": [
      "Yes. Tornova's locked content-addressing design uses SHA-256.",
      "The SHA-256 content hash forms part of the immutable identity of backed-up content.",
      "For customers, this is one of the technical mechanisms Tornova uses to consistently identify backup content."
    ]
  },
  {
    "id": "what-if-my-organization-suspects-a-security-incident",
    "category": "security",
    "question": "What if my Organization suspects a security incident?",
    "answer": [
      "Tornova includes an Organization-level Emergency Stop design.",
      "Agents check the emergency state approximately every 60 seconds, and storage access uses short-lived SAS access with a designed lifetime of 15 minutes.",
      "Resume is manual rather than automatically assuming the incident has disappeared.",
      "This gives the Organization an additional response mechanism when something serious requires backup operations to be stopped."
    ]
  },
  {
    "id": "what-if-someone-tries-to-access-another-customer-s-account",
    "category": "security",
    "question": "What if someone tries to access another customer's Account?",
    "answer": [
      "Tornova's architecture treats Account ownership boundaries as security boundaries.",
      "Devices and backup resources are associated with their owning Account, and authorization checks require the active Account to match the requested Account.",
      "The database design also incorporates structural ownership relationships intended to prevent cross-account combinations rather than relying solely on UI behaviour."
    ]
  },
  {
    "id": "what-if-a-team-admin-tries-to-control-another-team",
    "category": "security",
    "question": "What if a Team Admin tries to control another Team?",
    "answer": [
      "The request should be denied.",
      "Team Admin permissions are scoped to their own Team. Organization-wide control belongs to the Organization Admin."
    ]
  },
  {
    "id": "what-if-tornova-cannot-determine-whether-a-request-should-be-allowed",
    "category": "security",
    "question": "What if Tornova cannot determine whether a request should be allowed?",
    "answer": [
      "Sensitive authorization is designed to fail closed.",
      "In simple terms:",
      "If the system cannot establish that access should be permitted, it should deny access rather than guess.",
      "That is an important security principle in Tornova's authorization design."
    ]
  },
  {
    "id": "what-if-somebody-obtains-my-normal-login-but-cannot-complete-mfa",
    "category": "security",
    "question": "What if somebody obtains my normal login but cannot complete MFA?",
    "answer": [
      "For operations protected by MFA, possession of the password alone should not satisfy the additional MFA requirement.",
      "This is why Tornova treats MFA state as part of the authenticated session rather than merely displaying an MFA screen as a cosmetic step."
    ]
  },
  {
    "id": "what-happens-if-i-uninstall-tornova-agent",
    "category": "agent-devices",
    "question": "What happens if I uninstall Tornova Agent?",
    "answer": [
      "Uninstalling the Agent removes the local application.",
      "It does not, by itself, mean that Tornova should immediately erase the server-side device record or its backed-up data.",
      "Device unregistering and data deletion are separate lifecycle actions."
    ]
  },
  {
    "id": "what-if-i-unregister-a-device",
    "category": "agent-devices",
    "question": "What if I unregister a device?",
    "answer": [
      "Tornova distinguishes between:",
      "Unregister only, andUnregister + delete.",
      "Where device data is being removed, Tornova's locked device-removal lifecycle includes a 3-day grace period before permanent deletion.",
      "This separation helps prevent a simple device-management action from unexpectedly becoming immediate permanent data destruction."
    ]
  },
  {
    "id": "what-if-i-accidentally-request-account-deletion",
    "category": "agent-devices",
    "question": "What if I accidentally request account deletion?",
    "answer": [
      "Account deletion has a 3-day grace period before permanent deletion under the locked lifecycle.",
      "This gives Tornova a defined safety interval rather than treating an account-deletion request as instantaneous irreversible destruction."
    ]
  },
  {
    "id": "does-tornova-keep-unlimited-diagnostic-files-on-my-computer",
    "category": "agent-devices",
    "question": "Does Tornova keep unlimited diagnostic files on my computer?",
    "answer": [
      "No.",
      "Tornova's local diagnostic design uses controlled size and retention limits under its local application-data area.",
      "Logs, traces and other managed diagnostic information are rotated, with older eligible diagnostic copies removed when configured retention/size limits are reached.",
      "Active configuration is protected from being treated like disposable diagnostic history."
    ]
  },
  {
    "id": "why-does-tornova-keep-diagnostic-information-locally",
    "category": "agent-devices",
    "question": "Why does Tornova keep diagnostic information locally?",
    "answer": [
      "Diagnostics can help support identify why a backup or Agent operation encountered a problem.",
      "The objective is to retain enough useful technical information for troubleshooting without allowing diagnostic storage to grow without limits."
    ]
  },
  {
    "id": "how-do-tornova-plans-work-are-there-basic-plus-or-pro-tiers",
    "category": "pricing",
    "question": "How do Tornova plans work? Are there Basic, Plus or Pro tiers?",
    "answer": [
      "Tornova does not use Basic / Plus / Pro tiers. You choose your backup storage - 5 GB, 10 GB, 50 GB or 100 GB - and then choose a duration. Need more than 100 GB? Contact Tornova for a custom storage plan.",
      "Monthly is always available. Longer durations are optional."
    ]
  },
  {
    "id": "do-tornova-plans-require-an-annual-commitment",
    "category": "pricing",
    "question": "Do Tornova plans require an annual commitment?",
    "answer": [
      "No. Cloud backup starts at $2.49/month with the freedom of monthly payments. No annual commitment.",
      "Monthly is always available; 3-month, 6-month and 1-year durations are optional."
    ]
  },
  {
    "id": "how-does-organization-pricing-work",
    "category": "pricing",
    "question": "How does Organization pricing work?",
    "answer": [
      "Organization pricing is based on storage per user, number of users and duration, with an applicable volume discount applied automatically.",
      "Discounts: 1-10 users 0%, 11-20 users 3%, 21-50 users 7%, 51-100 users 12%, 101+ users 18%. Strategic or large deployments receive a custom offer."
    ]
  },
  {
    "id": "can-i-try-tornova-before-committing-to-a-larger-plan",
    "category": "pricing",
    "question": "Can I try Tornova before committing to a larger plan?",
    "answer": [
      "Yes. Tornova offers two low-cost paid trials: 500 MB for 3 days at $0.69, and 1 GB for 5 days at $1.49.",
      "Trials do not renew automatically. There is no annual commitment, and you upgrade only when you choose.",
      "The purpose is to let you experience the product with a small, clearly defined commitment before choosing a larger plan."
    ]
  },
  {
    "id": "what-currency-does-tornovabackup-com-use",
    "category": "pricing",
    "question": "What currency does TornovaBackup.com use?",
    "answer": [
      "TornovaBackup.com displays prices in US dollars (USD).",
      "Changing the website language does not change the displayed currency."
    ]
  },
  {
    "id": "is-storage-quota-tied-to-one-computer",
    "category": "pricing",
    "question": "Is storage quota tied to one computer?",
    "answer": [
      "No.",
      "Quota is scoped to the appropriate Account/Organization subscription, not independently locked to each device.",
      "For Business customers, the model supports shared Organization capacity or per-user limits.",
      "Personal customers use the available quota of their plan."
    ]
  },
  {
    "id": "what-happens-as-i-approach-my-storage-limit",
    "category": "pricing",
    "question": "What happens as I approach my storage limit?",
    "answer": [
      "Tornova's locked notification design includes quota warnings at 90% and 95%.",
      "This gives customers advance visibility before capacity becomes a problem."
    ]
  },
  {
    "id": "what-happens-if-my-payment-fails",
    "category": "pricing",
    "question": "What happens if my payment fails?",
    "answer": [
      "Tornova's subscription policy provides a 7-day payment-failure grace period.",
      "During the grace period, backup may continue where quota remains available.",
      "If payment is still unresolved after the grace period, new backup is blocked. Existing backup data is retained for restore according to Tornova's defined retention/lifecycle policy rather than being immediately erased simply because a payment attempt failed."
    ]
  },
  {
    "id": "what-happens-if-my-internet-connection-is-interrupted-during-backup",
    "category": "reliability",
    "question": "What happens if my internet connection is interrupted during backup?",
    "answer": [
      "Tornova safely interrupts the affected backup and continues through its controlled retry process. Files already safely protected remain protected.",
      "Tornova never reports the complete backup as successful while required files remain unfinished."
    ]
  },
  {
    "id": "what-happens-if-there-is-no-internet-connection-when-i-start-a-backup",
    "category": "reliability",
    "question": "What happens if there is no internet connection when I start a backup?",
    "answer": [
      "Tornova displays Not Connected and does not report the backup as successful. It makes up to 10 controlled automatic retry attempts. If connectivity is still unavailable, Tornova reports the connection failure and provides Retry Now."
    ]
  },
  {
    "id": "how-can-i-know-whether-tornova-is-connected-to-the-cloud",
    "category": "reliability",
    "question": "How can I know whether Tornova is connected to the cloud?",
    "answer": [
      "The Tornova Agent displays a clear Connected / Not Connected status so you can quickly see whether cloud connectivity is available."
    ]
  },
  {
    "id": "what-happens-if-my-internet-connection-drops-while-a-backup-is-running",
    "category": "reliability",
    "question": "What happens if my internet connection drops while a backup is running?",
    "answer": [
      "Tornova safely interrupts the affected backup and attempts to continue through its controlled retry process. Files already safely protected remain protected. Tornova never reports the complete backup as successful while required files remain unfinished."
    ]
  },
  {
    "id": "what-does-partially-completed-mean",
    "category": "reliability",
    "question": "What does “Partially Completed” mean?",
    "answer": [
      "Partially Completed means some files were successfully protected, but one or more intended files could not be completed. Tornova shows the protected and unresolved files rather than incorrectly reporting the entire backup as successful."
    ]
  },
  {
    "id": "if-80-or-99-of-my-files-are-backed-up-will-tornova-show-the-backup-as-",
    "category": "reliability",
    "question": "If 80% or 99% of my files are backed up, will Tornova show the backup as successful?",
    "answer": [
      "No. Tornova reports Backup Successful only when the complete intended backup has safely completed and committed. An incomplete backup is reported as Partially Completed or Failed, as appropriate."
    ]
  },
  {
    "id": "what-happens-if-my-pc-shuts-down-restarts-or-tornova-closes-during-a-b",
    "category": "reliability",
    "question": "What happens if my PC shuts down, restarts, or Tornova closes during a backup?",
    "answer": [
      "Tornova treats the backup as interrupted and safely recovers or retries the unfinished work when possible. An interrupted backup is never falsely reported as successful."
    ]
  },
  {
    "id": "what-happens-if-my-computer-goes-to-sleep-or-hibernates-during-a-backu",
    "category": "reliability",
    "question": "What happens if my computer goes to sleep or hibernates during a backup?",
    "answer": [
      "Tornova treats this as an interruption, not as a deletion or completed backup. Backup processing can safely continue or retry after the computer becomes available again."
    ]
  },
  {
    "id": "what-happens-if-an-external-drive-folder-or-backup-source-becomes-temp",
    "category": "reliability",
    "question": "What happens if an external drive, folder, or backup source becomes temporarily unavailable?",
    "answer": [
      "Tornova does not interpret temporary unavailability as a request to delete your cloud backups. Existing valid backups remain protected, and Tornova reports the unavailable source."
    ]
  },
  {
    "id": "what-happens-if-a-selected-file-is-deleted-or-disappears-while-a-backu",
    "category": "reliability",
    "question": "What happens if a selected file is deleted or disappears while a backup is running?",
    "answer": [
      "Tornova reports or skips the affected file appropriately and continues processing other eligible files. It does not automatically delete the previously protected cloud copy."
    ]
  },
  {
    "id": "what-happens-if-tornova-cannot-access-a-file-because-it-is-locked-or-p",
    "category": "reliability",
    "question": "What happens if Tornova cannot access a file because it is locked or permission is denied?",
    "answer": [
      "Tornova records the affected file as unavailable, skipped, or failed as appropriate and continues backing up other accessible files rather than unnecessarily failing the entire operation."
    ]
  },
  {
    "id": "what-happens-if-a-file-changes-while-tornova-is-backing-it-up",
    "category": "reliability",
    "question": "What happens if a file changes while Tornova is backing it up?",
    "answer": [
      "Tornova must not silently treat an inconsistent copy as successfully protected. It safely retries or reports the affected file if a stable backup cannot be completed."
    ]
  },
  {
    "id": "what-happens-if-my-storage-quota-becomes-full-during-a-backup",
    "category": "reliability",
    "question": "What happens if my storage quota becomes full during a backup?",
    "answer": [
      "Tornova safely stops additional backup work and reports the quota condition. Existing valid backups are not automatically deleted to make space."
    ]
  },
  {
    "id": "what-happens-if-tornova-s-cloud-service-is-temporarily-unavailable",
    "category": "reliability",
    "question": "What happens if Tornova's cloud service is temporarily unavailable?",
    "answer": [
      "Tornova uses controlled retry handling. A temporary cloud/API outage is never interpreted as a successful backup or as an instruction to delete existing backup data."
    ]
  },
  {
    "id": "what-happens-if-my-computer-is-switched-off-or-offline-at-the-schedule",
    "category": "reliability",
    "question": "What happens if my computer is switched off or offline at the scheduled backup time?",
    "answer": [
      "Tornova does not falsely report the missed backup as successful. The delay or missed execution is recorded, and backup processing follows Tornova's next eligible retry/scheduling behavior."
    ]
  },
  {
    "id": "what-happens-if-a-device-is-unregistered-or-its-authorization-is-revok",
    "category": "reliability",
    "question": "What happens if a device is unregistered or its authorization is revoked while a backup is running?",
    "answer": [
      "Tornova safely stops further unauthorized cloud operations. Existing valid backups are preserved unless an authorized customer explicitly chooses the applicable deletion process."
    ]
  },
  {
    "id": "what-happens-if-my-internet-connection-or-computer-fails-during-a-rest",
    "category": "reliability",
    "question": "What happens if my internet connection or computer fails during a restore?",
    "answer": [
      "An incomplete restore is never reported as completed. The cloud backup remains protected, and the affected restore can be safely retried."
    ]
  },
  {
    "id": "what-happens-if-the-restore-destination-has-insufficient-disk-space-or",
    "category": "reliability",
    "question": "What happens if the restore destination has insufficient disk space or becomes unavailable?",
    "answer": [
      "Tornova safely stops the affected restore and clearly reports the problem. The original cloud backup remains untouched."
    ]
  },
  {
    "id": "what-happens-if-a-file-with-the-same-name-already-exists-when-i-restor",
    "category": "reliability",
    "question": "What happens if a file with the same name already exists when I restore it?",
    "answer": [
      "Tornova provides Replace, Keep Both, or Skip options. Keep Both is the default, helping prevent accidental overwriting of an existing local file."
    ]
  },
  {
    "id": "can-a-temporary-problem-cause-tornova-to-delete-my-cloud-backups",
    "category": "reliability",
    "question": "Can a temporary problem cause Tornova to delete my cloud backups?",
    "answer": [
      "No. Tornova follows an important safety principle: temporary failure is not customer deletion intent. Network loss, shutdown, sleep, disconnected drives, inaccessible folders, permission problems, or temporary cloud outages must not by themselves cause existing valid cloud backups to be deleted."
    ]
  },
  {
    "id": "can-retrying-an-interrupted-backup-create-duplicate-backups-or-consume",
    "category": "reliability",
    "question": "Can retrying an interrupted backup create duplicate backups or consume quota twice?",
    "answer": [
      "Tornova's retry and recovery operations are designed to be idempotent: retrying must not unintentionally duplicate catalog entries or versions, double-count quota, corrupt reference counts, or repeat destructive operations."
    ]
  },
  {
    "id": "can-a-failed-new-backup-damage-my-previous-successful-backup",
    "category": "reliability",
    "question": "Can a failed new backup damage my previous successful backup?",
    "answer": [
      "No. A failed, interrupted, or partially completed new backup must never damage or delete the last known-good valid backup."
    ]
  },
  {
    "id": "does-tornova-make-another-full-copy-of-my-files-on-my-pc-when-the-inte",
    "category": "reliability",
    "question": "Does Tornova make another full copy of my files on my PC when the internet is unavailable?",
    "answer": [
      "No. Tornova does not create a large duplicate of your entire backup set merely because the device is offline. Only controlled state needed for safe backup recovery/retry may be retained locally."
    ]
  },
  {
    "id": "what-is-a-tornova-pioneer-customer",
    "category": "pioneer",
    "question": "What is a Tornova Pioneer Customer?",
    "answer": [
      "Customers who purchase a qualifying Tornova plan during the Pioneer launch period can qualify as Tornova Pioneer Customers - including the base plan starting at just $2.49/month.",
      "Pioneer enrollment may close earlier based on business decisions and will remain available for no longer than six months from Tornova's official launch.",
      "The window is based on the official production launch, not the date development or testing began."
    ]
  },
  {
    "id": "do-i-need-to-purchase-a-long-term-plan-to-become-a-pioneer-customer",
    "category": "pioneer",
    "question": "Do I need to purchase a long-term plan to become a Pioneer Customer?",
    "answer": [
      "The Pioneer qualification policy is not restricted only to annual-plan customers.",
      "Customers purchasing qualifying 1-month, 3-month, 6-month or 1-year plans within the six-month Pioneer window can qualify, subject to Tornova's qualification rules."
    ]
  },
  {
    "id": "can-pioneer-enrollment-close-before-six-months",
    "category": "pioneer",
    "question": "Can Pioneer enrollment close before six months?",
    "answer": [
      "Yes. Pioneer enrollment may close earlier based on business decisions and will remain available for no longer than six months from Tornova's official launch."
    ]
  },
  {
    "id": "what-benefits-can-tornova-pioneer-customers-receive",
    "category": "pioneer",
    "question": "What benefits can Tornova Pioneer Customers receive?",
    "answer": [
      "The Pioneer program recognizes customers who support Tornova during its earliest production period.",
      "Eligible benefits include enhanced referral rewards, rewards for valuable suggestions and feedback, special product benefits and offers, and early or exclusive access to selected future features.",
      "Pioneer Customers may also be informed about suitable Tornova career opportunities and encouraged to apply. This is consideration only: all hiring decisions remain based on qualifications, role requirements and Tornova's standard selection process.",
      "Specific benefits depend on Tornova's applicable program and qualification rules."
    ]
  },
  {
    "id": "does-tornova-value-suggestions-from-pioneer-customers",
    "category": "pioneer",
    "question": "Does Tornova value suggestions from Pioneer Customers?",
    "answer": [
      "Yes.",
      "The Pioneer program specifically recognizes that early customers can contribute more than subscription revenue.",
      "Useful suggestions, feedback and real-world experience can help Tornova improve its products, and the locked Pioneer policy allows valuable suggestions/feedback to be recognized and rewarded where selected by Tornova."
    ]
  },
  {
    "id": "what-happens-to-a-pioneer-customer-after-five-years",
    "category": "pioneer",
    "question": "What happens to a Pioneer Customer after five years?",
    "answer": [
      "This is an important part of Tornova's long-term customer philosophy.",
      "A Pioneer Customer who maintains the required qualifying Tornova customer relationship for five years becomes eligible for recognition under Tornova Family status, subject to Tornova's qualification requirements.",
      "The five-year requirement is deliberate: Tornova Family recognition is intended to represent a meaningful long-term relationship, not simply an early purchase."
    ]
  },
  {
    "id": "why-is-tornova-creating-a-pioneer-program",
    "category": "pioneer",
    "question": "Why is Tornova creating a Pioneer program?",
    "answer": [
      "Because Tornova wants its earliest customers to be more than order numbers.",
      "Customers who trust a new product early, provide useful feedback, refer others and continue with Tornova over time can contribute directly to the company's growth.",
      "The Pioneer program creates a structured way to recognize that relationship."
    ]
  },
  {
    "id": "does-tornova-have-a-referral-program",
    "category": "pioneer",
    "question": "Does Tornova have a referral program?",
    "answer": [
      "Yes. Referral rewards apply to both Personal and Organization purchases, and Pioneer Customers may receive enhanced referral rewards.",
      "A referral is recognised through a referral code together with the verified email address of the person who referred you.",
      "A reward becomes eligible only after a successful, confirmed payment and the applicable refund and review period. See the Referral Program page for the reward table."
    ]
  },
  {
    "id": "can-i-refer-myself-to-receive-a-reward",
    "category": "pioneer",
    "question": "Can I refer myself to receive a reward?",
    "answer": [
      "No.",
      "Self-referrals are not eligible for a reward."
    ]
  },
  {
    "id": "where-is-my-backup-data-stored",
    "category": "infrastructure",
    "question": "Where is my backup data stored?",
    "answer": [
      "Tornova's primary production infrastructure is hosted in the United States using Microsoft Azure. Tornova is accessible to customers worldwide.",
      "Backup storage is built on Azure Blob Storage with Zone-Redundant Storage (ZRS), a foundation designed for durability and resilience.",
      "Hosted in the US. Accessible Worldwide."
    ]
  },
  {
    "id": "why-does-tornova-use-microsoft-azure",
    "category": "infrastructure",
    "question": "Why does Tornova use Microsoft Azure?",
    "answer": [
      "Tornova does not rely on an office computer or a single privately managed server to act as its cloud.",
      "Microsoft Azure provides global-scale cloud infrastructure, security capabilities, redundancy options and the ability for Tornova's infrastructure to grow as customer demand increases.",
      "Tornova then adds its own application-level controls—including authentication, authorization, backup permissions, restore controls, device credentials and data-lifecycle safeguards—on top of that cloud infrastructure."
    ]
  },
  {
    "id": "does-using-azure-mean-my-data-can-never-be-lost",
    "category": "infrastructure",
    "question": "Does using Azure mean my data can never be lost?",
    "answer": [
      "No responsible backup provider should promise that any technology has absolutely zero risk.",
      "Tornova instead uses multiple layers of protection.",
      "Its architecture combines Azure storage capabilities and ZRS with encryption, controlled access, short-lived access mechanisms, content identification, lifecycle controls, Trash, versioning options and Tornova's own authorization and restore safeguards.",
      "Our approach is to reduce risk through layers rather than make an unrealistic “nothing can ever happen” promise."
    ]
  },
  {
    "id": "what-does-zrs-mean-for-my-backup",
    "category": "infrastructure",
    "question": "What does ZRS mean for my backup?",
    "answer": [
      "Zone-Redundant Storage is an Azure redundancy option designed to maintain data across separate availability zones within the selected Azure region.",
      "For Tornova, it adds infrastructure-level resilience beneath the application's own backup and recovery controls."
    ]
  },
  {
    "id": "does-tornova-use-deduplication",
    "category": "infrastructure",
    "question": "Does Tornova use deduplication?",
    "answer": [
      "Yes, within the locked MVP scope.",
      "Phase 1 deduplication is device-scoped.",
      "Tornova also uses reference-count checks before physical blob deletion so content still referenced within the supported model is not intentionally deleted merely because one logical reference disappears.",
      "Cross-device deduplication is a future capability, not a Phase 1 claim."
    ]
  },
  {
    "id": "is-tornova-only-for-windows-forever",
    "category": "infrastructure",
    "question": "Is Tornova only for Windows forever?",
    "answer": [
      "No. Windows is the MVP platform.",
      "macOS and Linux are future platform extensions.",
      "Tornova is intentionally launching with a focused Windows Agent rather than claiming support for platforms that have not yet been delivered."
    ],
    "future": true
  },
  {
    "id": "does-tornova-use-ai-to-diagnose-backup-problems",
    "category": "infrastructure",
    "question": "Does Tornova use AI to diagnose backup problems?",
    "answer": [
      "The initial Backup Health capability is non-AI.",
      "Advanced AI Diagnostics is planned for Phase 2.",
      "We deliberately distinguish current capabilities from future capabilities rather than advertising a future feature as though it were already available."
    ],
    "future": true
  },
  {
    "id": "what-other-capabilities-are-planned-for-later-phases",
    "category": "infrastructure",
    "question": "What other capabilities are planned for later phases?",
    "answer": [
      "The architecture has extension paths for capabilities such as VSS support, advanced anomaly/ransomware detection, AI Diagnostics, cross-device deduplication, additional platforms and broader scalability features.",
      "Their inclusion in the architecture does not mean they are already available in the launch version."
    ],
    "future": true
  }
];

/** The seven questions shown (questions only) on the Home page, in the locked order. */
export const HOME_FAQ_IDS: string[] = [
  "how-does-tornova-back-up-my-files",
  "can-i-choose-which-files-and-folders-to-back-up",
  "i-run-a-business-can-i-monitor-backup-protection-across-my-employees-a",
  "how-secure-is-my-backup",
  "can-i-restore-my-files-from-another-device",
  "do-tornova-plans-require-an-annual-commitment",
  "what-happens-if-my-internet-connection-is-interrupted-during-backup"
];
