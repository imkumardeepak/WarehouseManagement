import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "primary" | "info" | "success" | "warning" | "destructive";
  format?: (n: number) => string;
  hint?: string;
  delay?: number;
}

const toneClasses: Record<string, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  info: { bg: "bg-info/10", text: "text-info" },
  success: { bg: "bg-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-[hsl(32_90%_40%)]" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive" },
};

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => (format ? format(latest) : Math.round(latest).toLocaleString("en-IN")));
  useEffect(() => {
    const controls = animate(count, value, { duration: 0.9, ease: "easeOut" });
    return controls.stop;
  }, [value, count]);
  return <motion.span>{rounded}</motion.span>;
}

export function DashboardCard({ label, value, icon: Icon, tone = "primary", format, hint, delay = 0 }: DashboardCardProps) {
  const tc = toneClasses[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -3 }}
    >
      <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-elevated">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              <AnimatedNumber value={value} format={format} />
            </p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110", tc.bg)}>
            <Icon className={cn("h-5 w-5", tc.text)} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
