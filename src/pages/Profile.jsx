import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Building2, Shield, LogOut, Settings, Trash2, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { usePartner } from '@/lib/PartnerContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [showPartnerSwitch, setShowPartnerSwitch] = useState(false);
  const navigate = useNavigate();
  const { partner, setPartner, PARTNERS } = usePartner();

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

        <Button
          variant="outline"
          className="w-full h-11 justify-between"
          onClick={() => setShowPartnerSwitch(!showPartnerSwitch)}
        >
          <span className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Проект: <span className="font-bold">{partner}</span>
          </span>
          <ChevronRight className={`w-4 h-4 transition-transform ${showPartnerSwitch ? 'rotate-90' : ''}`} />
        </Button>

        {showPartnerSwitch && (
          <Card>
            <CardContent className="p-3 space-y-2">
              {PARTNERS.map(p => (
                <button
                  key={p}
                  onClick={() => { setPartner(p); setShowPartnerSwitch(false); }}
                  className={`w-full rounded-lg border-2 px-4 py-3 text-left font-semibold text-sm transition-all ${
                    partner === p
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </CardContent>
          </Card>
        )}

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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full h-11 border-destructive text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить аккаунт
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие необратимо. Все ваши данные будут удалены. Вы уверены?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  await base44.entities.User.delete(user.id).catch(() => {});
                  base44.auth.logout();
                }}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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