import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeftRight, Building2, CheckCircle2, ClipboardList, Loader2, LockKeyhole, MailCheck, Package, PlayCircle, Plus, Save, ShieldCheck, ShoppingCart, Trash2, User, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/common/PageHeader';
import MobileSelect from '@/components/common/MobileSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { sendEquipmentRequestByEmail } from '@/lib/equipmentRequestEmail';
import { usePartner } from '@/lib/PartnerContext';
import {
  assetTypeOptions,
  formatRequestLocation,
  locationOptions,
  purchaseApprovalSteps,
  requestStatusConfig,
  requestTypeConfig,
} from '@/lib/warehouseRequests';
import { PROJECT_MANAGER_POSITION, SERVICE_MANAGER_POSITION } from '@/lib/userPositions';

const movementReasons = [
  { value: 'return_after_work', label: 'Возврат после работ' },
  { value: 'transfer_to_crew', label: 'Передача другой бригаде' },
  { value: 'repair', label: 'Ремонт или диагностика' },
  { value: 'other', label: 'Другая причина' },
];

const urgencyOptions = [
  { value: 'normal', label: 'Обычный' },
  { value: 'high', label: 'Высокий' },
  { value: 'critical', label: 'Критический' },
];

const destinationOptions = [
  { value: 'warehouse', label: 'На склад' },
  { value: 'crew', label: 'Для бригады' },
];

const emptyPurchaseItem = () => ({
  asset_type: 'bi_kit',
  name: '',
  quantity: 1,
  unit: 'шт.',
});

export default function WarehouseRequestForm() {
  const { type, id: requestId } = useParams();
  const requestType = type === 'purchase' ? 'purchase' : 'movement';
  const isEditing = Boolean(requestId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { partner } = usePartner();
  const [assetCategory, setAssetCategory] = useState('');
  const [assetId, setAssetId] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [sourceCrew, setSourceCrew] = useState('');
  const [destinationType, setDestinationType] = useState(requestType === 'purchase' ? 'warehouse' : '');
  const [destinationCrew, setDestinationCrew] = useState('');
  const [movementReason, setMovementReason] = useState('return_after_work');
  const [movementReasonDetails, setMovementReasonDetails] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [comment, setComment] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([emptyPurchaseItem()]);
  const [urgency, setUrgency] = useState('normal');
  const [requiredDate, setRequiredDate] = useState('');
  const [purchaseReason, setPurchaseReason] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const initializedRequestId = useRef(null);

  const { data: existingRequest, isLoading: isRequestLoading } = useQuery({
    queryKey: ['equipment-request', requestId],
    queryFn: () => base44.entities.EquipmentRequest.get(requestId),
    enabled: isEditing,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', partner],
    queryFn: () => partner
      ? base44.entities.Asset.filter({ partner })
      : base44.entities.Asset.list(),
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.DrillingCrew.list(),
  });

  const selectedAsset = useMemo(
    () => assets.find(asset => String(asset.id) === String(assetId)),
    [assets, assetId]
  );

  const assetOptions = assets
    .filter(asset => !assetCategory || asset.asset_type === assetCategory)
    .map(asset => ({
      value: String(asset.id),
      label: `${asset.name}${asset.crew_number ? ` · Бригада №${asset.crew_number}` : ''}`,
    }));

  const crewOptions = crews
    .filter(crew => !partner || !crew.partner || crew.partner === partner)
    .map(crew => ({
      value: String(crew.crew_number),
      label: `Бригада №${crew.crew_number}${crew.field_name ? ` · ${crew.field_name}` : ''}`,
    }));

  const destinationCrewOptions = crewOptions.filter(
    crew => !(sourceType === 'crew' && String(crew.value) === String(sourceCrew))
  );

  const movementDestinationOptions = locationOptions.filter(option => {
    if (!sourceType) return true;
    if (option.value === 'crew') return true;
    return option.value !== sourceType;
  });

  const requesterName = currentUser?.full_name || currentUser?.name || currentUser?.email || 'Текущий пользователь';
  const isAdmin = currentUser?.role === 'admin';
  const reportRecipientEmail = localStorage.getItem('report_email') || '';
  const requestCreatorName = existingRequest?.requested_by_name || requesterName;
  const requestCreatorEmail = existingRequest?.requested_by_email || currentUser?.email || '';
  const recipientEmail = existingRequest?.recipient_email || reportRecipientEmail;

  useEffect(() => {
    if (!existingRequest || initializedRequestId.current === String(existingRequest.id)) return;

    if (existingRequest.request_type === 'movement') {
      setAssetCategory(existingRequest.asset_type || '');
      setAssetId(existingRequest.asset_id ? String(existingRequest.asset_id) : '');
      setSourceType(existingRequest.source_location_type || '');
      setSourceCrew(existingRequest.source_crew_number ? String(existingRequest.source_crew_number) : '');
      setMovementReason(
        existingRequest.reason_code
        || (movementReasons.some(item => item.value === existingRequest.reason) ? existingRequest.reason : 'other')
      );
      setMovementReasonDetails(
        existingRequest.reason_code === 'other' || !existingRequest.reason_code
          ? existingRequest.reason || ''
          : ''
      );
      setDesiredDate(existingRequest.desired_date ? String(existingRequest.desired_date).split('T')[0] : '');
    } else {
      setPurchaseItems(
        Array.isArray(existingRequest.items) && existingRequest.items.length
          ? existingRequest.items
          : [emptyPurchaseItem()]
      );
      setRequiredDate(existingRequest.desired_date ? String(existingRequest.desired_date).split('T')[0] : '');
      setPurchaseReason(existingRequest.reason || '');
      setEstimatedCost(existingRequest.estimated_cost == null ? '' : String(existingRequest.estimated_cost));
    }

    setDestinationType(existingRequest.destination_type || '');
    setDestinationCrew(existingRequest.destination_crew_number ? String(existingRequest.destination_crew_number) : '');
    setUrgency(existingRequest.urgency || 'normal');
    setComment(existingRequest.comment || '');
    initializedRequestId.current = String(existingRequest.id);
  }, [existingRequest]);

  const localRequestMode = import.meta.env.DEV || import.meta.env.VITE_REQUESTS_LOCAL_ONLY === 'true';

  const mutation = useMutation({
    mutationFn: async ({ data, submit }) => {
      if (!submit) {
        return isEditing
          ? base44.entities.EquipmentRequest.update(requestId, data)
          : base44.entities.EquipmentRequest.create(data);
      }

      const draftData = { ...data, status: 'draft' };
      const savedDraft = isEditing
        ? await base44.entities.EquipmentRequest.update(requestId, draftData)
        : await base44.entities.EquipmentRequest.create(draftData);
      const savedId = savedDraft?.id || requestId;
      const submittedData = {
        ...savedDraft,
        ...data,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        email_sent: !localRequestMode,
      };

      // На localhost не отправляем реальное письмо в рабочий почтовый ящик.
      if (!localRequestMode) await sendEquipmentRequestByEmail(submittedData);

      return base44.entities.EquipmentRequest.update(savedId, submittedData);
    },
    onSuccess: (saved, variables) => {
      queryClient.invalidateQueries({ queryKey: ['equipment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['localEquipmentRequests'] });
      toast.success(variables.submit
        ? localRequestMode
          ? 'Заявка отправлена и заблокирована. Письмо на localhost не отправлялось'
          : 'Заявка отправлена на email и заблокирована'
        : isEditing
        ? 'Изменения сохранены'
        : saved?._localPreview
          ? 'Заявка сохранена локально для проверки'
          : saved?._offline
            ? 'Заявка сохранена на устройстве'
            : 'Заявка сохранена');
      navigate('/warehouse/requests');
    },
    onError: (error, variables) => toast.error(
      variables?.submit
        ? `Заявка осталась черновиком: ${error.message || 'не удалось отправить письмо'}`
        : `Не удалось сохранить заявку: ${error.message || 'неизвестная ошибка'}`
    ),
  });

  const adminStatusMutation = useMutation({
    mutationFn: data => base44.entities.EquipmentRequest.adminUpdate(requestId, data),
    onSuccess: updated => {
      queryClient.setQueryData(['equipment-request', requestId], updated);
      queryClient.invalidateQueries({ queryKey: ['equipment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowCompleteConfirm(false);
      setShowRejectForm(false);
      setRejectionReason('');
      toast.success(updated.status === 'completed'
        ? 'Перемещение выполнено, местонахождение оборудования обновлено'
        : updated.status === 'rejected'
          ? 'Заявка отклонена'
          : 'Заявка принята в работу');
    },
    onError: error => toast.error(error.message || 'Не удалось изменить статус заявки'),
  });

  const purchaseApprovalMutation = useMutation({
    mutationFn: data => base44.entities.EquipmentRequest.purchaseApproval(requestId, data),
    onSuccess: updated => {
      queryClient.setQueryData(['equipment-request', requestId], updated);
      queryClient.invalidateQueries({ queryKey: ['equipment-requests'] });
      setShowRejectForm(false);
      setRejectionReason('');
      toast.success(updated.status === 'approved'
        ? 'Заявка согласована всеми участниками'
        : updated.status === 'rejected'
          ? 'Заявка отклонена'
          : 'Ваш этап согласован');
    },
    onError: error => toast.error(error.message || 'Не удалось согласовать заявку'),
  });

  const updatePurchaseItem = (index, patch) => {
    setPurchaseItems(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const removePurchaseItem = index => {
    setPurchaseItems(items => items.length === 1 ? items : items.filter((_, itemIndex) => itemIndex !== index));
  };

  const buildPayload = status => {
    if (requestType === 'movement') {
      return {
        request_type: 'movement',
        status,
        partner: partner || '',
        asset_id: selectedAsset?.id || existingRequest?.asset_id || null,
        asset_name: selectedAsset?.name || existingRequest?.asset_name || '',
        asset_type: selectedAsset?.asset_type || existingRequest?.asset_type || '',
        serial_number: selectedAsset?.serial_number || existingRequest?.serial_number || '',
        source_location_type: sourceType,
        source_crew_number: sourceType === 'crew' ? sourceCrew : '',
        destination_type: destinationType,
        destination_crew_number: destinationType === 'crew' ? destinationCrew : '',
        reason_code: movementReason,
        reason: movementReason === 'other'
          ? movementReasonDetails.trim()
          : movementReasons.find(item => item.value === movementReason)?.label || movementReason,
        desired_date: desiredDate || null,
        comment,
        urgency,
        requested_by_name: requestCreatorName,
        requested_by_email: requestCreatorEmail,
        requested_by_phone: currentUser?.phone || '',
      };
    }

    return {
      request_type: 'purchase',
      status,
      partner: partner || '',
      destination_type: destinationType,
      destination_crew_number: destinationType === 'crew' ? destinationCrew : '',
      items: purchaseItems.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 1,
      })),
      urgency,
      desired_date: requiredDate || null,
      reason: purchaseReason,
      estimated_cost: estimatedCost ? Number(String(estimatedCost).replace(',', '.')) : null,
      comment,
      requested_by_name: requestCreatorName,
      requested_by_email: requestCreatorEmail,
      requested_by_phone: currentUser?.phone || '',
      recipient_email: recipientEmail,
    };
  };

  const validate = status => {
    if (status === 'draft') return true;
    if (requestType === 'movement' && !selectedAsset && !existingRequest?.asset_id) {
      toast.error('Выберите оборудование');
      return false;
    }
    if (requestType === 'movement' && !sourceType) {
      toast.error('Выберите, откуда перемещается оборудование');
      return false;
    }
    if (requestType === 'movement' && sourceType === 'crew' && !sourceCrew) {
      toast.error('Выберите бригаду отправления');
      return false;
    }
    if (destinationType === 'crew' && !destinationCrew) {
      toast.error('Выберите бригаду назначения');
      return false;
    }
    if (requestType === 'movement') {
      if (!destinationType) {
        toast.error('Выберите пункт назначения');
        return false;
      }
      if (sourceType === destinationType && (sourceType !== 'crew' || String(sourceCrew) === String(destinationCrew))) {
        toast.error('Выберите другой пункт назначения');
        return false;
      }
      if (!desiredDate) {
        toast.error('Укажите желаемую дату');
        return false;
      }
      if (movementReason === 'other' && !movementReasonDetails.trim()) {
        toast.error('Уточните причину перемещения');
        return false;
      }
    }
    if (requestType === 'purchase') {
      if (purchaseItems.some(item => !item.name.trim() || Number(item.quantity) < 1)) {
        toast.error('Заполните наименование и количество каждой позиции');
        return false;
      }
      if (!purchaseReason.trim()) {
        toast.error('Укажите причину приобретения');
        return false;
      }
    }
    return true;
  };

  const save = (status, submit = false) => {
    if (!validate(status)) return;
    mutation.mutate({ data: buildPayload(status), submit });
  };

  const adminIdentity = {
    processed_by_id: currentUser?.id || null,
    processed_by_name: requesterName,
  };

  const acceptRequest = () => {
    adminStatusMutation.mutate({
      status: 'in_progress',
      ...adminIdentity,
      accepted_at: new Date().toISOString(),
    });
  };

  const completeMovement = () => {
    adminStatusMutation.mutate({
      status: 'completed',
      ...adminIdentity,
      completed_at: new Date().toISOString(),
    });
  };

  const rejectRequest = () => {
    if (!rejectionReason.trim()) {
      toast.error('Укажите причину отклонения');
      return;
    }
    adminStatusMutation.mutate({
      status: 'rejected',
      ...adminIdentity,
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason.trim(),
    });
  };

  const approvePurchase = () => {
    if (!nextPurchaseApprovalStep) return;
    purchaseApprovalMutation.mutate({
      step: nextPurchaseApprovalStep.key,
      decision: 'approve',
    });
  };

  const rejectPurchase = () => {
    if (!rejectionReason.trim()) {
      toast.error('Укажите причину отклонения');
      return;
    }
    if (!nextPurchaseApprovalStep) return;
    purchaseApprovalMutation.mutate({
      step: nextPurchaseApprovalStep.key,
      decision: 'reject',
      reason: rejectionReason.trim(),
    });
  };

  const existingStatus = existingRequest?.status || 'draft';
  const canSubmit = !isEditing || existingStatus === 'draft';
  const isLocked = isEditing && existingStatus !== 'draft';
  const purchaseApprovals = existingRequest?.purchase_approvals || {};
  const nextPurchaseApprovalStep = purchaseApprovalSteps.find(step => !purchaseApprovals[step.key]);
  const alreadyApprovedPurchase = Object.values(purchaseApprovals).some(
    approval => approval?.user_id != null && String(approval.user_id) === String(currentUser?.id)
  );
  const canApproveCurrentPurchaseStep = !alreadyApprovedPurchase && Boolean(
    nextPurchaseApprovalStep
    && (
      (nextPurchaseApprovalStep.key === 'admin' && isAdmin)
      || (nextPurchaseApprovalStep.key === 'service_manager' && currentUser?.position === SERVICE_MANAGER_POSITION)
      || (nextPurchaseApprovalStep.key === 'project_manager' && currentUser?.position === PROJECT_MANAGER_POSITION)
    )
  );

  if (isEditing && isRequestLoading) {
    return (
      <div className="min-h-full bg-background">
        <PageHeader title="Заявка" onBack={() => navigate('/warehouse/requests')} />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Загрузка заявки...
        </div>
      </div>
    );
  }

  if (isEditing && !existingRequest) {
    return (
      <div className="min-h-full bg-background">
        <PageHeader title="Заявка не найдена" onBack={() => navigate('/warehouse/requests')} />
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          Заявка была удалена или недоступна на этом устройстве.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background pb-6">
      <PageHeader
        title={requestTypeConfig[requestType].fullLabel}
        onBack={() => navigate(isEditing ? '/warehouse/requests' : '/warehouse')}
      />

      <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="w-4 h-4" />
          <span>{partner || 'Компания не выбрана'}</span>
          <span className="ml-auto rounded-full bg-muted px-2 py-1 text-xs">
            {isLocked
              ? requestStatusConfig[existingStatus]?.label || 'Отправлена'
              : isEditing
                ? 'Редактирование'
                : import.meta.env.DEV ? 'Локальная проверка' : 'Черновик'}
          </span>
        </div>

        {isLocked && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
            <LockKeyhole className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium flex items-center gap-1.5">
                <MailCheck className="w-4 h-4" /> Заявка отправлена
              </div>
              <p className="mt-1 text-xs opacity-80">
                {localRequestMode
                  ? 'Локальная проверка: письмо не отправлялось, заявка заблокирована как после отправки.'
                  : 'После отправки на email заявку можно только просматривать.'}
              </p>
            </div>
          </div>
        )}

        <fieldset disabled={isLocked} className="contents">
          {requestType === 'movement' ? (
          <>
            <FormSection icon={Package} title="Оборудование">
              <Field label="Категория *">
                <MobileSelect
                  value={assetCategory}
                  onValueChange={value => {
                    setAssetCategory(value);
                    setAssetId('');
                  }}
                  placeholder="Выберите категорию"
                  options={assetTypeOptions}
                  triggerClassName="h-11"
                />
              </Field>
              <Field label="Выберите оборудование *">
                <MobileSelect
                  value={assetId}
                  onValueChange={value => {
                    setAssetId(value);
                    setDestinationType('');
                    setDestinationCrew('');
                  }}
                  placeholder={assetCategory ? 'Выберите оборудование' : 'Сначала выберите категорию'}
                  options={assetOptions}
                  triggerClassName="h-11"
                  disabled={!assetCategory}
                />
              </Field>
              {selectedAsset && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{selectedAsset.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {selectedAsset.serial_number || 'Без серийного номера'} · {formatRequestLocation(selectedAsset.location_type, selectedAsset.crew_number)}
                    </div>
                  </div>
                </div>
              )}
            </FormSection>

            <FormSection icon={ArrowLeftRight} title="Маршрут">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Откуда *">
                  <MobileSelect
                    value={sourceType}
                    onValueChange={value => {
                      setSourceType(value);
                      setSourceCrew('');
                      setDestinationType('');
                      setDestinationCrew('');
                    }}
                    placeholder="Выберите отправление"
                    options={locationOptions}
                    triggerClassName="h-11"
                  />
                </Field>
                <Field label="Куда *">
                  <MobileSelect
                    value={destinationType}
                    onValueChange={value => { setDestinationType(value); setDestinationCrew(''); }}
                    placeholder="Выберите назначение"
                    options={movementDestinationOptions}
                    triggerClassName="h-11"
                  />
                </Field>
              </div>
              {sourceType === 'crew' && (
                <Field label="Бригада отправления *">
                  <MobileSelect
                    value={sourceCrew}
                    onValueChange={value => {
                      setSourceCrew(value);
                      if (String(value) === String(destinationCrew)) setDestinationCrew('');
                    }}
                    placeholder="Выберите бригаду"
                    options={crewOptions}
                    triggerClassName="h-11"
                  />
                </Field>
              )}
              {destinationType === 'crew' && (
                <Field label="Бригада назначения *">
                  <MobileSelect
                    value={destinationCrew}
                    onValueChange={setDestinationCrew}
                    placeholder="Выберите бригаду"
                    options={destinationCrewOptions}
                    triggerClassName="h-11"
                  />
                </Field>
              )}
              {sourceType && (sourceType !== 'crew' || sourceCrew) && destinationType && (destinationType !== 'crew' || destinationCrew) && (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Откуда</div>
                    <div className="text-sm font-medium mt-1 truncate">{formatRequestLocation(sourceType, sourceCrew)}</div>
                  </div>
                  <ArrowLeftRight className="w-5 h-5 text-primary" />
                  <div className="min-w-0 text-right">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Куда</div>
                    <div className="text-sm font-medium mt-1 truncate">{formatRequestLocation(destinationType, destinationCrew)}</div>
                  </div>
                </div>
              )}
            </FormSection>

            <FormSection icon={ClipboardList} title="Основание">
              <Field label="Причина перемещения *">
                <MobileSelect
                  value={movementReason}
                  onValueChange={setMovementReason}
                  placeholder="Выберите причину"
                  options={movementReasons}
                  triggerClassName="h-11"
                />
              </Field>
              {movementReason === 'other' && (
                <Field label="Уточните причину *">
                  <Input
                    value={movementReasonDetails}
                    onChange={event => setMovementReasonDetails(event.target.value)}
                    placeholder="Кратко опишите причину"
                    className="h-11"
                  />
                </Field>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Приоритет *">
                  <MobileSelect value={urgency} onValueChange={setUrgency} options={urgencyOptions} triggerClassName="h-11" />
                </Field>
                <Field label="Желаемая дата *">
                  <Input type="date" min={new Date().toISOString().split('T')[0]} value={desiredDate} onChange={event => setDesiredDate(event.target.value)} className="h-11" />
                </Field>
              </div>
              <Field label="Заявку создал">
                <div className="flex h-11 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm">
                  <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{requestCreatorName}</span>
                </div>
              </Field>
              {urgency === 'critical' && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  Критический приоритет используйте только при остановке работ или угрозе безопасности.
                </div>
              )}
              <Field label="Комментарий">
                <Textarea value={comment} onChange={event => setComment(event.target.value)} rows={3} placeholder="Дополнительная информация для склада" />
              </Field>
            </FormSection>
          </>
        ) : (
          <>
            <FormSection icon={Building2} title="Назначение">
              <Field label="Куда требуется *">
                <MobileSelect
                  value={destinationType}
                  onValueChange={value => { setDestinationType(value); setDestinationCrew(''); }}
                  placeholder="Выберите назначение"
                  options={destinationOptions}
                  triggerClassName="h-11"
                />
              </Field>
              {destinationType === 'crew' && (
                <Field label="Для какой бригады *">
                  <MobileSelect
                    value={destinationCrew}
                    onValueChange={setDestinationCrew}
                    placeholder="Выберите бригаду"
                    options={crewOptions}
                    triggerClassName="h-11"
                  />
                </Field>
              )}
            </FormSection>

            <FormSection icon={ShoppingCart} title="Позиции">
              {purchaseItems.map((item, index) => (
                <div key={index} className="rounded-xl border border-border bg-card p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Позиция {index + 1}</span>
                    {purchaseItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePurchaseItem(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Field label="Категория *">
                    <MobileSelect
                      value={item.asset_type}
                      onValueChange={value => updatePurchaseItem(index, { asset_type: value })}
                      placeholder="Выберите категорию"
                      options={assetTypeOptions}
                      triggerClassName="h-11"
                    />
                  </Field>
                  <Field label="Наименование и характеристики *">
                    <Input value={item.name} onChange={event => updatePurchaseItem(index, { name: event.target.value })} placeholder="Что необходимо приобрести" className="h-11" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Количество *">
                      <Input type="number" min="1" value={item.quantity} onChange={event => updatePurchaseItem(index, { quantity: event.target.value })} className="h-11" />
                    </Field>
                    <Field label="Единица">
                      <MobileSelect
                        value={item.unit}
                        onValueChange={value => updatePurchaseItem(index, { unit: value })}
                        options={[{ value: 'шт.', label: 'шт.' }, { value: 'компл.', label: 'компл.' }]}
                        triggerClassName="h-11"
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full h-11 border-dashed" onClick={() => setPurchaseItems(items => [...items, emptyPurchaseItem()])}>
                <Plus className="w-4 h-4 mr-2" /> Добавить позицию
              </Button>
            </FormSection>

            <FormSection icon={ClipboardList} title="Обоснование">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Приоритет *">
                  <MobileSelect value={urgency} onValueChange={setUrgency} options={urgencyOptions} triggerClassName="h-11" />
                </Field>
                <Field label="Требуется до">
                  <Input type="date" value={requiredDate} onChange={event => setRequiredDate(event.target.value)} className="h-11" />
                </Field>
              </div>
              <Field label="Заявку создал">
                <div className="flex h-11 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm">
                  <User className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{requestCreatorName}</span>
                </div>
              </Field>
              <Field label="Email получателя">
                <div className="flex h-11 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm">
                  <MailCheck className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{recipientEmail || 'Email отчётов, настроенный на сервере'}</span>
                </div>
              </Field>
              <Field label="Причина приобретения *">
                <Textarea value={purchaseReason} onChange={event => setPurchaseReason(event.target.value)} rows={3} placeholder="Для чего требуется оборудование" />
              </Field>
              <Field label="Ориентировочная стоимость">
                <Input inputMode="decimal" value={estimatedCost} onChange={event => setEstimatedCost(event.target.value)} placeholder="Если известна" className="h-11" />
              </Field>
              <Field label="Комментарий">
                <Textarea value={comment} onChange={event => setComment(event.target.value)} rows={3} placeholder="Дополнительная информация" />
              </Field>
            </FormSection>
          </>
          )}
        </fieldset>

        {requestType === 'purchase' && isEditing && existingStatus !== 'draft' && (
          <FormSection icon={ShieldCheck} title="Согласование заявки">
            <div className="space-y-2">
              {purchaseApprovalSteps.map((step, index) => {
                const approval = purchaseApprovals[step.key];
                const isCurrent = existingStatus === 'submitted' && nextPurchaseApprovalStep?.key === step.key;
                return (
                  <div
                    key={step.key}
                    className={`flex items-start gap-3 rounded-xl border p-3 ${
                      approval?.status === 'approved'
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : approval?.status === 'rejected'
                          ? 'border-red-500/30 bg-red-500/10'
                          : isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      approval?.status === 'approved'
                        ? 'bg-emerald-500 text-white'
                        : approval?.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {approval?.status === 'approved' ? '✓' : approval?.status === 'rejected' ? '×' : index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{step.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {approval
                          ? `${approval.user_name || 'Пользователь'} · ${formatAuditDate(approval.date)}`
                          : isCurrent ? 'Ожидает согласования' : 'После предыдущего этапа'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {existingStatus === 'approved' && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-5 h-5 shrink-0" /> Заявка согласована всеми тремя участниками.
              </div>
            )}

            {existingStatus === 'rejected' && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
                <div className="font-medium">Заявка отклонена</div>
                <div className="text-xs text-muted-foreground mt-1">{existingRequest.rejection_reason || 'Причина не указана'}</div>
              </div>
            )}

            {existingStatus === 'submitted' && nextPurchaseApprovalStep && (
              canApproveCurrentPurchaseStep ? (
                <div className="space-y-3">
                  <Button type="button" className="w-full h-12" onClick={approvePurchase} disabled={purchaseApprovalMutation.isPending}>
                    {purchaseApprovalMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Согласовать как «{nextPurchaseApprovalStep.label}»
                  </Button>
                  {!showRejectForm ? (
                    <Button type="button" variant="outline" className="w-full h-11 text-destructive border-destructive/40" onClick={() => setShowRejectForm(true)}>
                      <XCircle className="w-4 h-4 mr-2" /> Отклонить заявку
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-destructive/30 p-3 space-y-3">
                      <Field label="Причина отклонения *">
                        <Textarea value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} rows={3} placeholder="Объясните причину заявителю" />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="outline" onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}>Отмена</Button>
                        <Button type="button" variant="destructive" onClick={rejectPurchase} disabled={purchaseApprovalMutation.isPending}>Отклонить</Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Ожидается согласование: <strong className="text-foreground">{nextPurchaseApprovalStep.label}</strong>.
                  Войти и согласовать должен сотрудник с соответствующей должностью.
                </div>
              )
            )}
          </FormSection>
        )}

        {requestType === 'movement' && existingStatus === 'completed' && (
          <FormSection icon={CheckCircle2} title="Выполнение">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="font-semibold text-sm text-emerald-800 dark:text-emerald-200">Перемещение выполнено</div>
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <div>{formatRequestLocation(sourceType, sourceCrew)} → {formatRequestLocation(destinationType, destinationCrew)}</div>
                <div>Администратор: {existingRequest.processed_by_name || '—'}</div>
                <div>Дата: {formatAuditDate(existingRequest.completed_at)}</div>
              </div>
            </div>
          </FormSection>
        )}

        {requestType === 'movement' && existingStatus === 'rejected' && (
          <FormSection icon={XCircle} title="Заявка отклонена">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
              <div className="font-medium">{existingRequest.rejection_reason || 'Причина не указана'}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {existingRequest.processed_by_name || 'Администратор'} · {formatAuditDate(existingRequest.rejected_at)}
              </div>
            </div>
          </FormSection>
        )}

        {isAdmin && requestType === 'movement' && ['submitted', 'in_progress'].includes(existingStatus) && (
          <FormSection icon={ShieldCheck} title="Действия администратора">
            {existingStatus === 'submitted' ? (
              <Button
                type="button"
                className="w-full h-12"
                onClick={acceptRequest}
                disabled={adminStatusMutation.isPending}
              >
                {adminStatusMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                Принять в работу
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs">
                  Подтвердите, что оборудование фактически перемещено:<br />
                  <strong>{formatRequestLocation(sourceType, sourceCrew)} → {formatRequestLocation(destinationType, destinationCrew)}</strong>
                </div>
                {!showCompleteConfirm ? (
                  <Button
                    type="button"
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setShowCompleteConfirm(true)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Выполнить перемещение
                  </Button>
                ) : (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-3">
                    <div className="text-sm font-medium">Подтвердить выполнение?</div>
                    <div className="text-xs text-muted-foreground">
                      После подтверждения склад будет показывать новое местонахождение оборудования.
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCompleteConfirm(false)}>Отмена</Button>
                      <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={completeMovement} disabled={adminStatusMutation.isPending}>
                        {adminStatusMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Подтвердить
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!showRejectForm ? (
              <Button type="button" variant="outline" className="w-full h-11 text-destructive border-destructive/40" onClick={() => setShowRejectForm(true)}>
                <XCircle className="w-4 h-4 mr-2" /> Отклонить заявку
              </Button>
            ) : (
              <div className="rounded-xl border border-destructive/30 p-3 space-y-3">
                <Field label="Причина отклонения *">
                  <Textarea
                    value={rejectionReason}
                    onChange={event => setRejectionReason(event.target.value)}
                    rows={3}
                    placeholder="Объясните причину заявителю"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}>Отмена</Button>
                  <Button type="button" variant="destructive" onClick={rejectRequest} disabled={adminStatusMutation.isPending}>Отклонить</Button>
                </div>
              </div>
            )}
          </FormSection>
        )}

        {!isLocked && (
        <div className={`${canSubmit ? 'grid grid-cols-1 sm:grid-cols-2' : ''} gap-3 pt-1`}>
          <Button
            type="button"
            variant={canSubmit ? 'outline' : 'default'}
            className="h-12 w-full"
            onClick={() => save(isEditing ? existingStatus : 'draft')}
            disabled={mutation.isPending}
          >
            {mutation.isPending && !canSubmit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEditing ? 'Сохранить изменения' : 'Сохранить'}
          </Button>
          {canSubmit && (
            <Button type="button" className="h-12" onClick={() => save('submitted', true)} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Отправить заявку
            </Button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function FormSection({ icon: Icon, title, children }) {
  return (
    <section className="space-y-3 pb-5 border-b border-border last:border-b-0 last:pb-0">
      <h2 className="flex items-center gap-2 font-semibold text-sm">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function formatAuditDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
