import { useEffect } from "react";
import { useForm, Controller, DefaultValues, FieldValues, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodType, ZodTypeDef } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FieldType = "text" | "number" | "textarea" | "select" | "switch" | "date";

export interface FieldConfig<T> {
  name: Path<T>;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  colSpan?: 1 | 2;
  min?: number;
  step?: number;
  help?: string;
  prefix?: string;
}

interface FormDialogProps<T extends FieldValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldConfig<T>[];
  schema: ZodType<T, ZodTypeDef, unknown>;
  defaultValues: DefaultValues<T>;
  onSubmit: (values: T) => void;
  submitLabel?: string;
  size?: "md" | "lg" | "xl" | "2xl";
}

export function FormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  schema,
  defaultValues,
  onSubmit,
  submitLabel = "Save",
  size = "lg",
}: FormDialogProps<T>) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<T>({
    resolver: zodResolver(schema as never),
    defaultValues,
  });

  useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = handleSubmit((values) => {
    onSubmit(values as T);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size} className="max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const error = (errors as Record<string, { message?: string }>)[field.name as string];
            return (
              <div
                key={field.name as string}
                className={cn("flex flex-col gap-1.5", field.colSpan === 2 && "sm:col-span-2")}
              >
                <Label htmlFor={field.name as string}>{field.label}</Label>

                {field.type === "text" || field.type === "date" || field.type === "number" ? (
                  <div className="relative">
                    {field.prefix && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {field.prefix}
                      </span>
                    )}
                    <Input
                      id={field.name as string}
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      placeholder={field.placeholder}
                      min={field.min}
                      step={field.step}
                      className={cn(field.prefix && "pl-7")}
                      {...register(field.name, field.type === "number" ? { valueAsNumber: true } : {})}
                    />
                  </div>
                ) : field.type === "textarea" ? (
                  <Textarea id={field.name as string} placeholder={field.placeholder} {...register(field.name)} />
                ) : field.type === "select" ? (
                  <Controller
                    control={control}
                    name={field.name}
                    render={({ field: f }) => (
                      <Select value={(f.value as string) ?? ""} onValueChange={f.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={field.placeholder ?? "Select..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : field.type === "switch" ? (
                  <Controller
                    control={control}
                    name={field.name}
                    render={({ field: f }) => (
                      <div className="flex h-10 items-center gap-2">
                        <Switch checked={!!f.value} onCheckedChange={f.onChange} />
                        <span className="text-sm text-muted-foreground">{f.value ? "Active" : "Inactive"}</span>
                      </div>
                    )}
                  />
                ) : null}

                {field.help && !error && <p className="text-xs text-muted-foreground">{field.help}</p>}
                {error?.message && <p className="text-xs font-medium text-destructive">{error.message}</p>}
              </div>
            );
          })}

          <DialogFooter className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-2 gap-2 border-t border-border bg-card px-6 py-4 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
