import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { useTableQuery } from '../../hooks/useTableQuery';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  assignStores,
  setUserActive,
} from '../../store/slices/usersSlice';
import { fetchRegions } from '../../store/slices/regionsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchRoles } from '../../store/slices/rolesSlice';
import { usersApi } from '../../api/users.api';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import TableToolbar from '../../components/ui/TableToolbar';
import UserForm from './UserForm';
import AssignStoresForm from './AssignStoresForm';
import { formatDate } from '../../utils/format';
import type { User, Role } from '../../types';

const roleBadge: Record<Role, 'primary' | 'success' | 'warning' | 'gray'> = {
  super_admin: 'primary',
  admin: 'success',
  general_management: 'primary',
  supervisor: 'warning',
  merchandiser: 'gray',
};

const ROLES: Role[] = [
  'super_admin',
  'admin',
  'general_management',
  'supervisor',
  'merchandiser',
];

export default function UsersPage() {
  const { t, i18n } = useTranslation('users');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const p = usePermissions();

  const { items: users, meta, loading } = useAppSelector((s) => s.users);
  const { items: regions } = useAppSelector((s) => s.regions);
  const { items: stores } = useAppSelector((s) => s.stores);
  const { items: roles } = useAppSelector((s) => s.roles);

  const { query, params, setPage, setLimit, setSearch, setSort, setFilter, reset } =
    useTableQuery({ sort_by: 'created_at', sort_dir: 'desc' });

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [toggleUser, setToggleUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [supervisors, setSupervisors] = useState<User[]>([]);

  useEffect(() => {
    dispatch(fetchUsers(params));
  }, [dispatch, params]);

  useEffect(() => {
    dispatch(fetchRegions());
    dispatch(fetchStores());
    if (p.can('roles.read')) dispatch(fetchRoles());
    // Options list for the "supervisor" picker on the merchandiser form — kept
    // separate from the paginated table state above.
    usersApi.findAll({ role: 'supervisor', limit: 100 }).then((res) => setSupervisors(res.items));
    // `p` is rebuilt each render; the permission set it reads from is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const handleCreate = async (data: any) => {
    const res = await dispatch(createUser(data));
    if (createUser.fulfilled.match(res)) {
      toast.success(t('toasts.createSuccess'));
      setCreateOpen(false);
    } else {
      toast.error((res.payload as string) || t('toasts.createError'));
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editUser) return;
    const res = await dispatch(updateUser({ id: editUser.id, payload: data }));
    if (updateUser.fulfilled.match(res)) {
      toast.success(t('toasts.updateSuccess'));
      setEditUser(null);
    } else {
      toast.error((res.payload as string) || t('toasts.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    const res = await dispatch(deleteUser(deleteId));
    setBusy(false);
    if (deleteUser.fulfilled.match(res)) {
      toast.success(t('toasts.deleteSuccess'));
      setDeleteId(null);
    } else {
      toast.error((res.payload as string) || t('toasts.deleteError'));
    }
  };

  const handleToggleActive = async () => {
    if (!toggleUser) return;
    const activating = !toggleUser.is_active;
    setBusy(true);
    const res = await dispatch(setUserActive({ id: toggleUser.id, active: activating }));
    setBusy(false);

    if (setUserActive.fulfilled.match(res)) {
      toast.success(activating ? t('toasts.activateSuccess') : t('toasts.deactivateSuccess'));
      setToggleUser(null);
    } else {
      // Server-side guardrails (last super admin, self-deactivation) surface here.
      toast.error((res.payload as string) || t('toasts.toggleError'));
    }
  };

  const handleAssignStores = async (store_ids: string[]) => {
    if (!assignUser) return;
    const res = await dispatch(assignStores({ id: assignUser.id, store_ids }));
    if (assignStores.fulfilled.match(res)) {
      toast.success(t('toasts.assignSuccess'));
      setAssignUser(null);
    } else {
      toast.error((res.payload as string) || t('toasts.assignError'));
    }
  };

  const columns = [
    {
      key: 'full_name',
      header: t('table.name'),
      sortable: true,
      render: (u: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className={`avatar ${u.is_active ? '' : 'is-muted'}`}>
            {u.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="user-cell-info">
            <div style={{ fontWeight: 500 }}>{u.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('table.role'),
      sortable: true,
      render: (u: User) => (
        <Badge variant={roleBadge[u.role] ?? 'gray'}>
          {u.custom_role && !u.custom_role.is_system
            ? u.custom_role.label
            : tCommon(`roles.${u.role}`)}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: t('table.status'),
      sortable: true,
      render: (u: User) => (
        <div className="status-cell">
          <Badge variant={u.is_active ? 'success' : 'gray'} dot>
            {u.is_active ? tCommon('status.active') : tCommon('status.inactive')}
          </Badge>
          {p.canActivateUsers && (
            <button
              type="button"
              className={`switch-btn ${u.is_active ? 'is-on' : ''}`}
              role="switch"
              aria-checked={u.is_active}
              aria-label={u.is_active ? t('actions.deactivate') : t('actions.activate')}
              title={u.is_active ? t('actions.deactivate') : t('actions.activate')}
              onClick={() => setToggleUser(u)}
            />
          )}
        </div>
      ),
    },
    {
      key: 'region',
      header: t('table.region'),
      render: (u: User) => (
        <span style={{ color: 'var(--gray-500)' }}>{u.region?.name || '—'}</span>
      ),
    },
    {
      key: 'last_login_at',
      header: t('table.lastLogin'),
      sortable: true,
      render: (u: User) => (
        <span style={{ color: 'var(--gray-500)' }}>
          {u.last_login_at ? formatDate(u.last_login_at, i18n.language) : t('table.never')}
        </span>
      ),
    },
    {
      key: 'store_assignment',
      header: t('table.storeAssignment'),
      render: (u: User) =>
        ['supervisor', 'merchandiser', 'admin'].includes(u.role) && p.can('users.assign_stores') ? (
          <Button variant="secondary" size="sm" onClick={() => setAssignUser(u)}>
            {t('actions.assignStores')}
          </Button>
        ) : (
          <span style={{ color: 'var(--gray-300)' }}>—</span>
        ),
    },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (u: User) => (
        <div className="table-actions">
          {p.can('users.update') && (
            <Button variant="outline" size="sm" onClick={() => setEditUser(u)}>
              {tCommon('actions.edit')}
            </Button>
          )}
          {p.can('users.delete') && (
            <Button variant="danger" size="sm" onClick={() => setDeleteId(u.id)}>
              {tCommon('actions.delete')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          p.can('users.create') ? (
            <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>
              {t('addUser')}
            </Button>
          ) : undefined
        }
      />

      <motion.div
        className="card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <TableToolbar
          search={query.search}
          onSearchChange={setSearch}
          searchPlaceholder={t('searchPlaceholder')}
          onFilterChange={setFilter}
          onReset={reset}
          filters={[
            {
              key: 'role',
              label: t('filters.allRoles'),
              value: query.filters.role ?? '',
              options: ROLES.map((r) => ({ value: r, label: tCommon(`roles.${r}`) })),
            },
            {
              key: 'is_active',
              label: t('filters.allStatuses'),
              value: query.filters.is_active ?? '',
              options: [
                { value: 'true', label: tCommon('status.active') },
                { value: 'false', label: tCommon('status.inactive') },
              ],
            },
            {
              key: 'region_id',
              label: t('filters.allRegions'),
              value: query.filters.region_id ?? '',
              options: regions.map((r) => ({ value: r.id, label: r.name })),
            },
          ]}
        />

        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          keyExtractor={(u) => u.id}
          emptyMessage={t('table.empty')}
          sortBy={query.sort_by}
          sortDir={query.sort_dir}
          onSortChange={setSort}
          rowClassName={(u) => (u.is_active ? undefined : 'row-inactive')}
        />

        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('createUser')} size="md">
        <UserForm
          regions={regions}
          roles={roles}
          supervisors={supervisors}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={t('editUser')} size="md">
        {editUser && (
          <UserForm
            regions={regions}
            roles={roles}
            supervisors={supervisors}
            initialData={editUser}
            onSubmit={handleUpdate}
            onCancel={() => setEditUser(null)}
          />
        )}
      </Modal>

      <Modal
        open={!!assignUser}
        onClose={() => setAssignUser(null)}
        title={t('assignStoresTitle', { name: assignUser?.full_name })}
        size="md"
      >
        {assignUser && (
          <AssignStoresForm
            stores={stores}
            userId={assignUser.id}
            onSubmit={handleAssignStores}
            onCancel={() => setAssignUser(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!toggleUser}
        onClose={() => setToggleUser(null)}
        onConfirm={handleToggleActive}
        loading={busy}
        title={
          toggleUser?.is_active
            ? t('deactivateConfirm.title')
            : t('activateConfirm.title')
        }
        message={
          toggleUser?.is_active
            ? t('deactivateConfirm.message', { name: toggleUser?.full_name })
            : t('activateConfirm.message', { name: toggleUser?.full_name })
        }
        confirmLabel={
          toggleUser?.is_active ? t('actions.deactivate') : t('actions.activate')
        }
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={busy}
        message={t('deleteConfirm.message')}
      />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
