import {
  LayoutDashboard, ShoppingCart, ReceiptText, ClipboardList, ChartNoAxesCombined,
  Package, ArrowLeftRight, ClipboardCheck, Truck, Users, Wallet, History,
  PackageCheck, Banknote, CalendarDays, CircleDollarSign, FileText, Boxes,
  TrendingUp, UserRound, Settings, Store, ShieldCheck, MonitorSmartphone,
  SlidersHorizontal, Cloud, LockKeyhole, Database, CreditCard, FilePlus2,
  Clock3, ChartLine, PackageSearch, ArrowDownLeft, ArrowUpRight, CircleCheck,
  BarChart3, Search, UserCog, Languages
} from 'lucide-react';

const label = (ar, en, fr) => ({ ar, en, fr });

export const dashboard = {
  id: 'dashboard',
  label: label('لوحة التحكم', 'Dashboard', 'Tableau de bord'),
  icon: LayoutDashboard,
};

export const sections = [
  { id: 'sales', label: label('البيع', 'Sales', 'Ventes'), icon: ShoppingCart, children: [
    { id: 'point-of-sale', label: label('نقطة البيع', 'Point of sale', 'Point de vente'), icon: ShoppingCart },
    { id: 'sales-history', label: label('مراجعة بونات البيع السابقة', 'Previous sales receipts', 'Anciens tickets de vente'), icon: ReceiptText },
  ]},
  { id: 'purchases', label: label('الشراء', 'Purchases', 'Achats'), icon: Truck, children: [
    { id: 'purchases-list', label: label('قائمة المشتريات', 'Purchase list', 'Liste des achats'), icon: ClipboardList },
    { id: 'business-analysis', label: label('دراسة المبيعات والمشتريات', 'Sales & purchase analysis', 'Analyse ventes et achats'), icon: ChartNoAxesCombined },
    { id: 'product-sales-history', label: label('تاريخ بيع منتج', 'Product sales history', 'Historique des ventes produit'), icon: History },
    { id: 'product-purchase-history', label: label('تاريخ شراء منتج', 'Product purchase history', 'Historique des achats produit'), icon: History },
  ]},
  { id: 'products', label: label('المنتجات', 'Products', 'Produits'), icon: Package, children: [
    { id: 'product-list', label: label('قائمة المنتجات', 'Product list', 'Liste des produits'), icon: Boxes },
    { id: 'product-movement', label: label('حركة المنتجات', 'Product movement', 'Mouvements des produits'), icon: ArrowLeftRight },
    { id: 'inventory', label: label('الجرد', 'Inventory count', 'Inventaire'), icon: ClipboardCheck },
  ]},
  { id: 'orders', label: label('الطلبات', 'Orders', 'Commandes'), icon: ClipboardList, children: [
    { id: 'order-new', label: label('طلب السلع', 'Order goods', 'Commander des articles'), icon: FilePlus2 },
    { id: 'orders-history', label: label('سجل الطلبات', 'Order history', 'Historique des commandes'), icon: History },
    { id: 'orders-pending', label: label('الطلبات قيد الانتظار', 'Pending orders', 'Commandes en attente'), icon: Clock3 },
    { id: 'receiving', label: label('استلام السلع', 'Receive goods', 'Réception des articles'), icon: PackageCheck },
  ]},
  { id: 'suppliers', label: label('الموردون', 'Suppliers', 'Fournisseurs'), icon: Truck, children: [
    { id: 'supplier-list', label: label('قائمة الموردين', 'Supplier list', 'Liste des fournisseurs'), icon: Users },
    { id: 'supplier-accounts', label: label('حسابات الموردين', 'Supplier accounts', 'Comptes fournisseurs'), icon: Wallet },
  ]},
  { id: 'customers', label: label('العملاء', 'Customers', 'Clients'), icon: Users, children: [
    { id: 'customer-list', label: label('قائمة العملاء', 'Customer list', 'Liste des clients'), icon: UserRound },
    { id: 'customer-accounts', label: label('حسابات العملاء', 'Customer accounts', 'Comptes clients'), icon: Wallet },
  ]},
  { id: 'daily-status', label: label('الحالة اليومية', 'Daily status', 'Situation journalière'), icon: CalendarDays, children: [
    { id: 'daily-summary', label: label('ملخص اليوم', 'Daily summary', 'Résumé du jour'), icon: ChartNoAxesCombined },
    { id: 'cash-movement', label: label('حركة الصندوق', 'Cash movements', 'Mouvements de caisse'), icon: ArrowLeftRight },
    { id: 'income-expenses', label: label('المداخيل والمصاريف', 'Income & expenses', 'Recettes et dépenses'), icon: CircleDollarSign },
    { id: 'invoice-summary', label: label('ملخص الفواتير', 'Invoice summary', 'Résumé des factures'), icon: FileText },
    { id: 'daily-stock', label: label('حركة المخزون اليومية', 'Daily stock movement', 'Mouvement de stock quotidien'), icon: Package },
    { id: 'day-close', label: label('إغلاق اليوم', 'Day closing', 'Clôture de journée'), icon: ClipboardCheck },
  ]},
  { id: 'statistics', label: label('الإحصائيات', 'Statistics', 'Statistiques'), icon: ChartNoAxesCombined, children: [
    { id: 'sales-statistics', label: label('إحصائيات المبيعات', 'Sales statistics', 'Statistiques des ventes'), icon: ChartLine },
    { id: 'purchase-statistics', label: label('إحصائيات المشتريات', 'Purchase statistics', 'Statistiques des achats'), icon: ShoppingCart },
    { id: 'product-statistics', label: label('إحصائيات المنتجات', 'Product statistics', 'Statistiques des produits'), icon: PackageSearch },
    { id: 'profit-analysis', label: label('الأرباح والهوامش', 'Profit & margins', 'Bénéfices et marges'), icon: TrendingUp },
    { id: 'customer-statistics', label: label('إحصائيات العملاء', 'Customer statistics', 'Statistiques clients'), icon: Users },
    { id: 'supplier-statistics', label: label('إحصائيات الموردين', 'Supplier statistics', 'Statistiques fournisseurs'), icon: Truck },
    { id: 'order-analysis', label: label('تحليل الطلبات', 'Order analysis', 'Analyse des commandes'), icon: ClipboardList },
    { id: 'period-comparison', label: label('المقارنة بين الفترات', 'Period comparison', 'Comparaison des périodes'), icon: BarChart3 },
  ]},
  { id: 'cash', label: label('الصندوق', 'Cash register', 'Caisse'), icon: Wallet, children: [
    { id: 'cash-summary', label: label('ملخص الصندوق', 'Cash summary', 'Résumé de caisse'), icon: Wallet },
    { id: 'receipts', label: label('المقبوضات', 'Receipts', 'Encaissements'), icon: ArrowDownLeft },
    { id: 'payments', label: label('المدفوعات', 'Payments', 'Décaissements'), icon: ArrowUpRight },
    { id: 'cash-transactions', label: label('حركة الصندوق', 'Cash transactions', 'Mouvements de caisse'), icon: ArrowLeftRight },
    { id: 'cash-opening-closing', label: label('فتح وإغلاق الصندوق', 'Open & close register', 'Ouverture et clôture'), icon: Banknote },
    { id: 'cash-history', label: label('سجل الصناديق', 'Register history', 'Historique des caisses'), icon: History },
  ]},
  { id: 'settings', label: label('الإعدادات', 'Settings', 'Paramètres'), icon: Settings, children: [
    { id: 'store-info', label: label('بيانات المتجر', 'Store profile', 'Profil du magasin'), icon: Store },
    { id: 'users-roles', label: label('المستخدمون والأدوار', 'Users & roles', 'Utilisateurs et rôles'), icon: UserCog },
    { id: 'permissions', label: label('الصلاحيات', 'Permissions', 'Autorisations'), icon: ShieldCheck },
    { id: 'devices-branches', label: label('الأجهزة والفروع', 'Devices & branches', 'Appareils et succursales'), icon: MonitorSmartphone },
    { id: 'preferences', label: label('التفضيلات والمظهر', 'Preferences & appearance', 'Préférences et apparence'), icon: SlidersHorizontal },
    { id: 'sync', label: label('المزامنة والاتصال', 'Sync & connectivity', 'Synchronisation et connexion'), icon: Cloud },
    { id: 'security', label: label('الأمان والوصول', 'Security & access', 'Sécurité et accès'), icon: LockKeyhole },
    { id: 'backup', label: label('النسخ الاحتياطي والاستعادة', 'Backup & restore', 'Sauvegarde et restauration'), icon: Database },
    { id: 'subscription', label: label('الاشتراك والترخيص', 'Subscription & license', 'Abonnement et licence'), icon: CreditCard },
  ]},
];
