import { useMemo, useState } from "react";
import { FieldValues } from "react-hook-form";
import { ZodType, ZodTypeDef } from "zod";
import { Plus, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Crumb } from "./PageHeader";
import { DataTable, Column } from "./DataTable";
import { FormDialog, FieldConfig } from "./FormDialog";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { DetailDialog, DetailRow } from "./DetailDialog";
import { RowActions } from "./RowActions";
import { useWms } from "@/store/WmsContext";
import { useToast } from "@/components/ui/toast";
import { buildLookups, Lookups } from "@/store/selectors";
import { WmsState } from "@/types";

type MasterKey =
  | "categories"
  | "units"
  | "items"
  | "warehouses"
  | "locations"
  | "suppliers"
  | "customers";

interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface MasterConfig<T extends BaseRecord, F extends FieldValues> {
  collectionKey: MasterKey;
  title: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  breadcrumbs?: Crumb[];
  schema: ZodType<F, ZodTypeDef, unknown>;
  fields: (state: WmsState, lookups: Lookups) => FieldConfig<F>[];
  emptyForm: (state: WmsState) => F;
  toForm: (record: T) => F;
  toRecord: (values: F, existing: T | null) => T;
  columns: (lookups: Lookups) => Column<T>[];
  searchText: (record: T, lookups: Lookups) => string;
  csvFilename: string;
  detail: (record: T, lookups: Lookups) => DetailRow[];
  formSize?: "md" | "lg" | "xl" | "2xl";
  canDelete?: (record: T, state: WmsState) => string | null;
}

export function MasterPage<T extends BaseRecord, F extends FieldValues>({
  config,
}: {
  config: MasterConfig<T, F>;
}) {
  const { state, saveMaster, deleteMaster } = useWms();
  const toast = useToast();
  const lookups = useMemo(() => buildLookups(state), [state]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [viewing, setViewing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const list = state[config.collectionKey] as unknown as T[];

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (record: T) => {
    setEditing(record);
    setFormOpen(true);
  };

  const handleSubmit = (values: F) => {
    const record = config.toRecord(values, editing);
    saveMaster(config.collectionKey, record as never);
    toast.success(
      editing ? `${config.singular} updated` : `${config.singular} created`,
      editing ? `${config.singular} details have been saved.` : `A new ${config.singular.toLowerCase()} has been added.`,
    );
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const reason = config.canDelete?.(deleting, state);
    if (reason) {
      toast.error("Cannot delete", reason);
      return;
    }
    deleteMaster(config.collectionKey, deleting.id);
    toast.success(`${config.singular} deleted`, `The ${config.singular.toLowerCase()} has been removed.`);
  };

  const columns = useMemo<Column<T>[]>(() => {
    const base = config.columns(lookups);
    return [
      ...base,
      {
        id: "actions",
        header: "",
        headerClassName: "w-12",
        className: "text-right",
        accessor: (row) => (
          <RowActions
            onView={() => setViewing(row)}
            onEdit={() => openEdit(row)}
            onDelete={() => setDeleting(row)}
          />
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookups]);

  const fields = useMemo(() => config.fields(state, lookups), [state, lookups, config]);
  const defaultValues = (editing ? config.toForm(editing) : config.emptyForm(state)) as F;

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        breadcrumbs={config.breadcrumbs}
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add {config.singular}
          </Button>
        }
      />

      <DataTable<T>
        columns={columns}
        data={list}
        rowKey={(r) => r.id}
        searchText={(r) => config.searchText(r, lookups)}
        searchPlaceholder={`Search ${config.title.toLowerCase()}...`}
        csvFilename={config.csvFilename}
        emptyTitle={`No ${config.title.toLowerCase()} yet`}
        emptyDescription={`Get started by adding your first ${config.singular.toLowerCase()}.`}
        emptyActionLabel={`Add ${config.singular}`}
        onEmptyAction={openAdd}
      />

      <FormDialog<F>
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${config.singular}` : `Add ${config.singular}`}
        description={editing ? `Update the ${config.singular.toLowerCase()} details below.` : `Fill in the details to create a new ${config.singular.toLowerCase()}.`}
        fields={fields}
        schema={config.schema}
        defaultValues={defaultValues as never}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Save changes" : `Create ${config.singular}`}
        size={config.formSize ?? "lg"}
      />

      {viewing && (
        <DetailDialog
          open={!!viewing}
          onOpenChange={(o) => !o && setViewing(null)}
          title={config.singular}
          rows={config.detail(viewing, lookups)}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const rec = viewing;
                  setViewing(null);
                  openEdit(rec);
                }}
              >
                Edit
              </Button>
            </div>
          }
        />
      )}

      <ConfirmationDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${config.singular}?`}
        description={`This will permanently remove this ${config.singular.toLowerCase()}. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
