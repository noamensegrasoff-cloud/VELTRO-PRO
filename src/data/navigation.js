import {
  House, ShoppingCart, PackageSearch, Package, Truck, Users,
  Wallet, ClipboardList, ChartNoAxesCombined, Settings, ReceiptText,
  Search, Boxes, FileSearch
} from 'lucide-react';

export const sections = [
  { id: 'home', label: 'الرئيسية', icon: House, color: 'turquoise', children: [
    { id: 'overview', label: 'ملخص النشاط', icon: ChartNoAxesCombined },
    { id: 'alerts', label: 'التنبيهات', icon: ClipboardList },
  ]},
  { id: 'sales', label: 'البيع', icon: ShoppingCart, color: 'turquoise', children: [
    { id: 'sales-screen', label: 'واجهة البيع', icon: ShoppingCart },
    { id: 'sales-history', label: 'بونات البيع السابقة', icon: ReceiptText },
  ]},
  { id: 'purchases', label: 'المشتريات', icon: PackageSearch, color: 'violet', children: [
    { id: 'purchase-new', label: 'بون شراء جديد', icon: ClipboardList },
    { id: 'sale-study', label: 'دراسة بيع منتج', icon: Search },
    { id: 'purchase-study', label: 'دراسة شراء منتج', icon: FileSearch },
  ]},
  { id: 'products', label: 'المنتجات', icon: Package, color: 'turquoise', children: [
    { id: 'product-new', label: 'إضافة منتج', icon: Package },
    { id: 'product-list', label: 'قائمة المنتجات', icon: Search },
    { id: 'stock', label: 'المخزون', icon: Boxes },
    { id: 'categories', label: 'التصنيفات', icon: ClipboardList },
  ]},
  { id: 'suppliers', label: 'الموردون', icon: Truck, color: 'violet', children: [
    { id: 'supplier-new', label: 'إضافة مورد', icon: Users },
    { id: 'supplier-list', label: 'قائمة الموردين', icon: Truck },
    { id: 'supplier-account', label: 'حساب المورد', icon: Wallet },
  ]},
  { id: 'customers', label: 'الزبائن', icon: Users, color: 'turquoise', children: [
    { id: 'customer-new', label: 'إضافة زبون', icon: Users },
    { id: 'customer-list', label: 'قائمة الزبائن', icon: Search },
    { id: 'customer-account', label: 'حساب الزبون', icon: Wallet },
  ]},
  { id: 'cash', label: 'الصندوق', icon: Wallet, color: 'violet', children: [
    { id: 'safe', label: 'الخزنة', icon: Wallet },
    { id: 'cashiers', label: 'محاسبة الكاشير', icon: Users },
    { id: 'expenses', label: 'المصاريف', icon: ReceiptText },
    { id: 'debts', label: 'تسديد الديون', icon: ClipboardList },
    { id: 'cash-moves', label: 'حركات الصندوق', icon: ChartNoAxesCombined },
    { id: 'closing', label: 'الجرد والإقفال', icon: FileSearch },
  ]},
  { id: 'orders', label: 'الطلبات', icon: ClipboardList, color: 'turquoise', children: [
    { id: 'order-new', label: 'طلب شراء جديد', icon: ClipboardList },
    { id: 'orders-active', label: 'الطلبات الجارية', icon: Truck },
    { id: 'orders-history', label: 'سجل الطلبات', icon: ReceiptText },
    { id: 'receiving', label: 'استلام الطلبات', icon: Package },
  ]},
  { id: 'reports', label: 'التقارير', icon: ChartNoAxesCombined, color: 'violet', children: [
    { id: 'sales-report', label: 'تقرير المبيعات', icon: ChartNoAxesCombined },
    { id: 'profit-report', label: 'تقرير الأرباح', icon: Wallet },
    { id: 'purchase-report', label: 'تقرير المشتريات', icon: PackageSearch },
    { id: 'stock-report', label: 'تقرير المخزون', icon: Boxes },
    { id: 'cash-report', label: 'الصندوق والمصاريف', icon: Wallet },
    { id: 'debt-report', label: 'الديون والحسابات', icon: ReceiptText },
    { id: 'staff-report', label: 'الموظفون والكاشيرات', icon: Users },
    { id: 'operations-report', label: 'سجل العمليات', icon: FileSearch },
  ]},
  { id: 'settings', label: 'الإعدادات', icon: Settings, color: 'violet', children: [
    { id: 'store-settings', label: 'بيانات المتجر', icon: House },
    { id: 'users-settings', label: 'المستخدمون والصلاحيات', icon: Users },
    { id: 'devices-settings', label: 'الفروع والأجهزة', icon: Package },
    { id: 'print-settings', label: 'الطباعة والباركود', icon: ReceiptText },
    { id: 'appearance-settings', label: 'المظهر والتفضيلات', icon: Settings },
    { id: 'sync-settings', label: 'المزامنة والنسخ الاحتياطي', icon: ClipboardList },
    { id: 'subscription-settings', label: 'الاشتراك والأمان', icon: Wallet },
    { id: 'system-settings', label: 'إعدادات النظام', icon: PackageSearch },
  ]},
];