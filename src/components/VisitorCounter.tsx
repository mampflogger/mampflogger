import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VisitorCounter = () => {
  const [count, setCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const increment = async () => {
      const { data, error } = await supabase.rpc("increment_visitor_count");
      if (!error && data) {
        setCount(Number(data));
      }
    };
    increment();
  }, []);

  useEffect(() => {
    const channel = supabase.channel("online-users", {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col items-start gap-0.5">
      {onlineCount > 0 && (
        <p className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {onlineCount} gerade online
        </p>
      )}
      {count !== null && (
        <p className="text-[11px] text-muted-foreground tabular-nums">
          👀 {count.toLocaleString("de-DE")} Besucher gesamt
        </p>
      )}
    </div>
  );
};

export default VisitorCounter;
