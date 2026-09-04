import type { ReactNode } from 'react';
import { hasPlus } from '@/backend/subscription';
import { TRIAL_DAYS } from '@/backend/subscription';

interface Props {
  /** korte naam van de functie, voor analytics en de uitleg */
  feature: string;
  /** één zin: wat voegt Plus hier toe */
  reason: string;
  children: ReactNode;
  /** overschrijft de cache, bijvoorbeeld vanuit App-state */
  plus?: boolean;
  onStartTrial?: () => void;
  onMoreInfo?: () => void;
}

/**
 * Gate voor Plus-inhoud (SPEC 6.3, styleguide 5). Toont de inhoud als de gebruiker Plus heeft,
 * anders een kaart met uitleg en de proefknop. Nooit gebruiken voor veiligheidsinhoud.
 */
export default function PlusGate({ feature, reason, children, plus, onStartTrial, onMoreInfo }: Props) {
  const unlocked = plus ?? hasPlus();
  if (unlocked) return <>{children}</>;
  return (
    <div className="gate" role="region" aria-label={`Vaarmaat Plus: ${feature}`}>
      <div className="gate-icon" aria-hidden="true">★</div>
      <div className="gate-body">
        <b>Vaarmaat Plus</b>
        <p>{reason}</p>
        <button className="primary" onClick={onStartTrial}>Probeer {TRIAL_DAYS} dagen gratis</button>
        <button className="link" onClick={onMoreInfo}>Wat zit er in Plus?</button>
      </div>
    </div>
  );
}
