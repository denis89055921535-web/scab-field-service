import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API_URL = 'https://scabpro.com/api';
const getToken = () => localStorage.getItem('auth_token');
const PARTNERS = ['ИНК-Сервис', 'ИНК-ТКРС', 'Газпром Бурение', 'МУБР'];

async function apiRequest(method, endpoint, data) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: data ? JSON.stringify(data) : undefined,
  });
  return res.json();
}

function PartnersSelector({ user, onToggle }) {
  const current = Array.isArray(user.allowed_partners) ? user.allowed_partners : [];
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {PARTNERS.map(p => {
        const active = current.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => onToggle(p, !active)}
            className={
              'text-xs px-2 py-1 rounded-full border transition-colors ' +
              (active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-muted')
            }
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminUsers() {
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest('GET', '/users'),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, ...data }) => apiRequest('PUT', `/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Пользователь обновлён');
    },
    onError: () => toast.error('Ошибка обновления'),
  });

  const deleteUser = useMutation({
    mutationFn: (id) => apiRequest('DELETE', `/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Пользователь удалён');
    },
  });

  const togglePartner = (u, partner, add) => {
    const current = Array.isArray(u.allowed_partners) ? u.allowed_partners : [];
    const next = add ? [...current, partner] : current.filter(p => p !== partner);
    updateUser.mutate({
      id: u.id,
      role: u.role,
      status: u.status,
      position: u.position,
      phone: u.phone,
      department: u.department,
      allowed_partners: next,
    });
  };

  const pending = users.filter(u => u.status === 'pending');
  const active = users.filter(u => u.status !== 'pending');

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">Пользователи</h2>

      {pending.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-amber-500 mb-3">⏳ Ожидают подтверждения ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(u => (
              <Card key={u.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{u.name || u.full_name || '—'}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.position && <p className="text-sm text-muted-foreground">{u.position}</p>}
                    {u.phone && <p className="text-sm text-muted-foreground">{u.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700"
                      onClick={() => updateUser.mutate({ id: u.id, status: 'active', role: u.role || 'engineer', position: u.position, phone: u.phone, department: u.department, allowed_partners: u.allowed_partners || [] })}>
                      ✓ Подтвердить
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => deleteUser.mutate(u.id)}>
                      ✗ Отклонить
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mt-2">Доступные компании:</p>
                  <PartnersSelector user={u} onToggle={(p, add) => togglePartner(u, p, add)} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-base font-semibold mb-3">Активные пользователи ({active.length})</h3>
        <div className="space-y-2">
          {active.map(u => (
            <Card key={u.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{u.name || u.full_name || '—'}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                  {u.position && <p className="text-sm text-muted-foreground">{u.position}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                    {u.role === 'admin' ? 'Администратор' : 'Инженер'}
                  </Badge>
                  {u.role !== 'admin' && (
                    <Button size="sm" variant="outline"
                      onClick={() => updateUser.mutate({ id: u.id, role: 'admin', status: 'active', position: u.position, phone: u.phone, department: u.department, allowed_partners: u.allowed_partners || [] })}>
                      Сделать админом
                    </Button>
                  )}
                  <Button size="sm" variant="destructive"
                    onClick={() => { if (confirm('Удалить пользователя?')) deleteUser.mutate(u.id); }}>
                    Удалить
                  </Button>
                </div>
              </div>
              {u.role !== 'admin' && (
                <div>
                  <p className="text-xs text-muted-foreground mt-2">Доступные компании:</p>
                  <PartnersSelector user={u} onToggle={(p, add) => togglePartner(u, p, add)} />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
