// ═══════════════════════════════════════════════════════════
// useClaim hook — manages the full claim flow state
// Connect → Check Eligibility → Submit On-Chain Tx → Confirm
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { WalletManager } from '../wallet/WalletManager';
import { apiClient } from '../lib/apiClient';
import { submitClaimTx } from '../lib/claimContract';
import type { CampaignDto, EligibilityDto } from '../lib/apiClient';

type ClaimState = 'idle' | 'checking' | 'eligible' | 'ineligible' | 'claiming' | 'success' | 'failed';

export function useClaim() {
  const [state, setState] = useState<ClaimState>('idle');
  const [eligibility, setEligibility] = useState<EligibilityDto | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkEligibility = useCallback(async (campaign: CampaignDto) => {
    const account = WalletManager.getActiveAccount();
    if (!account) { setError('No wallet connected'); return; }

    setState('checking');
    setError(null);
    try {
      const result = await apiClient.checkEligibility(
        campaign.id,
        account.address,
        account.chain
      );
      setEligibility(result);
      setState(result.eligible ? 'eligible' : 'ineligible');
      if (!result.eligible) setError(result.reason || 'Not eligible');
    } catch (e: any) {
      setState('failed');
      setError(e.message);
    }
  }, []);

  const submitClaim = useCallback(async (campaign: CampaignDto) => {
    const account = WalletManager.getActiveAccount();
    if (!account || !eligibility?.eligible) return;

    setState('claiming');
    setError(null);

    try {
      let finalTxHash = 'pending';

      if (campaign.claim_contract && account.chainType === 'evm') {
        const result = await submitClaimTx({
          contractAddress: campaign.claim_contract,
          chain: account.chain,
          amount: eligibility.amount,
          merkleProof: eligibility.merkleProof,
          campaignId: campaign.id,
          walletProvider: (window as any).ethereum,
          walletAddress: account.address,
        });

        if (!result.success) {
          setState('failed');
          setError(result.error || 'Transaction failed');
          return;
        }

        finalTxHash = result.txHash!;
        setTxHash(finalTxHash);
      }

      const claimResult = await apiClient.submitClaim(
        campaign.id,
        account.address,
        account.chain,
        finalTxHash,
        eligibility.amount
      );

      if (claimResult.success) {
        setState('success');
      } else {
        setState('failed');
        setError(claimResult.error || 'Backend submission failed');
      }
    } catch (e: any) {
      setState('failed');
      setError(e.message);
    }
  }, [eligibility]);

  const reset = useCallback(() => {
    setState('idle');
    setEligibility(null);
    setTxHash(null);
    setError(null);
  }, []);

  return { state, eligibility, txHash, error, checkEligibility, submitClaim, reset };
}
