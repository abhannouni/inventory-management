import ComingSoonModulePage from './ComingSoonModulePage';
import { modulesApi } from '../../api/modules.api';

export default function MerchandisingPage() {
  return (
    <ComingSoonModulePage
      titleKey="merchandising.title"
      subtitleKey="merchandising.subtitle"
      fetchStatus={modulesApi.merchandising}
    />
  );
}
