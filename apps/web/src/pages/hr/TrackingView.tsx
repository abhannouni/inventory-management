import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hrApi, type HrFilters, type TrackingResponse, type TrackingRow, type WorkStatus } from '../../api/hr.api';
import StatTile from '../../components/charts/StatTile';
import Button from '../../components/ui/Button';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';
import TableToolbar from '../../components/ui/TableToolbar';
import { usePermissions } from '../../hooks/usePermissions';
import { useTableQuery } from '../../hooks/useTableQuery';
import AssignHoursForm from './AssignHoursForm';
import EmployeeCell from './EmployeeCell';
import RoleTimeForm from './RoleTimeForm';
import WorkStatusBadge from './WorkStatusBadge';
import WorkingHoursModal from './WorkingHoursModal';
import {
  STATUS_ORDER,
  STATUS_TONE,
  addDays,
  formatDay,
  formatHours,
  formatShift,
  formatTime,
  roleLabel,
  roleLabelOf,
  todayKey,
} from './hrUtils';

/** How often today's view refreshes itself while left open. */
const REFRESH_MS = 60_000;

interface Props {
  filters: HrFilters | null;
}

/** The admin overview: one day, every employee, assigned vs worked, colour-coded. */
export default function TrackingView({ filters }: Props) {
  const { t, i18n } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');
  const { can } = usePermissions();

  const [date, setDate] = useState(todayKey());
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [editRow, setEditRow] = useState<TrackingRow | null>(null);
  const [calcRow, setCalcRow] = useState<TrackingRow | null>(null);
  const [addingTime, setAddingTime] = useState(false);

  const { query, params, setPage, setLimit, setSearch, setSort, setFilter, reset } = useTableQuery({
    limit: 50,
    filters: { role_id: '', region_id: '', supervisor_id: '', status: '' },
  });

  // Previous results stay on screen while a new day / filter loads, so the
  // table doesn't flash empty on every keystroke or arrow click.
  const fetchData = useCallback(
    () =>
      hrApi
        .tracking({ ...params, date })
        .then(setData)
        .catch(() => undefined),
    [params, date],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep today's numbers live: statuses move as people clock in and out.
  const isToday = date === todayKey();
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(id);
  }, [isToday, fetchData]);

  const summary = data?.summary;
  const below = (summary?.short ?? 0) + (summary?.missing ?? 0);
  const ratio = summary && summary.assigned_seconds > 0
    ? Math.round((summary.worked_seconds / summary.assigned_seconds) * 100)
    : null;

  const legendCount = (s: WorkStatus) => (summary ? summary[s] : 0);
  const activeStatus = query.filters.status ?? '';

  const columns: Column<TrackingRow>[] = [
    {
      key: 'full_name',
      header: t('table.employee'),
      sortable: true,
      render: (r) => <EmployeeCell id={r.id} name={r.full_name} email={r.email} />,
    },
    {
      key: 'role',
      header: t('table.roleRegion'),
      sortable: true,
      hideOnMobile: true,
      render: (r) => (
        <div>
          <div>{roleLabel(r, tCommon)}</div>
          <div className="wh-muted">{r.region?.name ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: t('table.schedule'),
      hideOnMobile: true,
      render: (r) => (
        <div>
          <div>{r.planned ? formatShift(r.planned, t) : <span className="wh-muted">{t('schedule.none')}</span>}</div>
          {r.schedule_source !== 'none' && (
            <div className="wh-muted">{t(`source.${r.schedule_source}`)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'assigned',
      header: t('table.assigned'),
      sortable: true,
      render: (r) => <span className="wh-num">{formatHours(r.assigned_seconds)}</span>,
    },
    {
      key: 'worked',
      header: t('table.worked'),
      sortable: true,
      render: (r) => <WorkedCell row={r} language={i18n.language} />,
    },
    {
      key: 'remaining',
      header: t('table.remaining'),
      sortable: true,
      hideOnMobile: true,
      render: (r) => (
        <span className={`wh-num ${r.remaining_seconds ? '' : 'wh-muted'}`}>{formatHours(r.remaining_seconds)}</span>
      ),
    },
    {
      key: 'overtime',
      header: t('table.overtime'),
      sortable: true,
      hideOnMobile: true,
      render: (r) =>
        r.overtime_seconds > 0 ? (
          <span className="wh-num wh-overtime">+{formatHours(r.overtime_seconds)}</span>
        ) : (
          <span className="wh-muted">—</span>
        ),
    },
    {
      key: 'status',
      header: t('table.status'),
      sortable: true,
      render: (r) => (
        <div className="wh-status-cell">
          <WorkStatusBadge status={r.status} label={r.is_working ? t('status.working') : undefined} />
          {r.needs_review && (
            <span className="wh-review" title={t('review.hint')}>
              ⚠ {t('review.label')}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (r) => (
        <div className="table-actions">
          <Link to={`/hr/employees/${r.id}?from=${date}`} className="btn btn-ghost btn-sm">
            {t('actions.details')}
          </Link>
          <Button size="sm" variant="outline" onClick={() => setCalcRow(r)}>
            {t('actions.calculate')}
          </Button>
          {can('hr.manage') && (
            <Button size="sm" variant="outline" onClick={() => setEditRow(r)}>
              {t('actions.editSchedule')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="wh-stack">
      {/* ── Date picker ─────────────────────────────────────────────── */}
      <div className="wh-datebar">
        <div className="wh-datebar-nav">
          <button type="button" className="wh-icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label={t('date.previous')}>
            ‹
          </button>
          <input
            type="date"
            className="form-input wh-date-input"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label={t('date.label')}
          />
          <button type="button" className="wh-icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label={t('date.next')}>
            ›
          </button>
          {!isToday && (
            <Button size="sm" variant="outline" onClick={() => setDate(todayKey())}>
              {t('date.today')}
            </Button>
          )}
          {can('hr.manage') && (
            <Button size="sm" onClick={() => setAddingTime(true)}>
              + {t('roleTime.open')}
            </Button>
          )}
        </div>
        <div className="wh-datebar-meta">
          <strong>{formatDay(date, i18n.language, { weekday: 'long', year: 'numeric', month: 'long' })}</strong>
          {data && isToday && (
            <span className="wh-live">
              <span className="wh-live-dot" /> {t('date.updatedAt', { time: formatTime(data.generated_at, i18n.language) })}
            </span>
          )}
        </div>
      </div>

      {/* ── Overview ────────────────────────────────────────────────── */}
      {summary ? (
        <div className="kpi-row">
          <StatTile label={t('kpi.total')} value={summary.total} />
          <StatTile label={t('kpi.completed')} value={summary.completed} tone="good" />
          <StatTile
            label={t('kpi.below')}
            value={below}
            tone={below ? 'critical' : 'default'}
            hint={t('kpi.belowHint', { short: summary.short, missing: summary.missing })}
          />
          <StatTile label={t('kpi.working')} value={summary.working_now} />
          <StatTile label={t('kpi.noSchedule')} value={summary.no_schedule} />
          <StatTile
            label={t('kpi.hours')}
            value={formatHours(summary.worked_seconds)}
            unit={` / ${formatHours(summary.assigned_seconds)}`}
            hint={ratio === null ? undefined : t('kpi.hoursHint', { pct: ratio })}
          />
        </div>
      ) : (
        <Spinner center />
      )}

      {/* ── Legend doubles as a status filter ───────────────────────── */}
      <div className="wh-legend" role="group" aria-label={t('legend.label')}>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            className={`wh-legend-item wh-tone-${STATUS_TONE[s]} ${activeStatus === s ? 'is-active' : ''}`}
            title={t(`status.${s}.hint`)}
            aria-pressed={activeStatus === s}
            onClick={() => setFilter('status', activeStatus === s ? '' : s)}
          >
            <span className="wh-status-dot" aria-hidden="true" />
            {t(`status.${s}.label`)}
            <span className="wh-legend-count">{legendCount(s)}</span>
          </button>
        ))}
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="card">
        <TableToolbar
          search={query.search}
          onSearchChange={setSearch}
          searchPlaceholder={t('filters.search')}
          onFilterChange={setFilter}
          onReset={reset}
          filters={[
            {
              key: 'role_id',
              label: t('filters.allRoles'),
              value: query.filters.role_id ?? '',
              options: (filters?.roles ?? []).map((r) => ({ value: r.id, label: roleLabelOf(r, tCommon) })),
            },
            {
              key: 'region_id',
              label: t('filters.allRegions'),
              value: query.filters.region_id ?? '',
              options: (filters?.regions ?? []).map((r) => ({ value: r.id, label: r.name })),
            },
            {
              key: 'supervisor_id',
              label: t('filters.allTeams'),
              value: query.filters.supervisor_id ?? '',
              options: (filters?.supervisors ?? []).map((s) => ({ value: s.id, label: s.full_name })),
            },
            {
              key: 'status',
              label: t('filters.allStatuses'),
              value: activeStatus,
              options: STATUS_ORDER.map((s) => ({ value: s, label: t(`status.${s}.label`) })),
            },
          ]}
        />

        <DataTable
          columns={columns}
          data={data?.items ?? []}
          loading={!data}
          keyExtractor={(r) => r.id}
          emptyMessage={t('tracking.empty')}
          sortBy={query.sort_by}
          sortDir={query.sort_dir}
          onSortChange={setSort}
        />

        {data && <Pagination meta={data.meta} onPageChange={setPage} onLimitChange={setLimit} />}
      </div>

      <Modal open={addingTime} onClose={() => setAddingTime(false)} title={t('roleTime.title')} size="lg">
        {addingTime && (
          <RoleTimeForm
            filters={filters}
            defaultDate={date}
            onCancel={() => setAddingTime(false)}
            onDone={() => {
              setAddingTime(false);
              fetchData();
            }}
          />
        )}
      </Modal>

      <WorkingHoursModal employee={calcRow} initialDate={date} onClose={() => setCalcRow(null)} />

      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={editRow ? t('assign.titleOne', { name: editRow.full_name }) : ''}
        size="lg"
      >
        {editRow && (
          <AssignHoursForm
            employees={[editRow]}
            onCancel={() => setEditRow(null)}
            onDone={() => {
              setEditRow(null);
              fetchData();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function WorkedCell({ row, language }: { row: TrackingRow; language: string }) {
  const pct = row.assigned_seconds
    ? Math.min(100, Math.round((row.worked_seconds / row.assigned_seconds) * 100))
    : row.worked_seconds
      ? 100
      : 0;
  return (
    <div className="wh-worked">
      <span className="wh-num">{formatHours(row.worked_seconds)}</span>
      <span className={`wh-bar wh-tone-${STATUS_TONE[row.status]}`}>
        <span style={{ width: `${pct}%` }} />
      </span>
      {row.first_in && (
        <span className="wh-muted wh-worked-times">
          {formatTime(row.first_in, language)} – {row.is_working ? '…' : formatTime(row.last_out, language)}
        </span>
      )}
    </div>
  );
}
