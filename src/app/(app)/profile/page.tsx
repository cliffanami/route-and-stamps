import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="p-6">
      <h1 className="text-xl">Profile</h1>
      <p>{user?.email}</p>
    </main>
  );
}
