import ComingSoonModulePage from './ComingSoonModulePage';
import { modulesApi } from '../../api/modules.api';

export default function SellOutPage() {
  return (
    <ComingSoonModulePage
      titleKey="sellOut.title"
      subtitleKey="sellOut.subtitle"
      fetchStatus={modulesApi.sellOut}
    />
  );
}
