import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { useClientPagination } from '../../hooks/useClientPagination';
import {
  fetchRoles,
  fetchRole,
  fetchPermissionCatalogue,
  createRole,
  updateRole,
  deleteRole,
  setRolePermissions,
} from '../../store/slices/rolesSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import RoleForm from './RoleForm';
import PermissionMatrix from './PermissionMatrix';
import type { RoleRecord } from '../../types';

export default function RolesPage() {
  const { t } = useTranslation('roles');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const p = usePermissions();

  const { items: roles, catalogue, selected, loading, saving } = useAppSelector((s) => s.roles);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleRecord | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleRecord | null>(null);
  const [matrixRoleId, setMatrixRoleId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dispatch(fetchRoles());
    dispatch(fetchPermissionCatalogue());
  }, [dispatch]);

  const { pageItems, meta, setPage, setLimit } = useClientPagination(roles);

  // The list endpoint returns counts only; the grants come from the detail endpoint.
  const openMatrix = (role: RoleRecord) => {
    setMatrixRoleId(role.id);
    dispatch(fetchRole(role.id));
  };

  const handleCreate = async (data: { name?: string; label: string; description?: string }) => {
    const res = await dispatch(createRole({ ...data, name: data.name! }));
    if (createRole.fulfilled.match(res)) {
      toast.success(t('toasts.createSuccess'));
      setCreateOpen(false);
    } else {
      toast.error((res.payload as string) || t('toasts.createError'));
    }
  };

  const handleUpdate = async (data: { label: string; description?: string }) => {
    if (!editRole) return;
    const res = await dispatch(updateRole({ id: editRole.id, payload: data }));
    if (updateRole.fulfilled.match(res)) {
      toast.success(t('toasts.updateSuccess'));
      setEditRole(null);
    } else {
      toast.error((res.payload as string) || t('toasts.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteRoleTarget) return;
    setBusy(true);
    const res = await dispatch(deleteRole(deleteRoleTarget.id));
    setBusy(false);
    if (deleteRole.fulfilled.match(res)) {
      toast.success(t('toasts.deleteSuccess'));
      setDeleteRoleTarget(null);
    } else {
      // e.g. the role still has users assigned, or it is a built-in role.
      toast.error((res.payload as string) || t('toasts.deleteError'));
    }
  };

  const handleSavePermissions = async (permissions: string[]) => {
    if (!matrixRoleId) return;
    const res = await dispatch(setRolePermissions({ id: matrixRoleId, permissions }));
    if (setRolePermissions.fulfilled.match(res)) {
      toast.success(t('toasts.permissionsSaved'));
      setMatrixRoleId(null);
    } else {
      toast.error((res.payload as string) || t('toasts.permissionsError'));
    }
  };

  const columns = [
    {
      key: 'label',
      header: t('table.role'),
      render: (r: RoleRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {r.is_system ? tCommon(`roles.${r.name}`) : r.label}
          </div>
          <code style={{ fontSize: 12, color: 'var(--gray-400)' }}>{r.name}</code>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('table.type'),
      render: (r: RoleRecord) => (
        <Badge variant={r.is_system ? 'primary' : 'gray'}>
          {r.is_system ? t('table.builtIn') : t('table.custom')}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: t('table.description'),
      hideOnMobile: true,
      render: (r: RoleRecord) => (
        <span style={{ color: 'var(--gray-500)' }}>{r.description || '—'}</span>
      ),
    },
    {
      key: 'permission_count',
      header: t('table.permissions'),
      render: (r: RoleRecord) => (
        <Badge variant={r.name === 'super_admin' ? 'primary' : 'gray'}>
          {t('table.permissionCount', { count: r.permission_count ?? 0 })}
        </Badge>
      ),
    },
    {
      key: 'user_count',
      header: t('table.users'),
      render: (r: RoleRecord) => <span>{r.user_count ?? 0}</span>,
    },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (r: RoleRecord) => (
        <div className="table-actions">
          {p.can('roles.assign_permissions') && (
            <Button variant="ghost" size="sm" onClick={() => openMatrix(r)}>
              {t('actions.permissions')}
            </Button>
          )}
          {p.can('roles.update') && (
            <Button variant="outline" size="sm" onClick={() => setEditRole(r)}>
              {tCommon('actions.edit')}
            </Button>
          )}
          {p.can('roles.delete') && !r.is_system && (
            <Button variant="danger" size="sm" onClick={() => setDeleteRoleTarget(r)}>
              {tCommon('actions.delete')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const matrixRole = selected?.id === matrixRoleId ? selected : null;

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          p.can('roles.create') ? (
            <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>
              {t('addRole')}
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
        <DataTable
          columns={columns}
          data={pageItems}
          loading={loading}
          keyExtractor={(r) => r.id}
          emptyMessage={t('table.empty')}
        />
        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('createRole')} size="md">
        <RoleForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editRole} onClose={() => setEditRole(null)} title={t('editRole')} size="md">
        {editRole && (
          <RoleForm
            initialData={editRole}
            onSubmit={handleUpdate}
            onCancel={() => setEditRole(null)}
          />
        )}
      </Modal>

      <Modal
        open={!!matrixRoleId}
        onClose={() => setMatrixRoleId(null)}
        title={t('permissionsTitle', {
          name: matrixRole
            ? matrixRole.is_system
              ? tCommon(`roles.${matrixRole.name}`)
              : matrixRole.label
            : '',
        })}
        size="lg"
      >
        {matrixRole ? (
          <PermissionMatrix
            role={matrixRole}
            catalogue={catalogue}
            saving={saving}
            onSave={handleSavePermissions}
            onCancel={() => setMatrixRoleId(null)}
          />
        ) : (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)' }}>
            {tCommon('loading')}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteRoleTarget}
        onClose={() => setDeleteRoleTarget(null)}
        onConfirm={handleDelete}
        loading={busy}
        message={t('deleteConfirm.message', { name: deleteRoleTarget?.label })}
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
