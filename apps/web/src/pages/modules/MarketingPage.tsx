import ComingSoonModulePage from './ComingSoonModulePage';
import { modulesApi } from '../../api/modules.api';

export default function MarketingPage() {
  return (
    <ComingSoonModulePage
      titleKey="marketing.title"
      subtitleKey="marketing.subtitle"
      fetchStatus={modulesApi.marketing}
    />
  );
}
