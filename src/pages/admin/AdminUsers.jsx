import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsers() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('engineer');
  const [inviting, setInviting] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    // Map engineer role to 'user' for base44 platform
    const platformRole = inviteRole === 'admin' ? 'admin' : 'user';
    await base44.users.inviteUser(inviteEmail, platformRole);
    toast.success('Приглашение отправлено');
    setInviteOpen(false);
    setInviteEmail('');
    setInviting(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Пользователи</h2>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-1" /> Пригласить
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Пригласить пользователя</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div>
                <Label className="text-xs">Роль</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineer">Инженер</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleInvite} disabled={inviting}>
                {inviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Отправить приглашение
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead>Роль</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                  <TableCell>{user.email || '—'}</TableCell>
                  <TableCell>{user.position || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {user.role === 'admin' ? 'Администратор' : 'Инженер'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}