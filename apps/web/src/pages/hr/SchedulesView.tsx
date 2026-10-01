import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  hrApi,
  type AssignMode,
  type EmployeeWithSchedule,
  type HrFilters,
  type RoleSchedule,
  type ScheduleSource,
} from '../../api/hr.api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';
import TableToolbar from '../../components/ui/TableToolbar';
import { useClientPagination } from '../../hooks/useClientPagination';
import { usePermissions } from '../../hooks/usePermissions';
import AssignHoursForm, { type AssignTarget } from './AssignHoursForm';
import EmployeeCell from './EmployeeCell';
import RoleScheduleForm from './RoleScheduleForm';
import WeekStrip from './WeekStrip';
import { formatDay, formatMinutes, roleLabel, roleLabelOf } from './hrUtils';

const SOURCES: ScheduleSource[] = ['role', 'custom', 'none'];

interface Props {
  filters: HrFilters | null;
}

/**
 * Assigning hours: each role's default (which everyone in the role follows
 * automatically), and the employee list — pick one, several, or every match
 * of the current filters, then assign in one go.
 */
export default function SchedulesView({ filters }: Props) {
  const { t, i18n } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');
  const { can } = usePermissions();
  const canManage = can('hr.manage');

  const [roles, setRoles] = useState<RoleSchedule[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithSchedule[] | null>(null);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    role_id: '',
    region_id: '',
    supervisor_id: '',
    source: '',
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assign, setAssign] = useState<{ targets: AssignTarget[]; mode: AssignMode } | null>(null);
  const [editRole, setEditRole] = useState<RoleSchedule | null>(null);

  const load = useCallback(() => {
    Promise.all([hrApi.roleSchedules(), hrApi.employees()])
      .then(([r, e]) => {
        setRoles(r);
        setEmployees(e);
      })
      .catch(() => {
        setRoles([]);
        setEmployees([]);
      });
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (employees ?? []).filter(
      (e) =>
        (!term || e.full_name.toLowerCase().includes(term) || e.email.toLowerCase().includes(term)) &&
        (!filterValues.role_id || e.role_id === filterValues.role_id) &&
        (!filterValues.region_id || e.region?.id === filterValues.region_id) &&
        (!filterValues.supervisor_id || e.supervisor?.id === filterValues.supervisor_id) &&
        (!filterValues.source || e.schedule.source === filterValues.source),
    );
  }, [employees, search, filterValues]);

  const { pageItems, meta, setPage, setLimit } = useClientPagination(filtered, {
    storageKey: 'hr:schedules:pageSize',
    defaultLimit: 50,
  });

  const customByRole = useMemo(() => {
    const map = new Map<string, number>();
    (employees ?? []).forEach((e) => {
      if (e.role_id && e.schedule.source === 'custom') map.set(e.role_id, (map.get(e.role_id) ?? 0) + 1);
    });
    return map;
  }, [employees]);

  const allMatchingSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));
  const someMatchingSelected = filtered.some((e) => selected.has(e.id));
  const headerBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = someMatchingSelected && !allMatchingSelected;
  }, [someMatchingSelected, allMatchingSelected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllMatching = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allMatchingSelected) filtered.forEach((e) => next.delete(e.id));
      else filtered.forEach((e) => next.add(e.id));
      return next;
    });

  const selectedEmployees = (employees ?? []).filter((e) => selected.has(e.id));

  const openAssign = (targets: AssignTarget[], mode: AssignMode = 'custom') => setAssign({ targets, mode });

  const handleDone = () => {
    setAssign(null);
    setEditRole(null);
    setSelected(new Set());
    load();
  };

  const resetFilters = () => {
    setSearch('');
    setFilterValues({ role_id: '', region_id: '', supervisor_id: '', source: '' });
  };

  if (!roles || !employees) return <Spinner center size="lg" />;

  return (
    <div className="wh-stack">
      {/* ── Role defaults ─────────────────────────────────────────────── */}
      <section className="card wh-section">
        <div className="wh-section-head">
          <div>
            <h2 className="wh-section-title">{t('roles.title')}</h2>
            <p className="wh-section-sub">{t('roles.subtitle')}</p>
          </div>
        </div>

        <div className="wh-role-grid">
          {roles.map((r) => {
            const customs = customByRole.get(r.id) ?? 0;
            const members = employees.filter((e) => e.role_id === r.id);
            return (
              <div key={r.id} className="wh-role-card">
                <div className="wh-role-top">
                  <div>
                    <div className="wh-role-name">{roleLabelOf(r, tCommon)}</div>
                    <div className="wh-muted">
                      {t('roles.employees', { count: r.employee_count })}
                      {customs > 0 && ` · ${t('roles.customCount', { count: customs })}`}
                    </div>
                  </div>
                  <div className="wh-role-total">
                    {r.days ? formatMinutes(r.weekly_minutes) : '—'}
                    <span>{t('roles.perWeek')}</span>
                  </div>
                </div>

                {r.days ? <WeekStrip days={r.days} /> : <p className="wh-muted wh-role-empty">{t('roles.noDefault')}</p>}

                {r.upcoming && (
                  <p className="wh-role-upcoming">
                    {t('roles.upcoming', {
                      date: formatDay(r.upcoming.effective_from, i18n.language),
                      hours: r.upcoming.days ? formatMinutes(r.upcoming.weekly_minutes) : t('schedule.none'),
                    })}
                  </p>
                )}

                {canManage && (
                  <div className="wh-role-actions">
                    <Button size="sm" variant="outline" onClick={() => setEditRole(r)}>
                      {r.days ? t('roles.edit') : t('roles.set')}
                    </Button>
                    {customs > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title={t('roles.resetAllHint')}
                        onClick={() => openAssign(members, 'role_default')}
                      >
                        {t('roles.resetAll')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Employees ─────────────────────────────────────────────────── */}
      <section className="card wh-section">
        <div className="wh-section-head">
          <div>
            <h2 className="wh-section-title">{t('employees.title')}</h2>
            <p className="wh-section-sub">{t('employees.subtitle')}</p>
          </div>
          {canManage && (
            <Button onClick={() => openAssign(filtered)} disabled={!filtered.length}>
              {t('employees.assignAllMatching', { count: filtered.length })}
            </Button>
          )}
        </div>

        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('filters.search')}
          onFilterChange={(key, value) => setFilterValues((f) => ({ ...f, [key]: value }))}
          onReset={resetFilters}
          filters={[
            {
              key: 'role_id',
              label: t('filters.allRoles'),
              value: filterValues.role_id,
              options: (filters?.roles ?? []).map((r) => ({ value: r.id, label: roleLabelOf(r, tCommon) })),
            },
            {
              key: 'region_id',
              label: t('filters.allRegions'),
              value: filterValues.region_id,
              options: (filters?.regions ?? []).map((r) => ({ value: r.id, label: r.name })),
            },
            {
              key: 'supervisor_id',
              label: t('filters.allTeams'),
              value: filterValues.supervisor_id,
              options: (filters?.supervisors ?? []).map((s) => ({ value: s.id, label: s.full_name })),
            },
            {
              key: 'source',
              label: t('filters.allSources'),
              value: filterValues.source,
              options: SOURCES.map((s) => ({ value: s, label: t(`source.${s}`) })),
            },
          ]}
        />

        {canManage && selected.size > 0 && (
          <div className="wh-bulkbar" role="region" aria-label={t('bulk.label')}>
            <span className="wh-bulkbar-count">{t('bulk.selected', { count: selected.size })}</span>
            {!allMatchingSelected && filtered.length > 0 && (
              <button type="button" className="wh-link" onClick={toggleAllMatching}>
                {t('bulk.selectAllMatching', { count: filtered.length })}
              </button>
            )}
            <div className="wh-bulkbar-actions">
              <Button size="sm" onClick={() => openAssign(selectedEmployees)}>
                {t('bulk.assign')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => openAssign(selectedEmployees, 'role_default')}>
                {t('bulk.useRoleDefault')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                {t('bulk.clear')}
              </Button>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          <table className="data-table wh-table">
            <thead>
              <tr>
                {canManage && (
                  <th className="wh-check-col">
                    <input
                      ref={headerBox}
                      type="checkbox"
                      checked={allMatchingSelected}
                      onChange={toggleAllMatching}
                      aria-label={t('bulk.selectAllMatching', { count: filtered.length })}
                      title={t('bulk.selectAllMatching', { count: filtered.length })}
                    />
                  </th>
                )}
                <th>{t('table.employee')}</th>
                <th className="hide-mobile">{t('table.roleRegion')}</th>
                <th>{t('table.schedule')}</th>
                <th className="hide-mobile">{t('table.week')}</th>
                <th className="col-actions">{tCommon('table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="table-empty">
                    {t('employees.empty')}
                  </td>
                </tr>
              ) : (
                pageItems.map((e) => (
                  <tr key={e.id} className={selected.has(e.id) ? 'wh-row-selected' : undefined}>
                    {canManage && (
                      <td className="wh-check-col">
                        <input
                          type="checkbox"
                          checked={selected.has(e.id)}
                          onChange={() => toggle(e.id)}
                          aria-label={t('bulk.selectOne', { name: e.full_name })}
                        />
                      </td>
                    )}
                    <td>
                      <EmployeeCell id={e.id} name={e.full_name} email={e.email} />
                    </td>
                    <td className="hide-mobile">
                      <div>{roleLabel(e, tCommon)}</div>
                      <div className="wh-muted">{e.region?.name ?? '—'}</div>
                    </td>
                    <td>
                      <span className={`wh-source wh-source-${e.schedule.source}`}>{t(`source.${e.schedule.source}`)}</span>
                      <div className="wh-muted">
                        {e.schedule.days ? t('assign.weekly', { hours: formatMinutes(e.schedule.weekly_minutes) }) : '—'}
                      </div>
                      {e.schedule.next_change_from && (
                        <div className="wh-muted">
                          {t('employees.changesOn', { date: formatDay(e.schedule.next_change_from, i18n.language) })}
                        </div>
                      )}
                    </td>
                    <td className="hide-mobile">
                      <WeekStrip days={e.schedule.days} />
                    </td>
                    <td className="col-actions">
                      <div className="table-actions">
                        <Link to={`/hr/employees/${e.id}`} className="btn btn-ghost btn-sm">
                          {t('actions.details')}
                        </Link>
                        {canManage && (
                          <Button size="sm" variant="outline" onClick={() => openAssign([e])}>
                            {tCommon('actions.edit')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </section>

      <Modal
        open={!!assign}
        onClose={() => setAssign(null)}
        title={
          assign?.targets.length === 1
            ? t('assign.titleOne', { name: assign.targets[0].full_name })
            : t('assign.title', { count: assign?.targets.length ?? 0 })
        }
        size="lg"
      >
        {assign && (
          <AssignHoursForm
            employees={assign.targets}
            initialMode={assign.mode}
            onCancel={() => setAssign(null)}
            onDone={handleDone}
          />
        )}
      </Modal>

      <Modal
        open={!!editRole}
        onClose={() => setEditRole(null)}
        title={editRole ? t('roles.editTitle', { role: roleLabelOf(editRole, tCommon) }) : ''}
        size="lg"
      >
        {editRole && (
          <RoleScheduleForm
            role={editRole}
            customCount={customByRole.get(editRole.id) ?? 0}
            onCancel={() => setEditRole(null)}
            onDone={handleDone}
          />
        )}
      </Modal>
    </div>
  );
}

