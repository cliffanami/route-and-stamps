import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1>Profile</h1>
      <p className="text-muted">{user?.email}</p>
      <ProfileForm />
    </main>
  );
}
