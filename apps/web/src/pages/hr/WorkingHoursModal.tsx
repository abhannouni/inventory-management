import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../components/ui/Modal';
import { usePermissions } from '../../hooks/usePermissions';
import AttendancePolicyForm from './AttendancePolicyForm';
import WorkingHoursCalculator from './WorkingHoursCalculator';

interface Props {
  employee: { id: string; full_name: string } | null;
  /** Which screen to open on. */
  view?: 'calculate' | 'policy';
  initialDate?: string;
  onClose: () => void;
}

/**
 * The "Calculate working hours" and "Location rules" dialogs for one
 * employee. Editing the rules from a calculation returns to it, recalculated.
 */
export default function WorkingHoursModal({ employee, view = 'calculate', initialDate, onClose }: Props) {
  const { t } = useTranslation('hr');
  const { can } = usePermissions();
  const [screen, setScreen] = useState<'calculate' | 'policy' | null>(null);
  const [run, setRun] = useState(0);
  const current = screen ?? view;
  const cameFromCalc = screen === 'policy';

  const close = () => {
    setScreen(null);
    onClose();
  };

  return (
    <Modal
      open={!!employee}
      onClose={close}
      title={
        employee
          ? current === 'calculate'
            ? t('calc.title', { name: employee.full_name })
            : t('policy.title', { name: employee.full_name })
          : ''
      }
      size={current === 'calculate' ? 'xl' : 'lg'}
    >
      {employee &&
        (current === 'calculate' ? (
          <WorkingHoursCalculator
            key={run}
            employee={employee}
            initialDate={initialDate}
            onEditPolicy={can('hr.manage') ? () => setScreen('policy') : undefined}
          />
        ) : (
          <AttendancePolicyForm
            employee={employee}
            onCancel={cameFromCalc ? () => setScreen('calculate') : close}
            onDone={() => {
              if (!cameFromCalc) return close();
              setRun((n) => n + 1);
              setScreen('calculate');
            }}
          />
        ))}
    </Modal>
  );
}
