import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate, formatDurationShort } from '../../utils/format';
import type { AuditStatus, StoreOverview } from '../../types';

const statusVariant: Record<AuditStatus, 'success' | 'warning' | 'danger'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

/** Section shown when the underlying data isn't modelled yet — honest, not faked. */
function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <section className="pos-card pos-card-muted">
      <h3 className="pos-card-title">{title}</h3>
      <p className="pos-soon">{note}</p>
    </section>
  );
}

/**
 * The operational half of the POS details page. What renders adapts to the
 * viewer's permissions — a merchandiser sees the field data for their POS, while
 * stock and reporting sections appear only for roles that may read them. The
 * backend already scoped the data; this only decides what to surface.
 */
export default function PosOverviewSections({
  overview,
  loading,
}: {
  overview: StoreOverview | null;
  loading: boolean;
}) {
  const { t, i18n } = useTranslation('pos');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const p = usePermissions();

  const canSeeVisits = p.can('visits.read');
  const canSeeStock = p.can('inventory.read') || p.can('audit_items.read') || p.can('reports.read');
  const canSeeReports = p.can('reports.read');

  if (loading && !overview) {
    return <div className="pos-card pos-soon">{tCommon('loading')}</div>;
  }
  if (!overview) return null;

  const { team, visits, product_availability, stock_summary, stockouts, photos } = overview;

  return (
    <>
      {/* ── Assigned field team ──────────────────────────────────────────── */}
      <section className="pos-card">
        <h3 className="pos-card-title">{t('sections.team')}</h3>
        {team.length === 0 ? (
          <p className="pos-soon">{t('team.empty')}</p>
        ) : (
          <div className="pos-team">
            {team.map((m) => (
              <div key={m.id} className="pos-team-member">
                <div className="pos-team-avatar">{m.full_name.charAt(0).toUpperCase()}</div>
                <div className="pos-team-info">
                  <span className="pos-team-name">{m.full_name}</span>
                  <span className="pos-team-role">{tCommon(`roles.${m.role}`)}</span>
                </div>
                {!m.is_active && <Badge variant="gray">{tCommon('status.inactive')}</Badge>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Stock summary + product availability ─────────────────────────── */}
      {canSeeStock && (
        <section className="pos-card">
          <h3 className="pos-card-title">{t('sections.stock')}</h3>

          <div className="pos-stat-row">
            <div className="pos-stat"><span className="pos-stat-val">{stock_summary.expected_products}</span><span className="pos-stat-label">{t('stock.expected')}</span></div>
            <div className="pos-stat"><span className="pos-stat-val" style={{ color: 'var(--success)' }}>{stock_summary.in_stock}</span><span className="pos-stat-label">{t('stock.inStock')}</span></div>
            <div className="pos-stat"><span className="pos-stat-val" style={{ color: '#b07600' }}>{stock_summary.low_stock}</span><span className="pos-stat-label">{t('stock.lowStock')}</span></div>
            <div className="pos-stat"><span className="pos-stat-val" style={{ color: 'var(--danger)' }}>{stock_summary.out_of_stock}</span><span className="pos-stat-label">{t('stock.outOfStock')}</span></div>
          </div>

          {product_availability.length > 0 && (
            <div className="chart-table-wrap" style={{ marginTop: 14 }}>
              <table className="chart-table">
                <thead>
                  <tr>
                    <th>{t('stock.product')}</th>
                    <th className="num">{t('stock.expectedQty')}</th>
                    <th className="num">{t('stock.lastFound')}</th>
                    <th>{tCommon('table.actions') === 'Actions' ? t('stock.status') : t('stock.status')}</th>
                    <th>{t('stock.lastSeen')}</th>
                  </tr>
                </thead>
                <tbody>
                  {product_availability.map((row) => (
                    <tr key={row.product.id}>
                      <td>{row.product.name}</td>
                      <td className="num">{row.expected_qty}</td>
                      <td className="num">{row.last_qty_found ?? '—'}</td>
                      <td>
                        {row.last_status ? (
                          <Badge variant={statusVariant[row.last_status]}>
                            {tCommon(`status.${row.last_status}`)}
                          </Badge>
                        ) : (
                          <span className="pos-muted">{t('stock.neverAudited')}</span>
                        )}
                      </td>
                      <td className="pos-muted">
                        {row.last_seen_at ? formatDate(row.last_seen_at, i18n.language) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Stockout reports ─────────────────────────────────────────────── */}
      {canSeeStock && (
        <section className="pos-card">
          <h3 className="pos-card-title">{t('sections.stockouts')}</h3>
          {stockouts.length === 0 ? (
            <p className="pos-soon">{t('stockouts.empty')}</p>
          ) : (
            <ul className="pos-stockouts">
              {stockouts.map((so, i) => (
                <li key={`${so.visit_id}-${so.product.id}-${i}`} className="pos-stockout">
                  <Badge variant="danger" dot>{tCommon('status.out_of_stock')}</Badge>
                  <span className="pos-stockout-product">{so.product.name}</span>
                  <span className="pos-muted">{formatDate(so.checkin_at, i18n.language)}</span>
                  {so.reported_by && <span className="pos-muted">· {so.reported_by.full_name}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Visit history ────────────────────────────────────────────────── */}
      {canSeeVisits && (
        <section className="pos-card">
          <h3 className="pos-card-title">{t('sections.visits')}</h3>
          {visits.length === 0 ? (
            <p className="pos-soon">{t('visits.empty')}</p>
          ) : (
            <div className="chart-table-wrap">
              <table className="chart-table">
                <thead>
                  <tr>
                    <th>{t('visits.date')}</th>
                    <th>{t('visits.merchandiser')}</th>
                    <th>{t('visits.status')}</th>
                    <th className="num">{t('visits.audited')}</th>
                    <th className="num">{t('visits.duration')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visits.slice(0, 15).map((v) => (
                    <tr key={v.id}>
                      <td>{formatDate(v.checkin_at, i18n.language)}</td>
                      <td>{v.user?.full_name ?? '—'}</td>
                      <td>
                        <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>
                          {v.status === 'open' ? tCommon('status.open') : tCommon('status.closed')}
                        </Badge>
                      </td>
                      <td className="num">{v.audited}</td>
                      <td className="num">{formatDurationShort(v.duration_seconds)}</td>
                      <td>
                        <button type="button" className="pos-link" onClick={() => navigate(`/visits/${v.id}`)}>
                          {t('visits.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Photos & field evidence ──────────────────────────────────────── */}
      {canSeeVisits && (
        <section className="pos-card">
          <h3 className="pos-card-title">{t('sections.photos')}</h3>
          {photos.length === 0 ? (
            <p className="pos-soon">{t('photos.empty')}</p>
          ) : (
            <div className="pos-photos">
              {photos.map((ph, i) => (
                <a
                  key={`${ph.visit_id}-${i}`}
                  href={ph.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pos-photo"
                  title={`${ph.product.name} · ${formatDate(ph.checkin_at, i18n.language)}`}
                >
                  <img src={ph.url} alt={ph.product.name} loading="lazy" />
                  <span className="pos-photo-cap">{ph.product.name}</span>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Sections without a data model yet — shown honestly, not faked ── */}
      {canSeeReports && (
        <>
          <ComingSoon title={t('sections.sellOut')} note={t('soon.sellOut')} />
          <ComingSoon title={t('sections.merchandising')} note={t('soon.merchandising')} />
        </>
      )}
    </>
  );
}
