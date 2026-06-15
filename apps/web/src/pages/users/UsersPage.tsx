import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchUsers, createUser, updateUser, deleteUser, assignStores } from '../../store/slices/usersSlice';
import { fetchRegions } from '../../store/slices/regionsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import UserForm from './UserForm';
import AssignStoresForm from './AssignStoresForm';
import { formatDate, formatRole } from '../../utils/format';
import type { User, Role } from '../../types';

const roleBadge: Record<Role, 'primary' | 'success' | 'warning' | 'gray'> = {
  super_admin: 'primary',
  admin: 'success',
  supervisor: 'warning',
  merchandiser: 'gray',
};

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const { items: users, loading } = useAppSelector((s) => s.users);
  const { items: regions } = useAppSelector((s) => s.regions);
  const { items: stores } = useAppSelector((s) => s.stores);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchRegions());
    dispatch(fetchStores());
  }, [dispatch]);

  const handleCreate = async (data: any) => {
    const res = await dispatch(createUser(data));
    if (createUser.fulfilled.match(res)) {
      toast.success('User created successfully');
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || 'Failed to create user');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editUser) return;
    const res = await dispatch(updateUser({ id: editUser.id, payload: data }));
    if (updateUser.fulfilled.match(res)) {
      toast.success('User updated successfully');
      setEditUser(null);
    } else {
      toast.error(res.payload as string || 'Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteUser(deleteId));
    setDeleting(false);
    if (deleteUser.fulfilled.match(res)) {
      toast.success('User deleted');
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || 'Failed to delete user');
    }
  };

  const handleAssignStores = async (store_ids: string[]) => {
    if (!assignUser) return;
    const res = await dispatch(assignStores({ id: assignUser.id, store_ids }));
    if (assignStores.fulfilled.match(res)) {
      toast.success('Stores assigned successfully');
      setAssignUser(null);
    } else {
      toast.error(res.payload as string || 'Failed to assign stores');
    }
  };

  const columns = [
    {
      key: 'full_name',
      header: 'Name',
      render: (u: User) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {u.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{u.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u: User) => <Badge variant={roleBadge[u.role]}>{formatRole(u.role)}</Badge>,
    },
    {
      key: 'region',
      header: 'Region',
      render: (u: User) => <span style={{ color: 'var(--gray-500)' }}>{u.region?.name || '—'}</span>,
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (u: User) => <span style={{ color: 'var(--gray-500)' }}>{formatDate(u.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u: User) => (
        <div className="table-actions">
          {['supervisor', 'merchandiser'].includes(u.role) && (
            <Button variant="ghost" size="sm" onClick={() => setAssignUser(u)}>Assign Stores</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditUser(u)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(u.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage user accounts and permissions"
        actions={<Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>Add User</Button>}
      />

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={users} loading={loading} keyExtractor={(u) => u.id} emptyMessage="No users found" />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User" size="md">
        <UserForm regions={regions} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="md">
        {editUser && (
          <UserForm regions={regions} initialData={editUser} onSubmit={handleUpdate} onCancel={() => setEditUser(null)} />
        )}
      </Modal>

      <Modal open={!!assignUser} onClose={() => setAssignUser(null)} title={`Assign Stores — ${assignUser?.full_name}`} size="md">
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
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message="This will permanently delete the user account."
      />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
