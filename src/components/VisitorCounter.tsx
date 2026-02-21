import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VisitorCounter = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const increment = async () => {
      const { data, error } = await supabase.rpc("increment_visitor_count");
      if (!error && data) {
        setCount(Number(data));
      }
    };
    increment();
  }, []);

  if (count === null) return null;

  return (
    <p className="text-[11px] text-muted-foreground tabular-nums">
      👀 {count.toLocaleString("de-DE")} Besucher
    </p>
  );
};

export default VisitorCounter;
