import ComingSoonModulePage from './ComingSoonModulePage';
import { modulesApi } from '../../api/modules.api';

export default function PriceSurveysPage() {
  return (
    <ComingSoonModulePage
      titleKey="priceSurveys.title"
      subtitleKey="priceSurveys.subtitle"
      fetchStatus={modulesApi.priceSurveys}
    />
  );
}
