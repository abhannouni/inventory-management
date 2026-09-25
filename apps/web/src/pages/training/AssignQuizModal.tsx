import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { trainingApi, type TrainingUser } from '../../api/training.api';
import Button from '../../components/ui/Button';
import MultiSelectSearch from '../../components/ui/MultiSelectSearch';
import Spinner from '../../components/ui/Spinner';
import { formatRole } from '../../utils/format';

interface Props {
  quizId: string;
  alreadyAssigned: string[];
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignQuizModal({ quizId, alreadyAssigned, onClose, onAssigned }: Props) {
  const { t } = useTranslation('training');
  const { t: tCommon } = useTranslation('common');
  const [users, setUsers] = useState<TrainingUser[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    trainingApi.assignableUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  // Users who already have the quiz aren't offered again.
  const available = useMemo(() => {
    const taken = new Set(alreadyAssigned);
    return (users ?? []).filter((u) => !taken.has(u.id));
  }, [users, alreadyAssigned]);

  const byRole = useMemo(() => {
    const map = new Map<string, string[]>();
    available.forEach((u) => map.set(u.role, [...(map.get(u.role) ?? []), u.id]));
    return Array.from(map.entries());
  }, [available]);

  const addAll = (ids: string[]) => setSelected((prev) => Array.from(new Set([...prev, ...ids])));

  const handleAssign = async () => {
    if (!selected.length) return;
    setSaving(true);
    try {
      const res = await trainingApi.assign(quizId, selected);
      toast.success(t('assign.success', { count: res.assigned }));
      onAssigned();
    } catch (e) {
      toast.error((e as Error).message);
      setSaving(false);
    }
  };

  if (!users) return <Spinner center />;

  return (
    <div>
      <p className="training-modal-hint">{t('assign.hint')}</p>

      {available.length === 0 ? (
        <p className="training-muted" style={{ marginBottom: 16 }}>{t('assign.everyoneAssigned')}</p>
      ) : (
        <>
          <div className="training-quick-add">
            <button type="button" className="training-chip" onClick={() => addAll(available.map((u) => u.id))}>
              + {t('assign.everyone')} <span>{available.length}</span>
            </button>
            {byRole.map(([role, ids]) => (
              <button key={role} type="button" className="training-chip" onClick={() => addAll(ids)}>
                + {formatRole(role)} <span>{ids.length}</span>
              </button>
            ))}
          </div>

          <MultiSelectSearch
            label={t('assign.users')}
            placeholder={t('assign.search')}
            items={available}
            selectedIds={selected}
            onChange={setSelected}
            getKey={(u) => u.id}
            getPrimary={(u) => u.full_name}
            getSecondary={(u) => `${formatRole(u.role)} · ${u.email}`}
            noResultsLabel={t('assign.noResults')}
            typeToSearchLabel={t('assign.typeToSearch')}
            browseThreshold={200}
          />

          {selected.length > 0 && (
            <div className="training-selected-row">
              <span>{t('assign.selected', { count: selected.length })}</span>
              <button type="button" className="training-link" onClick={() => setSelected([])}>{t('assign.clear')}</button>
            </div>
          )}
        </>
      )}

      <div className="form-actions" style={{ marginTop: 20 }}>
        <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
          {tCommon('actions.close')}
        </Button>
        <Button type="button" onClick={handleAssign} loading={saving} disabled={!selected.length}>
          {t('assign.submit', { count: selected.length })}
        </Button>
      </div>
    </div>
  );
}
