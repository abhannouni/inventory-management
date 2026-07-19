import ComingSoonModulePage from './ComingSoonModulePage';
import { modulesApi } from '../../api/modules.api';

export default function HrPage() {
  return (
    <ComingSoonModulePage
      titleKey="hr.title"
      subtitleKey="hr.subtitle"
      fetchStatus={modulesApi.hr}
    />
  );
}
