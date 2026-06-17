import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://eqjqotinlcpepcitpcps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxanFvdGlubGNwZXBjaXRwY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDMxMDEsImV4cCI6MjA5NjgxOTEwMX0.wsBl8KIcu6iJz-BKyUxkqDkn18-hqO6NV1606k5YJP8'
);

const hash = crypto.createHash('sha256').update('Test1234').digest('hex');

await supabase.from('users').delete().eq('manager_number', '0000');
const { data, error } = await supabase.from('users').insert([{
  name: 'テスト店長',
  manager_number: '0000',
  user_password: hash
}]).select('manager_number, name');

if (error) console.error('ERROR:', error.message);
else console.log('オーナーアカウント作成完了:', data[0].manager_number, data[0].name);
