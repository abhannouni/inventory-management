import { usePermissions } from '../../hooks/usePermissions';
import PriceSurveyFillingView from './PriceSurveyFillingView';
import PriceSurveyAdminView from './PriceSurveyAdminView';

export default function PriceSurveysPage() {
  const p = usePermissions();
  if (p.canManagePriceSurveys) return <PriceSurveyAdminView />;
  if (p.canFillPriceSurvey) return <PriceSurveyFillingView />;
  return null;
}
