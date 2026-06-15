import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisits, checkin, checkout } from '../../store/slices/visitsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import CheckinForm from './CheckinForm';
import CheckoutForm from './CheckoutForm';
import { formatDate } from '../../utils/format';
import type { Visit } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';

export default function VisitsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: visits, loading } = useAppSelector((s) => s.visits);
  const { items: stores } = useAppSelector((s) => s.stores);
  const p = usePermissions();

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutVisit, setCheckoutVisit] = useState<Visit | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    dispatch(fetchVisits(statusFilter ? { status: statusFilter } : undefined));
    dispatch(fetchStores());
  }, [dispatch, statusFilter]);

  const openVisit = visits.find((v) => v.status === 'open');

  const handleCheckin = async (data: { store_id: string; lat: number; lng: number }) => {
    const res = await dispatch(checkin(data));
    if (checkin.fulfilled.match(res)) {
      toast.success('Checked in successfully!');
      setCheckinOpen(false);
    } else {
      toast.error(res.payload as string || 'Check-in failed');
    }
  };

  const handleCheckout = async (data: { lat: number; lng: number }) => {
    if (!checkoutVisit) return;
    const res = await dispatch(checkout({ visit_id: checkoutVisit.id, ...data }));
    if (checkout.fulfilled.match(res)) {
      toast.success('Checked out successfully!');
      setCheckoutVisit(null);
    } else {
      toast.error(res.payload as string || 'Check-out failed');
    }
  };

  const columns = [
    { key: 'store', header: 'Store', render: (v: Visit) => <span style={{ fontWeight: 500 }}>{v.store?.name || v.store_id}</span> },
    { key: 'status', header: 'Status', render: (v: Visit) => <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>{v.status === 'open' ? 'Open' : 'Closed'}</Badge> },
    { key: 'checkin_at', header: 'Check-in', render: (v: Visit) => <span style={{ color: 'var(--gray-600)' }}>{formatDate(v.checkin_at)}</span> },
    { key: 'checkout_at', header: 'Check-out', render: (v: Visit) => <span style={{ color: 'var(--gray-500)' }}>{v.checkout_at ? formatDate(v.checkout_at) : '—'}</span> },
    {
      key: 'gps',
      header: 'GPS (in)',
      render: (v: Visit) => (
        <span className="gps-coords">{v.checkin_lat.toFixed(4)}, {v.checkin_lng.toFixed(4)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (v: Visit) => (
        <div className="table-actions">
          <Button variant="outline" size="sm" onClick={() => navigate(`/visits/${v.id}`)}>View</Button>
          {v.status === 'open' && p.canCheckin && (
            <Button variant="secondary" size="sm" onClick={() => setCheckoutVisit(v)}>Check Out</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Visits"
        subtitle="Track store visits, check-in and check-out with GPS"
        actions={
          p.canCheckin && (
            <Button
              icon={<CheckinIcon />}
              onClick={() => setCheckinOpen(true)}
              disabled={!!openVisit}
              title={openVisit ? 'You already have an open visit' : undefined}
            >
              Check In
            </Button>
          )
        }
      />

      {openVisit && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--success-light)', border: '1px solid var(--success)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span style={{ color: 'var(--success)', fontWeight: 500 }}>
            You have an open visit at <strong>{openVisit.store?.name}</strong>
          </span>
          <Button variant="secondary" size="sm" onClick={() => setCheckoutVisit(openVisit)}>Check Out Now</Button>
        </motion.div>
      )}

      <div className="filter-bar">
        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={visits} loading={loading} keyExtractor={(v) => v.id} emptyMessage="No visits found" />
      </motion.div>

      <Modal open={checkinOpen} onClose={() => setCheckinOpen(false)} title="Check In to Store" size="sm">
        <CheckinForm stores={stores} onSubmit={handleCheckin} onCancel={() => setCheckinOpen(false)} />
      </Modal>

      <Modal open={!!checkoutVisit} onClose={() => setCheckoutVisit(null)} title="Check Out" size="sm">
        {checkoutVisit && (
          <CheckoutForm visit={checkoutVisit} onSubmit={handleCheckout} onCancel={() => setCheckoutVisit(null)} />
        )}
      </Modal>
    </div>
  );
}

function CheckinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}
