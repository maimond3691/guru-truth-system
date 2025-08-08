---
"phaseState": {
  "phase": "phase-1",
  "status": "awaiting_approval",
  "params": {
    "sources": [
      {
        "type": "github",
        "org": "peak-watch",
        "repos": [
          "stylegan2-pytorch",
          "dashboard"
        ],
        "branches": [
          "main"
        ],
        "sinceDate": "2025-08-01"
      }
    ]
  },
  "artifacts": [
    {
      "id": "57da6b1c-769e-4430-be19-c23e45f99716",
      "kind": "text",
      "title": "Raw Context — Github — 2025-08-01..NOW",
      "github": {
        "repo": "maimond3691/guru-truth-system",
        "branch": "main",
        "path": "docs/raw-context/github/raw-context-Github-20250801-to-NOW.md"
      }
    }
  ],
  "lastUpdatedAt": "2025-08-08T20:22:11.878Z"
}
---

# Raw Context – Consolidated Changes

Generated: 2025-08-08T20:22:11.844Z
Change Period: since 2025-08-01
Selected Sources:
- Github (organization): peak-watch; repos: [stylegan2-pytorch, dashboard]; branches: [main]; since: 2025-08-01

---

## Executive Summary
- Total Changes Analyzed: 1
- Primary Themes: dashboard, monitoring, main-source
- Affected Workflows: Based on the path structure showing a dashboard main component and source directory, here are 5 likely affected workflows:

Dashboard rendering, Data visualization, UI components, Frontend build, Monitoring display

---

## Changes by Source

### peak-watch/dashboard (main) (Github)
- Change Window: since 2025-08-01
- Summary:
  - Added: 0 | Modified: 1 | Deleted: 0 | Renamed: 0

#### Evidence
- [peak-watch/dashboard:main:c53142ba4cb5558257f14c12de7a178122bed61e:src/components/TrialExpiredModal.tsx] MODIFIED — src/components/TrialExpiredModal.tsx @ 2025-08-04T16:56:51Z

```diff
--- a/src/components/TrialExpiredModal.tsx
+++ b/src/components/TrialExpiredModal.tsx
@@ FULL FILE DIFF @@
'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';

interface TrialExpiredModalProps {
  isVisible: boolean;
  error?: string | null;
}

export default function TrialExpiredModal({ isVisible, error }: TrialExpiredModalProps) {
  if (!isVisible) return null;

  const handleContactUs = () => {
    // Redirect to contact page
    window.open('https://www.peak.watch/contact', '_blank');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Show different content based on error type
  const isVerificationError = error && (
    error.includes('verification') || 
    error.includes('Authentication') || 
    error.includes('Unable to verify')
  );

  return (
    <div className="fixed inset-0 z-[999] bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-gray-800 rounded-lg max-w-2xl w-full p-12 text-center">
        {/* Show error state for verification issues */}
        {isVerificationError ? (
          <>
            <div className="flex justify-center mb-6">
              <AlertTriangle className="w-16 h-16 text-yellow-500" />
            </div>
            <h1 className="text-4xl font-normal text-white mb-6 leading-tight">
              Unable to verify trial status.
            </h1>
            <p className="text-gray-300 text-xl mb-8">
              We&apos;re having trouble accessing your account information. Please try refreshing the page or contact support if the issue persists.
            </p>
            <div className="flex justify-center gap-6">
              <button
                onClick={handleRefresh}
                className="bg-[#79ffea] text-black px-8 py-3 rounded-full text-lg font-semibold hover:bg-[#5ce6d1] transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={handleContactUs}
                className="border-2 border-[#79ffea] text-[#79ffea] px-8 py-3 rounded-full text-lg font-semibold hover:bg-[#79ffea] hover:text-black transition-colors"
              >
                Contact Support
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Normal trial expired content */}
            <h1 className="text-5xl font-normal text-white mb-8 leading-tight">
              Your free trial has expired.
            </h1>
            
            {/* Subheading */}
            <div className="mb-12">
              <p className="text-gray-300 text-xl mb-4">Need more time with Peak?</p>
              <div className="flex items-baseline justify-center gap-2">
                <span 
                  className="text-3xl font-normal text-white"
                  style={{ textDecoration: 'underline', textDecorationColor: '#79ffea' }}
                >
                  Upgrade
                </span>
                <span className="text-3xl font-normal text-white">
                  for premium features including:
                </span>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-6 mb-12 text-left max-w-lg mx-auto">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-[#79ffea] flex-shrink-0" />
                <span className="text-2xl text-white font-normal">Infinite API Requests</span>
              </div>
              
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-[#79ffea] flex-shrink-0" />
                <span className="text-2xl text-white font-normal">
                  Support for <span className="font-semibold">Videos, GIFs, and More.</span>
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-[#79ffea] flex-shrink-0" />
                <span className="text-2xl text-white font-normal">
                  <span className="font-semibold">CSAM, Nudity, & Deepfake</span> Multi-Model Access
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-[#79ffea] flex-shrink-0" />
                <div className="text-2xl text-white font-normal">
                  <span className="font-semibold">Workplace Accounts & Team Collaboration</span>
                  <div className="text-lg text-gray-300 mt-1">
                    <span 
                      className="underline cursor-pointer hover:text-[#79ffea] transition-colors"
                      onClick={handleContactUs}
                      style={{ textDecorationColor: '#79ffea' }}
                    >
                      Contact us
                    </span>
                    {' '}for curated enterprise plans to suit your business needs.
                  </div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="flex justify-center">
              <button
                onClick={handleContactUs}
                className="bg-[#79ffea] text-black px-12 py-4 rounded-full text-xl font-semibold hover:bg-[#5ce6d1] transition-colors uppercase tracking-wider w-full max-w-md"
              >
                CONTACT US
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 
```


---

## Changes by Type

### Added

### Modified
- [peak-watch/dashboard:main:c53142ba4cb5558257f14c12de7a178122bed61e:src/components/TrialExpiredModal.tsx] peak-watch/dashboard (main) — src/components/TrialExpiredModal.tsx

### Deleted

### Renamed

### Other

---

## Detailed Evidence

### [peak-watch/dashboard:main:c53142ba4cb5558257f14c12de7a178122bed61e:src/components/TrialExpiredModal.tsx] peak-watch/dashboard (main) — modified
Metadata: {"commitSha":"c53142ba4cb5558257f14c12de7a178122bed61e","parentSha":"d0ce22f0a99829be8f997a41aac2d7855ee472b7","status":"modified","additions":5,"deletions":17,"changes":22,"commitUrl":"https://github.com/peak-watch/dashboard/commit/c53142ba4cb5558257f14c12de7a178122bed61e","message":"remove upgrade now button","author":{"name":"Jose Maldonado","email":"jose@peak.watch","date":"2025-08-04T16:56:51Z"},"committer":{"name":"Jose Maldonado","email":"jose@peak.watch","date":"2025-08-04T16:56:51Z"}}
Timestamp: 2025-08-04T16:56:51Z

```text
--- a/src/components/TrialExpiredModal.tsx
+++ b/src/components/TrialExpiredModal.tsx
@@ FULL FILE DIFF @@
'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';

interface TrialExpiredModalProps {
  isVisible: boolean;
  error?: string | null;
}

export default function TrialExpiredModal({ isVisible, error }: TrialExpiredModalProps) {
  if (!isVisible) return null;

  const handleContactUs = () => {
    // Redirect to contact page
    window.open('https://www.peak.watch/contact', '_blank');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Show different content based on error type
  const isVerificationError = error && (
    error.includes('verification') || 
    error.includes('Authentication') || 
    error.includes('Unable to verify')
  );

  return (
    <div className="fixed inset-0 z-[999] bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-gray-800 rounded-lg max-w-2xl w-full p-12 text-center">
        {/* Show error state for verification issues */}
        {isVerificationError ? (
          <>
            <div className="flex justify-center mb-6">
              <AlertTriangle className="w-16 h-16 text-yellow-500" />
            </div>
            <h1 className="text-4xl font-normal text-white mb-6 leading-tight">
              Unable to verify trial status.
            </h1>
            <p className="text-gray-300 text-xl mb-8">
              We&apos;re having trouble accessing your account information. Please try refreshing the page or contact support if the issue persists.
            </p>
            <div className="flex justify-center gap-6">
              <button
                onClick={handleRefresh}
                className="bg-[#79ffea] text-black px-8 py-3 rounded-full text-lg font-semibold hover:bg-[#5ce6d1] transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={handleContactUs}
                className="border-2 border-[#79ffea] text-[#79ffea] px-8 py-3 rounded-full text-lg font-semibold hover:bg-[#79ffea] hover:text-black transition-colors"
              >
                Contact Support
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Normal trial expired content */}
            <h1 className="text-5xl font-normal text-white mb-8 leading-tight">
              Your free trial has expired.
            </h1>
            
            {/* Subheading */}
            <div className="mb-12">
              <p className="text-gray-300 text-xl mb-4">Need more time with Peak?</p>
              <div className="flex items-baseline justify-center gap-2">
                <span 
                  className="text-3xl font-normal text-white"
                  style={{ textDecoration: 'underline', textDecorationColor: '#79ffea' }}
                >
                  Upgrade
                </span>
                <span className="text-3xl font-normal text-white">
                  for premium features including:
                </span>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-6 mb-12 text-left max-w-lg mx-auto">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-[#79ffea] flex-shrink-0" />
                <span className="text-2xl text-white font-normal">Infinite API Requests</span>
              </div>
              
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-[#79ffea] flex-shrink-0" />
                <span className="text-2xl text-white font-normal">
                  Support for <span className="font-semibold">Videos, GIFs, and More.</span>
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-[#79ffea] flex-shrink-0" />
                <span className="text-2xl text-white font-normal">
                  <span className="font-semibold">CSAM, Nudity, & Deepfake</span> Multi-Model Access
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-[#79ffea] flex-shrink-0" />
                <div className="text-2xl text-white font-normal">
                  <span className="font-semibold">Workplace Accounts & Team Collaboration</span>
                  <div className="text-lg text-gray-300 mt-1">
                    <span 
                      className="underline cursor-pointer hover:text-[#79ffea] transition-colors"
                      onClick={handleContactUs}
                      style={{ textDecorationColor: '#79ffea' }}
                    >
                      Contact us
                    </span>
                    {' '}for curated enterprise plans to suit your business needs.
                  </div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="flex justify-center">
              <button
                onClick={handleContactUs}
                className="bg-[#79ffea] text-black px-12 py-4 rounded-full text-xl font-semibold hover:bg-[#5ce6d1] transition-colors uppercase tracking-wider w-full max-w-md"
              >
                CONTACT US
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 
```
