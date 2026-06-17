import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://eqjqotinlcpepcitpcps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxanFvdGlubGNwZXBjaXRwY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDMxMDEsImV4cCI6MjA5NjgxOTEwMX0.wsBl8KIcu6iJz-BKyUxkqDkn18-hqO6NV1606k5YJP8'
);

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const hashedPass = hashPassword('Test1234');

// 既存のテストユーザーを削除してから再作成
await supabase.from('users').delete().in('manager_number', ['0001','1001','1002','1003','1004','1005','1006','1007','1008','1009','1010']);

const users = [
  { name: 'テスト店長', manager_number: '0001', user_password: hashedPass },
  { name: 'アルバイト01', manager_number: '1001', user_password: hashedPass },
  { name: 'アルバイト02', manager_number: '1002', user_password: hashedPass },
  { name: 'アルバイト03', manager_number: '1003', user_password: hashedPass },
  { name: 'アルバイト04', manager_number: '1004', user_password: hashedPass },
  { name: 'アルバイト05', manager_number: '1005', user_password: hashedPass },
  { name: 'アルバイト06', manager_number: '1006', user_password: hashedPass },
  { name: 'アルバイト07', manager_number: '1007', user_password: hashedPass },
  { name: 'アルバイト08', manager_number: '1008', user_password: hashedPass },
  { name: 'アルバイト09', manager_number: '1009', user_password: hashedPass },
  { name: 'アルバイト10', manager_number: '1010', user_password: hashedPass },
];

const { data, error } = await supabase.from('users').insert(users).select('manager_number, name');
if (error) {
  console.error('ERROR:', error.message);
} else {
  console.log('ユーザー作成完了:');
  data.forEach(u => console.log(`  ${u.manager_number}: ${u.name}`));
}
