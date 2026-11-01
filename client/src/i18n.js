import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = { app_name:'DebtBook', dashboard:'Dashboard', add_debt:'Add New Debt',
  debt_list:'Debt List', logout:'Logout', login:'Login', register:'Register',
  email:'Email', password:'Password', name:'Name', customer_name:'Customer Name',
  customer_phone:'Customer Phone', product_name:'Product Name', product_price:'Product Price',
  date_issued:'Date Issued', due_date:'Due Date', repayment_period:'Repayment Period',
  short:'Short', long:'Long', status:'Status', unpaid:'Unpaid', partial:'Partial',
  paid:'Paid', mark_paid:'Mark as Paid', add_payment:'Add Payment', amount_paid:'Amount Paid',
  total_debt:'Total Debt', paid_debts:'Paid Debts', pending_debts:'Pending Debts',
  overdue_debts:'Overdue Debts', total_customers:'Total Customers', save:'Save',
  search:'Search', language:'Language' };

const rw = { app_name:'DebtBook', dashboard:'Ahabanza', add_debt:'Andika ideni rishya',
  debt_list:"Urutonde rw'amadeni", logout:'Sohoka', login:'Injira', register:'Kwiyandikisha',
  email:'Imeyili', password:"Ijambo ry'ibanga", name:'Izina', customer_name:"Izina ry'umukiriya",
  customer_phone:"Telefoni y'umukiriya", product_name:"Izina ry'igicuruzwa",
  product_price:"Igiciro cy'igicuruzwa", date_issued:'Itariki yatanzweho',
  due_date:'Itariki yo kwishyura', repayment_period:'Igihe cyo kwishyura',
  short:'Kigufi', long:'Kirekire', status:'Imimerere', unpaid:'Ntibirishyurwa',
  partial:'Byishyuwe igice', paid:'Byishyuwe', mark_paid:'Emeza ko byishyuwe',
  add_payment:'Ongeraho ubwishyu', amount_paid:'Amafaranga yishyuwe',
  total_debt:'Umwenda wose', paid_debts:'Amadeni yishyuwe',
  pending_debts:'Amadeni atarishyurwa', overdue_debts:'Amadeni yarengeje igihe',
  total_customers:'Abakiriya bose', save:'Bika', search:'Shakisha', language:'Ururimi' };

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, rw: { translation: rw } },
  lng: localStorage.getItem('lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});
i18n.on('languageChanged', l => localStorage.setItem('lang', l));
export default i18n;