import ComingSoonModulePage from './ComingSoonModulePage';
import { modulesApi } from '../../api/modules.api';

export default function PromosPage() {
  return (
    <ComingSoonModulePage
      titleKey="promos.title"
      subtitleKey="promos.subtitle"
      fetchStatus={modulesApi.promos}
    />
  );
}
