import { genId } from '@/lib/offlineDb';
import { saveLocalAssetLocationOverride } from '@/lib/localAssetOverrides';
import { purchaseApprovalSteps } from '@/lib/warehouseRequests';
import { PROJECT_MANAGER_POSITION, SERVICE_MANAGER_POSITION } from '@/lib/userPositions';

const STORAGE_KEY = 'scab_local_equipment_requests_preview';

function readRequests() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRequests(requests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

function currentUserEmail() {
  try {
    return JSON.parse(localStorage.getItem('cached_user') || '{}')?.email || '';
  } catch {
    return '';
  }
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('cached_user') || '{}');
  } catch {
    return {};
  }
}

function canApprovePurchaseStep(user, stepKey) {
  if (stepKey === 'admin') return user.role === 'admin';
  if (stepKey === 'service_manager') return user.position === SERVICE_MANAGER_POSITION;
  if (stepKey === 'project_manager') return user.position === PROJECT_MANAGER_POSITION;
  return false;
}

export const localEquipmentRequestClient = {
  list: async () => readRequests().sort((a, b) => String(b.created_date).localeCompare(String(a.created_date))),

  filter: async (filters = {}) => {
    let result = readRequests();
    for (const [key, value] of Object.entries(filters)) {
      result = result.filter(item => String(item[key] ?? '') === String(value ?? ''));
    }
    return result.sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)));
  },

  get: async id => readRequests().find(item => String(item.id) === String(id)) || null,

  create: async data => {
    const now = new Date().toISOString();
    const request = {
      ...data,
      id: data.id || genId(),
      request_number: `LOCAL-${Date.now().toString().slice(-6)}`,
      created_by_email: currentUserEmail(),
      created_date: now,
      updated_date: now,
      _localPreview: true,
    };
    writeRequests([request, ...readRequests()]);
    return request;
  },

  update: async (id, data) => {
    let updated = null;
    const requests = readRequests().map(item => {
      if (String(item.id) !== String(id)) return item;
      if (item.status && item.status !== 'draft') {
        throw new Error('Отправленную заявку нельзя редактировать');
      }
      updated = { ...item, ...data, updated_date: new Date().toISOString(), _localPreview: true };
      return updated;
    });
    writeRequests(requests);
    return updated;
  },

  adminUpdate: async (id, data) => {
    let updated = null;
    const requests = readRequests().map(item => {
      if (String(item.id) !== String(id)) return item;

      const transitions = {
        submitted: ['in_progress', 'rejected'],
        in_progress: ['completed', 'rejected'],
      };
      if (!transitions[item.status]?.includes(data.status)) {
        throw new Error('Недопустимое изменение статуса заявки');
      }

      updated = { ...item, ...data, updated_date: new Date().toISOString(), _localPreview: true };
      return updated;
    });

    if (!updated) throw new Error('Заявка не найдена');
    writeRequests(requests);

    if (updated.status === 'completed' && updated.request_type === 'movement' && updated.asset_id) {
      saveLocalAssetLocationOverride(
        updated.asset_id,
        updated.destination_type,
        updated.destination_crew_number,
        updated.id
      );
    }

    return updated;
  },

  purchaseApproval: async (id, data) => {
    const user = currentUser();
    let updated = null;
    const requests = readRequests().map(item => {
      if (String(item.id) !== String(id)) return item;
      if (item.request_type !== 'purchase' || item.status !== 'submitted') {
        throw new Error('Эта заявка недоступна для согласования');
      }

      const approvals = item.purchase_approvals || {};
      const nextStep = purchaseApprovalSteps.find(step => !approvals[step.key]);
      if (!nextStep || nextStep.key !== data.step || !canApprovePurchaseStep(user, nextStep.key)) {
        throw new Error('У вас нет права согласовать этот этап');
      }
      if (Object.values(approvals).some(approval => approval?.user_id != null && String(approval.user_id) === String(user.id))) {
        throw new Error('Каждый этап должен согласовать отдельный сотрудник');
      }

      const now = new Date().toISOString();
      const approval = {
        status: data.decision === 'reject' ? 'rejected' : 'approved',
        user_id: user.id || null,
        user_name: user.full_name || user.name || user.email || 'Пользователь',
        position: user.position || (user.role === 'admin' ? 'Администратор' : ''),
        date: now,
        reason: data.reason || '',
      };
      const nextApprovals = { ...approvals, [nextStep.key]: approval };
      const allApproved = purchaseApprovalSteps.every(step => nextApprovals[step.key]?.status === 'approved');

      updated = {
        ...item,
        purchase_approvals: nextApprovals,
        status: data.decision === 'reject' ? 'rejected' : allApproved ? 'approved' : 'submitted',
        rejection_reason: data.decision === 'reject' ? data.reason : item.rejection_reason,
        updated_date: now,
        _localPreview: true,
      };
      return updated;
    });

    if (!updated) throw new Error('Заявка не найдена');
    writeRequests(requests);
    return updated;
  },

  delete: async id => {
    writeRequests(readRequests().filter(item => String(item.id) !== String(id)));
    return { success: true };
  },
};
