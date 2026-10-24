import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, ShieldCheck, UserPlus, Search, RefreshCw, MoreHorizontal, Check,
  X, LockKeyhole, Activity, GitBranch, ClipboardCheck, MonitorSmartphone,
  Mail, Phone, ShieldAlert, Save, Plus, ChevronDown, Clock3, CircleCheck,
  CircleX, AlertTriangle
} from 'lucide-react';
import { supabase } from './lib/supabase.js';
import './employees-permissions.css';

const roleNames = {
  owner: { ar: 'المالك', fr: 'Propriétaire', en: 'Owner' },
  admin: { ar: 'مدير النظام', fr: 'Administrateur', en: 'Administrator' },
  manager: { ar: 'مدير المحل', fr: 'Responsable du magasin', en: 'Store manager' },
  cashier: { ar: 'أمين الصندوق', fr: 'Caissier', en: 'Cashier' },
  member: { ar: 'عامل', fr: 'Employé', en: 'Staff member' },
  viewer: { ar: 'مشاهد فقط', fr: 'Lecture seule', en: 'Read only' },
};
const permissionGroups = [
  { id: 'dashboard', ar: 'لوحة التحكم', fr: 'Tableau de bord', en: 'Dashboard', items: [['dashboard.view','عرض لوحة التحكم']] },
  { id: 'sales', ar: 'المبيعات ونقطة البيع', fr: 'Ventes et caisse', en: 'Sales & POS', items: [['sales.view','عرض فواتير البيع'],['sales.create','إنشاء فاتورة'],['sales.edit','تعديل فاتورة غير معتمدة'],['sales.void','إلغاء فاتورة معتمدة'],['sales.discount','تطبيق تخفيض'],['sales.price_override','تغيير سعر البيع'],['sales.return','إرجاع بضاعة']] },
  { id: 'cash', ar: 'الصندوق', fr: 'Caisse', en: 'Cash register', items: [['cash.view','عرض حركات الصندوق'],['cash.open_close','فتح وإغلاق الصندوق'],['cash.expense.create','تسجيل مصروف'],['cash.adjust','تعديل حركة مالية']] },
  { id: 'products', ar: 'المنتجات والمخزون', fr: 'Produits et stock', en: 'Products & inventory', items: [['products.view','عرض المنتجات'],['products.create','إضافة منتج'],['products.edit','تعديل المنتج'],['products.cost.view','عرض سعر التكلفة'],['products.price.edit','تعديل سعر البيع'],['inventory.adjust','تعديل المخزون'],['inventory.count','تنفيذ الجرد']] },
  { id: 'purchases', ar: 'المشتريات والموردون', fr: 'Achats et fournisseurs', en: 'Purchases & suppliers', items: [['purchases.view','عرض المشتريات'],['purchases.create','إنشاء فاتورة شراء'],['purchases.confirm','تأكيد استلام البضاعة'],['suppliers.manage','إدارة الموردين']] },
  { id: 'customers', ar: 'العملاء', fr: 'Clients', en: 'Customers', items: [['customers.view','عرض العملاء'],['customers.manage','إدارة بيانات العملاء'],['customers.debts.view','عرض ديون العملاء']] },
  { id: 'reports', ar: 'التقارير والبيانات المالية', fr: 'Rapports et finances', en: 'Reports & finance', items: [['reports.sales.view','تقرير المبيعات'],['reports.profit.view','عرض الأرباح'],['reports.export','تصدير التقارير'],['reports.staff.view','عرض أداء العمال']] },
  { id: 'admin', ar: 'الإدارة والأمان', fr: 'Administration et sécurité', en: 'Administration & security', items: [['employees.view','عرض العمال'],['audit.view','عرض سجل النشاطات'],['approvals.review','مراجعة طلبات الموافقة']] },
];
const allPermissionKeys = permissionGroups.flatMap(group => group.items.map(item => item[0]));
const defaultPermissions = {
  manager: ['dashboard.view','sales.view','sales.create','sales.edit','sales.discount','sales.return','cash.view','cash.open_close','cash.expense.create','products.view','products.create','products.edit','products.cost.view','products.price.edit','inventory.adjust','inventory.count','purchases.view','purchases.create','purchases.confirm','suppliers.manage','customers.view','customers.manage','customers.debts.view','reports.sales.view','reports.staff.view','employees.view','approvals.review'],
  cashier: ['dashboard.view','sales.view','sales.create','sales.edit','cash.view','cash.open_close','products.view','customers.view'],
  member: ['dashboard.view','sales.view','products.view'],
  viewer: ['dashboard.view','sales.view','products.view','purchases.view','customers.view','reports.sales.view'],
  admin: ['dashboard.view','sales.view','sales.create','sales.edit','sales.discount','sales.return','cash.view','cash.open_close','cash.expense.create','products.view','products.create','products.edit','products.cost.view','products.price.edit','inventory.adjust','inventory.count','purchases.view','purchases.create','purchases.confirm','suppliers.manage','customers.view','customers.manage','customers.debts.view','reports.sales.view','reports.profit.view','reports.export','reports.staff.view','employees.view','employees.manage','approvals.review','audit.view'],
};
const words = {
  ar: {
    title:'العمال والصلاحيات', subtitle:'تحكم دقيق في حسابات فريقك وما يمكن لكل شخص الوصول إليه.', employees:'العمال', roles:'الأدوار والصلاحيات', approvals:'الموافقات', activity:'سجل النشاطات', sessions:'جلسات الدخول', branches:'الفروع',
    add:'إضافة عامل', search:'ابحث بالاسم أو البريد الإلكتروني...', all:'كل الحالات', active:'نشط', invited:'بانتظار الدعوة', suspended:'موقوف', name:'العامل', email:'البريد الإلكتروني', role:'الدور', branch:'الفرع', status:'الحالة', lastActive:'آخر نشاط', actions:'إجراءات',
    loading:'جارٍ تحميل بيانات مساحة العمل…', noWorkspace:'لم يتم إعداد مساحة العمل بعد.', createWorkspace:'إنشاء مساحة العمل', loadError:'تعذر تحميل بيانات العمال. تحقق من تطبيق ترحيل قاعدة البيانات وسياسات الوصول.', refresh:'تحديث', noEmployees:'لا يوجد عمال مسجلون بعد.', inviteTitle:'دعوة عامل جديد', inviteHint:'ستُرسل دعوة آمنة إلى البريد الإلكتروني. لا تشارك كلمة مرور المالك.', fullName:'الاسم الكامل', phone:'رقم الهاتف', sendInvite:'إرسال الدعوة', cancel:'إلغاء', inviteSent:'تم إرسال الدعوة بنجاح.', save:'حفظ', roleName:'اسم الدور', description:'وصف الدور', createRole:'إنشاء دور مخصص', custom:'دور مخصص', chooseRole:'اختر الدور', saveRole:'حفظ الصلاحيات', roleSaved:'تم حفظ الدور وصلاحياته.', roleError:'تعذر حفظ التغييرات.', ownerOnly:'إدارة العمال والأدوار متاحة للمالك فقط.', noPermission:'لا تملك صلاحية تنفيذ هذا الإجراء.', permissionsHint:'فعّل الصلاحيات اللازمة فقط. لا يستطيع أي دور مخصص منح نفسه صلاحيات المالك.', chooseRoleHint:'اختر دورًا لمراجعة صلاحياته أو تعديله.', granted:'ممنوحة', denied:'غير ممنوحة', permission:'الصلاحية', operation:'العملية', target:'العنصر', time:'الوقت', actor:'منفذ العملية', noLogs:'لا توجد نشاطات مسجلة بعد.', noApprovals:'لا توجد طلبات موافقة.', noSessions:'لا توجد جلسات مسجلة.', noBranches:'لم تتم إضافة فروع بعد.', error:'حدث خطأ غير متوقع.', retry:'إعادة المحاولة', confirmSuspend:'هل تريد إيقاف هذا الحساب؟', suspendedDone:'تم إيقاف الحساب.', activeDone:'تم تفعيل الحساب.', pending:'قيد الانتظار', approved:'مقبول', rejected:'مرفوض', approve:'موافقة', reject:'رفض', systemRole:'دور أساسي', customRole:'دور مخصص', employeesCount:'إجمالي العمال', activeCount:'حسابات نشطة', rolesCount:'الأدوار المتاحة', waitingCount:'طلبات معلقة', saveFirst:'احفظ الدور أولًا لتتمكن من تعيينه للعمال.', emptyName:'يرجى إدخال اسم العامل والبريد الإلكتروني.', onlyOwner:'لا يمكن تعديل حساب المالك أو خفض صلاحياته من هذه الصفحة.'
  },
  fr: {
    title:'Employés et autorisations', subtitle:'Contrôlez les comptes de votre équipe et leurs accès.', employees:'Employés', roles:'Rôles et autorisations', approvals:'Approbations', activity:'Journal d’activité', sessions:'Sessions', branches:'Succursales',
    add:'Ajouter un employé', search:'Rechercher par nom ou e-mail…', all:'Tous les statuts', active:'Actif', invited:'Invitation en attente', suspended:'Suspendu', name:'Employé', email:'E-mail', role:'Rôle', branch:'Succursale', status:'Statut', lastActive:'Dernière activité', actions:'Actions',
    loading:'Chargement de l’espace de travail…', noWorkspace:'L’espace de travail n’est pas configuré.', createWorkspace:'Créer l’espace de travail', loadError:'Impossible de charger les employés. Vérifiez la migration et les règles d’accès.', refresh:'Actualiser', noEmployees:'Aucun employé pour le moment.', inviteTitle:'Inviter un employé', inviteHint:'Une invitation sécurisée sera envoyée par e-mail.', fullName:'Nom complet', phone:'Téléphone', sendInvite:'Envoyer l’invitation', cancel:'Annuler', inviteSent:'Invitation envoyée.', save:'Enregistrer', roleName:'Nom du rôle', description:'Description', createRole:'Créer un rôle personnalisé', custom:'Rôle personnalisé', chooseRole:'Choisir un rôle', saveRole:'Enregistrer les autorisations', roleSaved:'Rôle enregistré.', roleError:'Impossible d’enregistrer les modifications.', ownerOnly:'Seul le propriétaire peut gérer les employés et les rôles.', noPermission:'Vous ne pouvez pas effectuer cette action.', permissionsHint:'N’accordez que les autorisations nécessaires. Un rôle personnalisé ne peut pas devenir propriétaire.', chooseRoleHint:'Choisissez un rôle pour consulter ou modifier ses autorisations.', granted:'Accordé', denied:'Refusé', permission:'Autorisation', operation:'Opération', target:'Élément', time:'Heure', actor:'Auteur', noLogs:'Aucune activité enregistrée.', noApprovals:'Aucune demande d’approbation.', noSessions:'Aucune session enregistrée.', noBranches:'Aucune succursale ajoutée.', error:'Une erreur inattendue est survenue.', retry:'Réessayer', confirmSuspend:'Suspendre ce compte ?', suspendedDone:'Compte suspendu.', activeDone:'Compte activé.', pending:'En attente', approved:'Approuvé', rejected:'Refusé', approve:'Approuver', reject:'Refuser', systemRole:'Rôle système', customRole:'Rôle personnalisé', employeesCount:'Employés', activeCount:'Comptes actifs', rolesCount:'Rôles disponibles', waitingCount:'Demandes en attente', saveFirst:'Enregistrez le rôle avant de l’affecter.', emptyName:'Saisissez le nom et l’e-mail.', onlyOwner:'Le compte propriétaire ne peut pas être modifié ici.'
  },
  en: {
    title:'Employees & permissions', subtitle:'Control your team accounts and precisely define their access.', employees:'Employees', roles:'Roles & permissions', approvals:'Approvals', activity:'Activity log', sessions:'Sessions', branches:'Branches',
    add:'Add employee', search:'Search by name or email…', all:'All statuses', active:'Active', invited:'Invitation pending', suspended:'Suspended', name:'Employee', email:'Email', role:'Role', branch:'Branch', status:'Status', lastActive:'Last activity', actions:'Actions',
    loading:'Loading workspace…', noWorkspace:'Workspace is not configured yet.', createWorkspace:'Create workspace', loadError:'Could not load employees. Check that the database migration and access policies are applied.', refresh:'Refresh', noEmployees:'No employees have been added yet.', inviteTitle:'Invite a new employee', inviteHint:'A secure invitation will be sent by email. Never share the owner password.', fullName:'Full name', phone:'Phone number', sendInvite:'Send invitation', cancel:'Cancel', save:'Save', roleName:'Role name', description:'Role description', createRole:'Create custom role', custom:'Custom role', chooseRole:'Choose a role', saveRole:'Save permissions', roleSaved:'Role and permissions saved.', roleError:'Could not save changes.', ownerOnly:'Only the owner can manage employees and roles.', noPermission:'You are not allowed to perform this action.', permissionsHint:'Grant only necessary permissions. A custom role can never grant itself owner privileges.', chooseRoleHint:'Choose a role to review or edit its permissions.', granted:'Granted', denied:'Not granted', permission:'Permission', operation:'Operation', target:'Target', time:'Time', actor:'Actor', noLogs:'No activity recorded yet.', noApprovals:'No approval requests.', noSessions:'No sessions recorded.', noBranches:'No branches have been added.', error:'An unexpected error occurred.', retry:'Retry', confirmSuspend:'Suspend this account?', suspendedDone:'Account suspended.', activeDone:'Account activated.', pending:'Pending', approved:'Approved', rejected:'Rejected', approve:'Approve', reject:'Reject', systemRole:'System role', customRole:'Custom role', employeesCount:'Employees', activeCount:'Active accounts', rolesCount:'Available roles', waitingCount:'Pending approvals', saveFirst:'Save the role before assigning it to employees.', emptyName:'Enter employee name and email.', onlyOwner:'The owner account cannot be modified here.'
  }
};
const roleLabel = (role, lang) => roleNames[role]?.[lang] || roleNames.member[lang];
const errorText = (error) => error?.message || error?.details || error?.hint || 'Unknown error';

export default function EmployeesPermissions({ lang = 'ar', page = 'users-roles' }) {
  const t = words[lang] || words.ar;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const [tab, setTab] = useState(page === 'permissions' ? 'roles' : 'employees');
  const [workspace, setWorkspace] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [membership, setMembership] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [logs, setLogs] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [roleDraft, setRoleDraft] = useState({});
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [showRoleCreate, setShowRoleCreate] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name:'', email:'', phone:'', role:'cashier' });
  const [newRole, setNewRole] = useState({ name:'', description:'' });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isOwner = membership?.role === 'owner';
  const roleOptions = useMemo(() => [
    ...Object.keys(roleNames).map(id => ({ id, name: roleLabel(id, lang), is_system:true })),
    ...roles.map(role => ({ id: role.id, name: role.name, is_system:false })),
  ], [roles, lang]);
  const filteredEmployees = useMemo(() => employees.filter(employee => {
    const text = `${employee.full_name || ''} ${employee.email || ''}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (statusFilter === 'all' || employee.status === statusFilter);
  }), [employees, query, statusFilter]);

  const load = useCallback(async () => {
    if (!supabase) { setError(t.loadError); setLoading(false); return; }
    setLoading(true); setError(''); setNotice('');
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error('Please sign in first.');
      setCurrentUser(auth.user);
      const { data: memberships, error: memberError } = await supabase.from('workspace_members')
        .select('workspace_id,user_id,role,custom_role_id,created_at').eq('user_id', auth.user.id);
      if (memberError) throw memberError;
      let currentMembership = memberships?.[0] || null;
      let workspaceRow = null;
      if (currentMembership) {
        const { data, error: workspaceError } = await supabase.from('workspaces')
          .select('id,name,created_by,created_at').eq('id', currentMembership.workspace_id).maybeSingle();
        if (workspaceError) throw workspaceError;
        workspaceRow = data;
      } else {
        const { data: profile } = await supabase.auth.getUser();
        const business = profile?.user?.user_metadata?.business_profile || {};
        const { data, error: createError } = await supabase.from('workspaces')
          .insert({ name: business.storeName || 'VELTRO Workspace', created_by: auth.user.id })
          .select('id,name,created_by,created_at').single();
        if (createError) throw createError;
        workspaceRow = data;
        const { data: createdMember, error: createdMemberError } = await supabase.from('workspace_members')
          .select('workspace_id,user_id,role,custom_role_id,created_at').eq('workspace_id', data.id).eq('user_id', auth.user.id).single();
        if (createdMemberError) throw createdMemberError;
        currentMembership = createdMember;
      }
      setWorkspace(workspaceRow); setMembership(currentMembership);
      const wid = workspaceRow.id;
      const results = await Promise.all([
        supabase.from('workspace_members').select('workspace_id,user_id,role,custom_role_id,created_at').eq('workspace_id', wid),
        supabase.from('employee_profiles').select('*').eq('workspace_id', wid).order('created_at', { ascending:true }),
        supabase.from('workspace_roles').select('*').eq('workspace_id', wid).order('created_at', { ascending:true }),
        supabase.from('workspace_branches').select('*').eq('workspace_id', wid).order('created_at', { ascending:true }),
        supabase.from('workspace_audit_logs').select('*').eq('workspace_id', wid).order('created_at', { ascending:false }).limit(100),
        supabase.from('workspace_approval_requests').select('*').eq('workspace_id', wid).order('created_at', { ascending:false }).limit(100),
        supabase.from('workspace_sessions').select('*').eq('workspace_id', wid).is('revoked_at', null).order('last_seen_at', { ascending:false }).limit(100),
      ]);
      for (const result of results) if (result.error) throw result.error;
      const memberRows = results[0].data || [];
      const profileRows = results[1].data || [];
      const profileMap = new Map(profileRows.map(item => [item.user_id, item]));
      const memberList = memberRows.map(item => {
        const profile = profileMap.get(item.user_id) || {};
        return { ...profile, ...item, full_name:profile.full_name || (item.user_id === auth.user.id ? (auth.user.user_metadata?.full_name || auth.user.email) : '—'), email:profile.email || (item.user_id === auth.user.id ? auth.user.email : ''), status:profile.status || 'active' };
      });
      setEmployees(memberList); setRoles(results[2].data || []); setBranches(results[3].data || []);
      setLogs(results[4].data || []); setApprovals(results[5].data || []); setSessions(results[6].data || []);
      setSelectedRole(current => current || results[2].data?.[0]?.id || 'cashier');
    } catch (e) {
      setError(errorText(e));
    } finally { setLoading(false); }
  }, [t.loadError]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const chosen = roleOptions.find(role => role.id === selectedRole);
    if (!chosen) return;
    const role = roles.find(item => item.id === selectedRole);
    setRoleDraft(role ? { ...role.permissions } : Object.fromEntries(allPermissionKeys.map(key => [key, (defaultPermissions[selectedRole] || []).includes(key)])));
  }, [selectedRole, roleOptions, roles]);

  const writeAudit = async (action, entityType, entityId, details = {}) => {
    if (!workspace || !currentUser) return;
    const { error: auditError } = await supabase.from('workspace_audit_logs').insert({
      workspace_id: workspace.id, actor_user_id: currentUser.id, action, entity_type: entityType, entity_id: entityId ? String(entityId) : null, details
    });
    if (auditError) console.warn('Audit log append failed:', auditError.message);
  };

  async function createWorkspace() { await load(); }

  async function sendInvite(event) {
    event.preventDefault();
    if (!inviteForm.full_name.trim() || !inviteForm.email.trim()) { setError(t.emptyName); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('invite-workspace-member', {
        body: { workspace_id: workspace.id, email: inviteForm.email.trim(), full_name: inviteForm.full_name.trim(), phone: inviteForm.phone.trim(), role: inviteForm.role }
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      await writeAudit('employee.invite', 'employee', data?.user_id || inviteForm.email, { role: inviteForm.role });
      setShowInvite(false); setInviteForm({ full_name:'', email:'', phone:'', role:'cashier' }); setNotice(t.inviteSent);
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function createRole(event) {
    event.preventDefault();
    if (!newRole.name.trim() || !workspace) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: insertError } = await supabase.from('workspace_roles').insert({
        workspace_id:workspace.id, name:newRole.name.trim(), description:newRole.description.trim(),
        permissions:roleDraft, created_by:currentUser.id, is_system:false
      }).select('*').single();
      if (insertError) throw insertError;
      await writeAudit('role.create','role',data.id,{name:data.name});
      setRoles(old => [...old,data]); setSelectedRole(data.id); setShowRoleCreate(false); setNewRole({name:'',description:''}); setNotice(t.roleSaved);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function saveRole() {
    const role = roles.find(item => item.id === selectedRole);
    if (!role || !workspace) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: updateError } = await supabase.from('workspace_roles').update({
        permissions:roleDraft, updated_at:new Date().toISOString()
      }).eq('id',role.id).eq('workspace_id',workspace.id).select('*').single();
      if (updateError) throw updateError;
      await writeAudit('role.permissions.update','role',role.id,{permission_count:Object.values(roleDraft).filter(Boolean).length});
      setRoles(old => old.map(item => item.id === data.id ? data : item)); setNotice(t.roleSaved);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function changeEmployeeStatus(employee) {
    if (!isOwner || employee.role === 'owner' || employee.user_id === currentUser?.id) { setError(t.onlyOwner); return; }
    const action = employee.status === 'suspended' ? 'activate' : 'suspend';
    if (action === 'suspend' && !window.confirm(t.confirmSuspend)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-workspace-member', {
        body: { workspace_id: workspace.id, user_id: employee.user_id, action }
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      setNotice(action === 'activate' ? t.activeDone : t.suspendedDone);
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function setEmployeeRole(employee, roleId) {
    if (!isOwner || employee.role === 'owner' || employee.user_id === currentUser?.id) { setError(t.onlyOwner); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-workspace-member', {
        body: { workspace_id: workspace.id, user_id: employee.user_id, action: 'set_role', role: roleId }
      });
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      await writeAudit('employee.role.update','employee',employee.user_id,{role:roleId});
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function decideApproval(item, decision) {
    if (!workspace || !isOwner) return;
    setBusy(true); setError('');
    try {
      const { error: updateError } = await supabase.from('workspace_approval_requests').update({
        status:decision, approved_by:currentUser.id, decided_at:new Date().toISOString()
      }).eq('id',item.id).eq('workspace_id',workspace.id).eq('status','pending');
      if (updateError) throw updateError;
      await writeAudit('approval.'+decision,'approval',item.id,{action:item.action});
      await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  const tabs = [
    ['employees',Users,t.employees],['roles',ShieldCheck,t.roles],['approvals',ClipboardCheck,t.approvals],
    ['activity',Activity,t.activity],['sessions',MonitorSmartphone,t.sessions],['branches',GitBranch,t.branches],
  ];
  if (loading) return <section className="ep-page" dir={dir}><div className="ep-loading"><RefreshCw className="ep-spin"/><span>{t.loading}</span></div></section>;

  return <section className="ep-page" dir={dir} lang={lang}>
    <div className="ep-heading"><div><div className="ep-eyebrow"><ShieldCheck size={14}/><span>VELTRO / SECURITY CENTER</span></div><h1>{t.title}</h1><p>{t.subtitle}</p></div><button className="ep-button ep-button-quiet" onClick={load}><RefreshCw size={15}/>{t.refresh}</button></div>
    {error && <div className="ep-alert ep-alert-error"><AlertTriangle size={17}/><span>{error}</span><button onClick={()=>setError('')} aria-label="Close"><X size={15}/></button></div>}
    {notice && <div className="ep-alert ep-alert-success"><CircleCheck size={17}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Close"><X size={15}/></button></div>}
    <div className="ep-metrics">
      <article><span className="ep-metric-icon"><Users size={17}/></span><small>{t.employeesCount}</small><strong>{employees.length}</strong></article>
      <article><span className="ep-metric-icon green"><CircleCheck size={17}/></span><small>{t.activeCount}</small><strong>{employees.filter(item=>item.status==='active').length}</strong></article>
      <article><span className="ep-metric-icon violet"><ShieldCheck size={17}/></span><small>{t.rolesCount}</small><strong>{Object.keys(roleNames).length+roles.length}</strong></article>
      <article><span className="ep-metric-icon amber"><Clock3 size={17}/></span><small>{t.waitingCount}</small><strong>{approvals.filter(item=>item.status==='pending').length}</strong></article>
    </div>
    <nav className="ep-tabs">{tabs.map(([id,Icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={16}/><span>{label}</span>{id==='approvals'&&approvals.filter(item=>item.status==='pending').length>0&&<b>{approvals.filter(item=>item.status==='pending').length}</b>}</button>)}</nav>
    {tab==='employees' && <div className="ep-panel">
      <div className="ep-toolbar"><label className="ep-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/></label><select className="ep-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">{t.all}</option><option value="active">{t.active}</option><option value="invited">{t.invited}</option><option value="suspended">{t.suspended}</option></select><button className="ep-button ep-button-primary" onClick={()=>setShowInvite(true)} disabled={!isOwner}><UserPlus size={16}/>{t.add}</button></div>
      <div className="ep-table-wrap"><table className="ep-table"><thead><tr><th>{t.name}</th><th>{t.email}</th><th>{t.role}</th><th>{t.status}</th><th>{t.lastActive}</th><th>{t.actions}</th></tr></thead><tbody>
        {filteredEmployees.map(employee=><tr key={employee.user_id}><td><span className="ep-person"><i>{(employee.full_name||'?').slice(0,1).toUpperCase()}</i><span><b>{employee.full_name||'—'}</b><small>{employee.employee_code||employee.user_id.slice(0,8)}</small></span></span></td><td>{employee.email||'—'}</td><td><select className="ep-role-select" value={employee.custom_role_id||employee.role} disabled={!isOwner||employee.role==='owner'||employee.user_id===currentUser?.id||busy} onChange={event=>setEmployeeRole(employee,event.target.value)}>{roleOptions.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></td><td><span className={'ep-status '+employee.status}><i/>{t[employee.status]||employee.status}</span></td><td>{employee.user_id===currentUser?.id?'—':sessions.find(session=>session.user_id===employee.user_id)?.last_seen_at?new Date(sessions.find(session=>session.user_id===employee.user_id).last_seen_at).toLocaleString(lang):'—'}</td><td><button className="ep-icon-button" disabled={!isOwner||employee.role==='owner'||employee.user_id===currentUser?.id||busy} onClick={()=>changeEmployeeStatus(employee)} title={employee.status==='suspended'?t.active:t.suspended}>{employee.status==='suspended'?<Check size={16}/>:<LockKeyhole size={16}/>}</button></td></tr>)}
        {!filteredEmployees.length&&<tr><td colSpan="6"><div className="ep-empty"><Users size={24}/><span>{t.noEmployees}</span></div></td></tr>}
      </tbody></table></div>
    </div>}
    {tab==='roles' && <div className="ep-role-layout">
      <aside className="ep-panel ep-role-list"><div className="ep-panel-heading"><div><h2>{t.roles}</h2><p>{t.chooseRoleHint}</p></div><button className="ep-icon-button" disabled={!isOwner} onClick={()=>setShowRoleCreate(true)} title={t.createRole}><Plus size={17}/></button></div>
        {roleOptions.map(role=><button key={role.id} className={'ep-role-option '+(selectedRole===role.id?'selected':'')} onClick={()=>setSelectedRole(role.id)}><span className="ep-role-symbol"><ShieldCheck size={17}/></span><span><b>{role.name}</b><small>{role.is_system?t.systemRole:t.customRole}</small></span>{selectedRole===role.id&&<Check size={15}/>}</button>)}
      </aside>
      <div className="ep-panel ep-permissions-panel"><div className="ep-panel-heading"><div><h2>{roleOptions.find(role=>role.id===selectedRole)?.name||t.roles}</h2><p>{t.permissionsHint}</p></div>{roles.some(role=>role.id===selectedRole)&&<button className="ep-button ep-button-primary" onClick={saveRole} disabled={!isOwner||busy}><Save size={15}/>{t.saveRole}</button>}</div>
        {permissionGroups.map(group=><section className="ep-permission-group" key={group.id}><h3>{group[lang]||group.ar}</h3>{group.items.map(([key,label])=><label key={key} className="ep-permission-row"><span><b>{label}</b><small>{key}</small></span><input type="checkbox" checked={Boolean(roleDraft[key])} disabled={!isOwner||!roles.some(role=>role.id===selectedRole)||busy} onChange={event=>setRoleDraft(old=>({...old,[key]:event.target.checked}))}/></label>)}</section>)}
        {!roles.some(role=>role.id===selectedRole)&&<div className="ep-readonly-note"><LockKeyhole size={15}/>{t.systemRole} — {t.permissionsHint}</div>}
      </div>
    </div>}
    {tab==='approvals' && <div className="ep-panel"><div className="ep-panel-heading"><div><h2>{t.approvals}</h2><p>{t.permissionsHint}</p></div></div><div className="ep-list">{approvals.map(item=><article key={item.id} className="ep-list-row"><span className="ep-list-icon"><ClipboardCheck size={17}/></span><div><b>{item.action}</b><small>{item.reason||item.entity_type} · {new Date(item.created_at).toLocaleString(lang)}</small></div><span className={'ep-status '+item.status}>{t[item.status]||item.status}</span>{item.status==='pending'&&isOwner&&<div className="ep-row-actions"><button onClick={()=>decideApproval(item,'approved')} disabled={busy} title={t.approve}><Check size={15}/></button><button onClick={()=>decideApproval(item,'rejected')} disabled={busy} title={t.reject}><X size={15}/></button></div>}</article>)}{!approvals.length&&<div className="ep-empty"><ClipboardCheck size={24}/><span>{t.noApprovals}</span></div>}</div></div>}
    {tab==='activity' && <div className="ep-panel"><div className="ep-panel-heading"><div><h2>{t.activity}</h2><p>{t.permissionsHint}</p></div></div><div className="ep-list">{logs.map(item=><article key={item.id} className="ep-list-row"><span className="ep-list-icon"><Activity size={17}/></span><div><b>{item.action}</b><small>{item.entity_type}{item.entity_id?' · '+item.entity_id:''} · {new Date(item.created_at).toLocaleString(lang)}</small></div><span className="ep-list-meta">{item.actor_user_id===currentUser?.id?(currentUser.email||'You'):item.actor_user_id?.slice(0,8)}</span></article>)}{!logs.length&&<div className="ep-empty"><Activity size={24}/><span>{t.noLogs}</span></div>}</div></div>}
    {tab==='sessions' && <div className="ep-panel"><div className="ep-panel-heading"><div><h2>{t.sessions}</h2><p>{t.permissionsHint}</p></div></div><div className="ep-list">{sessions.map(item=><article key={item.id} className="ep-list-row"><span className="ep-list-icon"><MonitorSmartphone size={17}/></span><div><b>{item.device_label||item.device_id||'Device'}</b><small>{item.user_id.slice(0,8)} · {new Date(item.last_seen_at).toLocaleString(lang)}</small></div><span className="ep-status active">{t.active}</span></article>)}{!sessions.length&&<div className="ep-empty"><MonitorSmartphone size={24}/><span>{t.noSessions}</span></div>}</div></div>}
    {tab==='branches' && <div className="ep-panel"><div className="ep-panel-heading"><div><h2>{t.branches}</h2><p>{t.permissionsHint}</p></div></div><div className="ep-list">{branches.map(item=><article key={item.id} className="ep-list-row"><span className="ep-list-icon"><GitBranch size={17}/></span><div><b>{item.name}</b><small>{item.code||item.address||'—'}</small></div><span className={'ep-status '+(item.is_active?'active':'suspended')}>{item.is_active?t.active:t.suspended}</span></article>)}{!branches.length&&<div className="ep-empty"><GitBranch size={24}/><span>{t.noBranches}</span></div>}</div></div>}
    {showInvite&&<div className="ep-modal-backdrop"><form className="ep-modal" onSubmit={sendInvite}><button type="button" className="ep-modal-close" onClick={()=>setShowInvite(false)}><X size={17}/></button><span className="ep-modal-icon"><UserPlus size={21}/></span><h2>{t.inviteTitle}</h2><p>{t.inviteHint}</p><label>{t.fullName}<input required value={inviteForm.full_name} onChange={e=>setInviteForm(old=>({...old,full_name:e.target.value}))}/></label><label>{t.email}<input required type="email" value={inviteForm.email} onChange={e=>setInviteForm(old=>({...old,email:e.target.value}))}/></label><label>{t.phone}<input value={inviteForm.phone} onChange={e=>setInviteForm(old=>({...old,phone:e.target.value}))}/></label><label>{t.role}<select value={inviteForm.role} onChange={e=>setInviteForm(old=>({...old,role:e.target.value}))}>{Object.keys(roleNames).filter(role=>role!=='owner'&&role!=='admin').map(role=><option value={role} key={role}>{roleLabel(role,lang)}</option>)}{roles.map(role=><option value={role.id} key={role.id}>{role.name}</option>)}</select></label><div className="ep-modal-actions"><button type="button" className="ep-button ep-button-quiet" onClick={()=>setShowInvite(false)}>{t.cancel}</button><button type="submit" className="ep-button ep-button-primary" disabled={busy}><Mail size={15}/>{t.sendInvite}</button></div></form></div>}
    {showRoleCreate&&<div className="ep-modal-backdrop"><form className="ep-modal" onSubmit={createRole}><button type="button" className="ep-modal-close" onClick={()=>setShowRoleCreate(false)}><X size={17}/></button><span className="ep-modal-icon"><ShieldCheck size={21}/></span><h2>{t.createRole}</h2><label>{t.roleName}<input required value={newRole.name} onChange={e=>setNewRole(old=>({...old,name:e.target.value}))}/></label><label>{t.description}<input value={newRole.description} onChange={e=>setNewRole(old=>({...old,description:e.target.value}))}/></label><div className="ep-modal-actions"><button type="button" className="ep-button ep-button-quiet" onClick={()=>setShowRoleCreate(false)}>{t.cancel}</button><button type="submit" className="ep-button ep-button-primary" disabled={busy}><Plus size={15}/>{t.createRole}</button></div></form></div>}
  </section>;
}
