import { supabase } from "@/lib/supabase";

export default async function TestPage() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*");

  return (
    <div>
      <h1>Supabase Test</h1>

      <pre>
        {JSON.stringify(
          {
            data,
            error,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}