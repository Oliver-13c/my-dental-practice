import { redirect } from 'next/navigation';

export default function LegacyAdminCreateUserPage() {
  redirect('/admin/users/create');
}
