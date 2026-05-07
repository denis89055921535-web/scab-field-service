import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Building2, Shield, LogOut, Settings } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  if (!user) {
    return (
      <div>
        <PageHeader title="Личный кабинет" />
        <div className="p-4 text-center text-muted-foreground text-sm py-12">Загрузка...</div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div>
      <PageHeader title="Личный кабинет" />

      <div className="p-4 space-y-4">
        <div className="flex flex-col items-center py-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-bold text-lg">{user.full_name || 'Пользователь'}</h2>
          <Badge variant="secondary" className="mt-1">
            {isAdmin ? 'Администратор' : 'Инженер'}
          </Badge>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <ProfileRow icon={Mail} label="Email" value={user.email || '—'} />
            <ProfileRow icon={Building2} label="Должность" value={user.position || '—'} />
            <ProfileRow icon={Phone} label="Телефон" value={user.phone || '—'} />
            <ProfileRow icon={Building2} label="Подразделение" value={user.department || '—'} />
            <ProfileRow icon={Shield} label="Роль" value={isAdmin ? 'Администратор' : 'Инженер'} />
          </CardContent>
        </Card>

        {isAdmin && (
          <Button
            variant="outline"
            className="w-full h-11"
            onClick={() => navigate('/admin')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Панель администратора
          </Button>
        )}

        <Button
          variant="destructive"
          className="w-full h-11"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Выйти из аккаунта
        </Button>
      </div>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}