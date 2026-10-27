import type { TicketStatus } from '@argon/shared';

type ScanOutcome = 'CHECKED_IN' | 'DUPLICATE' | 'INVALID' | 'REVOKED';

interface ScanResultScreenProps {
  outcome: ScanOutcome;
  ticketStatus?: TicketStatus;
  holderName?: string;
  checkedInAt?: string;
}

/**
 * ScanResultScreen – full-screen feedback after a QR scan.
 *
 * Green screen: CHECKED_IN (success)
 * Red screen: DUPLICATE (already scanned), INVALID (bad signature), REVOKED
 *
 * TODO: Add audio feedback (success beep / error buzz) via AudioFeedback lib.
 * TODO: Auto-dismiss after 3 seconds and return to viewfinder.
 */
export function ScanResultScreen({ outcome, holderName, checkedInAt }: ScanResultScreenProps) {
  const isSuccess = outcome === 'CHECKED_IN';
  // TODO: implement
  return (
    <div data-outcome={outcome}>
      <span>{isSuccess ? '✅' : '❌'} {outcome}</span>
      {holderName && <p>{holderName}</p>}
      {checkedInAt && <p>Checked in: {checkedInAt}</p>}
    </div>
  );
}
