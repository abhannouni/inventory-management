import ComingSoonModulePage from './ComingSoonModulePage';
import { modulesApi } from '../../api/modules.api';

export default function TrainingPage() {
  return (
    <ComingSoonModulePage
      titleKey="training.title"
      subtitleKey="training.subtitle"
      fetchStatus={modulesApi.training}
    />
  );
}
