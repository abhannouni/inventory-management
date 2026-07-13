import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import type { PermissionGroup, RoleRecord } from '../../types';

interface PermissionMatrixProps {
  role: RoleRecord;
  catalogue: PermissionGroup[];
  saving?: boolean;
  onSave: (permissions: string[]) => void;
  onCancel: () => void;
}

/**
 * Grants editor for one role: a checkbox per permission, grouped by resource,
 * with a tri-state toggle on each resource row.
 *
 * The super_admin role is read-only — the API refuses to edit it, so showing
 * editable checkboxes would just produce a rejected save.
 */
export default function PermissionMatrix({
  role,
  catalogue,
  saving,
  onSave,
  onCancel,
}: PermissionMatrixProps) {
  const { t } = useTranslation('roles');
  const { t: tCommon } = useTranslation('common');

  const locked = role.name === 'super_admin';
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions ?? []));

  const toggle = (code: string) => {
    if (locked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleResource = (group: PermissionGroup) => {
    if (locked) return;
    const codes = group.permissions.map((p) => p.code);
    const allOn = codes.every((c) => selected.has(c));

    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of codes) {
        if (allOn) next.delete(c);
        else next.add(c);
      }
      return next;
    });
  };

  const dirty = useMemo(() => {
    const original = new Set(role.permissions ?? []);
    if (original.size !== selected.size) return true;
    for (const c of selected) if (!original.has(c)) return true;
    return false;
  }, [selected, role.permissions]);

  return (
    <div className="permission-matrix">
      {locked && (
        <div className="matrix-notice">{t('matrix.superAdminLocked')}</div>
      )}

      <div className="matrix-summary">
        {t('matrix.selectedCount', { count: selected.size })}
      </div>

      <div className="matrix-groups">
        {catalogue.map((group) => {
          const codes = group.permissions.map((p) => p.code);
          const on = codes.filter((c) => selected.has(c)).length;
          const all = on === codes.length;
          const some = on > 0 && !all;

          return (
            <section key={group.resource} className="matrix-group">
              <header className="matrix-group-header">
                <label className="matrix-check">
                  <input
                    type="checkbox"
                    checked={all}
                    ref={(el) => {
                      if (el) el.indeterminate = some;
                    }}
                    disabled={locked}
                    onChange={() => toggleResource(group)}
                  />
                  <span className="matrix-resource">{t(`resources.${group.resource}`)}</span>
                </label>
                <span className="matrix-group-count">
                  {on}/{codes.length}
                </span>
              </header>

              <div className="matrix-perms">
                {group.permissions.map((perm) => (
                  <label key={perm.code} className="matrix-check matrix-perm">
                    <input
                      type="checkbox"
                      checked={selected.has(perm.code)}
                      disabled={locked}
                      onChange={() => toggle(perm.code)}
                    />
                    <span className="matrix-perm-text">
                      <span className="matrix-action">{t(`actions.${perm.action}`, perm.action)}</span>
                      <code className="matrix-code">{perm.code}</code>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={saving}>
          {tCommon('actions.cancel')}
        </Button>
        <Button
          type="button"
          loading={saving}
          disabled={locked || !dirty}
          onClick={() => onSave([...selected])}
        >
          {t('matrix.save')}
        </Button>
      </div>
    </div>
  );
}
